"""
About DBSCAN Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st


def render_about():
    st.title("About DBSCAN")
    st.caption("Density-Based Spatial Clustering of Applications with Noise")

    st.markdown("### Theoretical Foundation")
    st.markdown(
        """
        **DBSCAN** (Density-Based Spatial Clustering of Applications with Noise) is an unsupervised 
        machine learning clustering algorithm introduced by Martin Ester, Hans-Peter Kriegel, 
        Jörg Sander, and Xiaowei Xu in 1996.
        
        Unlike partition-based algorithms such as K-Means or hierarchical approaches, DBSCAN groups 
        points based on spatial density rather than centroid proximity. Observations that reside in 
        sufficiently dense neighborhoods are merged into clusters, while observations in sparse 
        regions are flagged as noise.
        """
    )

    st.markdown("### Core Point Types in DBSCAN")
    c1, c2, c3 = st.columns(3)

    with c1:
        st.markdown("#### Core Points")
        st.write(
            "A point is a **Core Point** if its epsilon (eps) neighborhood contains at least "
            "**min_samples** points (including itself). Core points represent the dense structural centers "
            "of regular network flow patterns."
        )

    with c2:
        st.markdown("#### Border Points")
        st.write(
            "A point is a **Border Point** if it falls within the epsilon radius of a core point, "
            "but its own neighborhood contains fewer than **min_samples** points. Border points form the outer "
            "boundaries of clusters."
        )

    with c3:
        st.markdown("#### Noise Points (Anomalies)")
        st.write(
            "A point is designated as a **Noise Point** (assigned label **-1**) if it is neither a core point "
            "nor reachable from any core point. In this project, noise points represent **Potential Anomalies**."
        )

    st.markdown("### Critical Hyperparameters")
    st.markdown(
        """
        - **EPS (Epsilon, $\\epsilon$)**: Specifies the radius of the neighborhood around each point. If $\\epsilon$ 
          is too small, a large portion of normal traffic may be erroneously flagged as noise. If $\\epsilon$ is too 
          large, distinct anomalous flows may merge into normal traffic clusters.
        - **MIN SAMPLES**: Specifies the threshold of points required within the $\\epsilon$-neighborhood to establish 
          a dense region. Higher values make the algorithm stricter, requiring denser traffic to qualify as normal.
        - **Distance Metric**: The geometric formula used to compute distances in standardized space. Euclidean distance 
          is standard, while Manhattan or Chebyshev can be used for specific coordinate properties.
        """
    )

    st.markdown("### Suitability for Network Traffic Anomaly Detection")
    st.markdown(
        """
        1. **No Predefined Cluster Count ($k$)**: Real network traffic is composed of an unknown and dynamic number 
           of protocols, session types, and behavior profiles. DBSCAN discovers the natural number of clusters autonomously.
        2. **Arbitrary Cluster Geometry**: Normal network activity does not conform to spherical Gaussian blobs. DBSCAN 
           can trace elongated, non-linear, and manifold-shaped patterns.
        3. **Native Noise Labeling**: Unlike algorithms that force every outlier into an artificial cluster, DBSCAN 
           explicitly isolates low-density outliers with label **-1**.
        4. **Interpretability**: Points assigned to label **-1** are mathematically guaranteed to be isolated from 
           the predominant patterns of the network flow baseline.
        """
    )

    st.markdown("### Important Operational Disclaimer")
    st.warning(
        "A DBSCAN noise point is a mathematical outlier in the feature space. An unusual observation is not "
        "necessarily malicious. Legitimate administrative actions, software updates, or sudden traffic spikes "
        "can also manifest as low-density noise points."
    )
