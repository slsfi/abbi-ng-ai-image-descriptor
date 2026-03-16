export type BatchResultStatus = 'pending' | 'generating' | 'success' | 'error' | 'cancelled';

export interface BatchResult {
  id: string;                 // unique id for this batch run
  createdAt: string;          // ISO
  updatedAt?: string;         // ISO
  taskType: 'transcriptionBatchTei';

  // Which images were included (ordered)
  imageIds: number[];
  imageNames?: string[];      // optional, for nicer display
  fileApiImageIds?: string[];

  // The output (TEI <body>…</body>)
  teiBody?: string;
  pass1TeiBody?: string;
  pass2TeiBody?: string;

  // Execution meta
  status: BatchResultStatus;
  error?: string;

  // Pricing
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;

  // UI details
  modelId?: string;
  batchIndex?: number;        // e.g. 1 of N
  batchSize?: number;         // actual size for this batch
}
