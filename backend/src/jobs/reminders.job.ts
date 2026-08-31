import { LessonStatus, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { notifyStudent } from '../lib/notify-student.js';
import { notifyProfessors } from '../lib/notify-professors.js';

const ACTIVE_STATUSES: LessonStatus[] = [LessonStatus.Agendada, LessonStatus.Confirmada];

function minutesUntil(data: string, hora: string, now: Date): number {
  const lessonDateTime = new Date(`${data}T${hora}:00`);
  return (lessonDateTime.getTime() - now.getTime()) / (1000 * 60);
}

export interface ReminderJobResult {
  sent: number;
  failed: number;
  skippedReason?: string;
}

export async function runReminderJob(
  prisma: PrismaClient,
  logger: FastifyBaseLogger
): Promise<ReminderJobResult> {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });

  if (!settings || !settings.send_reminders) {
    return { sent: 0, failed: 0, skippedReason: 'Lembretes desativados nas configurações' };
  }

  const now = new Date();
  const candidates = await prisma.lesson.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      enviar_notificacao: true,
      OR: [{ lembrete_enviado: false }, { lembrete_dobrado_enviado: false }],
    },
    include: { student: true },
  });

  let sent = 0;
  let failed = 0;

  for (const lesson of candidates) {
    const remainingMinutes = minutesUntil(lesson.data, lesson.hora, now);
    if (remainingMinutes < 0) continue;
    const remainingHours = remainingMinutes / 60;

    const vars = {
      nome: lesson.student.nome,
      hora: lesson.hora,
      local: lesson.local,
      instrutor: lesson.instrutor,
      data: lesson.data,
    };

    // Tier 1 (X hours before) and tier 2 (double_reminder_minutes before) fire
    // independently: tier 2 does NOT require tier 1 to have happened, so the
    // professor's push and the close-to-lesson reminder still work even if
    // neither WhatsApp nor email was ever configured for tier 1's window.
    const isFirstTierDue = !lesson.lembrete_enviado && remainingHours <= settings.reminder_hours;

    const isSecondTierDue =
      settings.double_reminder &&
      !lesson.lembrete_dobrado_enviado &&
      remainingMinutes <= settings.double_reminder_minutes;

    if (isFirstTierDue) {
      const result = await notifyStudent(
        prisma,
        settings,
        lesson.student,
        settings.template_reminder,
        vars,
        'Lembrete de aula',
        logger
      );
      sent += result.sent;
      failed += result.failed;
      await prisma.lesson.update({ where: { id: lesson.id }, data: { lembrete_enviado: true } });
      continue;
    }

    if (isSecondTierDue) {
      const result = await notifyStudent(
        prisma,
        settings,
        lesson.student,
        settings.template_reminder,
        vars,
        'Sua aula está chegando',
        logger
      );
      sent += result.sent;
      failed += result.failed;

      try {
        await notifyProfessors(prisma, {
          title: 'Aula chegando',
          body: `Aula com ${lesson.student.nome} às ${lesson.hora} em ${settings.double_reminder_minutes} minutos.`,
        });
      } catch (error) {
        logger.error({ err: error, lessonId: lesson.id }, 'Falha ao notificar professor por push');
      }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { lembrete_dobrado_enviado: true },
      });
    }
  }

  return { sent, failed };
}
