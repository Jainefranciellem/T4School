import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ message: 'Token de acesso ausente' });
  }

  const token = header.slice('Bearer '.length);

  try {
    request.user = verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ message: 'Token de acesso inválido ou expirado' });
  }
}
