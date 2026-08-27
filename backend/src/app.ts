import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from './env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { authRoutes } from './routes/auth.routes.js';
import { studentsRoutes } from './routes/students.routes.js';
import { lessonsRoutes } from './routes/lessons.routes.js';
import { plansRoutes } from './routes/plans.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { deviceTokensRoutes } from './routes/device-tokens.routes.js';
import { jobsRoutes } from './routes/jobs.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(prismaPlugin);

  // Must be set before registering route plugins: Fastify snapshots the error
  // handler at register() time for each encapsulated context, so setting it
  // afterwards would not apply to routes registered above it.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: 'Dados inválidos',
        issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.code(409).send({ message: 'Registro já existe (conflito de chave única)' });
    }

    app.log.error(error);
    return reply.code(500).send({ message: 'Erro interno do servidor' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(studentsRoutes);
  await app.register(lessonsRoutes);
  await app.register(plansRoutes);
  await app.register(settingsRoutes);
  await app.register(deviceTokensRoutes);
  await app.register(jobsRoutes);

  return app;
}
