import type { FastifyInstance } from 'fastify';
import { Prisma, type FinancialTransaction } from '@prisma/client';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  FINANCE_CATEGORIES,
  createTransactionSchema,
  historyQuerySchema,
  listTransactionsQuerySchema,
  monthQuerySchema,
  updateTransactionSchema,
} from '../schemas/finance.schema.js';
import {
  addMonths,
  currentMonthBR,
  effectiveStatus,
  fromCents,
  monthRange,
  pctChange,
  planCountsFor,
  planEstimateFor,
  type PlanEstimate,
  toCents,
  todayBR,
  totalsFor,
  type MonthTotals,
  type PlanCounts,
} from '../lib/finance.js';

interface Filters {
  categoria?: string;
  plano_id?: string;
  aluno_id?: string;
}

function txWhere(filters: Filters): Prisma.FinancialTransactionWhereInput {
  return {
    categoria: filters.categoria || undefined,
    plano_id: filters.plano_id || undefined,
    aluno_id: filters.aluno_id || undefined,
  };
}

function serialize(tx: FinancialTransaction, today: string) {
  return {
    ...tx,
    valor: Number(tx.valor),
    status_efetivo: effectiveStatus(tx, today),
  };
}

export async function financeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireAdmin);

  // Resolve nomes (snapshot) e valida que aluno/plano existem.
  async function resolveRelations(alunoId?: string | null, planoId?: string | null) {
    const [student, plan] = await Promise.all([
      alunoId ? app.prisma.student.findUnique({ where: { id: alunoId }, select: { id: true, nome: true } }) : null,
      planoId ? app.prisma.plan.findUnique({ where: { id: planoId }, select: { id: true, nome: true } }) : null,
    ]);
    if (alunoId && !student) return { error: 'Aluno informado não existe' as const };
    if (planoId && !plan) return { error: 'Plano informado não existe' as const };
    return { aluno_nome: student?.nome ?? null, plano_nome: plan?.nome ?? null };
  }

  // Métricas por mês (uma query de lançamentos + uma de alunos pra todo o intervalo).
  async function loadMonths(months: string[], filters: Filters, today: string) {
    const [txs, students, plan, allPlans, realRevenue] = await Promise.all([
      app.prisma.financialTransaction.findMany({
        where: { ...txWhere(filters), competencia: { gte: months[0], lte: months[months.length - 1] } },
      }),
      app.prisma.student.findMany({
        where: { id: filters.aluno_id || undefined },
        select: { id: true, plano: true, status: true, created_at: true, updated_at: true, inativado_em: true },
      }),
      filters.plano_id ? app.prisma.plan.findUnique({ where: { id: filters.plano_id } }) : null,
      app.prisma.plan.findMany({ select: { nome: true, preco: true } }),
      // Alunos que já têm receita de plano lançada (qualquer mês) — saem da estimativa.
      app.prisma.financialTransaction.findMany({
        where: { tipo: 'Receita', categoria: 'Plano', status: { not: 'Cancelado' }, aluno_id: { not: null } },
        select: { aluno_id: true },
      }),
    ]);
    const priceByPlanName = new Map(allPlans.map((p) => [p.nome, Number(p.preco)]));
    const withRealRevenue = new Set(realRevenue.map((r) => r.aluno_id as string));
    // O filtro de categoria vale pra estimativa: ela só representa receita de "Plano".
    const estimateApplies = !filters.categoria || filters.categoria === 'Plano';
    const emptyEstimate: PlanEstimate = { valor: 0, qtd: 0, sem_preco: 0 };

    // Student.plano guarda o NOME do plano, não o id.
    const scopedStudents = plan ? students.filter((s) => s.plano === plan.nome) : students;

    const byMonth = new Map<string, FinancialTransaction[]>();
    for (const tx of txs) {
      const list = byMonth.get(tx.competencia) ?? [];
      list.push(tx);
      byMonth.set(tx.competencia, list);
    }

    return {
      txs,
      byMonth,
      rows: months.map((mes) => ({
        mes,
        totals: totalsFor(byMonth.get(mes) ?? [], today),
        plans: planCountsFor(scopedStudents, mes),
        estimate: estimateApplies
          ? planEstimateFor(scopedStudents, priceByPlanName, withRealRevenue, mes)
          : emptyEstimate,
      })),
    };
  }

  function variations(current: { totals: MonthTotals; plans: PlanCounts }, previous: { totals: MonthTotals; plans: PlanCounts }) {
    return {
      receita_recebida: pctChange(current.totals.receita_recebida, previous.totals.receita_recebida),
      receita_prevista: pctChange(current.totals.receita_prevista, previous.totals.receita_prevista),
      despesas_total: pctChange(current.totals.despesas_total, previous.totals.despesas_total),
      resultado: pctChange(current.totals.resultado, previous.totals.resultado),
      novos: pctChange(current.plans.novos, previous.plans.novos),
      cancelados: pctChange(current.plans.cancelados, previous.plans.cancelados),
      ativos: pctChange(current.plans.ativos, previous.plans.ativos),
    };
  }

  app.get('/finance/categories', async () => FINANCE_CATEGORIES);

  app.get('/finance/summary', async (request) => {
    const query = monthQuerySchema.parse(request.query);
    const today = todayBR();
    const mes = query.mes ?? currentMonthBR();
    const anterior = addMonths(mes, -1);

    const { rows, byMonth } = await loadMonths([anterior, mes], query, today);
    const [prev, curr] = rows;
    const monthTxs = byMonth.get(mes) ?? [];

    // Distribuições do mês (lançamentos não cancelados).
    const live = monthTxs.filter((tx) => tx.status !== 'Cancelado');
    const sumBy = (tipo: 'Receita' | 'Despesa', keyOf: (tx: FinancialTransaction) => string) => {
      const acc = new Map<string, number>();
      for (const tx of live) {
        if (tx.tipo !== tipo) continue;
        const key = keyOf(tx);
        acc.set(key, (acc.get(key) ?? 0) + toCents(tx.valor));
      }
      return [...acc.entries()]
        .map(([nome, cents]) => ({ nome, valor: fromCents(cents) }))
        .sort((a, b) => b.valor - a.valor);
    };

    const inadimplentes = new Set(
      live
        .filter((tx) => tx.tipo === 'Receita' && tx.aluno_id && effectiveStatus(tx, today) === 'Atrasado')
        .map((tx) => tx.aluno_id as string)
    );

    return {
      mes,
      mes_anterior: anterior,
      atual: {
        ...curr.totals,
        planos: curr.plans,
        estimativa_planos: curr.estimate,
        clientes: { inadimplentes: inadimplentes.size },
      },
      anterior: { ...prev.totals, planos: prev.plans, estimativa_planos: prev.estimate },
      variacao: variations(curr, prev),
      distribuicao: {
        receita_por_categoria: sumBy('Receita', (tx) => tx.categoria),
        receita_por_plano: sumBy('Receita', (tx) => tx.plano_nome ?? 'Sem plano'),
        receita_por_cliente: sumBy('Receita', (tx) => tx.aluno_nome ?? 'Sem cliente').slice(0, 5),
        despesa_por_categoria: sumBy('Despesa', (tx) => tx.categoria),
      },
    };
  });

  app.get('/finance/history', async (request) => {
    const query = historyQuerySchema.parse(request.query);
    const today = todayBR();
    const ate = query.mes ?? currentMonthBR();
    const months = monthRange(ate, query.meses);

    const { rows } = await loadMonths(months, query, today);
    return rows.map(({ mes, totals, plans, estimate }) => ({
      mes,
      receita_prevista: totals.receita_prevista,
      receita_recebida: totals.receita_recebida,
      receita_pendente: totals.receita_pendente,
      despesas_total: totals.despesas_total,
      resultado: totals.resultado,
      receita_estimada_planos: estimate.valor,
      novos: plans.novos,
      cancelados: plans.cancelados,
      ativos: plans.ativos,
    }));
  });

  app.get('/finance/transactions', async (request) => {
    const query = listTransactionsQuerySchema.parse(request.query);
    const today = todayBR();

    const where: Prisma.FinancialTransactionWhereInput = {
      ...txWhere(query),
      tipo: query.tipo,
    };

    if (query.data_inicio || query.data_fim) {
      where.data = { gte: query.data_inicio, lte: query.data_fim };
    } else {
      where.competencia = query.mes ?? currentMonthBR();
    }

    if (query.status === 'Atrasado') {
      where.status = 'Pendente';
      where.data = { ...(where.data as object | undefined), lt: today };
    } else if (query.status) {
      where.status = query.status;
    }

    const txs = await app.prisma.financialTransaction.findMany({
      where,
      orderBy: [{ data: 'desc' }, { created_at: 'desc' }],
    });
    return txs.map((tx) => serialize(tx, today));
  });

  app.post('/finance/transactions', async (request, reply) => {
    const input = createTransactionSchema.parse(request.body);

    const relations = await resolveRelations(input.aluno_id, input.plano_id);
    if ('error' in relations) return reply.code(422).send({ message: relations.error });

    const tx = await app.prisma.financialTransaction.create({
      data: {
        tipo: input.tipo,
        descricao: input.descricao,
        valor: new Prisma.Decimal(toCents(input.valor)).div(100),
        data: input.data,
        competencia: input.competencia ?? input.data.slice(0, 7),
        categoria: input.categoria,
        status: input.status,
        data_pagamento: input.status === 'Pago' ? (input.data_pagamento ?? todayBR()) : null,
        aluno_id: input.aluno_id ?? null,
        aluno_nome: relations.aluno_nome,
        plano_id: input.plano_id ?? null,
        plano_nome: relations.plano_nome,
        observacoes: input.observacoes ?? null,
      },
    });
    return reply.code(201).send(serialize(tx, todayBR()));
  });

  app.put('/finance/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const patch = updateTransactionSchema.parse(request.body);

    const existing = await app.prisma.financialTransaction.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Lançamento não encontrado' });

    // Revalida o registro final (categoria x tipo etc.), não só o patch.
    const merged = createTransactionSchema.parse({
      tipo: existing.tipo,
      descricao: existing.descricao,
      valor: Number(existing.valor),
      data: existing.data,
      competencia: existing.competencia,
      categoria: existing.categoria,
      status: existing.status,
      data_pagamento: existing.data_pagamento,
      aluno_id: existing.aluno_id,
      plano_id: existing.plano_id,
      observacoes: existing.observacoes,
      ...patch,
      // Mudar a data sem informar competência move o mês de referência junto.
      ...(patch.data && !patch.competencia ? { competencia: patch.data.slice(0, 7) } : {}),
    });

    const relations = await resolveRelations(merged.aluno_id, merged.plano_id);
    if ('error' in relations) return reply.code(422).send({ message: relations.error });

    const tx = await app.prisma.financialTransaction.update({
      where: { id },
      data: {
        tipo: merged.tipo,
        descricao: merged.descricao,
        valor: new Prisma.Decimal(toCents(merged.valor)).div(100),
        data: merged.data,
        competencia: merged.competencia ?? merged.data.slice(0, 7),
        categoria: merged.categoria,
        status: merged.status,
        data_pagamento:
          merged.status === 'Pago' ? (merged.data_pagamento ?? existing.data_pagamento ?? todayBR()) : null,
        aluno_id: merged.aluno_id ?? null,
        aluno_nome: relations.aluno_nome,
        plano_id: merged.plano_id ?? null,
        plano_nome: relations.plano_nome,
        observacoes: merged.observacoes ?? null,
      },
    });
    return serialize(tx, todayBR());
  });

  app.delete('/finance/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await app.prisma.financialTransaction.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Lançamento não encontrado' });

    await app.prisma.financialTransaction.delete({ where: { id } });
    return reply.code(204).send();
  });
}
