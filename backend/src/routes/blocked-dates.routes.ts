import type { FastifyInstance } from 'fastify';
import { createBlockedDateSchema } from '../schemas/blocked-date.schema.js';
import { requireAuth } from '../middleware/auth.js';

// Datas em que o instrutor fecha a escola (feriado, viagem, etc). Enquanto
// uma data estiver aqui, o portal do aluno não oferece nenhum horário nela —
// ver isDateBlocked em portal.routes.ts.
export async function blockedDatesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/blocked-dates', async () => {
    return app.prisma.blockedDate.findMany({ orderBy: { data: 'asc' } });
  });

  app.post('/blocked-dates', async (request, reply) => {
    const data = createBlockedDateSchema.parse(request.body);

    const existing = await app.prisma.blockedDate.findUnique({ where: { data: data.data } });
    if (existing) return reply.code(409).send({ message: 'Essa data já está bloqueada' });

    const blocked = await app.prisma.blockedDate.create({ data });
    return reply.code(201).send(blocked);
  });

  app.delete('/blocked-dates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const exists = await app.prisma.blockedDate.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Data bloqueada não encontrada' });

    await app.prisma.blockedDate.delete({ where: { id } });
    return reply.code(204).send();
  });
}
