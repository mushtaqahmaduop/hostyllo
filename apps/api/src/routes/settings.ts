import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const HOSTEL_INFO_SELECT = `
  SELECT
    h.id as "hostelId",
    h.name,
    h.address,
    h.city,
    h.phone,
    h.email,
    h.logo_url as "logoUrl",
    h.timezone,
    h.currency,
    h.language,
    h.plan,
    h.plan_status as "planStatus",
    h.trial_ends_at as "trialEndsAt"
  FROM public.hostels h
  WHERE h.id = current_setting('app.hostel_id')::uuid AND h.deleted_at IS NULL
`;

export async function settingsRoutes(app: FastifyInstance) {

  // GET /settings/hostel-info
  app.get('/settings/hostel-info', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
  }, async (request, reply) => {
    const result = await withTenant(request.hostelId, async (db) => {
      const hostel = await db.query(HOSTEL_INFO_SELECT);
      return hostel.rows[0] ?? null;
    });

    if (!result) return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Hostel not found' });

    return reply.send({ success: true, data: result });
  });

  // PATCH /settings/hostel-info
  app.patch('/settings/hostel-info', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          name:     { type: 'string', minLength: 1, maxLength: 200 },
          address:  { type: 'string', maxLength: 500 },
          city:     { type: 'string', maxLength: 100 },
          phone:    { type: 'string', maxLength: 30 },
          email:    { type: 'string', format: 'email', maxLength: 254 },
          logoUrl:  { type: 'string', maxLength: 1000 },
          timezone: { type: 'string', maxLength: 60 },
          currency: { type: 'string', minLength: 3, maxLength: 3 },
          language: { type: 'string', minLength: 2, maxLength: 10 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT name, address, city, phone, email, logo_url, timezone, currency, language
        FROM public.hostels
        WHERE id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };
      const old = existing.rows[0];

      await db.query(`
        UPDATE public.hostels
        SET name     = COALESCE($1, name),
            address  = COALESCE($2, address),
            city     = COALESCE($3, city),
            phone    = COALESCE($4, phone),
            email    = COALESCE($5, email),
            logo_url = COALESCE($6, logo_url),
            timezone = COALESCE($7, timezone),
            currency = COALESCE($8, currency),
            language = COALESCE($9, language),
            updated_at = NOW()
        WHERE id = current_setting('app.hostel_id')::uuid
      `, [body.name ?? null, body.address ?? null, body.city ?? null, body.phone ?? null,
          body.email ?? null, body.logoUrl ?? null, body.timezone ?? null, body.currency ?? null,
          body.language ?? null]);

      // INVARIANT-5: audit sensitive settings mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'settings_updated', 'hostel', current_setting('app.hostel_id')::uuid, $2::jsonb, $3::jsonb)
      `, [request.userId, JSON.stringify(old), JSON.stringify(body)]);

      const updated = await db.query(HOSTEL_INFO_SELECT);
      return { data: updated.rows[0] };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Hostel not found' });

    return reply.send({ success: true, data: result.data });
  });
}
