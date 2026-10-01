import type { FinancialStatus, FinancialType } from '@prisma/client';

// O negócio opera em horário de Brasília (sem horário de verão desde 2019);
// created_at/inativado_em são timestamps UTC, então o limite de mês precisa
// do offset fixo -03:00 pra um aluno criado às 22h do dia 30 não "vazar"
// pro mês seguinte.
const BUSINESS_TZ = 'America/Sao_Paulo';
const BUSINESS_OFFSET = '-03:00';

export function todayBR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(now);
}

export function currentMonthBR(now: Date = new Date()): string {
  return todayBR(now).slice(0, 7);
}

export function addMonths(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  return `${String(year).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function monthRange(endMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(endMonth, i - (count - 1)));
}

// [início, fim) do mês em UTC, respeitando o fuso do negócio.
export function monthBounds(mes: string): { start: Date; end: Date } {
  return {
    start: new Date(`${mes}-01T00:00:00${BUSINESS_OFFSET}`),
    end: new Date(`${addMonths(mes, 1)}-01T00:00:00${BUSINESS_OFFSET}`),
  };
}

export function monthStartDate(mes: string): string {
  return `${mes}-01`;
}

export function monthEndDate(mes: string): string {
  const { end } = monthBounds(mes);
  return todayBR(new Date(end.getTime() - 24 * 60 * 60 * 1000));
}

export const toCents = (value: unknown): number => Math.round(Number(value) * 100);
export const fromCents = (cents: number): number => cents / 100;

// null quando não há base de comparação (anterior = 0) — a UI mostra "—" em
// vez de um percentual inválido/infinito.
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export type EffectiveStatus = FinancialStatus | 'Atrasado';

export function effectiveStatus(
  tx: { status: FinancialStatus; data: string },
  today: string
): EffectiveStatus {
  return tx.status === 'Pendente' && tx.data < today ? 'Atrasado' : tx.status;
}

export interface TxLike {
  tipo: FinancialType;
  status: FinancialStatus;
  data: string;
  valor: unknown;
  categoria: string;
  aluno_id: string | null;
  plano_id: string | null;
  plano_nome: string | null;
  aluno_nome: string | null;
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

// Soma em centavos (inteiros) pra não acumular erro de ponto flutuante.
export function totalsFor(txs: TxLike[], today: string): MonthTotals {
  let recPaid = 0;
  let recPending = 0;
  let recLate = 0;
  let expPaid = 0;
  let expPending = 0;
  let paidCount = 0;

  for (const tx of txs) {
    if (tx.status === 'Cancelado') continue;
    const cents = toCents(tx.valor);
    const late = effectiveStatus(tx, today) === 'Atrasado';
    if (tx.tipo === 'Receita') {
      if (tx.status === 'Pago') {
        recPaid += cents;
        paidCount++;
      } else {
        recPending += cents;
        if (late) recLate += cents;
      }
    } else if (tx.status === 'Pago') {
      expPaid += cents;
    } else {
      expPending += cents;
    }
  }

  const resultado = recPaid - expPaid;
  return {
    receita_prevista: fromCents(recPaid + recPending),
    receita_recebida: fromCents(recPaid),
    receita_pendente: fromCents(recPending),
    receita_atrasada: fromCents(recLate),
    despesas_total: fromCents(expPaid + expPending),
    despesas_pagas: fromCents(expPaid),
    despesas_pendentes: fromCents(expPending),
    // Resultado de caixa: recebido - despesas pagas (spec: Receita recebida - Despesas).
    // As despesas pendentes aparecem à parte em despesas_pendentes.
    resultado: fromCents(resultado),
    margem: recPaid > 0 ? Math.round((resultado / recPaid) * 1000) / 10 : null,
    qtd_receitas_pagas: paidCount,
    ticket_medio: paidCount > 0 ? fromCents(Math.round(recPaid / paidCount)) : null,
  };
}

export interface StudentLike {
  id: string;
  plano: string;
  status: 'Ativo' | 'Inativo';
  created_at: Date;
  updated_at: Date;
  inativado_em: Date | null;
}

function inactivatedAt(s: StudentLike): Date | null {
  // Fallback defensivo: Inativo sem data (não deveria existir após o backfill).
  return s.inativado_em ?? (s.status === 'Inativo' ? s.updated_at : null);
}

export interface PlanCounts {
  novos: number;
  cancelados: number;
  ativos: number;
  saldo_liquido: number;
}

export function planCountsFor(students: StudentLike[], mes: string): PlanCounts {
  const { start, end } = monthBounds(mes);
  let novos = 0;
  let cancelados = 0;
  let ativos = 0;

  for (const s of students) {
    const inactive = inactivatedAt(s);
    if (s.created_at >= start && s.created_at < end) novos++;
    if (inactive && inactive >= start && inactive < end) cancelados++;
    // Ativo no fim do mês: já existia e ainda não tinha sido inativado
    if (s.created_at < end && (!inactive || inactive >= end)) ativos++;
  }

  return { novos, cancelados, ativos, saldo_liquido: novos - cancelados };
}
