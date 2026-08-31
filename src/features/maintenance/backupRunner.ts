import axios from 'axios';
import { http } from '../../lib/http';
import { getStoredDirectoryHandle, setStoredDirectoryHandle } from './backupDirectoryStore';
import { getBackupSettings, saveBackupSettings, type BackupSettings } from './backupSettings';

const BACKUP_FILE_PATTERN = /^supporter-\d{8}-\d{6}\.sqlite$/;
const LOCK_KEY = 'supporter_backup_lock';
const LOCK_TTL_MS = 5 * 60 * 1000;

export const BACKUP_RESULT_EVENT = 'supporter:backup-result';

export interface BackupResultEventDetail {
  success: boolean;
  message: string;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window.showDirectoryPicker === 'function';
}

/** Ouvre le picker natif pour choisir/changer le dossier de sauvegarde; doit etre appele depuis un geste utilisateur. */
export async function pickBackupDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('La selection de dossier n est pas supportee par ce navigateur.');
  }

  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await setStoredDirectoryHandle(handle);
  saveBackupSettings({ directoryName: handle.name });
  return handle;
}

export async function ensureDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  const current = await handle.queryPermission(descriptor);
  if (current === 'granted') return true;
  if (current === 'denied') return false;

  const requested = await handle.requestPermission(descriptor);
  return requested === 'granted';
}

/** Compare l'echeance en jours calendaires locaux (pas en millisecondes glissantes). */
function daysBetweenCalendarDates(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function isBackupDueToday(settings: BackupSettings, now: Date = new Date()): boolean {
  if (!settings.lastBackupAt) return true;

  const last = new Date(settings.lastBackupAt);
  if (Number.isNaN(last.getTime())) return true;

  const requiredDays = settings.frequency === 'weekly' ? 7 : 1;
  return daysBetweenCalendarDates(last, now) >= requiredDays;
}

function acquireBackupLock(): boolean {
  const raw = localStorage.getItem(LOCK_KEY);
  const now = Date.now();
  if (raw) {
    const lockedAt = Number(raw);
    if (Number.isFinite(lockedAt) && now - lockedAt < LOCK_TTL_MS) {
      return false;
    }
  }
  localStorage.setItem(LOCK_KEY, String(now));
  return true;
}

function releaseBackupLock(): void {
  localStorage.removeItem(LOCK_KEY);
}

function emitBackupResult(success: boolean, message: string): void {
  window.dispatchEvent(new CustomEvent<BackupResultEventDetail>(BACKUP_RESULT_EVENT, { detail: { success, message } }));
}

function describeBackupError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    if (apiMessage) return apiMessage;
    if (error.response?.status === 401) return 'Session expiree. Reconnectez-vous.';
    return 'Le telechargement de la base a echoue.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Une erreur est survenue.';
}

function buildBackupFileName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const datePart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `supporter-${datePart}-${timePart}.sqlite`;
}

async function pruneOldBackups(dirHandle: FileSystemDirectoryHandle, keepCount: number): Promise<void> {
  const names: string[] = [];
  for await (const name of dirHandle.keys()) {
    if (BACKUP_FILE_PATTERN.test(name)) {
      names.push(name);
    }
  }

  names.sort().reverse();
  const toRemove = names.slice(Math.max(keepCount, 0));
  await Promise.all(toRemove.map((name) => dirHandle.removeEntry(name).catch(() => undefined)));
}

async function downloadDatabaseSnapshot(): Promise<Blob> {
  const response = await http.get<Blob>('/api/admin/system/database/download', {
    responseType: 'blob',
    timeout: 120000,
  });
  return response.data;
}

/** Execute une sauvegarde reelle: telecharge, ecrit le fichier, purge l'historique, emet le resultat. */
export async function runBackupNow(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const blob = await downloadDatabaseSnapshot();
    const fileName = buildBackupFileName(new Date());

    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    await pruneOldBackups(handle, getBackupSettings().keepCount);
    saveBackupSettings({ lastBackupAt: new Date().toISOString() });

    emitBackupResult(true, `Sauvegarde effectuee (${fileName}).`);
  } catch (error) {
    emitBackupResult(false, describeBackupError(error));
  }
}

/** Point d'entree silencieux appele au montage de l'admin: ne fait rien tant que ce n'est pas du. */
export async function maybeRunAutomaticBackup(): Promise<void> {
  const settings = getBackupSettings();
  if (!settings.enabled || !isFileSystemAccessSupported()) {
    return;
  }

  const handle = await getStoredDirectoryHandle();
  if (!handle || !isBackupDueToday(settings)) {
    return;
  }

  if (!acquireBackupLock()) {
    return;
  }

  try {
    const permitted = await ensureDirectoryPermission(handle);
    if (!permitted) {
      return;
    }
    await runBackupNow(handle);
  } finally {
    releaseBackupLock();
  }
}

/** Sauvegarde forcee (bouton "Sauvegarder maintenant"): ignore l'echeance, toujours un resultat visible. */
export async function forceBackupNow(handle: FileSystemDirectoryHandle): Promise<void> {
  const permitted = await ensureDirectoryPermission(handle);
  if (!permitted) {
    emitBackupResult(false, "Autorisation d'acces au dossier refusee.");
    return;
  }
  await runBackupNow(handle);
}
