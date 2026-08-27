import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env.js';
import { runReminderJob } from '../jobs/reminders.job.js';

function isAuthorized(request: FastifyRequest): boolean {
  const internalSecret = request.headers['x-internal-secret'];
  if (internalSecret === env.INTERNAL_JOB_SECRET) return true;

  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically when
  // CRON_SECRET is set as an env var on the project.
  if (env.CRON_SECRET) {
    const authHeader = request.headers.authorization;
    if (authHeader === `Bearer ${env.CRON_SECRET}`) return true;
  }

  return false;
}

async function handleReminderJob(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  if (!isAuthorized(request)) {
    return reply.code(401).send({ message: 'Não autorizado' });
  }

  const result = await runReminderJob(app.prisma, app.log);
  return result;
}

export async function jobsRoutes(app: FastifyInstance) {
  app.post('/internal/jobs/reminders', (request, reply) => handleReminderJob(app, request, reply));
  app.get('/internal/jobs/reminders', (request, reply) => handleReminderJob(app, request, reply));
}
