/**
 * `notes` must actually be stored.
 *
 * Both POST /payments and PATCH /payments/:id declared `notes` in their JSON Schema, but migration
 * 003 created no column and neither handler referenced one — the INSERT column list stopped at
 * `created_by`. A client could send a note, receive 201, and have it vanish. Same defect class as
 * the `extra_charges` bug fixed in July: in the schema, never persisted.
 *
 * A schema-only promise is invisible to typecheck, lint and every existing test, because nothing
 * fails — the request is accepted and the response is a success. Only reading the value back
 * catches it, which is what these tests do.
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { OWNER_A_EMAIL, HOSTEL_A_STUDENT_ID, LOGIN_IP, loginAs } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

const MONTH = '2026-05';
const RENT = 5500;
const NOTE = 'Paid in two instalments, second by JazzCash';
const EDITED_NOTE = 'Corrected: second instalment was EasyPaisa';

let app: FastifyInstance;
let pool: Pool;
let tokenA = '';
let paymentId = '';

beforeAll(async () => {
  if (!HAS_DB) return;
  const { buildApp } = await import('../app.js');
  ({ pool } = await import('../lib/db.js'));

  await pool.query(
    `DELETE FROM public.payments WHERE student_id = $1 AND date_trunc('month', month) = date_trunc('month', $2::date)`,
    [HOSTEL_A_STUDENT_ID, `${MONTH}-01`],
  );

  app = await buildApp();
  await app.ready();

  tokenA = await loginAs(app, OWNER_A_EMAIL, LOGIN_IP.paymentNotes);
});

afterAll(async () => {
  if (!HAS_DB) return;
  await pool.query(
    `DELETE FROM public.payments WHERE student_id = $1 AND date_trunc('month', month) = date_trunc('month', $2::date)`,
    [HOSTEL_A_STUDENT_ID, `${MONTH}-01`],
  );
  await app?.close();
});

describe.skipIf(!HAS_DB)('payments.notes', () => {
  it('persists a note sent on create, and echoes it back', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments',
      headers: { authorization: `Bearer ${tokenA}`, 'x-idempotency-key': `notes-test-${MONTH}` },
      payload: {
        studentId: HOSTEL_A_STUDENT_ID,
        month: MONTH,
        rent: RENT,
        paid: RENT,
        notes: NOTE,
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json().data.notes).toBe(NOTE);

    paymentId = res.json().data.paymentId;

    // The response could echo the request without storing anything, so check the row itself.
    const row = await pool.query('SELECT notes FROM public.payments WHERE id = $1', [paymentId]);
    expect(row.rows[0].notes, 'the note must reach the payments table').toBe(NOTE);
  });

  it('returns the note from GET /payments/:id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/${paymentId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().data.notes).toBe(NOTE);
  });

  it('lets the owner edit the note through PATCH', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/payments/${paymentId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { notes: EDITED_NOTE },
    });
    expect(res.statusCode, res.body).toBe(200);

    const row = await pool.query('SELECT notes FROM public.payments WHERE id = $1', [paymentId]);
    expect(row.rows[0].notes).toBe(EDITED_NOTE);
  });

  // The UPDATE uses COALESCE, so an edit that does not mention notes must not blank the stored one.
  // This is the failure mode that would quietly destroy the warden's note on every unrelated edit.
  it('leaves the note alone when PATCH omits it', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/payments/${paymentId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { paid: RENT },
    });
    expect(res.statusCode, res.body).toBe(200);

    const row = await pool.query('SELECT notes FROM public.payments WHERE id = $1', [paymentId]);
    expect(row.rows[0].notes, 'an unrelated edit must not erase the note').toBe(EDITED_NOTE);
  });

  it('rejects a note beyond the schema cap with 400, not a 500', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/payments/${paymentId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { notes: 'x'.repeat(1001) },
    });
    expect(res.statusCode, res.body).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });

  it('records the note in the audit trail (INVARIANT-5)', async () => {
    const audit = await pool.query(
      `SELECT new_data FROM public.audit_log
       WHERE entity_id = $1 AND action = 'payment_created'`,
      [paymentId],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].new_data.notes).toBe(NOTE);
  });
});
