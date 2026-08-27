import { LessonStatus, type PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { sendWhatsAppMessage } from '../lib/whatsapp.js';
import { renderTemplate } from '../lib/message-template.js';

const ACTIVE_STATUSES: LessonStatus[] = [LessonStatus.Agendada, LessonStatus.Confirmada];

function hoursUntil(data: string, hora: string, now: Date): number {
  const lessonDateTime = new Date(`${data}T${hora}:00`);
  return (lessonDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
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

  if (!settings.whatsapp_phone_id || !settings.whatsapp_token) {
    return { sent: 0, failed: 0, skippedReason: 'WhatsApp não configurado' };
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
    const remainingHours = hoursUntil(lesson.data, lesson.hora, now);
    if (remainingHours < 0) continue;

    const vars = {
      nome: lesson.student.nome,
      hora: lesson.hora,
      local: lesson.local,
      instrutor: lesson.instrutor,
      data: lesson.data,
    };

    const isFirstReminderDue = !lesson.lembrete_enviado && remainingHours <= settings.reminder_hours;
    const isDoubleReminderDue =
      settings.double_reminder &&
      lesson.lembrete_enviado &&
      !lesson.lembrete_dobrado_enviado &&
      remainingHours <= settings.double_reminder_hours;

    if (!isFirstReminderDue && !isDoubleReminderDue) continue;

    try {
      await sendWhatsAppMessage({
        phoneNumberId: settings.whatsapp_phone_id,
        accessToken: settings.whatsapp_token,
        to: lesson.student.telefone,
        message: renderTemplate(settings.template_reminder, vars),
      });

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: isFirstReminderDue
          ? { lembrete_enviado: true }
          : { lembrete_dobrado_enviado: true },
      });

      sent++;
    } catch (error) {
      failed++;
      logger.error({ err: error, lessonId: lesson.id }, 'Falha ao enviar lembrete de WhatsApp');
    }
  }

  return { sent, failed };
}
