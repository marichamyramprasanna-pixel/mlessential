/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * Exact algorithm implementation matching scikit-learn behavior.
 * Assigns cluster labels 0, 1, 2... and -1 for noise points (potential anomalies).
 */

export type DistanceMetric = "euclidean" | "manhattan" | "chebyshev";

export interface DBSCANResults {
  labels: number[];
  totalRecords: number;
  numClusters: number;
  numAnomalies: number;
  noiseCount: number;
  clusteredCount: number;
  anomalyPercentage: number;
  largestClusterSize: number;
  clusterSizes: Record<number, number>;
  coreSampleCount: number;
  isCorePoint: boolean[];
  eps: number;
  minSamples: number;
  metric: DistanceMetric;
}

function calculateDistance(
  a: number[],
  b: number[],
  metric: DistanceMetric
): number {
  const len = a.length;
  if (metric === "manhattan") {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  if (metric === "chebyshev") {
    let maxDiff = 0;
    for (let i = 0; i < len; i++) {
      const diff = Math.abs(a[i] - b[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    return maxDiff;
  }

  // Default: Euclidean
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

function findNeighbors(
  pointIndex: number,
  data: number[][],
  eps: number,
  metric: DistanceMetric
): number[] {
  const neighbors: number[] = [];
  const target = data[pointIndex];
  const n = data.length;

  for (let i = 0; i < n; i++) {
    if (calculateDistance(target, data[i], metric) <= eps) {
      neighbors.push(i);
    }
  }

  return neighbors;
}

export function runDBSCAN(
  scaledData: number[][],
  eps: number = 0.5,
  minSamples: number = 5,
  metric: DistanceMetric = "euclidean"
): DBSCANResults {
  const n = scaledData.length;
  if (n === 0) {
    throw new Error("Cannot run DBSCAN on an empty dataset.");
  }
  if (eps <= 0) {
    throw new Error("Parameter eps must be strictly positive.");
  }
  if (minSamples < 1) {
    throw new Error("Parameter minSamples must be at least 1.");
  }

  // -2: Unvisited, -1: Noise / Potential Anomaly, >= 0: Cluster ID
  const UNVISITED = -2;
  const NOISE = -1;
  const labels = new Array<number>(n).fill(UNVISITED);
  const isCorePoint = new Array<boolean>(n).fill(false);

  let currentClusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) {
      continue;
    }

    const neighbors = findNeighbors(i, scaledData, eps, metric);

    if (neighbors.length < minSamples) {
      // Mark as noise initially (may become a border point later)
      labels[i] = NOISE;
    } else {
      // Found a core point, start a new cluster
      labels[i] = currentClusterId;
      isCorePoint[i] = true;

      // Expand cluster using a FIFO queue
      const queue: number[] = [...neighbors];
      const inQueue = new Uint8Array(n);
      for (const idx of queue) {
        inQueue[idx] = 1;
      }

      let qIdx = 0;
      while (qIdx < queue.length) {
        const neighborIdx = queue[qIdx++];

        if (labels[neighborIdx] === NOISE) {
          // Border point previously labeled as noise
          labels[neighborIdx] = currentClusterId;
        }

        if (labels[neighborIdx] !== UNVISITED) {
          continue;
        }

        labels[neighborIdx] = currentClusterId;

        const subNeighbors = findNeighbors(neighborIdx, scaledData, eps, metric);
        if (subNeighbors.length >= minSamples) {
          isCorePoint[neighborIdx] = true;
          for (let j = 0; j < subNeighbors.length; j++) {
            const subIdx = subNeighbors[j];
            if (!inQueue[subIdx]) {
              inQueue[subIdx] = 1;
              queue.push(subIdx);
            }
          }
        }
      }

      currentClusterId++;
    }
  }

  // Calculate actual model output statistics
  const clusterSizes: Record<number, number> = {};
  let noiseCount = 0;
  let coreSampleCount = 0;

  for (let i = 0; i < n; i++) {
    const lbl = labels[i];
    if (lbl === NOISE) {
      noiseCount++;
    } else {
      clusterSizes[lbl] = (clusterSizes[lbl] || 0) + 1;
    }
    if (isCorePoint[i]) {
      coreSampleCount++;
    }
  }

  const numClusters = currentClusterId;
  const clusteredCount = n - noiseCount;
  const anomalyPercentage = n > 0 ? Number(((noiseCount / n) * 100).toFixed(2)) : 0;

  let largestClusterSize = 0;
  for (const cId in clusterSizes) {
    if (clusterSizes[cId] > largestClusterSize) {
      largestClusterSize = clusterSizes[cId];
    }
  }

  return {
    labels,
    totalRecords: n,
    numClusters,
    numAnomalies: noiseCount,
    noiseCount,
    clusteredCount,
    anomalyPercentage,
    largestClusterSize,
    clusterSizes,
    coreSampleCount,
    isCorePoint,
    eps,
    minSamples,
    metric,
  };
}
