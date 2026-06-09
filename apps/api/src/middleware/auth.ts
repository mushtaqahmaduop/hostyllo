import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../lib/jwt.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Missing token' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token) as any;
    request.hostelId = payload.hostelId;
    request.userId = payload.sub;
    request.userRole = payload.role;
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}

export function requireRole(...roles: (string | string[])[]) {
  const flat = roles.flat();
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!flat.includes(request.userRole)) {
      return reply.code(403).send({ success: false, code: 'FORBIDDEN', message: 'Insufficient role' });
    }
  };
}