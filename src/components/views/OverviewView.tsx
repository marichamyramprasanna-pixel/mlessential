import React, { useRef, useState } from "react";
import {
  Upload,
  Database,
  ArrowRight,
  Shield,
  Layers,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Play,
} from "lucide-react";

interface OverviewViewProps {
  onLoadDataset: (csvText: string, fileName: string) => void;
  onLoadSample: () => void;
  hasDataset: boolean;
  datasetName: string | null;
  totalRecords: number;
  onNavigate: (view: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onLoadDataset,
  onLoadSample,
  hasDataset,
  datasetName,
  totalRecords,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setUploadError("Please provide a valid CSV file (.csv).");
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        setUploadError("The selected CSV file is empty.");
        return;
      }
      onLoadDataset(text, file.name);
    };
    reader.onerror = () => {
      setUploadError("Failed to read the uploaded CSV file.");
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Network Anomaly Detection
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Analyze network traffic and identify potential outliers using DBSCAN density-based clustering.
        </p>
      </div>

      {/* Dataset Status Banner if Loaded */}
      {hasDataset && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Active Dataset Ingested: {datasetName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {totalRecords.toLocaleString()} records ready for inspection and feature selection
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate("dataset_analysis")}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
            >
              <span>Inspect Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate("detection")}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <span>Configure DBSCAN</span>
            </button>
          </div>
        </div>
      )}

      {/* Ingestion Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded p-6 text-center transition-colors ${
              dragActive
                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
                : "border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
              Drag and drop network traffic CSV here
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Accepts flow telemetry exports such as CICIDS2017, UNSW-NB15, or custom Wireshark / Zeek flow exports.
            </p>

            <div className="mt-4 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Browse Files
              </button>
            </div>

            {uploadError && (
              <div className="mt-3 text-xs text-red-600 dark:text-red-400 flex items-center justify-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Synthetic Benchmark Option */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wide">
              <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Synthetic Benchmark</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Load an authentic synthetic benchmark dataset (500 flows) modeled after standard TCP/UDP session profiles, including 40 injected density outliers (PortScan, SYN floods, exfiltration).
            </p>
            <div className="mt-3 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800/80 space-y-0.5">
              <div>Features: Flow Duration, Bytes/s, Pkts/s</div>
              <div>Normal Clusters: 460 flows</div>
              <div>Injected Outliers: 40 flows</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLoadSample}
            className="mt-4 w-full flex items-center justify-center space-x-2 px-3 py-2 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-sky-700 dark:text-sky-300 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Load Sample Dataset</span>
          </button>
        </div>
      </div>

      {/* Project Description & Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-2">
            <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Project Scope</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
            This system evaluates network traffic records using density-based spatial clustering. Rather than matching static vulnerability signatures, it maps continuous network flow metrics into multidimensional coordinate space to separate dense operational clusters from sparse anomalies.
          </p>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-2.5">
            Observations flagged as DBSCAN noise (label -1) are treated as potential anomalies. An unusual observation is not guaranteed to be a malicious intrusion, but represents a statistically significant deviation from baseline traffic density.
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Expected Input Metrics</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
            The preprocessing pipeline automatically scans your CSV headers and isolates numeric telemetry columns. Suitable features include:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-400">
            <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Flow Duration</span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Total Fwd Packets</span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Total Bwd Packets</span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Flow Bytes/s</span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Flow Packets/s</span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">Packet Length Mean</span>
          </div>
        </div>
      </div>

      {/* Analytical Workflow */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded p-4 shadow-xs">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Execution Pipeline</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3">
            <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400 font-semibold">Step 1: Validation</div>
            <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">Ingest & Clean Data</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Detect numeric features, impute nulls, remove infinite values, and audit duplicates.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3">
            <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400 font-semibold">Step 2: Scaling</div>
            <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">StandardScaler Transform</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Normalize selected flow features to zero mean and unit variance.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3">
            <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400 font-semibold">Step 3: DBSCAN</div>
            <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">Density Clustering</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Cluster dense core points using eps and min_samples. Classify low-density noise as label -1.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3">
            <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400 font-semibold">Step 4: Inspection & 3D</div>
            <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">PCA & 3D Spatial Models</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Project clusters onto 2D PCA & true 3D WebGL spatial models, inspect cyber topology, and export enriched CSV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
