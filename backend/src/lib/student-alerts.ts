import { LessonStatus, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { todayBR } from './finance.js';
import { notifyProfessors } from './notify-professors.js';

// "Poucas aulas": restam (créditos sem agendar + aulas ainda por fazer) entre 1 e este valor.
export const LOW_LESSONS_THRESHOLD = 3;
// Dias sem aula feita (Compareceu) a partir dos quais o aluno ativo entra em alerta.
export const INACTIVITY_DAYS = 15;

const PENDING: LessonStatus[] = [LessonStatus.Agendada, LessonStatus.Confirmada, LessonStatus.Implementada];
const DONE: LessonStatus[] = [LessonStatus.Compareceu, LessonStatus.Faltou];

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export interface StudentAlert {
  aluno_id: string;
  nome: string;
  aulas_restantes: number;
  // créditos sem agendar + aulas pendentes de realização
  restam: number;
  poucas_aulas: boolean;
  sem_aula: boolean;
  dias_sem_aula: number | null;
  ultima_aula: string | null;
  alerta_poucas_aulas_enviado: boolean;
  alerta_inatividade_enviado: boolean;
}

// Só alunos Ativos. Calculado a partir de Student/Lesson — nada é duplicado.
export async function computeStudentAlerts(prisma: PrismaClient, today: string = todayBR()): Promise<StudentAlert[]> {
  const students = await prisma.student.findMany({
    where: { status: 'Ativo' },
    select: {
      id: true,
      nome: true,
      aulas_restantes: true,
      created_at: true,
      alerta_poucas_aulas_enviado: true,
      alerta_inatividade_enviado: true,
    },
  });
  if (students.length === 0) return [];

  const lessons = await prisma.lesson.findMany({
    where: { aluno_id: { in: students.map((s) => s.id) }, status: { in: [...PENDING, LessonStatus.Compareceu] } },
    select: { aluno_id: true, data: true, status: true },
  });

  const byStudent = new Map<string, { lastDone: string | null; pending: number; upcoming: boolean }>();
  for (const l of lessons) {
    const acc = byStudent.get(l.aluno_id) ?? { lastDone: null, pending: 0, upcoming: false };
    if (l.status === LessonStatus.Compareceu) {
      if (!acc.lastDone || l.data > acc.lastDone) acc.lastDone = l.data;
    } else {
      acc.pending++;
      if (l.data >= today) acc.upcoming = true;
    }
    byStudent.set(l.aluno_id, acc);
  }

  return students.map((s) => {
    const info = byStudent.get(s.id) ?? { lastDone: null, pending: 0, upcoming: false };
    const restam = s.aulas_restantes + info.pending;
    // Sem nenhuma aula feita ainda, conta desde o cadastro.
    const reference = info.lastDone ?? todayBR(s.created_at);
    const dias = daysBetween(reference, today);

    return {
      aluno_id: s.id,
      nome: s.nome,
      aulas_restantes: s.aulas_restantes,
      restam,
      poucas_aulas: restam >= 1 && restam <= LOW_LESSONS_THRESHOLD,
      // Quem já tem aula marcada está voltando; só alerta quem tem crédito sobrando e nada agendado.
      sem_aula: s.aulas_restantes > 0 && info.pending === 0 && dias >= INACTIVITY_DAYS,
      dias_sem_aula: dias,
      ultima_aula: info.lastDone,
      alerta_poucas_aulas_enviado: s.alerta_poucas_aulas_enviado,
      alerta_inatividade_enviado: s.alerta_inatividade_enviado,
    };
  });
}

function summarize(names: string[]): string {
  const shown = names.slice(0, 5).join(', ');
  return names.length > 5 ? `${shown} e mais ${names.length - 5}` : shown;
}

export interface StudentAlertsJobResult {
  poucas_aulas_notificados: number;
  sem_aula_notificados: number;
}

// Notifica UMA vez por episódio (flag no aluno) e agrupa os nomes num único push.
export async function runStudentAlertsJob(
  prisma: PrismaClient,
  logger: FastifyBaseLogger
): Promise<StudentAlertsJobResult> {
  const alerts = await computeStudentAlerts(prisma);

  const lowNew = alerts.filter((a) => a.poucas_aulas && !a.alerta_poucas_aulas_enviado);
  const lowReset = alerts.filter((a) => !a.poucas_aulas && a.alerta_poucas_aulas_enviado);
  const idleNew = alerts.filter((a) => a.sem_aula && !a.alerta_inatividade_enviado);
  const idleReset = alerts.filter((a) => !a.sem_aula && a.alerta_inatividade_enviado);

  // Marca antes de enviar: se o push falhar, preferimos perder um aviso a
  // reenviar o mesmo a cada 5 minutos.
  const update = (ids: string[], data: { alerta_poucas_aulas_enviado?: boolean; alerta_inatividade_enviado?: boolean }) =>
    ids.length ? prisma.student.updateMany({ where: { id: { in: ids } }, data }) : null;

  await Promise.all([
    update(lowNew.map((a) => a.aluno_id), { alerta_poucas_aulas_enviado: true }),
    update(lowReset.map((a) => a.aluno_id), { alerta_poucas_aulas_enviado: false }),
    update(idleNew.map((a) => a.aluno_id), { alerta_inatividade_enviado: true }),
    update(idleReset.map((a) => a.aluno_id), { alerta_inatividade_enviado: false }),
  ]);

  if (lowNew.length > 0) {
    await notifyProfessors(prisma, {
      title: lowNew.length === 1 ? 'Aluno com poucas aulas' : `${lowNew.length} alunos com poucas aulas`,
      body: summarize(lowNew.map((a) => `${a.nome} (${a.restam})`)),
    }).catch((error) => logger.error({ err: error }, 'Falha ao notificar poucas aulas'));
  }

  if (idleNew.length > 0) {
    await notifyProfessors(prisma, {
      title: idleNew.length === 1 ? `Aluno há ${INACTIVITY_DAYS}+ dias sem aula` : `${idleNew.length} alunos há ${INACTIVITY_DAYS}+ dias sem aula`,
      body: summarize(idleNew.map((a) => `${a.nome} (${a.dias_sem_aula}d)`)),
    }).catch((error) => logger.error({ err: error }, 'Falha ao notificar inatividade'));
  }

  return { poucas_aulas_notificados: lowNew.length, sem_aula_notificados: idleNew.length };
}

// Pacote encerrado = sem créditos, nada pendente e a última aula já resolvida
// (Compareceu/Faltou). Inativa o aluno na hora. Não varre o histórico: só roda
// quando uma aula é concluída, então alunos com saldo zero de antes não são
// inativados em massa.
export async function closePackageIfFinished(
  prisma: PrismaClient,
  studentId: string,
  logger: FastifyBaseLogger
): Promise<boolean> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.status !== 'Ativo' || student.aulas_restantes > 0) return false;

  const lessons = await prisma.lesson.findMany({
    where: { aluno_id: studentId },
    select: { status: true, updated_at: true },
  });
  if (lessons.some((l) => PENDING.includes(l.status))) return false;

  const done = lessons.filter((l) => DONE.includes(l.status));
  if (done.length === 0) return false;

  // Se o aluno foi editado depois da última aula (ex.: reativado sem renovar o
  // pacote ainda), respeita a decisão manual.
  const lastDone = Math.max(...done.map((l) => l.updated_at.getTime()));
  if (student.updated_at.getTime() > lastDone) return false;

  await prisma.student.update({
    where: { id: studentId },
    data: { status: 'Inativo', inativado_em: new Date() },
  });

  await notifyProfessors(prisma, {
    title: 'Pacote encerrado',
    body: `${student.nome} concluiu o pacote e foi marcado como Inativo.`,
  }).catch((error) => logger.error({ err: error, studentId }, 'Falha ao notificar pacote encerrado'));

  return true;
}
