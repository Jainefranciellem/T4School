import type { PrismaClient } from '@prisma/client';
import { sendPushNotification, type PushNotification, type PushResult } from './firebase-admin.js';

export async function notifyProfessors(
  prisma: PrismaClient,
  notification: PushNotification
): Promise<PushResult> {
  const deviceTokens = await prisma.deviceToken.findMany();
  if (deviceTokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const result = await sendPushNotification(
    deviceTokens.map((d) => d.token),
    notification
  );

  if (result.invalidTokens.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
  }

  return result;
}
