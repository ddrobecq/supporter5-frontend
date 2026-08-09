export interface TourWizardGroupCarrier {
  GROUPE?: unknown;
}

export function buildDefaultGroupNames(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Groupe ${index + 1}`);
}

export function getDistinctNonEmptyGroupNames(rows: TourWizardGroupCarrier[]): string[] {
  const names = rows
    .map((row) => String(row.GROUPE ?? '').trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(names));
}

export function buildEffectiveGroupNames(
  expectedCount: number,
  modelGroupNames: string[],
  existingGroupNames: string[],
): string[] {
  const expected = Math.max(1, Number(expectedCount) || 1);
  const existing = Array.from(new Set(
    existingGroupNames
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0),
  ));

  if (existing.length >= expected) {
    return existing;
  }

  const merged = [...existing];
  const model = modelGroupNames
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);
  const defaults = buildDefaultGroupNames(expected);

  for (const candidate of [...model, ...defaults]) {
    if (merged.length >= expected) {
      break;
    }
    if (!merged.includes(candidate)) {
      merged.push(candidate);
    }
  }

  return merged;
}
