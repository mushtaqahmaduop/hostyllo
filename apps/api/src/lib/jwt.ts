import { SignJWT, jwtVerify } from 'jose';

// Cache keys — import once, reuse forever
let _privateKey: CryptoKey | null = null;
let _publicKey: CryptoKey | null = null;

const getPrivateKey = async (): Promise<CryptoKey> => {
  if (_privateKey) return _privateKey;
  const key = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
  _privateKey = await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''), 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return _privateKey;
};

const getPublicKey = async (): Promise<CryptoKey> => {
  if (_publicKey) return _publicKey;
  const key = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');
  _publicKey = await crypto.subtle.importKey(
    'spki',
    Buffer.from(key.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, ''), 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return _publicKey;
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
    .sign(await getPrivateKey());
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
    .sign(await getPrivateKey());
}

export interface TokenPayload {
  sub: string;
  hostelId: string;
  role: string;
  jti: string;
  [k: string]: unknown;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, await getPublicKey(), {
    algorithms: ['RS256'],
  });
  return payload as unknown as TokenPayload;
}