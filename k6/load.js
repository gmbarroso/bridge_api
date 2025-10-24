import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, login, authHeaders, pick } from './common.js';

export const options = {
  scenarios: {
    ramp_list_and_stats: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<150'],
  },
};

export const httpDuration = new Trend('http_duration');
export const httpFailed = new Rate('http_failed');

export function setup() {
  const token = login();
  return { token };
}

export default function (data) {
  const token = data.token;

  group('BFF - leads list with filters', () => {
    const stages = [undefined, 'new', 'qualified', 'scheduled', 'converted', 'lost'];
    const sources = [undefined, 'whatsapp', 'instagram', 'site'];
    const params = new URLSearchParams();
    const stage = pick(stages);
    const source = pick(sources);
    if (stage) params.append('stage', stage);
    if (source) params.append('source', source);

    const res = http.get(`${BASE_URL}/bff/leads?${params.toString()}`, { headers: authHeaders(token) });
    check(res, { 'list 200': (r) => r.status === 200 });
    httpDuration.add(res.timings.duration);
    httpFailed.add(res.status >= 400);
  });

  group('BFF - stats summary/trend', () => {
    const s1 = http.get(`${BASE_URL}/bff/stats/summary`, { headers: authHeaders(token) });
    check(s1, { 'summary 200': (r) => r.status === 200 });

    const s2 = http.get(`${BASE_URL}/bff/stats/leads-trend`, { headers: authHeaders(token) });
    check(s2, { 'trend 200': (r) => r.status === 200 });
  });

  sleep(1);
}
