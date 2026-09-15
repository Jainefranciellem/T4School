import { LessonStatus, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { minutesUntilLesson, CANCEL_LOCK_MINUTES } from '../lib/schedule.js';

const LOCKABLE_STATUSES: LessonStatus[] = [LessonStatus.Agendada, LessonStatus.Confirmada];

// Aula esquecida em Agendada/Confirmada há mais de um dia não é "acabou de
// passar da janela de cancelamento" — é lixo de dados que o professor
// deveria ter resolvido manualmente (Compareceu/Faltou). Sem esse teto, a
// primeira rodada do job varreria todo o histórico esquecido pra
// Implementada de uma vez só.
const MAX_PAST_MINUTES = 24 * 60;

export interface LockLessonsJobResult {
  locked: number;
}

// A partir do momento em que o aluno não pode mais cancelar (CANCEL_LOCK_MINUTES
// antes do início), a aula não deve mais ficar pendurada em Agendada/Confirmada
// esperando confirmação dele — vira Implementada, e dali em diante só o
// professor confirma (Implementada -> Confirmada).
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
    .filter((lesson) => {
      const remaining = minutesUntilLesson(lesson.data, lesson.hora, now);
      return remaining < CANCEL_LOCK_MINUTES && remaining >= -MAX_PAST_MINUTES;
    })
    .map((lesson) => lesson.id);

  if (toLockIds.length === 0) return { locked: 0 };

  await prisma.lesson.updateMany({
    where: { id: { in: toLockIds } },
    data: { status: LessonStatus.Implementada },
  });

  logger.info({ count: toLockIds.length }, 'Aulas movidas para Implementada (janela de cancelamento fechada)');

  return { locked: toLockIds.length };
}
