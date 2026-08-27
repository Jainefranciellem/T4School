const GRAPH_API_VERSION = 'v20.0';

interface SendWhatsAppMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  message: string;
}

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function sendWhatsAppMessage({
  phoneNumberId,
  accessToken,
  to,
  message,
}: SendWhatsAppMessageParams): Promise<void> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: sanitizePhone(to),
        type: 'text',
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar WhatsApp (${response.status}): ${body}`);
  }
}
