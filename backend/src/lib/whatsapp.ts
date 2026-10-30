const GRAPH_API_VERSION = 'v20.0';
const TEMPLATE_LANGUAGE = 'pt_BR';

interface SendWhatsAppTemplateParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  template: string;
  params: string[];
}

// A API oficial só aceita texto livre dentro de 24h depois que o cliente
// escreve; lembretes e avisos são mensagens ativas, então vão sempre por
// template aprovado na Meta (ver docs/whatsapp-templates.md).
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Número brasileiro cadastrado sem DDI (DDD + 8/9 dígitos): prefixa 55.
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

export async function sendWhatsAppTemplate({
  phoneNumberId,
  accessToken,
  to,
  template,
  params,
}: SendWhatsAppTemplateParams): Promise<void> {
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
        type: 'template',
        template: {
          name: template,
          language: { code: TEMPLATE_LANGUAGE },
          components: [
            {
              type: 'body',
              parameters: params.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar WhatsApp (${response.status}): ${body}`);
  }
}
