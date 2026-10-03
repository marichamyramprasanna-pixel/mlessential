import React, { useState, useMemo } from "react";
import {
  Download,
  Search,
  Filter,
  ArrowUpDown,
  Table as TableIcon,
  ShieldAlert,
  Layers,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Globe,
  LogIn,
  Box,
} from "lucide-react";
import { DBSCANResults } from "../../ml/dbscan";
import { CleanedDataset, calculateFeatureStats, buildReferenceCrossTab } from "../../ml/preprocessing";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { saveUserSession } from "../../firebase/sessions";

interface ResultsViewProps {
  results: DBSCANResults | null;
  dataset: CleanedDataset | null;
  datasetName?: string | null;
  onNavigateToVisualization: () => void;
  onNavigateToThreatIntel?: () => void;
  onNavigateTo3D?: () => void;
}

export interface ClassifiedRecord {
  id: number;
  dbscanLabel: number;
  status: string;
  [key: string]: any;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  dataset,
  datasetName,
  onNavigateToVisualization,
  onNavigateToThreatIntel,
  onNavigateTo3D,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const { settings } = useSettings();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<"all" | "anomalies" | "clusters">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<string>("id");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = settings.maxTableRows || 15;

  const [activeFeatureTab, setActiveFeatureTab] = useState<string>(
    dataset?.featureNames[0] || ""
  );

  // If no results, show empty state
  if (!results || !dataset) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-8 text-center max-w-xl mx-auto my-12 shadow-xs">
        <ShieldAlert className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">No Detection Results Yet</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Please navigate to the "Detection" view and execute DBSCAN clustering to generate results.
        </p>
      </div>
    );
  }

  // Build classified records list
  const allRecords = useMemo<ClassifiedRecord[]>(() => {
    return dataset.rows.map((r, idx) => {
      const label = results.labels[idx];
      const isAnomaly = label === -1;
      return {
        id: idx + 1,
        ...r,
        dbscanLabel: label,
        status: isAnomaly ? "Potential Anomaly" : "Clustered Traffic",
      };
    });
  }, [dataset, results]);

  // Filter & Search
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      if (filterMode === "anomalies" && rec.dbscanLabel !== -1) return false;
      if (filterMode === "clusters" && rec.dbscanLabel === -1) return false;

      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const idMatch = rec.id.toString().includes(query);
        const labelMatch = rec.dbscanLabel.toString().includes(query);
        const statusMatch = rec.status.toLowerCase().includes(query);
        const refMatch = dataset.referenceLabelColumn
          ? String(rec[dataset.referenceLabelColumn] || "").toLowerCase().includes(query)
          : false;

        return idMatch || labelMatch || statusMatch || refMatch;
      }
      return true;
    });
  }, [allRecords, filterMode, searchQuery, dataset]);

  // Sort
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // CSV Exporter
  const handleDownloadCSV = () => {
    const headers = [
      "Record ID",
      ...dataset.featureNames,
      ...(dataset.referenceLabelColumn ? [dataset.referenceLabelColumn] : []),
      "DBSCAN Label",
      "Status",
    ];

    const rows = allRecords.map((r) => [
      r.id,
      ...dataset.featureNames.map((f) => r[f]),
      ...(dataset.referenceLabelColumn ? [r[dataset.referenceLabelColumn]] : []),
      r.dbscanLabel,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dbscan_anomaly_detection_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate descriptive stats for selected feature tab
  const featureStats = useMemo(() => {
    if (!activeFeatureTab) return [];
    const featIdx = dataset.featureNames.indexOf(activeFeatureTab);
    if (featIdx === -1) return [];

    const vals = dataset.numericMatrix.map((row) => row[featIdx]);
    return calculateFeatureStats(vals, results.labels);
  }, [activeFeatureTab, dataset, results]);

  // Reference label comparison table
  const referenceCrossTab = useMemo(() => {
    if (!dataset.referenceLabels || dataset.referenceLabels.length === 0) return null;
    return buildReferenceCrossTab(dataset.referenceLabels, results.labels);
  }, [dataset, results]);

  // Save session to Cloud Firestore
  const handleSaveToCloud = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setSaving(true);
    setSaveStatus(null);
    try {
      const sessionId = `session_${Date.now()}`;
      await saveUserSession({
        sessionId,
        userId: user.uid,
        title: `DBSCAN Run - ${datasetName || "Flow Data"}`,
        datasetName: datasetName || "Network Dataset",
        totalRecords: results.totalRecords,
        numClusters: results.numClusters,
        numAnomalies: results.numAnomalies,
        anomalyPercentage: results.anomalyPercentage,
        eps: results.eps,
        minSamples: results.minSamples,
        metric: results.metric,
        selectedFeatures: dataset.featureNames,
        createdAt: new Date().toISOString(),
      });
      setSaveStatus("Session successfully saved to Firestore!");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      console.error("Cloud save failed:", err);
      setSaveStatus("Failed to save session to cloud.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* View Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Anomaly Detection Results
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review identified clusters, noise points, and comparative statistical profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToThreatIntel && (
            <button
              onClick={onNavigateToThreatIntel}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-sky-700 dark:text-sky-300 transition-colors"
              title="Correlate anomalies with live Google Search threat intelligence"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Grounded Threat Intel</span>
            </button>
          )}

          <button
            onClick={handleSaveToCloud}
            disabled={saving}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Save run to Firebase Cloud Firestore"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{saving ? "Saving..." : user ? "Save to Cloud" : "Sign In to Save"}</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={onNavigateToVisualization}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <span>View 2D PCA</span>
          </button>

          {onNavigateTo3D && (
            <button
              onClick={onNavigateTo3D}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Explore 3D Model</span>
            </button>
          )}
        </div>
      </div>

      {saveStatus && (
        <div className="p-2.5 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Primary Model Output Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Total Analyzed</div>
          <div className="text-base font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {results.totalRecords.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Flow records</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Clusters Discovered</div>
          <div className="text-base font-mono font-semibold text-sky-600 dark:text-sky-400 mt-1">
            {results.numClusters}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Dense regions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Potential Anomalies</div>
          <div className="text-base font-mono font-semibold text-red-600 dark:text-red-400 mt-1">
            {results.numAnomalies.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">DBSCAN noise points</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Anomaly Rate</div>
          <div className="text-base font-mono font-semibold text-red-600 dark:text-red-400 mt-1">
            {results.anomalyPercentage}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Of total traffic</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Clustered Traffic</div>
          <div className="text-base font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {results.clusteredCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Regular baseline</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Largest Cluster</div>
          <div className="text-base font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {results.largestClusterSize.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Dominant mode</div>
        </div>
      </div>

      {/* Operational Disclaimer Note */}
      <div className="bg-sky-50/70 dark:bg-slate-900/60 border border-sky-200 dark:border-slate-800 rounded p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-slate-200">Analytical Clarification:</span>{" "}
          These observations were identified as potential anomalies by DBSCAN because they occupy sparse, low-density regions of the normalized feature space. An unusual observation is not necessarily a confirmed malicious attack.
        </p>
      </div>

      {/* Results Table Section */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <TableIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
              Classification Table
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              ({filteredRecords.length.toLocaleString()} matching records)
            </span>
          </div>

          {/* Table Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterMode("all");
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  filterMode === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                All Records
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("anomalies");
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  filterMode === "anomalies"
                    ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Potential Anomalies ({results.numAnomalies})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("clusters");
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  filterMode === "clusters"
                    ? "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Clustered ({results.clusteredCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID, label..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded pl-8 pr-3 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 w-40"
              />
            </div>
          </div>
        </div>

        {/* Paginated Table View */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th
                  onClick={() => handleSort("id")}
                  className="py-2 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 w-16"
                >
                  <div className="flex items-center space-x-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dbscanLabel")}
                  className="py-2 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>DBSCAN Label</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th className="py-2 px-3">Status</th>
                {dataset.referenceLabelColumn && (
                  <th className="py-2 px-3">Ref Label</th>
                )}
                {dataset.featureNames.map((f) => (
                  <th
                    key={f}
                    onClick={() => handleSort(f)}
                    className="py-2 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{f}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + dataset.featureNames.length}
                    className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs"
                  >
                    No records match the active search filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const isNoise = r.dbscanLabel === -1;
                  return (
                    <tr
                      key={r.id}
                      className={
                        isNoise
                          ? "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/15 dark:hover:bg-red-950/25"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      }
                    >
                      <td className="py-1.5 px-3 text-slate-400 dark:text-slate-500">{r.id}</td>
                      <td className="py-1.5 px-3 font-semibold">
                        {isNoise ? (
                          <span className="text-red-600 dark:text-red-400 font-mono">-1 (Noise)</span>
                        ) : (
                          <span className="text-sky-700 dark:text-sky-400 font-mono">Cluster {r.dbscanLabel}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] rounded border ${
                            isNoise
                              ? "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-medium"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      {dataset.referenceLabelColumn && (
                        <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400">
                          {r[dataset.referenceLabelColumn]}
                        </td>
                      )}
                      {dataset.featureNames.map((f) => (
                        <td key={f} className="py-1.5 px-3 whitespace-nowrap text-slate-800 dark:text-slate-300">
                          {typeof r[f] === "number" ? r[f].toLocaleString() : r[f]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedRecords.length)} of{" "}
            {sortedRecords.length.toLocaleString()} entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-800 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Descriptive Statistical Feature Profile */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-4 shadow-xs">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            Feature Comparison: Clustered Traffic vs Potential Anomalies
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Statistical comparison demonstrating how potential anomaly profiles deviate from clustered traffic.
          </p>
        </div>

        {/* Feature Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {dataset.featureNames.map((feat) => (
            <button
              key={feat}
              onClick={() => setActiveFeatureTab(feat)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeFeatureTab === feat
                  ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-400 border border-sky-500 dark:border-sky-600 font-semibold"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {feat}
            </button>
          ))}
        </div>

        {/* Stats Table for Active Feature */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-4 font-sans font-semibold">Metric</th>
                <th className="py-2.5 px-4 text-right">Overall Dataset</th>
                <th className="py-2.5 px-4 text-right text-sky-700 dark:text-sky-300">Clustered Traffic (n={results.clusteredCount})</th>
                <th className="py-2.5 px-4 text-right text-red-600 dark:text-red-400">Potential Anomalies (n={results.numAnomalies})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {featureStats.map((st) => (
                <tr key={st.metric} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-2 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">{st.metric}</td>
                  <td className="py-2 px-4 text-right">{st.overall.toLocaleString()}</td>
                  <td className="py-2 px-4 text-right text-sky-700 dark:text-sky-200">{st.clustered.toLocaleString()}</td>
                  <td className="py-2 px-4 text-right text-red-600 dark:text-red-300 font-medium">
                    {st.anomaly.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reference Label Comparison Table if available */}
      {referenceCrossTab && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
              Reference Label Comparison (Cross-Tabulation)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              The dataset label is a reference label and was not used to train DBSCAN.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2 px-3">Reference Class</th>
                  <th className="py-2 px-3 text-right">Clustered Traffic</th>
                  <th className="py-2 px-3 text-right text-red-600 dark:text-red-400">Flagged as Potential Anomaly</th>
                  <th className="py-2 px-3 text-right">Total Reference Records</th>
                  <th className="py-2 px-3 text-right">Anomaly Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {referenceCrossTab.map((row) => {
                  const ratio = ((row.anomaly / row.total) * 100).toFixed(1);
                  return (
                    <tr key={row.label} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-200">{row.label}</td>
                      <td className="py-2 px-3 text-right">{row.clustered.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-red-600 dark:text-red-400 font-medium">
                        {row.anomaly.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right">{row.total.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-slate-200">{ratio}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
