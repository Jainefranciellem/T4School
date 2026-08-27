import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../env.js';

function getFirebaseApp(): App | null {
  if (getApps().length > 0) return getApps()[0];

  if (!env.FIREBASE_SERVICE_ACCOUNT) return null;

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  return initializeApp({ credential: cert(serviceAccount) });
}

export interface PushNotification {
  title: string;
  body: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
}

export async function sendPushNotification(
  tokens: string[],
  notification: PushNotification
): Promise<PushResult> {
  const app = getFirebaseApp();
  if (!app || tokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const messaging = getMessaging(app);
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    try {
      await messaging.send({ token, notification });
      sent++;
    } catch (error) {
      failed++;
      const code = (error as { errorInfo?: { code?: string } })?.errorInfo?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(token);
      }
    }
  }

  return { sent, failed, invalidTokens };
}
