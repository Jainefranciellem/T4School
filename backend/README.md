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
- `GET/PUT /settings` — configurações de integrações/lembretes hoje presas no `localStorage` do frontend
- `POST /me/device-token` — registra o token FCM do professor logado

## Pendente (próximas fases)

- Trocar os `services` do frontend (`aulas.service.ts`, `students.service.ts`, `plans.service.ts`, `AuthContext.tsx`) para chamar essa API via `VITE_API_BASE_URL` em vez dos webhooks do n8n.
- Envio de lembrete via WhatsApp Cloud API + job agendado.
- Deploy (Railway/Render) e apontar o Vercel do frontend para a URL de produção.
