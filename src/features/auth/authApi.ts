import { http } from '../../lib/http';

interface LoginResponse {
  token: string;
}

export async function login(username: string, password: string): Promise<string> {
  // Longer timeout for login (Render free tier may take time to wake up)
  const { data } = await http.post<LoginResponse>('/api/auth/login', { username, password }, { timeout: 45000 });
  return data.token;
}
