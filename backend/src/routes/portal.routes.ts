import type { FastifyInstance } from 'fastify';
import type { LessonStatus } from '@prisma/client';
import { z } from 'zod';
import { notifyProfessors } from '../lib/notify-professors.js';
import { getScheduledTimes, DEFAULT_INSTRUCTOR, DEFAULT_LOCATIONS } from '../lib/schedule.js';
import { formatDateBR, lessonTypeLabel } from '../lib/format.js';
import { lessonTypeSchema } from '../schemas/lesson.schema.js';

const registerDeviceSchema = z.object({
  device_token: z.string().min(1),
  platform: z.string().min(1).default('web'),
});

const availableSlotsQuerySchema = z.object({
  tipo: lessonTypeSchema.default('Surf'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato yyyy-MM-dd'),
});

const createPortalLessonSchema = z.object({
  tipo: lessonTypeSchema.default('Surf'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato yyyy-MM-dd'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:mm'),
  local: z.enum(DEFAULT_LOCATIONS as [string, ...string[]]),
});

const ACTIVE_STATUSES: LessonStatus[] = ['Agendada', 'Confirmada'];

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

  app.get('/portal/:token/available-slots', async (request, reply) => {
    const { token } = request.params as { token: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    const { tipo, data } = availableSlotsQuerySchema.parse(request.query);

    const allTimes = getScheduledTimes(tipo, data);
    if (allTimes.length === 0) return { data, tipo, horarios: [] };

    const takenLessons = await app.prisma.lesson.findMany({
      where: { data, tipo, status: { in: ACTIVE_STATUSES } },
      select: { hora: true },
    });
    const taken = new Set(takenLessons.map((l) => l.hora));

    return { data, tipo, horarios: allTimes.filter((hora) => !taken.has(hora)) };
  });

  app.post('/portal/:token/lessons', async (request, reply) => {
    const { token } = request.params as { token: string };
    const student = await app.prisma.student.findUnique({ where: { access_token: token } });
    if (!student) return reply.code(404).send({ message: 'Link inválido' });

    if (student.aulas_restantes <= 0) {
      return reply.code(422).send({ message: 'Você não tem aulas disponíveis no seu plano' });
    }

    const { tipo, data, hora, local } = createPortalLessonSchema.parse(request.body);

    const scheduledTimes = getScheduledTimes(tipo, data);
    if (!scheduledTimes.includes(hora)) {
      return reply.code(422).send({ message: 'Esse horário não está disponível' });
    }

    const existing = await app.prisma.lesson.findFirst({
      where: { data, hora, tipo, status: { in: ACTIVE_STATUSES } },
    });
    if (existing) {
      return reply.code(409).send({ message: 'Esse horário acabou de ser reservado por outro aluno' });
    }

    const [lesson] = await app.prisma.$transaction([
      app.prisma.lesson.create({
        data: {
          aluno_id: student.id,
          data,
          hora,
          tipo,
          local,
          instrutor: DEFAULT_INSTRUCTOR,
          status: 'Agendada',
        },
      }),
      app.prisma.student.update({
        where: { id: student.id },
        data: { aulas_restantes: { decrement: 1 } },
      }),
    ]);

    await notifyProfessors(app.prisma, {
      title: 'Aluno agendou uma aula',
      body: `${student.nome} agendou ${lessonTypeLabel(tipo)} em ${formatDateBR(data)} às ${hora}, em ${local}.`,
    }).catch((error) => app.log.error({ err: error }, 'Falha ao notificar professor'));

    return reply.code(201).send(lesson);
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
      body: `${student.nome} confirmou ${lessonTypeLabel(lesson.tipo)} em ${formatDateBR(lesson.data)} às ${lesson.hora}.`,
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
      body: `${student.nome} cancelou ${lessonTypeLabel(lesson.tipo)} em ${formatDateBR(lesson.data)} às ${lesson.hora}.`,
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
