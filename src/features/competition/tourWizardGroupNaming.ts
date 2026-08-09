export type GroupNameBase = 'Division' | 'Groupe' | 'Ligue' | 'Poule';
export type GroupNumbering = 'custom' | 'alpha' | 'numeric';

const GROUP_NAME_BASES: GroupNameBase[] = ['Division', 'Groupe', 'Ligue', 'Poule'];

function toAlphaLabel(index: number): string {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function makeAutoLabel(base: GroupNameBase, numbering: Exclude<GroupNumbering, 'custom'>, index: number): string {
  if (numbering === 'alpha') {
    return `${base} ${toAlphaLabel(index)}`;
  }
  return `${base} ${index + 1}`;
}

function resolveKnownBase(value: string): GroupNameBase | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  const found = GROUP_NAME_BASES.find((item) => item.toLowerCase() === normalized);
  return found ?? null;
}

export function detectGroupNaming(existingNames: string[]): { base: GroupNameBase; numbering: GroupNumbering } {
  const names = existingNames
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);
  if (names.length === 0) {
    return { base: 'Groupe', numbering: 'numeric' };
  }

  const alphaMatches = names.map((value) => /^(.+?)\s+([A-Za-z]+)$/.exec(value));
  if (alphaMatches.every(Boolean)) {
    const base = resolveKnownBase(String(alphaMatches[0]?.[1] ?? ''));
    const sameBase = base && alphaMatches.every((match) => resolveKnownBase(String(match?.[1] ?? '')) === base);
    if (sameBase) {
      return { base, numbering: 'alpha' };
    }
  }

  const numericMatches = names.map((value) => /^(.+?)\s+(\d+)$/.exec(value));
  if (numericMatches.every(Boolean)) {
    const base = resolveKnownBase(String(numericMatches[0]?.[1] ?? ''));
    const sameBase = base && numericMatches.every((match) => resolveKnownBase(String(match?.[1] ?? '')) === base);
    if (sameBase) {
      return { base, numbering: 'numeric' };
    }
  }

  return { base: 'Groupe', numbering: 'custom' };
}
