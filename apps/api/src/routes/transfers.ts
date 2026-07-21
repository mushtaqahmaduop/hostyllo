import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function transfersRoutes(app: FastifyInstance) {

  // GET /transfers
  app.get('/transfers', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          from:   { type: 'string', format: 'date' },
          to:     { type: 'string', format: 'date' },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { from, to, limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`t.hostel_id = current_setting('app.hostel_id')::uuid`, `t.deleted_at IS NULL`];
      const values: any[] = [];
      let idx = 1;

      if (from) { conditions.push(`t.transfer_date >= $${idx++}::date`); values.push(from); }
      if (to)   { conditions.push(`t.transfer_date <= $${idx++}::date`); values.push(to); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        SELECT
          t.id as "transferId",
          t.amount as "amountPkr",
          t.description,
          t.transfer_date as "transferDate",
          t.created_at as "createdAt"
        FROM public.owner_transfers t
        WHERE ${where}
        ORDER BY t.transfer_date DESC, t.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const totals = await db.query(`
        SELECT COUNT(*) as total, COALESCE(SUM(t.amount), 0) as "totalAmountPkr"
        FROM public.owner_transfers t WHERE ${where}
      `, values);

      return {
        transfers: rows.rows,
        total: parseInt(totals.rows[0].total),
        totalAmountPkr: Number(totals.rows[0].totalAmountPkr),
        limit: limit ?? 25,
        offset: offset ?? 0,
      };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /transfers
  app.post('/transfers', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount:       { type: 'number', exclusiveMinimum: 0 },
          description:  { type: 'string', maxLength: 500 },
          transferDate: { type: 'string', format: 'date' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const inserted = await db.query(`
        INSERT INTO public.owner_transfers (hostel_id, amount, description, transfer_date, created_by)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, COALESCE($3::date, CURRENT_DATE), $4)
        RETURNING id, amount, transfer_date
      `, [body.amount, body.description ?? null, body.transferDate ?? null, request.userId]);

      // INVARIANT-5: immutable audit trail on financial mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'transfer_created', 'owner_transfer', $2, $3::jsonb)
      `, [request.userId, inserted.rows[0].id, JSON.stringify({
        amount: body.amount,
        description: body.description ?? null,
        transfer_date: inserted.rows[0].transfer_date,
      })]);

      return { data: inserted.rows[0] };
    });

    return reply.status(201).send({
      success: true,
      data: { transferId: result.data.id, amountPkr: Number(result.data.amount), transferDate: result.data.transfer_date },
    });
  });

  // PATCH /transfers/:id
  app.patch('/transfers/:id', {
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
        properties: {
          amount:       { type: 'number', exclusiveMinimum: 0 },
          description:  { type: 'string', maxLength: 500 },
          transferDate: { type: 'string', format: 'date' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id, amount, description, transfer_date FROM public.owner_transfers
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };
      const old = existing.rows[0];

      await db.query(`
        UPDATE public.owner_transfers
        SET amount        = COALESCE($1, amount),
            description   = COALESCE($2, description),
            transfer_date = COALESCE($3::date, transfer_date),
            updated_at    = NOW()
        WHERE id = $4
      `, [body.amount ?? null, body.description ?? null, body.transferDate ?? null, id]);

      // INVARIANT-5: immutable audit trail on financial mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'transfer_updated', 'owner_transfer', $2, $3::jsonb, $4::jsonb)
      `, [request.userId, id,
        JSON.stringify({ amount: Number(old.amount), description: old.description, transfer_date: old.transfer_date }),
        JSON.stringify({ amount: body.amount ?? Number(old.amount), description: body.description ?? old.description, transfer_date: body.transferDate ?? old.transfer_date }),
      ]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Transfer not found' });

    return reply.send({ success: true, data: null });
  });

  // DELETE /transfers/:id (soft delete)
  app.delete('/transfers/:id', {
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

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id, amount, transfer_date FROM public.owner_transfers
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      await db.query(`UPDATE public.owner_transfers SET deleted_at = NOW() WHERE id = $1`, [id]);

      // INVARIANT-5: immutable audit trail on financial mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'transfer_deleted', 'owner_transfer', $2, $3::jsonb)
      `, [request.userId, id, JSON.stringify({
        amount: Number(existing.rows[0].amount),
        transfer_date: existing.rows[0].transfer_date,
      })]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Transfer not found' });

    return reply.send({ success: true, data: null });
  });
}
