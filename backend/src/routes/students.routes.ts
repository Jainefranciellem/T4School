import type { FastifyInstance } from 'fastify';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.schema.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyProfessors } from '../lib/notify-professors.js';
import { computeStudentAlerts } from '../lib/student-alerts.js';
import { todayBR } from '../lib/finance.js';
import type { Plan, Prisma, Student } from '@prisma/client';

// Aquisição de plano vira receita Pendente (valor de tabela, editável) pra não
// depender de lançamento manual. Pendente porque o sistema não sabe se foi pago.
function planSaleData(student: Student, plan: Plan): Prisma.FinancialTransactionUncheckedCreateInput {
  const today = todayBR();
  return {
    tipo: 'Receita',
    descricao: `${plan.nome} — ${student.nome}`,
    valor: plan.preco,
    data: today,
    competencia: today.slice(0, 7),
    categoria: 'Plano',
    status: 'Pendente',
    aluno_id: student.id,
    aluno_nome: student.nome,
    plano_id: plan.id,
    plano_nome: plan.nome,
    observacoes: 'Gerado automaticamente ao adquirir o plano',
  };
}

export async function studentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/students', async () => {
    return app.prisma.student.findMany({ orderBy: { nome: 'asc' } });
  });

  // Etiquetas de alerta (poucas aulas / sem aula há N dias) dos alunos ativos.
  app.get('/students/alerts', async () => {
    const alerts = await computeStudentAlerts(app.prisma);
    return alerts.map(({ alerta_poucas_aulas_enviado: _a, alerta_inatividade_enviado: _b, ...rest }) => rest);
  });

  app.get('/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const student = await app.prisma.student.findUnique({ where: { id } });
    if (!student) return reply.code(404).send({ message: 'Aluno não encontrado' });
    return student;
  });

  app.post('/students', async (request, reply) => {
    const data = createStudentSchema.parse(request.body);
    const plan = await app.prisma.plan.findUnique({ where: { nome: data.plano } });
    const student = await app.prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: { ...data, inativado_em: data.status === 'Inativo' ? new Date() : null },
      });
      if (plan && Number(plan.preco) > 0) {
        await tx.financialTransaction.create({ data: planSaleData(created, plan) });
      }
      return created;
    });

    await notifyProfessors(app.prisma, {
      title: 'Novo aluno cadastrado',
      body: `${student.nome} foi cadastrado no sistema.`,
    }).catch((error) => app.log.error({ err: error, studentId: student.id }, 'Falha ao notificar professor sobre novo aluno'));

    return reply.code(201).send(student);
  });

  app.put('/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateStudentSchema.parse(request.body);

    const exists = await app.prisma.student.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Aluno não encontrado' });

    // Marca/limpa a data de inativação (base do "cancelamentos por mês" no financeiro).
    const inativado_em =
      data.status && data.status !== exists.status
        ? data.status === 'Inativo'
          ? new Date()
          : null
        : undefined;

    // Trocar de plano é uma nova aquisição: gera a receita do plano novo.
    const newPlan =
      data.plano && data.plano !== exists.plano
        ? await app.prisma.plan.findUnique({ where: { nome: data.plano } })
        : null;

    const student = await app.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({ where: { id }, data: { ...data, inativado_em } });
      if (newPlan && Number(newPlan.preco) > 0) {
        await tx.financialTransaction.create({ data: planSaleData(updated, newPlan) });
      }
      return updated;
    });
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
