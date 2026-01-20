export type BatchResultStatus = 'pending' | 'success' | 'error';

export interface BatchResult {
  id: string;                 // unique id for this batch run
  createdAt: string;          // ISO
  taskType: 'transcriptionBatchTei';

  // Which images were included (ordered)
  imageIds: string[];
  imageNames?: string[];      // optional, for nicer display

  // The output (TEI <body>…</body>)
  teiBody?: string;

  // Execution meta
  status: BatchResultStatus;
  error?: string;

  // Optional: pricing/usage (wire up later)
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;

  // For reproducibility / UI details (optional but useful)
  modelId?: string;
  batchIndex?: number;        // e.g. 1 of N
  batchSize?: number;         // actual size for this batch
}
