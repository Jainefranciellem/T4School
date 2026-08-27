import type { FastifyInstance } from 'fastify';
import { createPlanSchema, updatePlanSchema } from '../schemas/plan.schema.js';
import { requireAuth } from '../middleware/auth.js';

export async function plansRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/plans', async () => {
    return app.prisma.plan.findMany({ orderBy: { preco: 'asc' } });
  });

  app.post('/plans', async (request, reply) => {
    const data = createPlanSchema.parse(request.body);
    const plan = await app.prisma.plan.create({ data });
    return reply.code(201).send(plan);
  });

  app.put('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updatePlanSchema.parse(request.body);

    const exists = await app.prisma.plan.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Plano não encontrado' });

    const plan = await app.prisma.plan.update({ where: { id }, data });
    return plan;
  });

  app.delete('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const exists = await app.prisma.plan.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Plano não encontrado' });

    await app.prisma.plan.delete({ where: { id } });
    return reply.code(204).send();
  });
}
