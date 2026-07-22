import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function checkinRoutes(app: FastifyInstance) {

  // GET /checkin
  app.get('/checkin', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          studentId: { type: 'string', format: 'uuid' },
          type:      { type: 'string', enum: ['checkin', 'checkout'] },
          from:      { type: 'string', format: 'date' },
          to:        { type: 'string', format: 'date' },
          limit:     { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:    { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { studentId, type, from, to, limit, offset } = request.query as Record<string, string | undefined>;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`cl.hostel_id = current_setting('app.hostel_id')::uuid`];
      const values: unknown[] = [];
      let idx = 1;

      if (studentId) { conditions.push(`cl.student_id = $${idx++}::uuid`); values.push(studentId); }
      if (type)      { conditions.push(`cl.type = $${idx++}`); values.push(type); }
      if (from)      { conditions.push(`cl.logged_at >= $${idx++}::date`); values.push(from); }
      if (to)        { conditions.push(`cl.logged_at < ($${idx++}::date + INTERVAL '1 day')`); values.push(to); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          cl.id as "entryId",
          cl.student_id as "studentId",
          s.name as "studentName",
          r.number as "roomNumber",
          cl.type,
          cl.note,
          cl.logged_at as "loggedAt"
        FROM public.checkin_log cl
        JOIN public.students s ON s.id = cl.student_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        WHERE ${where}
        ORDER BY cl.logged_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.checkin_log cl WHERE ${where}
      `, values);

      return { entries: rows.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /checkin
  app.post('/checkin', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['studentId', 'type'],
        properties: {
          studentId: { type: 'string', format: 'uuid' },
          type:      { type: 'string', enum: ['checkin', 'checkout'] },
          note:      { type: 'string', maxLength: 500 },
          loggedAt:  { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      const student = await db.query(`
        SELECT id, status FROM public.students
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [body.studentId]);

      if (!student.rows[0]) return { error: 'NOT_FOUND' };
      if (student.rows[0].status === 'vacated') return { error: 'CHK_STUDENT_VACATED' };

      const inserted = await db.query(`
        INSERT INTO public.checkin_log (hostel_id, student_id, type, note, logged_at, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, COALESCE($4::timestamptz, NOW()), $5)
        RETURNING id, type, logged_at
      `, [body.studentId, body.type, body.note ?? null, body.loggedAt ?? null, request.userId]);

      return { data: inserted.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Student not found' });
    if (result.error === 'CHK_STUDENT_VACATED') return reply.status(409).send({ success: false, data: null, code: 'CHK_STUDENT_VACATED', message: 'Student has vacated' });

    return reply.status(201).send({ success: true, data: { entryId: result.data.id, type: result.data.type, loggedAt: result.data.logged_at } });
  });
}
