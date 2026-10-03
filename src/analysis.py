"""
Analysis Module for Network Anomaly Detection
Calculates descriptive statistics comparing clustered observations against
potential anomalies (DBSCAN noise points).
"""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd


def compute_feature_statistics(
    df: pd.DataFrame,
    selected_features: List[str],
    labels: np.ndarray,
) -> Dict[str, pd.DataFrame]:
    """
    Computes Mean, Median, Min, Max, and Standard Deviation for each feature,
    broken down by:
    - Overall Dataset
    - Clustered Traffic (label >= 0)
    - Potential Anomalies (label == -1)
    """
    working_df = df[selected_features].copy()
    working_df["dbscan_label"] = labels
    working_df["status"] = np.where(labels == -1, "Potential Anomaly", "Clustered Traffic")

    stats_dict = {}

    for feature in selected_features:
        series_all = working_df[feature]
        series_clustered = working_df.loc[working_df["dbscan_label"] >= 0, feature]
        series_anomalies = working_df.loc[working_df["dbscan_label"] == -1, feature]

        stats_dict[feature] = pd.DataFrame(
            {
                "Metric": ["Mean", "Median", "Min", "Max", "Std Dev"],
                "Overall": [
                    series_all.mean(),
                    series_all.median(),
                    series_all.min(),
                    series_all.max(),
                    series_all.std(),
                ],
                "Clustered Traffic": [
                    series_clustered.mean() if len(series_clustered) > 0 else np.nan,
                    series_clustered.median() if len(series_clustered) > 0 else np.nan,
                    series_clustered.min() if len(series_clustered) > 0 else np.nan,
                    series_clustered.max() if len(series_clustered) > 0 else np.nan,
                    series_clustered.std() if len(series_clustered) > 0 else np.nan,
                ],
                "Potential Anomalies": [
                    series_anomalies.mean() if len(series_anomalies) > 0 else np.nan,
                    series_anomalies.median() if len(series_anomalies) > 0 else np.nan,
                    series_anomalies.min() if len(series_anomalies) > 0 else np.nan,
                    series_anomalies.max() if len(series_anomalies) > 0 else np.nan,
                    series_anomalies.std() if len(series_anomalies) > 0 else np.nan,
                ],
            }
        ).round(4)

    return stats_dict


def compare_reference_labels(
    df: pd.DataFrame,
    ref_col: str,
    labels: np.ndarray,
) -> pd.DataFrame:
    """
    Cross-tabulates DBSCAN status against existing dataset reference labels.
    Important: The dataset label is a reference label and was not used to train DBSCAN.
    """
    if ref_col not in df.columns:
        return pd.DataFrame()

    ref_series = df[ref_col].astype(str)
    status_series = np.where(labels == -1, "Potential Anomaly", "Clustered Traffic")

    cross_tab = pd.crosstab(
        ref_series,
        status_series,
        margins=True,
        margins_name="Total",
    )

    return cross_tab
