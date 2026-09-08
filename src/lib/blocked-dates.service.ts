import { BlockedDate } from '@/types';
import { apiFetch } from './api';

export function listBlockedDates(): Promise<BlockedDate[]> {
  return apiFetch('/blocked-dates');
}

export function createBlockedDate(data: { data: string; motivo?: string }): Promise<BlockedDate> {
  return apiFetch('/blocked-dates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteBlockedDate(id: string): Promise<void> {
  return apiFetch(`/blocked-dates/${id}`, { method: 'DELETE' });
}
