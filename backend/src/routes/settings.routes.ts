import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
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
    const { weekly_schedule, ...rest } = updateSettingsSchema.parse(request.body);
    // Prisma exige Prisma.JsonNull (não o `null` do JS) pra gravar null num
    // campo Json — um `null` puro no update seria interpretado como "não mude
    // esse campo" em vez de "limpe a agenda customizada".
    const data = {
      ...rest,
      ...(weekly_schedule !== undefined && {
        weekly_schedule: weekly_schedule === null ? Prisma.JsonNull : weekly_schedule,
      }),
    };

    return app.prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
  });
}
