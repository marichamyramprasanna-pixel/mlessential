import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Sidebar, ViewType } from "./components/Sidebar";
import { OverviewView } from "./components/views/OverviewView";
import { DatasetAnalysisView } from "./components/views/DatasetAnalysisView";
import { DetectionView } from "./components/views/DetectionView";
import { ResultsView } from "./components/views/ResultsView";
import { VisualizationView } from "./components/views/VisualizationView";
import { ThreeDModelView } from "./components/views/ThreeDModelView";
import { AboutView } from "./components/views/AboutView";
import { PrivacyPolicyView } from "./components/views/PrivacyPolicyView";
import { TermsView } from "./components/views/TermsView";
import { ThreatIntelligenceView } from "./components/views/ThreatIntelligenceView";
import { CloudSessionsView } from "./components/views/CloudSessionsView";
import { GeminiChatView } from "./components/views/GeminiChatView";
import { SettingsView } from "./components/views/SettingsView";
import { SettingsModal } from "./components/SettingsModal";
import { SavedAnalysisSession } from "./firebase/sessions";

import {
  parseCSV,
  detectNumericalColumns,
  detectReferenceColumn,
  preprocessData,
  CleanedDataset,
} from "./ml/preprocessing";
import { fitStandardScaler, transformWithScaler } from "./ml/scaler";
import { runDBSCAN, DBSCANResults, DistanceMetric } from "./ml/dbscan";
import { computePCA2D, computePCA3D, PCAResult, PCA3DResult } from "./ml/pca";
import { SAMPLE_DATASET_CSV } from "./data/sampleDataset";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("overview");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Ingested data states
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [numericalColumns, setNumericalColumns] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [referenceColumn, setReferenceColumn] = useState<string | undefined>(undefined);

  // Processed ML states
  const [cleanedDataset, setCleanedDataset] = useState<CleanedDataset | null>(null);
  const [results, setResults] = useState<DBSCANResults | null>(null);
  const [pcaResult, setPcaResult] = useState<PCAResult | null>(null);
  const [pca3DResult, setPca3DResult] = useState<PCA3DResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingest CSV text handler
  const handleLoadDataset = (csvText: string, fileName: string) => {
    try {
      setErrorMessage(null);
      const { headers: parsedHeaders, rows: parsedRows } = parseCSV(csvText);

      if (parsedHeaders.length < 2) {
        setErrorMessage("CSV must contain at least two columns.");
        return;
      }
      if (parsedRows.length < 5) {
        setErrorMessage("CSV must contain at least 5 data rows.");
        return;
      }

      const numCols = detectNumericalColumns(parsedHeaders, parsedRows);
      if (numCols.length < 2) {
        setErrorMessage("Dataset must contain at least two numerical columns for clustering.");
        return;
      }

      const refCol = detectReferenceColumn(parsedHeaders);

      setDatasetName(fileName);
      setHeaders(parsedHeaders);
      setRawRows(parsedRows);
      setNumericalColumns(numCols);
      // Select first 6 numerical features by default
      setSelectedFeatures(numCols.slice(0, Math.min(6, numCols.length)));
      setReferenceColumn(refCol);

      // Clear previous ML output
      setCleanedDataset(null);
      setResults(null);
      setPcaResult(null);
      setPca3DResult(null);

      // Navigate to dataset analysis view
      setCurrentView("dataset_analysis");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse CSV file.");
    }
  };

  // Load bundled benchmark dataset
  const handleLoadSample = () => {
    handleLoadDataset(
      SAMPLE_DATASET_CSV,
      "sample_network_traffic.csv (Synthetic benchmark)"
    );
  };

  // Load sample and immediately compute clustering and 3D PCA projection
  const handleRunSampleDemo = () => {
    try {
      setErrorMessage(null);
      const { headers: parsedHeaders, rows: parsedRows } = parseCSV(SAMPLE_DATASET_CSV);
      const numCols = detectNumericalColumns(parsedHeaders, parsedRows);
      const refCol = detectReferenceColumn(parsedHeaders);
      const selected = numCols.slice(0, Math.min(6, numCols.length));

      setDatasetName("sample_network_traffic.csv (Synthetic benchmark)");
      setHeaders(parsedHeaders);
      setRawRows(parsedRows);
      setNumericalColumns(numCols);
      setSelectedFeatures(selected);
      setReferenceColumn(refCol);

      const prep = preprocessData(parsedHeaders, parsedRows, selected);
      if (prep.data) {
        const data = prep.data;
        const scaler = fitStandardScaler(data.numericMatrix, data.featureNames);
        const scaledMatrix = transformWithScaler(data.numericMatrix, scaler);
        const dbscanOutput = runDBSCAN(scaledMatrix, 0.5, 5, "euclidean");
        const pcaOutput = computePCA2D(scaledMatrix);
        const pca3DOutput = computePCA3D(scaledMatrix);

        setCleanedDataset(data);
        setResults(dbscanOutput);
        setPcaResult(pcaOutput);
        setPca3DResult(pca3DOutput);
        setCurrentView("three_d_model");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load sample demo.");
    }
  };

  // Feature toggle
  const handleToggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feature));
    } else {
      setSelectedFeatures([...selectedFeatures, feature]);
    }
  };

  const handleSelectAllNumerical = () => {
    setSelectedFeatures([...numericalColumns]);
  };

  // Run Anomaly Detection Pipeline
  const handleRunDetection = (params: {
    eps: number;
    minSamples: number;
    metric: DistanceMetric;
    samplingLimit?: number;
  }) => {
    if (selectedFeatures.length < 2) {
      setErrorMessage("Please select at least two numerical features.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Yield to render spinner
    setTimeout(() => {
      try {
        const prep = preprocessData(
          headers,
          rawRows,
          selectedFeatures,
          params.samplingLimit
        );

        if (prep.error || !prep.data) {
          setErrorMessage(prep.error || "Preprocessing failed.");
          setIsProcessing(false);
          return;
        }

        const data = prep.data;

        // Standardize features using StandardScaler
        const scaler = fitStandardScaler(data.numericMatrix, data.featureNames);
        const scaledMatrix = transformWithScaler(data.numericMatrix, scaler);

        // Run DBSCAN
        const dbscanOutput = runDBSCAN(
          scaledMatrix,
          params.eps,
          params.minSamples,
          params.metric
        );

        // Run PCA 2D & 3D
        const pcaOutput = computePCA2D(scaledMatrix);
        const pca3DOutput = computePCA3D(scaledMatrix);

        setCleanedDataset(data);
        setResults(dbscanOutput);
        setPcaResult(pcaOutput);
        setPca3DResult(pca3DOutput);
        setIsProcessing(false);
        setCurrentView("results");
      } catch (err: any) {
        setErrorMessage(err.message || "An unexpected error occurred during DBSCAN execution.");
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleReset = () => {
    setDatasetName(null);
    setHeaders([]);
    setRawRows([]);
    setNumericalColumns([]);
    setSelectedFeatures([]);
    setReferenceColumn(undefined);
    setCleanedDataset(null);
    setResults(null);
    setPcaResult(null);
    setPca3DResult(null);
    setErrorMessage(null);
    setCurrentView("overview");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation Bar */}
      <Navbar
        datasetName={datasetName}
        rowCount={rawRows.length}
        results={results}
        onReset={handleReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(v) => setCurrentView(v)}
          hasDataset={rawRows.length > 0}
          hasResults={results !== null}
          results={results}
          datasetName={datasetName}
          totalRecords={rawRows.length}
        />

        {/* View Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
          {errorMessage && (
            <div className="mb-6 p-4 rounded bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-mono ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {currentView === "overview" && (
            <OverviewView
              onLoadDataset={handleLoadDataset}
              onLoadSample={handleLoadSample}
              hasDataset={rawRows.length > 0}
              datasetName={datasetName}
              totalRecords={rawRows.length}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === "dataset_analysis" && (
            <DatasetAnalysisView
              headers={headers}
              rawRows={rawRows}
              numericalColumns={numericalColumns}
              selectedFeatures={selectedFeatures}
              onToggleFeature={handleToggleFeature}
              onSelectAllNumerical={handleSelectAllNumerical}
              referenceColumn={referenceColumn}
              onProceedToDetection={() => setCurrentView("detection")}
            />
          )}

          {currentView === "detection" && (
            <DetectionView
              selectedFeatures={selectedFeatures}
              rawRowCount={rawRows.length}
              onRunDetection={handleRunDetection}
              isProcessing={isProcessing}
              results={results}
              summary={cleanedDataset?.summary || null}
              onNavigate={(v) => setCurrentView(v)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {currentView === "results" && (
            <ResultsView
              results={results}
              dataset={cleanedDataset}
              datasetName={datasetName}
              onNavigateToVisualization={() => setCurrentView("visualization")}
              onNavigateToThreatIntel={() => setCurrentView("threat_intel")}
              onNavigateTo3D={() => setCurrentView("three_d_model")}
            />
          )}

          {currentView === "visualization" && (
            <VisualizationView
              results={results}
              pca={pcaResult}
              dataset={cleanedDataset}
              onNavigateTo3D={() => setCurrentView("three_d_model")}
            />
          )}

          {currentView === "three_d_model" && (
            <ThreeDModelView
              results={results}
              pca3D={pca3DResult}
              dataset={cleanedDataset}
              onRunSampleDemo={handleRunSampleDemo}
              onNavigateToSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {currentView === "threat_intel" && (
            <ThreatIntelligenceView
              results={results}
              dataset={cleanedDataset}
            />
          )}

          {currentView === "cloud_sessions" && (
            <CloudSessionsView
              onLoadSessionParameters={(session: SavedAnalysisSession) => {
                // Preselect features if present in loaded dataset
                if (session.selectedFeatures && session.selectedFeatures.length >= 2) {
                  setSelectedFeatures(session.selectedFeatures);
                }
                setCurrentView("detection");
              }}
            />
          )}

          {currentView === "gemini_chat" && (
            <GeminiChatView
              results={results}
              dataset={cleanedDataset}
              datasetName={datasetName}
            />
          )}

          {currentView === "settings" && <SettingsView />}

          {currentView === "about" && <AboutView />}

          {currentView === "privacy_policy" && <PrivacyPolicyView />}

          {currentView === "terms" && <TermsView />}
        </main>
      </div>

      {/* Global Slide-over / Modal Settings Panel */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
