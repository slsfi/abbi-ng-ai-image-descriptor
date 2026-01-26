// -----------------------------------------------------------------------------
// Vite raw-import support
// -----------------------------------------------------------------------------

/**
 * Allow importing plain text files using Vite’s `?raw` query.
 *
 * We use this to load long AI prompts (written as readable multi-line text)
 * from `.txt` files instead of embedding them directly in TypeScript strings.
 *
 * Example:
 *   import prompt from './prompts/transcriptionBatchTei.txt?raw';
 *
 * Without this declaration, TypeScript does not know how to type-check
 * such imports and will raise a module resolution error.
 *
 * Note:
 * - The `.txt` extension is intentional. Angular’s Vite-based builder does
 *   not currently provide a loader for `.md` files, even with `?raw`.
 * - The `?raw` suffix tells Vite to import the file contents as a string
 *   at build time (no runtime fetch involved).
 */
declare module '*.txt?raw' {
  const content: string;
  export default content;
}
