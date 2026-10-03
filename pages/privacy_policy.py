"""
Privacy Policy Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st


def render_privacy_policy():
    st.title("Privacy Policy")
    st.caption("Information regarding data handling, processing boundaries, and user privacy.")

    st.markdown("### Scope of Application")
    st.write(
        "This privacy policy applies solely to the 'Network Anomaly Detection using DBSCAN' application, "
        "developed as a college-level machine learning academic project."
    )

    st.markdown("### Data Collection and Ingestion")
    st.write(
        "The application processes only the network traffic data explicitly provided by the user via the "
        "CSV upload interface or generated through the synthetic benchmark generator."
    )
    st.write("Processed data typically includes continuous network flow statistics:")
    st.markdown(
        """
        - Flow Duration and timestamps
        - Packet counts (Forward and Backward)
        - Flow throughput (Bytes per second, Packets per second)
        - Packet length descriptive statistics (Mean, Standard Deviation, Variance)
        - Optional diagnostic reference labels
        """
    )

    st.markdown("### Processing and Storage Model")
    st.markdown(
        """
        - **Local In-Memory Execution**: Uploaded datasets are loaded directly into active application memory "
          (RAM) for preprocessing, scaling, and clustering.
        - **No Database Persistence**: The application does not maintain persistent database storage, external "
          log repositories, or cloud telemetry stores.
        - **Ephemeral Session Lifecycle**: All uploaded datasets and generated clustering assignments are "
          immediately discarded upon browser tab closure, page reload, or server process termination.
        - **No External Data Transmission**: Uploaded CSV telemetry is never transmitted to external third-party "
          APIs, advertising platforms, or telemetry collectors.
        """
    )

    st.markdown("### User Control and Data Removal")
    st.write(
        "Users retain complete control over their input data. Refreshing the browser or clearing the application "
        "session immediately removes all in-memory data structures."
    )

    st.markdown("### Compliance and Academic Disclaimer")
    st.write(
        "This software is an educational prototype. It has not been formally audited for enterprise compliance "
        "frameworks such as HIPAA, PCI-DSS, or ISO 27001. Organizations should avoid uploading un-sanitized, "
        "personally identifiable information (PII) or classified network captures without prior sanitization."
    )

    st.markdown("### Contact")
    st.write(
        "For academic inquiries, source inspection, or bug reports regarding this project, please consult the "
        "associated project repository documentation."
    )
