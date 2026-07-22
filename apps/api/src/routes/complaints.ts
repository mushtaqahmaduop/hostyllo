import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function complaintsRoutes(app: FastifyInstance) {

  // GET /complaints
  app.get('/complaints', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status:    { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
          studentId: { type: 'string', format: 'uuid' },
          limit:     { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:    { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { status, studentId, limit, offset } = request.query as Record<string, string | undefined>;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`c.hostel_id = current_setting('app.hostel_id')::uuid`, `c.deleted_at IS NULL`];
      const values: unknown[] = [];
      let idx = 1;

      if (status)    { conditions.push(`c.status = $${idx++}`); values.push(status); }
      if (studentId) { conditions.push(`c.student_id = $${idx++}::uuid`); values.push(studentId); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          c.id as "complaintId",
          c.student_id as "studentId",
          s.name as "studentName",
          c.title,
          c.description,
          c.status,
          c.resolved_at as "resolvedAt",
          c.created_at as "createdAt"
        FROM public.complaints c
        LEFT JOIN public.students s ON s.id = c.student_id
        WHERE ${where}
        ORDER BY c.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.complaints c WHERE ${where}
      `, values);

      return { complaints: rows.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /complaints
  app.post('/complaints', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          studentId:   { type: 'string', format: 'uuid' },
          title:       { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      if (body.studentId) {
        const student = await db.query(`
          SELECT id FROM public.students
          WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
        `, [body.studentId]);
        if (!student.rows[0]) return { error: 'NOT_FOUND' };
      }

      const inserted = await db.query(`
        INSERT INTO public.complaints (hostel_id, student_id, title, description, status, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, 'open', $4)
        RETURNING id, status
      `, [body.studentId ?? null, body.title, body.description ?? null, request.userId]);

      return { data: inserted.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Student not found' });

    return reply.status(201).send({ success: true, data: { complaintId: result.data.id, status: result.data.status } });
  });

  // PATCH /complaints/:id
  app.patch('/complaints/:id', {
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
        SELECT id, status FROM public.complaints
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      const resolving = (body.status === 'resolved' || body.status === 'closed')
        && existing.rows[0].status !== 'resolved' && existing.rows[0].status !== 'closed';

      await db.query(`
        UPDATE public.complaints
        SET title       = COALESCE($1, title),
            description = COALESCE($2, description),
            status      = COALESCE($3, status),
            resolved_at = CASE WHEN $4 THEN NOW() ELSE resolved_at END,
            resolved_by = CASE WHEN $4 THEN $5::uuid ELSE resolved_by END,
            updated_at  = NOW()
        WHERE id = $6
      `, [body.title ?? null, body.description ?? null, body.status ?? null, resolving, request.userId, id]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Complaint not found' });

    return reply.send({ success: true, data: null });
  });
}
