import React, { useState, useEffect } from "react";
import {
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Layers,
  ArrowRight,
  RotateCcw,
  Settings as SettingsIcon,
  Box,
} from "lucide-react";
import { DistanceMetric, DBSCANResults } from "../../ml/dbscan";
import { PreprocessingSummary } from "../../ml/preprocessing";
import { useSettings } from "../../context/SettingsContext";

interface DetectionViewProps {
  selectedFeatures: string[];
  rawRowCount: number;
  onRunDetection: (params: {
    eps: number;
    minSamples: number;
    metric: DistanceMetric;
    samplingLimit?: number;
  }) => void;
  isProcessing: boolean;
  results: DBSCANResults | null;
  summary: PreprocessingSummary | null;
  onNavigate: (view: any) => void;
  onOpenSettings?: () => void;
}

export const DetectionView: React.FC<DetectionViewProps> = ({
  selectedFeatures,
  rawRowCount,
  onRunDetection,
  isProcessing,
  results,
  summary,
  onNavigate,
  onOpenSettings,
}) => {
  const { settings } = useSettings();

  const [eps, setEps] = useState<number>(settings.defaultEps);
  const [minSamples, setMinSamples] = useState<number>(settings.defaultMinSamples);
  const [metric, setMetric] = useState<DistanceMetric>(settings.defaultMetric);

  const [enableSampling, setEnableSampling] = useState<boolean>(rawRowCount > 3000);
  const [sampleSize, setSampleSize] = useState<number>(
    Math.min(settings.defaultSamplingLimit || 2500, rawRowCount || 500)
  );

  // Sync to settings if user changes them
  const handleResetToGlobalDefaults = () => {
    setEps(settings.defaultEps);
    setMinSamples(settings.defaultMinSamples);
    setMetric(settings.defaultMetric);
    setSampleSize(Math.min(settings.defaultSamplingLimit || 2500, rawRowCount || 500));
  };

  const isSelectionValid = selectedFeatures.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSelectionValid) return;
    onRunDetection({
      eps,
      minSamples,
      metric,
      samplingLimit: enableSampling ? sampleSize : undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Detection Configuration & Execution
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure DBSCAN hyperparameters, review preprocessing pipeline parameters, and execute anomaly clustering.
        </p>
      </div>

      {!isSelectionValid ? (
        <div className="p-4 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">At least two numerical features required</div>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Please return to the "Dataset Analysis" view and select at least two numerical columns.
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selected Features Box */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Active Feature Vector ({selectedFeatures.length} attributes)</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {selectedFeatures.map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-sky-700 dark:text-sky-300"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Hyperparameter Inputs */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>DBSCAN Model Parameters</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleResetToGlobalDefaults}
                className="flex items-center space-x-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 font-mono transition-colors"
                title="Reset parameters to your persistent defaults saved in Settings"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Load Global Defaults (eps={settings.defaultEps.toFixed(2)}, min_samples={settings.defaultMinSamples})</span>
              </button>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex items-center space-x-1 text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-mono transition-colors"
                  title="Configure persistent DBSCAN defaults in Settings"
                >
                  <SettingsIcon className="w-3 h-3" />
                  <span>Configure Defaults</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* EPS Parameter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase font-mono">
                  EPS (Epsilon)
                </label>
                <span className="font-mono text-xs text-sky-700 dark:text-sky-400 font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded">
                  {eps.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Maximum distance between neighboring observations to be considered in the same neighborhood.
              </p>
              <input
                type="range"
                min="0.05"
                max="5.0"
                step="0.05"
                value={eps}
                onChange={(e) => setEps(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>0.05 (Tight)</span>
                <span>Default: 0.50</span>
                <span>5.00 (Loose)</span>
              </div>
            </div>

            {/* MIN SAMPLES Parameter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase font-mono">
                  MIN SAMPLES
                </label>
                <span className="font-mono text-xs text-sky-700 dark:text-sky-400 font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded">
                  {minSamples}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Minimum number of observations required to form a dense region or cluster core.
              </p>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={minSamples}
                onChange={(e) => setMinSamples(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>2 (Sensitive)</span>
                <span>Default: 5</span>
                <span>50 (Dense)</span>
              </div>
            </div>

            {/* Metric Parameter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase font-mono block">
                Distance Metric
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Mathematical metric used to compute distances in standardized feature space.
              </p>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as DistanceMetric)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="euclidean">Euclidean (Standard L2)</option>
                <option value="manhattan">Manhattan (City Block L1)</option>
                <option value="chebyshev">Chebyshev (Max Coordinate L-inf)</option>
              </select>
            </div>
          </div>

          {/* Sampling Controller for Large Datasets */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSampling}
                  onChange={(e) => setEnableSampling(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600"
                />
                <span className="font-medium">Enable Controlled Dataset Sampling</span>
              </label>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Original Dataset: {rawRowCount.toLocaleString()} records
              </span>
            </div>

            {enableSampling && (
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Sample Row Limit:</span>
                  <span className="text-sky-700 dark:text-sky-300 font-semibold">{sampleSize.toLocaleString()} flows</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max={Math.max(500, Math.min(10000, rawRowCount))}
                  step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  DBSCAN distance calculations scale quadratically. Controlled sampling ensures interactive responsiveness without altering the underlying spatial density.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Execution Action Button */}
        <div>
          <button
            type="submit"
            disabled={!isSelectionValid || isProcessing}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded font-medium text-xs tracking-wide transition-colors ${
              !isSelectionValid || isProcessing
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Running StandardScaler & DBSCAN...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white" />
                <span>Run Anomaly Detection</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preprocessing Summary Audit Display */}
      {summary && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Preprocessing Audit Summary</span>
            </div>
            {summary.samplingApplied && (
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 px-2 py-0.5 rounded">
                Sampled: {summary.finalRowsUsed.toLocaleString()} of {summary.originalBeforeSampling.toLocaleString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Original Rows</div>
              <div className="text-slate-900 dark:text-slate-200 text-base font-semibold mt-0.5">
                {summary.originalRows.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Original Columns</div>
              <div className="text-slate-900 dark:text-slate-200 text-base font-semibold mt-0.5">
                {summary.originalColumns}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Removed Rows</div>
              <div className="text-amber-600 dark:text-amber-400 text-base font-semibold mt-0.5">
                {summary.removedRows.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Missing Values Handled</div>
              <div className="text-slate-900 dark:text-slate-200 text-base font-semibold mt-0.5">
                {summary.missingValuesHandled.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Duplicate Rows Audited</div>
              <div className="text-slate-900 dark:text-slate-200 text-base font-semibold mt-0.5">
                {summary.duplicateRows.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Infinite Values Handled</div>
              <div className="text-slate-900 dark:text-slate-200 text-base font-semibold mt-0.5">
                {summary.infiniteValuesHandled.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Selected Features</div>
              <div className="text-sky-600 dark:text-sky-300 text-base font-semibold mt-0.5">
                {summary.selectedFeatures.length}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Final Rows Used</div>
              <div className="text-emerald-600 dark:text-emerald-400 text-base font-semibold mt-0.5">
                {summary.finalRowsUsed.toLocaleString()}
              </div>
            </div>
          </div>

          {results && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-700 dark:text-slate-300">
                Clustering complete: <span className="font-semibold text-slate-900 dark:text-slate-100">{results.numClusters}</span> clusters,{" "}
                <span className="font-semibold text-red-600 dark:text-red-400">{results.numAnomalies.toLocaleString()}</span> noise points ({results.anomalyPercentage}%).
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onNavigate("three_d_model")}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>View 3D Model</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("results")}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                >
                  <span>View Results</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
