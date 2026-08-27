import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema } from '../schemas/auth.schema.js';
import { comparePassword } from '../lib/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ message: 'Email ou senha incorretos' });
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ message: 'Email ou senha incorretos' });
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });

    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ message: 'Refresh token inválido ou expirado' });
    }

    const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return reply.code(401).send({ message: 'Usuário não encontrado' });
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    return reply.send({ accessToken });
  });
}
