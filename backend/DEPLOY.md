# Deploy do backend

## Opção A — Vercel (recomendada, mesmo provedor do frontend)

O backend roda como função serverless (`backend/api/index.ts`, que embrulha o app Fastify).
Não há processo contínuo — o job de lembretes usa **Vercel Cron** em vez do `node-cron` local.

> ⚠️ **Plano Hobby (grátis) só permite Cron 1x por dia.** O `vercel.json` já vem configurado
> pra rodar `/internal/jobs/reminders` todo dia às 12:00 UTC. Isso cobre bem o lembrete
> "X horas antes", mas o *lembrete duplo* (perto da hora da aula) fica impreciso — só no plano
> Pro dá pra agendar de minuto em minuto. Ajuste `crons[0].schedule` em `backend/vercel.json`
> se quiser outro horário.

1. **Criar o projeto**: dashboard da Vercel → **Add New > Project** → selecione o repo
   `T4School` → em *Root Directory* escolha `backend` → framework preset: **Other**.
2. **Banco de dados**: aba **Storage** do projeto → **Create Database > Postgres** (é Neon por
   baixo, sem prazo de expiração no free tier). A Vercel injeta `DATABASE_URL`/`POSTGRES_URL`
   automaticamente nas env vars do projeto.
   - Copie a *pooled connection string* pra `DATABASE_URL` e a *unpooled/direct connection
     string* pra `DIRECT_URL` (o Storage tab da Vercel mostra as duas). O Prisma usa
     `DIRECT_URL` só pra rodar as migrations.
3. **Env vars** (Project Settings > Environment Variables), pelo menos:
   - `DATABASE_URL`, `DIRECT_URL` (do passo 2)
   - `CORS_ORIGIN` = URL de produção do frontend (ex.: `https://t4school.vercel.app`)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_JOB_SECRET` — gere com `openssl rand -base64 32`
   - `CRON_SECRET` — outra string aleatória; a Vercel usa esse valor automaticamente pra
     autenticar as chamadas do Cron
   - `PORT` pode ficar com o default (não é usado em serverless, mas o schema de env exige um valor)
4. **Deploy**. O `buildCommand` do `backend/vercel.json` já roda `prisma generate` e
   `prisma migrate deploy` a cada build.
5. **Seed do admin** (uma vez): `vercel env pull` localmente pra pegar o `DATABASE_URL` de
   produção, depois `SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... SEED_ADMIN_NAME=... npm run seed`
   (rodando local, mas apontando pro banco de produção).

## Opção B — Render (usa `render.yaml` na raiz do repo)

Backend como container Docker de verdade (processo contínuo, cron in-process funciona igual
ao local). Postgres free da Render **expira em 30 dias** — vale trocar por Neon/Supabase se for
usar de verdade sem virar plano pago.

1. No dashboard da Render: **New > Blueprint**, aponte pro repositório `T4School`, branch
   `primeiros_ajustes` (ou `main`, depois do merge).
2. A Render lê `render.yaml` e cria o Web Service (`t4school-api`, a partir de
   `backend/Dockerfile`) e o Postgres (`t4school-db`), já ligando `DATABASE_URL` entre eles.
3. Preencha manualmente:
   - `CORS_ORIGIN` = URL de produção do frontend
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` (opcional, só pro seed)
4. Depois do primeiro deploy, rode o seed uma vez pelo shell do serviço: `npm run seed`

## Opção C — Railway (usa `backend/railway.toml`)

Mesmo modelo de container contínuo da Render.

1. `railway init` (ou pelo dashboard: **New Project > Deploy from GitHub repo**), definindo
   **Root Directory** = `backend`.
2. Adicione um plugin PostgreSQL ao projeto (Railway gera `DATABASE_URL` automaticamente).
3. Configure as demais env vars (mesmas do `.env.example`, exceto `DIRECT_URL`/`CRON_SECRET`,
   que são específicas da Vercel).
4. Deploy (`railway up` ou automático a cada push). Depois, rode o seed: `railway run npm run seed`

## Depois do backend no ar (qualquer opção)

1. Confirme `GET https://<seu-backend>/health` → `{"status":"ok"}`.
2. No projeto Vercel do **frontend**, configure a env var de produção:
   - `VITE_API_BASE_URL=https://<seu-backend>`
   - `VITE_FIREBASE_VAPID_KEY=<mesma chave usada em dev>`
3. Redeploy do frontend pra aplicar as env vars novas.
4. Configure `whatsapp_phone_id`/`whatsapp_token` via `PUT /settings` (ou pela tela de
   Configurações do app) pra ativar os lembretes automáticos.

## Segredos a gerar (nunca reaproveitar os valores de `.env.example`/dev)

- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_JOB_SECRET`, `CRON_SECRET`: strings aleatórias
  longas, ex. `openssl rand -base64 32`.
