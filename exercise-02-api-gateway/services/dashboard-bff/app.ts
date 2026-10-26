import express from 'express';
import { errorHandler, requireTrustedUser } from '../shared/http.js';

type DependencyResult = { ok: true; data: unknown } | { ok: false; timeout: boolean; error: string };

async function callDependency(url: string, userId: string, role: string, timeoutMs: number): Promise<DependencyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'X-User-Id': userId, 'X-User-Role': role },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, timeout: false, error: `Dependency returned ${response.status}` };
    return { ok: true, data: await response.json() };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return { ok: false, timeout: timedOut, error: timedOut ? 'Dependency timed out' : 'Dependency unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

export function createDashboardApp(options?: { userUrl?: string; orderUrl?: string; timeoutMs?: number }) {
  const app = express();
  const userUrl = options?.userUrl ?? `${process.env.USER_SERVICE_URL ?? 'http://user-service:3000'}/users/me`;
  const orderUrl = options?.orderUrl ?? `${process.env.ORDER_SERVICE_URL ?? 'http://order-service:3000'}/orders`;
  const timeoutMs = options?.timeoutMs ?? Number(process.env.DEPENDENCY_TIMEOUT_MS ?? 2000);
  app.disable('x-powered-by');

  app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'dashboard-bff' }));
  app.get('/dashboard', async (request, response, next) => {
    try {
      const identity = requireTrustedUser(request);
      const [user, orders] = await Promise.all([
        callDependency(userUrl, identity.id, identity.role, timeoutMs),
        callDependency(orderUrl, identity.id, identity.role, timeoutMs),
      ]);
      if (user.ok && orders.ok) {
        response.json({ ...(user.data as object), ...(orders.data as object), partial: false });
        return;
      }
      if (user.ok || orders.ok) {
        response.status(206).json({
          ...(user.ok ? user.data as object : { userError: user.error }),
          ...(orders.ok ? orders.data as object : { ordersError: orders.error }),
          partial: true,
        });
        return;
      }
      const bothTimedOut = user.timeout && orders.timeout;
      response.status(bothTimedOut ? 504 : 502).json({
        error: { code: bothTimedOut ? 'DEPENDENCY_TIMEOUT' : 'DEPENDENCY_FAILURE', message: 'Dashboard dependencies failed' },
      });
    } catch (error) {
      next(error);
    }
  });
  app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);
  return app;
}

