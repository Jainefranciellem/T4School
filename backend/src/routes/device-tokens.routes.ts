import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const registerDeviceSchema = z.object({
  device_token: z.string().min(1),
  platform: z.string().min(1).default('web'),
  client_id: z.string().min(1).optional(),
});

export async function deviceTokensRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/me/device-token', async (request, reply) => {
    const { device_token, platform, client_id } = registerDeviceSchema.parse(request.body);
    const userId = request.user!.sub;

    // O FCM às vezes rotaciona o token do mesmo aparelho (reinstalação, cache
    // limpo, atualização do navegador etc), deixando o token antigo esquecido
    // na tabela — o aparelho passa a receber cada push em duplicidade (um
    // envio por token válido). Como login é compartilhado entre professor e
    // outros usuários, não dá pra limpar "os outros tokens desse usuário"
    // (apagaria o aparelho de outra pessoa) — em vez disso, cada aparelho
    // gera seu próprio client_id persistente (localStorage) e só limpamos
    // tokens antigos com o MESMO client_id.
    const [deviceToken] = await app.prisma.$transaction([
      app.prisma.deviceToken.upsert({
        where: { token: device_token },
        update: { user_id: userId, platform, client_id },
        create: { user_id: userId, token: device_token, platform, client_id },
      }),
      ...(client_id
        ? [
            app.prisma.deviceToken.deleteMany({
              where: { client_id, token: { not: device_token } },
            }),
          ]
        : []),
    ]);

    return reply.code(201).send(deviceToken);
  });
}
