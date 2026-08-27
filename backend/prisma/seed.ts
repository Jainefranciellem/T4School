import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nome = process.env.SEED_ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env antes de rodar o seed');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password_hash, nome, role: 'ADMIN' },
  });

  console.log(`Usuário admin pronto: ${user.email}`);

  const plans = [
    { nome: 'Aula Avulsa', qtd_aulas: 1, validade_dias: 30, preco: 130 },
    { nome: 'Pacote 4 Aulas', qtd_aulas: 4, validade_dias: 60, preco: 480 },
    { nome: 'Pacote 6 Aulas', qtd_aulas: 6, validade_dias: 90, preco: 660 },
    { nome: 'Pacote 10 Aulas', qtd_aulas: 10, validade_dias: 120, preco: 950 },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { nome: plan.nome },
      update: plan,
      create: plan,
    });
  }

  console.log(`${plans.length} planos prontos`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
