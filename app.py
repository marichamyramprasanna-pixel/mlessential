"""
Network Anomaly Detection using DBSCAN
Main Streamlit Application Entry Point
"""

import os
import streamlit as st

# Configure page settings
icon_path = os.path.join(os.path.dirname(__file__), "assets", "favicon.png")
if not os.path.exists(icon_path):
    icon_path = "assets/favicon.png"

st.set_page_config(
    page_title="Network Anomaly Detection using DBSCAN",
    page_icon=icon_path if os.path.exists(icon_path) else None,
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom minimal styling to enforce clean technical appearance and no pill-shaped buttons
st.markdown(
    """
    <style>
    /* Dark neutral technical styling */
    .stButton > button {
        border-radius: 4px !important;
        font-weight: 500;
        letter-spacing: 0.02em;
    }
    div[data-testid="stMetricValue"] {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 1.6rem !important;
    }
    /* Subtle borders */
    div[data-testid="stMetric"] {
        border: 1px solid #334155;
        padding: 12px;
        border-radius: 4px;
        background-color: #0f172a;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Import page views
from pages.overview import render_overview
from pages.dataset_analysis import render_dataset_analysis
from pages.detection import render_detection
from pages.results import render_results
from pages.visualization import render_visualization
from pages.about import render_about
from pages.privacy_policy import render_privacy_policy
from pages.terms import render_terms

# Sidebar Navigation
st.sidebar.title("Navigation")
st.sidebar.caption("DBSCAN Network Outlier Analysis")

pages = {
    "1. Overview": render_overview,
    "2. Dataset Analysis": render_dataset_analysis,
    "3. Detection": render_detection,
    "4. Results": render_results,
    "5. Visualization": render_visualization,
    "6. About DBSCAN": render_about,
    "7. Privacy Policy": render_privacy_policy,
    "8. Terms & Conditions": render_terms,
}

selected_page = st.sidebar.radio("Select View", list(pages.keys()))

# Sidebar System Telemetry / Active State
st.sidebar.markdown("---")
st.sidebar.markdown("### Session Status")

if "raw_df" in st.session_state and st.session_state["raw_df"] is not None:
    df = st.session_state["raw_df"]
    st.sidebar.text(f"Dataset: {len(df):,} records")
    selected = st.session_state.get("selected_features", [])
    st.sidebar.text(f"Features: {len(selected)} selected")
    if "results" in st.session_state:
        res = st.session_state["results"]
        st.sidebar.text(f"Clusters: {res['num_clusters']}")
        st.sidebar.text(f"Noise (Anomalies): {res['num_anomalies']:,} ({res['anomaly_percentage']}%)")
    else:
        st.sidebar.caption("Status: Ready to detect")
else:
    st.sidebar.caption("No dataset loaded.")

st.sidebar.markdown("---")
st.sidebar.caption("College ML Project: DBSCAN Density-Based Traffic Analysis.")

# Render chosen page
pages[selected_page]()
