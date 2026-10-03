"""
Detection Configuration & Execution Page - Network Anomaly Detection using DBSCAN
"""

import streamlit as st
import pandas as pd
from src.preprocessing import clean_and_preprocess
from src.dbscan_model import run_dbscan


def render_detection():
    st.title("Detection Configuration")
    st.caption("Configure DBSCAN hyperparameters, review preprocessing, and execute anomaly clustering.")

    if "raw_df" not in st.session_state or st.session_state["raw_df"] is None:
        st.warning("No dataset loaded yet. Please return to the Overview page to upload a CSV file.")
        return

    raw_df: pd.DataFrame = st.session_state["raw_df"]
    selected_features = st.session_state.get("selected_features", [])

    if len(selected_features) < 2:
        st.error("Please return to 'Dataset Analysis' and select at least two numerical features before configuring detection.")
        return

    st.markdown("### Preprocessing Configuration")
    c1, c2 = st.columns(2)
    with c1:
        enable_sampling = st.checkbox(
            "Enable Controlled Dataset Sampling (for large files)",
            value=len(raw_df) > 5000,
            help="If dataset is large, limits rows to a controlled sample to optimize clustering latency.",
        )
    with c2:
        max_samples = 2500
        if enable_sampling:
            max_samples = st.slider(
                "Sample Size",
                min_value=200,
                max_value=min(20000, len(raw_df)),
                value=min(2500, len(raw_df)),
                step=100,
            )

    st.markdown("### DBSCAN Hyperparameters")
    p1, p2, p3 = st.columns(3)

    with p1:
        st.markdown("**EPS (Epsilon)**")
        st.caption("Maximum distance between neighboring observations to be considered in the same neighborhood.")
        eps = st.number_input(
            "Epsilon value",
            min_value=0.05,
            max_value=15.0,
            value=0.5,
            step=0.05,
            format="%.2f",
            label_visibility="collapsed",
        )

    with p2:
        st.markdown("**MIN SAMPLES**")
        st.caption("Minimum number of observations required to form a dense region or cluster core.")
        min_samples = st.number_input(
            "Min samples value",
            min_value=2,
            max_value=100,
            value=5,
            step=1,
            label_visibility="collapsed",
        )

    with p3:
        st.markdown("**Distance Metric**")
        st.caption("Mathematical metric used to compute distances in standardized feature space.")
        metric = st.selectbox(
            "Metric selection",
            options=["euclidean", "manhattan", "chebyshev"],
            index=0,
            label_visibility="collapsed",
        )

    st.markdown("### Execution")
    if st.button("Run Anomaly Detection", type="primary"):
        with st.spinner("Preprocessing features with StandardScaler and applying DBSCAN clustering..."):
            limit = max_samples if enable_sampling else None
            clean_df, scaled_data, scaler, prep_summary, prep_err = clean_and_preprocess(
                df=raw_df,
                selected_features=selected_features,
                max_samples=limit,
            )

            if prep_err:
                st.error(prep_err)
                return

            try:
                labels, results = run_dbscan(
                    scaled_data=scaled_data,
                    eps=eps,
                    min_samples=min_samples,
                    metric=metric,
                )

                st.session_state["clean_df"] = clean_df
                st.session_state["scaled_data"] = scaled_data
                st.session_state["scaler"] = scaler
                st.session_state["labels"] = labels
                st.session_state["results"] = results
                st.session_state["prep_summary"] = prep_summary

                st.success(
                    f"DBSCAN execution complete. Processed {results['total_records']:,} records. "
                    f"Found {results['num_clusters']} cluster(s) and {results['num_anomalies']:,} potential anomalies "
                    f"({results['anomaly_percentage']}%). Proceed to 'Results' or 'Visualization'."
                )
            except Exception as e:
                st.error(f"DBSCAN execution failed: {str(e)}")

    if "prep_summary" in st.session_state:
        st.markdown("### Preprocessing Summary Audit")
        s = st.session_state["prep_summary"]
        sc1, sc2, sc3, sc4 = st.columns(4)
        sc1.metric("Original Rows", f"{s['original_rows']:,}")
        sc2.metric("Original Columns", f"{s['original_columns']}")
        sc3.metric("Removed Rows", f"{s['removed_rows']:,}")
        sc4.metric("Missing Handled", f"{s['missing_values_handled']:,}")

        sc5, sc6, sc7, sc8 = st.columns(4)
        sc5.metric("Duplicate Rows", f"{s['duplicate_rows']:,}")
        sc6.metric("Infinite Handled", f"{s.get('infinite_values_found', 0):,}")
        sc7.metric("Selected Features", f"{len(s['selected_features'])}")
        sc8.metric("Final Rows Used", f"{s['final_rows_used']:,}")

        if s.get("sampling_applied"):
            st.info(
                f"Controlled sampling was applied: Reduced from {s['original_before_sampling']:,} "
                f"valid records to {s['final_rows_used']:,} records for computational balance."
            )
