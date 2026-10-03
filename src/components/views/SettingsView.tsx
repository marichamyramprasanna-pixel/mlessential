import React, { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  Sliders,
  Bot,
  Database,
  Download,
  RotateCcw,
  CheckCircle2,
  User as UserIcon,
  LogIn,
  LogOut,
  Shield,
  Layers,
  Zap,
  Cpu,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { DistanceMetric } from "../../ml/dbscan";
import { BotRole } from "./GeminiChatView";

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { user, signInWithGoogle, signOut } = useAuth();

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReset = () => {
    resetSettings();
    showNotification("Settings restored to factory defaults.");
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem("network_anomaly_settings");
      sessionStorage.clear();
      showNotification("Local application cache cleared successfully.");
    } catch {
      showNotification("Cleared session storage.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Settings & Preferences
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Configure system appearance, DBSCAN detection hyperparameters, Gemini chatbot defaults, and cloud storage.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title="Reset all settings to default values"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 1. Theme & Appearance Section */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            Appearance & Theme
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* White Mode Option */}
          <button
            onClick={() => {
              setTheme("light");
              showNotification("White mode theme activated.");
            }}
            className={`p-4 rounded border text-left transition-all flex items-start space-x-3.5 ${
              theme === "light"
                ? "bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20"
                : "bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
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
                Clean, crisp high-contrast white aesthetic with slate typography and subtle borders.
              </p>
            </div>
          </button>

          {/* Dark Mode Option */}
          <button
            onClick={() => {
              setTheme("dark");
              showNotification("Dark mode theme activated.");
            }}
            className={`p-4 rounded border text-left transition-all flex items-start space-x-3.5 ${
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
                Cybersecurity operations center style with low-glare dark backgrounds and vibrant highlights.
              </p>
            </div>
          </button>
        </div>

        {/* Table Density Switch */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Compact Table Rows
            </span>
            <p className="text-[11px] text-slate-500">
              Reduces padding in telemetry records tables to inspect more flows per screen.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.compactTableView}
            onChange={(e) => updateSettings({ compactTableView: e.target.checked })}
            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600"
          />
        </div>
      </div>

      {/* 2. DBSCAN ML Detection Defaults */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            DBSCAN Hyperparameter Defaults
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Default Metric */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Default Metric
            </label>
            <select
              value={settings.defaultMetric}
              onChange={(e) => updateSettings({ defaultMetric: e.target.value as DistanceMetric })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="euclidean">Euclidean (L2 Norm)</option>
              <option value="manhattan">Manhattan (L1 City Block)</option>
              <option value="chebyshev">Chebyshev (L-infinity Max)</option>
            </select>
            <p className="text-[10px] text-slate-500">
              Distance function for multi-dimensional neighborhood radius evaluation.
            </p>
          </div>

          {/* Default Epsilon */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Default Epsilon (eps)
              </span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                {settings.defaultEps}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.5"
              step="0.05"
              value={settings.defaultEps}
              onChange={(e) => updateSettings({ defaultEps: parseFloat(e.target.value) })}
              className="w-full accent-sky-500"
            />
            <p className="text-[10px] text-slate-500">
              Initial radius for dense neighborhood clustering.
            </p>
          </div>

          {/* Default Min Samples */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Default min_samples
              </span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                {settings.defaultMinSamples}
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={settings.defaultMinSamples}
              onChange={(e) => updateSettings({ defaultMinSamples: parseInt(e.target.value, 10) })}
              className="w-full accent-sky-500"
            />
            <p className="text-[10px] text-slate-500">
              Minimum points needed to qualify as a core cluster point.
            </p>
          </div>
        </div>

        {/* Feature Standardization Toggle */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Automatic Feature Scaling (StandardScaler)
            </span>
            <p className="text-[11px] text-slate-500">
              Pre-normalizes continuous features to zero mean and unit variance before running distance calculations.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoNormalize}
            onChange={(e) => updateSettings({ autoNormalize: e.target.checked })}
            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600"
          />
        </div>
      </div>

      {/* 3. Gemini Chatbot Preferences */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Bot className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            Gemini Chatbot Configuration
          </h2>
        </div>

        <div className="space-y-3 pt-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
            Default Active Role & Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: "analyst" as BotRole,
                label: "Network Traffic Analyst",
                model: "gemini-3.5-flash",
                icon: <Shield className="w-3.5 h-3.5 text-sky-500" />,
              },
              {
                id: "telemetry_fast" as BotRole,
                label: "Rapid Telemetry Assistant",
                model: "gemini-3.1-flash-lite",
                icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
              },
              {
                id: "threat_complex" as BotRole,
                label: "Deep Threat Modeler",
                model: "gemini-3.1-pro-preview",
                icon: <Cpu className="w-3.5 h-3.5 text-emerald-500" />,
              },
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => updateSettings({ defaultChatbotRole: role.id })}
                className={`p-2.5 rounded text-left border text-xs transition-colors flex items-center space-x-2 ${
                  settings.defaultChatbotRole === role.id
                    ? "bg-sky-50 dark:bg-slate-800 border-sky-500 font-medium"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {role.icon}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-slate-900 dark:text-slate-100 font-semibold text-[11px]">
                    {role.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{role.model}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Auto-Attach Telemetry Context
              </span>
              <p className="text-[11px] text-slate-500">
                Automatically provides active dataset summaries and noise rates to chatbot turns for contextual answers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAttachTelemetryContext}
              onChange={(e) => updateSettings({ autoAttachTelemetryContext: e.target.checked })}
              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600"
            />
          </div>
        </div>
      </div>

      {/* 4. Firebase Authentication & Cloud Storage */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            Cloud Persistence & Account
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Authenticated User Account
            </span>
            {user ? (
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                {user.displayName || "Analyst"} ({user.email}) | UID: {user.uid.slice(0, 10)}...
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Not signed in. Connect your Google account to persist analysis sessions in Firestore.
              </p>
            )}
          </div>

          {user ? (
            <button
              onClick={signOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-red-600 dark:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Local Storage & Session Cache
            </span>
            <p className="text-[11px] text-slate-500">
              Purges temporary browser session data and reset cached parameters.
            </p>
          </div>
          <button
            onClick={handleClearCache}
            className="px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* 5. Data Export Options */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
            Export Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 dark:text-slate-300 block">
              CSV Delimiter
            </label>
            <select
              value={settings.csvDelimiter}
              onChange={(e) => updateSettings({ csvDelimiter: e.target.value as "," | ";" })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 dark:text-slate-300 block">
              Max Rows Per Table Page
            </label>
            <select
              value={settings.maxTableRows}
              onChange={(e) => updateSettings({ maxTableRows: parseInt(e.target.value, 10) })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="10">10 records</option>
              <option value="15">15 records</option>
              <option value="25">25 records</option>
              <option value="50">50 records</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
