export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  natioPublicResource: import.meta.env.VITE_NATIO_PUBLIC_RESOURCE ?? '/api/natio',
  natioAdminResource: import.meta.env.VITE_NATIO_ADMIN_RESOURCE ?? '/api/admin/natio',
};
