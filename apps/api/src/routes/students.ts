import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { encryptField, decryptField, isEncrypted } from '../lib/crypto.js';

interface PreviewRow {
  row: number;
  fullName: string;
  cnic: string | null;
  fatherName: string | null;
  phone: string | null;
  monthlyFee: number;
  joinDate: string | null;
  valid: boolean;
  errors?: string[];
}

export async function studentRoutes(app: FastifyInstance) {

  // GET /api/v1/students
  app.get('/', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner')] }, async (request, reply) => {
    const { q, status = 'active', room_id, limit = 25, offset = 0 } = request.query as Record<string, string | undefined>;

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
      const params: unknown[] = [status];
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
  app.get('/search', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner')] }, async (request, reply) => {
    const { q } = request.query as Record<string, string | undefined>;
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
  app.get('/:id', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

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
  app.post('/', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner')] }, async (request, reply) => {
    const { name, father_name, cnic, phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, admission_fee = 0, join_date } = request.body as {
      name?: string; father_name?: string; cnic?: string; phone?: string;
      emergency_contact?: string; email?: string; address?: string;
      room_id?: string; bed_id?: string; monthly_fee?: number; admission_fee?: number; join_date?: string;
    };

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
      `, [name, father_name, cnic ? encryptField(cnic) : null, phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, admission_fee, join_date]);

      return row.rows[0];
    });

    return reply.code(201).send({ success: true, data: { student_id: result.id, name } });
  });

  // PATCH /api/v1/students/:id
  app.patch('/:id', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

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
  app.delete('/:id', { preHandler: [requireAuth, requireRole('hostel_owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

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

  // GET /api/v1/students/:id/reveal-cnic
  // Explicit, audited CNIC reveal — never returned by any list/detail endpoint.
  app.get('/:id/reveal-cnic', { preHandler: [requireAuth, requireRole('hostel_owner', 'chain_manager')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await withTenant(request.hostelId, async (db) => {
      const student = await db.query(`
        SELECT cnic_encrypted FROM public.students
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!student.rows[0]) return { error: 'NOT_FOUND' };

      // INVARIANT-5: every CNIC reveal is audited with the acting user
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'cnic_revealed', 'student', $2, $3::jsonb)
      `, [request.userId, id, JSON.stringify({ cnicRevealed: true })]);

      // Decrypt for the reveal. Legacy plaintext rows (pre-encryption) are returned as-is so a
      // pending backfill doesn't break reveal — see scripts/backfill-cnic.mjs.
      const stored: string | null = student.rows[0].cnic_encrypted;
      const cnic = stored ? (isEncrypted(stored) ? decryptField(stored) : stored) : null;
      return { cnic };
    });

    if (result.error === 'NOT_FOUND') return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: 'Student not found' });

    return reply.send({ success: true, data: { cnic: result.cnic } });
  });

  // POST /api/v1/students/import — bulk CSV import with preview/confirm
  app.post('/import', { preHandler: [requireAuth, requireRole('warden', 'hostel_owner', 'chain_manager')] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ success: false, code: 'IMPORT_INVALID_FILE', message: 'No CSV file uploaded' });
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      return reply.code(400).send({ success: false, code: 'IMPORT_TOO_LARGE', message: 'File exceeds 2MB limit' });
    }

    const confirmField = file.fields?.confirm as { value?: string } | Array<{ value?: string }> | undefined;
    const confirm = (Array.isArray(confirmField) ? confirmField[0]?.value : confirmField?.value) === 'true';

    const rows = parseCsv(buffer.toString('utf8'));
    if (rows.length < 2) {
      return reply.code(400).send({ success: false, code: 'IMPORT_INVALID_FILE', message: 'CSV must have a header row and at least one data row' });
    }

    // Header mapping — tolerant of spacing/case ("Full Name" / full_name / fullName)
    const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    const col = (names: string[]) => header.findIndex(h => names.includes(h));
    const nameIdx = col(['name', 'fullname', 'studentname']);
    const fatherIdx = col(['fathername', 'father']);
    const cnicIdx = col(['cnic']);
    const phoneIdx = col(['phone', 'mobile', 'contact']);
    const feeIdx = col(['monthlyfee', 'fee', 'rent', 'rentpkr']);
    const joinIdx = col(['joindate', 'joined', 'admissiondate']);

    if (nameIdx === -1) {
      return reply.code(400).send({ success: false, code: 'IMPORT_INVALID_FILE', message: 'CSV must contain a name/fullName column' });
    }

    const CNIC_RE = /^\d{5}-\d{7}-\d$|^\d{13}$/;
    const preview: PreviewRow[] = [];
    let validRows = 0;

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].map(sanitizeCell);
      const fullName = (cells[nameIdx] ?? '').trim();
      const cnic = cnicIdx !== -1 ? (cells[cnicIdx] ?? '').trim() : '';
      const fee = feeIdx !== -1 ? (cells[feeIdx] ?? '').trim() : '';
      const errors: string[] = [];

      if (!fullName) errors.push('name required');
      if (cnic && !CNIC_RE.test(cnic)) errors.push('invalid CNIC format');
      if (fee && (isNaN(Number(fee)) || Number(fee) < 0)) errors.push('invalid monthly fee');

      const valid = errors.length === 0;
      if (valid) validRows++;
      preview.push({
        row: i,
        fullName,
        cnic: cnic || null,
        fatherName: fatherIdx !== -1 ? (cells[fatherIdx] ?? '').trim() || null : null,
        phone: phoneIdx !== -1 ? (cells[phoneIdx] ?? '').trim() || null : null,
        monthlyFee: fee ? Number(fee) : 0,
        joinDate: joinIdx !== -1 ? (cells[joinIdx] ?? '').trim() || null : null,
        valid,
        ...(valid ? {} : { errors }),
      });
    }

    if (!confirm) {
      return reply.send({
        success: true,
        data: {
          preview: preview.map(({ row, fullName, cnic, valid, errors }) => ({ row, fullName, cnic, valid, ...(errors ? { errors } : {}) })),
          validRows,
          invalidRows: preview.length - validRows,
          totalRows: preview.length,
        },
      });
    }

    const result = await withTenant(request.hostelId, async (db) => {
      // Trial plan cap: 30 students total
      const hostel = await db.query(`
        SELECT plan_status FROM public.hostels WHERE id = current_setting('app.hostel_id')::uuid
      `);
      if (hostel.rows[0]?.plan_status === 'trial') {
        const count = await db.query(`
          SELECT COUNT(*) as total FROM public.students
          WHERE hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
        `);
        if (parseInt(count.rows[0].total) + validRows > 30) return { error: 'TRIAL_STUDENT_LIMIT' };
      }

      let imported = 0;
      const failures: { row: number; reason: string }[] = [];

      for (const r of preview) {
        if (!r.valid) {
          failures.push({ row: r.row, reason: (r.errors ?? []).join(', ') });
          continue;
        }
        try {
          await db.query(`
            INSERT INTO public.students
              (hostel_id, name, father_name, cnic_encrypted, phone, monthly_fee, join_date, status)
            VALUES
              (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), 'active')
          `, [r.fullName, r.fatherName, r.cnic ? encryptField(r.cnic) : null, r.phone, r.monthlyFee, r.joinDate]);
          imported++;
        } catch {
          failures.push({ row: r.row, reason: 'Database insert failed' });
        }
      }

      // INVARIANT-5: audit bulk imports
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'students_imported', 'student', NULL, $2::jsonb)
      `, [request.userId, JSON.stringify({ imported, failed: failures.length, totalRows: preview.length })]);

      return { data: { imported, failed: failures.length, failures } };
    });

    if (result.error === 'TRIAL_STUDENT_LIMIT') {
      return reply.code(402).send({ success: false, code: 'TRIAL_STUDENT_LIMIT', message: 'Import would exceed the 30-student trial limit' });
    }

    return reply.send({ success: true, data: result.data });
  });
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

// Strip formula-injection prefixes (= + - @) so exported cells can't execute
// in Excel/Sheets, per spec for POST /students/import
function sanitizeCell(cell: string | undefined): string {
  if (!cell) return '';
  return cell.replace(/^[=+\-@\s]+/, '').trim();
}

// Minimal RFC-4180 CSV parser: quoted fields, escaped quotes, CRLF/LF
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}