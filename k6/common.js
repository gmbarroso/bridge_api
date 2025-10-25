import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const EMAIL = __ENV.EMAIL || '';
export const PASSWORD = __ENV.PASSWORD || '';

export function login() {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/auth/login`, payload, { headers });
  check(res, {
    'login status is 201': (r) => r.status === 201,
    'login has token': (r) => !!(r.json('accessToken')),
  });
  return res.status === 201 ? res.json('accessToken') : null;
}

export function authHeaders(token, extra = {}) {
  return Object.assign({ Authorization: `Bearer ${token}` }, extra);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
