// src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// src/env.ts
import "dotenv/config";
import { z } from "zod";
var envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  INTERNAL_JOB_SECRET: z.string().min(1),
  REMINDER_JOB_CRON: z.string().default("*/15 * * * *"),
  CRON_SECRET: z.string().optional()
});
var env = envSchema.parse(process.env);

// src/plugins/prisma.ts
import { PrismaClient } from "@prisma/client";
import fp from "fastify-plugin";
var prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  app.decorate("prisma", prisma);
  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});

// src/schemas/auth.schema.ts
import { z as z2 } from "zod";
var loginSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(1)
});
var refreshSchema = z2.object({
  refreshToken: z2.string().min(1)
});

// src/lib/hash.ts
import bcrypt from "bcrypt";
function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// src/lib/jwt.ts
import jwt from "jsonwebtoken";
function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
}
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// src/routes/auth.routes.ts
async function authRoutes(app) {
  app.post("/auth/login", async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ message: "Email ou senha incorretos" });
    }
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ message: "Email ou senha incorretos" });
    }
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });
    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role }
    });
  });
  app.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ message: "Refresh token inv\xE1lido ou expirado" });
    }
    const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return reply.code(401).send({ message: "Usu\xE1rio n\xE3o encontrado" });
    }
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    return reply.send({ accessToken });
  });
}

// src/schemas/student.schema.ts
import { z as z3 } from "zod";
var studentStatusSchema = z3.enum(["Ativo", "Inativo"]);
var createStudentSchema = z3.object({
  nome: z3.string().min(1),
  telefone: z3.string().min(1),
  email: z3.string().email(),
  plano: z3.string().min(1),
  aulas_restantes: z3.number().int().min(0).default(0),
  status: studentStatusSchema.default("Ativo"),
  avatar: z3.string().optional()
});
var updateStudentSchema = createStudentSchema.partial();

// src/middleware/auth.ts
async function requireAuth(request, reply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ message: "Token de acesso ausente" });
  }
  const token = header.slice("Bearer ".length);
  try {
    request.user = verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ message: "Token de acesso inv\xE1lido ou expirado" });
  }
}

// src/routes/students.routes.ts
async function studentsRoutes(app) {
  app.addHook("preHandler", requireAuth);
  app.get("/students", async () => {
    return app.prisma.student.findMany({ orderBy: { nome: "asc" } });
  });
  app.get("/students/:id", async (request, reply) => {
    const { id } = request.params;
    const student = await app.prisma.student.findUnique({ where: { id } });
    if (!student) return reply.code(404).send({ message: "Aluno n\xE3o encontrado" });
    return student;
  });
  app.post("/students", async (request, reply) => {
    const data = createStudentSchema.parse(request.body);
    const student = await app.prisma.student.create({ data });
    return reply.code(201).send(student);
  });
  app.put("/students/:id", async (request, reply) => {
    const { id } = request.params;
    const data = updateStudentSchema.parse(request.body);
    const exists = await app.prisma.student.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: "Aluno n\xE3o encontrado" });
    const student = await app.prisma.student.update({ where: { id }, data });
    return student;
  });
  app.delete("/students/:id", async (request, reply) => {
    const { id } = request.params;
    const exists = await app.prisma.student.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: "Aluno n\xE3o encontrado" });
    await app.prisma.student.delete({ where: { id } });
    return reply.code(204).send();
  });
}

// src/schemas/lesson.schema.ts
import { z as z4 } from "zod";
var lessonStatusSchema = z4.enum([
  "Agendada",
  "Confirmada",
  "Compareceu",
  "Faltou",
  "Cancelada"
]);
var createLessonSchema = z4.object({
  aluno_id: z4.string().uuid(),
  data: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato yyyy-MM-dd"),
  hora: z4.string().regex(/^\d{2}:\d{2}$/, "Use o formato HH:mm"),
  local: z4.string().min(1),
  instrutor: z4.string().min(1),
  observacoes: z4.string().optional(),
  status: lessonStatusSchema.default("Agendada"),
  notificacao_enviada: z4.boolean().default(false),
  enviar_notificacao: z4.boolean().default(true)
});
var updateLessonSchema = createLessonSchema.partial();

// src/lib/whatsapp.ts
var GRAPH_API_VERSION = "v20.0";
function sanitizePhone(phone) {
  return phone.replace(/\D/g, "");
}
async function sendWhatsAppMessage({
  phoneNumberId,
  accessToken,
  to,
  message
}) {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: sanitizePhone(to),
        type: "text",
        text: { body: message }
      })
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar WhatsApp (${response.status}): ${body}`);
  }
}

// src/lib/message-template.ts
function renderTemplate(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => vars[key] ?? "");
}

// src/routes/lessons.routes.ts
async function notifyStatusChange(app, lesson) {
  if (lesson.status !== "Confirmada" && lesson.status !== "Cancelada") return;
  const settings = await app.prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.whatsapp_phone_id || !settings.whatsapp_token) return;
  const student = await app.prisma.student.findUnique({ where: { id: lesson.aluno_id } });
  if (!student) return;
  const template = lesson.status === "Confirmada" ? settings.template_confirmed : settings.template_cancelled;
  await sendWhatsAppMessage({
    phoneNumberId: settings.whatsapp_phone_id,
    accessToken: settings.whatsapp_token,
    to: student.telefone,
    message: renderTemplate(template, {
      nome: student.nome,
      hora: lesson.hora,
      local: lesson.local,
      instrutor: lesson.instrutor,
      data: lesson.data
    })
  });
}
async function lessonsRoutes(app) {
  app.addHook("preHandler", requireAuth);
  app.get("/lessons", async (request) => {
    const { data_inicio, data_fim, aluno_id } = request.query;
    return app.prisma.lesson.findMany({
      where: {
        aluno_id: aluno_id || void 0,
        data: data_inicio || data_fim ? { gte: data_inicio, lte: data_fim } : void 0
      },
      orderBy: [{ data: "asc" }, { hora: "asc" }]
    });
  });
  app.get("/lessons/:id", async (request, reply) => {
    const { id } = request.params;
    const lesson = await app.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return reply.code(404).send({ message: "Aula n\xE3o encontrada" });
    return lesson;
  });
  app.post("/lessons", async (request, reply) => {
    const data = createLessonSchema.parse(request.body);
    const student = await app.prisma.student.findUnique({ where: { id: data.aluno_id } });
    if (!student) return reply.code(422).send({ message: "Aluno informado n\xE3o existe" });
    const [lesson] = await app.prisma.$transaction([
      app.prisma.lesson.create({ data }),
      app.prisma.student.update({
        where: { id: data.aluno_id },
        data: { aulas_restantes: Math.max(0, student.aulas_restantes - 1) }
      })
    ]);
    return reply.code(201).send(lesson);
  });
  app.put("/lessons/:id", async (request, reply) => {
    const { id } = request.params;
    const data = updateLessonSchema.parse(request.body);
    const exists = await app.prisma.lesson.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: "Aula n\xE3o encontrada" });
    const lesson = await app.prisma.lesson.update({ where: { id }, data });
    if (data.status && data.status !== exists.status) {
      await notifyStatusChange(app, lesson).catch((error) => {
        app.log.error({ err: error, lessonId: lesson.id }, "Falha ao enviar notifica\xE7\xE3o de status");
      });
    }
    return lesson;
  });
  app.delete("/lessons/:id", async (request, reply) => {
    const { id } = request.params;
    const exists = await app.prisma.lesson.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: "Aula n\xE3o encontrada" });
    await app.prisma.lesson.delete({ where: { id } });
    return reply.code(204).send();
  });
}

// src/schemas/plan.schema.ts
import { z as z5 } from "zod";
var createPlanSchema = z5.object({
  nome: z5.string().min(1),
  qtd_aulas: z5.number().int().min(1),
  validade_dias: z5.number().int().min(1),
  preco: z5.number().nonnegative()
});
var updatePlanSchema = createPlanSchema.partial();

// src/routes/plans.routes.ts
async function plansRoutes(app) {
  app.addHook("preHandler", requireAuth);
  app.get("/plans", async () => {
    return app.prisma.plan.findMany({ orderBy: { preco: "asc" } });
  });
  app.post("/plans", async (request, reply) => {
    const data = createPlanSchema.parse(request.body);
    const plan = await app.prisma.plan.create({ data });
    return reply.code(201).send(plan);
  });
  app.put("/plans/:id", async (request, reply) => {
    const { id } = request.params;
    const data = updatePlanSchema.parse(request.body);
    const exists = await app.prisma.plan.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: "Plano n\xE3o encontrado" });
    const plan = await app.prisma.plan.update({ where: { id }, data });
    return plan;
  });
  app.delete("/plans/:id", async (request, reply) => {
    const { id } = request.params;
    const exists = await app.prisma.plan.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: "Plano n\xE3o encontrado" });
    await app.prisma.plan.delete({ where: { id } });
    return reply.code(204).send();
  });
}

// src/schemas/settings.schema.ts
import { z as z6 } from "zod";
var updateSettingsSchema = z6.object({
  whatsapp_phone_id: z6.string().optional(),
  whatsapp_token: z6.string().optional(),
  send_reminders: z6.boolean().optional(),
  reminder_hours: z6.number().int().min(1).max(72).optional(),
  double_reminder: z6.boolean().optional(),
  double_reminder_hours: z6.number().int().min(1).max(24).optional(),
  template_reminder: z6.string().min(1).optional(),
  template_confirmed: z6.string().min(1).optional(),
  template_cancelled: z6.string().min(1).optional()
});

// src/routes/settings.routes.ts
var SETTINGS_ID = "singleton";
async function settingsRoutes(app) {
  app.addHook("preHandler", requireAuth);
  app.get("/settings", async () => {
    return app.prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID }
    });
  });
  app.put("/settings", async (request) => {
    const data = updateSettingsSchema.parse(request.body);
    return app.prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data }
    });
  });
}

// src/routes/device-tokens.routes.ts
import { z as z7 } from "zod";
var registerDeviceSchema = z7.object({
  device_token: z7.string().min(1),
  platform: z7.string().min(1).default("web")
});
async function deviceTokensRoutes(app) {
  app.addHook("preHandler", requireAuth);
  app.post("/me/device-token", async (request, reply) => {
    const { device_token, platform } = registerDeviceSchema.parse(request.body);
    const userId = request.user.sub;
    const deviceToken = await app.prisma.deviceToken.upsert({
      where: { token: device_token },
      update: { user_id: userId, platform },
      create: { user_id: userId, token: device_token, platform }
    });
    return reply.code(201).send(deviceToken);
  });
}

// src/jobs/reminders.job.ts
import { LessonStatus } from "@prisma/client";
var ACTIVE_STATUSES = [LessonStatus.Agendada, LessonStatus.Confirmada];
function hoursUntil(data, hora, now) {
  const lessonDateTime = /* @__PURE__ */ new Date(`${data}T${hora}:00`);
  return (lessonDateTime.getTime() - now.getTime()) / (1e3 * 60 * 60);
}
async function runReminderJob(prisma, logger) {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings || !settings.send_reminders) {
    return { sent: 0, failed: 0, skippedReason: "Lembretes desativados nas configura\xE7\xF5es" };
  }
  if (!settings.whatsapp_phone_id || !settings.whatsapp_token) {
    return { sent: 0, failed: 0, skippedReason: "WhatsApp n\xE3o configurado" };
  }
  const now = /* @__PURE__ */ new Date();
  const candidates = await prisma.lesson.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      enviar_notificacao: true,
      OR: [{ lembrete_enviado: false }, { lembrete_dobrado_enviado: false }]
    },
    include: { student: true }
  });
  let sent = 0;
  let failed = 0;
  for (const lesson of candidates) {
    const remainingHours = hoursUntil(lesson.data, lesson.hora, now);
    if (remainingHours < 0) continue;
    const vars = {
      nome: lesson.student.nome,
      hora: lesson.hora,
      local: lesson.local,
      instrutor: lesson.instrutor,
      data: lesson.data
    };
    const isFirstReminderDue = !lesson.lembrete_enviado && remainingHours <= settings.reminder_hours;
    const isDoubleReminderDue = settings.double_reminder && lesson.lembrete_enviado && !lesson.lembrete_dobrado_enviado && remainingHours <= settings.double_reminder_hours;
    if (!isFirstReminderDue && !isDoubleReminderDue) continue;
    try {
      await sendWhatsAppMessage({
        phoneNumberId: settings.whatsapp_phone_id,
        accessToken: settings.whatsapp_token,
        to: lesson.student.telefone,
        message: renderTemplate(settings.template_reminder, vars)
      });
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: isFirstReminderDue ? { lembrete_enviado: true } : { lembrete_dobrado_enviado: true }
      });
      sent++;
    } catch (error) {
      failed++;
      logger.error({ err: error, lessonId: lesson.id }, "Falha ao enviar lembrete de WhatsApp");
    }
  }
  return { sent, failed };
}

// src/routes/jobs.routes.ts
function isAuthorized(request) {
  const internalSecret = request.headers["x-internal-secret"];
  if (internalSecret === env.INTERNAL_JOB_SECRET) return true;
  if (env.CRON_SECRET) {
    const authHeader = request.headers.authorization;
    if (authHeader === `Bearer ${env.CRON_SECRET}`) return true;
  }
  return false;
}
async function handleReminderJob(app, request, reply) {
  if (!isAuthorized(request)) {
    return reply.code(401).send({ message: "N\xE3o autorizado" });
  }
  const result = await runReminderJob(app.prisma, app.log);
  return result;
}
async function jobsRoutes(app) {
  app.post("/internal/jobs/reminders", (request, reply) => handleReminderJob(app, request, reply));
  app.get("/internal/jobs/reminders", (request, reply) => handleReminderJob(app, request, reply));
}

// src/app.ts
async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(prismaPlugin);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: "Dados inv\xE1lidos",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.code(409).send({ message: "Registro j\xE1 existe (conflito de chave \xFAnica)" });
    }
    app.log.error(error);
    return reply.code(500).send({ message: "Erro interno do servidor" });
  });
  app.get("/health", async () => ({ status: "ok" }));
  await app.register(authRoutes);
  await app.register(studentsRoutes);
  await app.register(lessonsRoutes);
  await app.register(plansRoutes);
  await app.register(settingsRoutes);
  await app.register(deviceTokensRoutes);
  await app.register(jobsRoutes);
  return app;
}

// src/vercel-handler.ts
var appPromise = null;
async function getApp() {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}
async function handler(req, res) {
  const app = await getApp();
  await app.ready();
  const response = await app.inject({
    method: req.method ?? "GET",
    url: req.url ?? "/",
    headers: req.headers,
    payload: req.body
  });
  res.statusCode = response.statusCode;
  for (const [key, value] of Object.entries(response.headers)) {
    if (value !== void 0) res.setHeader(key, value);
  }
  res.end(response.rawPayload);
}
export {
  handler as default
};
