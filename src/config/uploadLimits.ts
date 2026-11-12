const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

export const UPLOAD_LIMITS = {
  rasterImage: 2 * MB,
  svgImage: 500 * KB,
  csvImport: 5 * MB,
  sqliteDatabase: 1 * GB,
} as const;

export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export function normalizeMimeType(type: string): string {
  return type.split(';')[0].trim().toLowerCase();
}

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(normalizeMimeType(type));
}

export function isSvgType(type: string): boolean {
  return normalizeMimeType(type) === 'image/svg+xml';
}

export function getImageSizeLimit(type: string): number {
  return isSvgType(type) ? UPLOAD_LIMITS.svgImage : UPLOAD_LIMITS.rasterImage;
}

export function measureTextBytes(text: string): number {
  return new Blob([text]).size;
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`;
  if (bytes >= MB) return `${(bytes / MB).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
  if (bytes >= KB) return `${(bytes / KB).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`;
  return `${bytes} o`;
}

export function formatUploadLimitError(label: string, actualBytes: number, limitBytes: number): string {
  return `${label} est trop volumineux (${formatBytes(actualBytes)}). Taille maximale : ${formatBytes(limitBytes)}.`;
}

/** Returns an error message when the image exceeds its limit, otherwise null. */
export function checkImageSize(type: string, sizeBytes: number): string | null {
  const limit = getImageSizeLimit(type);
  if (sizeBytes <= limit) return null;
  return formatUploadLimitError(isSvgType(type) ? 'Le fichier SVG' : "L'image", sizeBytes, limit);
}
