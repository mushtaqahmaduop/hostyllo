import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function maintenanceRoutes(app: FastifyInstance) {

  // GET /maintenance
  app.get('/maintenance', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status:   { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          roomId:   { type: 'string', format: 'uuid' },
          limit:    { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:   { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { status, priority, roomId, limit, offset } = request.query as Record<string, string | undefined>;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`m.hostel_id = current_setting('app.hostel_id')::uuid`, `m.deleted_at IS NULL`];
      const values: unknown[] = [];
      let idx = 1;

      if (status)   { conditions.push(`m.status = $${idx++}`); values.push(status); }
      if (priority) { conditions.push(`m.priority = $${idx++}`); values.push(priority); }
      if (roomId)   { conditions.push(`m.room_id = $${idx++}::uuid`); values.push(roomId); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          m.id as "requestId",
          m.room_id as "roomId",
          r.number as "roomNumber",
          m.title,
          m.description,
          m.priority,
          m.status,
          m.resolved_at as "resolvedAt",
          m.created_at as "createdAt"
        FROM public.maintenance_requests m
        LEFT JOIN public.rooms r ON r.id = m.room_id
        WHERE ${where}
        ORDER BY
          CASE m.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          m.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.maintenance_requests m WHERE ${where}
      `, values);

      return { requests: rows.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /maintenance
  app.post('/maintenance', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          roomId:      { type: 'string', format: 'uuid' },
          title:       { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          priority:    { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      if (body.roomId) {
        const room = await db.query(`
          SELECT id FROM public.rooms
          WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
        `, [body.roomId]);
        if (!room.rows[0]) return { error: 'NOT_FOUND' };
      }

      const inserted = await db.query(`
        INSERT INTO public.maintenance_requests (hostel_id, room_id, title, description, priority, status, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, 'open', $5)
        RETURNING id, status, priority
      `, [body.roomId ?? null, body.title, body.description ?? null, body.priority ?? 'medium', request.userId]);

      return { data: inserted.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Room not found' });

    return reply.status(201).send({ success: true, data: { requestId: result.data.id, status: result.data.status, priority: result.data.priority } });
  });

  // PATCH /maintenance/:id
  app.patch('/maintenance/:id', {
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
          title:       { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          priority:    { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status:      { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id, status FROM public.maintenance_requests
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      const resolving = (body.status === 'resolved' || body.status === 'closed')
        && existing.rows[0].status !== 'resolved' && existing.rows[0].status !== 'closed';

      await db.query(`
        UPDATE public.maintenance_requests
        SET title       = COALESCE($1, title),
            description = COALESCE($2, description),
            priority    = COALESCE($3, priority),
            status      = COALESCE($4, status),
            resolved_at = CASE WHEN $5 THEN NOW() ELSE resolved_at END,
            resolved_by = CASE WHEN $5 THEN $6::uuid ELSE resolved_by END,
            updated_at  = NOW()
        WHERE id = $7
      `, [body.title ?? null, body.description ?? null, body.priority ?? null, body.status ?? null, resolving, request.userId, id]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Maintenance request not found' });

    return reply.send({ success: true, data: null });
  });
}
