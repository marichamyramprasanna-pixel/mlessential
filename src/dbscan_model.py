"""
DBSCAN Model Module for Network Anomaly Detection
Applies the scikit-learn DBSCAN algorithm on standardized network features.
Identifies noise points (label -1) as potential anomalies.
"""

from typing import Dict, Tuple
import numpy as np
from sklearn.cluster import DBSCAN


def run_dbscan(
    scaled_data: np.ndarray,
    eps: float = 0.5,
    min_samples: int = 5,
    metric: str = "euclidean",
) -> Tuple[np.ndarray, Dict[str, any]]:
    """
    Execute DBSCAN clustering on standardized features.
    Returns:
        labels: 1D array of cluster assignments (-1 designates noise / potential anomaly)
        results: Dictionary containing calculated actual metrics
    """
    if scaled_data.shape[0] == 0 or scaled_data.shape[1] == 0:
        raise ValueError("Scaled data is empty. Cannot run DBSCAN.")

    # Validate parameters
    if eps <= 0:
        raise ValueError("Parameter eps must be strictly positive.")
    if min_samples < 1:
        raise ValueError("Parameter min_samples must be at least 1.")

    model = DBSCAN(eps=eps, min_samples=min_samples, metric=metric)
    labels = model.fit_predict(scaled_data)

    total_records = len(labels)
    unique_labels = set(labels)
    cluster_labels = [lbl for lbl in unique_labels if lbl != -1]
    num_clusters = len(cluster_labels)

    noise_count = int(np.sum(labels == -1))
    clustered_count = total_records - noise_count
    anomaly_percentage = (noise_count / total_records * 100.0) if total_records > 0 else 0.0

    cluster_sizes = {}
    largest_cluster_size = 0
    for lbl in cluster_labels:
        size = int(np.sum(labels == lbl))
        cluster_sizes[int(lbl)] = size
        if size > largest_cluster_size:
            largest_cluster_size = size

    core_sample_indices = getattr(model, "core_sample_indices_", np.array([]))
    core_sample_count = int(len(core_sample_indices))

    results = {
        "total_records": total_records,
        "num_clusters": num_clusters,
        "num_anomalies": noise_count,
        "noise_count": noise_count,
        "clustered_count": clustered_count,
        "anomaly_percentage": round(anomaly_percentage, 2),
        "largest_cluster_size": largest_cluster_size,
        "cluster_sizes": cluster_sizes,
        "core_sample_count": core_sample_count,
        "eps": eps,
        "min_samples": min_samples,
        "metric": metric,
    }

    return labels, results
