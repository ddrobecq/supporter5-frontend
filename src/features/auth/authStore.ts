import { create } from 'zustand';

const TOKEN_KEY = 'supporter_admin_token';
export const ADMIN_CREDENTIALS_KEY = 'supporter_admin_credentials';

export interface AdminCredentials {
  username: string;
  password: string;
}

export function getStoredAdminCredentials(): AdminCredentials | null {
  const raw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminCredentials>;
    if (typeof parsed.username !== 'string' || typeof parsed.password !== 'string') {
      return null;
    }
    if (!parsed.username.trim() || !parsed.password) {
      return null;
    }
    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
}

export function storeAdminCredentials(credentials: AdminCredentials): void {
  localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function clearStoredAdminCredentials(): void {
  localStorage.removeItem(ADMIN_CREDENTIALS_KEY);
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
