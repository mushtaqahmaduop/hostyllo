import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function expensesRoutes(app: FastifyInstance) {

  // GET /expenses
  app.get('/expenses', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          month:    { type: 'string' },
          category: { type: 'string' },
          limit:    { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:   { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { month, category, limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`e.hostel_id = current_setting('app.hostel_id')::uuid`, `e.deleted_at IS NULL`];
      const values: any[] = [];
      let idx = 1;

      if (month) { conditions.push(`date_trunc('month', e.expense_date) = date_trunc('month', $${idx++}::date)`); values.push(month + '-01'); }
      if (category) { conditions.push(`e.category = $${idx++}`); values.push(category); }

      const where = conditions.join(' AND ');

      const expenses = await db.query(`
        SELECT
          e.id as "expenseId",
          e.category,
          e.description,
          e.amount as "amountPkr",
          e.expense_date as "expenseDate",
          e.created_by as "createdBy",
          e.created_at as "createdAt"
        FROM public.expenses e
        WHERE ${where}
        ORDER BY e.expense_date DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`SELECT COUNT(*) as total FROM public.expenses e WHERE ${where}`, values);

      return { expenses: expenses.rows, total: parseInt(count.rows[0].total), limit: limit ?? 25, offset: offset ?? 0 };
    });

    return reply.send({ success: true, data: result });
  });

  // GET /expenses/summary
  app.get('/expenses/summary', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: { month: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { month } = request.query as any;
    const monthDate = (month ?? new Date().toISOString().slice(0, 7)) + '-01';

    const result = await withTenant(request.hostelId, async (db) => {
      const summary = await db.query(`
        SELECT
          COALESCE(SUM(amount), 0) as "totalPkr",
          json_agg(json_build_object('category', category, 'totalPkr', cat_total) ORDER BY cat_total DESC) as "byCategory"
        FROM (
          SELECT category, SUM(amount) as cat_total
          FROM public.expenses
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND date_trunc('month', expense_date) = date_trunc('month', $1::date)
            AND deleted_at IS NULL
          GROUP BY category
        ) cats
      `, [monthDate]);

      return { month: monthDate, ...summary.rows[0] };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /expenses
  app.post('/expenses', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['category', 'amount', 'expense_date'],
        properties: {
          category:     { type: 'string' },
          description:  { type: 'string' },
          amount:       { type: 'number', minimum: 0 },
          expense_date: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const expense = await db.query(`
        INSERT INTO public.expenses (hostel_id, category, description, amount, expense_date, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, $5)
        RETURNING id
      `, [body.category, body.description ?? null, body.amount, body.expense_date, request.userId]);

      return expense.rows[0];
    });

    return reply.status(201).send({ success: true, data: { expenseId: result.id } });
  });

  // PATCH /expenses/:id
  app.patch('/expenses/:id', {
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
          category:     { type: 'string' },
          description:  { type: 'string' },
          amount:       { type: 'number', minimum: 0 },
          expense_date: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const fields = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(body)) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }

      if (fields.length === 0) return null;

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const updated = await db.query(`
        UPDATE public.expenses SET ${fields.join(', ')}
        WHERE id = $${idx}
          AND hostel_id = current_setting('app.hostel_id')::uuid
          AND deleted_at IS NULL
        RETURNING id
      `, values);

      return updated.rows[0] ?? null;
    });

    if (!result) return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Expense not found' });

    return reply.send({ success: true, data: result });
  });

  // DELETE /expenses/:id
  app.delete('/expenses/:id', {
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

    await withTenant(request.hostelId, async (db) => {
      await db.query(`
        UPDATE public.expenses SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid
      `, [id]);
    });

    return reply.send({ success: true, data: null });
  });
}
