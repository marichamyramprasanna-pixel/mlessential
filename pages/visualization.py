"""
Visualization Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from src.visualization import run_pca_2d, create_pca_scatter_plot, create_cluster_bar_chart


def render_visualization():
    st.title("Data & Cluster Visualization")
    st.caption("Visual examination of density clusters and identified potential anomalies.")

    if "results" not in st.session_state or "scaled_data" not in st.session_state:
        st.warning("No detection run yet. Please go to the 'Detection' page and run DBSCAN.")
        return

    scaled_data: np.ndarray = st.session_state["scaled_data"]
    labels: np.ndarray = st.session_state["labels"]
    results = st.session_state["results"]
    clean_df: pd.DataFrame = st.session_state["clean_df"]
    selected_features = st.session_state.get("selected_features", [])

    st.markdown("### Two-Dimensional PCA Projection")
    st.info(
        "PCA is used only to visualize the multidimensional data in two dimensions. "
        "DBSCAN operates on the selected scaled features directly."
    )

    with st.spinner("Computing Principal Component Analysis projection..."):
        coords_2d, pca = run_pca_2d(scaled_data)
        pca_fig = create_pca_scatter_plot(coords_2d, labels, pca)
        st.pyplot(pca_fig, use_container_width=True)

    st.markdown("### Record Distribution by Cluster and Noise")
    cluster_bar_fig = create_cluster_bar_chart(results["cluster_sizes"], results["noise_count"])
    st.pyplot(cluster_bar_fig, use_container_width=True)

    st.markdown("### Selected Feature Distributions")
    st.caption("Histograms comparing the density of clustered traffic versus potential anomalies for key features.")

    if selected_features:
        target_feat = st.selectbox("Select feature to plot distribution:", options=selected_features)
        fig, ax = plt.subplots(figsize=(8, 3.5), dpi=150)
        fig.patch.set_facecolor("#0b0f19")
        ax.set_facecolor("#111827")
        ax.grid(True, linestyle="--", linewidth=0.5, color="#374151", alpha=0.6)
        for spine in ax.spines.values():
            spine.set_color("#4b5563")

        clustered_vals = clean_df.loc[labels >= 0, target_feat].dropna()
        anomaly_vals = clean_df.loc[labels == -1, target_feat].dropna()

        # Plot histograms
        bins = np.histogram_bin_edges(clean_df[target_feat].dropna(), bins=30)
        if len(clustered_vals) > 0:
            ax.hist(clustered_vals, bins=bins, alpha=0.6, color="#38bdf8", label="Clustered Traffic", density=True)
        if len(anomaly_vals) > 0:
            ax.hist(anomaly_vals, bins=bins, alpha=0.6, color="#ef4444", label="Potential Anomalies", density=True)

        ax.set_title(f"Density Distribution: {target_feat}", color="#f9fafb", fontsize=11, pad=10)
        ax.set_xlabel(target_feat, color="#e5e7eb", fontsize=9)
        ax.set_ylabel("Probability Density", color="#e5e7eb", fontsize=9)
        ax.tick_params(colors="#9ca3af", labelsize=8)
        ax.legend(facecolor="#1f2937", edgecolor="#374151", labelcolor="#e5e7eb", fontsize=8)
        fig.tight_layout()
        st.pyplot(fig, use_container_width=True)
