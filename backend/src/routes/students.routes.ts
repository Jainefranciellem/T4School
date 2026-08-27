import type { FastifyInstance } from 'fastify';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.schema.js';
import { requireAuth } from '../middleware/auth.js';

export async function studentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/students', async () => {
    return app.prisma.student.findMany({ orderBy: { nome: 'asc' } });
  });

  app.get('/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const student = await app.prisma.student.findUnique({ where: { id } });
    if (!student) return reply.code(404).send({ message: 'Aluno não encontrado' });
    return student;
  });

  app.post('/students', async (request, reply) => {
    const data = createStudentSchema.parse(request.body);
    const student = await app.prisma.student.create({ data });
    return reply.code(201).send(student);
  });

  app.put('/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateStudentSchema.parse(request.body);

    const exists = await app.prisma.student.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Aluno não encontrado' });

    const student = await app.prisma.student.update({ where: { id }, data });
    return student;
  });

  app.delete('/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const exists = await app.prisma.student.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Aluno não encontrado' });

    await app.prisma.student.delete({ where: { id } });
    return reply.code(204).send();
  });
}
