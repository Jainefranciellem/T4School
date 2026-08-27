import { Aula } from '@/types';
import { apiFetch } from './api';

export const AulasService = {
    listarAulas: (): Promise<Aula[]> => apiFetch('/lessons'),

    criarAula: (dadosAula: Aula): Promise<Aula> => {
        // id and aulas_restantes are server-assigned/server-derived; never sent on create.
        const { id, aulas_restantes, ...payload } = dadosAula;
        return apiFetch('/lessons', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    atualizarAula: (id: string, dadosAtualizados: Partial<Aula>): Promise<Aula> => {
        const { id: _id, aulas_restantes, ...payload } = dadosAtualizados;
        return apiFetch(`/lessons/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    deletarAula: (id: string): Promise<void> =>
        apiFetch(`/lessons/${id}`, { method: 'DELETE' }),
};
