import { baseConfig } from '../shared/config.js';
import { createDashboardApp } from './app.js';

const { PORT } = baseConfig();
createDashboardApp().listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', service: 'dashboard-bff', message: 'listening', port: PORT }));
});

