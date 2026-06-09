import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex');

function encryptSecret(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptSecret(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export async function authRoutes(app: FastifyInstance) {

  // POST /api/v1/auth/login
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.code(400).send({ success: false, code: 'AUTH_001', message: 'Email and password required' });
    }

    // Find user — fetch all fields needed for response + MFA check
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
      // Constant-time dummy compare — prevent user enumeration via timing
      await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000');
      return reply.code(401).send({ success: false, code: 'AUTH_002', message: 'Invalid credentials' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ success: false, code: 'AUTH_002', message: 'Invalid credentials' });
    }

    // MFA branch — PRD SEC-06
    // If TOTP enabled: do NOT issue tokens, return short-lived mfaToken instead
    if (user.totp_enabled) {
      const mfaToken = randomUUID();
      await redis.set(`mfa:${mfaToken}`, user.id, 60 * 5); // 5 min TTL
      return reply.send({
        success: true,
        data: { requiresMfa: true, mfaToken },
      });
    }

    // No MFA — issue tokens
    const jti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await signAccessToken({
      sub: user.id,
      hostelId: user.hostel_id,
      role: user.role,
      jti,
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      hostelId: user.hostel_id,
      jti: refreshJti,
    });

    // Store refresh token jti in Redis (7 days)
    await redis.set(`refresh:${refreshJti}`, user.id, 60 * 60 * 24 * 7);

    // Update last login
    await pool.query('UPDATE public.users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Set httpOnly cookie
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

    // Check jti blocklist
    const exists = await redis.exists(`refresh:${payload.jti}`);
    if (!exists) {
      return reply.code(401).send({ success: false, code: 'AUTH_005', message: 'Token revoked' });
    }

    // Rotate — delete old jti, issue new tokens
    await redis.del(`refresh:${payload.jti}`);

    const newJti = randomUUID();
    const newRefreshJti = randomUUID();

    const accessToken = await signAccessToken({
      sub: payload.sub as string,
      hostelId: payload.hostelId as string,
      role: payload.role as string,
      jti: newJti,
    });

    const newRefreshToken = await signRefreshToken({
      sub: payload.sub as string,
      hostelId: payload.hostelId as string,
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
    // Blocklist the access token jti (15 min — matches access token expiry)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await verifyToken(authHeader.slice(7)) as any;
        await redis.set(`blocklist:${payload.jti}`, '1', 60 * 15);
      } catch {
        // Already invalid — fine
      }
    }

    // Invalidate refresh token
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
  app.post('/reset-password', async (request, reply) => {
    const { email } = request.body as { email: string };

    if (!email) {
      return reply.code(400).send({ success: false, code: 'AUTH_006', message: 'Email required' });
    }

    const result = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
      [email.toLowerCase()]
    );

    if (!result.rows[0]) {
      return reply.send({ success: true, data: { message: 'If this email exists, an OTP has been sent' } });
    }

    const userId = result.rows[0].id;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.set(`otp:${userId}`, otp, 60 * 15);

    // TODO: remove before first real client
    console.log(`OTP for ${email}: ${otp}`);

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
      randomUUID().replace(/-/g, '').slice(0, 8)
    );
    await redis.set(`totp_backup:${userId}`, JSON.stringify(backupCodes), 60 * 10);

    return reply.send({ success: true, data: { otpAuthUri, backupCodes } });
  });

  // POST /api/v1/auth/totp/verify
  app.post('/totp/verify', async (request, reply) => {
    const { mfaToken, code } = request.body as { mfaToken: string; code: string };

    if (!mfaToken || !code) {
      return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR', message: 'mfaToken and code required' });
    }

    // Validate mfaToken from Redis — one-time use
    const userId = await redis.get(`mfa:${mfaToken}`);
    if (!userId) {
      return reply.code(401).send({ success: false, code: 'AUTH_INVALID_MFA_TOKEN', message: 'MFA token expired or invalid' });
    }

    // Fetch user + extra fields for response
    const userResult = await pool.query(
      `SELECT id, hostel_id, role, email, totp_secret_enc, display_name, theme, language
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) return reply.code(401).send({ success: false, code: 'AUTH_INVALID_MFA_TOKEN', message: 'MFA token expired or invalid' });

    // Verify TOTP code
    const secret = decryptSecret(user.totp_secret_enc);
    const result = verifySync({ token: code, secret });
    if (!result.valid) {
      return reply.code(401).send({ success: false, code: 'AUTH_INVALID_TOTP_CODE', message: 'Invalid TOTP code' });
    }

    // Consume mfaToken — one-time use enforced
    await redis.del(`mfa:${mfaToken}`);

    // Mark TOTP as confirmed (first verify enables it)
    await pool.query('UPDATE public.users SET totp_enabled = true WHERE id = $1', [user.id]);

    // Issue tokens
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