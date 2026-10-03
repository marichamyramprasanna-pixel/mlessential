"""
Data Preprocessing Module for Network Anomaly Detection
Handles dataset validation, cleaning, missing/infinite value handling,
feature scaling, and preprocessing statistics tracking.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


def load_dataset(file_or_path) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Load a CSV dataset with encoding fallbacks and validation.
    Returns (DataFrame, error_message).
    """
    try:
        df = pd.read_csv(file_or_path, low_memory=False)
        if df.empty:
            return None, "The uploaded CSV file is empty. Please provide a file with data."
        if len(df.columns) < 2:
            return None, "The CSV file must contain at least two columns."
        return df, None
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(file_or_path, encoding="latin-1", low_memory=False)
            return df, None
        except Exception as e:
            return None, f"Failed to parse CSV with fallback encoding: {str(e)}"
    except Exception as e:
        return None, f"Error reading CSV file: {str(e)}"


def detect_numerical_features(df: pd.DataFrame) -> List[str]:
    """
    Identify columns that are strictly numeric or can be safely converted to numeric.
    Excludes potential target/label columns.
    """
    reference_names = {"label", "attack", "class", "category", "target", "benign", "classification"}
    numerical_cols = []

    for col in df.columns:
        col_clean = str(col).strip().lower()
        if col_clean in reference_names:
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            numerical_cols.append(col)
        else:
            # Check if majority of values can be converted to numeric
            converted = pd.to_numeric(df[col], errors="coerce")
            valid_ratio = converted.notna().mean()
            if valid_ratio > 0.8:
                numerical_cols.append(col)

    return numerical_cols


def detect_reference_label_column(df: pd.DataFrame) -> Optional[str]:
    """
    Identify potential ground-truth or reference label column.
    Used exclusively for optional post-clustering comparison.
    """
    candidate_names = ["label", "attack", "class", "category", "attack_cat", "activity", "benign"]
    for col in df.columns:
        col_clean = str(col).strip().lower()
        if col_clean in candidate_names:
            return col
    return None


def clean_and_preprocess(
    df: pd.DataFrame,
    selected_features: List[str],
    max_samples: Optional[int] = None,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, np.ndarray, StandardScaler, Dict[str, any], Optional[str]]:
    """
    Clean the dataset, handle missing and infinite values, apply StandardScaler,
    and return detailed preprocessing audit metrics.
    """
    summary: Dict[str, any] = {
        "original_rows": len(df),
        "original_columns": len(df.columns),
        "removed_rows": 0,
        "missing_values_handled": 0,
        "duplicate_rows": int(df.duplicated().sum()),
        "selected_features": selected_features,
        "final_rows_used": 0,
        "sampling_applied": False,
        "original_before_sampling": len(df),
    }

    if not selected_features or len(selected_features) < 2:
        return pd.DataFrame(), np.empty((0, 0)), StandardScaler(), summary, "Please select at least two numerical features."

    # Validate that selected features exist
    missing_cols = [c for c in selected_features if c not in df.columns]
    if missing_cols:
        return pd.DataFrame(), np.empty((0, 0)), StandardScaler(), summary, f"Selected features missing from dataset: {', '.join(missing_cols)}"

    # Work on a copy with selected features plus reference column if present
    ref_col = detect_reference_label_column(df)
    cols_to_keep = list(selected_features)
    if ref_col and ref_col not in cols_to_keep:
        cols_to_keep.append(ref_col)

    working_df = df[cols_to_keep].copy()

    # Convert selected features to numeric, replacing strings with NaN
    for col in selected_features:
        working_df[col] = pd.to_numeric(working_df[col], errors="coerce")

    # Replace infinite values with NaN
    initial_nans = working_df[selected_features].isna().sum().sum()
    working_df[selected_features] = working_df[selected_features].replace([np.inf, -np.inf], np.nan)
    total_nans_after_inf = working_df[selected_features].isna().sum().sum()
    inf_count = total_nans_after_inf - initial_nans

    # Drop rows where selected features are NaN
    before_drop = len(working_df)
    clean_df = working_df.dropna(subset=selected_features).copy()
    rows_dropped = before_drop - len(clean_df)

    summary["removed_rows"] = int(rows_dropped)
    summary["missing_values_handled"] = int(total_nans_after_inf)
    summary["infinite_values_found"] = int(inf_count)

    if len(clean_df) < 5:
        return pd.DataFrame(), np.empty((0, 0)), StandardScaler(), summary, "Fewer than 5 valid records remain after handling missing values."

    # Controlled sampling for large datasets if requested
    if max_samples and len(clean_df) > max_samples:
        summary["sampling_applied"] = True
        summary["original_before_sampling"] = len(clean_df)
        clean_df = clean_df.sample(n=max_samples, random_state=random_state).copy()

    summary["final_rows_used"] = len(clean_df)

    # Feature scaling with StandardScaler
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(clean_df[selected_features].values)

    return clean_df.reset_index(drop=True), scaled_features, scaler, summary, None
