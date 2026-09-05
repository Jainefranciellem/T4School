import { Plan } from '@/types';
import { apiFetch } from './api';

export function listarPlanos(): Promise<Plan[]> {
  return apiFetch('/plans');
}

export function criarPlano(data: Omit<Plan, 'id'>): Promise<Plan> {
  return apiFetch('/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function atualizarPlano(id: string, data: Partial<Omit<Plan, 'id'>>): Promise<Plan> {
  return apiFetch(`/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function excluirPlano(id: string): Promise<void> {
  return apiFetch(`/plans/${id}`, { method: 'DELETE' });
}
