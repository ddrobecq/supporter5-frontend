import axios from 'axios';
import { env } from '../config/env';
import { authStore } from '../features/auth/authStore';

const LOGIN_PATH = '/login';
const LOGIN_API_PATH = '/api/auth/login';

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const hadAuthorization = Boolean(error.config?.headers?.Authorization);
      const isLoginRequest = error.config?.url?.endsWith(LOGIN_API_PATH) ?? false;
      if (hadAuthorization && !isLoginRequest && authStore.getState().token) {
        authStore.getState().logout();
        if (window.location.pathname !== LOGIN_PATH) {
          window.location.assign(LOGIN_PATH);
        }
      }
    }
    return Promise.reject(error);
  },
);
