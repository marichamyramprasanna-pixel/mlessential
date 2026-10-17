import React, { useState, useMemo } from "react";
import {
  BookOpen,
  HelpCircle,
  Play,
  Sliders,
  Layers,
  Table,
  ScatterChart,
  Box,
  Globe,
  Bot,
  Cloud,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  ExternalLink,
  Cpu,
  EyeOff,
  Hash,
  Download,
  Info,
  Zap,
  Target,
  FileText,
  Activity,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { ViewType } from "../Sidebar";

interface UserManualViewProps {
  onNavigate: (view: ViewType) => void;
  onLoadSample: () => void;
  hasDataset: boolean;
  hasResults: boolean;
}

export const UserManualView: React.FC<UserManualViewProps> = ({
  onNavigate,
  onLoadSample,
  hasDataset,
  hasResults,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "all" | "workflow" | "modules" | "calculator" | "glossary" | "faqs"
  >("all");

  // Interactive Parameter Calculator State
  const [calcRecordCount, setCalcRecordCount] = useState<number>(2500);
  const [calcFeatureCount, setCalcFeatureCount] = useState<number>(6);
  const [calcNoiseExpectation, setCalcNoiseExpectation] = useState<"low" | "medium" | "high">("medium");

  // Parameter Calculator Logic
  const calculatedRecommendation = useMemo(() => {
    // Standard rule of thumb: MinSamples >= 2 * features
    let minSamples = Math.max(4, Math.round(calcFeatureCount * 2));
    if (calcRecordCount > 10000) minSamples = Math.round(minSamples * 1.5);

    // Epsilon estimate for standardized data (StandardScaler zero mean, unit variance)
    // Higher feature counts expand spatial volume (curse of dimensionality), requiring slightly larger eps
    let baseEps = 0.45;
    if (calcFeatureCount <= 3) baseEps = 0.35;
    else if (calcFeatureCount <= 6) baseEps = 0.50;
    else baseEps = 0.65;

    if (calcNoiseExpectation === "low") baseEps += 0.15; // larger eps = fewer anomalies
    if (calcNoiseExpectation === "high") baseEps -= 0.10; // smaller eps = more anomalies

    return {
      eps: Number(Math.max(0.15, Math.min(1.5, baseEps)).toFixed(2)),
      minSamples,
      metric: calcFeatureCount > 8 ? "cosine" : "euclidean",
      rationale:
        calcFeatureCount > 8
          ? "With more than 8 features, Cosine or Manhattan distance mitigates dimensional sparsity better than Euclidean distance."
          : "Standard Euclidean distance with normalized z-scores provides intuitive spherical density neighborhoods.",
    };
  }, [calcRecordCount, calcFeatureCount, calcNoiseExpectation]);

  // Frequently Asked Questions
  const faqs = [
    {
      q: "Why are all or most of my records classified as Noise (-1)?",
      a: "This happens when your Epsilon (eps) parameter is set too small, or MinSamples is too large. When eps is too narrow, observations cannot find enough neighbors within distance eps to satisfy the density threshold. Increase eps by 0.1 - 0.25 increments or decrease MinSamples.",
    },
    {
      q: "Why is all traffic grouped into a single cluster (0) with zero anomalies?",
      a: "Your Epsilon (eps) parameter is too broad. High epsilon values link distant, scattered points into one giant continuous cluster. Decrease eps by 0.1 increments to tighten cluster boundaries and separate true dense traffic from outliers.",
    },
    {
      q: "Why is StandardScaler normalization critical for network traffic?",
      a: "Network telemetry features use vastly different mathematical units. For example, 'Flow Duration' can range from 1 to 10,000,000 microseconds, whereas 'SYN Flag Count' is only 0 or 1. Without StandardScaler, Flow Duration would completely dominate distance calculations. StandardScaler standardizes each feature to mean 0 and variance 1 ($z = (x - \\mu) / \\sigma$).",
    },
    {
      q: "What does a DBSCAN cluster label of -1 mean?",
      a: "Label -1 is the universal DBSCAN designation for Noise. In network security, Noise points represent statistical anomalies: flows that deviated significantly from common, high-density baseline behaviors. These are prime candidates for further threat triage.",
    },
    {
      q: "How does the AI Security Chatbot use my dataset context?",
      a: "When 'Auto-Attach Telemetry Context' is enabled in Settings, the assistant receives non-sensitive summary aggregates (total flows, cluster counts, noise percentages, active feature names, and DBSCAN parameters). It never receives raw records or private IP addresses.",
    },
    {
      q: "Can I export detected anomaly records for firewall rules or SIEM ingestion?",
      a: "Yes. In the 'Results' view, click 'Export CSV'. You can download either the full classified dataset or exclusively the anomaly records (Label -1). All fields are automatically sanitized against formula injection (CWE-1236).",
    },
  ];

  // Telemetry Feature Dictionary
  const telemetryGlossary = [
    {
      name: "Flow Duration (microseconds)",
      desc: "Total elapsed duration of the bidirectional network flow from first SYN/packet to teardown.",
      anomalyMeaning: "Extremely long durations often correspond to C2 beaconing, SSH tunnels, or slowloris attacks. Extremely short durations indicate port scanning.",
    },
    {
      name: "Total Fwd Packets",
      desc: "Number of packets dispatched from the connection initiator (client) to the destination (server).",
      anomalyMeaning: "Massive asymmetry between forward and backward packets is a hallmark of SYN flooding or UDP volumetric amplification reflection.",
    },
    {
      name: "Total Backward Packets",
      desc: "Number of packets returned from destination back to source.",
      anomalyMeaning: "Zero backward packets across multiple connection attempts indicates rejected or filtered traffic typical of stealth scanning.",
    },
    {
      name: "Flow Bytes/s",
      desc: "Transmission throughput rate measured as total bytes transferred divided by flow duration.",
      anomalyMeaning: "Sudden massive throughput bursts suggest automated data exfiltration or volumetric denial-of-service.",
    },
    {
      name: "Flow Packets/s",
      desc: "Packet frequency rate over the connection lifespan.",
      anomalyMeaning: "Very high packet frequency indicates high-velocity automated network service discovery tools like Masscan or ZMap.",
    },
    {
      name: "Packet Length Mean & Std",
      desc: "Average size of IP packets in bytes and the statistical deviation across the conversation.",
      anomalyMeaning: "Fixed uniform packet sizes with zero variance indicate automated botnet heartbeats or scripted DDoS payloads.",
    },
    {
      name: "SYN Flag Count",
      desc: "Frequency of TCP synchronization control flags observed within the flow.",
      anomalyMeaning: "High SYN counts with low ACK responses represent TCP half-open SYN flood reconnaissance or resource exhaustion.",
    },
    {
      name: "ACK / PSH / RST Flags",
      desc: "TCP session control state flags signaling acknowledgement, immediate data push, or connection termination.",
      anomalyMeaning: "Unusual flag combinations (e.g., NULL flags, Christmas tree scans with FIN/PSH/URG) are deliberate firewall evasion techniques.",
    },
  ];

  // Filter items by search query
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Application User Manual & Security Operations Guide
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-semibold uppercase">
                  v2.4 Technical Manual
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Complete guide to unsupervised machine learning for network anomaly triage, 2D/3D visualization, threat correlation, and telemetry protection.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!hasDataset ? (
              <button
                onClick={onLoadSample}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Load Sample Benchmark</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate("detection")}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure DBSCAN</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Quick Category Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user manual topics (e.g., epsilon, PCA, MITRE, noise)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-sans text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 text-xs">
            {[
              { id: "all", label: "All Topics" },
              { id: "workflow", label: "5-Step Workflow" },
              { id: "modules", label: "Feature Guide" },
              { id: "calculator", label: "Parameter Calculator" },
              { id: "glossary", label: "Flow Metrics" },
              { id: "faqs", label: "FAQs" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeCategory === tab.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK START 5-STEP WORKFLOW GUIDE */}
      {(activeCategory === "all" || activeCategory === "workflow") && matchesSearch("workflow quick start guide ingest") && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Quick Start Workflow (5 Core Steps)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                step: "01",
                title: "Ingest CSV",
                targetView: "overview" as ViewType,
                desc: "Drop your network flow CSV file or click 'Load Sample Benchmark' to start with 2,500 validated telemetry flows.",
                actionText: "Go to Ingestion",
              },
              {
                step: "02",
                title: "Select Features",
                targetView: "dataset_analysis" as ViewType,
                desc: "Choose numerical dimensions (Duration, Packet Rates, Bytes/s). Toggle 'Privacy Mode' to de-identify internal IPs.",
                actionText: "Analyze Columns",
              },
              {
                step: "03",
                title: "Tune DBSCAN",
                targetView: "detection" as ViewType,
                desc: "Set Epsilon (neighborhood radius) and MinSamples (density floor). Enable automatic StandardScaler normalization.",
                actionText: "Configure ML",
              },
              {
                step: "04",
                title: "Triage Outliers",
                targetView: "results" as ViewType,
                desc: "Inspect cluster distributions. Records classified as -1 represent statistical noise and potential attacks.",
                actionText: "Inspect Outliers",
              },
              {
                step: "05",
                title: "Spatial & Intel",
                targetView: "three_d_model" as ViewType,
                desc: "Explore 3D PCA cluster hulls, query OpenRouter threat feeds, and interrogate the AI Security Chatbot.",
                actionText: "Launch 3D Explorer",
              },
            ].map((st) => (
              <div
                key={st.step}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                    <span className="font-bold text-sky-600 dark:text-sky-400">STEP {st.step}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {st.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                    {st.desc}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(st.targetView)}
                  className="inline-flex items-center space-x-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 pt-2 border-t border-slate-100 dark:border-slate-800/80"
                >
                  <span>{st.actionText}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTERACTIVE PARAMETER CALCULATOR & RECOMMENDATION ENGINE */}
      {(activeCategory === "all" || activeCategory === "calculator") && matchesSearch("parameter calculator epsilon minsamples") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-sky-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Interactive DBSCAN Hyperparameter Calculator & Sizing Tool
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Determine mathematically grounded starting values for Epsilon ($\epsilon$) and MinSamples based on dataset geometry.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Total Telemetry Flows (N):</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{calcRecordCount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={25000}
                  step={100}
                  value={calcRecordCount}
                  onChange={(e) => setCalcRecordCount(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[11px] mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Selected Numerical Features (D):</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{calcFeatureCount} dimensions</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={calcFeatureCount}
                  onChange={(e) => setCalcFeatureCount(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Target Anomaly Sensitivity:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "low", label: "High Precision (Lower noise rate ~3-8%)" },
                    { id: "medium", label: "Balanced (Recommended ~8-15%)" },
                    { id: "high", label: "High Sensitivity (Aggressive triage ~15-25%)" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCalcNoiseExpectation(lvl.id as any)}
                      className={`p-2 rounded text-left border transition-all ${
                        calcNoiseExpectation === lvl.id
                          ? "bg-sky-50 dark:bg-sky-950/60 border-sky-500 font-medium text-sky-800 dark:text-sky-200"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="font-semibold capitalize text-[11px]">{lvl.id}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{lvl.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Recommendation Card */}
            <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-200 space-y-3 flex flex-col justify-between">
              <div>
                <div className="text-slate-400 font-sans font-semibold text-xs border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>Recommended Starting Hyperparameters</span>
                  <span className="text-[10px] text-emerald-400 uppercase font-mono">DBSCAN Validated</span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3">
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Epsilon (eps)</span>
                    <span className="text-lg font-bold text-sky-400">{calculatedRecommendation.eps}</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">MinSamples</span>
                    <span className="text-lg font-bold text-amber-400">{calculatedRecommendation.minSamples}</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Metric</span>
                    <span className="text-sm font-bold text-emerald-400 mt-1 block uppercase">
                      {calculatedRecommendation.metric}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3 font-sans leading-relaxed">
                  {calculatedRecommendation.rationale}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Heuristic: Ester et al. (1996)</span>
                <button
                  onClick={() => onNavigate("detection")}
                  className="inline-flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-sans font-medium"
                >
                  <span>Apply to Detection View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE FEATURE MODULES BREAKDOWN */}
      {(activeCategory === "all" || activeCategory === "modules") && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Layers className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Detailed Feature & Module Reference
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module 1: Overview & Ingestion */}
            {matchesSearch("overview ingestion csv sample drag drop") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>1. Overview & Data Ingestion</span>
                  </div>
                  <button
                    onClick={() => onNavigate("overview")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The entry point of the pipeline. Ingest any network flow CSV with drag-and-drop or load the bundled 2,500-flow benchmark dataset.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>Auto-Cleaning:</strong> Sanitizes formula characters (=, +, -, @) and removes dangerous script tags.</div>
                  <div>&bull; <strong>Dos Ceiling:</strong> Enforces safe 50,000 row and 120 column ceilings.</div>
                  <div>&bull; <strong>Integrity Hash:</strong> Computes a tamper-evident SHA-256 fingerprint on ingestion.</div>
                </div>
              </div>
            )}

            {/* Module 2: Dataset Analysis */}
            {matchesSearch("dataset analysis feature selection privacy mask pii") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>2. Dataset Analysis & Feature Selection</span>
                  </div>
                  <button
                    onClick={() => onNavigate("dataset_analysis")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Inspect column statistics (Mean, Std Dev, Min, Max), identify reference label columns, and choose active dimensions.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>Feature Toggle:</strong> Select 2 to 12 numerical features for continuous space clustering.</div>
                  <div>&bull; <strong>Privacy Masking:</strong> One-click toggle hides internal IPv4, MAC, and email addresses.</div>
                  <div>&bull; <strong>Reference Detection:</strong> Automatically flags existing label/attack tags for comparison.</div>
                </div>
              </div>
            )}

            {/* Module 3: Detection Parameters */}
            {matchesSearch("detection parameters epsilon minsamples metric dbscan") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>3. Detection & Hyperparameter Tuning</span>
                  </div>
                  <button
                    onClick={() => onNavigate("detection")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Control the DBSCAN clustering engine. Adjust epsilon (radius), min_samples (core density), and distance metrics.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>StandardScaler:</strong> Zero-mean unit variance normalization ($z = (x - \mu) / \sigma$).</div>
                  <div>&bull; <strong>Distance Metrics:</strong> Euclidean (L2), Manhattan (L1), Cosine, and Chebyshev (L&infin;).</div>
                  <div>&bull; <strong>Auto-Sampler:</strong> Safeguards browser performance when evaluating large flow volumes.</div>
                </div>
              </div>
            )}

            {/* Module 4: Results & Triage */}
            {matchesSearch("results triage clusters noise anomalies export") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Table className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>4. Detection Results & Outlier Triage</span>
                  </div>
                  <button
                    onClick={() => onNavigate("results")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Examine discovered dense clusters vs statistical outliers (Noise Point -1). Compare metric deviations.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>Statistical Comparison:</strong> Mean/median delta between regular and anomalous traffic.</div>
                  <div>&bull; <strong>Filter & Search:</strong> Inspect specific flow records by cluster ID or keyword.</div>
                  <div>&bull; <strong>CSV Export:</strong> Download full dataset or noise-only CSVs for SIEM/EDR ingestion.</div>
                </div>
              </div>
            )}

            {/* Module 5: 2D & 3D Explorers */}
            {matchesSearch("2d 3d model explorer pca threejs spatial visualization") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Box className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>5. 2D & 3D Spatial Visualizations</span>
                  </div>
                  <button
                    onClick={() => onNavigate("three_d_model")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Principal Component Analysis (PCA) maps complex n-dimensional telemetry into 2D and 3D spatial representations.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>Three.js 3D Scene:</strong> Interactive orbit, auto-rotation, cluster centroids, and bounding spheres.</div>
                  <div>&bull; <strong>Pulsing Beacons:</strong> Red spatial markers locate noise points isolated from core clouds.</div>
                  <div>&bull; <strong>Graceful WebGL Fallback:</strong> Seamlessly runs in sandboxed or headless browser environments.</div>
                </div>
              </div>
            )}

            {/* Module 6: Threat Intelligence */}
            {matchesSearch("threat intelligence mitre attack search cve openrouter") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>6. Threat Intelligence & MITRE Mapping</span>
                  </div>
                  <button
                    onClick={() => onNavigate("threat_intel")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Correlate observed feature deviations with known cyber threats, botnet campaigns, and MITRE ATT&CK techniques.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>MITRE ATT&CK Mapping:</strong> Correlates flows to T1046 (Scanning), T1498 (DDoS), T1071 (C2).</div>
                  <div>&bull; <strong>Port Triage:</strong> Advises on critical ports (TCP 80/443, 445 SMB, 3389 RDP).</div>
                  <div>&bull; <strong>Mitigation Rules:</strong> Instant firewall snippets and Snort/Suricata signatures.</div>
                </div>
              </div>
            )}

            {/* Module 7: AI Security Chatbot */}
            {matchesSearch("ai chatbot openrouter multi-turn llama reasoning") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Bot className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>7. AI Security Chatbot</span>
                  </div>
                  <button
                    onClick={() => onNavigate("gemini_chat")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Interactive multi-turn technical assistant powered by OpenRouter LLMs (Llama 3.1 8B & Llama 3.2 3B).
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>Specialized Roles:</strong> Traffic Analyst, Rapid Telemetry Assistant, Deep Threat Modeler.</div>
                  <div>&bull; <strong>Telemetry Grounding:</strong> Answers conditioned on your current active dataset summary.</div>
                  <div>&bull; <strong>Native Enter Submission:</strong> Press Enter to immediately dispatch questions.</div>
                </div>
              </div>
            )}

            {/* Module 8: Cloud Sessions */}
            {matchesSearch("cloud sessions firebase auth firestore save load") && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                    <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>8. Cloud Sessions & Firestore Storage</span>
                  </div>
                  <button
                    onClick={() => onNavigate("cloud_sessions")}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Open View &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Persist detection sessions, selected features, and clustering hyperparameters to your Google Firebase account.
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                  <div>&bull; <strong>Authentication:</strong> Seamless Google Sign-In with Firebase Auth.</div>
                  <div>&bull; <strong>1-Click Restore:</strong> Reload historical hyperparameters to reproduce analysis exactly.</div>
                  <div>&bull; <strong>Audit Logs:</strong> Secure, owner-isolated records strictly governed by Firestore rules.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOW METRICS DICTIONARY */}
      {(activeCategory === "all" || activeCategory === "glossary") && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Network Telemetry Metrics Dictionary
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {telemetryGlossary
              .filter((item) => matchesSearch(item.name + " " + item.desc + " " + item.anomalyMeaning))
              .map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1.5 shadow-xs"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {item.name}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {item.desc}
                  </p>
                  <div className="text-[10px] font-mono p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 mt-1">
                    <span className="font-bold">Anomaly Significance:</span> {item.anomalyMeaning}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* FAQS & TROUBLESHOOTING */}
      {(activeCategory === "all" || activeCategory === "faqs") && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <HelpCircle className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Frequently Asked Questions & Troubleshooting
            </h2>
          </div>

          <div className="space-y-3">
            {faqs
              .filter((faq) => matchesSearch(faq.q + " " + faq.a))
              .map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-1.5 shadow-xs"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-start space-x-2">
                    <span className="text-sky-600 dark:text-sky-400 font-mono">Q:</span>
                    <span>{faq.q}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
                    {faq.a}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Footer Navigation Assist */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
        <span>Network Anomaly Detection &bull; Operational Documentation</span>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate("overview")}
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            1. Overview
          </button>
          <span>&bull;</span>
          <button
            onClick={() => onNavigate("detection")}
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            3. Detection
          </button>
          <span>&bull;</span>
          <button
            onClick={() => onNavigate("three_d_model")}
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            6. 3D Model Explorer
          </button>
          <span>&bull;</span>
          <button
            onClick={() => onNavigate("gemini_chat")}
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            9. AI Security Chatbot
          </button>
        </div>
      </div>
    </div>
  );
};
