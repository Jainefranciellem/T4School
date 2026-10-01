// Copia Plan, Student, Lesson e BlockedDate de um banco (produção) para outro
// (homologação), anonimizando dados pessoais. A ORIGEM só recebe leituras
// (findMany); o DESTINO é APAGADO nessas 4 tabelas e recriado.
//
// Não copia: User, Settings (tokens de WhatsApp/e-mail), DeviceToken,
// StudentDeviceToken, FinancialTransaction.
//
// Uso (a partir de backend/), por padrão só mostra o que faria (dry-run):
//   SOURCE_DATABASE_URL='<produção, session pooler 5432>' \
//   TARGET_DATABASE_URL='<hml, session pooler 5432>' \
//   CONFIRM_TARGET_USER='postgres.<ref-do-projeto-hml>' \
//   npx tsx scripts/copy-prod-to-hml.ts [--apply]

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
const confirmUser = process.env.CONFIRM_TARGET_USER;
const apply = process.argv.includes('--apply');

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function parse(url: string, label: string) {
  try {
    const u = new URL(url);
    return { user: decodeURIComponent(u.username), host: u.hostname, port: u.port, db: u.pathname };
  } catch {
    return fail(`${label} não é uma URL válida`);
  }
}

if (!sourceUrl || !targetUrl) fail('Defina SOURCE_DATABASE_URL e TARGET_DATABASE_URL');

const source = parse(sourceUrl, 'SOURCE_DATABASE_URL');
const target = parse(targetUrl, 'TARGET_DATABASE_URL');

// No pooler do Supabase o host é o mesmo entre projetos; o que identifica o
// projeto é o usuário (postgres.<ref>). Por isso a trava compara usuário também.
if (source.user === target.user && source.host === target.host && source.db === target.db) {
  fail('Origem e destino são o mesmo banco. Abortado.');
}
if (confirmUser !== target.user) {
  fail(
    `Confirmação ausente ou diferente. Para gravar em "${target.user}@${target.host}${target.db}" ` +
      `defina CONFIRM_TARGET_USER='${target.user}'. (A origem é "${source.user}" — confira que NÃO é esse.)`
  );
}

const from = new PrismaClient({ datasourceUrl: sourceUrl });
const to = new PrismaClient({ datasourceUrl: targetUrl });

async function main() {
  console.log(`Origem : ${source.user}@${source.host}${source.db}  (somente leitura)`);
  console.log(`Destino: ${target.user}@${target.host}${target.db}  (${apply ? 'SERÁ APAGADO E RECRIADO' : 'dry-run'})`);

  // Student sem inativado_em: a produção pode ainda não ter essa coluna.
  const [plans, students, lessons, blocked] = await Promise.all([
    from.plan.findMany(),
    from.student.findMany({
      select: {
        id: true,
        plano: true,
        aulas_restantes: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    from.lesson.findMany(),
    from.blockedDate.findMany(),
  ]);

  console.log(`Lidos: ${plans.length} planos, ${students.length} alunos, ${lessons.length} aulas, ${blocked.length} datas bloqueadas`);

  if (!apply) {
    console.log('Dry-run: nada foi gravado. Rode com --apply para copiar.');
    return;
  }

  const studentRows = students.map((s, i) => {
    const n = String(i + 1).padStart(4, '0');
    return {
      id: s.id,
      nome: `Aluno ${n}`,
      telefone: '5500000000000',
      email: `aluno-${n}@exemplo.invalid`,
      plano: s.plano,
      aulas_restantes: s.aulas_restantes,
      status: s.status,
      avatar: null,
      access_token: randomUUID(), // links do portal de produção não funcionam em hml
      // sem histórico real: melhor aproximação é a mesma da migration
      inativado_em: s.status === 'Inativo' ? s.updated_at : null,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  });

  const lessonRows = lessons.map((l) => ({
    ...l,
    observacoes: null, // texto livre pode conter dados pessoais
    // nada de lembrete/notificação sai de hml
    enviar_notificacao: false,
    notificacao_enviada: true,
    lembrete_enviado: true,
    lembrete_dobrado_enviado: true,
  }));

  await to.$transaction(
    async (tx) => {
      await tx.lesson.deleteMany();
      await tx.student.deleteMany();
      await tx.plan.deleteMany();
      await tx.blockedDate.deleteMany();

      await tx.plan.createMany({ data: plans });
      await tx.student.createMany({ data: studentRows });
      await tx.lesson.createMany({ data: lessonRows });
      await tx.blockedDate.createMany({ data: blocked });
    },
    { timeout: 120_000 }
  );

  const [p, s, l, b] = await Promise.all([to.plan.count(), to.student.count(), to.lesson.count(), to.blockedDate.count()]);
  console.log(`Gravado no destino: ${p} planos, ${s} alunos, ${l} aulas, ${b} datas bloqueadas`);
  if (p !== plans.length || s !== students.length || l !== lessons.length || b !== blocked.length) {
    fail('Contagens do destino diferem da origem.');
  }
  console.log('✔ Concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([from.$disconnect(), to.$disconnect()]);
  });
