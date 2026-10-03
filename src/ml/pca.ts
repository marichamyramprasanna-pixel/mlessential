/**
 * Principal Component Analysis (PCA) 2D Projection.
 * Used exclusively for projecting multidimensional feature space onto 2 principal
 * components (PC1 vs PC2) for technical visualization.
 */

export interface PCAResult {
  coords: [number, number][];
  explainedVarianceRatio: [number, number];
  components: [number[], number[]];
}

export interface PCA3DResult {
  coords: [number, number, number][];
  explainedVarianceRatio: [number, number, number];
  components: [number[], number[], number[]];
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(dot(v, v));
  if (norm < 1e-12) return v.slice();
  return v.map((x) => x / norm);
}

function matrixVectorMult(mat: number[][], vec: number[]): number[] {
  const n = mat.length;
  const res = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    res[i] = dot(mat[i], vec);
  }
  return res;
}

export function computePCA2D(standardizedData: number[][]): PCAResult {
  const nSamples = standardizedData.length;
  if (nSamples === 0) {
    return {
      coords: [],
      explainedVarianceRatio: [0, 0],
      components: [[], []],
    };
  }

  const nFeatures = standardizedData[0].length;
  if (nFeatures === 1) {
    const coords: [number, number][] = standardizedData.map((row) => [row[0], 0]);
    return {
      coords,
      explainedVarianceRatio: [1.0, 0.0],
      components: [[1], [0]],
    };
  }

  // Compute Covariance Matrix: C = (1 / (N - 1)) * X^T * X
  const cov: number[][] = Array.from({ length: nFeatures }, () => new Array(nFeatures).fill(0));
  const denom = nSamples > 1 ? nSamples - 1 : 1;

  for (let i = 0; i < nFeatures; i++) {
    for (let j = i; j < nFeatures; j++) {
      let sum = 0;
      for (let k = 0; k < nSamples; k++) {
        sum += standardizedData[k][i] * standardizedData[k][j];
      }
      const val = sum / denom;
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }

  // Total variance is the trace of the covariance matrix
  let totalVariance = 0;
  for (let i = 0; i < nFeatures; i++) {
    totalVariance += cov[i][i];
  }
  if (totalVariance <= 0) totalVariance = 1;

  // Power iteration for first eigenvector (PC1)
  let v1: number[] = new Array<number>(nFeatures).fill(0).map((_, idx) => (idx === 0 ? 1 : 0.5));
  v1 = normalize(v1);

  for (let iter = 0; iter < 50; iter++) {
    const w = matrixVectorMult(cov, v1);
    const nextV = normalize(w);
    v1 = nextV;
  }

  // Rayleight quotient for eigenvalue 1
  const w1 = matrixVectorMult(cov, v1);
  const lambda1 = Math.max(0, dot(v1, w1));

  // Deflation for second eigenvector: C' = C - lambda1 * (v1 * v1^T)
  const covDeflated: number[][] = Array.from({ length: nFeatures }, () => new Array(nFeatures).fill(0));
  for (let i = 0; i < nFeatures; i++) {
    for (let j = 0; j < nFeatures; j++) {
      covDeflated[i][j] = cov[i][j] - lambda1 * v1[i] * v1[j];
    }
  }

  // Power iteration for second eigenvector (PC2)
  let v2: number[] = new Array<number>(nFeatures).fill(0).map((_, idx) => (idx === 1 ? 1 : 0.25));
  // Orthogonalize against v1
  const proj = dot(v2, v1);
  for (let i = 0; i < nFeatures; i++) {
    v2[i] -= proj * v1[i];
  }
  v2 = normalize(v2);

  for (let iter = 0; iter < 50; iter++) {
    const w = matrixVectorMult(covDeflated, v2);
    // Gram-Schmidt orthogonalization against v1
    const p = dot(w, v1);
    for (let i = 0; i < nFeatures; i++) {
      w[i] -= p * v1[i];
    }
    const nextV = normalize(w);
    v2 = nextV;
  }

  const w2 = matrixVectorMult(cov, v2);
  const lambda2 = Math.max(0, dot(v2, w2));

  // Calculate explained variance ratios
  const varRatio1 = Number(Math.min(1.0, lambda1 / totalVariance).toFixed(4));
  const varRatio2 = Number(Math.min(1.0 - varRatio1, lambda2 / totalVariance).toFixed(4));

  // Project samples onto [PC1, PC2]
  const coords: [number, number][] = new Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    const pc1Val = dot(standardizedData[i], v1);
    const pc2Val = dot(standardizedData[i], v2);
    coords[i] = [pc1Val, pc2Val];
  }

  return {
    coords,
    explainedVarianceRatio: [varRatio1, varRatio2],
    components: [v1, v2],
  };
}

export function computePCA3D(standardizedData: number[][]): PCA3DResult {
  const nSamples = standardizedData.length;
  if (nSamples === 0) {
    return {
      coords: [],
      explainedVarianceRatio: [0, 0, 0],
      components: [[], [], []],
    };
  }

  const nFeatures = standardizedData[0].length;
  if (nFeatures === 1) {
    const coords: [number, number, number][] = standardizedData.map((row) => [row[0], 0, 0]);
    return {
      coords,
      explainedVarianceRatio: [1.0, 0.0, 0.0],
      components: [[1], [0], [0]],
    };
  }

  if (nFeatures === 2) {
    const pca2D = computePCA2D(standardizedData);
    const coords: [number, number, number][] = pca2D.coords.map(([x, y]) => [x, y, 0]);
    return {
      coords,
      explainedVarianceRatio: [pca2D.explainedVarianceRatio[0], pca2D.explainedVarianceRatio[1], 0],
      components: [pca2D.components[0], pca2D.components[1], [0, 0]],
    };
  }

  // Compute Covariance Matrix: C = (1 / (N - 1)) * X^T * X
  const cov: number[][] = Array.from({ length: nFeatures }, () => new Array(nFeatures).fill(0));
  const denom = nSamples > 1 ? nSamples - 1 : 1;

  for (let i = 0; i < nFeatures; i++) {
    for (let j = i; j < nFeatures; j++) {
      let sum = 0;
      for (let k = 0; k < nSamples; k++) {
        sum += standardizedData[k][i] * standardizedData[k][j];
      }
      const val = sum / denom;
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }

  // Total variance is trace of covariance matrix
  let totalVariance = 0;
  for (let i = 0; i < nFeatures; i++) {
    totalVariance += cov[i][i];
  }
  if (totalVariance <= 0) totalVariance = 1;

  // Power iteration for first eigenvector (PC1)
  let v1: number[] = new Array<number>(nFeatures).fill(0).map((_, idx) => (idx === 0 ? 1 : 0.5));
  v1 = normalize(v1);
  for (let iter = 0; iter < 50; iter++) {
    const w = matrixVectorMult(cov, v1);
    v1 = normalize(w);
  }
  const w1 = matrixVectorMult(cov, v1);
  const lambda1 = Math.max(0, dot(v1, w1));

  // Deflation for second eigenvector
  const covDeflated1: number[][] = Array.from({ length: nFeatures }, () => new Array(nFeatures).fill(0));
  for (let i = 0; i < nFeatures; i++) {
    for (let j = 0; j < nFeatures; j++) {
      covDeflated1[i][j] = cov[i][j] - lambda1 * v1[i] * v1[j];
    }
  }

  // Power iteration for second eigenvector (PC2)
  let v2: number[] = new Array<number>(nFeatures).fill(0).map((_, idx) => (idx === 1 ? 1 : 0.25));
  const proj1 = dot(v2, v1);
  for (let i = 0; i < nFeatures; i++) {
    v2[i] -= proj1 * v1[i];
  }
  v2 = normalize(v2);

  for (let iter = 0; iter < 50; iter++) {
    const w = matrixVectorMult(covDeflated1, v2);
    const p = dot(w, v1);
    for (let i = 0; i < nFeatures; i++) {
      w[i] -= p * v1[i];
    }
    v2 = normalize(w);
  }
  const w2 = matrixVectorMult(cov, v2);
  const lambda2 = Math.max(0, dot(v2, w2));

  // Deflation for third eigenvector
  const covDeflated2: number[][] = Array.from({ length: nFeatures }, () => new Array(nFeatures).fill(0));
  for (let i = 0; i < nFeatures; i++) {
    for (let j = 0; j < nFeatures; j++) {
      covDeflated2[i][j] = covDeflated1[i][j] - lambda2 * v2[i] * v2[j];
    }
  }

  // Power iteration for third eigenvector (PC3)
  let v3: number[] = new Array<number>(nFeatures).fill(0).map((_, idx) => (idx === 2 ? 1 : 0.15));
  // Orthogonalize against v1 and v2
  const p1 = dot(v3, v1);
  const p2 = dot(v3, v2);
  for (let i = 0; i < nFeatures; i++) {
    v3[i] -= p1 * v1[i] + p2 * v2[i];
  }
  v3 = normalize(v3);

  for (let iter = 0; iter < 50; iter++) {
    const w = matrixVectorMult(covDeflated2, v3);
    const ortho1 = dot(w, v1);
    const ortho2 = dot(w, v2);
    for (let i = 0; i < nFeatures; i++) {
      w[i] -= ortho1 * v1[i] + ortho2 * v2[i];
    }
    v3 = normalize(w);
  }
  const w3 = matrixVectorMult(cov, v3);
  const lambda3 = Math.max(0, dot(v3, w3));

  // Calculate explained variance ratios
  const varRatio1 = Number(Math.min(1.0, lambda1 / totalVariance).toFixed(4));
  const varRatio2 = Number(Math.min(1.0 - varRatio1, lambda2 / totalVariance).toFixed(4));
  const varRatio3 = Number(Math.min(Math.max(0, 1.0 - varRatio1 - varRatio2), lambda3 / totalVariance).toFixed(4));

  // Project samples onto [PC1, PC2, PC3]
  const coords: [number, number, number][] = new Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    const pc1Val = dot(standardizedData[i], v1);
    const pc2Val = dot(standardizedData[i], v2);
    const pc3Val = dot(standardizedData[i], v3);
    coords[i] = [pc1Val, pc2Val, pc3Val];
  }

  return {
    coords,
    explainedVarianceRatio: [varRatio1, varRatio2, varRatio3],
    components: [v1, v2, v3],
  };
}
