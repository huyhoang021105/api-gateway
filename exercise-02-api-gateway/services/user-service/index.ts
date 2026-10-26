import { baseConfig } from '../shared/config.js';
import { createUserApp } from './app.js';
import { ensureBucket } from './storage.js';

const { PORT } = baseConfig();
await ensureBucket();
createUserApp().listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', service: 'user-service', message: 'listening', port: PORT }));
});

