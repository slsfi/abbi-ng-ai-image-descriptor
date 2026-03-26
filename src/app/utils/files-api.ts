/**
 * Makes an existing promise abortable using an AbortSignal.
 *
 * Important:
 * - This guarantees the *caller* stops waiting when aborted.
 * - It may or may not cancel the underlying network request, depending on whether
 *   the provider SDK uses fetch with AbortSignal internally. We do not rely on that.
 * - If aborted, the returned promise rejects with AbortError, but the original
 *   promise `p` is not cancelled unless the underlying SDK supports AbortSignal.
 */
export function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return p;
  }
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });

    p.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}

/**
 * Attempts to resolve an in-flight Files API upload for the given image key.
 *
 * This is used during cancellation cleanup to handle the race where:
 * - the upload request completed, but the app was aborted before caching
 *   the provider file id onto the ImageData object.
 *
 * The wait is bounded by `timeoutMs` to keep cancellation responsive.
 */
export async function tryResolveInFlightUpload<T>(
  uploadByImageId: Map<string, Promise<T | null>>,
  key: string,
  timeoutMs: number
): Promise<T | null> {
  const p = uploadByImageId.get(key);

  if (!p) return null;

  try {
    return await Promise.race([
      p,
      new Promise<T | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Schedules removal of a tracked upload promise after a TTL.
 *
 * We keep finished upload promises around briefly to handle the cancellation race where:
 * - upload completes
 * - caller aborts before caching the provider file id onto ImageData
 * - cancellation cleanup needs to read the resolved upload metadata to delete it
 *
 * The "only delete if same promise" check ensures that a newer upload for the
 * same image key is not accidentally removed.
 */
export function scheduleUploadEntryCleanup<T>(
  uploadByImageId: Map<string, Promise<T | null>>,
  key: string,
  p: Promise<T | null>,
  ttlMs: number
): void {
  void p.finally(() => {
    setTimeout(() => {
      if (uploadByImageId.get(key) === p) {
        uploadByImageId.delete(key);
      }
    }, ttlMs);
  });
}
