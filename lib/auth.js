// Signed-cookie sessions (no database table needed) and a small login throttle.
const crypto = require('crypto');

const COOKIE = 'ss_session';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days: kids should not have to log in every class

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setSession(req, res, payload, secret) {
  const token = sign({ ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S }, secret);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure ? '; Secure' : ''}`
  );
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function getSession(req, secret) {
  return verify(readCookie(req, COOKIE), secret);
}

// 6 wrong tries for the same account from the same address → wait 2 minutes.
const failures = new Map();
function throttled(key) {
  const f = failures.get(key);
  return f && f.count >= 6 && Date.now() - f.last < 2 * 60 * 1000;
}
function recordFailure(key) {
  const f = failures.get(key) || { count: 0, last: 0 };
  if (Date.now() - f.last > 2 * 60 * 1000) f.count = 0;
  f.count += 1;
  f.last = Date.now();
  failures.set(key, f);
}
function clearFailures(key) {
  failures.delete(key);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const newPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
const randomSecret = () => crypto.randomBytes(32).toString('base64url');

module.exports = { setSession, clearSession, getSession, throttled, recordFailure, clearFailures, safeEqual, newPin, randomSecret };
