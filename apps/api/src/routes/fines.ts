import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function finesRoutes(app: FastifyInstance) {

  // GET /fines
  app.get('/fines', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          studentId: { type: 'string', format: 'uuid' },
          isPaid:    { type: 'boolean' },
          limit:     { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:    { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { studentId, isPaid, limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`f.hostel_id = current_setting('app.hostel_id')::uuid`, `f.deleted_at IS NULL`];
      const values: any[] = [];
      let idx = 1;

      if (studentId)          { conditions.push(`f.student_id = $${idx++}::uuid`); values.push(studentId); }
      if (isPaid !== undefined) { conditions.push(`f.is_paid = $${idx++}`); values.push(isPaid); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          f.id as "fineId",
          f.student_id as "studentId",
          s.name as "studentName",
          r.number as "roomNumber",
          f.reason,
          f.amount as "amountPkr",
          f.is_paid as "isPaid",
          f.paid_at as "paidAt",
          f.fine_date as "fineDate",
          f.created_at as "createdAt"
        FROM public.fines f
        JOIN public.students s ON s.id = f.student_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        WHERE ${where}
        ORDER BY f.fine_date DESC, f.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const totals = await db.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(f.amount) FILTER (WHERE NOT f.is_paid), 0) as "unpaidAmountPkr"
        FROM public.fines f WHERE ${where}
      `, values);

      return {
        fines: rows.rows,
        total: parseInt(totals.rows[0].total),
        unpaidAmountPkr: Number(totals.rows[0].unpaidAmountPkr),
        limit: limit ?? 25,
        offset: offset ?? 0,
      };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /fines
  app.post('/fines', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['studentId', 'reason', 'amount'],
        properties: {
          studentId: { type: 'string', format: 'uuid' },
          reason:    { type: 'string', minLength: 1, maxLength: 500 },
          amount:    { type: 'number', exclusiveMinimum: 0 },
          fineDate:  { type: 'string', format: 'date' },
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
      if (student.rows[0].status === 'vacated') return { error: 'FIN_STUDENT_VACATED' };

      const inserted = await db.query(`
        INSERT INTO public.fines (hostel_id, student_id, reason, amount, fine_date, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5)
        RETURNING id, amount, fine_date
      `, [body.studentId, body.reason, body.amount, body.fineDate ?? null, request.userId]);

      // INVARIANT-5: immutable audit trail on financial mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'fine_created', 'fine', $2, $3::jsonb)
      `, [request.userId, inserted.rows[0].id, JSON.stringify({
        student_id: body.studentId,
        reason: body.reason,
        amount: body.amount,
        fine_date: inserted.rows[0].fine_date,
      })]);

      return { data: inserted.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Student not found' });
    if (result.error === 'FIN_STUDENT_VACATED') return reply.status(409).send({ success: false, data: null, code: 'FIN_STUDENT_VACATED', message: 'Student has vacated' });

    return reply.status(201).send({
      success: true,
      data: { fineId: result.data.id, amountPkr: Number(result.data.amount), fineDate: result.data.fine_date },
    });
  });

  // PATCH /fines/:id  (edit, or mark paid/unpaid)
  app.patch('/fines/:id', {
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
          reason:   { type: 'string', minLength: 1, maxLength: 500 },
          amount:   { type: 'number', exclusiveMinimum: 0 },
          isPaid:   { type: 'boolean' },
          fineDate: { type: 'string', format: 'date' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id, reason, amount, is_paid, fine_date FROM public.fines
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };
      const old = existing.rows[0];

      const markingPaid = body.isPaid === true && !old.is_paid;
      const markingUnpaid = body.isPaid === false && old.is_paid;

      await db.query(`
        UPDATE public.fines
        SET reason    = COALESCE($1, reason),
            amount    = COALESCE($2, amount),
            fine_date = COALESCE($3::date, fine_date),
            is_paid   = COALESCE($4, is_paid),
            paid_at   = CASE WHEN $5 THEN NOW() WHEN $6 THEN NULL ELSE paid_at END,
            updated_at = NOW()
        WHERE id = $7
      `, [body.reason ?? null, body.amount ?? null, body.fineDate ?? null, body.isPaid ?? null, markingPaid, markingUnpaid, id]);

      // INVARIANT-5: immutable audit trail on financial mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, 'fine', $3, $4::jsonb, $5::jsonb)
      `, [request.userId, markingPaid ? 'fine_paid' : markingUnpaid ? 'fine_unpaid' : 'fine_updated', id,
        JSON.stringify({ reason: old.reason, amount: Number(old.amount), is_paid: old.is_paid, fine_date: old.fine_date }),
        JSON.stringify({
          reason: body.reason ?? old.reason,
          amount: body.amount ?? Number(old.amount),
          is_paid: body.isPaid ?? old.is_paid,
          fine_date: body.fineDate ?? old.fine_date,
        }),
      ]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Fine not found' });

    return reply.send({ success: true, data: null });
  });

  // DELETE /fines/:id (soft delete)
  app.delete('/fines/:id', {
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
        SELECT id, student_id, amount, is_paid FROM public.fines
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      await db.query(`UPDATE public.fines SET deleted_at = NOW() WHERE id = $1`, [id]);

      // INVARIANT-5: immutable audit trail on financial mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'fine_deleted', 'fine', $2, $3::jsonb)
      `, [request.userId, id, JSON.stringify({
        student_id: existing.rows[0].student_id,
        amount: Number(existing.rows[0].amount),
        is_paid: existing.rows[0].is_paid,
      })]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Fine not found' });

    return reply.send({ success: true, data: null });
  });
}
