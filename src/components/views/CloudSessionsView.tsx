import React, { useEffect, useState } from "react";
import {
  Cloud,
  Database,
  Trash2,
  Play,
  Clock,
  Sliders,
  AlertCircle,
  LogIn,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getUserSessions,
  deleteUserSession,
  SavedAnalysisSession,
} from "../../firebase/sessions";

interface CloudSessionsViewProps {
  onLoadSessionParameters?: (session: SavedAnalysisSession) => void;
}

export const CloudSessionsView: React.FC<CloudSessionsViewProps> = ({
  onLoadSessionParameters,
}) => {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SavedAnalysisSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserSessions(user.uid);
      setSessions(data);
    } catch (err: any) {
      console.error("Failed to load sessions:", err);
      setError("Failed to retrieve saved cloud sessions from Firestore.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [user]);

  const handleDelete = async (sessionId: string) => {
    if (!user) return;
    setDeletingId(sessionId);
    try {
      await deleteUserSession(user.uid, sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err: any) {
      console.error("Failed to delete session:", err);
      setError("Could not delete session from Firestore.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
        <span>Authenticating session state...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded bg-sky-100 dark:bg-slate-800 border border-sky-300 dark:border-slate-700 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
          <Cloud className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Sign In to Access Cloud Storage
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Connect with Google Sign-in to save your DBSCAN detection configurations, flow summaries, and audit logs securely in Cloud Firestore.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Cloud Analysis Sessions
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Persisted DBSCAN anomaly detection runs stored in your Cloud Firestore repository.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400" />
          <span>Querying Firestore sessions...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded p-8 text-center text-slate-500 dark:text-slate-400 text-xs shadow-xs">
          <Database className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <div className="font-semibold text-slate-800 dark:text-slate-300">No Saved Sessions Found</div>
          <p className="max-w-md mx-auto mt-1 text-slate-500 dark:text-slate-400">
            Execute anomaly detection and click "Save to Cloud" on the Results view to preserve your analysis parameters and cluster findings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-4 space-y-3 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{s.title}</h3>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Dataset: {s.datasetName}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {s.totalRecords.toLocaleString()} flows
                  </span>
                </div>

                {/* Metrics badges */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px] mt-3">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">Clusters</div>
                    <div className="text-sky-700 dark:text-sky-300 font-semibold">{s.numClusters}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">Anomalies</div>
                    <div className="text-red-600 dark:text-red-400 font-semibold">{s.numAnomalies}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">Anomaly Rate</div>
                    <div className="text-red-600 dark:text-red-400 font-semibold">{s.anomalyPercentage}%</div>
                  </div>
                </div>

                {/* Parameters */}
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800/80 mt-2 space-y-0.5">
                  <div>eps: {s.eps} | min_samples: {s.minSamples} | metric: {s.metric}</div>
                  <div className="truncate">Features: {s.selectedFeatures.join(", ")}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-3 text-[10px] text-slate-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {onLoadSessionParameters && (
                    <button
                      onClick={() => onLoadSessionParameters(s)}
                      className="px-2 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-300 dark:border-slate-700 transition-colors"
                      title="Load hyperparameters into detection view"
                    >
                      Use Parameters
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(s.sessionId)}
                    disabled={deletingId === s.sessionId}
                    className="p-1 rounded text-slate-400 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
