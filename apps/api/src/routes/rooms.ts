import { FastifyInstance } from 'fastify';
import { withTenant } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export async function roomsRoutes(app: FastifyInstance) {

  // GET /rooms
  app.get('/rooms', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { status } = request.query as { status?: string };

    const result = await withTenant(request.hostelId, async (db) => {
      let whereClause = 'WHERE r.hostel_id = current_setting(\'app.hostel_id\')::uuid AND r.deleted_at IS NULL';
      if (status === 'active') whereClause += ' AND r.is_active = true';
      if (status === 'inactive') whereClause += ' AND r.is_active = false';

      const rooms = await db.query(`
        SELECT
          r.id as "roomId",
          r.number,
          r.floor,
          r.type as "roomType",
          r.color as "colorHex",
          r.capacity,
          r.monthly_fee as "defaultRentPkr",
          r.is_active as "isActive",
          r.created_at as "createdAt",
          COUNT(b.id) FILTER (WHERE b.status = 'occupied') as "occupiedBeds",
          COUNT(b.id) FILTER (WHERE b.status = 'vacant') as "freeBeds",
          json_agg(
            json_build_object(
              'bedId', b.id,
              'label', b.label,
              'status', b.status,
              'studentName', s.name,
              'studentId', s.id
            ) ORDER BY b.label
          ) as beds
        FROM public.rooms r
        LEFT JOIN public.beds b ON b.room_id = r.id
        LEFT JOIN public.students s ON s.bed_id = b.id AND s.deleted_at IS NULL AND s.status = 'active'
        ${whereClause}
        GROUP BY r.id
        ORDER BY r.number
      `);

      const summary = await db.query(`
        SELECT
          COUNT(DISTINCT r.id) as "totalRooms",
          COUNT(b.id) as "totalBeds",
          COUNT(b.id) FILTER (WHERE b.status = 'occupied') as "occupiedBeds",
          COUNT(b.id) FILTER (WHERE b.status = 'vacant') as "freeBeds"
        FROM public.rooms r
        LEFT JOIN public.beds b ON b.room_id = r.id
        WHERE r.hostel_id = current_setting('app.hostel_id')::uuid AND r.deleted_at IS NULL
      `);

      return { rooms: rooms.rows, summary: summary.rows[0] };
    });

    return reply.send({ success: true, data: result });
  });

  // POST /rooms
  app.post('/rooms', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['number', 'capacity', 'monthly_fee'],
        properties: {
          number:      { type: 'string' },
          floor:       { type: 'string' },
          type:        { type: 'string' },
          color:       { type: 'string' },
          capacity:    { type: 'integer', minimum: 1 },
          monthly_fee: { type: 'number', minimum: 0 },
          is_active:   { type: 'boolean' },
          beds:        {
            type: 'array',
            items: {
              type: 'object',
              required: ['label'],
              properties: { label: { type: 'string' } },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const body = request.body as {
      number?: string; floor?: string; type?: string; color?: string;
      capacity: number; monthly_fee?: number; is_active?: boolean;
      beds?: { label: string }[];
    };

    const result = await withTenant(request.hostelId, async (db) => {
      // Check duplicate room number
      const exists = await db.query(
        `SELECT id FROM public.rooms WHERE hostel_id = current_setting('app.hostel_id')::uuid AND number = $1 AND deleted_at IS NULL`,
        [body.number]
      );
      if (exists.rows.length > 0) {
        return { error: 'RM_NUMBER_DUPLICATE' };
      }

      const room = await db.query(`
        INSERT INTO public.rooms (hostel_id, number, floor, type, color, capacity, monthly_fee, is_active)
        VALUES (current_setting('app.hostel_id')::uuid, $1, $2, $3, $4, $5, $6, $7)
        RETURNING id, number
      `, [
        body.number,
        body.floor ?? null,
        body.type ?? null,
        body.color ?? null,
        body.capacity,
        body.monthly_fee,
        body.is_active ?? true,
      ]);

      const roomId = room.rows[0].id;

      // Insert beds if provided
      if (body.beds && body.beds.length > 0) {
        for (const bed of body.beds) {
          await db.query(`
            INSERT INTO public.beds (hostel_id, room_id, label, status)
            VALUES (current_setting('app.hostel_id')::uuid, $1, $2, 'vacant')
          `, [roomId, bed.label]);
        }
      } else {
        // Auto-create beds based on capacity
        for (let i = 0; i < body.capacity; i++) {
          const label = String.fromCharCode(65 + i); // A, B, C...
          await db.query(`
            INSERT INTO public.beds (hostel_id, room_id, label, status)
            VALUES (current_setting('app.hostel_id')::uuid, $1, $2, 'vacant')
          `, [roomId, label]);
        }
      }

      return room.rows[0];
    });

    if (result.error === 'RM_NUMBER_DUPLICATE') {
      return reply.status(409).send({ success: false, data: null, code: 'RM_NUMBER_DUPLICATE', message: 'Room number already exists in this hostel' });
    }

    return reply.status(201).send({ success: true, data: { roomId: result.id, number: result.number } });
  });

  // GET /rooms/:id
  app.get('/rooms/:id', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
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
      const room = await db.query(`
        SELECT
          r.id as "roomId",
          r.number,
          r.floor,
          r.type as "roomType",
          r.color as "colorHex",
          r.capacity,
          r.monthly_fee as "defaultRentPkr",
          r.is_active as "isActive",
          r.created_at as "createdAt",
          json_agg(
            json_build_object(
              'bedId', b.id,
              'label', b.label,
              'status', b.status,
              'studentName', s.name,
              'studentId', s.id
            ) ORDER BY b.label
          ) as beds
        FROM public.rooms r
        LEFT JOIN public.beds b ON b.room_id = r.id
        LEFT JOIN public.students s ON s.bed_id = b.id AND s.deleted_at IS NULL AND s.status = 'active'
        WHERE r.id = $1
          AND r.hostel_id = current_setting('app.hostel_id')::uuid
          AND r.deleted_at IS NULL
        GROUP BY r.id
      `, [id]);

      return room.rows[0] ?? null;
    });

    if (!result) {
      return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Room not found' });
    }

    return reply.send({ success: true, data: result });
  });

  // PATCH /rooms/:id
  app.patch('/rooms/:id', {
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
          number:      { type: 'string' },
          floor:       { type: 'string' },
          type:        { type: 'string' },
          color:       { type: 'string' },
          capacity:    { type: 'integer', minimum: 1 },
          monthly_fee: { type: 'number', minimum: 0 },
          is_active:   { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      const fields = [];
      const values: unknown[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(body)) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }

      if (fields.length === 0) return { error: 'NO_FIELDS' };

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const updated = await db.query(`
        UPDATE public.rooms SET ${fields.join(', ')}
        WHERE id = $${idx}
          AND hostel_id = current_setting('app.hostel_id')::uuid
          AND deleted_at IS NULL
        RETURNING id, number
      `, values);

      return updated.rows[0] ?? null;
    });

    if (!result) {
      return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Room not found' });
    }

    return reply.send({ success: true, data: result });
  });

  // DELETE /rooms/:id
  app.delete('/rooms/:id', {
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
      // Block if active students assigned
      const activeStudents = await db.query(`
        SELECT id FROM public.students
        WHERE room_id = $1
          AND hostel_id = current_setting('app.hostel_id')::uuid
          AND status = 'active'
          AND deleted_at IS NULL
      `, [id]);

      if (activeStudents.rows.length > 0) {
        return { error: 'RM_HAS_ACTIVE_STUDENTS' };
      }

      await db.query(`
        UPDATE public.rooms SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid
      `, [id]);

      return { ok: true };
    });

    if (result.error === 'RM_HAS_ACTIVE_STUDENTS') {
      return reply.status(409).send({ success: false, data: null, code: 'RM_HAS_ACTIVE_STUDENTS', message: 'Room has active students — cannot delete' });
    }

    return reply.send({ success: true, data: null });
  });

  // POST /rooms/shift
  app.post('/rooms/shift', {
    preHandler: [requireAuth, requireRole(['warden', 'hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['studentId', 'toRoomId', 'toBedId'],
        properties: {
          studentId:    { type: 'string', format: 'uuid' },
          toRoomId:     { type: 'string', format: 'uuid' },
          toBedId:      { type: 'string', format: 'uuid' },
          newMonthlyFee: { type: 'number', minimum: 0 },
          notes:        { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { studentId, toRoomId, toBedId, newMonthlyFee, notes: _notes } = request.body as Record<string, unknown>;

    const result = await withTenant(request.hostelId, async (db) => {
      // Check target bed is vacant
      const bed = await db.query(`
        SELECT status FROM public.beds
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid
      `, [toBedId]);

      if (!bed.rows[0]) return { error: 'NOT_FOUND' };
      if (bed.rows[0].status === 'occupied') return { error: 'RM_BED_OCCUPIED' };

      // Check target room is active
      const room = await db.query(`
        SELECT is_active, number FROM public.rooms
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [toRoomId]);

      if (!room.rows[0]) return { error: 'NOT_FOUND' };
      if (!room.rows[0].is_active) return { error: 'RM_ROOM_MAINTENANCE' };

      // Get current student info
      const student = await db.query(`
        SELECT room_id, bed_id, monthly_fee, name FROM public.students
        WHERE id = $1 AND hostel_id = current_setting('app.hostel_id')::uuid AND deleted_at IS NULL
      `, [studentId]);

      if (!student.rows[0]) return { error: 'NOT_FOUND' };

      const oldRoomId = student.rows[0].room_id;
      const oldBedId = student.rows[0].bed_id;
      const oldFee = student.rows[0].monthly_fee;

      // Free old bed
      await db.query(`
        UPDATE public.beds SET status = 'vacant', updated_at = NOW()
        WHERE id = $1
      `, [oldBedId]);

      // Occupy new bed
      await db.query(`
        UPDATE public.beds SET status = 'occupied', updated_at = NOW()
        WHERE id = $1
      `, [toBedId]);

      // Update student
      await db.query(`
        UPDATE public.students
        SET room_id = $1, bed_id = $2, monthly_fee = COALESCE($3, monthly_fee), updated_at = NOW()
        WHERE id = $4
      `, [toRoomId, toBedId, newMonthlyFee ?? null, studentId]);

      // Get from/to room numbers
      const fromRoom = await db.query(`SELECT number FROM public.rooms WHERE id = $1`, [oldRoomId]);

      return {
        studentId,
        fromRoomNumber: fromRoom.rows[0]?.number,
        toRoomNumber: room.rows[0].number,
        oldMonthlyFee: oldFee,
        newMonthlyFee: newMonthlyFee ?? oldFee,
      };
    });

    if (result.error === 'RM_BED_OCCUPIED') {
      return reply.status(409).send({ success: false, data: null, code: 'RM_BED_OCCUPIED', message: 'Target bed is already occupied' });
    }
    if (result.error === 'RM_ROOM_MAINTENANCE') {
      return reply.status(409).send({ success: false, data: null, code: 'RM_ROOM_MAINTENANCE', message: 'Target room is inactive' });
    }
    if (result.error === 'NOT_FOUND') {
      return reply.status(404).send({ success: false, data: null, code: 'NOT_FOUND', message: 'Student, room or bed not found' });
    }

    return reply.send({ success: true, data: result });
  });

  // PATCH /rooms/bulk-fee
  app.patch('/rooms/bulk-fee', {
    preHandler: [requireAuth, requireRole(['hostel_owner', 'chain_manager'])],
    schema: {
      body: {
        type: 'object',
        required: ['mode'],
        properties: {
          mode:         { type: 'string', enum: ['by_room_type', 'apply_to_all', 'per_student'] },
          type:         { type: 'string' },
          newMonthlyFee: { type: 'number', minimum: 0 },
          updates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['studentId', 'newMonthlyFee'],
              properties: {
                studentId:    { type: 'string', format: 'uuid' },
                newMonthlyFee: { type: 'number', minimum: 0 },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { mode, type, newMonthlyFee, updates } = request.body as {
      mode?: string; type?: string; newMonthlyFee?: number;
      updates: { studentId: string; newMonthlyFee: number }[];
    };

    const result = await withTenant(request.hostelId, async (db) => {
      let updatedCount = 0;

      if (mode === 'apply_to_all') {
        const r = await db.query(`
          UPDATE public.students SET monthly_fee = $1, updated_at = NOW()
          WHERE hostel_id = current_setting('app.hostel_id')::uuid
            AND status = 'active' AND deleted_at IS NULL
        `, [newMonthlyFee]);
        updatedCount = r.rowCount ?? 0;

      } else if (mode === 'by_room_type') {
        const r = await db.query(`
          UPDATE public.students s SET monthly_fee = $1, s.updated_at = NOW()
          FROM public.rooms r
          WHERE s.room_id = r.id
            AND s.hostel_id = current_setting('app.hostel_id')::uuid
            AND r.type = $2
            AND s.status = 'active' AND s.deleted_at IS NULL
        `, [newMonthlyFee, type]);
        updatedCount = r.rowCount ?? 0;

      } else if (mode === 'per_student') {
        for (const u of updates) {
          const r = await db.query(`
            UPDATE public.students SET monthly_fee = $1, updated_at = NOW()
            WHERE id = $2
              AND hostel_id = current_setting('app.hostel_id')::uuid
              AND deleted_at IS NULL
          `, [u.newMonthlyFee, u.studentId]);
          updatedCount += r.rowCount ?? 0;
        }
      }

      return { updatedCount };
    });

    return reply.send({ success: true, data: result });
  });
}

