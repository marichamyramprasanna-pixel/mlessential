"""
Dataset Analysis Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st
import pandas as pd
from src.preprocessing import detect_numerical_features, detect_reference_label_column


def render_dataset_analysis():
    st.title("Dataset Analysis")
    st.caption("Inspect structure, data types, missing values, and select numerical features for DBSCAN.")

    if "raw_df" not in st.session_state or st.session_state["raw_df"] is None:
        st.warning("No dataset loaded yet. Please return to the Overview page to upload a CSV file.")
        return

    df: pd.DataFrame = st.session_state["raw_df"]
    num_cols = detect_numerical_features(df)
    ref_col = detect_reference_label_column(df)

    st.markdown("### Dataset Dimensions & Health")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Total Records", f"{len(df):,}")
    with c2:
        st.metric("Total Columns", f"{len(df.columns)}")
    with c3:
        missing_count = int(df.isna().sum().sum())
        st.metric("Missing Values", f"{missing_count:,}")
    with c4:
        dup_count = int(df.duplicated().sum())
        st.metric("Duplicate Rows", f"{dup_count:,}")

    if ref_col:
        st.info(
            f"Detected potential reference label column: '{ref_col}'. "
            "This column will be excluded from DBSCAN clustering and preserved for reference comparison only."
        )

    st.markdown("### Dataset Preview")
    st.dataframe(df.head(10), use_container_width=True)

    st.markdown("### Numerical Feature Selection")
    st.write(
        "Select the numerical network metrics that will be standardized and supplied to the DBSCAN algorithm. "
        "At least two numerical features are required."
    )

    if len(num_cols) < 2:
        st.error("Error: Uploaded dataset has fewer than two numerical features suitable for clustering.")
        return

    default_features = st.session_state.get("selected_features", num_cols[:min(6, len(num_cols))])
    # Ensure defaults are in num_cols
    valid_defaults = [f for f in default_features if f in num_cols]
    if len(valid_defaults) < 2:
        valid_defaults = num_cols[:min(6, len(num_cols))]

    selected = st.multiselect(
        "Available Numerical Columns",
        options=num_cols,
        default=valid_defaults,
        help="Select 2 or more features for clustering (e.g. Flow Duration, Packets, Bytes/s, Packet Length).",
    )

    st.session_state["selected_features"] = selected

    if len(selected) < 2:
        st.error("Validation Error: Please select at least two numerical features to proceed with DBSCAN.")
    else:
        st.success(f"{len(selected)} features selected for clustering: {', '.join(selected)}")

    st.markdown("### Descriptive Statistics for Selected Features")
    if len(selected) >= 2:
        st.dataframe(df[selected].describe().round(4), use_container_width=True)
