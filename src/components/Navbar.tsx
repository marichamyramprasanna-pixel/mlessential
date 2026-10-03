import React from "react";
import {
  Network,
  Database,
  ShieldAlert,
  Cpu,
  LogIn,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Settings as SettingsIcon,
} from "lucide-react";
import { DBSCANResults } from "../ml/dbscan";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface NavbarProps {
  datasetName: string | null;
  rowCount: number;
  results: DBSCANResults | null;
  onReset: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  datasetName,
  rowCount,
  results,
  onReset,
  onOpenSettings,
}) => {
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-20 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-sky-600 dark:text-sky-400">
          <Network className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
              Network Anomaly Detection
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              DBSCAN ML
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Density-based network traffic outlier identification
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 text-xs">
        {datasetName ? (
          <div className="hidden sm:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded text-slate-700 dark:text-slate-300">
            <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="font-mono text-[11px] max-w-[140px] truncate" title={datasetName}>
              {datasetName}
            </span>
            <span className="text-slate-400 dark:text-slate-500">|</span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{rowCount.toLocaleString()} flows</span>
            {results && (
              <>
                <span className="text-slate-400 dark:text-slate-500">|</span>
                <span className="inline-flex items-center text-red-600 dark:text-red-400 font-mono text-[11px]">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  {results.numAnomalies.toLocaleString()} anomalies ({results.anomalyPercentage}%)
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-300 dark:border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
            <span>Awaiting CSV Ingestion</span>
          </div>
        )}

        {datasetName && (
          <button
            onClick={onReset}
            className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            Clear Data
          </button>
        )}

        {/* Theme Toggle Button (White Mode / Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
          title={theme === "dark" ? "Switch to White Mode Theme" : "Switch to Dark Mode Theme"}
          aria-label="Toggle White/Dark Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Settings Panel Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
          title="Open Settings & Preferences"
          aria-label="Settings Panel"
        >
          <SettingsIcon className="w-4 h-4 text-slate-600 dark:text-sky-400" />
        </button>

        {/* Firebase Authentication Button & Profile */}
        <div className="border-l border-slate-200 dark:border-slate-800 pl-2.5 flex items-center">
          {authLoading ? (
            <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center space-x-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 flex items-center justify-center font-mono text-xs">
                  {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                </div>
              )}
              <span className="hidden lg:inline text-[11px] font-mono text-slate-700 dark:text-slate-300 max-w-[100px] truncate">
                {user.displayName || user.email?.split("@")[0]}
              </span>
              <button
                onClick={signOut}
                className="p-1 rounded text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Sign out of Firebase"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
