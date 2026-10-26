import http from 'k6/http';
import { check } from 'k6';

const rate = Number(__ENV.RATE || 8);
const duration = __ENV.DURATION || '30s';

export const options = {
  scenarios: {
    controlled_rate: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration,
      preAllocatedVUs: 4,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const target = __ENV.TARGET;
  if (!target) throw new Error('TARGET is required');
  const headers = __ENV.TOKEN
    ? { Authorization: `Bearer ${__ENV.TOKEN}` }
    : { 'X-User-Id': __ENV.USER_ID || 'usr-001', 'X-User-Role': 'user' };
  const response = http.get(target, { headers });
  check(response, { 'status is 200': (value) => value.status === 200 });
}

