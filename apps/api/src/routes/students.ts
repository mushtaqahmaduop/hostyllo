import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CAN_OPERATE, CAN_READ, OWNER_ONLY, SENSITIVE_READ } from '../lib/roles.js';
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

// Shared schema fragments. Before these, every :id route passed the raw string straight into a
// uuid column, so `/students/not-a-uuid` produced a Postgres "invalid input syntax for type uuid"
// — a 500 for what is plainly a client error. `status` mirrors the CHECK constraint in migration
// 002 so an invalid value is a 400 here rather than a constraint violation (500) at the DB.
const STUDENT_STATUSES = ['active', 'vacating', 'vacated', 'blacklisted'] as const;

/**
 * Sortable columns, as a whitelist mapping the client's key to a SQL expression.
 *
 * A whitelist rather than interpolating the client's string: ORDER BY cannot be
 * parameterised, so a raw `sort` reaching the query is an injection point. This
 * is the only safe shape.
 *
 * `room` sorts on the room *number*, numerically — the redesigned screen states
 * "Sorted by Room ascending" and a hostel manager means #2 before #14, not
 * lexical order where #14 wins. NULLS LAST on every key so students without a
 * room or a fee sink to the bottom in both directions rather than flooding the
 * first page of an ascending sort.
 */
const SORTABLE: Record<string, string> = {
  name: 's.name',
  room: 'r.number',
  rent: '(s.monthly_fee + COALESCE(s.mess_fee, 0))',
  status: 's.status',
  join_date: 's.join_date',
};

const idParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;

export async function studentRoutes(app: FastifyInstance) {

  // GET /api/v1/students
  // No `maximum` on limit on purpose: the handler already clamps with Math.min(limit, 100), and
  // turning an over-large limit into a 400 would be a silent contract change for existing callers.
  // The schema's job here is the type — `limit=abc` used to reach SQL as NaN and 500.
  app.get('/', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q:       { type: 'string' },
          // 'all' is the roster's default tab and had no representation here: the
          // only way to see every student was four requests, one per status.
          status:  { type: 'string', enum: [...STUDENT_STATUSES, 'all'], default: 'active' },
          room_id: { type: 'string', format: 'uuid' },
          sort:    { type: 'string', enum: ['name', 'room', 'rent', 'status', 'join_date'], default: 'room' },
          dir:     { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          limit:   { type: 'integer', minimum: 1, default: 25 },
          offset:  { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { q, status = 'active', room_id, sort = 'room', dir = 'asc', limit = 25, offset = 0 } =
      request.query as Record<string, string | undefined>;

    const result = await withTenant(request.hostelId, async (db) => {
      let query = `
        SELECT s.id as student_id, s.name as full_name, s.father_name, s.phone,
               s.emergency_contact, s.address, s.status,
               s.room_id, r.number as room_number, r.floor as room_floor,
               r.capacity as room_capacity, b.label as bed_label,
               s.monthly_fee as rent_pkr, s.mess_fee as mess_fee_pkr,
               s.nationality, s.course, s.join_date,
               COALESCE(unpaid.amount, 0) as unpaid_pkr,
               -- NULL when there is genuinely no CNIC on record, rather than a mask for
               -- everyone. The constant meant a roster could not tell "held, hidden" from
               -- "never collected" — and chasing a missing CNIC is the actual task the
               -- column exists to support. The value itself still never leaves the server
               -- except through the audited /students/:id/reveal-cnic endpoint.
               CASE WHEN s.cnic_encrypted IS NULL THEN NULL ELSE 'XXXXX-XXXXXXX-X' END as masked_cnic
        FROM public.students s
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.beds b ON b.id = s.bed_id
        LEFT JOIN (
          SELECT student_id, SUM(unpaid) as amount
          FROM public.payments
          WHERE status != 'void'
          GROUP BY student_id
        ) unpaid ON unpaid.student_id = s.id
        WHERE s.deleted_at IS NULL
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      /*
       * Search spans the fields an operator actually types into a roster search:
       * a name, a father's name, a phone, a room number, a course. Deliberately
       * not CNIC — it is encrypted with a random IV per call, so the ciphertext
       * is non-deterministic and ILIKE against it can never match. (A working
       * CNIC search needs a separate HMAC search-hash column; that is a known
       * open item, not something to fake here.)
       */
      if (q) {
        query += ` AND (
          s.name ILIKE $${paramIndex} OR s.father_name ILIKE $${paramIndex}
          OR s.phone ILIKE $${paramIndex} OR s.course ILIKE $${paramIndex}
          OR r.number::text ILIKE $${paramIndex}
        )`;
        params.push(`%${q}%`);
        paramIndex++;
      }

      if (room_id) {
        query += ` AND s.room_id = $${paramIndex}`;
        params.push(room_id);
        paramIndex++;
      }

      /*
       * The tab counts.
       *
       * Taken from the query as built *so far* — every filter except status —
       * so the four tabs and the table agree on which students are in scope
       * while still each showing their own total. Running it before the status
       * predicate is appended is what makes that true, and is why the predicate
       * is added below rather than with the others: an earlier draft appended it
       * with the rest and then tried to strip it back out with a regex, which
       * silently misnumbered every `$n` after it.
       *
       * One pass, not five requests — five would drift the moment a student is
       * admitted between them.
       */
      const counts = await db.query(
        `SELECT status, COUNT(*)::int AS n FROM (${query}) t GROUP BY status`,
        params,
      );

      // 'all' is a tab, not a status: it drops the predicate rather than matching
      // a value no row holds.
      if (status !== 'all') {
        query += ` AND s.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const countResult = await db.query(`SELECT COUNT(*) FROM (${query}) t`, params);
      const total = parseInt(countResult.rows[0].count);

      // ORDER BY cannot be parameterised, so the column comes from the SORTABLE
      // whitelist and the direction from the schema's two-value enum. Neither is
      // client text by the time it reaches here.
      const column = SORTABLE[sort] ?? SORTABLE.room;
      const direction = dir === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${column} ${direction} NULLS LAST, s.name ASC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Math.min(Number(limit), 100), Number(offset));

      const rows = await db.query(query, params);

      const byStatus: Record<string, number> = { active: 0, vacating: 0, vacated: 0, blacklisted: 0 };
      for (const row of counts.rows) byStatus[row.status] = row.n;

      return {
        students: rows.rows,
        total,
        counts: { ...byStatus, all: Object.values(byStatus).reduce((a, b) => a + b, 0) },
      };
    });

    return reply.send({ success: true, data: { ...result, limit: Number(limit), offset: Number(offset) } });
  });

  // GET /api/v1/students/search
  app.get('/search', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: { q: { type: 'string', minLength: 2 } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { q } = request.query as Record<string, string | undefined>;

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
  /*
   * GET /api/v1/students/:id — the full student record.
   *
   * Two things this endpoint used to get wrong, both fixed here:
   *
   * 1. `SELECT s.*` returned `cnic_encrypted` — the stored ciphertext — to every caller.
   *    The comment on /:id/reveal-cnic below says the value "never leaves the server except
   *    through the audited endpoint", and that was simply not true of this route. Not
   *    catastrophic (it is AES-GCM, useless without the key) but it is the encrypted column
   *    leaving the building on an unaudited call, and `s.*` would have shipped whatever
   *    sensitive column migration 015 adds next. Columns are now listed explicitly, which is
   *    the only shape that stays correct as the table grows.
   *
   * 2. `masked_cnic` was the constant 'XXXXX-XXXXXXX-X' for every student including those
   *    with no CNIC at all — the same defect session 15 fixed on the roster, left behind here.
   *    A record showing a mask over an empty column tells the operator the number is held
   *    when it never was, and chasing a missing CNIC is the actual task this field supports.
   */
  app.get('/:id', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await withTenant(request.hostelId, async (db) => {
      const student = await db.query(`
        SELECT s.id, s.name AS full_name, s.father_name, s.phone, s.emergency_contact,
               s.email, s.address, s.status, s.join_date, s.vacate_date,
               s.monthly_fee, s.mess_fee, s.admission_fee, s.nationality, s.course,
               s.created_at, s.updated_at,
               r.id AS room_id, r.number AS room_number, r.floor AS room_floor,
               r.type AS room_type, r.capacity AS room_capacity,
               r.monthly_fee AS room_default_fee,
               b.id AS bed_id, b.label AS bed_label,
               CASE WHEN s.cnic_encrypted IS NULL THEN NULL ELSE 'XXXXX-XXXXXXX-X' END AS masked_cnic
        FROM public.students s
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.beds b ON b.id = s.bed_id
        WHERE s.id = $1 AND s.deleted_at IS NULL
      `, [id]);

      if (!student.rows[0]) return null;

      /*
       * The full ledger, not the six most recent.
       *
       * The record screen states "Full payment history · N records" and totals it; a capped
       * list makes that sentence a lie and the totals unverifiable against the rows printed
       * beneath them. Void rows stay excluded — a voided payment is money that was never
       * collected, and including it would overstate both the count and the total.
       *
       * Extras are aggregated per payment rather than joined row-wise, because a payment with
       * three extra charges would otherwise appear three times in the history and be counted
       * three times in any total taken over these rows.
       */
      const payments = await db.query(`
        SELECT p.id AS payment_id, p.month AS payment_month, p.status,
               p.rent AS rent_pkr, p.concession AS concession_pkr,
               p.admission_fee AS admission_fee_pkr,
               p.total_due AS total_due_pkr, p.paid AS amount_paid_pkr,
               p.unpaid AS unpaid_pkr,
               p.payment_method, p.payment_date, p.receipt_number AS receipt_id,
               COALESCE(x.extras, '[]'::json) AS extras
        FROM public.payments p
        LEFT JOIN (
          SELECT payment_id, json_agg(json_build_object('label', label, 'amount', amount)
                                      ORDER BY created_at) AS extras
          FROM public.payment_extra_charges
          GROUP BY payment_id
        ) x ON x.payment_id = p.id
        WHERE p.student_id = $1 AND p.status <> 'void' AND p.deleted_at IS NULL
        ORDER BY p.month DESC
      `, [id]);

      /*
       * The four figures on the record's stat tiles, derived in one place.
       *
       * Ported from HOSTIX showViewStudentModal (students.js:365-370), with its two-part
       * "total paid" collapsed into one sum. The desktop app adds paid records to the
       * partially-collected amounts on pending ones, because there `amount` means "collected
       * so far"; here `paid` already carries that for every status, so SUM(paid) over
       * non-void rows is the same number without the special case.
       *
       * `payments_made` counts fully-paid records only, which is the desktop app's definition
       * and the honest one: a pending row with a part payment against it is not a payment made.
       * Summed in SQL so the figure cannot drift from the rows the screen prints, and so the
       * arithmetic happens in NUMERIC rather than a double (INVARIANT-4).
       */
      const totals = await db.query(`
        SELECT COALESCE(SUM(paid), 0)                             AS total_paid_pkr,
               COALESCE(SUM(unpaid), 0)                           AS outstanding_pkr,
               COUNT(*) FILTER (WHERE status = 'paid')::int       AS payments_made,
               COUNT(*)::int                                      AS payments_total
        FROM public.payments
        WHERE student_id = $1 AND status <> 'void' AND deleted_at IS NULL
      `, [id]);

      return { ...student.rows[0], ...totals.rows[0], payments: payments.rows };
    });

    if (!result) {
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: 'Student not found' });
    }

    return reply.send({ success: true, data: result });
  });

  // POST /api/v1/students
  // monthly_fee is `minimum: 0`, not truthy-checked. The previous guard was `!monthly_fee`, which
  // rejected a legitimate fee of 0 (scholarship / free bed) as "Missing required fields" — the
  // column is NUMERIC(10,2) NOT NULL DEFAULT 0, so zero is a valid value the API refused to accept.
  app.post('/', {
    preHandler: [requireAuth, requireRole(CAN_OPERATE)],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'phone', 'room_id', 'bed_id', 'monthly_fee', 'join_date'],
        properties: {
          name:              { type: 'string', minLength: 1, maxLength: 200 },
          father_name:       { type: 'string', maxLength: 200 },
          cnic:              { type: 'string', maxLength: 50 },
          phone:             { type: 'string', minLength: 1, maxLength: 30 },
          emergency_contact: { type: 'string', maxLength: 30 },
          email:             { type: 'string', format: 'email', maxLength: 200 },
          address:           { type: 'string', maxLength: 500 },
          room_id:           { type: 'string', format: 'uuid' },
          bed_id:            { type: 'string', format: 'uuid' },
          monthly_fee:       { type: 'number', minimum: 0 },
          // Nullable on purpose (migration 014): null means mess is not included,
          // 0 means included and zero-rated. `type: ['number','null']` rather than
          // omitting the key, so a client can clear it explicitly.
          mess_fee:          { type: ['number', 'null'], minimum: 0 },
          nationality:       { type: 'string', maxLength: 100 },
          course:            { type: 'string', maxLength: 200 },
          admission_fee:     { type: 'number', minimum: 0, default: 0 },
          join_date:         { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { name, father_name, cnic, phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, mess_fee = null, nationality, course, admission_fee = 0, join_date } = request.body as {
      name?: string; father_name?: string; cnic?: string; phone?: string;
      emergency_contact?: string; email?: string; address?: string;
      room_id?: string; bed_id?: string; monthly_fee?: number; mess_fee?: number | null;
      nationality?: string; course?: string; admission_fee?: number; join_date?: string;
    };

    const result = await withTenant(request.hostelId, async (db) => {
      const bedCheck = await db.query(
        `SELECT id FROM public.students WHERE bed_id = $1 AND deleted_at IS NULL AND status = 'active' LIMIT 1`,
        [bed_id]
      );
      if (bedCheck.rows[0]) throw Object.assign(new Error('Bed occupied'), { code: 'STU_BED_OCCUPIED', status: 409 });

      const row = await db.query(`
        INSERT INTO public.students
          (hostel_id, name, father_name, cnic_encrypted, phone, emergency_contact, email, address,
           room_id, bed_id, monthly_fee, mess_fee, nationality, course, admission_fee, join_date,
           status, created_at, updated_at)
        VALUES
          (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', NOW(), NOW())
        RETURNING id
      `, [name, father_name, cnic ? encryptField(cnic) : null, phone, emergency_contact, email, address, room_id, bed_id, monthly_fee, mess_fee, nationality, course, admission_fee, join_date]);

      // Keep beds.status in step with the assignment. Without this the column is only ever written
      // by /rooms/shift and cancellation-restore, so a student added through the normal flow left
      // their bed marked 'vacant' — which is what the dashboard and /rooms count occupancy from.
      // Double-booking was never possible (the check above reads the students table), but the
      // occupancy KPI was understated by every student ever created, showing 0% on a full hostel.
      if (bed_id) {
        await db.query(
          `UPDATE public.beds SET status = 'occupied', updated_at = NOW()
           WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid`,
          [bed_id]
        );
      }

      return row.rows[0];
    });

    return reply.code(201).send({ success: true, data: { student_id: result.id, name } });
  });

  // PATCH /api/v1/students/:id
  // `status` is constrained to the migration-002 CHECK values. It was previously forwarded raw
  // into UPDATE students SET status = $n, so a bad value became a constraint violation (500)
  // rather than a 400. The allowed-key filter below still gates which columns can be written.
  app.patch('/:id', {
    preHandler: [requireAuth, requireRole(CAN_OPERATE)],
    schema: {
      params: idParam,
      body: {
        type: 'object',
        minProperties: 1,
        properties: {
          name:              { type: 'string', minLength: 1, maxLength: 200 },
          father_name:       { type: 'string', maxLength: 200 },
          phone:             { type: 'string', minLength: 1, maxLength: 30 },
          emergency_contact: { type: 'string', maxLength: 30 },
          email:             { type: 'string', format: 'email', maxLength: 200 },
          address:           { type: 'string', maxLength: 500 },
          monthly_fee:       { type: 'number', minimum: 0 },
          mess_fee:          { type: ['number', 'null'], minimum: 0 },
          nationality:       { type: 'string', maxLength: 100 },
          course:            { type: 'string', maxLength: 200 },
          status:            { type: 'string', enum: [...STUDENT_STATUSES] },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    /*
     * A second whitelist behind the JSON Schema, because this list is what gets
     * interpolated into the SET clause. The schema already rejects unknown keys;
     * this is the layer that would still hold if `additionalProperties` were ever
     * relaxed, and it is one line to keep.
     *
     * Note `room_id` is deliberately absent. Moving a student between rooms goes
     * through /rooms/shift, which also reassigns the bed and rewrites their
     * pending payments — the legacy Electron app let Edit change the room and
     * silently left the rent at the old room's rate, which is a bug worth not
     * reproducing.
     */
    const allowed = ['name', 'father_name', 'phone', 'emergency_contact', 'email', 'address', 'monthly_fee', 'mess_fee', 'nationality', 'course', 'status'];
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
  app.delete('/:id', {
    preHandler: [requireAuth, requireRole(OWNER_ONLY)],
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await withTenant(request.hostelId, async (db) => {
      const unpaid = await db.query(
        `SELECT id FROM public.payments WHERE student_id = $1 AND status IN ('pending','partial') AND deleted_at IS NULL LIMIT 1`,
        [id]
      );
      if (unpaid.rows[0]) throw Object.assign(new Error('Pending payments'), { code: 'STU_PENDING_PAYMENTS', status: 409 });

      const removed = await db.query(
        `UPDATE public.students SET deleted_at = NOW(), status = 'vacated', updated_at = NOW()
         WHERE id = $1 RETURNING bed_id`,
        [id]
      );

      // Release the bed, mirroring the assignment on create. Without this the bed stays
      // 'occupied' forever and occupancy drifts upward instead of down.
      const freedBedId = removed.rows[0]?.bed_id;
      if (freedBedId) {
        await db.query(
          `UPDATE public.beds SET status = 'vacant', updated_at = NOW()
           WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid`,
          [freedBedId]
        );
      }
    });

    return reply.send({ success:true, data: null });
  });

  // GET /api/v1/students/:id/reveal-cnic
  // Explicit, audited CNIC reveal — never returned by any list/detail endpoint.
  app.get('/:id/reveal-cnic', {
    preHandler: [requireAuth, requireRole(SENSITIVE_READ)],
    schema: { params: idParam },
  }, async (request, reply) => {
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
  app.post('/import', { preHandler: [requireAuth, requireRole(CAN_OPERATE)] }, async (request, reply) => {
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