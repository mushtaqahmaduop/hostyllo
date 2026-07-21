import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function noticesRoutes(app: FastifyInstance) {

  // GET /notices
  app.get('/notices', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          includeExpired: { type: 'boolean', default: false },
          limit:          { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:         { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { includeExpired, limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`n.hostel_id = current_setting('app.hostel_id')::uuid`, `n.deleted_at IS NULL`];
      if (!includeExpired) conditions.push(`(n.expires_at IS NULL OR n.expires_at > NOW())`);

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          n.id as "noticeId",
          n.title,
          n.body,
          n.priority,
          n.expires_at as "expiresAt",
          n.created_at as "createdAt"
        FROM public.notices n
        WHERE ${where}
        ORDER BY
          CASE n.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          n.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.notices n WHERE ${where}
      `);

      return { notices: rows.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /notices
  app.post('/notices', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title:     { type: 'string', minLength: 1, maxLength: 200 },
          body:      { type: 'string', minLength: 1, maxLength: 5000 },
          priority:  { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
          expiresAt: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const inserted = await db.query(`
        INSERT INTO public.notices (hostel_id, title, body, priority, expires_at, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4::timestamptz, $5)
        RETURNING id, priority, expires_at
      `, [body.title, body.body, body.priority ?? 'normal', body.expiresAt ?? null, request.userId]);

      return { data: inserted.rows[0] };
    });

    return reply.status(201).send({
      success: true,
      data: { noticeId: result.data.id, priority: result.data.priority, expiresAt: result.data.expires_at },
    });
  });

  // PATCH /notices/:id
  app.patch('/notices/:id', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
        additionalProperties: false,
      },
      body: {
        type: 'object',
        properties: {
          title:     { type: 'string', minLength: 1, maxLength: 200 },
          body:      { type: 'string', minLength: 1, maxLength: 5000 },
          priority:  { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
          expiresAt: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id FROM public.notices
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      await db.query(`
        UPDATE public.notices
        SET title      = COALESCE($1, title),
            body       = COALESCE($2, body),
            priority   = COALESCE($3, priority),
            expires_at = COALESCE($4::timestamptz, expires_at),
            updated_at = NOW()
        WHERE id = $5
      `, [body.title ?? null, body.body ?? null, body.priority ?? null, body.expiresAt ?? null, id]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Notice not found' });

    return reply.send({ success: true, data: null });
  });

  // DELETE /notices/:id (soft delete)
  app.delete('/notices/:id', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id FROM public.notices
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      await db.query(`UPDATE public.notices SET deleted_at = NOW() WHERE id = $1`, [id]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Notice not found' });

    return reply.send({ success: true, data: null });
  });
}
