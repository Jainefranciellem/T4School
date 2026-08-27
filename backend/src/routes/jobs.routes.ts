import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';
import { runReminderJob } from '../jobs/reminders.job.js';

export async function jobsRoutes(app: FastifyInstance) {
  app.post('/internal/jobs/reminders', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];

    if (secret !== env.INTERNAL_JOB_SECRET) {
      return reply.code(401).send({ message: 'Não autorizado' });
    }

    const result = await runReminderJob(app.prisma, app.log);
    return result;
  });
}
