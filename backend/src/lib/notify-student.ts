import type { PrismaClient, Settings, Student } from '@prisma/client';
import { sendWhatsAppMessage } from './whatsapp.js';
import { sendEmail } from './email.js';
import { sendPushNotification } from './firebase-admin.js';
import { renderTemplate } from './message-template.js';

export interface NotifyStudentResult {
  sent: number;
  failed: number;
}

interface Logger {
  error: (obj: unknown, msg: string) => void;
}

// Sends the same rendered message to the student over every channel that has
// credentials configured in Settings. Each channel is independent: one being
// unconfigured or failing never blocks the other.
export async function notifyStudent(
  prisma: PrismaClient,
  settings: Settings,
  student: Student,
  template: string,
  vars: Record<string, string>,
  emailSubject: string,
  logger: Logger
): Promise<NotifyStudentResult> {
  let sent = 0;
  let failed = 0;
  const message = renderTemplate(template, vars);

  if (settings.whatsapp_phone_id && settings.whatsapp_token) {
    try {
      await sendWhatsAppMessage({
        phoneNumberId: settings.whatsapp_phone_id,
        accessToken: settings.whatsapp_token,
        to: student.telefone,
        message,
      });
      sent++;
    } catch (error) {
      failed++;
      logger.error({ err: error }, 'Falha ao enviar WhatsApp');
    }
  }

  if (settings.resend_api_key && settings.email_from) {
    try {
      await sendEmail({
        apiKey: settings.resend_api_key,
        from: settings.email_from,
        to: student.email,
        subject: emailSubject,
        text: message,
      });
      sent++;
    } catch (error) {
      failed++;
      logger.error({ err: error }, 'Falha ao enviar email');
    }
  }

  const deviceTokens = await prisma.studentDeviceToken.findMany({ where: { student_id: student.id } });
  if (deviceTokens.length > 0) {
    try {
      const result = await sendPushNotification(
        deviceTokens.map((d) => d.token),
        { title: emailSubject, body: message }
      );
      sent += result.sent;
      failed += result.failed;
      if (result.invalidTokens.length > 0) {
        await prisma.studentDeviceToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
      }
    } catch (error) {
      failed++;
      logger.error({ err: error }, 'Falha ao enviar push pro aluno');
    }
  }

  return { sent, failed };
}
