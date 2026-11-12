export function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

export function foldForSearch(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
