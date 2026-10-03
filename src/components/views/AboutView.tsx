import React from "react";
import { Info, Target, CircleDot, ShieldAlert, Cpu, Network } from "lucide-react";

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          About DBSCAN in Network Anomaly Detection
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Theoretical foundation of Density-Based Spatial Clustering of Applications with Noise.
        </p>
      </div>

      {/* Overview Card */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2">
          <Network className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Algorithmic Background</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          DBSCAN (Density-Based Spatial Clustering of Applications with Noise) was introduced by Martin Ester, Hans-Peter Kriegel, Jörg Sander, and Xiaowei Xu in 1996. It represents one of the most prominent density-based clustering algorithms in data mining and unsupervised machine learning.
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Unlike centroid-based algorithms such as K-Means that partition data into convex spherical geometries, DBSCAN discovers clusters of arbitrary geometric shape by identifying contiguous regions where sample density exceeds a specified threshold.
        </p>
      </div>

      {/* Point Classification Cards */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
          Point Topology Classifications
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400">
              <Target className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase font-mono">1. Core Points</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              A point <span className="font-mono text-sky-700 dark:text-sky-300">p</span> is classified as a Core Point if its epsilon neighborhood contains at least <span className="font-mono text-sky-700 dark:text-sky-300">min_samples</span> observations (including <span className="font-mono text-sky-700 dark:text-sky-300">p</span> itself).
            </p>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
              N_eps(p) &gt;= min_samples
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Core points constitute the dense interior foundation of regular network traffic clusters.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <CircleDot className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase font-mono">2. Border Points</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              A point is a Border Point if it falls within the epsilon radius of an existing core point, but contains fewer than <span className="font-mono text-emerald-700 dark:text-emerald-300">min_samples</span> points within its own local neighborhood.
            </p>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
              p in N_eps(core) AND N_eps(p) &lt; min_samples
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Border points establish the outer operational frontiers of discovered clusters.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase font-mono">3. Noise Points (-1)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              A point is labeled as Noise (assigned integer label <span className="font-mono text-red-600 dark:text-red-400">-1</span>) if it is neither a core point nor density-reachable from any core point.
            </p>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
              DBSCAN Label = -1 (Potential Anomaly)
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Noise points are isolated in low-density feature space, making them candidates for security triage.
            </p>
          </div>
        </div>
      </div>

      {/* Hyperparameters Technical Analysis */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-4 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2">
          Hyperparameter Sensitivity Analysis
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <div className="font-mono font-semibold text-sky-600 dark:text-sky-400">EPS (Epsilon, Radius Threshold)</div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Defines the maximum geometric distance between two points for them to be recognized as neighbors.
            </p>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 pt-1">
              <li>
                <span className="text-slate-900 dark:text-slate-300 font-medium">Small eps:</span> Clusters fracture; normal baseline traffic is mistakenly designated as noise.
              </li>
              <li>
                <span className="text-slate-900 dark:text-slate-300 font-medium">Large eps:</span> Genuine low-density outliers are absorbed into predominant clusters.
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <div className="font-mono font-semibold text-sky-600 dark:text-sky-400">MIN SAMPLES (Density Threshold)</div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Specifies the minimum number of observations required within the epsilon neighborhood to establish cluster core status.
            </p>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 pt-1">
              <li>
                <span className="text-slate-900 dark:text-slate-300 font-medium">Small min_samples:</span> Tiny incidental groups or transient bursts form micro-clusters.
              </li>
              <li>
                <span className="text-slate-900 dark:text-slate-300 font-medium">Large min_samples:</span> Requires significant volume to qualify as normal baseline traffic.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Why DBSCAN for Network Anomaly Detection */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
          Key Advantages in Network Traffic Analytics
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">1. No Prior Cluster Count (k)</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Network engineers do not need to assume how many protocol behaviors or user profiles exist in advance. DBSCAN identifies natural modal structures autonomously.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">2. Complex Manifold Geometries</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard network traffic is non-Gaussian and forms irregular, elongated clusters across session durations and transfer rates that K-Means fails to model.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">3. Built-In Noise Label (-1)</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Rather than assigning every point to a cluster, DBSCAN natively isolates low-density outliers with label -1, directly yielding an anomaly candidate set.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">4. StandardScaler Integration</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Standardizing metrics prevents high-magnitude features (e.g. Flow Duration in microseconds) from dominating low-magnitude features (e.g. Packet Count).
            </p>
          </div>
        </div>
      </div>

      {/* Operational Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/80 rounded p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-900 dark:text-amber-300">Operational Disclaimer</div>
          <p className="leading-relaxed text-amber-800 dark:text-amber-200/90">
            DBSCAN identifies points located in low-density spatial neighborhoods. An unusual observation is not necessarily a security violation or malicious intrusion. Legitimate administrative backups, software releases, or novel client applications can exhibit atypical flow metrics. DBSCAN noise outputs should serve as prioritized triage signals rather than automated block decisions.
          </p>
        </div>
      </div>
    </div>
  );
};
