import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, login, authHeaders } from './common.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
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

  group('BFF - leads list and ETag', () => {
    const res = http.get(`${BASE_URL}/bff/leads`, { headers: authHeaders(token) });
    check(res, {
      'list 200': (r) => r.status === 200,
      'list has items': (r) => Array.isArray(r.json('items')),
    });
    const etag = res.headers['ETag'];
    if (etag) {
      const res304 = http.get(`${BASE_URL}/bff/leads`, { headers: authHeaders(token, { 'If-None-Match': etag }) });
      check(res304, { 'etag 304': (r) => r.status === 304 });
    }
    httpDuration.add(res.timings.duration);
    httpFailed.add(res.status >= 400);
  });

  group('BFF - stats', () => {
    const s1 = http.get(`${BASE_URL}/bff/stats/summary`, { headers: authHeaders(token) });
    check(s1, { 'summary 200': (r) => r.status === 200 });
    const s2 = http.get(`${BASE_URL}/bff/stats/leads-trend`, { headers: authHeaders(token) });
    check(s2, { 'trend 200': (r) => r.status === 200 });
  });

  sleep(1);
}
