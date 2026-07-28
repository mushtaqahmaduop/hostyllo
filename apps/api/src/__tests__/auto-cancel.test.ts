/**
 * Auto-cancellation sweep.
 *
 * The worker this exercises was, until 2026-07-28, broken in a way no typecheck could see: it
 * referenced four columns that do not exist (`cancellations.cancellation_date`,
 * `cancellations.auto_confirmed`, `beds.occupant_id`) and wrote a bed status (`'available'`) that
 * fails the table's CHECK. It also ran three writes with no transaction. Nothing ever enqueued to
 * it, so none of that surfaced.
 *
 * These tests run the sweep function directly rather than through BullMQ — the queue is not the
 * part that was wrong, and there is still no producer to enqueue with.
 *
 * Each test owns a distinct cancellation id, because teardown deliberately never deletes from
 * `audit_log`: that table is INSERT-ONLY and its immutability trigger (INVARIANT-5, migration 006)
 * rejects DELETE. Rows written by one test therefore outlive it, so assertions on audit rows have
 * to be scoped to an id no other test touches.
 *
 * Integration test: needs the seeded test DB (globalSetup). Skips if DATABASE_URL is unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { HOSTEL_A_ID, HOSTEL_B_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

// This suite owns these rows entirely, so it can assert exact end states.
const STUDENT_A = '0a0000c1-0000-4000-8000-00000000c001';
const ROOM_A = '0a0000c2-0000-4000-8000-00000000c002';
const BED_A = '0a0000c3-0000-4000-8000-00000000c003';

const STUDENT_B = '0b0000c1-0000-4000-8000-00000000c001';
const ROOM_B = '0b0000c2-0000-4000-8000-00000000c002';
const BED_B = '0b0000c3-0000-4000-8000-00000000c003';

/** One cancellation id per test — see the note about audit_log above. */
const CANCEL = {
  frees: '0a0000c4-0000-4000-8000-00000000c041',
  audits: '0a0000c4-0000-4000-8000-00000000c042',
  future: '0a0000c4-0000-4000-8000-00000000c043',
  idempotent: '0a0000c4-0000-4000-8000-00000000c044',
  multiTenantA: '0a0000c4-0000-4000-8000-00000000c045',
  multiTenantB: '0b0000c4-0000-4000-8000-00000000c045',
  settled: '0a0000c4-0000-4000-8000-00000000c046',
  noBed: '0a0000c4-0000-4000-8000-00000000c047',
} as const;

const ALL_CANCEL_IDS = Object.values(CANCEL);

let pool: Pool;
let processAutoCancellations: () => Promise<{ confirmed: number; skipped: number }>;

/** Seeds one hostel with a room, an occupied bed, a student in it, and a cancellation. */
async function seedTenant(opts: {
  hostelId: string;
  studentId: string;
  roomId: string;
  bedId: string;
  cancelId: string;
  vacateDate: string;
  status?: string;
}) {
  await pool.query(
    `INSERT INTO public.rooms (id, hostel_id, number, capacity, monthly_fee)
     VALUES ($1, $2, 'C-1', 2, 5000)
     ON CONFLICT (id) DO NOTHING`,
    [opts.roomId, opts.hostelId]
  );
  await pool.query(
    `INSERT INTO public.beds (id, hostel_id, room_id, label, status)
     VALUES ($1, $2, $3, 'Bed C', 'occupied')
     ON CONFLICT (id) DO UPDATE SET status = 'occupied'`,
    [opts.bedId, opts.hostelId, opts.roomId]
  );
  await pool.query(
    `INSERT INTO public.students (id, hostel_id, room_id, bed_id, name, monthly_fee, status)
     VALUES ($1, $2, $3, $4, 'AutoCancel Probe', 5000, 'active')
     ON CONFLICT (id) DO UPDATE
       SET room_id = $3, bed_id = $4, status = 'active', deleted_at = NULL`,
    [opts.studentId, opts.hostelId, opts.roomId, opts.bedId]
  );
  await pool.query(
    `INSERT INTO public.cancellations (id, hostel_id, student_id, vacate_date, status)
     VALUES ($1, $2, $3, $4::date, $5)
     ON CONFLICT (id) DO UPDATE
       SET vacate_date = $4::date, status = $5, confirmed_at = NULL, confirmed_by = NULL, deleted_at = NULL`,
    [opts.cancelId, opts.hostelId, opts.studentId, opts.vacateDate, opts.status ?? 'pending']
  );
}

/**
 * `audit_log` is deliberately absent here. It is INSERT-ONLY and the immutability trigger rejects
 * DELETE outright (INVARIANT-5) — an earlier version of this file tried, and every test after the
 * first one died in `beforeEach`. Leaving the rows is correct; that is what the table is for.
 */
async function cleanup() {
  await pool.query('DELETE FROM public.cancellations WHERE id = ANY($1::uuid[])', [ALL_CANCEL_IDS]);
  await pool.query('DELETE FROM public.students WHERE id = ANY($1::uuid[])', [[STUDENT_A, STUDENT_B]]);
  await pool.query('DELETE FROM public.beds WHERE id = ANY($1::uuid[])', [[BED_A, BED_B]]);
  await pool.query('DELETE FROM public.rooms WHERE id = ANY($1::uuid[])', [[ROOM_A, ROOM_B]]);
}

beforeAll(async () => {
  if (!HAS_DB) return;
  // Privileged pool (postgres) — the worker runs cross-tenant by design (migration 010).
  ({ pool } = await import('../lib/db.js'));
  ({ processAutoCancellations } = await import('../workers/auto-cancel.js'));
});

beforeEach(async () => {
  if (!HAS_DB) return;
  await cleanup();
});

// The pool is shared with every other suite in this serial run, so it is not ended here.
afterAll(async () => {
  if (!HAS_DB) return;
  await cleanup();
});

describe.skipIf(!HAS_DB)('auto-cancel sweep', () => {
  it('confirms a due cancellation, vacates the student and frees the bed', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID,
      studentId: STUDENT_A,
      roomId: ROOM_A,
      bedId: BED_A,
      cancelId: CANCEL.frees,
      vacateDate: '2020-01-01', // comfortably past
    });

    const result = await processAutoCancellations();
    expect(result.confirmed).toBeGreaterThanOrEqual(1);

    const cancellation = await pool.query(
      'SELECT status, confirmed_at, confirmed_by FROM public.cancellations WHERE id = $1',
      [CANCEL.frees]
    );
    expect(cancellation.rows[0].status).toBe('confirmed');
    expect(cancellation.rows[0].confirmed_at).not.toBeNull();
    // NULL confirmed_by on a confirmed row is how an auditor tells this apart from a warden's
    // manual confirmation — it is the signal the dropped `auto_confirmed` column was reaching for.
    expect(cancellation.rows[0].confirmed_by).toBeNull();

    const student = await pool.query(
      'SELECT status, room_id, bed_id FROM public.students WHERE id = $1',
      [STUDENT_A]
    );
    expect(student.rows[0].status).toBe('vacated');
    expect(student.rows[0].room_id).toBeNull();
    expect(student.rows[0].bed_id).toBeNull();

    // The bug that mattered: the bed must actually be released, and to a status its CHECK allows.
    const bed = await pool.query('SELECT status FROM public.beds WHERE id = $1', [BED_A]);
    expect(bed.rows[0].status).toBe('vacant');
  });

  it('writes an audit row for the automatic confirmation (INVARIANT-5)', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID,
      studentId: STUDENT_A,
      roomId: ROOM_A,
      bedId: BED_A,
      cancelId: CANCEL.audits,
      vacateDate: '2020-01-01',
    });

    await processAutoCancellations();

    const audit = await pool.query(
      `SELECT action, entity_type, user_id, old_data, new_data
       FROM public.audit_log WHERE entity_id = $1`,
      [CANCEL.audits]
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].action).toBe('cancellation_auto_confirmed');
    expect(audit.rows[0].entity_type).toBe('cancellation');
    expect(audit.rows[0].user_id).toBeNull();
    // The old state has to carry the bed it freed, or the change is not reversible from the log.
    expect(audit.rows[0].old_data.bed_id).toBe(BED_A);
    expect(audit.rows[0].new_data.student_status).toBe('vacated');
  });

  it('leaves a cancellation whose vacate date has not passed', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID,
      studentId: STUDENT_A,
      roomId: ROOM_A,
      bedId: BED_A,
      cancelId: CANCEL.future,
      vacateDate: '2999-01-01',
    });

    await processAutoCancellations();

    const cancellation = await pool.query('SELECT status FROM public.cancellations WHERE id = $1', [
      CANCEL.future,
    ]);
    expect(cancellation.rows[0].status).toBe('pending');

    const bed = await pool.query('SELECT status FROM public.beds WHERE id = $1', [BED_A]);
    expect(bed.rows[0].status).toBe('occupied');
  });

  it('is idempotent — a second sweep confirms nothing again', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID,
      studentId: STUDENT_A,
      roomId: ROOM_A,
      bedId: BED_A,
      cancelId: CANCEL.idempotent,
      vacateDate: '2020-01-01',
    });

    await processAutoCancellations();
    await processAutoCancellations();

    // Re-running must not write a second audit row or re-vacate an already vacated student.
    const audit = await pool.query('SELECT id FROM public.audit_log WHERE entity_id = $1', [
      CANCEL.idempotent,
    ]);
    expect(audit.rowCount).toBe(1);
  });

  it('sweeps every tenant in one pass, each scoped to its own hostel', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID, studentId: STUDENT_A, roomId: ROOM_A, bedId: BED_A,
      cancelId: CANCEL.multiTenantA, vacateDate: '2020-01-01',
    });
    await seedTenant({
      hostelId: HOSTEL_B_ID, studentId: STUDENT_B, roomId: ROOM_B, bedId: BED_B,
      cancelId: CANCEL.multiTenantB, vacateDate: '2020-01-01',
    });

    await processAutoCancellations();

    for (const [cancelId, bedId, hostelId] of [
      [CANCEL.multiTenantA, BED_A, HOSTEL_A_ID],
      [CANCEL.multiTenantB, BED_B, HOSTEL_B_ID],
    ] as const) {
      const c = await pool.query('SELECT status, hostel_id FROM public.cancellations WHERE id = $1', [cancelId]);
      expect(c.rows[0].status).toBe('confirmed');
      expect(c.rows[0].hostel_id).toBe(hostelId);

      const b = await pool.query('SELECT status FROM public.beds WHERE id = $1', [bedId]);
      expect(b.rows[0].status).toBe('vacant');
    }
  });

  it('does not touch a student whose cancellation is already confirmed', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID, studentId: STUDENT_A, roomId: ROOM_A, bedId: BED_A,
      cancelId: CANCEL.settled, vacateDate: '2020-01-01', status: 'confirmed',
    });

    await processAutoCancellations();

    // Bed stays as seeded: this sweep has no business re-processing a settled cancellation.
    const bed = await pool.query('SELECT status FROM public.beds WHERE id = $1', [BED_A]);
    expect(bed.rows[0].status).toBe('occupied');
    const audit = await pool.query('SELECT id FROM public.audit_log WHERE entity_id = $1', [
      CANCEL.settled,
    ]);
    expect(audit.rowCount).toBe(0);
  });

  it('handles a cancellation for a student with no bed assigned', async () => {
    await seedTenant({
      hostelId: HOSTEL_A_ID, studentId: STUDENT_A, roomId: ROOM_A, bedId: BED_A,
      cancelId: CANCEL.noBed, vacateDate: '2020-01-01',
    });
    await pool.query('UPDATE public.students SET bed_id = NULL WHERE id = $1', [STUDENT_A]);

    await expect(processAutoCancellations()).resolves.toBeDefined();

    const student = await pool.query('SELECT status FROM public.students WHERE id = $1', [STUDENT_A]);
    expect(student.rows[0].status).toBe('vacated');
  });
});
