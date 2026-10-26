import { beforeEach, describe, expect, it } from 'vitest';
import { issueToken, verifyAuthorizationHeader } from '../../services/user-service/auth.js';

describe('JWT verification', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
    process.env.JWT_ISSUER = 'security-patterns-lab';
    process.env.JWT_AUDIENCE = 'api-gateway';
    process.env.JWT_TTL_SECONDS = '900';
  });

  it('accepts a signed token with required claims', async () => {
    const { token } = await issueToken({ id: 'usr-001', role: 'user' });
    await expect(verifyAuthorizationHeader(`Bearer ${token}`)).resolves.toEqual({ id: 'usr-001', role: 'user' });
  });

  it('rejects a malformed token', async () => {
    await expect(verifyAuthorizationHeader('Bearer not-a-jwt')).rejects.toMatchObject({ status: 401 });
  });
});

