import express from 'express';
import { errorHandler, requireTrustedUser } from '../shared/http.js';

const orders = [
  { id: 'ord-1001', userId: 'usr-001', total: 49.9, currency: 'USD', status: 'paid' },
  { id: 'ord-1002', userId: 'usr-001', total: 19.5, currency: 'USD', status: 'processing' },
];

export function createOrderApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'order-service' }));
  app.get('/orders', (request, response) => {
    const identity = requireTrustedUser(request);
    response.json({ orders: orders.filter((order) => order.userId === identity.id) });
  });
  app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);
  return app;
}

