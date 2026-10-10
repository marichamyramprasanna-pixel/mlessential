import React from "react";
import {
  Activity,
  Layers,
  Sliders,
  Table,
  ScatterChart,
  Info,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Globe,
  Cloud,
  Bot,
  Settings as SettingsIcon,
  Box,
  Lock,
} from "lucide-react";
import { DBSCANResults } from "../ml/dbscan";

export type ViewType =
  | "overview"
  | "dataset_analysis"
  | "detection"
  | "results"
  | "visualization"
  | "three_d_model"
  | "threat_intel"
  | "cloud_sessions"
  | "gemini_chat"
  | "admin_security"
  | "settings"
  | "about"
  | "privacy_policy"
  | "terms";

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  hasDataset: boolean;
  hasResults: boolean;
  results: DBSCANResults | null;
  datasetName: string | null;
  totalRecords: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  hasDataset,
  hasResults,
  results,
  datasetName,
  totalRecords,
}) => {
  const navItems: { id: ViewType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "overview", label: "1. Overview", icon: <Activity className="w-4 h-4" /> },
    {
      id: "dataset_analysis",
      label: "2. Dataset Analysis",
      icon: <Layers className="w-4 h-4" />,
      badge: hasDataset ? "Ready" : undefined,
    },
    {
      id: "detection",
      label: "3. Detection",
      icon: <Sliders className="w-4 h-4" />,
      badge: hasResults ? "Done" : undefined,
    },
    {
      id: "results",
      label: "4. Results",
      icon: <Table className="w-4 h-4" />,
      badge: hasResults ? `${results?.numAnomalies} noise` : undefined,
    },
    {
      id: "visualization",
      label: "5. Visualization",
      icon: <ScatterChart className="w-4 h-4" />,
      badge: hasResults ? "PCA 2D" : undefined,
    },
    {
      id: "three_d_model",
      label: "6. 3D Model Explorer",
      icon: <Box className="w-4 h-4" />,
      badge: hasResults ? "Three.js" : "3D",
    },
    {
      id: "threat_intel",
      label: "7. Threat Intelligence",
      icon: <Globe className="w-4 h-4" />,
      badge: "Search",
    },
    {
      id: "cloud_sessions",
      label: "8. Cloud Sessions",
      icon: <Cloud className="w-4 h-4" />,
      badge: "Firestore",
    },
    {
      id: "gemini_chat",
      label: "9. AI Security Chatbot",
      icon: <Bot className="w-4 h-4" />,
      badge: "OpenRouter",
    },
    {
      id: "admin_security",
      label: "10. Admin Security",
      icon: <Lock className="w-4 h-4" />,
      badge: "Hardened",
    },
    {
      id: "settings",
      label: "11. Settings",
      icon: <SettingsIcon className="w-4 h-4" />,
      badge: "Theme",
    },
    { id: "about", label: "12. About DBSCAN", icon: <Info className="w-4 h-4" /> },
    { id: "privacy_policy", label: "13. Privacy Policy", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "terms", label: "14. Terms & Conditions", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col justify-between p-3 select-none transition-colors">
      <div>
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Navigation
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`relative w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-all duration-150 ease-out active:scale-[0.985] text-left ${
                  isActive
                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-300 dark:border-slate-700 shadow-xs pl-3.5"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-500 rounded-r-full" />
                )}
                <div className="flex items-center space-x-2.5 truncate">
                  <span className={isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-500 dark:text-slate-400"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                      isActive
                        ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 px-2 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Telemetry Monitor
        </div>

        <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded p-2.5 space-y-1.5 text-[11px] font-mono shadow-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Pipeline State:</span>
            {hasResults ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Clustered
              </span>
            ) : hasDataset ? (
              <span className="text-sky-600 dark:text-sky-400 flex items-center">
                <Activity className="w-3 h-3 mr-1" /> Loaded
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> Idle
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Flows Loaded:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">{totalRecords.toLocaleString()}</span>
          </div>

          {results && (
            <>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Clusters Discovered:</span>
                <span className="text-slate-800 dark:text-slate-200">{results.numClusters}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Noise Points:</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {results.numAnomalies} ({results.anomalyPercentage}%)
                </span>
              </div>
            </>
          )}
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center pt-1">
          DBSCAN Unsupervised Anomaly Detection
        </p>
      </div>
    </aside>
  );
};
