export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  natioPublicResource: import.meta.env.VITE_NATIO_PUBLIC_RESOURCE ?? '/api/natio',
  natioAdminResource: import.meta.env.VITE_NATIO_ADMIN_RESOURCE ?? '/api/admin/natio',
  villePublicResource: import.meta.env.VITE_VILLE_PUBLIC_RESOURCE ?? '/api/ville',
  villeAdminResource: import.meta.env.VITE_VILLE_ADMIN_RESOURCE ?? '/api/admin/ville',
  arbitrePublicResource: import.meta.env.VITE_ARBITRE_PUBLIC_RESOURCE ?? '/api/arbitre',
  arbitreAdminResource: import.meta.env.VITE_ARBITRE_ADMIN_RESOURCE ?? '/api/admin/arbitre',
};
