import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../lib/jwt.js';
import { redis } from '../lib/redis.js';
import { pool } from '../lib/db.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    hostelId: string;
    userRole: string;
    canEdit: boolean;
    canDelete: boolean;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Missing token' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token) as any;

    // JTI blocklist check — covers logout + password reset invalidation
    const blocked = await redis.exists(`blocklist:${payload.jti}`);
    if (blocked) {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Token revoked' });
    }

    // INVARIANT: Role MUST come from DB, never from JWT payload.
    // JWT role claim is only used as a cache hint — DB is the source of truth.
    const { rows } = await pool.query(
      `SELECT role, can_edit, can_delete, is_active
       FROM public.users
       WHERE id = $1 AND hostel_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [payload.sub, payload.hostelId]
    );

    if (!rows[0] || !rows[0].is_active) {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'User not found or inactive' });
    }

    request.userId    = payload.sub;
    request.hostelId  = payload.hostelId;
    request.userRole  = rows[0].role;       // ← from DB, not JWT
    request.canEdit   = rows[0].can_edit;
    request.canDelete = rows[0].can_delete;
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
