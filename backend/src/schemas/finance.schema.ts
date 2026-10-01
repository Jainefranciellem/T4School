import { z } from 'zod';

export const FINANCE_CATEGORIES = {
  Receita: ['Plano', 'Aula avulsa', 'Produto', 'Outros'],
  Despesa: ['Marketing', 'Operacional', 'Pessoal', 'Tecnologia', 'Infraestrutura', 'Impostos', 'Outros'],
} as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato yyyy-MM-dd')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
  }, 'Data inválida');

const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato yyyy-MM');

export const financialTypeSchema = z.enum(['Receita', 'Despesa']);
export const financialStatusSchema = z.enum(['Pendente', 'Pago', 'Cancelado']);

const baseTransactionSchema = z.object({
  tipo: financialTypeSchema,
  descricao: z.string().trim().min(1, 'Informe a descrição').max(200),
  // Número em reais; arredondado a centavos no handler. Limite evita overflow do Decimal(12,2).
  valor: z.number().positive('O valor deve ser maior que zero').max(9_999_999_999),
  data: dateString,
  competencia: monthString.optional(),
  categoria: z.string().trim().min(1),
  status: financialStatusSchema.default('Pendente'),
  data_pagamento: dateString.nullish(),
  aluno_id: z.string().uuid().nullish(),
  plano_id: z.string().uuid().nullish(),
  observacoes: z.string().trim().max(1000).nullish(),
});

function validateCategory(
  value: { tipo?: 'Receita' | 'Despesa'; categoria?: string },
  ctx: z.RefinementCtx
) {
  if (value.tipo && value.categoria && !(FINANCE_CATEGORIES[value.tipo] as readonly string[]).includes(value.categoria)) {
    ctx.addIssue({ code: 'custom', path: ['categoria'], message: `Categoria inválida para ${value.tipo}` });
  }
}

export const createTransactionSchema = baseTransactionSchema.superRefine((value, ctx) => {
  validateCategory(value, ctx);
  if (value.tipo === 'Despesa' && (value.aluno_id || value.plano_id)) {
    ctx.addIssue({ code: 'custom', path: ['aluno_id'], message: 'Despesa não pode ter aluno/plano' });
  }
});

// Update parcial: o handler mescla com o registro atual e revalida o resultado
// com createTransactionSchema (categoria x tipo, etc.).
export const updateTransactionSchema = baseTransactionSchema.partial();

const optionalId = z.string().uuid().optional();

export const monthQuerySchema = z.object({
  mes: monthString.optional(),
  categoria: z.string().optional(),
  plano_id: optionalId,
  aluno_id: optionalId,
});

export const listTransactionsQuerySchema = monthQuerySchema.extend({
  tipo: financialTypeSchema.optional(),
  // 'Atrasado' é derivado (Pendente com data vencida)
  status: z.enum(['Pendente', 'Pago', 'Cancelado', 'Atrasado']).optional(),
  data_inicio: dateString.optional(),
  data_fim: dateString.optional(),
});

export const historyQuerySchema = monthQuerySchema.extend({
  meses: z.coerce.number().int().min(1).max(36).default(12),
});
