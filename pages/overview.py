"""
Overview Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st
import pandas as pd
from src.preprocessing import load_dataset, detect_numerical_features, detect_reference_label_column


def render_overview():
    st.title("Network Anomaly Detection")
    st.caption("Analyze network traffic and identify potential outliers using DBSCAN density-based clustering.")

    st.markdown("### Project Description")
    st.markdown(
        """
        This system is an applied Machine Learning project that analyzes network flow traffic 
        records to identify potential anomalies without requiring pre-labeled training data.
        
        Using Density-Based Spatial Clustering of Applications with Noise (DBSCAN), high-dimensional 
        network flow telemetry is projected into standardized space to isolate points that fail to 
        satisfy minimum density requirements.
        """
    )

    st.markdown("### Analytical Workflow")
    st.markdown(
        """
        1. **CSV Upload**: Ingest network flow data (e.g. CICIDS2017, UNSW-NB15, or custom flow capture exports).
        2. **Data Validation & Cleaning**: Remove invalid entries, replace infinite values, and audit duplicates.
        3. **Feature Selection**: Select at least two continuous numerical network traffic features.
        4. **Feature Standardization**: Apply StandardScaler to ensure consistent variance across network metrics.
        5. **DBSCAN Clustering**: Group dense observations into clusters and mark isolated points as noise (label -1).
        6. **Anomaly Inspection**: Quantify noise points as potential anomalies and evaluate statistical shifts.
        7. **PCA Visualization**: Project features onto principal components (PC1 vs PC2) for technical inspection.
        8. **Export Results**: Download the enriched dataset with cluster assignments and anomaly status tags.
        """
    )

    st.markdown("### Getting Started")
    st.markdown(
        "Upload a network traffic CSV file below or load the bundled sample dataset to begin the analysis."
    )

    upload_col1, upload_col2 = st.columns([3, 1])

    with upload_col1:
        uploaded_file = st.file_uploader(
            "Upload Network Traffic CSV",
            type=["csv"],
            help="Accepts CSV exports with numerical flow features such as Flow Duration, Packet Length, Bytes/s.",
        )
        if uploaded_file is not None:
            df, error = load_dataset(uploaded_file)
            if error:
                st.error(error)
            else:
                st.session_state["raw_df"] = df
                st.session_state["dataset_name"] = uploaded_file.name
                st.session_state["selected_features"] = detect_numerical_features(df)[:6]
                st.session_state["ref_label_col"] = detect_reference_label_column(df)
                st.success(f"Dataset successfully loaded: {len(df):,} rows, {len(df.columns)} columns.")

    with upload_col2:
        st.write("Or use benchmark:")
        if st.button("Load Sample Dataset", help="Loads a synthetic benchmark network traffic dataset with 500 flows"):
            try:
                sample_df = pd.read_csv("data/sample_network_traffic.csv")
                st.session_state["raw_df"] = sample_df
                st.session_state["dataset_name"] = "sample_network_traffic.csv (Synthetic benchmark)"
                st.session_state["selected_features"] = detect_numerical_features(sample_df)[:6]
                st.session_state["ref_label_col"] = detect_reference_label_column(sample_df)
                st.success("Loaded synthetic benchmark dataset (500 records).")
            except Exception as e:
                st.error(f"Could not load sample file: {str(e)}")

    if "raw_df" in st.session_state and st.session_state["raw_df"] is not None:
        st.info(
            f"Active Dataset: {st.session_state.get('dataset_name', 'Uploaded File')} "
            f"({len(st.session_state['raw_df']):,} rows). Proceed to the 'Dataset Analysis' or 'Detection' tab."
        )
    else:
        st.markdown(
            """
            ---
            *No active dataset loaded. Please upload a CSV file or load the sample benchmark to inspect data.*
            """
        )
