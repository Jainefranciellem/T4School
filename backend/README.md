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
  `template_reminder` quando faltam `reminder_hours` horas para a aula (1º lembrete). Cada envio
  marca `lembrete_enviado`/`lembrete_dobrado_enviado` na aula para não duplicar.
- O **2º lembrete** (`double_reminder`, `double_reminder_minutes` antes da aula — padrão 15 min)
  dispara **dois canais ao mesmo tempo**: WhatsApp pro aluno (se configurado) e **push pro
  professor** (todos os `DeviceToken` cadastrados). Esse 2º lembrete é independente do 1º — funciona
  mesmo se o WhatsApp nunca foi configurado, ou se a aula foi criada a menos de `reminder_hours`
  de antecedência.
- Confirmar (`status: "Confirmada"`) ou cancelar (`status: "Cancelada"`) uma aula via
  `PUT /lessons/:id` dispara `template_confirmed`/`template_cancelled` na hora, de forma síncrona
  — isso funciona igual em qualquer ambiente, não depende do cron.
- Mensagens usam a API de texto livre do Graph API (`type: "text"`) — fora da janela de 24h de
  atendimento do WhatsApp, a Meta exige um *message template* pré-aprovado; para produção em escala
  vale migrar `sendWhatsAppMessage` (`src/lib/whatsapp.ts`) para enviar `type: "template"`.

## Push para o professor

Configure `FIREBASE_SERVICE_ACCOUNT` no `.env` com o JSON completo da chave de serviço (Firebase
Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada, tudo em uma
linha só). Sem essa variável, o envio de push é pulado silenciosamente (não quebra o job).

- `src/lib/firebase-admin.ts` faz o envio via Firebase Admin SDK; `src/lib/notify-professors.ts`
  busca todos os `DeviceToken` cadastrados e envia pra cada um, removendo do banco os tokens que a
  FCM reportar como inválidos/não registrados.
- O único gatilho hoje é o 2º lembrete do job (veja acima). Pra usar em outro evento, chame
  `notifyProfessors(prisma, { title, body })`.

### ⚠️ Cron do plano Hobby da Vercel não é frequente o suficiente

O `crons` do `vercel.json` roda só **1x/dia** no plano gratuito — incompatível com um aviso "15
minutos antes", que precisa rodar a cada poucos minutos. Pra isso funcionar de verdade em produção
na Vercel, use um cron **externo e gratuito** batendo em `GET /internal/jobs/reminders` a cada 5
minutos, com o header `X-Internal-Secret: <INTERNAL_JOB_SECRET>`:

- **GitHub Actions** (grátis, já está no seu repo): um workflow `.github/workflows/reminders.yml`
  com `schedule: cron: "*/5 * * * *"` chamando a URL via `curl`.
- Ou um serviço tipo **cron-job.org** (grátis, sem precisar de repositório).

Sem isso, o job só roda 1x/dia via Vercel Cron e o lembrete de 15 minutos praticamente nunca
vai coincidir com o horário certo.

## Deploy

Veja `DEPLOY.md` — Vercel (serverless, via `backend/api/index.ts`), Render e Railway (container
Docker) documentados, com as env vars específicas de cada um.
