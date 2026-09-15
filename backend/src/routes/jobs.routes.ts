import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env.js';
import { runReminderJob } from '../jobs/reminders.job.js';
import { runLockLessonsJob } from '../jobs/lock-lessons.job.js';

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

  // Roda junto do job de lembretes: ambos precisam do mesmo cron de alta
  // frequência (a cada ~15min) pra pegar a janela de bloqueio de cancelamento
  // a tempo, e não faz sentido manter dois crons externos separados por isso.
  const [reminders, locked] = await Promise.all([
    runReminderJob(app.prisma, app.log),
    runLockLessonsJob(app.prisma, app.log),
  ]);

  return { ...reminders, ...locked };
}

export async function jobsRoutes(app: FastifyInstance) {
  app.post('/internal/jobs/reminders', (request, reply) => handleReminderJob(app, request, reply));
  app.get('/internal/jobs/reminders', (request, reply) => handleReminderJob(app, request, reply));
}
