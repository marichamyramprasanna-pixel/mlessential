import React from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Database,
  Hash,
} from "lucide-react";

interface DatasetAnalysisViewProps {
  headers: string[];
  rawRows: string[][];
  numericalColumns: string[];
  selectedFeatures: string[];
  onToggleFeature: (feature: string) => void;
  onSelectAllNumerical: () => void;
  referenceColumn?: string;
  onProceedToDetection: () => void;
}

export const DatasetAnalysisView: React.FC<DatasetAnalysisViewProps> = ({
  headers,
  rawRows,
  numericalColumns,
  selectedFeatures,
  onToggleFeature,
  onSelectAllNumerical,
  referenceColumn,
  onProceedToDetection,
}) => {
  if (rawRows.length === 0 || headers.length === 0) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-8 text-center max-w-xl mx-auto my-12 shadow-xs">
        <Database className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">No Dataset Ingested</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Please navigate to the Overview page to upload a CSV file or load the benchmark dataset.
        </p>
      </div>
    );
  }

  // Calculate missing values in raw data
  let totalMissing = 0;
  for (let r = 0; r < rawRows.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const v = rawRows[r][c];
      if (v === undefined || v === "" || v === null) {
        totalMissing++;
      }
    }
  }

  // Preview first 10 rows
  const previewRows = rawRows.slice(0, 10);

  // Compute basic descriptive summary for selected features
  const statsTable: {
    feature: string;
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
  }[] = [];

  for (const feat of selectedFeatures) {
    const colIdx = headers.indexOf(feat);
    if (colIdx !== -1) {
      const nums: number[] = [];
      for (let r = 0; r < rawRows.length; r++) {
        const val = Number(rawRows[r][colIdx]);
        if (!isNaN(val) && isFinite(val)) {
          nums.push(val);
        }
      }
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        let sq = 0;
        for (const n of nums) sq += (n - mean) * (n - mean);
        const std = Math.sqrt(sq / nums.length);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        statsTable.push({
          feature: feat,
          count: nums.length,
          mean: Number(mean.toFixed(2)),
          std: Number(std.toFixed(2)),
          min: Number(min.toFixed(2)),
          max: Number(max.toFixed(2)),
        });
      }
    }
  }

  const isSelectionValid = selectedFeatures.length >= 2;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Dataset Analysis & Validation
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Inspect structure, data health, detected numerical columns, and select features for DBSCAN clustering.
        </p>
      </div>

      {/* Dataset Health Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Total Observations</div>
          <div className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {rawRows.length.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Flow records ingested</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Attributes (Cols)</div>
          <div className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {headers.length}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {numericalColumns.length} numerical detected
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Missing Values</div>
          <div className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {totalMissing.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Will be cleaned in pipeline</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Selected Features</div>
          <div className={`text-lg font-mono font-semibold mt-1 ${isSelectionValid ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"}`}>
            {selectedFeatures.length}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isSelectionValid ? "Minimum 2 requirement met" : "Requires at least 2"}
          </div>
        </div>
      </div>

      {/* Reference column info if present */}
      {referenceColumn && (
        <div className="bg-sky-50 dark:bg-slate-900/60 border border-sky-200 dark:border-slate-700/80 rounded p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              Reference Label Attribute Detected:
            </span>{" "}
            Column <span className="font-mono text-sky-700 dark:text-sky-300">'{referenceColumn}'</span> was identified as a diagnostic or ground-truth class label. It is intentionally excluded from DBSCAN clustering inputs and reserved exclusively for post-clustering comparative evaluation.
          </div>
        </div>
      )}

      {/* Feature Selection Section */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2">
              <Hash className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Select Numerical Features for DBSCAN</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Select continuous telemetry metrics to standardize and cluster. Minimum 2 required.
            </p>
          </div>

          <button
            type="button"
            onClick={onSelectAllNumerical}
            className="px-2.5 py-1 rounded text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors self-start sm:self-auto"
          >
            Select All ({numericalColumns.length})
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {numericalColumns.map((col) => {
            const isSelected = selectedFeatures.includes(col);
            return (
              <label
                key={col}
                className={`flex items-center space-x-2.5 p-2 rounded border cursor-pointer text-xs transition-colors ${
                  isSelected
                    ? "bg-sky-50 dark:bg-slate-800/90 border-sky-500 text-slate-900 dark:text-slate-100 font-medium"
                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFeature(col)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sky-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="font-mono truncate">{col}</span>
              </label>
            );
          })}
        </div>

        {!isSelectionValid && (
          <div className="mt-3 p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Validation Error: Please select at least two numerical features to proceed with DBSCAN clustering.
            </span>
          </div>
        )}
      </div>

      {/* Selected Feature Statistics */}
      {isSelectionValid && statsTable.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide mb-2">
            Descriptive Statistics (Selected Features)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-3">Feature Name</th>
                  <th className="py-2 px-3 text-right">Valid Observations</th>
                  <th className="py-2 px-3 text-right">Mean</th>
                  <th className="py-2 px-3 text-right">Std Dev</th>
                  <th className="py-2 px-3 text-right">Min</th>
                  <th className="py-2 px-3 text-right">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {statsTable.map((s) => (
                  <tr key={s.feature} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-900 dark:text-slate-200 font-sans font-medium">{s.feature}</td>
                    <td className="py-2 px-3 text-right">{s.count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{s.mean.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{s.std.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{s.min.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{s.max.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dataset Preview Table */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            Dataset Preview (First 10 Rows)
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Showing 10 of {rawRows.length.toLocaleString()} rows
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-2 px-2.5 text-center text-slate-500 w-12">#</th>
                {headers.map((h) => {
                  const isSelected = selectedFeatures.includes(h);
                  return (
                    <th
                      key={h}
                      className={`py-2 px-3 whitespace-nowrap ${
                        isSelected ? "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 font-semibold" : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {previewRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30">
                  <td className="py-1.5 px-2.5 text-center text-slate-400 dark:text-slate-500">{rIdx + 1}</td>
                  {row.map((val, cIdx) => {
                    const isSelected = selectedFeatures.includes(headers[cIdx]);
                    return (
                      <td
                        key={cIdx}
                        className={`py-1.5 px-3 whitespace-nowrap ${
                          isSelected ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!isSelectionValid}
          onClick={onProceedToDetection}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded text-xs font-medium transition-colors ${
            isSelectionValid
              ? "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700"
          }`}
        >
          <span>Configure Anomaly Detection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
