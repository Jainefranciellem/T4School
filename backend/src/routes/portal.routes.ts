import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notifyProfessors } from '../lib/notify-professors.js';

const registerDeviceSchema = z.object({
  device_token: z.string().min(1),
  platform: z.string().min(1).default('web'),
});

const ACTIVE_STATUSES = ['Agendada', 'Confirmada'];

// Rotas públicas do portal do aluno: sem JWT, autenticadas só pelo
// access_token (não-adivinhável) na própria URL. Cada rota busca o aluno
// pelo token antes de mais nada; se não achar, 404 — nunca vaza se o token
// existe ou não de outra forma.
export async function portalRoutes(app: FastifyInstance) {
  app.get('/portal/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    const { access_token, ...safeStudent } = student;
    return safeStudent;
  });

  app.get('/portal/:token/lessons', async (request, reply) => {
    const { token } = request.params as { token: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    return app.prisma.lesson.findMany({
      where: { aluno_id: student.id },
      orderBy: [{ data: 'desc' }, { hora: 'desc' }],
    });
  });

  app.put('/portal/:token/lessons/:id/confirm', async (request, reply) => {
    const { token, id } = request.params as { token: string; id: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    const lesson = await app.prisma.lesson.findUnique({ where: { id } });
    if (!lesson || lesson.aluno_id !== student.id) {
      return reply.code(404).send({ message: 'Aula não encontrada' });
    }
    if (lesson.status !== 'Agendada') {
      return reply.code(422).send({ message: 'Essa aula não pode mais ser confirmada' });
    }

    const updated = await app.prisma.lesson.update({ where: { id }, data: { status: 'Confirmada' } });

    await notifyProfessors(app.prisma, {
      title: 'Aluno confirmou presença',
      body: `${student.nome} confirmou a aula de ${lesson.hora} (${lesson.data}).`,
    }).catch((error) => app.log.error({ err: error }, 'Falha ao notificar professor'));

    return updated;
  });

  app.put('/portal/:token/lessons/:id/cancel', async (request, reply) => {
    const { token, id } = request.params as { token: string; id: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    const lesson = await app.prisma.lesson.findUnique({ where: { id } });
    if (!lesson || lesson.aluno_id !== student.id) {
      return reply.code(404).send({ message: 'Aula não encontrada' });
    }
    if (!ACTIVE_STATUSES.includes(lesson.status)) {
      return reply.code(422).send({ message: 'Essa aula não pode mais ser cancelada' });
    }

    const updated = await app.prisma.lesson.update({ where: { id }, data: { status: 'Cancelada' } });

    await notifyProfessors(app.prisma, {
      title: 'Aluno cancelou aula',
      body: `${student.nome} cancelou a aula de ${lesson.hora} (${lesson.data}).`,
    }).catch((error) => app.log.error({ err: error }, 'Falha ao notificar professor'));

    return updated;
  });

  app.post('/portal/:token/device-token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    const { device_token, platform } = registerDeviceSchema.parse(request.body);

    const deviceToken = await app.prisma.studentDeviceToken.upsert({
      where: { token: device_token },
      update: { student_id: student.id, platform },
      create: { student_id: student.id, token: device_token, platform },
    });

    return reply.code(201).send(deviceToken);
  });
}
