import { create } from 'zustand';

const TOKEN_KEY = 'supporter_admin_token';

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
