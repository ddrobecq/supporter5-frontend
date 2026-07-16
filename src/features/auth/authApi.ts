import { http } from '../../lib/http';

interface LoginResponse {
  token: string;
}

export async function login(username: string, password: string): Promise<string> {
  const { data } = await http.post<LoginResponse>('/api/auth/login', { username, password });
  return data.token;
}
