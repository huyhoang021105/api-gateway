import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

export function requireTrustedUser(request: Request): { id: string; role: string } {
  const id = request.header('x-user-id');
  const role = request.header('x-user-role') ?? 'user';
  if (!id) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Trusted user identity is missing');
  }
  return { id, role };
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof Error && error.name === 'ZodError') {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } });
    return;
  }
  console.error(error);
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

