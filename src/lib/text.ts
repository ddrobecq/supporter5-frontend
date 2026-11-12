export function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

// Letters NFD does not decompose; kept aligned with the back search rule.
const NON_DECOMPOSABLE: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ı: 'i',
  þ: 'th',
  ð: 'd',
};

export function foldForSearch(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ßæœøłđıþð]/g, (char) => NON_DECOMPOSABLE[char] ?? char);
}
