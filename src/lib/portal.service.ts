import { Student, Lesson } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fetch dedicado do portal do aluno: sem JWT (não existe sessão de admin
// aqui), e sem o redirect-pro-login em caso de erro que o apiFetch do
// admin faz — um link inválido aqui deve só mostrar uma mensagem de erro.
async function portalFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      // Fastify rejeita Content-Type: application/json em request sem
      // corpo (FST_ERR_CTP_EMPTY_JSON_BODY) — confirm/cancel não têm body.
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Erro na API');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function getPortalStudent(token: string): Promise<Student> {
  return portalFetch(`/portal/${token}`);
}

export function getPortalLessons(token: string): Promise<Lesson[]> {
  return portalFetch(`/portal/${token}/lessons`);
}

export function confirmPortalLesson(token: string, lessonId: string): Promise<Lesson> {
  return portalFetch(`/portal/${token}/lessons/${lessonId}/confirm`, { method: 'PUT' });
}

export function cancelPortalLesson(token: string, lessonId: string): Promise<Lesson> {
  return portalFetch(`/portal/${token}/lessons/${lessonId}/cancel`, { method: 'PUT' });
}

export function registerPortalDeviceToken(token: string, deviceToken: string): Promise<void> {
  return portalFetch(`/portal/${token}/device-token`, {
    method: 'POST',
    body: JSON.stringify({ device_token: deviceToken, platform: 'web' }),
  });
}

export function getPortalAvailableSlots(
  token: string,
  tipo: string,
  data: string
): Promise<{ data: string; tipo: string; horarios: string[] }> {
  return portalFetch(
    `/portal/${token}/available-slots?${new URLSearchParams({ tipo, data }).toString()}`
  );
}

export function createPortalLesson(
  token: string,
  payload: { tipo: string; data: string; hora: string; local: string }
): Promise<Lesson> {
  return portalFetch(`/portal/${token}/lessons`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
