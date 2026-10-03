/**
 * Synthetic Benchmark Network Traffic Dataset
 * Prepared specifically for offline verification, benchmarking, and demonstration.
 * Contains 500 network flows:
 * - 320 Light Web / HTTP flows
 * - 140 Bulk Transfer / Streaming flows
 * - 40 Injected Outliers (PortScan, SYN_Flood, DataExfiltration)
 * Clearly identified as synthetic data.
 */

export const SAMPLE_DATASET_CSV: string = (() => {
  const headers = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Packet Length Mean",
    "Packet Length Std",
    "Reference Label",
  ];

  const rows: (string | number)[][] = [];

  // Deterministic PRNG for stable benchmark results
  let seed = 42;
  function rand(min: number, max: number): number {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    return min + rnd * (max - min);
  }
  function randInt(min: number, max: number): number {
    return Math.floor(rand(min, max));
  }

  // 320 Light Web flows (Dense Cluster A)
  for (let i = 0; i < 320; i++) {
    const dur = +(rand(300, 2100).toFixed(2));
    const fwd = randInt(4, 16);
    const bwd = randInt(6, 24);
    const bytes = +(rand(1400, 8200).toFixed(2));
    const pktsS = +(((fwd + bwd) / (dur / 1000)).toFixed(2));
    const pktMean = +(rand(540, 670).toFixed(2));
    const pktStd = +(rand(130, 180).toFixed(2));
    rows.push([dur, fwd, bwd, bytes, pktsS, pktMean, pktStd, "Normal"]);
  }

  // 140 Bulk Transfer flows (Dense Cluster B)
  for (let i = 0; i < 140; i++) {
    const dur = +(rand(16000, 45000).toFixed(2));
    const fwd = randInt(75, 135);
    const bwd = randInt(150, 310);
    const bytes = +(rand(28000, 92000).toFixed(2));
    const pktsS = +(((fwd + bwd) / (dur / 1000)).toFixed(2));
    const pktMean = +(rand(1180, 1400).toFixed(2));
    const pktStd = +(rand(195, 255).toFixed(2));
    rows.push([dur, fwd, bwd, bytes, pktsS, pktMean, pktStd, "Normal"]);
  }

  // 40 Anomalies / Outliers (Sparse points)
  const anomLabels = ["PortScan", "SYN_Flood", "DataExfiltration"];
  for (let i = 0; i < 40; i++) {
    const dur = +(rand(10, 140).toFixed(2));
    const fwd = i % 2 === 0 ? randInt(1, 3) : randInt(420, 910);
    const bwd = i % 3 === 0 ? 1 : 0;
    const bytes = +(rand(52000, 210000).toFixed(2));
    const pktsS = +(rand(2400, 9500).toFixed(2));
    const pktMean = +(rand(50, 1380).toFixed(2));
    const pktStd = +(rand(10, 340).toFixed(2));
    rows.push([dur, fwd, bwd, bytes, pktsS, pktMean, pktStd, anomLabels[i % 3]]);
  }

  // Deterministic shuffle
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rand(0, i + 1));
    const temp = rows[i];
    rows[i] = rows[j];
    rows[j] = temp;
  }

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
})();
