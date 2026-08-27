import { Plan } from '@/types';
import { apiFetch } from './api';

export function listarPlanos(): Promise<Plan[]> {
  return apiFetch('/plans');
}
