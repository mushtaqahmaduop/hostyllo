import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { assertEncryptionKey } from '../lib/env.js';

// ─── Encryption key — validated at import (server startup). Rejects unset / wrong-length /
// low-entropy placeholder keys so a worthless key can never reach production (audit C2). ─────
const ENCRYPTION_KEY = assertEncryptionKey();

// AES-256-GCM: authenticated encryption — prevents bit-flip attacks on TOTP secrets
// Format: iv(12 bytes hex) : authTag(16 bytes hex) : ciphertext(hex)
function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format — expected GCM (iv:authTag:enc)');
  }
  const [ivHex, authTagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ─── Login rate limiting ──────────────────────────────────────────────────────
// 10 attempts / 15 min / IP (per the auth tracker). Counts every attempt, so a
// brute-force burst trips it regardless of success. incr() sets the TTL only on the
// first hit, giving a fixed 15-minute window per IP.
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

// ─── OTP rate limiting ────────────────────────────────────────────────────────
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_SECONDS = 15 * 60;

async function checkOtpRateLimit(userId: string): Promise<boolean> {
  const key = `otp_attempts:${userId}`;
  const attempts = await redis.get(key);
  if (attempts && parseInt(attempts) >= OTP_MAX_ATTEMPTS) return false;
  await redis.incr(key);
  await redis.expire(key, OTP_WINDOW_SECONDS);
  return true;
}

export async function authRoutes(app: FastifyInstance) {

  // POST /api/v1/auth/login
  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 1, maxLength: 128 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const rlKey = `rl:login:${request.ip}`;
    const attempts = await redis.incr(rlKey, LOGIN_WINDOW_SECONDS);
    if (attempts > LOGIN_MAX_ATTEMPTS) {
      return reply.code(429).send({ success: false, code: 'RATE_LIMIT', message: 'Too many login attempts. Try again in 15 minutes.' });
    }

    const result = await pool.query(
      `SELECT u.id, u.hostel_id, u.role, u.email, u.password_hash,
              u.totp_enabled, u.display_name, u.theme, u.language,
              u.is_active
       FROM public.users u
       WHERE u.email = $1 AND u.deleted_at IS NULL AND u.is_active = true
       LIMIT 1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000');
      return reply.code(401).send({ success: false, code: 'AUTH_002', message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ success: false, code: 'AUTH_002', message: 'Invalid credentials' });
    }

    if (user.totp_enabled) {
      const mfaToken = randomUUID();
      await redis.set(`mfa:${mfaToken}`, user.id, 60 * 5);
      return reply.send({ success: true, data: { requiresMfa: true, mfaToken } });
    }

    const jti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await signAccessToken({ sub: user.id, hostelId: user.hostel_id, role: user.role, jti });
    const refreshToken = await signRefreshToken({ sub: user.id, hostelId: user.hostel_id, jti: refreshJti });

    await redis.set(`refresh:${refreshJti}`, user.id, 60 * 60 * 24 * 7);
    await pool.query('UPDATE public.users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: {
          userId:      user.id,
          email:       user.email,
          role:        user.role,
          hostelId:    user.hostel_id,
          displayName: user.display_name ?? null,
          theme:       user.theme ?? 'dark',
          language:    user.language ?? 'en',
        },
      },
    });
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      return reply.code(401).send({ success: false, code: 'AUTH_003', message: 'No refresh token' });
    }

    let payload: any;
    try {
      payload = await verifyToken(refreshToken);
    } catch {
      return reply.code(401).send({ success: false, code: 'AUTH_004', message: 'Invalid refresh token' });
    }

    const exists = await redis.exists(`refresh:${payload.jti}`);
    if (!exists) {
      return reply.code(401).send({ success: false, code: 'AUTH_005', message: 'Token revoked' });
    }

    await redis.del(`refresh:${payload.jti}`);

    // Re-query user to get current role — never trust stale token payload
    const userRow = await pool.query(
      'SELECT role, hostel_id FROM public.users WHERE id = $1 AND deleted_at IS NULL AND is_active = true',
      [payload.sub]
    );
    if (!userRow.rows[0]) {
      return reply.code(401).send({ success: false, code: 'AUTH_005', message: 'User not found' });
    }
    const { role, hostel_id } = userRow.rows[0];

    const newJti = randomUUID();
    const newRefreshJti = randomUUID();

    const accessToken = await signAccessToken({
      sub: payload.sub as string,
      hostelId: hostel_id,
      role,
      jti: newJti,
    });

    const newRefreshToken = await signRefreshToken({
      sub: payload.sub as string,
      hostelId: hostel_id,
      jti: newRefreshJti,
    });

    await redis.set(`refresh:${newRefreshJti}`, payload.sub as string, 60 * 60 * 24 * 7);

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.send({ success: true, data: { accessToken } });
  });

  // POST /api/v1/auth/logout
  app.post('/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await verifyToken(authHeader.slice(7)) as any;
        await redis.set(`blocklist:${payload.jti}`, '1', 60 * 15);
      } catch {
        // Already invalid — fine
      }
    }

    const refreshToken = request.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const payload = await verifyToken(refreshToken) as any;
        await redis.del(`refresh:${payload.jti}`);
      } catch {
        // Already invalid — fine
      }
    }

    reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    return reply.send({ success: true, data: null });
  });

  // POST /api/v1/auth/reset-password
  app.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { email } = request.body as { email: string };

    const result = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
      [email.toLowerCase()]
    );

    if (!result.rows[0]) {
      return reply.send({ success: true, data: { message: 'If this email exists, an OTP has been sent' } });
    }

    const userId = result.rows[0].id;

    const allowed = await checkOtpRateLimit(userId);
    if (!allowed) {
      return reply.code(429).send({ success: false, code: 'RATE_LIMIT', message: 'Too many OTP requests. Try again in 15 minutes.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`otp:${userId}`, otp, 60 * 15);

    // TODO: integrate WhatsApp 360dialog or email delivery — Day 1 of production
    app.log.info({ userId, event: 'otp_generated' }, 'OTP generated for password reset');

    return reply.send({ success: true, data: { message: 'If this email exists, an OTP has been sent' } });
  });

  // POST /api/v1/auth/totp/setup
  app.post('/totp/setup', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userId = request.userId;
    const userResult = await pool.query(
      'SELECT email, totp_enabled FROM public.users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: 'User not found' });
    if (user.totp_enabled) return reply.code(409).send({ success: false, code: 'AUTH_TOTP_ALREADY_ENABLED', message: 'TOTP already enabled' });

    const secret = generateSecret();
    const otpAuthUri = generateURI({ issuer: 'HOSTYLLO', label: user.email, secret });
    const encrypted = encryptSecret(secret);

    await pool.query(
      'UPDATE public.users SET totp_secret_enc = $1, totp_enabled = false WHERE id = $2',
      [encrypted, userId]
    );

    const backupCodes = Array.from({ length: 8 }, () =>
      randomBytes(8).toString('hex').toUpperCase()
    );

    const hashedCodes = await Promise.all(
      backupCodes.map(c => bcrypt.hash(c, 10))
    );
    await pool.query(
      'UPDATE public.users SET totp_backup_codes = $1 WHERE id = $2',
      [JSON.stringify(hashedCodes), userId]
    );

    return reply.send({ success: true, data: { otpAuthUri, backupCodes } });
  });

  // POST /api/v1/auth/totp/verify
  app.post('/totp/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['mfaToken', 'code'],
        properties: {
          mfaToken: { type: 'string', format: 'uuid' },
          code:     { type: 'string', minLength: 6, maxLength: 8 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { mfaToken, code } = request.body as { mfaToken: string; code: string };

    const userId = await redis.get(`mfa:${mfaToken}`);
    if (!userId) {
      return reply.code(401).send({ success: false, code: 'AUTH_INVALID_MFA_TOKEN', message: 'MFA token expired or invalid' });
    }

    const userResult = await pool.query(
      `SELECT id, hostel_id, role, email, totp_secret_enc, display_name, theme, language
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const user = userResult.rows[0];
    if (!user || !user.totp_secret_enc) {
      return reply.code(401).send({ success: false, code: 'AUTH_INVALID_MFA_TOKEN', message: 'MFA token expired or invalid' });
    }

    const secret = decryptSecret(user.totp_secret_enc);
    const { valid: isValid } = await verifyTotp({ token: code, secret });
    if (!isValid) {
      return reply.code(401).send({ success: false, code: 'AUTH_INVALID_TOTP_CODE', message: 'Invalid TOTP code' });
    }

    await redis.del(`mfa:${mfaToken}`);
    await pool.query('UPDATE public.users SET totp_enabled = true WHERE id = $1', [user.id]);

    const jti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await signAccessToken({ sub: user.id, hostelId: user.hostel_id, role: user.role, jti });
    const refreshToken = await signRefreshToken({ sub: user.id, hostelId: user.hostel_id, jti: refreshJti });

    await redis.set(`refresh:${refreshJti}`, user.id, 60 * 60 * 24 * 7);
    await pool.query('UPDATE public.users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: {
          userId:      user.id,
          email:       user.email,
          role:        user.role,
          hostelId:    user.hostel_id,
          displayName: user.display_name ?? null,
          theme:       user.theme ?? 'dark',
          language:    user.language ?? 'en',
        },
      },
    });
  });
}