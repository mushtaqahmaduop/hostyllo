import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Assignable roles are restricted to warden/chain_manager/viewer in the
// schemas below — creating another hostel_owner (or super_admin) is forbidden
// per spec (the enum rejects it with a 400 validation error).
export async function usersRoutes(app: FastifyInstance) {

  // GET /users
  app.get('/users', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
  }, async (request, reply) => {
    const result = await withTenant(request.hostelId, async (db) => {
      const rows = await db.query(`
        SELECT
          u.id as "userId",
          u.email,
          u.name as "displayName",
          u.role,
          u.is_active as "isActive",
          u.last_login_at as "lastLoginAt",
          u.created_at as "createdAt"
        FROM public.users u
        WHERE u.hostel_id = current_setting('app.hostel_id')::uuid AND u.deleted_at IS NULL
        ORDER BY u.created_at ASC
      `);
      return { users: rows.rows };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /users
  app.post('/users', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'displayName', 'role'],
        properties: {
          email:       { type: 'string', format: 'email', maxLength: 254 },
          password:    { type: 'string', minLength: 8, maxLength: 128 },
          displayName: { type: 'string', minLength: 1, maxLength: 100 },
          role:        { type: 'string', enum: ['warden', 'chain_manager', 'viewer'] },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as any;

    const passwordHash = await bcrypt.hash(body.password, 12);

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id FROM public.users
        WHERE email = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [body.email]);

      if (existing.rows.length > 0) return { error: 'USER_EMAIL_TAKEN' };

      const inserted = await db.query(`
        INSERT INTO public.users (hostel_id, name, email, password_hash, role)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4)
        RETURNING id, email
      `, [body.displayName, body.email, passwordHash, body.role]);

      // INVARIANT-5: audit sensitive account mutations (never log password material)
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'user_created', 'user', $2, $3::jsonb)
      `, [request.userId, inserted.rows[0].id, JSON.stringify({
        email: body.email,
        name: body.displayName,
        role: body.role,
      })]);

      return { data: inserted.rows[0] };
    });

    if (result.error === 'USER_EMAIL_TAKEN') return reply.status(409).send({ success: false, data: null, code: 'USER_EMAIL_TAKEN', message: 'Email is already in use' });

    return reply.status(201).send({ success: true, data: { userId: result.data.id, email: result.data.email } });
  });

  // PATCH /users/:id
  app.patch('/users/:id', {
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
          displayName: { type: 'string', minLength: 1, maxLength: 100 },
          role:        { type: 'string', enum: ['warden', 'chain_manager', 'viewer'] },
          isActive:    { type: 'boolean' },
          password:    { type: 'string', minLength: 8, maxLength: 128 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : null;

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id, name, role, is_active FROM public.users
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };
      const old = existing.rows[0];

      // Demoting the last active hostel_owner would lock the tenant out
      if (old.role === 'hostel_owner' && (body.role || body.isActive === false)) {
        const owners = await db.query(`
          SELECT COUNT(*) as count FROM public.users
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND role = 'hostel_owner' AND is_active = TRUE AND deleted_at IS NULL
        `);
        if (parseInt(owners.rows[0].count) <= 1) return { error: 'USER_LAST_OWNER' };
      }

      await db.query(`
        UPDATE public.users
        SET name          = COALESCE($1, name),
            role          = COALESCE($2, role),
            is_active     = COALESCE($3, is_active),
            password_hash = COALESCE($4, password_hash),
            updated_at    = NOW()
        WHERE id = $5
      `, [body.displayName ?? null, body.role ?? null, body.isActive ?? null, passwordHash, id]);

      // INVARIANT-5: audit sensitive account mutations (never log password material)
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'user_updated', 'user', $2, $3::jsonb, $4::jsonb)
      `, [request.userId, id,
        JSON.stringify({ name: old.name, role: old.role, is_active: old.is_active }),
        JSON.stringify({
          name: body.displayName ?? old.name,
          role: body.role ?? old.role,
          is_active: body.isActive ?? old.is_active,
          password_changed: Boolean(body.password),
        }),
      ]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'User not found' });
    if (result.error === 'USER_LAST_OWNER') return reply.status(409).send({ success: false, data: null, code: 'USER_LAST_OWNER', message: 'Cannot demote or deactivate the last hostel owner' });

    return reply.send({ success: true, data: null });
  });

  // DELETE /users/:id (soft delete)
  app.delete('/users/:id', {
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

    if (id === request.userId) {
      return reply.status(409).send({ success: false, data: null, code: 'USER_SELF_DELETE', message: 'Cannot delete your own account' });
    }

    const result = await withTenant(request.hostelId, async (db) => {
      const existing = await db.query(`
        SELECT id, email, role FROM public.users
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [id]);

      if (!existing.rows[0]) return { error: 'NOT_FOUND' };

      if (existing.rows[0].role === 'hostel_owner') {
        const owners = await db.query(`
          SELECT COUNT(*) as count FROM public.users
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND role = 'hostel_owner' AND is_active = TRUE AND deleted_at IS NULL
        `);
        if (parseInt(owners.rows[0].count) <= 1) return { error: 'USER_LAST_OWNER' };
      }

      await db.query(`UPDATE public.users SET deleted_at = NOW(), is_active = FALSE WHERE id = $1`, [id]);

      // INVARIANT-5: audit sensitive account mutations
      await db.query(`
        INSERT INTO public.audit_log (hostel_id, user_id, action, entity_type, entity_id, old_data)
        VALUES (current_setting('app.hostel_id')::uuid, $1, 'user_deleted', 'user', $2, $3::jsonb)
      `, [request.userId, id, JSON.stringify({
        email: existing.rows[0].email,
        role: existing.rows[0].role,
      })]);

      return { ok: true };
    });

    if (result.error === 'NOT_FOUND') return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'User not found' });
    if (result.error === 'USER_LAST_OWNER') return reply.status(409).send({ success: false, data: null, code: 'USER_LAST_OWNER', message: 'Cannot delete the last hostel owner' });

    return reply.send({ success: true, data: null });
  });
}
