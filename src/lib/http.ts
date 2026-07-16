import axios from 'axios';
import { env } from '../config/env';
import { authStore } from '../features/auth/authStore';

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
