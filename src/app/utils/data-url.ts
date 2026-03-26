export type DataUrlBlob = { mimeType: string; blob: Blob };
export type ParsedDataUrl = { mimeType: string; dataBase64: string };

/**
 * Converts a base64 data URL (data:<mime>;base64,<...>) into a Blob.
 *
 * Used for provider Files API uploads which expect binary file data.
 * Returns null if the input is not a valid base64 data URL.
 */
export function dataUrlToBlob(dataUrl: string): DataUrlBlob | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;

  const mimeType = match[1];
  const b64 = match[2];
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return { mimeType, blob: new Blob([bytes], { type: mimeType }) };
}

/**
 * Parses a base64 image data URL into (mimeType, base64Payload).
 *
 * This is used for inline-image requests where the provider SDK expects a
 * base64 payload without the "data:<mime>;base64," prefix.
 */
export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2] };
}
