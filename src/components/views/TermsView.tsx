import React from "react";
import { FileText, AlertTriangle, Scale, ShieldX } from "lucide-react";

export const TermsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Terms and Conditions
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Operational terms, algorithmic limitations, and academic liability disclaimers.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>1. Educational & Academic Research Scope</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          This web application was engineered solely as an academic Machine Learning demonstration project. It is intended to showcase the mathematics and mechanics of unsupervised density-based spatial clustering (DBSCAN) applied to multidimensional network flow telemetry.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <ShieldX className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span>2. Prototype Limitations & No Cyber Defense Guarantees</span>
        </div>
        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            By using this application, you acknowledge and agree to the following technical constraints:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
            <li>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">Not an Enterprise IDS/IPS:</span> This application does not replace commercial Intrusion Detection Systems, Intrusion Prevention Systems, or Next-Generation Firewalls.
            </li>
            <li>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">Anomalies are not Proven Attacks:</span> A point labeled as noise (label -1) is solely a mathematical outlier in normalized Euclidean or Manhattan space. It does not constitute evidence of malicious intent or unauthorized compromise.
            </li>
            <li>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">No Guarantee of Precision or Recall:</span> The accuracy of DBSCAN depends heavily upon dataset distribution, feature selection, and hyperparameter tuning. High false-positive and false-negative rates may occur.
            </li>
          </ul>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>3. Acceptable Use and Data Responsibility</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Users agree to upload only network flow logs for which they possess explicit legal authorization to inspect. You agree not to upload classified government data, unmasked personal data, or network capture traces that violate organizational security policies.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Scale className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>4. Limitation of Liability</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          To the maximum extent permitted by applicable law, the authors, contributors, and academic institutions associated with this project shall not be liable for any direct, indirect, incidental, punitive, or consequential damages resulting from the use or inability to use this software, including undetected network intrusions or business interruption.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-2 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Modifications to Software
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The software is provided on an "as is" and "as available" basis. The development team reserves the right to update, modify, or retire components of this application at any time without prior notice.
        </p>
      </div>
    </div>
  );
};
