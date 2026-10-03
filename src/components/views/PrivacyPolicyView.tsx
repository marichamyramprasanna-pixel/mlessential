import React from "react";
import { ShieldCheck, Lock, Database, RefreshCw, AlertCircle } from "lucide-react";

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Information regarding data handling, processing boundaries, and user privacy guarantees.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>1. Scope and Application Purpose</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          This privacy policy applies exclusively to the "Network Anomaly Detection using DBSCAN" web application. This application was designed, developed, and deployed strictly for academic evaluation and machine learning research demonstration.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>2. Data Collection and Telemetry Ingestion</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          The application processes only the network traffic records that you explicitly provide by uploading a CSV file or generating the synthetic benchmark dataset. The software does not automatically monitor, sniff, or capture packets from your local network adapter.
        </p>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-300">Typically processed attributes include:</p>
          <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            <li>Session duration metrics (Flow Duration)</li>
            <li>Packet counters (Total Forward Packets, Total Backward Packets)</li>
            <li>Throughput rates (Flow Bytes/s, Flow Packets/s)</li>
            <li>Packet length descriptive distributions (Mean, Std Dev, Variance)</li>
            <li>Optional ground-truth benchmark labels (Label, Attack, Class)</li>
          </ul>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>3. Processing Model and Data Retention</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Local In-Memory Execution</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              All data parsing, StandardScaler calculations, and DBSCAN clustering occur entirely within active memory (RAM).
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Zero Persistent Storage</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              No relational databases, object storage buckets, server logs, or disk caches are utilized to persist uploaded network records.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Ephemeral Session Lifecycle</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Refreshing the browser tab, clearing the active session, or navigating away immediately discards all uploaded datasets and clustering assignments.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">No Third-Party Transmission</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Data is never transmitted to advertising networks, analytics trackers, or external machine learning APIs.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>4. Compliance & Sanitization Notice</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          This system is an academic machine learning prototype. It has not undergone formal certification audits for HIPAA, PCI-DSS, ISO 27001, or FedRAMP compliance. Users are strictly advised not to upload proprietary payloads, unmasked internal IP maps, or un-sanitized sensitive credentials.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-2 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Contact & Academic Inquiries
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          For questions regarding the algorithmic implementation, dataset formatting, or academic research usage, please refer to the project repository documentation.
        </p>
      </div>
    </div>
  );
};
