import { create } from 'zustand';
import { deleteSecureValue, getSecureValue, putSecureValue } from '../../lib/secureKeyStore';

const TOKEN_KEY = 'supporter_admin_token';
export const ADMIN_CREDENTIALS_KEY = 'supporter_admin_credentials';

export interface AdminCredentials {
  username: string;
  password: string;
}

/*
 * Admin credentials are kept for automatic re-login on a trusted device, encrypted with
 * AES-GCM 256. The key is non-extractable and lives in IndexedDB; localStorage only holds
 * {v, iv, data}. Security limit: this prevents reading the password in clear (DevTools,
 * copied browser profile, extensions reading localStorage), but NOT a script running on
 * the page, which can still ask the browser to decrypt with the stored key.
 */
const CREDENTIALS_CRYPTO_KEY_ID = 'admin_credentials';
const CREDENTIALS_PAYLOAD_VERSION = 1;
const IV_LENGTH_BYTES = 12;

interface EncryptedCredentialsPayload {
  v: typeof CREDENTIALS_PAYLOAD_VERSION;
  iv: string;
  data: string;
}

type StoredCredentialsEntry =
  | { kind: 'encrypted'; payload: EncryptedCredentialsPayload }
  | { kind: 'legacy'; credentials: AdminCredentials }
  | { kind: 'invalid' };

let credentialsKeyPromise: Promise<CryptoKey> | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function toValidCredentials(value: unknown): AdminCredentials | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<AdminCredentials>;
  if (typeof candidate.username !== 'string' || typeof candidate.password !== 'string') {
    return null;
  }
  if (!candidate.username.trim() || !candidate.password) {
    return null;
  }
  return { username: candidate.username, password: candidate.password };
}

function parseStoredEntry(raw: string): StoredCredentialsEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON at all: treat as an unreadable entry.
    return { kind: 'invalid' };
  }

  if (parsed && typeof parsed === 'object') {
    const payload = parsed as Partial<EncryptedCredentialsPayload>;
    if (payload.v === CREDENTIALS_PAYLOAD_VERSION && typeof payload.iv === 'string' && typeof payload.data === 'string') {
      return { kind: 'encrypted', payload: { v: payload.v, iv: payload.iv, data: payload.data } };
    }
  }

  const legacy = toValidCredentials(parsed);
  return legacy ? { kind: 'legacy', credentials: legacy } : { kind: 'invalid' };
}

async function loadCredentialsKey(): Promise<CryptoKey | null> {
  const stored = await getSecureValue<unknown>(CREDENTIALS_CRYPTO_KEY_ID);
  return stored instanceof CryptoKey ? stored : null;
}

async function loadOrCreateCredentialsKey(): Promise<CryptoKey> {
  const existing = await loadCredentialsKey();
  if (existing) {
    return existing;
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await putSecureValue(CREDENTIALS_CRYPTO_KEY_ID, key);
  return key;
}

/** Single-flight key resolution so concurrent writes never generate two different keys. */
function getOrCreateCredentialsKey(): Promise<CryptoKey> {
  if (!credentialsKeyPromise) {
    credentialsKeyPromise = loadOrCreateCredentialsKey().catch((error: unknown) => {
      credentialsKeyPromise = null;
      throw error;
    });
  }
  return credentialsKeyPromise;
}

async function decryptCredentials(payload: EncryptedCredentialsPayload): Promise<AdminCredentials | null> {
  const key = credentialsKeyPromise ? await credentialsKeyPromise : await loadCredentialsKey();
  if (!key) {
    return null;
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.data),
  );
  return toValidCredentials(JSON.parse(new TextDecoder().decode(plaintext)));
}

/** Synchronous presence check only: does not tell whether the entry can be decrypted. */
export function hasStoredAdminCredentials(): boolean {
  return Boolean(localStorage.getItem(ADMIN_CREDENTIALS_KEY));
}

export async function storeAdminCredentials(credentials: AdminCredentials): Promise<void> {
  const key = await getOrCreateCredentialsKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const encoded = new TextEncoder().encode(
    JSON.stringify({ username: credentials.username, password: credentials.password }),
  );
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const payload: EncryptedCredentialsPayload = {
    v: CREDENTIALS_PAYLOAD_VERSION,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
  };
  localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(payload));
}

export async function getStoredAdminCredentials(): Promise<AdminCredentials | null> {
  const raw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (!raw) {
    return null;
  }

  const entry = parseStoredEntry(raw);

  if (entry.kind === 'invalid') {
    localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
    return null;
  }

  if (entry.kind === 'legacy') {
    try {
      await storeAdminCredentials(entry.credentials);
    } catch {
      // Encryption unavailable (IndexedDB or WebCrypto): never keep the clear-text copy.
      // The credentials are still returned once so the current re-login can proceed.
      localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
    }
    return entry.credentials;
  }

  try {
    const credentials = await decryptCredentials(entry.payload);
    if (!credentials) {
      localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
    }
    return credentials;
  } catch {
    // Missing key, corrupted data or IndexedDB failure: the entry is unreadable, drop it.
    localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
    return null;
  }
}

export async function clearStoredAdminCredentials(): Promise<void> {
  localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
  credentialsKeyPromise = null;
  await deleteSecureValue(CREDENTIALS_CRYPTO_KEY_ID);
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

const initialToken = sessionStorage.getItem(TOKEN_KEY);

export const authStore = create<AuthState>((set) => ({
  token: initialToken,
  isAuthenticated: Boolean(initialToken),
  setToken: (token) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },
  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    set({ token: null, isAuthenticated: false });
  },
}));
