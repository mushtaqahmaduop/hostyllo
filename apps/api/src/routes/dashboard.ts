import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CAN_READ } from '../lib/roles.js';

/**
 * Dashboard endpoints, ported from `HOSTIX-APP/renderer/src/modules/dashboard.js`.
 *
 * Every figure here traces to a computation that module has run at 50+ hostels. Nothing is
 * approximated and nothing is projected — where a number cannot be derived from what is on
 * disk, there is no endpoint for it and the screen must render an empty state instead. That
 * rule exists because the previous dashboard shipped a hardcoded room-type split and an
 * invented 101–408 seat map, which are indistinguishable from real figures once rendered.
 *
 * ── Schema mapping, HOSTIX → Hostyllo ────────────────────────────────────────────────────
 *   DB.transfers            → owner_transfers (amount, transfer_date)
 *   DB.maintenance          → maintenance_requests (status open|in_progress|resolved|closed)
 *   DB.complaints           → complaints        (same status set)
 *   DB.cancellations        → cancellations     (status pending|confirmed|restored)
 *   DB.settings.roomTypes   → denormalised onto `rooms` (type, capacity, color, monthly_fee);
 *                             there is no room_types table, so the split groups by rooms.type
 *   getRoomOccupancy(room)  → COUNT(students WHERE room_id = r.id AND status='active')
 *
 * ── Two deliberate fidelity choices ──────────────────────────────────────────────────────
 * 1. Seats come from SUM(rooms.capacity) and occupancy from students.room_id, exactly as
 *    dashboard.js:128-131 computes them. Hostyllo also has a `beds` table that HOSTIX has no
 *    equivalent for; using it here would silently diverge from the legacy figure whenever the
 *    two disagree. `bedsTotal`/`bedsOccupied` are returned alongside so the divergence is
 *    visible rather than hidden.
 * 2. Money arithmetic stays in Postgres on NUMERIC (INVARIANT-4). NUMERIC and int8 are parsed
 *    to JS numbers at the driver (`withTenant.ts:27-28`), so no parseInt/parseFloat here.
 */
export async function dashboardRoutes(app: FastifyInstance) {

  /** Occupancy below this is an alert. dashboard.js:100 — `if (occRate < 60)`. */
  const LOW_OCCUPANCY_PCT = 60;

  /** Statuses that mean "not yet dealt with". dashboard.js:87-88 filters HOSTIX's 'Open'. */
  const UNRESOLVED = ['open', 'in_progress'];

  const monthParam = {
    type: 'object',
    properties: { month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' } },
    additionalProperties: false,
  } as const;

  /** Resolve `?month=YYYY-MM` to a first-of-month date, defaulting to the current month. */
  function resolveMonth(query: unknown): string {
    const { month } = (query ?? {}) as { month?: string };
    return (month ?? new Date().toISOString().slice(0, 7)) + '-01';
  }

  // ── GET /dashboard/stats ───────────────────────────────────────────────────────────────
  // Ports the KPI block, dashboard.js:110-133.
  app.get('/dashboard/stats', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: { querystring: monthParam },
  }, async (request, reply) => {
    const monthDate = resolveMonth(request.query);

    const result = await withTenant(request.hostelId, async (db) => {
      const data = await db.query(`
        WITH
        -- Revenue is the single source of truth in HOSTIX (dashboard.js:13-23): money actually
        -- collected, which is what the paid column holds; a partial payment contributes its paid part.
        -- Void payments are excluded; HOSTIX has no void state, so this is a SaaS-only addition.
        pay AS (
          SELECT
            COALESCE(SUM(paid), 0)                                            AS revenue,
            COALESCE(SUM(unpaid) FILTER (WHERE status IN ('pending','partial')), 0) AS pending,
            COUNT(*) FILTER (WHERE status IN ('pending','partial'))            AS pending_count,
            COUNT(*) FILTER (WHERE status = 'paid')                            AS paid_count
          FROM public.payments
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND date_trunc('month', month) = date_trunc('month', $1::date)
            AND status <> 'void'
            AND deleted_at IS NULL
        ),
        exp AS (
          SELECT COALESCE(SUM(amount), 0) AS expenses
          FROM public.expenses
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND date_trunc('month', expense_date) = date_trunc('month', $1::date)
            AND deleted_at IS NULL
        ),
        -- dashboard.js:115 — transfers out are deducted from profit but NOT from revenue.
        trf AS (
          SELECT COALESCE(SUM(amount), 0) AS transfers
          FROM public.owner_transfers
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND date_trunc('month', transfer_date) = date_trunc('month', $1::date)
            AND deleted_at IS NULL
        ),
        stu AS (
          SELECT
            COUNT(*)                                    AS active_students,
            COUNT(*) FILTER (WHERE room_id IS NOT NULL) AS seated_students
          FROM public.students
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND status = 'active' AND deleted_at IS NULL
        ),
        -- dashboard.js:110-112, 128: room and seat counts derived from rooms + their occupants.
        rm AS (
          SELECT
            COUNT(*)                                         AS total_rooms,
            COUNT(*) FILTER (WHERE occ > 0)                   AS occupied_rooms,
            COUNT(*) FILTER (WHERE occ = 0)                   AS vacant_rooms,
            COALESCE(SUM(capacity), 0)                        AS total_seats,
            COALESCE(SUM(occ), 0)                             AS filled_seats,
            COALESCE(SUM(GREATEST(capacity - occ, 0)) FILTER (WHERE occ > 0), 0)
                                                              AS seats_free_in_occupied_rooms
          FROM (
            SELECT r.capacity, (
              SELECT COUNT(*) FROM public.students s
              WHERE s.room_id = r.id AND s.status = 'active' AND s.deleted_at IS NULL
            ) AS occ
            FROM public.rooms r
            WHERE r.hostel_id = current_setting('app.hostel_id')::uuid
              AND r.deleted_at IS NULL AND r.is_active
          ) q
        ),
        -- Returned for comparison only; see the fidelity note in the file header.
        bd AS (
          SELECT COUNT(*) AS beds_total, COUNT(*) FILTER (WHERE status='occupied') AS beds_occupied
          FROM public.beds WHERE hostel_id = current_setting('app.hostel_id')::uuid
        )
        SELECT
          pay.revenue                                   AS "revenuePkr",
          pay.pending                                   AS "pendingPkr",
          pay.pending_count                             AS "pendingCount",
          pay.paid_count                                AS "paidCount",
          exp.expenses                                  AS "expensesPkr",
          trf.transfers                                 AS "transfersPkr",
          pay.revenue + pay.pending                     AS "totalExpectedPkr",
          -- dashboard.js:125 — netProfit = collected - expenses - transfers. The previous
          -- implementation omitted transfers entirely, overstating profit by every rupee the
          -- owner had withdrawn that month.
          pay.revenue - exp.expenses - trf.transfers    AS "netProfitPkr",
          stu.active_students                           AS "activeStudents",
          stu.seated_students                           AS "seatedStudents",
          rm.total_rooms                                AS "totalRooms",
          rm.occupied_rooms                             AS "occupiedRooms",
          rm.vacant_rooms                               AS "vacantRooms",
          rm.total_seats                                AS "totalSeats",
          rm.filled_seats                               AS "filledSeats",
          rm.total_seats - rm.filled_seats              AS "availableSeats",
          rm.seats_free_in_occupied_rooms               AS "seatsFreeInOccupiedRooms",
          CASE WHEN rm.total_seats > 0
            THEN ROUND((rm.filled_seats::numeric / rm.total_seats) * 100, 1) ELSE 0 END
                                                        AS "occupancyPct",
          bd.beds_total                                 AS "bedsTotal",
          bd.beds_occupied                              AS "bedsOccupied"
        FROM pay, exp, trf, stu, rm, bd
      `, [monthDate]);

      return { month: monthDate.slice(0, 7), ...data.rows[0] };
    });

    return reply.send({ success: true, data: result });
  });

  // ── GET /dashboard/alerts ──────────────────────────────────────────────────────────────
  // Ports the alert strip, dashboard.js:85-108 + the pending-cancellation banner :182-192.
  // Every count below was previously a hardcoded 0.
  app.get('/dashboard/alerts', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
  }, async (request, reply) => {

    const result = await withTenant(request.hostelId, async (db) => {
      // dashboard.js:86 counts ALL pending payments, not just this month's — an unpaid due from
      // March is still uncollected money in August.
      const pending = await db.query(`
        SELECT COUNT(*) AS count, COALESCE(SUM(unpaid), 0) AS uncollected
        FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND status IN ('pending','partial') AND deleted_at IS NULL
      `);

      const voids = await db.query(`
        SELECT COUNT(*) AS count FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND void_requested_by IS NOT NULL AND status <> 'void' AND deleted_at IS NULL
      `);

      const maintenance = await db.query(`
        SELECT COUNT(*) AS count FROM public.maintenance_requests
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND status = ANY($1) AND deleted_at IS NULL
      `, [UNRESOLVED]);

      const complaints = await db.query(`
        SELECT COUNT(*) AS count FROM public.complaints
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND status = ANY($1) AND deleted_at IS NULL
      `, [UNRESOLVED]);

      // dashboard.js:189 lists the affected students by name in the banner.
      const cancels = await db.query(`
        SELECT c.id, s.name AS "studentName", c.vacate_date AS "vacateDate"
        FROM public.cancellations c
        JOIN public.students s ON s.id = c.student_id
        WHERE c.hostel_id = current_setting('app.hostel_id')::uuid
          AND c.status = 'pending' AND c.deleted_at IS NULL
        ORDER BY c.vacate_date NULLS LAST
      `);

      const occupancy = await db.query(`
        SELECT
          COALESCE(SUM(r.capacity), 0) AS total_seats,
          COALESCE(SUM((
            SELECT COUNT(*) FROM public.students s
            WHERE s.room_id = r.id AND s.status='active' AND s.deleted_at IS NULL
          )), 0) AS filled_seats
        FROM public.rooms r
        WHERE r.hostel_id = current_setting('app.hostel_id')::uuid
          AND r.deleted_at IS NULL AND r.is_active
      `);

      const { total_seats: totalSeats, filled_seats: filledSeats } = occupancy.rows[0];
      const occupancyPct = totalSeats > 0 ? Math.round((filledSeats / totalSeats) * 100) : 0;

      const notices = await db.query(`
        SELECT id, title FROM public.notices
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND deleted_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC LIMIT 5
      `);

      return {
        pendingPaymentsCount: pending.rows[0].count,
        uncollectedPkr:       pending.rows[0].uncollected,
        pendingVoidRequests:  voids.rows[0].count,
        openMaintenance:      maintenance.rows[0].count,
        unresolvedComplaints: complaints.rows[0].count,
        pendingCancellations: cancels.rows,
        occupancyPct,
        // dashboard.js:100 — the alert carries the vacant-bed count, not just the flag.
        occupancyBelowThreshold: totalSeats > 0 && occupancyPct < LOW_OCCUPANCY_PCT,
        vacantSeats: totalSeats - filledSeats,
        activeNotices: notices.rows,
      };
    });

    return reply.send({ success: true, data: result });
  });

  // ── GET /dashboard/seat-map ────────────────────────────────────────────────────────────
  // Ports dashboard.js:356-368 — one tile per REAL room. The previous frontend invented a
  // "four floors of eight rooms, numbered 101…408" grid against a database holding one room.
  app.get('/dashboard/seat-map', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
  }, async (request, reply) => {
    const rooms = await withTenant(request.hostelId, async (db) => {
      const { rows } = await db.query(`
        SELECT
          r.id,
          -- Aliased to match the frontend contract, which calls this field no. The column name
          -- reads as a quantity rather than an identifier: a room "number" is a label — "101",
          -- "G-4" — not something you do arithmetic on.
          r.number AS "no",
          r.floor, r.type, r.color,
          r.capacity,
          COALESCE(o.occ, 0)                              AS occupied,
          GREATEST(r.capacity - COALESCE(o.occ, 0), 0)    AS free,
          CASE WHEN r.capacity > 0
            THEN ROUND((COALESCE(o.occ,0)::numeric / r.capacity) * 100) ELSE 0 END AS "fillPct",
          (COALESCE(o.occ, 0) >= r.capacity)              AS "isFull"
        FROM public.rooms r
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS occ FROM public.students s
          WHERE s.room_id = r.id AND s.status='active' AND s.deleted_at IS NULL
        ) o ON TRUE
        WHERE r.hostel_id = current_setting('app.hostel_id')::uuid
          AND r.deleted_at IS NULL AND r.is_active
        ORDER BY r.floor NULLS LAST, r.number
      `);
      return rows;
    });

    return reply.send({ success: true, data: { rooms } });
  });

  // ── GET /dashboard/room-types ──────────────────────────────────────────────────────────
  // Ports the per-type seat breakdown (dashboard.js:136-159) and the room-type summary cards
  // (:165-179) in one shape — both iterate the same types over the same rooms.
  app.get('/dashboard/room-types', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
  }, async (request, reply) => {
    const types = await withTenant(request.hostelId, async (db) => {
      const { rows } = await db.query(`
        SELECT
          q.type                                              AS "label",
          MIN(q.color)                                        AS "color",
          MAX(q.monthly_fee)                                  AS "defaultRentPkr",
          COUNT(*)                                            AS "rooms",
          COUNT(*) FILTER (WHERE q.occ > 0)                    AS "roomsOccupied",
          COUNT(*) FILTER (WHERE q.occ = 0)                    AS "roomsVacant",
          COALESCE(SUM(q.capacity), 0)                         AS "seats",
          COALESCE(SUM(q.occ), 0)                              AS "seatsFilled",
          COALESCE(SUM(GREATEST(q.capacity - q.occ, 0)), 0)    AS "seatsFree",
          CASE WHEN SUM(q.capacity) > 0
            THEN ROUND((SUM(q.occ)::numeric / SUM(q.capacity)) * 100) ELSE 0 END AS "fullPct",
          CASE WHEN COUNT(*) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE q.occ > 0))::numeric / COUNT(*) * 100)
            ELSE 0 END                                        AS "occupiedPct"
        FROM (
          SELECT r.type, r.color, r.monthly_fee, r.capacity, (
            SELECT COUNT(*) FROM public.students s
            WHERE s.room_id = r.id AND s.status='active' AND s.deleted_at IS NULL
          ) AS occ
          FROM public.rooms r
          WHERE r.hostel_id = current_setting('app.hostel_id')::uuid
            AND r.deleted_at IS NULL AND r.is_active
        ) q
        GROUP BY q.type
        ORDER BY q.type
      `);
      return rows;
    });

    return reply.send({ success: true, data: { types } });
  });

  // ── GET /dashboard/trend ───────────────────────────────────────────────────────────────
  // Ports drawTrendChart, dashboard.js:1256-1280. Twelve months of the given year, four real
  // series. Replaces a frontend that projected the whole year from a single month's total.
  //
  // ⚠️ ONE DELIBERATE DIVERGENCE FROM HOSTIX. dashboard.js:1269 gates every series on
  // `isPast`, so a future month is always null — a zero would draw the line to the floor as
  // though nothing had been collected. That reasoning is right, but its assumption is not:
  // HOSTIX is an offline app that cannot bill ahead, so a future month never had rows. Hostyllo
  // DOES bill ahead — `rent-generate` has already written 3 rows worth PKR 27,000 against
  // 2026-09 on staging. A verbatim port would return null for those and hide real money.
  //
  // So the rule here is "null means nothing to show", not "null means future": a month is null
  // only when it is in the future AND has no data. A future month that has been billed reports
  // its real figures. The `isPast` flag is still returned so the chart can style projected-
  // versus-settled months differently, which is what dashboard.js:1279 actually uses it for.
  app.get('/dashboard/trend', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: {
      querystring: {
        type: 'object',
        properties: { year: { type: 'integer', minimum: 2000, maximum: 2100 } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { year } = request.query as { year?: number };
    const targetYear = year ?? new Date().getFullYear();

    const months = await withTenant(request.hostelId, async (db) => {
      const { rows } = await db.query(`
        WITH months AS (
          SELECT generate_series(
            make_date($1::int, 1, 1), make_date($1::int, 12, 1), interval '1 month'
          )::date AS m
        ),
        agg AS (
          SELECT
            months.m,
            months.m <= date_trunc('month', CURRENT_DATE)::date AS is_past,
            (SELECT COALESCE(SUM(p.paid), 0) FROM public.payments p
              WHERE p.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', p.month) = months.m
                AND p.status <> 'void' AND p.deleted_at IS NULL)          AS revenue,
            (SELECT COALESCE(SUM(p.unpaid), 0) FROM public.payments p
              WHERE p.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', p.month) = months.m
                AND p.status IN ('pending','partial') AND p.deleted_at IS NULL) AS pending,
            (SELECT COUNT(*) FROM public.payments p
              WHERE p.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', p.month) = months.m
                AND p.status <> 'void' AND p.deleted_at IS NULL)          AS pay_rows,
            (SELECT COALESCE(SUM(e.amount), 0) FROM public.expenses e
              WHERE e.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', e.expense_date) = months.m
                AND e.deleted_at IS NULL)                                 AS expenses,
            (SELECT COUNT(*) FROM public.expenses e
              WHERE e.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', e.expense_date) = months.m
                AND e.deleted_at IS NULL)                                 AS exp_rows,
            (SELECT COALESCE(SUM(t.amount), 0) FROM public.owner_transfers t
              WHERE t.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', t.transfer_date) = months.m
                AND t.deleted_at IS NULL)                                 AS transfers,
            (SELECT COUNT(*) FROM public.owner_transfers t
              WHERE t.hostel_id = current_setting('app.hostel_id')::uuid
                AND date_trunc('month', t.transfer_date) = months.m
                AND t.deleted_at IS NULL)                                 AS trf_rows
          FROM months
        )
        SELECT
          to_char(m, 'YYYY-MM')      AS "key",
          to_char(m, 'Mon')          AS "label",
          to_char(m, 'FMMonth YYYY') AS "full",
          is_past                    AS "isPast",
          -- null only when there is genuinely nothing to show: a future month with no rows.
          CASE WHEN is_past OR pay_rows > 0 THEN revenue   END AS "revenuePkr",
          CASE WHEN is_past OR pay_rows > 0 THEN pending   END AS "pendingPkr",
          CASE WHEN is_past OR exp_rows > 0 THEN expenses  END AS "expensesPkr",
          CASE WHEN is_past OR trf_rows > 0 THEN transfers END AS "transfersPkr",
          -- Lets the client distinguish "billed ahead" from "already settled" without
          -- inferring it from the date, which is what produced the bug this replaces.
          (NOT is_past AND pay_rows > 0)                       AS "isFutureBilled"
        FROM agg ORDER BY m
      `, [targetYear]);
      return rows;
    });

    return reply.send({ success: true, data: { year: targetYear, months } });
  });

  // ── GET /dashboard/today ───────────────────────────────────────────────────────────────
  // The "Today at a Glance" counters. Every one of these was a fabricated constant in the
  // previous frontend; each is now a count over a real table, and any table that cannot answer
  // is simply absent from the response rather than zero-filled.
  app.get('/dashboard/today', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
  }, async (request, reply) => {
    const result = await withTenant(request.hostelId, async (db) => {
      const { rows } = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM public.checkin_log
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND type='checkin'  AND logged_at::date = CURRENT_DATE)      AS "checkIns",
          (SELECT COUNT(*) FROM public.checkin_log
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND type='checkout' AND logged_at::date = CURRENT_DATE)      AS "checkOuts",
          (SELECT COUNT(*) FROM public.students
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND join_date = CURRENT_DATE AND deleted_at IS NULL)         AS "newAdmissions",
          (SELECT COALESCE(SUM(paid), 0) FROM public.payments
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND payment_date = CURRENT_DATE
               AND status <> 'void' AND deleted_at IS NULL)                 AS "paymentsReceivedPkr",
          (SELECT COUNT(*) FROM public.complaints
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND created_at::date = CURRENT_DATE AND deleted_at IS NULL)  AS "complaintsRaised",
          (SELECT COUNT(*) FROM public.maintenance_requests
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND created_at::date = CURRENT_DATE AND deleted_at IS NULL)  AS "maintenanceRequests",
          (SELECT COUNT(*) FROM public.cancellations
             WHERE hostel_id = current_setting('app.hostel_id')::uuid
               AND status='pending' AND deleted_at IS NULL)                 AS "pendingApprovals"
      `);
      return rows[0];
    });

    return reply.send({ success: true, data: result });
  });

  // ── GET /dashboard/payment-methods ─────────────────────────────────────────────────────
  // The payment-method split, previously invented on the frontend. Only methods the CHECK
  // constraint permits can appear, and only those actually used in the month are returned —
  // an unused method is absent, not a zero slice.
  app.get('/dashboard/payment-methods', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: { querystring: monthParam },
  }, async (request, reply) => {
    const monthDate = resolveMonth(request.query);

    const methods = await withTenant(request.hostelId, async (db) => {
      const { rows } = await db.query(`
        SELECT
          COALESCE(payment_method, 'unspecified') AS "method",
          COUNT(*)                                AS "count",
          COALESCE(SUM(paid), 0)                  AS "amountPkr"
        FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', month) = date_trunc('month', $1::date)
          AND status <> 'void' AND deleted_at IS NULL AND paid > 0
        GROUP BY COALESCE(payment_method, 'unspecified')
        ORDER BY "amountPkr" DESC
      `, [monthDate]);
      return rows;
    });

    return reply.send({ success: true, data: { month: monthDate.slice(0, 7), methods } });
  });

  // ── GET /dashboard/recent-payments ─────────────────────────────────────────────────────
  // dashboard.js:161 — the ten most recent payments in the selected month.
  app.get('/dashboard/recent-payments', {
    preHandler: [requireAuth, requireRole(CAN_READ)],
    schema: { querystring: monthParam },
  }, async (request, reply) => {
    const monthDate = resolveMonth(request.query);

    const payments = await withTenant(request.hostelId, async (db) => {
      const { rows } = await db.query(`
        SELECT
          p.id AS "paymentId", p.receipt_number AS "receiptNumber",
          s.name AS "studentName", r.number AS "roomNumber",
          p.total_due AS "totalDuePkr", p.paid AS "paidPkr", p.unpaid AS "unpaidPkr",
          p.status, p.payment_method AS "paymentMethod", p.payment_date AS "paymentDate"
        FROM public.payments p
        JOIN public.students s ON s.id = p.student_id
        LEFT JOIN public.rooms r ON r.id = p.room_id
        WHERE p.hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', p.month) = date_trunc('month', $1::date)
          AND p.status <> 'void' AND p.deleted_at IS NULL
        ORDER BY COALESCE(p.payment_date, p.created_at::date) DESC, p.created_at DESC
        LIMIT 10
      `, [monthDate]);
      return rows;
    });

    return reply.send({ success: true, data: { month: monthDate.slice(0, 7), payments } });
  });
}
