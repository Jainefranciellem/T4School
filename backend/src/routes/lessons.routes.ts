import type { FastifyInstance } from 'fastify';
import { createLessonSchema, updateLessonSchema } from '../schemas/lesson.schema.js';
import { requireAuth } from '../middleware/auth.js';

export async function lessonsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/lessons', async (request) => {
    const { data_inicio, data_fim, aluno_id } = request.query as {
      data_inicio?: string;
      data_fim?: string;
      aluno_id?: string;
    };

    return app.prisma.lesson.findMany({
      where: {
        aluno_id: aluno_id || undefined,
        data:
          data_inicio || data_fim
            ? { gte: data_inicio, lte: data_fim }
            : undefined,
      },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  });

  app.get('/lessons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const lesson = await app.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return reply.code(404).send({ message: 'Aula não encontrada' });
    return lesson;
  });

  app.post('/lessons', async (request, reply) => {
    const data = createLessonSchema.parse(request.body);

    const student = await app.prisma.student.findUnique({ where: { id: data.aluno_id } });
    if (!student) return reply.code(422).send({ message: 'Aluno informado não existe' });

    const [lesson] = await app.prisma.$transaction([
      app.prisma.lesson.create({ data }),
      app.prisma.student.update({
        where: { id: data.aluno_id },
        data: { aulas_restantes: Math.max(0, student.aulas_restantes - 1) },
      }),
    ]);

    return reply.code(201).send(lesson);
  });

  app.put('/lessons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateLessonSchema.parse(request.body);

    const exists = await app.prisma.lesson.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Aula não encontrada' });

    const lesson = await app.prisma.lesson.update({ where: { id }, data });
    return lesson;
  });

  app.delete('/lessons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const exists = await app.prisma.lesson.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Aula não encontrada' });

    await app.prisma.lesson.delete({ where: { id } });
    return reply.code(204).send();
  });
}
