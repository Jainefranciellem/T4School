import { apiFetch } from './api';
import type {
  FinanceCategories,
  FinanceFilters,
  FinanceHistoryRow,
  FinanceSummary,
  FinancialTransaction,
  FinancialTransactionInput,
  FinancialStatus,
  EffectiveStatus,
  FinancialType,
} from '@/types/finance';

function qs(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const FinanceService = {
  resumo: (mes: string, filters: FinanceFilters = {}): Promise<FinanceSummary> =>
    apiFetch(`/finance/summary${qs({ mes, ...filters })}`),

  historico: (mes: string, meses: number, filters: FinanceFilters = {}): Promise<FinanceHistoryRow[]> =>
    apiFetch(`/finance/history${qs({ mes, meses, ...filters })}`),

  listarLancamentos: (
    params: FinanceFilters & { mes: string; tipo?: FinancialType; status?: FinancialStatus | EffectiveStatus }
  ): Promise<FinancialTransaction[]> => apiFetch(`/finance/transactions${qs(params)}`),

  categorias: (): Promise<FinanceCategories> => apiFetch('/finance/categories'),

  criar: (data: FinancialTransactionInput): Promise<FinancialTransaction> =>
    apiFetch('/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),

  atualizar: (id: string, data: Partial<FinancialTransactionInput>): Promise<FinancialTransaction> =>
    apiFetch(`/finance/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  excluir: (id: string): Promise<void> => apiFetch(`/finance/transactions/${id}`, { method: 'DELETE' }),
};
