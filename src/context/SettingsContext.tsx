import React, { createContext, useContext, useEffect, useState } from "react";
import { DistanceMetric } from "../ml/dbscan";
import { BotRole } from "../components/views/GeminiChatView";

export interface AppSettings {
  defaultMetric: DistanceMetric;
  defaultEps: number;
  defaultMinSamples: number;
  defaultSamplingLimit: number;
  autoNormalize: boolean;
  anomalyAlertThreshold: number;
  defaultChatbotRole: BotRole;
  autoAttachTelemetryContext: boolean;
  csvDelimiter: "," | ";";
  compactTableView: boolean;
  maxTableRows: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultMetric: "euclidean",
  defaultEps: 0.5,
  defaultMinSamples: 5,
  defaultSamplingLimit: 2500,
  autoNormalize: true,
  anomalyAlertThreshold: 15,
  defaultChatbotRole: "analyst",
  autoAttachTelemetryContext: true,
  csvDelimiter: ",",
  compactTableView: false,
  maxTableRows: 15,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("network_anomaly_settings");
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("network_anomaly_settings", JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
