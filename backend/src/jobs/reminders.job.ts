import { LessonStatus, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { sendWhatsAppMessage } from '../lib/whatsapp.js';
import { renderTemplate } from '../lib/message-template.js';
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

  const whatsappConfigured = Boolean(settings.whatsapp_phone_id && settings.whatsapp_token);

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
    // independently of each other: tier 2 does NOT require tier 1 to have
    // happened, so the professor's push and the student's close-to-lesson
    // WhatsApp still work even if WhatsApp was never configured (or the
    // lesson was booked less than reminder_hours before it starts).
    const isFirstTierDue =
      whatsappConfigured && !lesson.lembrete_enviado && remainingHours <= settings.reminder_hours;

    const isSecondTierDue =
      settings.double_reminder &&
      !lesson.lembrete_dobrado_enviado &&
      remainingMinutes <= settings.double_reminder_minutes;

    if (isFirstTierDue) {
      try {
        await sendWhatsAppMessage({
          phoneNumberId: settings.whatsapp_phone_id!,
          accessToken: settings.whatsapp_token!,
          to: lesson.student.telefone,
          message: renderTemplate(settings.template_reminder, vars),
        });
        await prisma.lesson.update({ where: { id: lesson.id }, data: { lembrete_enviado: true } });
        sent++;
      } catch (error) {
        failed++;
        logger.error({ err: error, lessonId: lesson.id }, 'Falha ao enviar lembrete de WhatsApp');
      }
      continue;
    }

    if (isSecondTierDue) {
      if (whatsappConfigured) {
        try {
          await sendWhatsAppMessage({
            phoneNumberId: settings.whatsapp_phone_id!,
            accessToken: settings.whatsapp_token!,
            to: lesson.student.telefone,
            message: renderTemplate(settings.template_reminder, vars),
          });
          sent++;
        } catch (error) {
          failed++;
          logger.error({ err: error, lessonId: lesson.id }, 'Falha ao enviar lembrete duplo de WhatsApp');
        }
      }

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
