export interface AdjacentSelectionState {
  selectedIndex: number;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
}

export function buildAdjacentSelectionState(values: string[], selectedValue: string): AdjacentSelectionState {
  const selectedIndex = values.findIndex((value) => value === selectedValue);

  if (values.length === 0) {
    return {
      selectedIndex,
      canSelectPrevious: false,
      canSelectNext: false,
    };
  }

  if (selectedIndex < 0) {
    return {
      selectedIndex,
      canSelectPrevious: true,
      canSelectNext: true,
    };
  }

  return {
    selectedIndex,
    canSelectPrevious: selectedIndex > 0,
    canSelectNext: selectedIndex < values.length - 1,
  };
}

export function getAdjacentSelectionValue(
  values: string[],
  selectedValue: string,
  direction: -1 | 1,
): string | null {
  if (values.length === 0) {
    return null;
  }

  const selectedIndex = values.findIndex((value) => value === selectedValue);
  const fallbackIndex = direction > 0 ? 0 : values.length - 1;
  const targetIndex = selectedIndex >= 0 ? selectedIndex + direction : fallbackIndex;

  if (targetIndex < 0 || targetIndex >= values.length) {
    return null;
  }

  return values[targetIndex] ?? null;
}
