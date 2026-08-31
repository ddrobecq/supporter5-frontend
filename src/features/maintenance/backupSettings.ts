const SETTINGS_KEY = 'supporter_backup_settings';

export type BackupFrequency = 'daily' | 'weekly';

export interface BackupSettings {
  enabled: boolean;
  directoryName: string | null;
  frequency: BackupFrequency;
  keepCount: number;
  lastBackupAt: string | null;
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: false,
  directoryName: null,
  frequency: 'daily',
  keepCount: 14,
  lastBackupAt: null,
};

function isBackupFrequency(value: unknown): value is BackupFrequency {
  return value === 'daily' || value === 'weekly';
}

export function getBackupSettings(): BackupSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BackupSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      directoryName: typeof parsed.directoryName === 'string' ? parsed.directoryName : null,
      frequency: isBackupFrequency(parsed.frequency) ? parsed.frequency : DEFAULT_SETTINGS.frequency,
      keepCount: Number.isInteger(parsed.keepCount) && Number(parsed.keepCount) > 0 ? Number(parsed.keepCount) : DEFAULT_SETTINGS.keepCount,
      lastBackupAt: typeof parsed.lastBackupAt === 'string' ? parsed.lastBackupAt : null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveBackupSettings(patch: Partial<BackupSettings>): BackupSettings {
  const next = { ...getBackupSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
