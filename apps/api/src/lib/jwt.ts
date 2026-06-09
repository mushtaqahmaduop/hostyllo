import { SignJWT, jwtVerify } from 'jose';

const privateKey = async () => {
  const key = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
  return await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''), 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
};

const publicKey = async () => {
  const key = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');
  return await crypto.subtle.importKey(
    'spki',
    Buffer.from(key.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, ''), 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
};

export async function signAccessToken(payload: {
  sub: string;
  hostelId: string;
  role: string;
  jti: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(await privateKey());
}

export async function signRefreshToken(payload: {
  sub: string;
  hostelId: string;
  jti: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(await privateKey());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, await publicKey(), {
    algorithms: ['RS256'],
  });
  return payload;
}