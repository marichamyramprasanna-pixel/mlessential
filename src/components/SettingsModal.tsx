import React, { useState } from "react";
import {
  X,
  Settings,
  Sliders,
  Sun,
  Moon,
  Bot,
  Database,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Shield,
  Zap,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { DistanceMetric } from "../ml/dbscan";
import { BotRole } from "./views/GeminiChatView";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "dbscan" | "appearance" | "gemini" | "storage";
}

type TabType = "dbscan" | "appearance" | "gemini" | "storage";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "dbscan",
}) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showTuningGuide, setShowTuningGuide] = useState<boolean>(false);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast(null);
    }, 2500);
  };

  const handleResetDbscan = () => {
    updateSettings({
      defaultEps: 0.5,
      defaultMinSamples: 5,
      defaultMetric: "euclidean",
      defaultSamplingLimit: 2500,
      autoNormalize: true,
      anomalyAlertThreshold: 15,
    });
    triggerToast("DBSCAN parameters reset to factory defaults (eps=0.50, min_samples=5).");
  };

  const handleResetAll = () => {
    resetSettings();
    triggerToast("All global settings restored to factory defaults.");
  };

  // EPS Presets
  const epsPresets = [
    { label: "Ultra-tight", value: 0.15, desc: "High-density micro-clusters" },
    { label: "Tight", value: 0.25, desc: "Sensitive to subtle density drops" },
    { label: "Standard", value: 0.5, desc: "Recommended benchmark default" },
    { label: "Loose", value: 1.0, desc: "Tolerant, merges adjacent clusters" },
    { label: "Broad", value: 1.75, desc: "Coarse multi-group clustering" },
  ];

  // Min Samples Presets
  const minSamplesPresets = [
    { label: "Ultra-sensitive", value: 2, desc: "Permits small paired micro-clusters" },
    { label: "Sensitive", value: 3, desc: "Fast triage for low-volume telemetry" },
    { label: "Standard", value: 5, desc: "Industry baseline (2 * features rule)" },
    { label: "Robust", value: 10, desc: "Resists noisy flow jitter & outliers" },
    { label: "Dense", value: 20, desc: "Demands heavy sustained traffic cores" },
  ];

  // Metric Options
  const metricOptions: {
    id: DistanceMetric;
    name: string;
    formula: string;
    desc: string;
  }[] = [
    {
      id: "euclidean",
      name: "Euclidean (L2 Norm)",
      formula: "sqrt(sum((x - y)^2))",
      desc: "Standard straight-line distance. Optimal for normalized continuous flow features.",
    },
    {
      id: "manhattan",
      name: "Manhattan (L1 Norm)",
      formula: "sum(|x - y|)",
      desc: "City-block grid distance. Less sensitive to isolated single-feature anomalies.",
    },
    {
      id: "chebyshev",
      name: "Chebyshev (L-inf)",
      formula: "max(|x - y|)",
      desc: "Maximum coordinate difference. Defines hypercube proximity neighborhoods.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2
                  id="settings-modal-title"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  Global Application Settings
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-medium">
                  SettingsProvider Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                User-configurable DBSCAN parameters & system preferences saved to browser storage
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetAll}
              className="flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
              title="Reset all settings to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Close Settings"
              aria-label="Close settings modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 gap-1 text-xs font-medium flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dbscan")}
            className={`flex items-center space-x-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "dbscan"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>DBSCAN Defaults</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center space-x-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "appearance"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Appearance & Theme</span>
          </button>

          <button
            onClick={() => setActiveTab("gemini")}
            className={`flex items-center space-x-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "gemini"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Gemini Chatbot</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`flex items-center space-x-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "storage"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Storage & Account</span>
          </button>
        </div>

        {/* Real-time Save Toast Banner */}
        {saveToast && (
          <div className="bg-sky-50 dark:bg-sky-950/70 border-b border-sky-300 dark:border-sky-800 px-5 py-2 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between animate-in fade-in duration-100 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{saveToast}</span>
            </div>
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase font-semibold">
              Persisted across sessions
            </span>
          </div>
        )}

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30 space-y-5">
          {/* TAB 1: DBSCAN DEFAULTS */}
          {activeTab === "dbscan" && (
            <div className="space-y-5">
              {/* Context Callout */}
              <div className="bg-sky-50 dark:bg-slate-900/60 border border-sky-200 dark:border-slate-800 rounded p-3.5 text-xs text-slate-700 dark:text-slate-300 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      User-Configurable Global DBSCAN Hyperparameters:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      These settings define your default baseline for all new anomaly detection sessions. When launching a detection run, these parameters are automatically preloaded and can be restored anytime with a single click.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetDbscan}
                  className="flex-shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                  title="Reset DBSCAN parameters to 0.50 and 5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset DBSCAN</span>
                </button>
              </div>

              {/* 1. Default EPS Radius with Dual Slider + Direct Number Input */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono uppercase flex items-center space-x-1.5">
                      <span>Default Epsilon (eps)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Neighborhood Radius</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Maximum geometric distance threshold between points to be considered neighbors in standardized space.
                    </p>
                  </div>

                  {/* Dual Control: Direct Numeric Input */}
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-400 font-mono">eps =</span>
                    <input
                      type="number"
                      min="0.05"
                      max="5.0"
                      step="0.05"
                      value={settings.defaultEps}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          const clamped = Math.min(5.0, Math.max(0.05, parseFloat(val.toFixed(2))));
                          updateSettings({ defaultEps: clamped });
                          triggerToast(`Default eps updated to ${clamped.toFixed(2)}`);
                        }
                      }}
                      className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-semibold text-sky-700 dark:text-sky-300 text-center focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="0.05"
                  max="3.0"
                  step="0.05"
                  value={settings.defaultEps}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateSettings({ defaultEps: val });
                    triggerToast(`Default eps set to ${val.toFixed(2)}`);
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
                />

                {/* Range boundaries */}
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0.05 (Tight / High anomaly rate)</span>
                  <span>1.50</span>
                  <span>3.00 (Loose / Single cluster)</span>
                </div>

                {/* EPS Quick Presets */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 mr-1 font-medium">Quick Presets:</span>
                  {epsPresets.map((p) => {
                    const isSelected = Math.abs(settings.defaultEps - p.value) < 0.01;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          updateSettings({ defaultEps: p.value });
                          triggerToast(`Applied ${p.label} eps preset (${p.value.toFixed(2)})`);
                        }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          isSelected
                            ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-400 font-semibold"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                        title={p.desc}
                      >
                        {p.label} ({p.value.toFixed(2)})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Default Min Samples with Dual Slider + Direct Number Input */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono uppercase flex items-center space-x-1.5">
                      <span>Default min_samples</span>
                      <span className="text-[10px] text-slate-400 font-normal">Core Density Threshold</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Minimum number of observations within eps-neighborhood to form a dense cluster core.
                    </p>
                  </div>

                  {/* Dual Control: Direct Numeric Input */}
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-400 font-mono">min_samples =</span>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      step="1"
                      value={settings.defaultMinSamples}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 2) {
                          const clamped = Math.min(50, Math.max(2, val));
                          updateSettings({ defaultMinSamples: clamped });
                          triggerToast(`Default min_samples updated to ${clamped}`);
                        }
                      }}
                      className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-semibold text-sky-700 dark:text-sky-300 text-center focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="2"
                  max="40"
                  step="1"
                  value={settings.defaultMinSamples}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updateSettings({ defaultMinSamples: val });
                    triggerToast(`Default min_samples set to ${val}`);
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
                />

                {/* Range boundaries */}
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>2 (Permissive micro-clusters)</span>
                  <span>20</span>
                  <span>40 (High-density clusters)</span>
                </div>

                {/* Min Samples Quick Presets */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 mr-1 font-medium">Quick Presets:</span>
                  {minSamplesPresets.map((p) => {
                    const isSelected = settings.defaultMinSamples === p.value;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          updateSettings({ defaultMinSamples: p.value });
                          triggerToast(`Applied ${p.label} min_samples preset (${p.value})`);
                        }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          isSelected
                            ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-400 font-semibold"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                        title={p.desc}
                      >
                        {p.label} ({p.value})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Distance Metric Selection Cards */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono uppercase">
                    Default Distance Metric
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mathematical distance function for continuous feature space evaluation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {metricOptions.map((opt) => {
                    const isSelected = settings.defaultMetric === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          updateSettings({ defaultMetric: opt.id });
                          triggerToast(`Default metric set to ${opt.name}`);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-sky-50 dark:bg-slate-800/80 border-sky-500 ring-2 ring-sky-500/20 shadow-xs"
                            : "bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
                            {opt.id}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-sky-600 text-white font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-1">
                          {opt.formula}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Sampling Limit and Normalization Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sampling Limit */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Default Sampling Limit
                    </label>
                    <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-semibold">
                      {(settings.defaultSamplingLimit || 2500).toLocaleString()} flows
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Row limit applied when sampling large network telemetry captures for responsive clustering.
                  </p>
                  <select
                    value={settings.defaultSamplingLimit || 2500}
                    onChange={(e) => {
                      const lim = parseInt(e.target.value, 10);
                      updateSettings({ defaultSamplingLimit: lim });
                      triggerToast(`Default sampling limit set to ${lim.toLocaleString()} flows`);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 font-mono mt-1"
                  >
                    <option value="1000">1,000 flows (Ultra Fast)</option>
                    <option value="2500">2,500 flows (Recommended Default)</option>
                    <option value="5000">5,000 flows (High Density)</option>
                    <option value="10000">10,000 flows (Deep Scan)</option>
                  </select>
                </div>

                {/* Anomaly Warning Threshold Alert */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Anomaly Alert Threshold
                    </label>
                    <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      {settings.anomalyAlertThreshold || 15}% noise
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Threshold percentage above which results are flagged for analyst review.
                  </p>
                  <select
                    value={settings.anomalyAlertThreshold || 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateSettings({ anomalyAlertThreshold: val });
                      triggerToast(`Anomaly alert threshold set to ${val}%`);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 font-mono mt-1"
                  >
                    <option value="5">5% (High sensitivity alert)</option>
                    <option value="10">10% (Moderate alert)</option>
                    <option value="15">15% (Recommended baseline)</option>
                    <option value="20">20% (Tolerant alert)</option>
                    <option value="30">30% (High noise tolerance)</option>
                  </select>
                </div>
              </div>

              {/* 5. StandardScaler Toggle */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Automatic StandardScaler Normalization (Recommended)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-normalizes continuous features to zero mean and unit variance ($z = (x - \mu) / \sigma$). Prevents large units (e.g. packet bytes) from overshadowing small units (e.g. connection duration).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoNormalize}
                  onChange={(e) => {
                    updateSettings({ autoNormalize: e.target.checked });
                    triggerToast(e.target.checked ? "StandardScaler enabled" : "StandardScaler disabled");
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* 6. Expandable DBSCAN Heuristics & Mathematical Reference Guide */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900/40 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowTuningGuide(!showTuningGuide)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>DBSCAN Mathematical Principles & Tuning Guide</span>
                  </div>
                  {showTuningGuide ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showTuningGuide && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                      <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-semibold text-sky-700 dark:text-sky-400 block font-mono">
                          1. Core Points
                        </span>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          Observations having at least <code>min_samples</code> within an <code>eps</code> radius: |N_eps(p)| &gt;= min_samples.
                        </p>
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 block font-mono">
                          2. Border Points
                        </span>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          Observations within <code>eps</code> of a core point, but having fewer than <code>min_samples</code> neighbors themselves.
                        </p>
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-semibold text-red-700 dark:text-red-400 block font-mono">
                          3. Outlier / Noise (-1)
                        </span>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          Observations not reachable from any core point. Flagged as anomalous network behavior.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                      <span className="font-semibold">Heuristic Rule of Thumb:</span>
                      <p>
                        For network traffic datasets with D features: set <code>min_samples &gt;= 2 * D</code>. If the resulting anomaly rate is too high (&gt; 25%), increase <code>eps</code> or reduce <code>min_samples</code>. If all observations merge into cluster 0, decrease <code>eps</code>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & THEME */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* White Mode Button Card */}
                <button
                  onClick={() => {
                    setTheme("light");
                    triggerToast("White mode theme activated.");
                  }}
                  className={`p-4 rounded-lg border text-left transition-all flex items-start space-x-3.5 ${
                    theme === "light"
                      ? "bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="w-9 h-9 rounded bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200 shadow-2xs">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        White Mode (Light)
                      </span>
                      {theme === "light" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-600 text-white font-medium shadow-2xs">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                      Clean high-contrast white aesthetic with crisp borders and optimal daytime legibility.
                    </p>
                  </div>
                </button>

                {/* Dark Mode Button Card */}
                <button
                  onClick={() => {
                    setTheme("dark");
                    triggerToast("Dark mode theme activated.");
                  }}
                  className={`p-4 rounded-lg border text-left transition-all flex items-start space-x-3.5 ${
                    theme === "dark"
                      ? "bg-slate-900 border-sky-500 shadow-md ring-2 ring-sky-500/20 text-slate-100"
                      : "bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <div className="w-9 h-9 rounded bg-slate-800 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-700 shadow-2xs">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-100">
                        Dark Mode (Terminal)
                      </span>
                      {theme === "dark" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-600 text-white font-medium shadow-2xs">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Cybersecurity operations terminal style with low-glare dark backgrounds.
                    </p>
                  </div>
                </button>
              </div>

              {/* Table Density Switch */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Compact Table Density
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Reduces row padding in telemetry tables to inspect more records per screen.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.compactTableView}
                  onChange={(e) => {
                    updateSettings({ compactTableView: e.target.checked });
                    triggerToast(e.target.checked ? "Compact table view enabled" : "Standard table view enabled");
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: GEMINI CHATBOT DEFAULTS */}
          {activeTab === "gemini" && (
            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Default Active AI Assistant Role
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "analyst" as BotRole,
                    label: "Network Traffic Analyst",
                    model: "gemini-3.5-flash",
                    icon: <Shield className="w-4 h-4 text-sky-500" />,
                    desc: "General clustering interpretation & noise validation",
                  },
                  {
                    id: "telemetry_fast" as BotRole,
                    label: "Rapid Telemetry Assistant",
                    model: "gemini-3.1-flash-lite",
                    icon: <Zap className="w-4 h-4 text-amber-500" />,
                    desc: "High-speed answers for metric formulas and tuning",
                  },
                  {
                    id: "threat_complex" as BotRole,
                    label: "Deep Threat Modeler",
                    model: "gemini-3.1-pro-preview",
                    icon: <Cpu className="w-4 h-4 text-emerald-500" />,
                    desc: "Multi-stage attack graphs & MITRE ATT&CK mapping",
                  },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      updateSettings({ defaultChatbotRole: role.id });
                      triggerToast(`Default chatbot role set to ${role.label}`);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      settings.defaultChatbotRole === role.id
                        ? "bg-sky-50 dark:bg-slate-800 border-sky-500 ring-2 ring-sky-500/20 shadow-xs"
                        : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {role.icon}
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {role.label}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-1">
                      {role.model}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {role.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Auto-Attach Telemetry Context */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Auto-Attach Telemetry Context
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Automatically shares active dataset summaries and noise percentages with chatbot requests for contextual triage.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAttachTelemetryContext}
                  onChange={(e) => {
                    updateSettings({ autoAttachTelemetryContext: e.target.checked });
                    triggerToast(e.target.checked ? "Context attachment enabled" : "Context attachment disabled");
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: STORAGE & ACCOUNT */}
          {activeTab === "storage" && (
            <div className="space-y-4">
              {/* User Account Details */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 shadow-xs">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Firebase Cloud Firestore Status
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user
                    ? `Connected as ${user.displayName || user.email} (UID: ${user.uid.slice(0, 10)}...)`
                    : "Not currently signed in with Google. Sessions can be saved after signing in."}
                </p>
              </div>

              {/* Data Table and CSV Export Defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 shadow-xs">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    CSV Delimiter
                  </label>
                  <select
                    value={settings.csvDelimiter}
                    onChange={(e) => {
                      const d = e.target.value as "," | ";";
                      updateSettings({ csvDelimiter: d });
                      triggerToast(`CSV delimiter set to ${d === "," ? "comma (,)" : "semicolon (;)"}`);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                  </select>
                </div>

                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 shadow-xs">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Rows Per Table Page
                  </label>
                  <select
                    value={settings.maxTableRows}
                    onChange={(e) => {
                      const r = parseInt(e.target.value, 10);
                      updateSettings({ maxTableRows: r });
                      triggerToast(`Page size set to ${r} rows`);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value="10">10 records</option>
                    <option value="15">15 records (Default)</option>
                    <option value="25">25 records</option>
                    <option value="50">50 records</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All parameter adjustments auto-save immediately to SettingsProvider</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
