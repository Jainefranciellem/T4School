import type { FastifyInstance } from 'fastify';
import { updateSettingsSchema } from '../schemas/settings.schema.js';
import { requireAuth } from '../middleware/auth.js';

const SETTINGS_ID = 'singleton';

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/settings', async () => {
    return app.prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
  });

  app.put('/settings', async (request) => {
    const data = updateSettingsSchema.parse(request.body);

    return app.prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
  });
}
