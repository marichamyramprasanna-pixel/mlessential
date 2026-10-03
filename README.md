# Network Anomaly Detection using DBSCAN

An applied Machine Learning project that analyzes network flow traffic data and identifies potential anomalous network activity using the Density-Based Spatial Clustering of Applications with Noise (DBSCAN) algorithm.

---

## Project Overview

Modern network environments generate high-velocity telemetry where unauthorized intrusions, port scanning, data exfiltration, and denial-of-service attempts often manifest as sparse outliers deviating from baseline traffic patterns.

This project implements an unsupervised Machine Learning pipeline using DBSCAN to cluster typical network traffic behavior without requiring historical attack labels. Points that fail to meet density connectivity thresholds are tagged with label `-1`, designating them as potential anomalies for investigative triage.

---

## Problem Statement

Traditional signature-based intrusion detection systems (IDS) depend upon known vulnerability patterns and struggle against novel or zero-day network threats. Supervised machine learning models frequently require vast, perfectly labeled training corpora, which are expensive, biased, and rapidly outdated.

Unsupervised anomaly detection addresses these constraints by modeling the natural geometric density of regular network transactions. Outliers residing in sparse multidimensional feature regions can be flagged automatically without prior exposure to specific attack vectors.

---

## Project Objectives

1. Ingest arbitrary network flow CSV datasets (such as CICIDS2017, UNSW-NB15, or flow captures).
2. Validate, clean, and impute missing or infinite values without crashing.
3. Allow users to select continuous numerical network telemetry features.
4. Scale features using `StandardScaler` to ensure unit variance across differing metrics.
5. Apply the scikit-learn `DBSCAN` implementation with adjustable hyperparameters (`eps`, `min_samples`, distance metric).
6. Classify points into dense clusters or label `-1` noise points (Potential Anomalies).
7. Perform statistical profiling comparing normal clustered traffic against potential anomalies.
8. Visualize multidimensional feature clusters using Principal Component Analysis (PCA) 2D projections.
9. Export enriched classification datasets containing cluster IDs and anomaly status flags.

---

## How DBSCAN Works

DBSCAN (Density-Based Spatial Clustering of Applications with Noise) organizes spatial observations based on the density of neighboring records:

### Point Classifications

- **Core Points**: An observation $p$ is a core point if at least `min_samples` observations reside within a distance of `eps` ($\epsilon$) from $p$. Core points form the dense structural backbone of clusters.
- **Border Points**: An observation that is within distance `eps` of a core point, but contains fewer than `min_samples` within its own neighborhood. Border points define cluster perimeters.
- **Noise Points (Label -1)**: An observation that is neither a core point nor reachable from any core point. In this project, noise points represent **Potential Anomalies**.

### Density Reachability & Connectivity

- A point $q$ is directly density-reachable from $p$ if $p$ is a core point and $q$ lies within distance `eps` from $p$.
- Clusters are formed by taking the transitive closure of density-connected points.

---

## Why DBSCAN is Suitable for Network Traffic

1. **No Fixed Cluster Count ($k$)**: Unlike K-Means, network administrators do not need to guess how many traffic behaviors exist across their switches.
2. **Non-Spherical Geometries**: Network traffic distributions follow complex non-linear curves rather than spherical Gaussian distributions.
3. **Explicit Noise Isolation**: While partition-based clustering forces every outlier into an artificial cluster, DBSCAN isolates outliers directly with label `-1`.
4. **Mathematical Transparency**: Anomalies are flagged based strictly on spatial sparsity relative to neighboring traffic.

---

## Technology Stack

- **Language**: Python 3.10+ / 3.11+
- **Application Framework**: Streamlit
- **Data Manipulation**: Pandas, NumPy
- **Machine Learning**: Scikit-Learn (`DBSCAN`, `StandardScaler`, `PCA`)
- **Plotting & Visuals**: Matplotlib
- **Model Persistence**: Joblib
- **Web Interface (Preview Runtime)**: React 19, TypeScript, Tailwind CSS, Lucide Icons

---

## Dataset Requirements

The application accepts standard tabular CSV files containing network flow telemetry.

### Suggested Features
- `Flow Duration` (microseconds or milliseconds)
- `Total Fwd Packets` (count of packets sent in forward direction)
- `Total Backward Packets` (count of packets sent in reverse direction)
- `Flow Bytes/s` (transfer rate)
- `Flow Packets/s` (packet transmission rate)
- `Packet Length Mean` (average size of observed packets)
- `Packet Length Std` (variance in packet sizes)

### Flexible Schema Handling
The preprocessing engine does not depend on a rigid column format. If custom column names are detected, the user can select any combination of available continuous numerical metrics.

### Reference Label Support
If the dataset includes an evaluation column (e.g., `Label`, `Attack`, `Class`), the system extracts it for diagnostic comparison while strictly excluding it from the unsupervised DBSCAN clustering process.

---

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/network-anomaly-dbscan.git
cd network-anomaly-dbscan
```

### 2. Create Virtual Environment
```bash
# Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Application
```bash
streamlit run app.py
```
Open your browser at `http://localhost:8501`.

---

## Hyperparameter Guide

### EPS (Epsilon, $\epsilon$)
- **Definition**: The maximum geometric distance between two samples for one to be considered as in the neighborhood of the other.
- **Default**: `0.5`
- **Tuning**: A value too small fragments normal traffic into hundreds of noise points. A value too large absorbs genuine anomalies into the primary cluster.

### MIN SAMPLES
- **Definition**: The minimum number of samples in a neighborhood for a point to be considered a core point.
- **Default**: `5`
- **Tuning**: Higher values establish stricter density criteria, identifying small satellite bursts as anomalies.

### Distance Metric
- `euclidean`: Standard $L_2$ Euclidean distance. Recommended default.
- `manhattan`: City block $L_1$ distance. Useful when differences across features should not be squared.
- `chebyshev`: Maximum coordinate distance ($L_\infty$).

---

## How Anomalies are Identified

- After DBSCAN executes on the `StandardScaler` normalized data, every record receives an integer label.
- Records with `label >= 0` belong to identified dense traffic clusters.
- Records with `label == -1` failed density criteria and are tagged as **Potential Anomalies**.
- **Important Note**: Low-density noise points indicate mathematical deviation from dominant flow patterns. They represent anomalous behavior requiring review, not confirmed malicious attacks.

---

## Visualization Methodology

- **Principal Component Analysis (PCA)**: Used strictly for dimensional reduction from $N$-dimensional scaled space down to two principal components (PC1 vs PC2) for plotting. DBSCAN runs on the full set of selected features.
- **Cluster Bar Charts**: Displays relative population counts across discovered clusters and noise points.
- **Density Histograms**: Directly contrasts normal traffic versus potential anomalies across individual network features.

---

## Limitations

1. **Varying Densities**: DBSCAN uses a global `eps` parameter; clusters with vastly differing densities may require HDBSCAN.
2. **Computational Complexity**: Standard pairwise distance calculation is $O(N^2)$ without spatial index structures; datasets over 20,000 rows benefit from controlled sampling.
3. **Curse of Dimensionality**: In very high-dimensional feature spaces, distance metrics degrade; selecting 3 to 8 key flow metrics is optimal.

---

## Future Enhancements

- Integration of OPTICS or HDBSCAN for hierarchical variable-density clustering.
- Real-time PCAP streaming capture ingestion via libpcap / Scapy.
- Automated k-distance graph generation for programmatic `eps` knee-point estimation.
- Feature importance ranking via isolation forests or decision boundary surrogates.

---

## Deployment & Custom Domain Configuration

### Deploying via Docker / Cloud Run

1. **Build Container**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

2. **Deploy Container to Cloud Run**:
```bash
gcloud run deploy network-anomaly-dbscan \
  --image gcr.io/PROJECT_ID/network-anomaly-dbscan \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Configuring Custom Domain & DNS

1. **Domain Mapping**: In Google Cloud Console, navigate to Cloud Run > Manage Custom Domains > Add Mapping.
2. **DNS Records**: Add the verified DNS CNAME or A records provided by Cloud Run to your domain registrar (e.g. Cloudflare, Route53, Namecheap):
   - Type: `CNAME` | Name: `subdomain` | Target: `ghs.googlehosted.com.`
3. **Automated SSL/TLS**: Cloud Run automatically provisions and renews managed Let's Encrypt certificates once DNS records propagate.
4. **Domain Verification**: Confirm HTTPS handshake using `curl -Iv https://yourdomain.com`.

---

## License & Academic Disclaimer

This project is released under the MIT License for educational and academic research. It is a research prototype and does not provide guaranteed intrusion detection or network defense capabilities.
