import { Lesson, mockLessons } from '@/data/mockData';

// Configuration for behavior
// Set this to 'false' when you have the n8n Webhook URLs and want to use the real backend.
const USE_MOCK_MODE = false;

// Replace these with your actual n8n Webhook URLs
const API_URLS = {
    LIST: 'https://n8n.nexosoftwere.cloud/webhook/7df086cf-2d41-46ce-b296-5fe8d41abbd5-lista-aulas',
    CREATE: 'https://n8n.nexosoftwere.cloud/webhook/79ed8092-b85c-4016-921e-5b2d523bbc38-cria-aula',
    UPDATE: 'https://n8n.nexosoftwere.cloud/webhook/atualizar-aula',
    DELETE: 'https://n8n.nexosoftwere.cloud/webhook/PLEASE_REPLACE_WITH_REAL_UUID',
};

// In-memory store for mock mode (resets on page reload)
let localMockLessons = [...mockLessons];

export interface Aula extends Lesson { }

export const AulasService = {
    /**
     * Lista todas as aulas
     */
    listarAulas: async (): Promise<Aula[]> => {
        try {
            const res = await fetch(API_URLS.LIST);
            if (!res.ok) throw new Error('Erro ao listar aulas');
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[AulasService] Error listing lessons:', error);
            throw error;
        }
    },

    /**
     * Cria uma nova aula
     */
    criarAula: async (dadosAula: Aula): Promise<Aula> => {
        try {
            const res = await fetch(API_URLS.CREATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAula),
            });

            if (!res.ok) throw new Error('Erro ao criar aula');
            return await res.json();
        } catch (error) {
            console.error('[AulasService] Error creating lesson:', error);
            throw error;
        }
    },

    /**
     * Atualiza uma aula existente
     */
    atualizarAula: async (id: string, dadosAtualizados: Partial<Aula>): Promise<Aula> => {
        try {
            // Note: Adjust URL structure if your n8n expects ID in body vs URL param
            const res = await fetch(`${API_URLS.UPDATE}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...dadosAtualizados }),
            });

            if (!res.ok) throw new Error('Erro ao atualizar aula');
            return await res.json();
        } catch (error) {
            console.error('[AulasService] Error updating lesson:', error);
            throw error;
        }
    },

    /**
     * Deleta (cancela) uma aula
     */
    deletarAula: async (id: string): Promise<void> => {

        try {
            const res = await fetch(`${API_URLS.DELETE}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Erro ao deletar aula');
        } catch (error) {
            console.error('[AulasService] Error deleting lesson:', error);
            throw error;
        }
    }
};
