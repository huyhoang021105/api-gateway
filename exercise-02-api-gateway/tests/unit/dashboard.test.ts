import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createDashboardApp } from '../../services/dashboard-bff/app.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dashboard aggregation', () => {
  it('merges successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'usr-001' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ orders: [{ id: 'ord-1' }] }), { status: 200 })));
    const response = await request(createDashboardApp({ userUrl: 'http://user.test', orderUrl: 'http://order.test' }))
      .get('/dashboard').set('X-User-Id', 'usr-001').set('X-User-Role', 'user');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ user: { id: 'usr-001' }, orders: [{ id: 'ord-1' }], partial: false });
  });

  it('returns a partial response when one dependency fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'usr-001' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 })));
    const response = await request(createDashboardApp({ userUrl: 'http://user.test', orderUrl: 'http://order.test' }))
      .get('/dashboard').set('X-User-Id', 'usr-001');
    expect(response.status).toBe(206);
    expect(response.body.partial).toBe(true);
    expect(response.body.ordersError).toContain('503');
  });
});

