# Deploy do backend

O backend é um serviço Docker comum (Fastify + Postgres via Prisma). Duas opções prontas:

## Opção A — Render (usa `render.yaml` na raiz do repo)

1. No dashboard da Render: **New > Blueprint**, aponte pro repositório `T4School`.
2. A Render lê `render.yaml` e cria sozinha o Web Service (`t4school-api`, a partir de
   `backend/Dockerfile`) e o Postgres (`t4school-db`), já ligando `DATABASE_URL` entre eles.
3. Preencha manualmente as env vars que não podem ser geradas automaticamente:
   - `CORS_ORIGIN` = URL de produção do frontend (ex.: `https://t4school.vercel.app`)
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` (opcional, só pro seed)
4. Depois do primeiro deploy, rode o seed uma vez pelo shell do serviço na Render:
   `npm run seed`

## Opção B — Railway (usa `backend/railway.toml`)

1. `railway init` (ou pelo dashboard: **New Project > Deploy from GitHub repo**), selecionando
   este repositório e definindo **Root Directory** = `backend`.
2. Adicione um plugin PostgreSQL ao projeto (Railway gera `DATABASE_URL` automaticamente).
3. Configure as demais env vars (mesmas do `.env.example`): `PORT`, `CORS_ORIGIN`, `JWT_SECRET`,
   `JWT_REFRESH_SECRET`, `INTERNAL_JOB_SECRET`, `REMINDER_JOB_CRON`.
4. Deploy (`railway up` ou automático a cada push). Depois do primeiro deploy, rode o seed uma vez:
   `railway run npm run seed`

## Depois do backend no ar

1. Confirme `GET https://<seu-backend>/health` → `{"status":"ok"}`.
2. No projeto Vercel do frontend, configure a env var de produção:
   - `VITE_API_BASE_URL=https://<seu-backend>`
   - `VITE_FIREBASE_VAPID_KEY=<mesma chave usada em dev>`
3. Redeploy do frontend na Vercel pra aplicar as env vars novas.
4. Configure `whatsapp_phone_id`/`whatsapp_token` via `PUT /settings` (ou pela tela de
   Configurações do app) pra ativar os lembretes automáticos.

## Segredos a gerar (nunca reaproveitar os valores de `.env.example`/dev)

- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_JOB_SECRET`: strings aleatórias longas, ex.
  `openssl rand -base64 32`.
