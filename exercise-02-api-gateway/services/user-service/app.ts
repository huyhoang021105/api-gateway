import express from 'express';
import { z } from 'zod';
import { asyncHandler, errorHandler, HttpError, requireTrustedUser } from '../shared/http.js';
import { issueToken, verifyAuthorizationHeader } from './auth.js';
import { buildUsers, passwordMatches, publicUser } from './fixtures.js';
import { allowedContentTypes, confirmAvatar, createAvatarUpload } from './storage.js';

export function createUserApp() {
  const app = express();
  const users = buildUsers();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'user-service' }));

  app.post('/auth/login', asyncHandler(async (request, response) => {
    const input = z.object({ email: z.string().email(), password: z.string().min(1).max(256) }).parse(request.body);
    const user = users.find((candidate) => candidate.email.toLowerCase() === input.email.toLowerCase());
    if (!user || !passwordMatches(input.password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    const issued = await issueToken({ id: user.id, role: user.role });
    response.json({ accessToken: issued.token, tokenType: 'Bearer', expiresIn: issued.expiresIn });
  }));

  app.get('/internal/auth/verify', asyncHandler(async (request, response) => {
    const identity = await verifyAuthorizationHeader(request.header('authorization'));
    response.setHeader('X-User-Id', identity.id);
    response.setHeader('X-User-Role', identity.role);
    response.status(204).end();
  }));

  app.get('/users/me', (request, response) => {
    const identity = requireTrustedUser(request);
    const user = users.find((candidate) => candidate.id === identity.id);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    response.json({ user: publicUser(user) });
  });

  app.post('/users/me/avatar-upload-request', asyncHandler(async (request, response) => {
    const identity = requireTrustedUser(request);
    const input = z.object({ contentType: z.enum(allowedContentTypes) }).parse(request.body);
    response.json(await createAvatarUpload(identity.id, input.contentType));
  }));

  app.post('/users/me/avatar-confirm', asyncHandler(async (request, response) => {
    const identity = requireTrustedUser(request);
    const input = z.object({ objectKey: z.string().min(1).max(512) }).parse(request.body);
    response.json(await confirmAvatar(identity.id, input.objectKey));
  }));

  app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);
  return app;
}

