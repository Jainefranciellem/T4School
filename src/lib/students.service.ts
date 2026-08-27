import { Student } from '@/types';
import { apiFetch } from './api';

export function listarAlunos(): Promise<Student[]> {
  return apiFetch('/students');
}

export function criarAluno(data: Omit<Student, 'id'>): Promise<Student> {
  return apiFetch('/students', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function atualizarAluno(id: string, data: Partial<Student>): Promise<Student> {
  return apiFetch(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function excluirAluno(id: string): Promise<void> {
  return apiFetch(`/students/${id}`, { method: 'DELETE' });
}
