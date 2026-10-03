"""
Visualization Module for Network Anomaly Detection
Uses PCA to reduce multidimensional standardized features to two dimensions for plotting.
Produces clean technical charts for cluster and outlier distribution.
"""

from typing import Dict, Tuple
import matplotlib.pyplot as plt
import numpy as np
from sklearn.decomposition import PCA


def run_pca_2d(scaled_features: np.ndarray) -> Tuple[np.ndarray, PCA]:
    """
    Project multidimensional standardized features into 2 principal components.
    PCA is used only to visualize the multidimensional data in two dimensions.
    DBSCAN operates on the selected scaled features.
    """
    n_features = scaled_features.shape[1]
    n_components = min(2, n_features)
    pca = PCA(n_components=n_components)
    coords_2d = pca.fit_transform(scaled_features)

    # If only 1 feature was available, add a zero column for 2D plotting
    if coords_2d.shape[1] == 1:
        coords_2d = np.hstack([coords_2d, np.zeros((coords_2d.shape[0], 1))])

    return coords_2d, pca


def create_pca_scatter_plot(
    coords_2d: np.ndarray,
    labels: np.ndarray,
    pca: PCA,
) -> plt.Figure:
    """
    Generates a technical 2D scatter plot of PC1 vs PC2.
    Highlights DBSCAN noise points (label -1: Potential Anomaly) in red/crimson.
    Normal clusters are colored using a distinct technical categorical palette.
    """
    fig, ax = plt.subplots(figsize=(9, 6), dpi=150)
    fig.patch.set_facecolor("#0b0f19")
    ax.set_facecolor("#111827")

    # Grid and borders
    ax.grid(True, linestyle="--", linewidth=0.5, color="#374151", alpha=0.6)
    for spine in ax.spines.values():
        spine.set_color("#4b5563")

    unique_labels = np.unique(labels)
    clustered_labels = [l for l in unique_labels if l != -1]

    # Plot clustered traffic
    cmap = plt.get_cmap("tab10")
    for i, lbl in enumerate(clustered_labels):
        mask = labels == lbl
        color = cmap(i % 10)
        ax.scatter(
            coords_2d[mask, 0],
            coords_2d[mask, 1],
            c=[color],
            label=f"Cluster {lbl} (n={np.sum(mask)})",
            alpha=0.65,
            s=28,
            edgecolors="none",
        )

    # Plot noise / potential anomalies
    noise_mask = labels == -1
    noise_count = int(np.sum(noise_mask))
    if noise_count > 0:
        ax.scatter(
            coords_2d[noise_mask, 0],
            coords_2d[noise_mask, 1],
            c="#ef4444",
            label=f"Potential Anomaly (Noise) (n={noise_count})",
            alpha=0.9,
            s=45,
            marker="x",
            linewidths=1.5,
        )

    var1 = round(pca.explained_variance_ratio_[0] * 100, 1) if len(pca.explained_variance_ratio_) > 0 else 0
    var2 = round(pca.explained_variance_ratio_[1] * 100, 1) if len(pca.explained_variance_ratio_) > 1 else 0

    ax.set_xlabel(f"Principal Component 1 ({var1}% variance)", color="#e5e7eb", fontsize=10)
    ax.set_ylabel(f"Principal Component 2 ({var2}% variance)", color="#e5e7eb", fontsize=10)
    ax.set_title("PCA Projection (PC1 vs PC2) with DBSCAN Assignments", color="#f9fafb", fontsize=12, pad=12)

    ax.tick_params(colors="#9ca3af", labelsize=9)

    # Legend with clean styling
    leg = ax.legend(
        facecolor="#1f2937",
        edgecolor="#374151",
        labelcolor="#e5e7eb",
        fontsize=8,
        loc="best",
        framealpha=0.9,
    )
    fig.tight_layout()
    return fig


def create_cluster_bar_chart(cluster_sizes: Dict[int, int], noise_count: int) -> plt.Figure:
    """
    Generates a bar chart showing the distribution of records across clusters and noise.
    """
    fig, ax = plt.subplots(figsize=(8, 4), dpi=150)
    fig.patch.set_facecolor("#0b0f19")
    ax.set_facecolor("#111827")
    ax.grid(axis="y", linestyle="--", linewidth=0.5, color="#374151", alpha=0.6)
    for spine in ax.spines.values():
        spine.set_color("#4b5563")

    categories = []
    counts = []
    colors = []

    # Sort clusters by id
    for c_id in sorted(cluster_sizes.keys()):
        categories.append(f"Cluster {c_id}")
        counts.append(cluster_sizes[c_id])
        colors.append("#38bdf8")

    if noise_count > 0:
        categories.append("Noise (-1)")
        counts.append(noise_count)
        colors.append("#ef4444")

    bars = ax.bar(categories, counts, color=colors, edgecolor="#1f2937", width=0.55)

    for bar in bars:
        h = bar.get_height()
        ax.annotate(
            f"{h:,}",
            xy=(bar.get_x() + bar.get_width() / 2, h),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            color="#e5e7eb",
            fontsize=8,
        )

    ax.set_ylabel("Number of Observations", color="#e5e7eb", fontsize=10)
    ax.set_title("Record Distribution Across Clusters and Noise", color="#f9fafb", fontsize=12, pad=12)
    ax.tick_params(colors="#9ca3af", labelsize=9)
    plt.xticks(rotation=25 if len(categories) > 6 else 0, ha="right" if len(categories) > 6 else "center")
    fig.tight_layout()
    return fig
