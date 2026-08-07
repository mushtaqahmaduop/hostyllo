/**
 * The payments ledger: derived status, exclusive tabs, the mess split and numeric room order.
 *
 * `GET /payments` grew five things the redesigned screen needs, and every one of them is derived
 * rather than stored — which is exactly the kind of thing that drifts silently, because a wrong
 * derivation still returns a well-formed row that typecheck, lint and the schema all accept.
 *
 * What is pinned here, and why each one earns a test:
 *
 *  - **Overdue is computed, not stored.** `payments.status` has no such value and there is no
 *    `due_date` column, so a row is overdue when it still owes money and its billed month is
 *    behind the current one. If that predicate inverts, the screen reports every late payment as
 *    on time — the single most consequential figure on the page.
 *  - **`status` and `tab` mean different things on purpose.** `status` is the stored column and
 *    still returns late rows; the dashboard's "needs attention" lists depend on that. `tab` is the
 *    screen's exclusive bucket, where a late row is `overdue` and *not* `pending`. Collapsing the
 *    two either double-counts the tabs or drops the most urgent rows off the dashboard, and both
 *    failures look like working software.
 *  - **Mess is an extra charge in the database and part of Rent / Mo on the screen.** Left in the
 *    Extra column it is billed once and printed twice.
 *  - **NULL mess and 0.00 mess are different facts** ("no mess" vs "included, zero-rated") —
 *    migration 014 exists to hold that distinction, so the response must not COALESCE it away.
 *  - **`rooms.number` is TEXT**, so ordering it directly puts #14 before #2 under a header that
 *    says "Sorted by Room ascending".
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { HOSTEL_A_ID, OWNER_A_EMAIL, LOGIN_IP, loginAs } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

/**
 * A month no other suite touches, safely in the past. The exact-count assertions below are only
 * meaningful because nothing else writes here; the current-month assertions are scoped by
 * `studentId` instead, since `rent-generate.test.ts` bills hostel A for the current month too.
 */
const PAST = '2025-03';

const ROOM_2  = '0a000900-0000-4000-8000-00000000a902';
const ROOM_14 = '0a000900-0000-4000-8000-00000000a914';
const STU_2   = '0a000901-0000-4000-8000-00000000a902';
const STU_14  = '0a000901-0000-4000-8000-00000000a914';
const PAY_PENDING_LATE = '0a000902-0000-4000-8000-00000000a901';
const PAY_PARTIAL_LATE = '0a000902-0000-4000-8000-00000000a902';
const PAY_VOID_LATE    = '0a000902-0000-4000-8000-00000000a903';
const PAY_MESS_NOW     = '0a000902-0000-4000-8000-00000000a904';
const PAY_ZERO_MESS    = '0a000902-0000-4000-8000-00000000a905';

let app: FastifyInstance;
let pool: Pool;
let token = '';
/** The current month as the endpoint itself defines it — in the hostel's timezone, not the container's. */
let current = '';

interface Row {
  paymentId: string;
  monthKey: string;
  roomNumber: string | null;
  status: string;
  derivedStatus: string;
  rentPkr: number;
  messPkr: number | null;
  rentTotalPkr: number;
  extraChargesPkr: number;
  extraChargesLabel: string | null;
  receiptId: string | null;
}

interface Body {
  data: {
    payments: Row[];
    total: number;
    counts: Record<string, number>;
    summary: null | {
      month: string;
      collectedPkr: number;
      outstandingPkr: number;
      pendingPkr: number;
      transactions: number;
      daysElapsed: number;
      avgPerDayPkr: number;
      previous: { month: string; collectedPkr: number };
    };
  };
}

async function list(query: string): Promise<Body['data']> {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/payments?${query}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.statusCode).toBe(200);
  return (JSON.parse(res.body) as Body).data;
}

async function cleanup() {
  await pool.query(`DELETE FROM public.payment_extra_charges WHERE payment_id = ANY($1::uuid[])`, [
    [PAY_PENDING_LATE, PAY_PARTIAL_LATE, PAY_VOID_LATE, PAY_MESS_NOW, PAY_ZERO_MESS],
  ]);
  await pool.query(`DELETE FROM public.payments WHERE student_id = ANY($1::uuid[])`, [[STU_2, STU_14]]);
  await pool.query(`DELETE FROM public.students WHERE id = ANY($1::uuid[])`, [[STU_2, STU_14]]);
  await pool.query(`DELETE FROM public.rooms WHERE id = ANY($1::uuid[])`, [[ROOM_2, ROOM_14]]);
}

beforeAll(async () => {
  if (!HAS_DB) return;
  const { buildApp } = await import('../app.js');
  ({ pool } = await import('../lib/db.js'));

  await cleanup();

  current = (
    await pool.query(`SELECT to_char((NOW() AT TIME ZONE 'Asia/Karachi')::date, 'YYYY-MM') AS m`)
  ).rows[0].m;

  // 'A-2' and 'A-14': lexically A-14 sorts first, numerically A-2 does. The gap between those two
  // orderings is the whole point of the fixture.
  await pool.query(
    `INSERT INTO public.rooms (id, hostel_id, number, monthly_fee) VALUES ($1, $3, 'A-2', 5000), ($2, $3, 'A-14', 6000)`,
    [ROOM_2, ROOM_14, HOSTEL_A_ID],
  );
  await pool.query(
    `INSERT INTO public.students (id, hostel_id, room_id, name, monthly_fee) VALUES
       ($1, $3, $4, 'Ledger Two', 5000), ($2, $3, $5, 'Ledger Fourteen', 6000)`,
    [STU_2, STU_14, HOSTEL_A_ID, ROOM_2, ROOM_14],
  );

  await pool.query(
    `INSERT INTO public.payments
       (id, hostel_id, student_id, room_id, month, rent, total_due, paid, unpaid, status, receipt_number)
     VALUES
       ($1, $6, $7, $9,  $11::date, 5000, 5000, 0,    5000, 'pending', 'LED-001'),
       ($2, $6, $8, $10, $11::date, 6000, 6000, 2000, 4000, 'partial', 'LED-002'),
       ($3, $6, $7, $9,  $11::date, 5000, 5000, 3000, 0,    'void',    'LED-003'),
       ($4, $6, $7, $9,  $12::date, 5000, 6800, 0,    6800, 'pending', 'LED-004'),
       ($5, $6, $8, $10, $12::date, 6000, 6000, 6000, 0,    'paid',    'LED-005')`,
    [
      PAY_PENDING_LATE, PAY_PARTIAL_LATE, PAY_VOID_LATE, PAY_MESS_NOW, PAY_ZERO_MESS,
      HOSTEL_A_ID, STU_2, STU_14, ROOM_2, ROOM_14, `${PAST}-01`, `${current}-01`,
    ],
  );

  // The mess row rent-generate writes, plus one ordinary extra beside it, so the split has
  // something to separate. And a 0.00 mess line on another payment — "included, zero-rated".
  await pool.query(
    `INSERT INTO public.payment_extra_charges (hostel_id, payment_id, label, amount) VALUES
       ($1, $2, 'Mess', 1500), ($1, $2, 'Laundry', 300), ($1, $3, 'Mess', 0)`,
    [HOSTEL_A_ID, PAY_MESS_NOW, PAY_ZERO_MESS],
  );

  app = await buildApp();
  await app.ready();
  token = await loginAs(app, OWNER_A_EMAIL, LOGIN_IP.paymentsLedger);
});

afterAll(async () => {
  if (!HAS_DB) return;
  await cleanup();
  await app?.close();
});

describe.skipIf(!HAS_DB)('GET /payments — the ledger', () => {
  it('derives overdue from an unpaid past month, without touching the stored status', async () => {
    const { payments } = await list(`month=${PAST}&sort=room&dir=asc`);
    const late = payments.filter((p) => p.status !== 'void');

    expect(late.map((p) => p.derivedStatus)).toEqual(['overdue', 'overdue']);
    // The column still says what it always said — a derived label must not rewrite the record.
    expect(late.map((p) => p.status).sort()).toEqual(['partial', 'pending']);
  });

  it('leaves the current month alone — unpaid is not the same as late', async () => {
    const { payments } = await list(`month=${current}&studentId=${STU_2}`);
    const row = payments.find((p) => p.paymentId === PAY_MESS_NOW);

    expect(row?.status).toBe('pending');
    expect(row?.derivedStatus).toBe('pending');
  });

  it('keeps `status` on stored semantics, so the dashboard still sees the late rows', async () => {
    // The guarantee that lets `tab` be exclusive without narrowing anything the dashboard reads.
    const { payments } = await list(`month=${PAST}&status=pending`);

    expect(payments.map((p) => p.paymentId)).toEqual([PAY_PENDING_LATE]);
    expect(payments[0].derivedStatus).toBe('overdue');
  });

  it('makes `tab` exclusive — a late row is in Overdue and nowhere else', async () => {
    const pending = await list(`month=${PAST}&tab=pending`);
    const overdue = await list(`month=${PAST}&tab=overdue`);

    expect(pending.payments).toHaveLength(0);
    expect(overdue.payments.map((p) => p.paymentId).sort()).toEqual(
      [PAY_PARTIAL_LATE, PAY_PENDING_LATE].sort(),
    );
  });

  it('returns tab counts that sum to the table', async () => {
    const { counts, total } = await list(`month=${PAST}&tab=all`);

    expect(counts).toMatchObject({ paid: 0, partial: 0, pending: 0, overdue: 2, void: 1, all: 3 });
    // The property that makes the tabs trustworthy: no row is counted twice and none is missed.
    expect(counts.paid + counts.partial + counts.pending + counts.overdue + counts.void).toBe(counts.all);
    expect(total).toBe(counts.all);
  });

  it('bills mess inside Rent / Mo and keeps it out of Extra', async () => {
    const { payments } = await list(`month=${current}&studentId=${STU_2}`);
    const row = payments.find((p) => p.paymentId === PAY_MESS_NOW)!;

    expect(row.rentPkr).toBe(5000);
    expect(row.messPkr).toBe(1500);
    expect(row.rentTotalPkr).toBe(6500);
    // 1500 mess + 300 laundry are one INSERT away from both landing here.
    expect(row.extraChargesPkr).toBe(300);
    expect(row.extraChargesLabel).toBe('Laundry');
  });

  it('keeps "no mess" and "zero-rated mess" distinguishable', async () => {
    const past = await list(`month=${PAST}&studentId=${STU_2}`);
    const now = await list(`month=${current}&studentId=${STU_14}`);

    expect(past.payments.find((p) => p.paymentId === PAY_PENDING_LATE)!.messPkr).toBeNull();
    expect(now.payments.find((p) => p.paymentId === PAY_ZERO_MESS)!.messPkr).toBe(0);
  });

  it('sorts rooms numerically, not lexically', async () => {
    const asc = await list(`month=${PAST}&sort=room&dir=asc`);
    const desc = await list(`month=${PAST}&sort=room&dir=desc`);

    // Lexically 'A-14' precedes 'A-2'. A manager reads #2 first.
    expect(asc.payments[0].roomNumber).toBe('A-2');
    expect(desc.payments[0].roomNumber).toBe('A-14');
  });

  it('summarises the month the way the KPI strip reads it', async () => {
    const { summary } = await list(`month=${PAST}`);

    expect(summary).not.toBeNull();
    // 2000 from the partial row. The voided 3000 is money that was returned, not collected.
    expect(summary!.collectedPkr).toBe(2000);
    expect(summary!.outstandingPkr).toBe(9000); // 5000 overdue-from-pending + 4000 overdue-from-partial
    expect(summary!.pendingPkr).toBe(0);        // nothing here is merely pending — it is all late
    expect(summary!.transactions).toBe(2);      // void is not a transaction on this strip
    expect(summary!.daysElapsed).toBe(31);      // a past month is counted whole, not to today
    expect(summary!.previous.month).toBe('2025-02');
  });

  it('reports the month as text, so it cannot shift a day and read as the month before', async () => {
    const { payments } = await list(`month=${PAST}&studentId=${STU_2}`);

    // `paymentMonth` is the DATE, which the driver parses at the server's local midnight: on a
    // host east of UTC it serialises as 2025-02-28T19:00Z and any client formatting it in UTC
    // prints February for a March payment. `monthKey` is the value a client should read.
    expect(payments.every((p) => p.monthKey === PAST)).toBe(true);
  });

  it('has no summary without a month, rather than one labelled with a month it is not', async () => {
    const { summary } = await list(`studentId=${STU_2}`);
    expect(summary).toBeNull();
  });

  /**
   * The receipt endpoint, which had returned 500 to every caller since the day it was written:
   * it joined `beds` on `p.bed_id`, and `payments` has no such column — the bed belongs to the
   * student. The session that built it verified by calling `buildReceiptPdf()` directly with
   * hand-made data, so the renderer was proven and the SQL never ran once.
   *
   * Hence this test asks the *endpoint* for bytes rather than asking the renderer for a document.
   * It lives here because the ledger fixture already has the payments to render.
   */
  it('renders a receipt from a real payment, SQL included', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/${PAY_PARTIAL_LATE}/receipt`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('searches the four fields the placeholder names', async () => {
    const byReceipt = await list(`month=${PAST}&q=LED-002`);
    const byRoom = await list(`month=${PAST}&q=A-2`);

    expect(byReceipt.payments.map((p) => p.paymentId)).toEqual([PAY_PARTIAL_LATE]);
    // Counts follow the search, so the tabs describe what is on screen rather than the whole month.
    expect(byReceipt.counts.all).toBe(1);
    expect(byRoom.payments.every((p) => p.roomNumber === 'A-2')).toBe(true);
  });
});
