// Last season chosen in the player/competition picker dialogs, shared between both and kept for the session only.
const LAST_SELECTED_SEASON_STORAGE_KEY = 'supporter:saison:last-selected';

export function readLastSelectedSeason(): string {
  try {
    return window.sessionStorage.getItem(LAST_SELECTED_SEASON_STORAGE_KEY) ?? '';
  } catch {
    // sessionStorage may be unavailable (privacy mode, disabled storage): behave as if nothing was stored.
    return '';
  }
}

export function writeLastSelectedSeason(season: string): boolean {
  try {
    window.sessionStorage.setItem(LAST_SELECTED_SEASON_STORAGE_KEY, season);
    return true;
  } catch {
    // Storage unavailable or full: the preference is optional, report failure to the caller.
    return false;
  }
}
