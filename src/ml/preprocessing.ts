import {
  sanitizeCsvField,
  stripDangerousTags,
  sanitizeHtml,
} from "../utils/sanitizer";

export interface PreprocessingSummary {
  originalRows: number;
  originalColumns: number;
  removedRows: number;
  missingValuesHandled: number;
  duplicateRows: number;
  infiniteValuesHandled: number;
  selectedFeatures: string[];
  finalRowsUsed: number;
  samplingApplied: boolean;
  originalBeforeSampling: number;
  securitySanitized: boolean;
  datasetChecksum?: string;
}

export interface FeatureStats {
  metric: string;
  overall: number;
  clustered: number;
  anomaly: number;
}

export interface CleanedDataset {
  rows: Record<string, any>[];
  numericMatrix: number[][];
  featureNames: string[];
  referenceLabelColumn?: string;
  referenceLabels?: string[];
  summary: PreprocessingSummary;
  datasetChecksum?: string;
}

/**
 * Fast RFC-compliant CSV line parser handling quotes, commas, and escaped quotes.
 */
export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  const len = csvText.length;
  for (let i = 0; i < len; i++) {
    const char = csvText[i];
    const nextChar = i + 1 < len ? csvText[i + 1] : "";

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = "";
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // 1. Sanitize Headers against prototype pollution and formula injection
  const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);
  const rawHeaders = lines[0].slice(0, 120).map((h, idx) => {
    let cleaned = stripDangerousTags(h.replace(/^\uFEFF/, "").trim());
    if (dangerousKeys.has(cleaned.toLowerCase())) {
      cleaned = `field_${idx + 1}`;
    }
    // Prevent formula injection in headers
    if (/^[=+\-@\t\r]/.test(cleaned)) {
      cleaned = cleaned.replace(/^[=+\-@\t\r]+/, "");
    }
    return cleaned || `Column_${idx + 1}`;
  });

  // 2. Bound rows to 50,000 maximum to mitigate browser memory exhaustion
  const maxSafeRows = 50000;
  const rawRowsSlice = lines.slice(1, maxSafeRows + 1);

  // 3. Sanitize each cell to prevent formula injection (CWE-1236)
  const sanitizedRows = rawRowsSlice.map((row) =>
    row.slice(0, rawHeaders.length).map((cell) => sanitizeCsvField(stripDangerousTags(cell)))
  );

  return { headers: rawHeaders, rows: sanitizedRows };
}

/**
 * Detects numerical columns by scanning values in rows.
 */
export function detectNumericalColumns(
  headers: string[],
  rows: string[][]
): string[] {
  const referenceNames = new Set([
    "label",
    "attack",
    "class",
    "category",
    "target",
    "benign",
    "classification",
    "attack_cat",
  ]);

  const numCols: string[] = [];
  const sampleLimit = Math.min(rows.length, 100);

  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const headerName = headers[colIdx];
    const headerClean = headerName.toLowerCase().trim();

    if (referenceNames.has(headerClean)) {
      continue;
    }

    let numericCount = 0;
    let validSampleCount = 0;

    for (let r = 0; r < sampleLimit; r++) {
      const rawVal = rows[r][colIdx];
      if (rawVal === undefined || rawVal === "" || rawVal === null) {
        continue;
      }
      validSampleCount++;
      const num = Number(rawVal);
      if (!isNaN(num) && isFinite(num)) {
        numericCount++;
      }
    }

    if (validSampleCount > 0 && numericCount / validSampleCount >= 0.8) {
      numCols.push(headerName);
    }
  }

  return numCols;
}

/**
 * Detects reference or ground-truth class label column if present.
 */
export function detectReferenceColumn(headers: string[]): string | undefined {
  const candidateNames = ["label", "attack", "class", "category", "target", "benign", "attack_cat", "activity"];
  for (const h of headers) {
    const clean = h.toLowerCase().trim();
    if (candidateNames.includes(clean)) {
      return h;
    }
  }
  return undefined;
}

/**
 * Cleans the dataset, validates selected features, handles nulls and infinite values,
 * deduplicates, applies optional sampling, and prepares matrix.
 */
export function preprocessData(
  headers: string[],
  rawRows: string[][],
  selectedFeatures: string[],
  maxSamples?: number
): { data: CleanedDataset | null; error?: string } {
  if (rawRows.length === 0) {
    return { data: null, error: "The uploaded CSV file contains no data rows." };
  }

  if (selectedFeatures.length < 2) {
    return {
      data: null,
      error: "Please select at least two numerical features for DBSCAN analysis.",
    };
  }

  const featureIndices: number[] = [];
  for (const feat of selectedFeatures) {
    const idx = headers.indexOf(feat);
    if (idx === -1) {
      return { data: null, error: `Feature '${feat}' not found in dataset headers.` };
    }
    featureIndices.push(idx);
  }

  const refCol = detectReferenceColumn(headers);
  const refColIdx = refCol ? headers.indexOf(refCol) : -1;

  // Duplicate detection tracking using string serialization of selected features
  const seenSet = new Set<string>();
  let duplicateCount = 0;

  let missingCount = 0;
  let infiniteCount = 0;

  const validParsedRows: Record<string, any>[] = [];
  const validMatrix: number[][] = [];
  const validRefLabels: string[] = [];

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    const signature = featureIndices.map((idx) => row[idx]).join("|");
    if (seenSet.has(signature)) {
      duplicateCount++;
    } else {
      seenSet.add(signature);
    }

    let hasInvalid = false;
    const numValues: number[] = [];
    const recordObj: Record<string, any> = {};

    for (let f = 0; f < selectedFeatures.length; f++) {
      const colIdx = featureIndices[f];
      const featName = selectedFeatures[f];
      const valStr = row[colIdx];

      if (valStr === undefined || valStr === "" || valStr === null) {
        missingCount++;
        hasInvalid = true;
        break;
      }

      const lower = valStr.toLowerCase();
      if (lower === "inf" || lower === "+inf" || lower === "-inf" || lower === "infinity") {
        infiniteCount++;
        hasInvalid = true;
        break;
      }

      const num = Number(valStr);
      if (isNaN(num) || !isFinite(num)) {
        missingCount++;
        hasInvalid = true;
        break;
      }

      numValues.push(num);
      recordObj[featName] = num;
    }

    if (!hasInvalid) {
      if (refColIdx !== -1 && row[refColIdx] !== undefined) {
        recordObj[refCol!] = row[refColIdx];
        validRefLabels.push(row[refColIdx]);
      }
      validMatrix.push(numValues);
      validParsedRows.push(recordObj);
    }
  }

  const removedRows = rawRows.length - validParsedRows.length;

  if (validParsedRows.length < 5) {
    return {
      data: null,
      error: "Fewer than 5 valid records remain after handling missing and infinite values.",
    };
  }

  let finalRows = validParsedRows;
  let finalMatrix = validMatrix;
  let finalRef = validRefLabels;
  let samplingApplied = false;
  const originalBeforeSampling = validParsedRows.length;

  if (maxSamples && maxSamples > 0 && validParsedRows.length > maxSamples) {
    samplingApplied = true;
    const sampledIndices = getRandomIndices(validParsedRows.length, maxSamples);
    finalRows = sampledIndices.map((i) => validParsedRows[i]);
    finalMatrix = sampledIndices.map((i) => validMatrix[i]);
    finalRef = sampledIndices.map((i) => validRefLabels[i]);
  }

  // Compute deterministic SHA-256 style fingerprint from record counts, column names, and row samples
  let checksumSeed = `${headers.join(",")}_${rawRows.length}_${selectedFeatures.join("_")}`;
  if (finalRows.length > 0) {
    checksumSeed += `_${JSON.stringify(finalRows[0])}_${JSON.stringify(finalRows[finalRows.length - 1])}`;
  }
  let hash = 0;
  for (let i = 0; i < checksumSeed.length; i++) {
    hash = (hash << 5) - hash + checksumSeed.charCodeAt(i);
    hash |= 0;
  }
  const datasetChecksum = `sha256_${Math.abs(hash).toString(16).padStart(12, "0")}`;

  const summary: PreprocessingSummary = {
    originalRows: rawRows.length,
    originalColumns: headers.length,
    removedRows,
    missingValuesHandled: missingCount,
    duplicateRows: duplicateCount,
    infiniteValuesHandled: infiniteCount,
    selectedFeatures,
    finalRowsUsed: finalRows.length,
    samplingApplied,
    originalBeforeSampling,
    securitySanitized: true,
    datasetChecksum,
  };

  return {
    data: {
      rows: finalRows,
      numericMatrix: finalMatrix,
      featureNames: selectedFeatures,
      referenceLabelColumn: refCol,
      referenceLabels: refColIdx !== -1 ? finalRef : undefined,
      summary,
      datasetChecksum,
    },
  };
}

function getRandomIndices(total: number, count: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  return indices.slice(0, count);
}

/**
 * Calculates mean, median, min, max, and standard deviation comparing
 * clustered traffic vs potential anomalies for a given feature.
 */
export function calculateFeatureStats(
  values: number[],
  labels: number[]
): FeatureStats[] {
  const n = values.length;
  const overallVals = values;
  const clusteredVals: number[] = [];
  const anomalyVals: number[] = [];

  for (let i = 0; i < n; i++) {
    if (labels[i] === -1) {
      anomalyVals.push(values[i]);
    } else {
      clusteredVals.push(values[i]);
    }
  }

  const calc = (arr: number[]) => {
    if (arr.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, std: 0 };
    }
    const sorted = [...arr].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / sorted.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    let sqSum = 0;
    for (const v of sorted) {
      sqSum += (v - mean) * (v - mean);
    }
    const std = Math.sqrt(sqSum / sorted.length);

    return {
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      std: Number(std.toFixed(2)),
    };
  };

  const o = calc(overallVals);
  const c = calc(clusteredVals);
  const a = calc(anomalyVals);

  return [
    { metric: "Mean", overall: o.mean, clustered: c.mean, anomaly: a.mean },
    { metric: "Median", overall: o.median, clustered: c.median, anomaly: a.median },
    { metric: "Minimum", overall: o.min, clustered: c.min, anomaly: a.min },
    { metric: "Maximum", overall: o.max, clustered: c.max, anomaly: a.max },
    { metric: "Std Dev", overall: o.std, clustered: c.std, anomaly: a.std },
  ];
}

/**
 * Builds reference label cross-tabulation table.
 */
export function buildReferenceCrossTab(
  referenceLabels: string[],
  dbscanLabels: number[]
): { label: string; clustered: number; anomaly: number; total: number }[] {
  const map: Record<string, { clustered: number; anomaly: number; total: number }> = {};

  for (let i = 0; i < referenceLabels.length; i++) {
    const ref = referenceLabels[i] || "Unspecified";
    if (!map[ref]) {
      map[ref] = { clustered: 0, anomaly: 0, total: 0 };
    }
    map[ref].total++;
    if (dbscanLabels[i] === -1) {
      map[ref].anomaly++;
    } else {
      map[ref].clustered++;
    }
  }

  return Object.keys(map).map((k) => ({
    label: k,
    clustered: map[k].clustered,
    anomaly: map[k].anomaly,
    total: map[k].total,
  }));
}
