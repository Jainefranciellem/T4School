import { AppSettings } from '@/types';
import { apiFetch } from './api';

export function getSettings(): Promise<AppSettings> {
  return apiFetch('/settings');
}

export function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  return apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
