import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from './auth-storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  setAccessToken(data.accessToken);
  return data.accessToken as string;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const isAuthEndpoint = endpoint.startsWith('/auth/');
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !isAuthEndpoint ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && !isAuthEndpoint) {
    if (!isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch<T>(endpoint, options, true);
      }
    }
    clearTokens();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Erro na API');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
