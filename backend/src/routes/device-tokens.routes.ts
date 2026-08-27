import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const registerDeviceSchema = z.object({
  device_token: z.string().min(1),
  platform: z.string().min(1).default('web'),
});

export async function deviceTokensRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/me/device-token', async (request, reply) => {
    const { device_token, platform } = registerDeviceSchema.parse(request.body);
    const userId = request.user!.sub;

    const deviceToken = await app.prisma.deviceToken.upsert({
      where: { token: device_token },
      update: { user_id: userId, platform },
      create: { user_id: userId, token: device_token, platform },
    });

    return reply.code(201).send(deviceToken);
  });
}
