import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Per spec: cnic values are NEVER returned in old/new data
function stripCnic(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.toLowerCase().includes('cnic')) continue;
    clean[key] = value;
  }
  return clean;
}

const ENTRY_SELECT = `
  SELECT
    a.id as "logId",
    a.user_id as "actorId",
    u.name as "actorName",
    a.action,
    a.entity_type as "entityType",
    a.entity_id as "entityId",
    a.old_data as "oldValues",
    a.new_data as "newValues",
    a.ip_address as "ipAddress",
    a.created_at as "createdAt"
  FROM public.audit_log a
  LEFT JOIN public.users u ON u.id = a.user_id
`;

export async function auditLogRoutes(app: FastifyInstance) {

  // GET /audit-log
  app.get('/audit-log', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          action:     { type: 'string', maxLength: 60 },
          userId:     { type: 'string', format: 'uuid' },
          entityType: { type: 'string', maxLength: 40 },
          limit:      { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset:     { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { action, userId, entityType, limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const conditions = [`a.hostel_id = current_setting('app.hostel_id')::uuid`];
      const values: any[] = [];
      let idx = 1;

      if (action)     { conditions.push(`a.action = $${idx++}`); values.push(action); }
      if (userId)     { conditions.push(`a.user_id = $${idx++}::uuid`); values.push(userId); }
      if (entityType) { conditions.push(`a.entity_type = $${idx++}`); values.push(entityType); }

      const where = conditions.join(' AND ');

      const rows = await db.query(`
        ${ENTRY_SELECT}
        WHERE ${where}
        ORDER BY a.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...values, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.audit_log a WHERE ${where}
      `, values);

      return {
        entries: rows.rows.map((e: any) => ({ ...e, oldValues: stripCnic(e.oldValues), newValues: stripCnic(e.newValues) })),
        total: parseInt(count.rows[0].total),
        limit: limit ?? 25,
        offset: offset ?? 0,
      };
    });

    return reply.send({ success: true, data: result });
  });

  // GET /audit-log/:entityId — full trail for one entity
  app.get('/audit-log/:entityId', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      params: {
        type: 'object',
        required: ['entityId'],
        properties: { entityId: { type: 'string', format: 'uuid' } },
        additionalProperties: false,
      },
      querystring: {
        type: 'object',
        properties: {
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { entityId } = request.params as { entityId: string };
    const { limit, offset } = request.query as any;

    const result = await withTenant(request.hostelId, async (db) => {
      const rows = await db.query(`
        ${ENTRY_SELECT}
        WHERE a.hostel_id = current_setting('app.hostel_id')::uuid AND a.entity_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
      `, [entityId, limit ?? 25, offset ?? 0]);

      const count = await db.query(`
        SELECT COUNT(*) as total FROM public.audit_log a
        WHERE a.hostel_id = current_setting('app.hostel_id')::uuid AND a.entity_id = $1
      `, [entityId]);

      return {
        entries: rows.rows.map((e: any) => ({ ...e, oldValues: stripCnic(e.oldValues), newValues: stripCnic(e.newValues) })),
        total: parseInt(count.rows[0].total),
        limit: limit ?? 25,
        offset: offset ?? 0,
      };
    });

    return reply.send({ success: true, data: result });
  });
}
