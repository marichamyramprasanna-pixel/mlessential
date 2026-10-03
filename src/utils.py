"""
Utilities Module for Network Anomaly Detection
Includes synthetic network dataset generation for offline development and testing,
plus CSV export helpers.
"""

import io
from typing import Tuple
import numpy as np
import pandas as pd


def generate_synthetic_network_traffic(
    n_samples: int = 500,
    anomaly_ratio: float = 0.08,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Generates a realistic synthetic network flow dataset strictly for
    development, demonstration, and automated test validation.
    Notice: This is synthetic data and is clearly marked as such.
    """
    rng = np.random.RandomState(random_state)
    n_anomalies = int(n_samples * anomaly_ratio)
    n_normal = n_samples - n_anomalies

    # Normal traffic clusters (e.g., standard HTTP/HTTPS browsing + DNS queries)
    # Cluster A: Light web browsing (2/3 of normal traffic)
    nA = int(n_normal * 0.65)
    flow_duration_A = rng.exponential(scale=1500, size=nA) + 50
    fwd_packets_A = rng.poisson(lam=12, size=nA) + 1
    bwd_packets_A = rng.poisson(lam=18, size=nA) + 1
    flow_bytes_A = fwd_packets_A * rng.normal(500, 60, nA) + bwd_packets_A * rng.normal(850, 90, nA)
    flow_packets_s_A = (fwd_packets_A + bwd_packets_A) / (flow_duration_A / 1000.0)
    pkt_len_mean_A = rng.normal(650, 45, nA)
    pkt_len_std_A = rng.normal(180, 25, nA)

    # Cluster B: High-volume streaming / file transfer (1/3 of normal traffic)
    nB = n_normal - nA
    flow_duration_B = rng.normal(45000, 5000, size=nB).clip(10000, 120000)
    fwd_packets_B = rng.poisson(lam=120, size=nB) + 10
    bwd_packets_B = rng.poisson(lam=280, size=nB) + 20
    flow_bytes_B = fwd_packets_B * rng.normal(1200, 80, nB) + bwd_packets_B * rng.normal(1420, 50, nB)
    flow_packets_s_B = (fwd_packets_B + bwd_packets_B) / (flow_duration_B / 1000.0)
    pkt_len_mean_B = rng.normal(1350, 60, nB)
    pkt_len_std_B = rng.normal(240, 30, nB)

    # Combine normal
    flow_duration_norm = np.concatenate([flow_duration_A, flow_duration_B])
    fwd_packets_norm = np.concatenate([fwd_packets_A, fwd_packets_B])
    bwd_packets_norm = np.concatenate([bwd_packets_A, bwd_packets_B])
    flow_bytes_norm = np.concatenate([flow_bytes_A, flow_bytes_B])
    flow_packets_s_norm = np.concatenate([flow_packets_s_A, flow_packets_s_B])
    pkt_len_mean_norm = np.concatenate([pkt_len_mean_A, pkt_len_mean_B])
    pkt_len_std_norm = np.concatenate([pkt_len_std_A, pkt_len_std_B])
    labels_norm = ["Normal"] * n_normal

    # Synthetic anomalous traffic (injected low-density outliers e.g. PortScan, Flood, High Volume Bursts)
    flow_duration_anom = rng.uniform(5, 200, size=n_anomalies)  # extremely short or fast
    fwd_packets_anom = rng.choice([1, 2, 450, 1200], size=n_anomalies)
    bwd_packets_anom = rng.choice([0, 1, 3], size=n_anomalies)  # minimal or zero responses
    flow_bytes_anom = fwd_packets_anom * rng.uniform(40, 1800, size=n_anomalies)
    flow_packets_s_anom = rng.uniform(1500, 8500, size=n_anomalies)  # high packet rate
    pkt_len_mean_anom = rng.uniform(40, 1500, size=n_anomalies)
    pkt_len_std_anom = rng.uniform(0, 450, size=n_anomalies)
    labels_anom = rng.choice(["PortScan", "SYN_Flood", "DataExfiltration"], size=n_anomalies)

    df = pd.DataFrame(
        {
            "Flow Duration": np.concatenate([flow_duration_norm, flow_duration_anom]).round(2),
            "Total Fwd Packets": np.concatenate([fwd_packets_norm, fwd_packets_anom]).astype(int),
            "Total Backward Packets": np.concatenate([bwd_packets_norm, bwd_packets_anom]).astype(int),
            "Flow Bytes/s": np.concatenate([flow_bytes_norm, flow_bytes_anom]).round(2),
            "Flow Packets/s": np.concatenate([flow_packets_s_norm, flow_packets_s_anom]).round(2),
            "Packet Length Mean": np.concatenate([pkt_len_mean_norm, pkt_len_mean_anom]).round(2),
            "Packet Length Std": np.concatenate([pkt_len_std_norm, pkt_len_std_anom]).round(2),
            "Reference Label": np.concatenate([labels_norm, labels_anom]),
        }
    )

    # Shuffle
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return df


def convert_df_to_csv_bytes(df: pd.DataFrame) -> bytes:
    """
    Converts a pandas DataFrame into utf-8 encoded CSV bytes for download.
    """
    return df.to_csv(index=False).encode("utf-8")
