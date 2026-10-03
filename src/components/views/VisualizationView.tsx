import React, { useState, useMemo, useRef } from "react";
import {
  ScatterChart as ScatterIcon,
  BarChart3,
  Info,
  Maximize2,
  Filter,
  Box,
} from "lucide-react";
import { DBSCANResults } from "../../ml/dbscan";
import { PCAResult } from "../../ml/pca";
import { CleanedDataset } from "../../ml/preprocessing";

interface VisualizationViewProps {
  results: DBSCANResults | null;
  pca: PCAResult | null;
  dataset: CleanedDataset | null;
  onNavigateTo3D?: () => void;
}

const CLUSTER_COLORS = [
  "#38bdf8", // Sky blue
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#a78bfa", // Violet (not purple gradient)
  "#f472b6", // Pink
  "#2dd4bf", // Teal
  "#fb923c", // Orange
  "#60a5fa", // Blue
  "#e879f9", // Fuchsia
];

export const VisualizationView: React.FC<VisualizationViewProps> = ({
  results,
  pca,
  dataset,
  onNavigateTo3D,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    id: number;
    pc1: number;
    pc2: number;
    label: number;
    status: string;
    features: Record<string, number>;
  } | null>(null);

  const [activeDistributionFeature, setActiveDistributionFeature] = useState<string>(
    dataset?.featureNames[0] || ""
  );

  if (!results || !pca || !dataset) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-8 text-center max-w-xl mx-auto my-12 shadow-xs">
        <ScatterIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">No Visualization Data</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Please run DBSCAN detection first to compute PCA coordinates and cluster assignments.
        </p>
      </div>
    );
  }

  // Pre-calculate PCA plot bounds
  const { minX, maxX, minY, maxY } = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const [x, y] of pca.coords) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const padX = (maxX - minX) * 0.1 || 1;
    const padY = (maxY - minY) * 0.1 || 1;

    return {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: minY - padY,
      maxY: maxY + padY,
    };
  }, [pca]);

  const svgWidth = 720;
  const svgHeight = 440;
  const margin = { top: 30, right: 30, bottom: 40, left: 50 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const scaleX = (x: number) => {
    return margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  };

  const scaleY = (y: number) => {
    return margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;
  };

  // Distinct cluster sizes array for bar chart
  const clusterDistribution = useMemo(() => {
    const list: { label: string; count: number; color: string }[] = [];
    const sortedClusterIds = Object.keys(results.clusterSizes)
      .map(Number)
      .sort((a, b) => a - b);

    for (const cId of sortedClusterIds) {
      list.push({
        label: `Cluster ${cId}`,
        count: results.clusterSizes[cId],
        color: CLUSTER_COLORS[cId % CLUSTER_COLORS.length],
      });
    }

    if (results.noiseCount > 0) {
      list.push({
        label: "Noise (-1)",
        count: results.noiseCount,
        color: "#ef4444",
      });
    }

    return list;
  }, [results]);

  const maxBarCount = Math.max(...clusterDistribution.map((d) => d.count), 1);

  // Feature histogram calculations for the selected feature
  const histogramData = useMemo(() => {
    if (!activeDistributionFeature) return null;
    const featIdx = dataset.featureNames.indexOf(activeDistributionFeature);
    if (featIdx === -1) return null;

    const values = dataset.numericMatrix.map((row) => row[featIdx]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const numBins = 15;
    const binWidth = (maxVal - minVal) / numBins || 1;

    const clusteredBins = new Array(numBins).fill(0);
    const anomalyBins = new Array(numBins).fill(0);

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      let bIdx = Math.floor((v - minVal) / binWidth);
      if (bIdx >= numBins) bIdx = numBins - 1;

      if (results.labels[i] === -1) {
        anomalyBins[bIdx]++;
      } else {
        clusteredBins[bIdx]++;
      }
    }

    const bins = [];
    for (let b = 0; b < numBins; b++) {
      const start = minVal + b * binWidth;
      const end = start + binWidth;
      bins.push({
        rangeLabel: `${start.toFixed(0)}-${end.toFixed(0)}`,
        clustered: clusteredBins[b],
        anomaly: anomalyBins[b],
      });
    }

    const maxBinCount = Math.max(
      ...clusteredBins.map((c, i) => c + anomalyBins[i]),
      1
    );

    return { bins, maxBinCount };
  }, [activeDistributionFeature, dataset, results]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Dimensionality Reduction & Cluster Visualizations
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Explore two-dimensional PCA projections, cluster frequency charts, and feature density distributions.
          </p>
        </div>

        {onNavigateTo3D && (
          <button
            onClick={onNavigateTo3D}
            className="flex items-center space-x-2 px-3.5 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Box className="w-4 h-4" />
            <span>Launch 3D Model Explorer</span>
          </button>
        )}
      </div>

      {/* PCA Scatter Plot Card */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2">
              <ScatterIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Two-Dimensional PCA Projection (PC1 vs PC2)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              PCA is used only to visualize the multidimensional data in two dimensions. DBSCAN operates on the selected scaled features.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
            <span className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-2 py-0.5 rounded">
              PC1: {(pca.explainedVarianceRatio[0] * 100).toFixed(1)}% var
            </span>
            <span className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-2 py-0.5 rounded">
              PC2: {(pca.explainedVarianceRatio[1] * 100).toFixed(1)}% var
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
          {Object.keys(results.clusterSizes)
            .map(Number)
            .sort((a, b) => a - b)
            .map((cId) => (
              <div key={cId} className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: CLUSTER_COLORS[cId % CLUSTER_COLORS.length] }}
                ></span>
                <span>
                  Cluster {cId} (n={results.clusterSizes[cId]})
                </span>
              </div>
            ))}
          {results.noiseCount > 0 && (
            <div className="flex items-center space-x-1.5 font-mono text-[11px] text-red-600 dark:text-red-400">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-sm"></span>
              <span className="font-semibold">
                Potential Anomaly (Noise) (n={results.noiseCount})
              </span>
            </div>
          )}
        </div>

        {/* SVG Scatter Plot Container */}
        <div className="relative border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded p-2 overflow-x-auto flex justify-center">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full max-w-[720px] select-none"
            style={{ minWidth: "500px" }}
          >
            {/* Grid lines */}
            <line
              x1={margin.left}
              y1={scaleY(0)}
              x2={margin.left + plotWidth}
              y2={scaleY(0)}
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-800"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
            <line
              x1={scaleX(0)}
              y1={margin.top}
              x2={scaleX(0)}
              y2={margin.top + plotHeight}
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-800"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />

            {/* Axes Borders */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill="none"
              stroke="currentColor"
              className="text-slate-400 dark:text-slate-700"
              strokeWidth="1"
            />

            {/* Scatter Points: First clustered points, then noise points on top */}
            {pca.coords.map(([x, y], idx) => {
              const label = results.labels[idx];
              if (label === -1) return null; // render noise second
              const cx = scaleX(x);
              const cy = scaleY(y);
              const color = CLUSTER_COLORS[label % CLUSTER_COLORS.length];

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill={color}
                  fillOpacity="0.75"
                  className="cursor-pointer transition-transform hover:scale-150"
                  onMouseEnter={() => {
                    const featObj: Record<string, number> = {};
                    dataset.featureNames.forEach((fn, fIdx) => {
                      featObj[fn] = dataset.numericMatrix[idx][fIdx];
                    });
                    setHoveredPoint({
                      id: idx + 1,
                      pc1: Number(x.toFixed(2)),
                      pc2: Number(y.toFixed(2)),
                      label,
                      status: "Clustered Traffic",
                      features: featObj,
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}

            {/* Noise Points (Crosses or Red Dots) */}
            {pca.coords.map(([x, y], idx) => {
              const label = results.labels[idx];
              if (label !== -1) return null;
              const cx = scaleX(x);
              const cy = scaleY(y);

              return (
                <g
                  key={`noise-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    const featObj: Record<string, number> = {};
                    dataset.featureNames.forEach((fn, fIdx) => {
                      featObj[fn] = dataset.numericMatrix[idx][fIdx];
                    });
                    setHoveredPoint({
                      id: idx + 1,
                      pc1: Number(x.toFixed(2)),
                      pc2: Number(y.toFixed(2)),
                      label: -1,
                      status: "Potential Anomaly",
                      features: featObj,
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle cx={cx} cy={cy} r="5" fill="#ef4444" fillOpacity="0.85" />
                  <line
                    x1={cx - 3.5}
                    y1={cy - 3.5}
                    x2={cx + 3.5}
                    y2={cy + 3.5}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={cx - 3.5}
                    y1={cy + 3.5}
                    x2={cx + 3.5}
                    y2={cy - 3.5}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}

            {/* Axis labels */}
            <text
              x={margin.left + plotWidth / 2}
              y={svgHeight - 10}
              textAnchor="middle"
              className="text-[11px] font-mono fill-slate-500 dark:fill-slate-400"
            >
              Principal Component 1 ({(pca.explainedVarianceRatio[0] * 100).toFixed(1)}% explained variance)
            </text>

            <text
              x={15}
              y={margin.top + plotHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 15 ${margin.top + plotHeight / 2})`}
              className="text-[11px] font-mono fill-slate-500 dark:fill-slate-400"
            >
              Principal Component 2 ({(pca.explainedVarianceRatio[1] * 100).toFixed(1)}% explained variance)
            </text>
          </svg>

          {/* Point Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 rounded p-3 text-xs font-mono shadow-xl max-w-xs pointer-events-none z-10 space-y-1">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Flow #{hoveredPoint.id}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    hoveredPoint.label === -1
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800"
                      : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300 border border-sky-300 dark:border-slate-700"
                  }`}
                >
                  {hoveredPoint.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                PC1: {hoveredPoint.pc1} | PC2: {hoveredPoint.pc2}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                {Object.entries(hoveredPoint.features).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="truncate max-w-[120px]">{k}:</span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold">{v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Distribution Bar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Record Distribution by Cluster & Noise</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Comparison of observations contained within dense clusters versus isolated noise points.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {clusterDistribution.map((item) => {
              const pct = ((item.count / results.totalRecords) * 100).toFixed(1);
              const barWidth = Math.max(4, (item.count / maxBarCount) * 100);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-800 dark:text-slate-300 font-medium">{item.label}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.count.toLocaleString()} flows ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: item.color,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Feature Distribution Histogram */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                Feature Density Histogram
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Clustered (Sky) vs Potential Anomalies (Red)
              </p>
            </div>

            <select
              value={activeDistributionFeature}
              onChange={(e) => setActiveDistributionFeature(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {dataset.featureNames.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>

          {histogramData && (
            <div className="space-y-1 pt-2">
              <div className="h-40 flex items-end space-x-1.5 pt-4">
                {histogramData.bins.map((b, idx) => {
                  const total = b.clustered + b.anomaly;
                  const totalHeight = (total / histogramData.maxBinCount) * 100;
                  const clusteredFraction = total > 0 ? (b.clustered / total) * 100 : 0;
                  const anomalyFraction = total > 0 ? (b.anomaly / total) * 100 : 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full flex flex-col justify-end group relative"
                    >
                      <div
                        className="w-full rounded-sm overflow-hidden flex flex-col justify-end"
                        style={{ height: `${Math.max(2, totalHeight)}%` }}
                      >
                        <div
                          style={{
                            height: `${anomalyFraction}%`,
                            backgroundColor: "#ef4444",
                          }}
                        ></div>
                        <div
                          style={{
                            height: `${clusteredFraction}%`,
                            backgroundColor: "#38bdf8",
                          }}
                        ></div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10 text-slate-900 dark:text-slate-200">
                        <div>Range: {b.rangeLabel}</div>
                        <div className="text-sky-600 dark:text-sky-400">Clustered: {b.clustered}</div>
                        <div className="text-red-600 dark:text-red-400">Anomalies: {b.anomaly}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Min: {histogramData.bins[0]?.rangeLabel.split("-")[0]}</span>
                <span className="text-center">{activeDistributionFeature}</span>
                <span>Max: {histogramData.bins[histogramData.bins.length - 1]?.rangeLabel.split("-")[1]}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
