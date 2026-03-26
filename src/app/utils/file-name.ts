import { ImageData } from '../types/image-data.types';

export function fileExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/tiff':
      return 'tiff';
    case 'image/bmp':
      return 'bmp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'bin';
  }
}

/**
 * Resolves the uploaded file name sent to a Files API.
 *
 * Prefers the original image filename when available, otherwise falls back to
 * a deterministic name based on image id and mime type.
 */
export function fileNameFromImage(image: ImageData, mimeType: string): string {
  const filename = image.filename?.trim();
  if (filename) {
    return filename;
  }

  return `image-${image.id}.${fileExtensionFromMimeType(mimeType)}`;
}
