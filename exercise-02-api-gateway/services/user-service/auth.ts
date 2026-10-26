import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { jwtConfigSchema } from '../shared/config.js';
import { HttpError } from '../shared/http.js';

export type AuthIdentity = { id: string; role: string };

function config() {
  return jwtConfigSchema.parse(process.env);
}

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function issueToken(identity: AuthIdentity): Promise<{ token: string; expiresIn: number }> {
  const values = config();
  const token = await new SignJWT({ role: identity.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(identity.id)
    .setIssuer(values.JWT_ISSUER)
    .setAudience(values.JWT_AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${values.JWT_TTL_SECONDS}s`)
    .sign(secretKey(values.JWT_SECRET));
  return { token, expiresIn: values.JWT_TTL_SECONDS };
}

export async function verifyAuthorizationHeader(header: string | undefined): Promise<AuthIdentity> {
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Bearer token is required');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Bearer token is required');
  }
  const values = config();
  try {
    const { payload, protectedHeader } = await jwtVerify(token, secretKey(values.JWT_SECRET), {
      algorithms: ['HS256'],
      issuer: values.JWT_ISSUER,
      audience: values.JWT_AUDIENCE,
      requiredClaims: ['sub', 'iat', 'exp', 'jti'],
    });
    if (protectedHeader.alg !== 'HS256' || typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      throw new HttpError(401, 'INVALID_TOKEN', 'Required token claims are missing');
    }
    return { id: payload.sub, role: payload.role };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof joseErrors.JWTExpired) {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Token has expired');
    }
    throw new HttpError(401, 'INVALID_TOKEN', 'Token verification failed');
  }
}

