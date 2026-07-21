import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function cancellationsRoutes(app: FastifyInstance) {

  // GET /cancellations
  app.get('/cancellations', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'confirmed', 'restored'] },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { status, limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`c.hostel_id = current_setting('app.hostel_id')::uuid`, `c.deleted_at IS NULL`];
      const values: any[] = [];
      let idx = 1;

      if (status) { conditions.push(`c.status = $${idx++}`); values.push(status); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          c.id as "cancellationId",
          c.student_id as "studentId",
          s.name as "studentName",
          r.number as "roomNumber",
          c.reason,
          c.vacate_date as "vacateDate",
          c.status,
          c.confirmed_at as "confirmedAt",
          c.created_at as "createdAt"
        FROM public.cancellations c
        JOIN public.students s ON s.id = c.student_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        WHERE ${where}
        ORDER BY c.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.cancellations c WHERE ${where}
      `, values);

      return { cancellations: rows.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /cancellations
  app.post('/cancellations', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['studentId', 'vacateDate'],
        properties: {
          studentId:  { type: 'string', format: 'uuid' },
          reason:     { type: 'string', maxLength: 500 },
          vacateDate: { type: 'string', format: 'date' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const student = await db.query(`
        SELECT id, status FROM public.students
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [body.studentId]);

      if (!student.rows[0]) return { error: 'NOT_FOUND' };
      if (student.rows[0].status === 'vacated') return { error: 'CAN_STUDENT_VACATED' };

      const existing = await db.query(`
        SELECT id FROM public.cancellations
        WHERE student_id = $1 AND status = 'pending'
          AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [body.studentId]);

      if (existing.rows.length > 0) return { error: 'CAN_ALREADY_PENDING' };

      const inserted = await db.query(`
        INSERT INTO public.cancellations (hostel_id, student_id, reason, vacate_date, status, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, 'pending', $4)
        RETURNING id, status, vacate_date
      `, [body.studentId, body.reason ?? null, body.vacateDate, request.userId]);

      await db.query(`
        UPDATE public.students SET status = 'vacating', updated_at = NOW() WHERE id = $1
      `, [body.studentId]);

      return { data: inserted.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Student not found' });
    if (result.error === 'CAN_STUDENT_VACATED') return reply.status(409).send({ success: false, data: null, code: 'CAN_STUDENT_VACATED', message: 'Student has already vacated' });
    if (result.error === 'CAN_ALREADY_PENDING') return reply.status(409).send({ success: false, data: null, code: 'CAN_ALREADY_PENDING', message: 'A pending cancellation already exists for this student' });

    return reply.status(201).send({ success: true, data: { cancellationId: result.data.id, status: result.data.status, vacateDate: result.data.vacate_date } });
  });

  // POST /cancellations/:id/confirm
  app.post('/cancellations/:id/confirm', {
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
      const cancellation = await db.query(`
        SELECT id, student_id, status FROM public.cancellations
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!cancellation.rows[0]) return { error: 'NOT_FOUND' };
      if (cancellation.rows[0].status !== 'pending') return { error: 'CAN_NOT_PENDING' };

      const studentId = cancellation.rows[0].student_id;

      const student = await db.query(`
        SELECT room_id, bed_id FROM public.students
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid
      `, [studentId]);
      const oldRoomId = student.rows[0]?.room_id ?? null;
      const oldBedId = student.rows[0]?.bed_id ?? null;

      await db.query(`
        UPDATE public.cancellations
        SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = $1, updated_at = NOW()
        WHERE id = $2
      `, [request.userId, id]);

      // Vacate the student and free their bed
      await db.query(`
        UPDATE public.students
        SET status = 'vacated', room_id = NULL, bed_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [studentId]);

      if (oldBedId) {
        await db.query(`UPDATE public.beds SET status = 'vacant', updated_at = NOW() WHERE id = $1`, [oldBedId]);
      }

      // INVARIANT-5: audit sensitive lifecycle changes
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'cancellation_confirmed', 'cancellation', $2, $3::jsonb, $4::jsonb)
      `, [request.userId, id,
        JSON.stringify({ status: 'pending', student_id: studentId, room_id: oldRoomId, bed_id: oldBedId }),
        JSON.stringify({ status: 'confirmed', student_status: 'vacated' }),
      ]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Cancellation not found' });
    if (result.error === 'CAN_NOT_PENDING') return reply.status(409).send({ success: false, data: null, code: 'CAN_NOT_PENDING', message: 'Only pending cancellations can be confirmed' });

    return reply.send({ success: true, data: { status: 'confirmed' } });
  });

  // POST /cancellations/:id/restore
  app.post('/cancellations/:id/restore', {
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
      const cancellation = await db.query(`
        SELECT id, student_id, status FROM public.cancellations
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!cancellation.rows[0]) return { error: 'NOT_FOUND' };
      const prevStatus = cancellation.rows[0].status;
      if (prevStatus === 'restored') return { error: 'CAN_ALREADY_RESTORED' };

      const studentId = cancellation.rows[0].student_id;

      await db.query(`
        UPDATE public.cancellations SET status = 'restored', updated_at = NOW() WHERE id = $1
      `, [id]);

      // Reactivate the student. If the cancellation was already confirmed the
      // bed was freed and may be taken — room/bed must be reassigned manually
      // via POST /rooms/shift.
      await db.query(`
        UPDATE public.students SET status = 'active', updated_at = NOW() WHERE id = $1
      `, [studentId]);

      // INVARIANT-5: audit sensitive lifecycle changes
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'cancellation_restored', 'cancellation', $2, $3::jsonb, $4::jsonb)
      `, [request.userId, id,
        JSON.stringify({ status: prevStatus }),
        JSON.stringify({ status: 'restored', student_status: 'active' }),
      ]);

      return { wasConfirmed: prevStatus === 'confirmed' };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Cancellation not found' });
    if (result.error === 'CAN_ALREADY_RESTORED') return reply.status(409).send({ success: false, data: null, code: 'CAN_ALREADY_RESTORED', message: 'Cancellation is already restored' });

    return reply.send({
      success: true,
      data: {
        status: 'restored',
        note: result.wasConfirmed ? 'Student reactivated without a room/bed — reassign via POST /rooms/shift' : undefined,
      },
    });
  });
}
