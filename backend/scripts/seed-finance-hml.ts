// Gera lançamentos financeiros FICTÍCIOS (descrição prefixada com "[HML]") dos
// últimos 6 meses, ligados aos alunos/planos que já existem no banco de
// destino, pra testar o relatório do Financeiro. Idempotente: apaga os
// "[HML]" anteriores antes de recriar. Só mexe em FinancialTransaction.
//
// Dica: rode antes scripts/copy-prod-to-hml.ts (ou crie alunos/planos em hml).
//
// Uso (a partir de backend/):
//   TARGET_DATABASE_URL='<hml, session pooler 5432>' \
//   CONFIRM_TARGET_USER='postgres.<ref-do-projeto-hml>' \
//   npx tsx scripts/seed-finance-hml.ts

import { PrismaClient, type Prisma } from '@prisma/client';
import { addMonths, currentMonthBR, todayBR } from '../src/lib/finance.js';

const url = process.env.TARGET_DATABASE_URL;
const confirm = process.env.CONFIRM_TARGET_USER;
if (!url) throw new Error('Defina TARGET_DATABASE_URL');
const user = decodeURIComponent(new URL(url).username);
if (confirm !== user) {
  console.error(`✖ Defina CONFIRM_TARGET_USER='${user}' para confirmar que este é o banco de hml.`);
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: url });

// PRNG determinístico: mesma massa de dados a cada execução.
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const day = (mes: string, d: number) => `${mes}-${String(d).padStart(2, '0')}`;

async function main() {
  const [students, plans] = await Promise.all([
    prisma.student.findMany({ select: { id: true, nome: true, plano: true } }),
    prisma.plan.findMany(),
  ]);
  if (students.length === 0 || plans.length === 0) {
    throw new Error('O destino precisa ter alunos e planos (rode copy-prod-to-hml.ts antes).');
  }

  const today = todayBR();
  const thisMonth = currentMonthBR();
  const rows: Prisma.FinancialTransactionCreateManyInput[] = [];

  for (let back = 5; back >= 0; back--) {
    const mes = addMonths(thisMonth, -back);
    const isCurrent = back === 0;
    // base crescendo ao longo dos meses pra gráficos terem tendência
    const buyers = students.filter(() => rnd() < 0.35 + (5 - back) * 0.05);

    for (const s of buyers) {
      const plan = plans.find((p) => p.nome === s.plano) ?? pick(plans);
      const d = 1 + Math.floor(rnd() * 27);
      const data = day(mes, d);
      const past = data < today;
      const r = rnd();
      // mês corrente tem mais pendências; meses antigos quase tudo pago
      const status = !past ? 'Pendente' : r < (isCurrent ? 0.6 : 0.9) ? 'Pago' : r < 0.97 ? 'Pendente' : 'Cancelado';
      rows.push({
        tipo: 'Receita',
        descricao: `[HML] ${plan.nome} — ${s.nome}`,
        valor: plan.preco,
        data,
        competencia: mes,
        categoria: 'Plano',
        status,
        data_pagamento: status === 'Pago' ? data : null,
        aluno_id: s.id,
        aluno_nome: s.nome,
        plano_id: plan.id,
        plano_nome: plan.nome,
      });
    }

    const expenses: [string, string, number][] = [
      ['Marketing', 'Anúncios Instagram', 300 + Math.round(rnd() * 400)],
      ['Operacional', 'Manutenção de pranchas', 150 + Math.round(rnd() * 250)],
      ['Pessoal', 'Auxiliar de aulas', 1200],
      ['Tecnologia', 'Hospedagem e domínio', 89.9],
      ['Impostos', 'DAS', 180 + Math.round(rnd() * 120)],
    ];
    for (const [categoria, descricao, valor] of expenses) {
      const data = day(mes, 5 + Math.floor(rnd() * 20));
      rows.push({
        tipo: 'Despesa',
        descricao: `[HML] ${descricao}`,
        valor,
        data,
        competencia: mes,
        categoria,
        status: data < today ? 'Pago' : 'Pendente',
        data_pagamento: data < today ? data : null,
      });
    }
  }

  await prisma.$transaction([
    prisma.financialTransaction.deleteMany({ where: { descricao: { startsWith: '[HML]' } } }),
    prisma.financialTransaction.createMany({ data: rows }),
  ]);
  console.log(`✔ ${rows.length} lançamentos [HML] criados (${rows.filter((r) => r.tipo === 'Receita').length} receitas, ${rows.filter((r) => r.tipo === 'Despesa').length} despesas).`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
