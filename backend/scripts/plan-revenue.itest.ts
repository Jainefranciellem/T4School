// Teste de integração: estimativa retroativa por planos + receita automática
// ao adquirir plano. Requer Postgres VAZIO/descartável em DATABASE_URL.
// Rodar: npx tsx scripts/plan-revenue.itest.ts
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { currentMonthBR, todayBR } from '../src/lib/finance.js';

const app = await buildApp();
const p = app.prisma;
const admin = await p.user.create({ data: { email: 'a@a.com', password_hash: 'x', nome: 'A', role: 'ADMIN' } });
const H = { authorization: `Bearer ${signAccessToken({ sub: admin.id, email: admin.email, role: 'ADMIN' })}` };
const call = async (method: any, url: string, payload?: any) => {
  const r = await app.inject({ method, url, headers: H, payload });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
};

const p4 = await p.plan.create({ data: { nome: 'Pacote 4', qtd_aulas: 4, validade_dias: 60, preco: 480 } });
const p10 = await p.plan.create({ data: { nome: 'Pacote 10', qtd_aulas: 10, validade_dias: 90, preco: 950.5 } });
const free = await p.plan.create({ data: { nome: 'Cortesia', qtd_aulas: 1, validade_dias: 30, preco: 0 } });

const mk = (nome: string, plano: string, created: string, status: 'Ativo' | 'Inativo' = 'Ativo') =>
  p.student.create({ data: { nome, telefone: '1', email: `${nome}@x.com`, plano, created_at: new Date(created), status } });

// Agosto (BRT): fronteira 31/08 22:00 BRT = 01/09 01:00Z conta em AGOSTO
const a1 = await mk('Ago1', 'Pacote 4', '2026-08-10T12:00:00Z');
const a2 = await mk('Ago2_inativo', 'Pacote 10', '2026-08-31T12:00:00Z', 'Inativo'); // inativo também comprou
const a3 = await mk('Ago3_limite', 'Pacote 4', '2026-09-01T01:00:00Z');
// Setembro
const s1 = await mk('Set1', 'Pacote 4', '2026-09-15T12:00:00Z');
const s2 = await mk('Set2_com_real', 'Pacote 4', '2026-09-16T12:00:00Z');
const s3 = await mk('Set3_plano_sumiu', 'Plano Antigo', '2026-09-17T12:00:00Z');

// Set2 já tem receita real de plano -> sai da estimativa; Set1 tem uma CANCELADA -> continua estimado
await p.financialTransaction.create({ data: { tipo: 'Receita', descricao: 'real', valor: 480, data: '2026-09-16', competencia: '2026-09', categoria: 'Plano', status: 'Pago', aluno_id: s2.id } });
await p.financialTransaction.create({ data: { tipo: 'Receita', descricao: 'cancelada', valor: 480, data: '2026-09-15', competencia: '2026-09', categoria: 'Plano', status: 'Cancelado', aluno_id: s1.id } });
// Receita real de OUTRA categoria não exclui da estimativa
await p.financialTransaction.create({ data: { tipo: 'Receita', descricao: 'produto', valor: 50, data: '2026-08-12', competencia: '2026-08', categoria: 'Produto', status: 'Pago', aluno_id: a1.id } });

// Agosto = Ago1 480 + Ago2 950,50 + Ago3 (fronteira BRT) 480 = 1910,50
// Setembro = Set1 480 (a cancelada não exclui); Set2 tem receita real (fora); Set3 sem plano (sem_preco)
let r = await call('GET', '/finance/history?mes=2026-09&meses=2');
assert.equal(r.status, 200);
assert.deepEqual(r.body.map((x: any) => [x.mes, x.receita_estimada_planos]), [['2026-08', 1910.5], ['2026-09', 480]]);

r = await call('GET', '/finance/summary?mes=2026-09');
assert.deepEqual(r.body.atual.estimativa_planos, { valor: 480, qtd: 1, sem_preco: 1 });
assert.deepEqual(r.body.anterior.estimativa_planos, { valor: 1910.5, qtd: 3, sem_preco: 0 });
// a estimativa NÃO entra em recebida/resultado
assert.equal(r.body.atual.receita_recebida, 480); // só o lançamento real de Set2
assert.equal(r.body.atual.resultado, 480);

// filtros
r = await call('GET', `/finance/summary?mes=2026-08&plano_id=${p10.id}`);
assert.deepEqual(r.body.atual.estimativa_planos, { valor: 950.5, qtd: 1, sem_preco: 0 });
r = await call('GET', '/finance/summary?mes=2026-08&categoria=Marketing');
assert.equal(r.body.atual.estimativa_planos.valor, 0); // estimativa só representa categoria Plano
r = await call('GET', `/finance/summary?mes=2026-08&aluno_id=${a1.id}`);
assert.equal(r.body.atual.estimativa_planos.valor, 480);
r = await call('GET', '/finance/summary?mes=2020-01');
assert.deepEqual(r.body.atual.estimativa_planos, { valor: 0, qtd: 0, sem_preco: 0 });

// ---- lançamento automático ao adquirir plano ----
const today = todayBR();
const countTx = () => p.financialTransaction.count({ where: { observacoes: { contains: 'automaticamente' } } });

r = await call('POST', '/students', { nome: 'Novo', telefone: '1', email: 'novo@x.com', plano: 'Pacote 10', aulas_restantes: 10 });
assert.equal(r.status, 201);
const novo = r.body;
let txs = await p.financialTransaction.findMany({ where: { aluno_id: novo.id } });
assert.equal(txs.length, 1);
assert.equal(txs[0].tipo, 'Receita'); assert.equal(txs[0].status, 'Pendente'); assert.equal(txs[0].categoria, 'Plano');
assert.equal(Number(txs[0].valor), 950.5); assert.equal(txs[0].data, today); assert.equal(txs[0].competencia, currentMonthBR());
assert.equal(txs[0].plano_id, p10.id); assert.equal(txs[0].aluno_nome, 'Novo'); assert.equal(txs[0].data_pagamento, null);

// não conta em "recebida" (pendente) e some da estimativa do mês corrente
r = await call('GET', '/finance/summary');
assert.equal(r.body.atual.receita_recebida, 0);
assert.equal(r.body.atual.receita_pendente, 950.5);
assert.equal(r.body.atual.estimativa_planos.valor, 0);

// plano inexistente ou gratuito: aluno é criado, sem lançamento
r = await call('POST', '/students', { nome: 'SemPlano', telefone: '1', email: 'sp@x.com', plano: 'Não existe' });
assert.equal(r.status, 201);
r = await call('POST', '/students', { nome: 'Gratis', telefone: '1', email: 'g@x.com', plano: 'Cortesia' });
assert.equal(r.status, 201);
assert.equal(await countTx(), 1);

// validação falha -> nada é criado
r = await call('POST', '/students', { nome: '', telefone: '1', email: 'x', plano: 'Pacote 4' });
assert.equal(r.status, 400);
assert.equal(await countTx(), 1);

// trocar de plano gera nova receita; editar outras coisas ou manter o plano, não
r = await call('PUT', `/students/${novo.id}`, { nome: 'Novo Renomeado', status: 'Inativo' });
assert.equal(r.status, 200); assert.equal(await countTx(), 1);
r = await call('PUT', `/students/${novo.id}`, { plano: 'Pacote 10' });
assert.equal(await countTx(), 1);
r = await call('PUT', `/students/${novo.id}`, { plano: 'Pacote 4' });
assert.equal(r.status, 200); assert.equal(await countTx(), 2);
txs = await p.financialTransaction.findMany({ where: { aluno_id: novo.id }, orderBy: { created_at: 'asc' } });
assert.equal(Number(txs[1].valor), 480); assert.equal(txs[1].aluno_nome, 'Novo Renomeado');
// trocar para plano inexistente/gratuito: sem lançamento, aluno atualizado
r = await call('PUT', `/students/${novo.id}`, { plano: 'Cortesia' });
assert.equal(r.status, 200); assert.equal(await countTx(), 2);
r = await call('PUT', '/students/11111111-1111-4111-8111-111111111111', { plano: 'Pacote 4' });
assert.equal(r.status, 404);

console.log('ALL OK');
await app.close();
