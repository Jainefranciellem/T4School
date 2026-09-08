import type { FastifyInstance } from 'fastify';
import type { Lesson, LessonStatus, Student } from '@prisma/client';
import { createLessonSchema, updateLessonSchema } from '../schemas/lesson.schema.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyStudent } from '../lib/notify-student.js';
import { notifyProfessors } from '../lib/notify-professors.js';
import { formatDateBR, lessonTypeLabel } from '../lib/format.js';

const ACTIVE_STATUSES: LessonStatus[] = ['Agendada', 'Confirmada'];

async function notifyStatusChange(app: FastifyInstance, lesson: Lesson, student: Student) {
  if (lesson.status !== 'Confirmada' && lesson.status !== 'Cancelada') return;

  const settings = await app.prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (!settings) return;

  const template = lesson.status === 'Confirmada' ? settings.template_confirmed : settings.template_cancelled;
  const subject = lesson.status === 'Confirmada' ? 'Aula confirmada' : 'Aula cancelada';

  await notifyStudent(
    app.prisma,
    settings,
    student,
    template,
    {
      nome: student.nome,
      hora: lesson.hora,
      local: lesson.local,
      instrutor: lesson.instrutor,
      data: lesson.data,
    },
    subject,
    app.log
  );
}

async function notifyReschedule(app: FastifyInstance, lesson: Lesson, student: Student) {
  const settings = await app.prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (!settings) return;

  await notifyStudent(
    app.prisma,
    settings,
    student,
    settings.template_rescheduled,
    {
      nome: student.nome,
      hora: lesson.hora,
      local: lesson.local,
      instrutor: lesson.instrutor,
      data: lesson.data,
    },
    'Aula remarcada',
    app.log
  );
}

// Notificações abaixo são pro PRÓPRIO instrutor (não pro aluno) — ele pediu
// pra ser avisado (com som, se estiver com o app aberto) quando cadastra,
// cria ou mexe numa aula pelo painel, mesmo sendo ação dele mesmo (útil pra
// quem usa o painel em mais de um dispositivo).
async function notifyProfessorsLessonCreated(app: FastifyInstance, lesson: Lesson, student: Student) {
  await notifyProfessors(app.prisma, {
    title: 'Aula criada',
    body: `Você agendou ${lessonTypeLabel(lesson.tipo)} com ${student.nome} em ${formatDateBR(lesson.data)} às ${lesson.hora}.`,
  }).catch((error) => app.log.error({ err: error, lessonId: lesson.id }, 'Falha ao notificar professor sobre nova aula'));
}

async function notifyProfessorsStatusChange(app: FastifyInstance, lesson: Lesson, student: Student) {
  await notifyProfessors(app.prisma, {
    title: 'Status da aula atualizado',
    body: `Aula com ${student.nome} em ${formatDateBR(lesson.data)} às ${lesson.hora} agora está "${lesson.status}".`,
  }).catch((error) => app.log.error({ err: error, lessonId: lesson.id }, 'Falha ao notificar professor sobre status da aula'));
}

async function notifyProfessorsReschedule(app: FastifyInstance, lesson: Lesson, student: Student) {
  await notifyProfessors(app.prisma, {
    title: 'Aula remarcada',
    body: `Aula com ${student.nome} remarcada para ${formatDateBR(lesson.data)} às ${lesson.hora}.`,
  }).catch((error) => app.log.error({ err: error, lessonId: lesson.id }, 'Falha ao notificar professor sobre remarcação'));
}

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

    const conflict = await app.prisma.lesson.findFirst({
      where: {
        instrutor: data.instrutor,
        data: data.data,
        hora: data.hora,
        status: { in: ACTIVE_STATUSES },
      },
    });
    if (conflict) {
      return reply.code(409).send({ message: 'Já existe uma aula agendada para esse instrutor nesse dia e horário' });
    }

    const [lesson] = await app.prisma.$transaction([
      app.prisma.lesson.create({ data }),
      app.prisma.student.update({
        where: { id: data.aluno_id },
        data: { aulas_restantes: Math.max(0, student.aulas_restantes - 1) },
      }),
    ]);

    await notifyProfessorsLessonCreated(app, lesson, student);

    return reply.code(201).send(lesson);
  });

  app.put('/lessons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateLessonSchema.parse(request.body);

    const exists = await app.prisma.lesson.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Aula não encontrada' });

    const instrutor = data.instrutor ?? exists.instrutor;
    const lessonData = data.data ?? exists.data;
    const hora = data.hora ?? exists.hora;
    const status = data.status ?? exists.status;

    const movedOrReactivated =
      instrutor !== exists.instrutor ||
      lessonData !== exists.data ||
      hora !== exists.hora ||
      status !== exists.status;

    if (movedOrReactivated && ACTIVE_STATUSES.includes(status)) {
      const conflict = await app.prisma.lesson.findFirst({
        where: {
          id: { not: id },
          instrutor,
          data: lessonData,
          hora,
          status: { in: ACTIVE_STATUSES },
        },
      });
      if (conflict) {
        return reply.code(409).send({ message: 'Já existe uma aula agendada para esse instrutor nesse dia e horário' });
      }
    }

    // Cancelar devolve o crédito consumido quando a aula foi marcada;
    // reativar uma aula cancelada (editar o status de volta) consome de novo
    // — mantém o saldo do aluno coerente com o que está reservado de fato.
    // Só falta (status Faltou) continua descontando do pacote.
    const enteringCancelled = data.status === 'Cancelada' && exists.status !== 'Cancelada';
    const leavingCancelled = data.status !== undefined && data.status !== 'Cancelada' && exists.status === 'Cancelada';

    let lesson: Lesson;
    if (enteringCancelled) {
      [lesson] = await app.prisma.$transaction([
        app.prisma.lesson.update({ where: { id }, data }),
        app.prisma.student.update({ where: { id: exists.aluno_id }, data: { aulas_restantes: { increment: 1 } } }),
      ]);
    } else if (leavingCancelled) {
      [lesson] = await app.prisma.$transaction([
        app.prisma.lesson.update({ where: { id }, data }),
        app.prisma.student.update({ where: { id: exists.aluno_id }, data: { aulas_restantes: { decrement: 1 } } }),
      ]);
    } else {
      lesson = await app.prisma.lesson.update({ where: { id }, data });
    }

    const lessonStudent = await app.prisma.student.findUnique({ where: { id: lesson.aluno_id } });

    if (data.status && data.status !== exists.status && lessonStudent) {
      await notifyStatusChange(app, lesson, lessonStudent).catch((error) => {
        app.log.error({ err: error, lessonId: lesson.id }, 'Falha ao enviar notificação de status');
      });
      await notifyProfessorsStatusChange(app, lesson, lessonStudent);
    }

    const rescheduled =
      (data.data !== undefined && data.data !== exists.data) ||
      (data.hora !== undefined && data.hora !== exists.hora);

    if (rescheduled && lessonStudent) {
      await notifyReschedule(app, lesson, lessonStudent).catch((error) => {
        app.log.error({ err: error, lessonId: lesson.id }, 'Falha ao enviar notificação de remarcação');
      });
      await notifyProfessorsReschedule(app, lesson, lessonStudent);
    }

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
