import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../src/app.js';

type VercelRequest = IncomingMessage & { body?: unknown };

// Cached across warm invocations of the same lambda instance, so we don't
// rebuild the Fastify app (and reconnect Prisma) on every request.
let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  const app = await getApp();
  await app.ready();

  // Using inject() instead of forwarding the raw req/res avoids relying on
  // req's readable stream, which Vercel's Node runtime may already have
  // consumed to populate req.body before this handler runs.
  // `method`/`payload` are cast loosely here on purpose: light-my-request's
  // InjectOptions types don't line up 1:1 with Node's/Fastify's own HTTP
  // types, and this boundary is inherently dynamic (raw request from Vercel).
  const response = await app.inject({
    method: (req.method ?? 'GET') as any,
    url: req.url ?? '/',
    headers: req.headers as Record<string, string>,
    payload: req.body as any,
  });

  res.statusCode = response.statusCode;
  for (const [key, value] of Object.entries(response.headers)) {
    if (value !== undefined) res.setHeader(key, value as string | string[]);
  }
  res.end(response.rawPayload);
}
