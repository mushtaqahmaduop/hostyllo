import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function dashboardRoutes(app: FastifyInstance) {

  // GET /dashboard/stats
  app.get('/dashboard/stats', {
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
        WITH monthly_data AS (
          SELECT
            COALESCE(SUM(paid) FILTER (WHERE deleted_at IS NULL), 0) as revenue,
            COALESCE(SUM(unpaid) FILTER (WHERE deleted_at IS NULL), 0) as pending
          FROM public.payments
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND date_trunc('month', month) = date_trunc('month', $1::date)
        ),
        expense_data AS (
          SELECT COALESCE(SUM(amount), 0) as expenses
          FROM public.expenses
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND date_trunc('month', expense_date) = date_trunc('month', $1::date)
            AND deleted_at IS NULL
        ),
        student_data AS (
          SELECT COUNT(*) as active_students
          FROM public.students
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND status = 'active' AND deleted_at IS NULL
        ),
        bed_data AS (
          SELECT
            COUNT(*) as total_beds,
            COUNT(*) FILTER (WHERE status = 'occupied') as occupied_beds
          FROM public.beds
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
        )
        SELECT
          m.revenue as "revenuePkr",
          m.pending as "pendingPkr",
          e.expenses as "expensesPkr",
          m.revenue - e.expenses as "netFundPkr",
          s.active_students as "activeStudents",
          b.total_beds as "totalBeds",
          b.occupied_beds as "occupiedBeds",
          CASE WHEN b.total_beds > 0
            THEN ROUND((b.occupied_beds::numeric / b.total_beds) * 100, 1)
            ELSE 0
          END as "occupancyPct"
        FROM monthly_data m, expense_data e, student_data s, bed_data b
      `, [monthDate]);

      return { month: monthDate, ...data.rows[0] };
    });

    return reply.send({ success: true, data: result });
  });

  // GET /dashboard/alerts
  app.get('/dashboard/alerts', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
  }, async (request, reply) => {

    const result = await withTenant(request.hostelId, async (db) => {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

      const pendingPayments = await db.query(`
        SELECT COUNT(*) as count FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND date_trunc('month', month) = date_trunc('month', $1::date)
          AND status IN ('pending', 'partial')
          AND deleted_at IS NULL
      `, [currentMonth]);

      const voidRequests = await db.query(`
        SELECT COUNT(*) as count FROM public.payments
        WHERE hostel_id = current_setting('app.hostel_id')::uuid
          AND void_requested_by IS NOT NULL
          AND status != 'void'
          AND deleted_at IS NULL
      `);

      return {
        pendingPaymentsCount: parseInt(pendingPayments.rows[0].count),
        pendingVoidRequests: parseInt(voidRequests.rows[0].count),
        openMaintenance: 0,
        unresolvedComplaints: 0,
        occupancyBelowThreshold: false,
        activeNotices: [],
      };
    });

    return reply.send({ success: true, data: result });
  });
}
