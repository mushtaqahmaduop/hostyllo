import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function studentRoutes(app: FastifyInstance) {

  // GET /api/v1/students
  app.get('/', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner', 'super_admin')] }, async (request, reply) => {
    const { q, status = 'active', room_id, limit = 25, offset = 0 } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      let query = `
        SELECT s.id as student_id, s.name as full_name, s.phone, s.status,
               s.room_id, r.number as room_number, b.label as bed_label,
               s.monthly_fee as rent_pkr, s.join_date,
               COALESCE(unpaid.amount, 0) as unpaid_pkr,
               'XXXXX-XXXXXXX-X' as masked_cnic
        FROM public.students s
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.beds b ON b.id = s.bed_id
        LEFT JOIN (
          SELECT student_id, SUM(unpaid) as amount
          FROM public.payments
          WHERE status != 'void'
          GROUP BY student_id
        ) unpaid ON unpaid.student_id = s.id
        WHERE s.deleted_at IS NULL AND s.status = $1
      `;
      const params: any[] = [status];
      let paramIndex = 2;

      if (q) {
        query += ` AND (s.name ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex})`;
        params.push(`%${q}%`);
        paramIndex++;
      }

      if (room_id) {
        query += ` AND s.room_id = $${paramIndex}`;
        params.push(room_id);
        paramIndex++;
      }

      const countResult = await db.query(`SELECT COUNT(*) FROM (${query}) t`, params);
      const total = parseInt(countResult.rows[0].count);

      query += ` ORDER BY s.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Math.min(Number(limit), 100), Number(offset));

      const rows = await db.query(query, params);
      return { students: rows.rows, total };
    });

    return reply.send({ success: true, data: { ...result, limit: Number(limit), offset: Number(offset) } });
  });

  // GET /api/v1/students/search
  app.get('/search', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner', 'super_admin')] }, async (request, reply) => {
    const { q } = request.query as any;
    if (!q || q.length < 2) {
      return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR', message: 'q must be at least 2 characters' });
    }

    const result = await withTenant(request.hostelId, async (db) => {
      const rows = await db.query(`
        SELECT s.id as student_id, s.name as full_name, r.number as room_number,
               s.monthly_fee as rent_pkr, s.status,
               COALESCE(unpaid.amount, 0) as unpaid_pkr
        FROM public.students s
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN (
          SELECT student_id, SUM(unpaid) as amount
          FROM public.payments WHERE status != 'void'
          GROUP BY student_id
        ) unpaid ON unpaid.student_id = s.id
        WHERE s.deleted_at IS NULL
          AND (s.name ILIKE $1 OR s.phone ILIKE $1)
        LIMIT 5
      `, [`%${q}%`]);
      return rows.rows;
    });

    return reply.send({ success: true, data: { students: result } });
  });

  // GET /api/v1/students/:id
  app.get('/:id', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const student = await db.query(`
        SELECT s.*, s.name as full_name, r.number as room_number, b.label as bed_label,
               'XXXXX-XXXXXXX-X' as masked_cnic
        FROM public.students s
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.beds b ON b.id = s.bed_id
        WHERE s.id = $1 AND s.deleted_at IS NULL
      `, [id]);

      if (!student.rows[0]) return null;

      const payments = await db.query(`
        SELECT id as payment_id, month as payment_month, status, paid as amount_paid_pkr, receipt_number as receipt_id
        FROM public.payments
        WHERE student_id = $1 AND status != 'void'
        ORDER BY month DESC LIMIT 6
      `, [id]);

      return { ...student.rows[0], recent_payments: payments.rows };
    });

    if (!result) {
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: 'Student not found' });
    }

    return reply.send({ success: true, data: result });
  });

  // POST /api/v1/students
  app.post('/', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner', 'super_admin')] }, async (request, reply) => {
    const body = request.body as any;
    const { name, father_name, cnic, phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, admission_fee = 0, join_date } = body;

    if (!name || !phone || !room_id || !bed_id || !monthly_fee || !join_date) {
      return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR', message: 'Missing required fields' });
    }

    const result = await withTenant(request.hostelId, async (db) => {
      const bedCheck = await db.query(
        `SELECT id FROM public.students WHERE bed_id = $1 AND deleted_at IS NULL AND status = 'active' LIMIT 1`,
        [bed_id]
      );
      if (bedCheck.rows[0]) throw Object.assign(new Error('Bed occupied'), { code: 'STU_BED_OCCUPIED', status: 409 });

      const row = await db.query(`
        INSERT INTO public.students
          (hostel_id, name, father_name, cnic_encrypted, phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, admission_fee, join_date, status, created_at, updated_at)
        VALUES
          (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())
        RETURNING id
      `, [name, father_name, cnic || '', phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, admission_fee, join_date]);

      return row.rows[0];
    });

    return reply.code(201).send({ success: true, data: { student_id: result.id, name } });
  });

  // PATCH /api/v1/students/:id
  app.patch('/:id', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    const allowed = ['name', 'father_name', 'phone', 'emergency_contact', 'email', 'address', 'monthly_fee', 'status'];
    const updates = Object.keys(body).filter(k => allowed.includes(k));

    if (updates.length === 0) {
      return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR', message: 'No valid fields to update' });
    }

    await withTenant(request.hostelId, async (db) => {
      const setClauses = updates.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = updates.map(k => body[k]);
      await db.query(
        `UPDATE public.students SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id, ...values]
      );
    });

    return reply.send({ success: true, data: null });
  });

  // DELETE /api/v1/students/:id
  app.delete('/:id', { preHandler: [requireAuth, requireRole('hostel_owner', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as any;

    await withTenant(request.hostelId, async (db) => {
      const unpaid = await db.query(
        `SELECT id FROM public.payments WHERE student_id = $1 AND status IN ('pending','partial') AND deleted_at IS NULL LIMIT 1`,
        [id]
      );
      if (unpaid.rows[0]) throw Object.assign(new Error('Pending payments'), { code: 'STU_PENDING_PAYMENTS', status: 409 });

      await db.query(
        `UPDATE public.students SET deleted_at = NOW(), status = 'vacated', updated_at = NOW() WHERE id = $1`,
        [id]
      );
    });

    return reply.send({ success:true, data: null });
  });
}