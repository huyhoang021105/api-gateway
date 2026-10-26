import { baseConfig } from '../shared/config.js';
import { createOrderApp } from './app.js';

const { PORT } = baseConfig();
createOrderApp().listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', service: 'order-service', message: 'listening', port: PORT }));
});

