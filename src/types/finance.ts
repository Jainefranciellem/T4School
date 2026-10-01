export type FinancialType = 'Receita' | 'Despesa';
export type FinancialStatus = 'Pendente' | 'Pago' | 'Cancelado';
export type EffectiveStatus = FinancialStatus | 'Atrasado';

export interface FinancialTransaction {
  id: string;
  tipo: FinancialType;
  descricao: string;
  valor: number;
  data: string;
  competencia: string;
  categoria: string;
  status: FinancialStatus;
  status_efetivo: EffectiveStatus;
  data_pagamento?: string | null;
  aluno_id?: string | null;
  aluno_nome?: string | null;
  plano_id?: string | null;
  plano_nome?: string | null;
  observacoes?: string | null;
}

export type FinancialTransactionInput = {
  tipo: FinancialType;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  status: FinancialStatus;
  aluno_id?: string | null;
  plano_id?: string | null;
  observacoes?: string | null;
};

export interface FinanceFilters {
  categoria?: string;
  plano_id?: string;
  aluno_id?: string;
}

export interface MonthTotals {
  receita_prevista: number;
  receita_recebida: number;
  receita_pendente: number;
  receita_atrasada: number;
  despesas_total: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  resultado: number;
  margem: number | null;
  qtd_receitas_pagas: number;
  ticket_medio: number | null;
}

export interface PlanCounts {
  novos: number;
  cancelados: number;
  ativos: number;
  saldo_liquido: number;
}

export interface DistributionItem {
  nome: string;
  valor: number;
}

export interface FinanceSummary {
  mes: string;
  mes_anterior: string;
  atual: MonthTotals & { planos: PlanCounts; clientes: { inadimplentes: number } };
  anterior: MonthTotals & { planos: PlanCounts };
  variacao: Record<
    'receita_recebida' | 'receita_prevista' | 'despesas_total' | 'resultado' | 'novos' | 'cancelados' | 'ativos',
    number | null
  >;
  distribuicao: {
    receita_por_categoria: DistributionItem[];
    receita_por_plano: DistributionItem[];
    receita_por_cliente: DistributionItem[];
    despesa_por_categoria: DistributionItem[];
  };
}

export interface FinanceHistoryRow {
  mes: string;
  receita_prevista: number;
  receita_recebida: number;
  receita_pendente: number;
  despesas_total: number;
  resultado: number;
  novos: number;
  cancelados: number;
  ativos: number;
}

export type FinanceCategories = Record<FinancialType, string[]>;
