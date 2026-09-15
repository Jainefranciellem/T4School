import { LessonStatus, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { minutesUntilLesson } from '../lib/schedule.js';

const LOCKABLE_STATUSES: LessonStatus[] = [LessonStatus.Agendada, LessonStatus.Confirmada];
const CANCEL_LOCK_MINUTES = 15;

export interface LockLessonsJobResult {
  locked: number;
}

// Espelha o CANCEL_LOCK_MINUTES de portal.routes.ts: a partir do momento em
// que o aluno não pode mais cancelar, a aula não deve mais ficar pendurada
// em Agendada/Confirmada esperando confirmação dele — vira Implementada, e
// dali em diante só o professor confirma (Implementada -> Confirmada).
export async function runLockLessonsJob(
  prisma: PrismaClient,
  logger: FastifyBaseLogger
): Promise<LockLessonsJobResult> {
  const now = new Date();
  const candidates = await prisma.lesson.findMany({
    where: { status: { in: LOCKABLE_STATUSES } },
    select: { id: true, data: true, hora: true },
  });

  const toLockIds = candidates
    .filter((lesson) => minutesUntilLesson(lesson.data, lesson.hora, now) < CANCEL_LOCK_MINUTES)
    .map((lesson) => lesson.id);

  if (toLockIds.length === 0) return { locked: 0 };

  await prisma.lesson.updateMany({
    where: { id: { in: toLockIds } },
    data: { status: LessonStatus.Implementada },
  });

  logger.info({ count: toLockIds.length }, 'Aulas movidas para Implementada (janela de cancelamento fechada)');

  return { locked: toLockIds.length };
}
