import React, { useState } from "react";
import {
  Globe,
  Search,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowRight,
} from "lucide-react";
import { DBSCANResults } from "../../ml/dbscan";
import { CleanedDataset } from "../../ml/preprocessing";

interface ThreatIntelligenceViewProps {
  results: DBSCANResults | null;
  dataset: CleanedDataset | null;
}

export const ThreatIntelligenceView: React.FC<ThreatIntelligenceViewProps> = ({
  results,
  dataset,
}) => {
  const [customQuery, setCustomQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);

  // Default query suggestions based on detected results
  const suggestedQueries = [
    "Recent network DDoS SYN flood patterns and mitigation",
    "Port scan reconnaissance telemetry signatures in enterprise networks",
    "Data exfiltration outbound flow telemetry indicators and CVEs",
    "Anomalous TCP flow duration and asymmetric packet size anomalies",
  ];

  const handleRunSearch = async (queryToRun?: string) => {
    const q = queryToRun || customQuery.trim() || suggestedQueries[0];
    setLoading(true);
    setError(null);

    try {
      // Build summary of anomalous features
      let featureSummary = "";
      if (dataset && dataset.featureNames.length > 0) {
        featureSummary = `Features: ${dataset.featureNames.join(", ")}`;
      }

      const res = await fetch("/api/threat-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          detectedLabel: dataset?.referenceLabelColumn || "DBSCAN Noise Point (-1)",
          featureSummary,
          anomalyRate: results?.anomalyPercentage || "N/A",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch threat intelligence.");
      }

      setAnalysisResult(data.analysis);
      setSearchQueries(data.searchQueries || []);
      setSources(data.sources || []);
    } catch (err: any) {
      console.error("Threat search failed:", err);
      setError(err.message || "An unexpected error occurred while querying live intelligence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Threat Intelligence & Research
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 uppercase font-medium">
            Google Search Grounded
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Correlate detected anomalous traffic flows with real-world threat feeds, CVE disclosures, and MITRE ATT&CK techniques using live Google Search data.
        </p>
      </div>

      {/* Query Bar */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 space-y-3 shadow-xs">
        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase font-mono block">
          Search Live Threat Intelligence
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. Recent Mirai botnet SYN flood patterns, CVE-2024-xxxx, port 445 anomalies..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRunSearch();
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            onClick={() => handleRunSearch()}
            disabled={loading}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded text-xs font-medium transition-colors ${
              loading
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Searching Live Data...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Search Intelligence</span>
              </>
            )}
          </button>
        </div>

        {/* Quick query tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Suggested Inquiries:</span>
          {suggestedQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setCustomQuery(sq);
                handleRunSearch(sq);
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Output Container */}
      {analysisResult ? (
        <div className="space-y-4">
          {/* Grounding Source Attribution */}
          {sources.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 space-y-2 shadow-xs">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-2">
                <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Live Google Search Grounding Sources ({sources.length} cited)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 group transition-colors"
                  >
                    <span className="truncate pr-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 group-hover:text-sky-600 dark:group-hover:text-sky-300">
                      {s.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
              {searchQueries.length > 0 && (
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                  Google queries evaluated: {searchQueries.join("; ")}
                </div>
              )}
            </div>
          )}

          {/* Main Formatted Analysis */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-6 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <ShieldAlert className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                Grounded Threat Correlation Report
              </span>
            </div>

            <div className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans space-y-2">
              {analysisResult}
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded p-8 text-center text-slate-500 dark:text-slate-400 text-xs shadow-xs">
          <Globe className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <div className="font-semibold text-slate-800 dark:text-slate-300">No Intelligence Inquiries Executed Yet</div>
          <p className="max-w-md mx-auto mt-1 text-slate-500 dark:text-slate-400">
            Submit a query above to retrieve live Google Search grounded intelligence correlating your network traffic flow anomalies with active exploits and advisories.
          </p>
        </div>
      )}
    </div>
  );
};
