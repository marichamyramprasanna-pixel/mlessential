/**
 * StandardScaler implementation matching scikit-learn behavior.
 * Standardizes features by removing the mean and scaling to unit variance.
 */

export interface ScalerModel {
  means: number[];
  stds: number[];
  featureNames: string[];
}

export function fitStandardScaler(data: number[][], featureNames: string[]): ScalerModel {
  const nSamples = data.length;
  const nFeatures = featureNames.length;

  if (nSamples === 0 || nFeatures === 0) {
    return { means: [], stds: [], featureNames };
  }

  const means: number[] = new Array(nFeatures).fill(0);
  const stds: number[] = new Array(nFeatures).fill(0);

  // Compute means
  for (let i = 0; i < nSamples; i++) {
    for (let j = 0; j < nFeatures; j++) {
      means[j] += data[i][j];
    }
  }
  for (let j = 0; j < nFeatures; j++) {
    means[j] /= nSamples;
  }

  // Compute standard deviations (sample std with ddof=0 or 1, matching sklearn's ddof=0)
  for (let i = 0; i < nSamples; i++) {
    for (let j = 0; j < nFeatures; j++) {
      const diff = data[i][j] - means[j];
      stds[j] += diff * diff;
    }
  }
  for (let j = 0; j < nFeatures; j++) {
    const variance = stds[j] / nSamples;
    stds[j] = variance > 1e-12 ? Math.sqrt(variance) : 1.0; // avoid divide by zero
  }

  return { means, stds, featureNames };
}

export function transformWithScaler(data: number[][], scaler: ScalerModel): number[][] {
  const nSamples = data.length;
  const nFeatures = scaler.featureNames.length;
  const scaled: number[][] = new Array(nSamples);

  for (let i = 0; i < nSamples; i++) {
    const row: number[] = new Array(nFeatures);
    for (let j = 0; j < nFeatures; j++) {
      row[j] = (data[i][j] - scaler.means[j]) / scaler.stds[j];
    }
    scaled[i] = row;
  }

  return scaled;
}
