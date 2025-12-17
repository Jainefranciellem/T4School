import { Lesson, mockLessons } from '@/data/mockData';

// Configuration for behavior
// Set this to 'false' when you have the n8n Webhook URLs and want to use the real backend.
const USE_MOCK_MODE = false;

// Replace these with your actual n8n Webhook URLs
const API_URLS = {
    LIST: 'https://n8n.nexosoftwere.cloud/webhook/7df086cf-2d41-46ce-b296-5fe8d41abbd5-lista-aulas',
    CREATE: 'https://n8n.nexosoftwere.cloud/webhook/79ed8092-b85c-4016-921e-5b2d523bbc38-cria-aula',
    UPDATE: 'https://n8n.nexosoftwere.cloud/webhook/PLEASE_REPLACE_WITH_REAL_UUID',
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
        // if (USE_MOCK_MODE) {
        //     console.log('[AulasService] Mock Mode: Listing lessons', localMockLessons);
        //     // Simulate network delay
        //     await new Promise(resolve => setTimeout(resolve, 500));
        //     return localMockLessons;
        // }

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
    criarAula: async (dadosAula: Omit<Aula, 'id'>): Promise<Aula> => {
        // if (USE_MOCK_MODE) {
        //     console.log('[AulasService] Mock Mode: Creating lesson', dadosAula);
        //     await new Promise(resolve => setTimeout(resolve, 800));

        //     const novaAula: Aula = {
        //         id: crypto.randomUUID(),
        //         ...dadosAula
        //     };

        //     localMockLessons = [...localMockLessons, novaAula];
        //     return novaAula;
        // }

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
        // if (USE_MOCK_MODE) {
        //     console.log('[AulasService] Mock Mode: Updating lesson', id, dadosAtualizados);
        //     await new Promise(resolve => setTimeout(resolve, 600));

        //     const index = localMockLessons.findIndex(a => a.id === id);
        //     if (index === -1) throw new Error('Aula não encontrada (Mock)');

        //     const aulaAtualizada = { ...localMockLessons[index], ...dadosAtualizados };

        //     localMockLessons = localMockLessons.map(a => a.id === id ? aulaAtualizada : a);
        //     return aulaAtualizada;
        // }

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
        // if (USE_MOCK_MODE) {
        //     console.log('[AulasService] Mock Mode: Deleting lesson', id);
        //     await new Promise(resolve => setTimeout(resolve, 500));

        //     localMockLessons = localMockLessons.filter(a => a.id !== id);
        //     return;
        // }

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
