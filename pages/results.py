"""
Results Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st
import numpy as np
import pandas as pd
from src.analysis import compute_feature_statistics, compare_reference_labels
from src.utils import convert_df_to_csv_bytes


def render_results():
    st.title("Detection Results")
    st.caption("Inspect identified clusters, potential anomalies, and descriptive feature comparisons.")

    if "results" not in st.session_state or "clean_df" not in st.session_state:
        st.warning("No detection run yet. Please go to the 'Detection' page and run DBSCAN.")
        return

    results = st.session_state["results"]
    clean_df: pd.DataFrame = st.session_state["clean_df"]
    labels: np.ndarray = st.session_state["labels"]
    selected_features = st.session_state.get("selected_features", [])

    st.markdown("### Model Summary Metrics")
    m1, m2, m3 = st.columns(3)
    m1.metric("Total Records Analyzed", f"{results['total_records']:,}")
    m2.metric("Clusters Discovered", f"{results['num_clusters']}")
    m3.metric("Potential Anomalies", f"{results['num_anomalies']:,} ({results['anomaly_percentage']}%)")

    m4, m5, m6 = st.columns(3)
    m4.metric("Noise Count (Label -1)", f"{results['noise_count']:,}")
    m5.metric("Clustered Records", f"{results['clustered_count']:,}")
    m6.metric("Largest Cluster Size", f"{results['largest_cluster_size']:,}")

    # Build results dataframe
    display_df = clean_df.copy()
    display_df.insert(0, "Record ID", range(1, len(display_df) + 1))
    display_df["DBSCAN Label"] = labels
    display_df["Status"] = np.where(labels == -1, "Potential Anomaly", "Clustered Traffic")

    st.markdown("### Export Classified Results")
    csv_bytes = convert_df_to_csv_bytes(display_df)
    st.download_button(
        label="Download Results CSV",
        data=csv_bytes,
        file_name="dbscan_network_anomaly_results.csv",
        mime="text/csv",
        help="Download the complete dataset enriched with DBSCAN labels and classification status.",
    )

    st.markdown("### Results Table")
    filter_choice = st.radio(
        "Filter View",
        options=["All Records", "Potential Anomalies Only (Noise)", "Clustered Traffic Only"],
        horizontal=True,
    )

    if filter_choice == "Potential Anomalies Only (Noise)":
        filtered_df = display_df[display_df["DBSCAN Label"] == -1]
    elif filter_choice == "Clustered Traffic Only":
        filtered_df = display_df[display_df["DBSCAN Label"] >= 0]
    else:
        filtered_df = display_df

    st.dataframe(filtered_df, use_container_width=True)

    st.markdown("### Descriptive Feature Analysis (Clustered vs Potential Anomalies)")
    st.caption(
        "These observations were identified as potential anomalies by DBSCAN because they occupy low-density "
        "regions of the standardized feature space. An unusual observation is not necessarily a malicious attack."
    )

    stats_map = compute_feature_statistics(clean_df, selected_features, labels)

    tabs = st.tabs(selected_features)
    for i, feature in enumerate(selected_features):
        with tabs[i]:
            st.markdown(f"**Feature Metrics: {feature}**")
            st.dataframe(stats_map[feature], use_container_width=True)

    ref_col = st.session_state.get("ref_label_col")
    if ref_col and ref_col in clean_df.columns:
        st.markdown("### Reference Label Comparison")
        st.caption(
            "The dataset label is a reference label and was not used to train DBSCAN. "
            "This table shows how unsupervised DBSCAN noise tags align with external benchmark classes."
        )
        cross_tab = compare_reference_labels(clean_df, ref_col, labels)
        st.dataframe(cross_tab, use_container_width=True)
