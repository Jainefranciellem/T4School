// Teste de integração do módulo financeiro. Requer um Postgres VAZIO/descartável
// em DATABASE_URL (cria usuários/alunos). Rodar: npx tsx scripts/finance.itest.ts
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { pctChange, addMonths, monthRange, todayBR } from '../src/lib/finance.js';

const app = await buildApp();
const p = app.prisma;
const admin = await p.user.create({ data: { email: 'a@a.com', password_hash: 'x', nome: 'A', role: 'ADMIN' } });
const instr = await p.user.create({ data: { email: 'i@i.com', password_hash: 'x', nome: 'I', role: 'INSTRUTOR' } });
const A = { authorization: `Bearer ${signAccessToken({ sub: admin.id, email: admin.email, role: 'ADMIN' })}` };
const I = { authorization: `Bearer ${signAccessToken({ sub: instr.id, email: instr.email, role: 'INSTRUTOR' })}` };
const call = async (method: any, url: string, headers: any = A, payload?: any) => {
  const r = await app.inject({ method, url, headers, payload });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
};

// pure
assert.equal(pctChange(10, 0), null);
assert.equal(pctChange(0, 0), null);
assert.equal(pctChange(110, 100), 10);
assert.equal(pctChange(50, 100), -50);
assert.equal(pctChange(-50, -100), 50);
assert.equal(addMonths('2026-01', -1), '2025-12');
assert.equal(addMonths('2026-12', 1), '2027-01');
assert.deepEqual(monthRange('2026-02', 3), ['2025-12', '2026-01', '2026-02']);

// auth
assert.equal((await call('GET', '/finance/summary', {})).status, 401);
assert.equal((await call('GET', '/finance/summary', I)).status, 403);
assert.equal((await call('POST', '/finance/transactions', I, {})).status, 403);

// empty month
let r = await call('GET', '/finance/summary?mes=2026-03');
assert.equal(r.status, 200);
assert.equal(r.body.atual.receita_recebida, 0);
assert.equal(r.body.atual.margem, null);
assert.equal(r.body.atual.ticket_medio, null);
assert.equal(r.body.variacao.receita_recebida, null);
assert.equal(r.body.atual.planos.ativos, 0);
assert.equal((await call('GET', '/finance/summary?mes=2026-13')).status, 400);
assert.equal((await call('GET', '/finance/summary?mes=abc')).status, 400);

// fixtures: plan + students (timezone boundary: Sep 1 01:00Z = Aug 31 22:00 BRT)
const plan = await p.plan.create({ data: { nome: 'Pacote 4', qtd_aulas: 4, validade_dias: 60, preco: 480 } });
const mk = (nome: string, created: string, extra: any = {}) =>
  p.student.create({ data: { nome, telefone: '1', email: `${nome}@x.com`, plano: 'Pacote 4', created_at: new Date(created), ...extra } });
const s1 = await mk('Ana', '2026-08-10T12:00:00Z');
const s2 = await mk('Bia', '2026-09-01T01:00:00Z'); // agosto em BRT
const s3 = await mk('Caio', '2026-09-15T12:00:00Z');
const s4 = await mk('Davi', '2026-07-01T12:00:00Z', { status: 'Inativo', inativado_em: new Date('2026-09-20T12:00:00Z') });
await p.student.update({ where: { id: s1.id }, data: { updated_at: new Date() } });

r = await call('GET', '/finance/history?mes=2026-09&meses=3');
assert.deepEqual(r.body.map((x: any) => [x.mes, x.novos, x.cancelados, x.ativos]), [
  ['2026-07', 1, 0, 1],
  ['2026-08', 2, 0, 3],
  ['2026-09', 1, 1, 3],
]);
r = await call('GET', `/finance/history?mes=2026-09&meses=3&plano_id=${plan.id}`);
assert.equal(r.body[2].ativos, 3);
r = await call('GET', `/finance/history?mes=2026-09&meses=3&aluno_id=${s3.id}`);
assert.deepEqual(r.body.map((x: any) => x.ativos), [0, 0, 1]);

// validations
const base = { tipo: 'Receita', descricao: 'Pacote Ana', valor: 480, data: '2026-09-05', categoria: 'Plano' };
for (const bad of [
  { ...base, valor: 0 }, { ...base, valor: -5 }, { ...base, valor: '10' }, { ...base, descricao: '  ' },
  { ...base, categoria: 'Marketing' }, { ...base, data: '2026-02-30' }, { ...base, data: '05/09/2026' },
  { ...base, tipo: 'Despesa', categoria: 'Marketing', aluno_id: s1.id }, { ...base, aluno_id: 'nope' },
  { ...base, competencia: '2026-9' }, { ...base, status: 'Atrasado' },
]) assert.equal((await call('POST', '/finance/transactions', A, bad)).status, 400, JSON.stringify(bad));
assert.equal((await call('POST', '/finance/transactions', A, { ...base, aluno_id: '11111111-1111-4111-8111-111111111111' })).status, 422);

// create
r = await call('POST', '/finance/transactions', A, { ...base, aluno_id: s1.id, plano_id: plan.id, status: 'Pago' });
assert.equal(r.status, 201);
assert.equal(r.body.competencia, '2026-09');
assert.equal(r.body.aluno_nome, 'Ana');
assert.equal(r.body.plano_nome, 'Pacote 4');
assert.equal(r.body.data_pagamento, todayBR());
assert.equal(r.body.valor, 480);
const paidId = r.body.id;
const mkTx = (o: any) => call('POST', '/finance/transactions', A, { ...base, ...o });
await mkTx({ descricao: 'Pacote Bia', valor: 0.1, aluno_id: s2.id, status: 'Pago' });
await mkTx({ descricao: 'Pacote Caio', valor: 0.2, aluno_id: s3.id, status: 'Pago' });
const late = (await mkTx({ descricao: 'Atrasada Davi', valor: 100, aluno_id: s4.id, data: '2026-09-02', status: 'Pendente' })).body;
await mkTx({ descricao: 'Futura', valor: 50, data: '2099-09-28', competencia: '2026-09', status: 'Pendente' });
const cancelled = (await mkTx({ descricao: 'Cancelada', valor: 999, status: 'Cancelado' })).body;
await mkTx({ tipo: 'Despesa', categoria: 'Marketing', descricao: 'Ads', valor: 80.55, status: 'Pago' });
await mkTx({ tipo: 'Despesa', categoria: 'Impostos', descricao: 'DAS', valor: 20, status: 'Pendente' });
// agosto
await mkTx({ descricao: 'Ago', valor: 400, data: '2026-08-15', status: 'Pago', aluno_id: s1.id });

r = await call('GET', '/finance/summary?mes=2026-09');
const a = r.body.atual;
assert.equal(a.receita_recebida, 480.3);
assert.equal(a.receita_pendente, 150);
assert.equal(a.receita_atrasada, 100);
assert.equal(a.receita_prevista, 630.3);
assert.equal(a.despesas_total, 100.55);
assert.equal(a.despesas_pagas, 80.55);
assert.equal(a.resultado, 399.75);
assert.equal(a.margem, 83.2);
assert.equal(a.ticket_medio, 160.1);
assert.equal(a.clientes.inadimplentes, 1);
assert.equal(r.body.anterior.receita_recebida, 400);
assert.equal(r.body.variacao.receita_recebida, 20.1);
assert.equal(r.body.variacao.despesas_total, null);
assert.equal(r.body.distribuicao.receita_por_plano[0].nome, 'Pacote 4');
assert.ok(!JSON.stringify(r.body.distribuicao).includes('Cancelada'));
assert.equal(r.body.distribuicao.despesa_por_categoria.length, 2);

// filters
r = await call('GET', `/finance/summary?mes=2026-09&aluno_id=${s1.id}`);
assert.equal(r.body.atual.receita_recebida, 480);
r = await call('GET', `/finance/summary?mes=2026-09&categoria=Marketing`);
assert.equal(r.body.atual.despesas_total, 80.55);
assert.equal(r.body.atual.receita_recebida, 0);

// list + status filters
r = await call('GET', '/finance/transactions?mes=2026-09');
assert.equal(r.body.length, 8);
r = await call('GET', '/finance/transactions?mes=2026-09&status=Atrasado');
assert.deepEqual(r.body.map((x: any) => x.descricao), ['DAS', 'Atrasada Davi']);
r = await call('GET', '/finance/transactions?mes=2026-09&status=Pendente&tipo=Receita');
assert.equal(r.body.length, 2);
assert.equal(r.body.find((x: any) => x.descricao === 'Futura').status_efetivo, 'Pendente');
r = await call('GET', '/finance/transactions?data_inicio=2026-08-01&data_fim=2026-08-31');
assert.equal(r.body.length, 1);

// update
r = await call('PUT', `/finance/transactions/${late.id}`, A, { status: 'Pago' });
assert.equal(r.status, 200);
assert.equal(r.body.data_pagamento, todayBR());
assert.equal(r.body.status_efetivo, 'Pago');
r = await call('PUT', `/finance/transactions/${late.id}`, A, { status: 'Pendente' });
assert.equal(r.body.data_pagamento, null);
r = await call('PUT', `/finance/transactions/${late.id}`, A, { tipo: 'Despesa' });
assert.equal(r.status, 400); // categoria Plano inválida p/ Despesa + aluno
r = await call('PUT', `/finance/transactions/${late.id}`, A, { data: '2026-10-03' });
assert.equal(r.body.competencia, '2026-10');
r = await call('PUT', `/finance/transactions/${late.id}`, A, { valor: -1 });
assert.equal(r.status, 400);
r = await call('PUT', `/finance/transactions/${late.id}`, A, { aluno_id: null });
assert.equal(r.body.aluno_nome, null);
assert.equal((await call('PUT', '/finance/transactions/11111111-1111-4111-8111-111111111111', A, { valor: 1 })).status, 404);

// delete + FK SetNull keeps snapshot
assert.equal((await call('DELETE', `/finance/transactions/${cancelled.id}`)).status, 204);
assert.equal((await call('DELETE', `/finance/transactions/${cancelled.id}`)).status, 404);
await p.student.delete({ where: { id: s1.id } });
const kept = await p.financialTransaction.findUnique({ where: { id: paidId } });
assert.equal(kept?.aluno_id, null);
assert.equal(kept?.aluno_nome, 'Ana');
await p.plan.delete({ where: { id: plan.id } });
assert.equal((await p.financialTransaction.findUnique({ where: { id: paidId } }))?.plano_nome, 'Pacote 4');

// DB-level constraints
await assert.rejects(p.$executeRawUnsafe(`UPDATE "FinancialTransaction" SET valor = -1 WHERE id = '${paidId}'`));
await assert.rejects(p.$executeRawUnsafe(`UPDATE "FinancialTransaction" SET competencia = 'x' WHERE id = '${paidId}'`));

// students route: inativado_em
const st = (await call('GET', '/students')).body[0];
r = await call('PUT', `/students/${st.id}`, A, { status: 'Inativo' });
assert.ok(r.body.inativado_em);
r = await call('PUT', `/students/${st.id}`, A, { nome: 'Outro' });
assert.ok(r.body.inativado_em); // inalterado
r = await call('PUT', `/students/${st.id}`, A, { status: 'Ativo' });
assert.equal(r.body.inativado_em, null);

// categories
assert.equal((await call('GET', '/finance/categories')).body.Despesa.length, 7);

console.log('ALL OK');
await app.close();
