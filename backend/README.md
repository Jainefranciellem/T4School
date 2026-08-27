# T4School API

Backend próprio (Fastify + Prisma + PostgreSQL) que substitui os webhooks do n8n usados hoje pelo frontend.

## Rodando localmente

```bash
cp .env.example .env        # ajuste os segredos e o e-mail/senha do admin inicial
docker compose up -d        # sobe um Postgres local
npm install
npx prisma migrate dev      # cria as tabelas
npm run seed                # cria o usuário admin definido no .env
npm run dev                 # http://localhost:3333
```

`GET /health` deve responder `{"status":"ok"}`.

## Endpoints

Todas as rotas abaixo (exceto `/health` e `/auth/*`) exigem `Authorization: Bearer <accessToken>`.

- `POST /auth/login` — `{ email, password }` → `{ accessToken, refreshToken, user }`
- `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken }`
- `GET/POST /students`, `GET/PUT/DELETE /students/:id`
- `GET/POST /lessons` (aceita `?data_inicio&data_fim&aluno_id`), `GET/PUT/DELETE /lessons/:id`
  - criar uma aula decrementa `aulas_restantes` do aluno automaticamente
- `GET/POST /plans`, `PUT/DELETE /plans/:id`
- `GET/PUT /settings` — WhatsApp, preferências de lembrete e templates de mensagem
- `POST /me/device-token` — registra o token FCM do professor logado
- `GET|POST /internal/jobs/reminders` — dispara o job de lembretes manualmente. Aceita
  `X-Internal-Secret: <INTERNAL_JOB_SECRET>` OU `Authorization: Bearer <CRON_SECRET>` (o header
  que a Vercel Cron envia sozinha) — não usa JWT.

## Lembretes por WhatsApp

Configure `whatsapp_phone_id` e `whatsapp_token` (WhatsApp Business Cloud API) via `PUT /settings`
— são as credenciais que a tela de Configurações do frontend salva. Com isso definido:

- O agendamento do job varia por ambiente de deploy — veja `DEPLOY.md`:
  - **Docker/self-host** (Render, Railway, local): `node-cron` in-process (`REMINDER_JOB_CRON`
    no `.env`, padrão a cada 15 min), configurado em `src/server.ts`.
  - **Vercel** (serverless, sem processo contínuo): **Vercel Cron**, configurado em
    `backend/vercel.json` (`crons`), chamando `GET /internal/jobs/reminders`.
- O job varre aulas `Agendada`/`Confirmada` com `enviar_notificacao=true` e dispara
  `template_reminder` quando faltam `reminder_hours` horas para a aula, e de novo quando faltam
  `double_reminder_hours` horas, se `double_reminder` estiver ativo. Cada envio marca
  `lembrete_enviado`/`lembrete_dobrado_enviado` na aula para não duplicar.
- Confirmar (`status: "Confirmada"`) ou cancelar (`status: "Cancelada"`) uma aula via
  `PUT /lessons/:id` dispara `template_confirmed`/`template_cancelled` na hora, de forma síncrona
  — isso funciona igual em qualquer ambiente, não depende do cron.
- Mensagens usam a API de texto livre do Graph API (`type: "text"`) — fora da janela de 24h de
  atendimento do WhatsApp, a Meta exige um *message template* pré-aprovado; para produção em escala
  vale migrar `sendWhatsAppMessage` (`src/lib/whatsapp.ts`) para enviar `type: "template"`.

## Deploy

Veja `DEPLOY.md` — Vercel (serverless, via `backend/api/index.ts`), Render e Railway (container
Docker) documentados, com as env vars específicas de cada um.
