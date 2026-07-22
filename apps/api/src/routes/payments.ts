import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { calculateUnpaid } from '@hostyllo/db';

export async function paymentsRoutes(app: FastifyInstance) {

  // GET /payments
  app.get('/payments', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          month:     { type: 'string' },
          studentId: { type: 'string', format: 'uuid' },
          status:    { type: 'string', enum: ['paid', 'partial', 'pending', 'void'] },
          limit:     { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:    { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { month, studentId, status, limit, offset } = request.query as Record<string, string | undefined>;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`p.hostel_id = current_setting('app.hostel_id')::uuid`, `p.deleted_at IS NULL`];
      const values: unknown[] = [];
      let idx = 1;

      if (month) { conditions.push(`date_trunc('month', p.month) = date_trunc('month', $${idx++}::date)`); values.push(month + '-01'); }
      if (studentId) { conditions.push(`p.student_id = $${idx++}::uuid`); values.push(studentId); }
      if (status) { conditions.push(`p.status = $${idx++}`); values.push(status); }

      const where = conditions.join(' AND ');

      const payments = await db.query(`
        SELECT
          p.id as "paymentId",
          p.student_id as "studentId",
          s.name as "studentName",
          r.number as "roomNumber",
          p.month as "paymentMonth",
          p.rent as "rentPkr",
          p.admission_fee as "admissionFeePkr",
          p.concession as "concessionPkr",
          p.total_due as "totalDuePkr",
          p.paid as "amountPaidPkr",
          p.unpaid as "unpaidPkr",
          p.status,
          p.payment_method as "paymentMethod",
          p.payment_date as "paymentDate",
          p.receipt_number as "receiptId",
          p.created_at as "createdAt"
        FROM public.payments p
        JOIN public.students s ON s.id = p.student_id
        LEFT JOIN public.rooms r ON r.id = p.room_id
        WHERE ${where}
        ORDER BY p.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.payments p WHERE ${where}
      `, values);

      return { payments: payments.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /payments
  app.post('/payments', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      headers: {
        type: 'object',
        required: ['x-idempotency-key'],
        properties: { 'x-idempotency-key': { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['studentId', 'month', 'rent', 'paid'],
        properties: {
          studentId:    { type: 'string', format: 'uuid' },
          month:        { type: 'string' },
          rent:         { type: 'number', minimum: 0 },
          admission_fee: { type: 'number', minimum: 0, default: 0 },
          concession:   { type: 'number', minimum: 0, default: 0 },
          paid:         { type: 'number', minimum: 0 },
          extra_charges: {
            type: 'array',
            maxItems: 20,
            items: {
              type: 'object',
              required: ['label', 'amount'],
              properties: {
                label:  { type: 'string', minLength: 1, maxLength: 100 },
                amount: { type: 'number', minimum: 0 },
              },
              additionalProperties: false,
            },
          },
          payment_method: { type: 'string', enum: ['cash', 'jazzcash', 'easypaisa', 'bank', 'other'] },
          payment_date: { type: 'string' },
          notes:        { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      studentId: string; month: string; rent: number; paid: number;
      admission_fee?: number; concession?: number;
      payment_method?: string; payment_date?: string;
      extra_charges?: { label: string; amount: number }[];
    };
    const idempotencyKey = request.headers['x-idempotency-key'];

    const result = await withTenant(request.hostelId, async (db) => {
      // Idempotency check
      const existing = await db.query(`
        SELECT id, receipt_number, total_due, paid, unpaid, status
        FROM public.payments
        WHERE idempotency_key = $1 AND hostel_id = current_setting('app.hostel_id')::uuid
      `, [idempotencyKey]);

      if (existing.rows.length > 0) {
        return { cached: true, data: existing.rows[0] };
      }

      // Check student exists and is active
      const student = await db.query(`
        SELECT id, status, room_id FROM public.students
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [body.studentId]);

      if (!student.rows[0]) return { error: 'NOT_FOUND' };
      if (student.rows[0].status === 'vacated') return { error: 'PAY_STUDENT_VACATED' };

      // Check duplicate month
      const dupCheck = await db.query(`
        SELECT id FROM public.payments
        WHERE student_id = $1
          AND date_trunc('month', month) = date_trunc('month', $2::date)
          AND status != 'void'
          AND hostel_id = current_setting('app.hostel_id')::uuid
          AND deleted_at IS NULL
      `, [body.studentId, body.month + '-01']);

      if (dupCheck.rows.length > 0) return { error: 'PAY_DUPLICATE_MONTH' };

      // Get next receipt number
      const receiptResult = await db.query(`SELECT get_next_receipt_number(current_setting('app.hostel_id')::uuid) as receipt_number`);
      const receiptNumber = receiptResult.rows[0].receipt_number;

      const extraCharges: { label: string; amount: number }[] = body.extra_charges ?? [];

      const { totalDue, unpaid, status } = calculateUnpaid(
        body.rent,
        body.admission_fee ?? 0,
        extraCharges.map((c) => c.amount),
        body.concession ?? 0,
        body.paid
      );

      const payment = await db.query(`
        INSERT INTO public.payments (
          hostel_id, student_id, room_id, month, rent, admission_fee,
          concession, total_due, paid, unpaid, status,
          payment_method, payment_date, receipt_number, idempotency_key, created_by
        )
        VALUES (
          current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        RETURNING id, receipt_number, total_due, paid, unpaid, status
      `, [
        body.studentId,
        student.rows[0].room_id,
        body.month + '-01',
        body.rent,
        body.admission_fee ?? 0,
        body.concession ?? 0,
        totalDue,
        body.paid,
        unpaid,
        status,
        body.payment_method ?? null,
        body.payment_date ?? null,
        receiptNumber,
        idempotencyKey,
        request.userId,
      ]);

      const paymentId = payment.rows[0].id;

      for (const charge of extraCharges) {
        await db.query(`
          INSERT INTO public.payment_extra_charges (hostel_id, payment_id, label, amount)
          VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3)
        `, [paymentId, charge.label, charge.amount]);
      }

      // INVARIANT-5: immutable audit trail on every payment mutation
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'payment_created', 'payment', $2, $3::jsonb)
      `, [request.userId, paymentId, JSON.stringify({
        receipt_number: receiptNumber,
        student_id: body.studentId,
        month: body.month,
        rent: body.rent,
        admission_fee: body.admission_fee ?? 0,
        concession: body.concession ?? 0,
        extra_charges: extraCharges,
        total_due: totalDue,
        paid: body.paid,
        unpaid,
        status,
      })]);

      return { cached: false, data: payment.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Student not found' });
    if (result.error === 'PAY_STUDENT_VACATED') return reply.status(409).send({ success: false, data: null, code: 'PAY_STUDENT_VACATED', message: 'Student has vacated' });
    if (result.error === 'PAY_DUPLICATE_MONTH') return reply.status(409).send({ success: false, data: null, code: 'PAY_DUPLICATE_MONTH', message: 'Payment already exists for this student and month' });

    const p = result.data;
    return reply.status(result.cached ? 200 : 201).send({
      success: true,
      data: {
        paymentId: p.id,
        receiptId: p.receipt_number,
        totalDuePkr: p.total_due,
        amountPaidPkr: p.paid,
        unpaidPkr: p.unpaid,
        status: p.status,
      },
    });
  });

  // GET /payments/defaulters
  app.get('/payments/defaulters', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['month'],
        properties: { month: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { month } = request.query as { month: string };

    const result = await withTenant(request.hostelId, async (db) => {
      const defaulters = await db.query(`
        SELECT
          p.student_id as "studentId",
          s.name as "studentName",
          s.phone,
          r.number as "roomNumber",
          p.total_due as "totalDuePkr",
          p.paid as "amountPaidPkr",
          p.unpaid as "unpaidPkr",
          p.status
        FROM public.payments p
        JOIN public.students s ON s.id = p.student_id
        LEFT JOIN public.rooms r ON r.id = p.room_id
        WHERE p.hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', p.month) = date_trunc('month', $1::date)
          AND p.status IN ('pending', 'partial')
          AND p.deleted_at IS NULL
        ORDER BY p.unpaid DESC
      `, [month + '-01']);

      const totals = await db.query(`
        SELECT COALESCE(SUM(unpaid), 0) as "totalUnpaidPkr", COUNT(*) as "totalDefaulters"
        FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', month) = date_trunc('month', $1::date)
          AND status IN ('pending', 'partial')
          AND deleted_at IS NULL
      `, [month + '-01']);

      return {
        defaulters: defaulters.rows,
        totalDefaulters: parseInt(totals.rows[0].totalDefaulters),
        totalUnpaidPkr: parseFloat(totals.rows[0].totalUnpaidPkr),
      };
    });

    return reply.send({ success: true, data: result });
  });

  // GET /payments/summary
  app.get('/payments/summary', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: { month: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { month } = request.query as Record<string, string | undefined>;
    const monthDate = (month ?? new Date().toISOString().slice(0, 7)) + '-01';

    const result = await withTenant(request.hostelId, async (db) => {
      const data = await db.query(`
        SELECT
          COALESCE(SUM(paid) FILTER (WHERE deleted_at IS NULL), 0) as "revenuePkr",
          COALESCE(SUM(unpaid) FILTER (WHERE deleted_at IS NULL), 0) as "pendingPkr",
          COUNT(*) FILTER (WHERE status = 'paid' AND deleted_at IS NULL) as "paidCount",
          COUNT(*) FILTER (WHERE status = 'partial' AND deleted_at IS NULL) as "partialCount",
          COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL) as "pendingCount"
        FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', month) = date_trunc('month', $1::date)
          AND status != 'void'
      `, [monthDate]);

      return { month: monthDate, ...data.rows[0] };
    });

    return reply.send({ success: true, data: result });
  });

  // GET /payments/:id
  app.get('/payments/:id', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
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
      const payment = await db.query(`
        SELECT
          p.id as "paymentId",
          p.student_id as "studentId",
          s.name as "studentName",
          r.number as "roomNumber",
          p.month as "paymentMonth",
          p.rent as "rentPkr",
          p.admission_fee as "admissionFeePkr",
          p.concession as "concessionPkr",
          p.total_due as "totalDuePkr",
          p.paid as "amountPaidPkr",
          p.unpaid as "unpaidPkr",
          p.status,
          p.payment_method as "paymentMethod",
          p.payment_date as "paymentDate",
          p.receipt_number as "receiptId",
          p.void_reason as "voidReason",
          p.created_at as "createdAt"
        FROM public.payments p
        JOIN public.students s ON s.id = p.student_id
        LEFT JOIN public.rooms r ON r.id = p.room_id
        WHERE p.id = $1
          AND p.hostel_id = current_setting('app.hostel_id')::uuid
          AND p.deleted_at IS NULL
      `, [id]);

      return payment.rows[0] ?? null;
    });

    if (!result) return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Payment not found' });

    return reply.send({ success: true, data: result });
  });

  // PATCH /payments/:id
  app.patch('/payments/:id', {
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
          paid:           { type: 'number', minimum: 0 },
          payment_method: { type: 'string' },
          notes:          { type: 'string' },
          voidRequest:    { type: 'boolean' },
          voidReason:     { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      voidRequest?: boolean; voidReason?: string; paid?: number;
      payment_method?: string; payment_date?: string;
    };

    const result = await withTenant(request.hostelId, async (db) => {
      const payment = await db.query(`
        SELECT id, status, rent, admission_fee, concession, paid
        FROM public.payments
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!payment.rows[0]) return { error: 'NOT_FOUND' };
      if (payment.rows[0].status === 'void') return { error: 'PAY_ALREADY_VOID' };

      // Warden can only submit void request
      if (request.userRole === 'warden') {
        if (!body.voidRequest) return { error: 'PAY_VOID_ONLY' };
        await db.query(`
          UPDATE public.payments
          SET void_requested_by = $1, void_reason = $2, updated_at = NOW()
          WHERE id = $3
        `, [request.userId, body.voidReason ?? null, id]);

        // INVARIANT-5: immutable audit trail on every payment mutation
        await db.query(`
          INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
          VALUES (current_setting('app.hostel_id')::uuid, $1, 'payment_void_requested', 'payment', $2, $3::jsonb)
        `, [request.userId, id, JSON.stringify({ void_reason: body.voidReason ?? null })]);

        return { ok: true };
      }

      // Owner: full edit — recalculate with the payment's REAL extra charges
      // (pg returns NUMERIC as strings, so coerce before doing math)
      const p = payment.rows[0];
      const extrasResult = await db.query(`
        SELECT amount FROM public.payment_extra_charges
        WHERE payment_id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid
      `, [id]);
      const extraAmounts = extrasResult.rows.map((r: { amount: string }) => Number(r.amount));

      const newPaid = body.paid ?? Number(p.paid);
      const { totalDue, unpaid, status } = calculateUnpaid(
        Number(p.rent),
        Number(p.admission_fee),
        extraAmounts,
        Number(p.concession),
        newPaid
      );

      await db.query(`
        UPDATE public.payments
        SET paid = $1, unpaid = $2, total_due = $3, status = $4,
            payment_method = COALESCE($5, payment_method),
            updated_at = NOW()
        WHERE id = $6
      `, [newPaid, unpaid, totalDue, status, body.payment_method ?? null, id]);

      // INVARIANT-5: immutable audit trail on every payment mutation
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'payment_updated', 'payment', $2, $3::jsonb, $4::jsonb)
      `, [request.userId, id,
        JSON.stringify({ paid: Number(p.paid), status: p.status }),
        JSON.stringify({ paid: newPaid, unpaid, total_due: totalDue, status, payment_method: body.payment_method ?? null }),
      ]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Payment not found' });
    if (result.error === 'PAY_ALREADY_VOID') return reply.status(409).send({ success: false, data: null, code: 'PAY_ALREADY_VOID', message: 'Payment is already void' });
    if (result.error === 'PAY_VOID_ONLY') return reply.status(403).send({ success: false, data: null, code: 'PAY_VOID_ONLY', message: 'Wardens can only submit void requests' });

    return reply.send({ success: true, data: null });
  });

  // POST /payments/:id/void-confirm
  app.post('/payments/:id/void-confirm', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
        additionalProperties: false,
      },
      body: {
        type: 'object',
        properties: { notes: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      const payment = await db.query(`
        SELECT status, receipt_number, void_reason, void_requested_by FROM public.payments
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!payment.rows[0]) return { error: 'NOT_FOUND' };
      if (payment.rows[0].status === 'void') return { error: 'PAY_ALREADY_VOID' };

      await db.query(`
        UPDATE public.payments SET status = 'void', updated_at = NOW() WHERE id = $1
      `, [id]);

      // INVARIANT-5: immutable audit trail on every payment mutation — records WHO voided
      const p = payment.rows[0];
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'payment_voided', 'payment', $2, $3::jsonb, $4::jsonb)
      `, [request.userId, id,
        JSON.stringify({ status: p.status, receipt_number: p.receipt_number }),
        JSON.stringify({
          status: 'void',
          void_reason: p.void_reason ?? null,
          void_requested_by: p.void_requested_by ?? null,
          notes: body?.notes ?? null,
        }),
      ]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Payment not found' });
    if (result.error === 'PAY_ALREADY_VOID') return reply.status(409).send({ success: false, data: null, code: 'PAY_ALREADY_VOID', message: 'Payment is already void' });

    return reply.send({ success: true, data: { status: 'void' } });
  });

  // POST /payments/generate-monthly
  app.post('/payments/generate-monthly', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        properties: { month: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const monthDate = (body.month ?? new Date().toISOString().slice(0, 7)) + '-01';

    const result = await withTenant(request.hostelId, async (db) => {
      const students = await db.query(`
        SELECT id, room_id, monthly_fee FROM public.students
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND status = 'active' AND deleted_at IS NULL
      `);

      // Find students already billed this month FIRST, so skips don't burn
      // receipt numbers (get_next_receipt_number increments even when the
      // insert conflicts, leaving gaps in the receipt sequence)
      const existing = await db.query(`
        SELECT student_id FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', month) = date_trunc('month', $1::date)
          AND status != 'void' AND deleted_at IS NULL
      `, [monthDate]);
      const alreadyBilled = new Set(existing.rows.map((r: { student_id: string }) => r.student_id));

      let generated = 0;
      let skipped = 0;

      for (const s of students.rows) {
        if (alreadyBilled.has(s.id)) { skipped++; continue; }

        const receiptResult = await db.query(`SELECT get_next_receipt_number(current_setting('app.hostel_id')::uuid) as receipt_number`);
        const receiptNumber = receiptResult.rows[0].receipt_number;

        // pg returns NUMERIC as strings — coerce before doing math
        const { totalDue } = calculateUnpaid(Number(s.monthly_fee), 0, [], 0, 0);

        // Explicit conflict target (uq_payments_student_month, migration 008)
        // as a race-condition backstop for the pre-check above
        const r = await db.query(`
          INSERT INTO public.payments (
            hostel_id, student_id, room_id, month, rent, admission_fee,
            concession, total_due, paid, unpaid, status, receipt_number
          )
          VALUES (
            current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, 0, 0, $5, 0, $5, 'pending', $6
          )
          ON CONFLICT (hostel_id, student_id, month) WHERE status != 'void' AND deleted_at IS NULL DO NOTHING
        `, [s.id, s.room_id, monthDate, Number(s.monthly_fee), totalDue, receiptNumber]);

        if ((r.rowCount ?? 0) > 0) generated++;
        else skipped++;
      }

      // INVARIANT-5: immutable audit trail on every payment mutation
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'payments_generated', 'payment', NULL, $2::jsonb)
      `, [request.userId, JSON.stringify({ month: monthDate, generated, skipped })]);

      return { generated, skipped, month: monthDate };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /payments/:id/send-receipt
  app.post('/payments/:id/send-receipt', {
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
        properties: {},
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await withTenant(request.hostelId, async (db) => {
      const payment = await db.query(`
        SELECT p.receipt_number, p.paid, p.month, p.unpaid, s.name, h.name as hostel_name
        FROM public.payments p
        JOIN public.students s ON s.id = p.student_id
        JOIN public.hostels h ON h.id = p.hostel_id
        WHERE p.id = $1 AND p.hostel_id = current_setting('app.hostel_id')::uuid AND p.deleted_at IS NULL
      `, [id]);

      if (!payment.rows[0]) return { error: 'NOT_FOUND' };

      const p = payment.rows[0];
      const monthLabel = new Date(p.month).toLocaleString('en-PK', { month: 'long', year: 'numeric' });

      return {
        channel: 'copy_paste',
        message: `HOSTYLLO — Receipt ${p.receipt_number}\n\nDear ${p.name},\nPayment received: PKR ${p.paid}\nMonth: ${monthLabel}\nBalance: PKR ${p.unpaid}\n\nThank you!\n— ${p.hostel_name}`,
      };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Payment not found' });

    return reply.send({ success: true, data: result });
  });
}



