"""
Terms and Conditions Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st


def render_terms():
    st.title("Terms and Conditions")
    st.caption("Operational terms, project limitations, and liability disclaimers.")

    st.markdown("### 1. Educational and Project Scope")
    st.write(
        "This software application is built strictly as a college-level academic Machine Learning demonstration. "
        "It is designed to illustrate the mechanics of unsupervised density-based spatial clustering (DBSCAN) "
        "applied to continuous network flow metrics."
    )

    st.markdown("### 2. Acceptable Use")
    st.write(
        "Users agree to utilize this application solely for legitimate evaluation, research, educational, or "
        "demonstration purposes. Users must ensure that any network telemetry uploaded does not infringe on "
        "proprietary agreements, violate data security regulations, or expose confidential organizational communications."
    )

    st.markdown("### 3. Prototype Limitations and No Guarantee of Protection")
    st.markdown(
        """
        - **No Commercial Cyber Defense Guarantee**: This software is not an enterprise Intrusion Detection System (IDS), "
          Intrusion Prevention System (IPS), or Next-Generation Firewall (NGFW).
        - **No Attack Confirmation**: Detection of a DBSCAN noise point (label -1) indicates a mathematical deviation "
          from dense clusters. It does not constitute proof of malicious activity, unauthorized intrusion, or security compromise.
        - **No False Positive / Negative Guarantee**: Unsupervised clustering parameters (eps, min_samples) depend heavily "
          on dataset scale and feature distribution. False positives and false negatives will occur under varying operational profiles.
        """
    )

    st.markdown("### 4. Limitation of Liability")
    st.write(
        "Under no circumstances shall the authors, educational institutions, or contributors be held liable for any "
        "direct, indirect, incidental, or consequential damages resulting from the use or inability to use this software, "
        "including but not limited to network disruptions, undetected security incidents, or reliance on analytical findings."
    )

    st.markdown("### 5. Intellectual Property and Open Source Distribution")
    st.write(
        "The underlying algorithms utilized by this project are implemented using standard scientific libraries "
        "(scikit-learn, pandas, numpy, streamlit). Source code is distributed for academic inspection and open learning."
    )

    st.markdown("### 6. Modifications to Application")
    st.write(
        "The authors reserve the right to modify, update, or discontinue features of this prototype at any time "
        "without prior notice."
    )
