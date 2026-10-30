import type { PrismaClient, Settings, Student } from '@prisma/client';
import { sendWhatsAppTemplate } from './whatsapp.js';
import type { WhatsAppTemplateMessage } from './whatsapp-templates.js';
import { sendPushNotification } from './firebase-admin.js';
import { renderTemplate } from './message-template.js';

export interface NotifyStudentResult {
  sent: number;
  failed: number;
}

interface Logger {
  error: (obj: unknown, msg: string) => void;
}

// Avisa o aluno por WhatsApp (template aprovado na Meta) e por push (texto
// renderizado a partir dos templates de Settings). Cada canal é independente:
// um não configurado ou com falha nunca bloqueia o outro.
export async function notifyStudent(
  prisma: PrismaClient,
  settings: Settings,
  student: Student,
  template: string,
  vars: Record<string, string>,
  title: string,
  logger: Logger,
  whatsapp?: WhatsAppTemplateMessage
): Promise<NotifyStudentResult> {
  let sent = 0;
  let failed = 0;
  const message = renderTemplate(template, vars);

  if (whatsapp && settings.whatsapp_phone_id && settings.whatsapp_token) {
    try {
      await sendWhatsAppTemplate({
        phoneNumberId: settings.whatsapp_phone_id,
        accessToken: settings.whatsapp_token,
        to: student.telefone,
        ...whatsapp,
      });
      sent++;
    } catch (error) {
      failed++;
      logger.error({ err: error }, 'Falha ao enviar WhatsApp');
    }
  }

  const deviceTokens = await prisma.studentDeviceToken.findMany({ where: { student_id: student.id } });
  if (deviceTokens.length > 0) {
    try {
      const result = await sendPushNotification(
        deviceTokens.map((d) => d.token),
        { title, body: message }
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
