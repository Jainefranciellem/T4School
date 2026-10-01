// Teste de integração dos alertas de pacote/inatividade. Requer Postgres
// VAZIO/descartável em DATABASE_URL. Rodar: npx tsx scripts/alerts.itest.ts
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { todayBR } from '../src/lib/finance.js';
import { computeStudentAlerts, runStudentAlertsJob, daysBetween } from '../src/lib/student-alerts.js';

const app = await buildApp();
const p = app.prisma;
const today = todayBR();
const shift = (days: number) => new Date(Date.parse(`${today}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

assert.equal(daysBetween('2026-01-01', '2026-01-16'), 15);
assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);

const admin = await p.user.create({ data: { email: 'a@a.com', password_hash: 'x', nome: 'A', role: 'ADMIN' } });
const H = { authorization: `Bearer ${signAccessToken({ sub: admin.id, email: admin.email, role: 'ADMIN' })}` };
const call = async (method: any, url: string, payload?: any, headers: any = H) => {
  const r = await app.inject({ method, url, headers, payload });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
};

const mk = (nome: string, aulas: number, createdDaysAgo = 1, extra: any = {}) =>
  p.student.create({ data: { nome, telefone: '1', email: `${nome}@x.com`, plano: 'P', aulas_restantes: aulas, created_at: new Date(Date.parse(`${shift(-createdDaysAgo)}T15:00:00Z`)), ...extra } });
const lesson = (alunoId: string, data: string, status: string) =>
  p.lesson.create({ data: { aluno_id: alunoId, data, hora: String(Math.floor(Math.random() * 10) + 10) + ':00', local: 'L', instrutor: `I${Math.random()}`, status: status as any } });

const A = await mk('A_novo_sem_aula', 4, 20);            // 20d desde cadastro, sem aula feita -> sem_aula
const B = await mk('B_poucas', 2);                       // restam 2 -> poucas
const C = await mk('C_ultima_agendada', 0);               // restam 1 (pendente) -> poucas; sem alerta de inatividade
await lesson(C.id, shift(2), 'Agendada');
const D = await mk('D_14dias', 3, 60);                    // última aula há 14d -> NÃO
await lesson(D.id, shift(-14), 'Compareceu');
const E = await mk('E_15dias', 3, 60);                    // última aula há 15d -> SIM
await lesson(E.id, shift(-15), 'Compareceu');
const F = await mk('F_agendada', 3, 60);                  // 20d sem aula mas tem aula marcada -> NÃO
await lesson(F.id, shift(-20), 'Compareceu'); await lesson(F.id, shift(3), 'Confirmada');
const G = await mk('G_faltou', 3, 60);                    // Faltou não conta como aula feita -> 20d desde a última Compareceu
await lesson(G.id, shift(-30), 'Compareceu'); await lesson(G.id, shift(-2), 'Faltou');
const Z = await mk('Z_inativo', 1, 60, { status: 'Inativo' });
const R = await mk('R_normal', 8, 1);

let alerts = await computeStudentAlerts(p);
const by = Object.fromEntries(alerts.map((a) => [a.nome, a]));
assert.ok(!by.Z_inativo);
assert.equal(by.A_novo_sem_aula.sem_aula, true); assert.equal(by.A_novo_sem_aula.poucas_aulas, false);
assert.equal(by.B_poucas.poucas_aulas, true); assert.equal(by.B_poucas.sem_aula, false);
assert.equal(by.C_ultima_agendada.restam, 1); assert.equal(by.C_ultima_agendada.poucas_aulas, true); assert.equal(by.C_ultima_agendada.sem_aula, false);
assert.equal(by.D_14dias.sem_aula, false);
assert.equal(by.E_15dias.sem_aula, true); assert.equal(by.E_15dias.dias_sem_aula, 15);
assert.equal(by.F_agendada.sem_aula, false);
assert.equal(by.G_faltou.sem_aula, true); assert.equal(by.G_faltou.dias_sem_aula, 30);
assert.equal(by.D_14dias.poucas_aulas, true); assert.equal(by.F_agendada.poucas_aulas, false); // restam 3 vs 3+1
assert.equal(by.R_normal.poucas_aulas, false); assert.equal(by.R_normal.sem_aula, false);

// endpoint
assert.equal((await call('GET', '/students/alerts', undefined, {})).status, 401);
const ep = await call('GET', '/students/alerts');
assert.equal(ep.status, 200);
assert.ok(!('alerta_poucas_aulas_enviado' in ep.body[0]));

// job: notifica 1x, deduplica, reseta e renotifica
let r = await runStudentAlertsJob(p, app.log);
assert.deepEqual(r, { poucas_aulas_notificados: 5, sem_aula_notificados: 3 }); // B,C,D,E,G | A,E,G
r = await runStudentAlertsJob(p, app.log);
assert.deepEqual(r, { poucas_aulas_notificados: 0, sem_aula_notificados: 0 });
await p.student.update({ where: { id: B.id }, data: { aulas_restantes: 4 } }); // renovou
r = await runStudentAlertsJob(p, app.log);
assert.equal((await p.student.findUnique({ where: { id: B.id } }))!.alerta_poucas_aulas_enviado, false);
await p.student.update({ where: { id: B.id }, data: { aulas_restantes: 1 } });  // voltou a ficar baixo
r = await runStudentAlertsJob(p, app.log);
assert.equal(r.poucas_aulas_notificados, 1);
const viaRoute = await call('POST', '/internal/jobs/reminders', undefined, { 'x-internal-secret': process.env.INTERNAL_JOB_SECRET! });
assert.equal(viaRoute.status, 200);
assert.ok('poucas_aulas_notificados' in viaRoute.body);

// pacote encerrado via PUT /lessons
const status = async (id: string) => (await p.student.findUnique({ where: { id } }))!;

const S1 = await mk('S1_fecha', 0, 60);                   // última aula concluída -> Inativo
const l1 = await lesson(S1.id, shift(-1), 'Implementada');
await p.student.update({ where: { id: S1.id }, data: { aulas_restantes: 0 } });
assert.equal((await call('PUT', `/lessons/${l1.id}`, { status: 'Compareceu' })).status, 200);
let s = await status(S1.id);
assert.equal(s.status, 'Inativo'); assert.ok(s.inativado_em);

const S2 = await mk('S2_ainda_tem_credito', 1, 60);       // sobra crédito -> continua
const l2 = await lesson(S2.id, shift(-1), 'Implementada');
await call('PUT', `/lessons/${l2.id}`, { status: 'Compareceu' });
assert.equal((await status(S2.id)).status, 'Ativo');

const S3 = await mk('S3_outra_pendente', 0, 60);          // ainda há aula marcada -> continua
const l3 = await lesson(S3.id, shift(-1), 'Implementada'); await lesson(S3.id, shift(5), 'Agendada');
await call('PUT', `/lessons/${l3.id}`, { status: 'Faltou' });
assert.equal((await status(S3.id)).status, 'Ativo');

const S4 = await mk('S4_ultima_marcada_depois', 0, 60);   // fecha com Faltou também
const l4 = await lesson(S4.id, shift(-1), 'Implementada');
await call('PUT', `/lessons/${l4.id}`, { status: 'Faltou' });
assert.equal((await status(S4.id)).status, 'Inativo');

// reativado manualmente depois da última aula (sem renovar) -> não reinativa ao editar outra aula
await call('PUT', `/students/${S1.id}`, { status: 'Ativo' });
assert.equal((await status(S1.id)).status, 'Ativo'); assert.equal((await status(S1.id)).inativado_em, null);
await call('PUT', `/lessons/${l1.id}`, { observacoes: 'editada' }); // sem mudar status
assert.equal((await status(S1.id)).status, 'Ativo');

// Cancelada/Agendada não fecham pacote
const S5 = await mk('S5_cancelada', 0, 60);
const l5 = await lesson(S5.id, shift(1), 'Agendada');
await call('PUT', `/lessons/${l5.id}`, { status: 'Cancelada' });
assert.equal((await status(S5.id)).status, 'Ativo');

console.log('ALL OK');
await app.close();
