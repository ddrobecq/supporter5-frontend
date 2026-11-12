import type { RencontreHighlightEventRow } from './types';

export function sortHighlightEvents(events: RencontreHighlightEventRow[]): RencontreHighlightEventRow[] {
  return [...events].sort((a, b) => {
    const minuteA = Number(a.MINUTE ?? 0);
    const minuteB = Number(b.MINUTE ?? 0);
    if (minuteA !== minuteB) {
      return minuteA - minuteB;
    }
    return Number(a.EVCLEUNIK ?? 0) - Number(b.EVCLEUNIK ?? 0);
  });
}
