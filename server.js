const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { createStore } = require('./lib/store');
const auth = require('./lib/auth');
const rawBuildings = require('./data/buildings');
const resources = require('./data/resources');
// Attach year / architect / stories to each stop for the Resources section.
const buildings = rawBuildings.map((b) => (resources.byStop[b.id] ? { ...b, resources: { ...resources.byStop[b.id], source: resources.SOURCE } } : b));
const { buildSeed, slug } = require('./data/seed');

const store = createStore();
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

// ---------- data access ----------

let ready;
function init() {
  if (!ready) {
    ready = (async () => {
      let config = await store.get('config');
      if (!config) {
        const seed = buildSeed();
        const adminPassword = process.env.ADMIN_PASSWORD || auth.randomSecret().slice(0, 12);
        config = {
          groups: seed.groups,
          legs: seed.legs,
          layout: seed.layout,
          customStops: [],
          studentIds: seed.students.map((s) => s.id),
          sessionSecret: auth.randomSecret(),
          generatedAdminPassword: process.env.ADMIN_PASSWORD ? null : adminPassword,
        };
        for (const s of seed.students) await store.set(`student:${s.id}`, { ...s, pin: auth.defaultPassword(s.name) });
        await store.set('config', config);
        if (config.generatedAdminPassword) {
          console.log(`\n  No ADMIN_PASSWORD set. Generated admin password: ${config.generatedAdminPassword}\n`);
        }
      }
      // One-time update for sites created before these goals were set:
      // WL/LL 1 min, L1 2 min, L2 3 min, MS 4 min per speaker.
      if ((config.goalsVersion || 0) < 2) {
        const goals = { wl: 60, l1: 120, l2: 180, ms: 240 };
        for (const g of config.groups) if (goals[g.id]) g.targetSeconds = goals[g.id];
        config.goalsVersion = 2;
        await store.set('config', config);
      }
      return true;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const getConfig = () => store.get('config');
const saveConfig = (c) => store.set('config', c);
const getStudent = (id) => store.get(`student:${id}`);
const saveStudent = (s) => store.set(`student:${s.id}`, s);
async function allStudents(config) {
  const list = await store.mget(config.studentIds.map((id) => `student:${id}`));
  return list.filter(Boolean);
}
function secretOf(config) {
  return process.env.SESSION_SECRET || config.sessionSecret;
}
function adminPasswordOf(config) {
  return process.env.ADMIN_PASSWORD || config.generatedAdminPassword;
}
function stopsOf(config) {
  return [...buildings, ...(config.customStops || [])];
}
const publicStudent = ({ pin, ...rest }) => rest;

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.use('/api', wrap(async (req, res, next) => {
  await init();
  req.config = await getConfig();
  req.session = auth.getSession(req, secretOf(req.config));
  next();
}));

const needLogin = (req, res, next) => (req.session ? next() : res.status(401).json({ error: 'Please log in.' }));
const needAdmin = (req, res, next) =>
  req.session && req.session.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only.' });
const needStudent = (req, res, next) =>
  req.session && req.session.role === 'student' ? next() : res.status(403).json({ error: 'Students only.' });

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);

// ---------- auth ----------

app.get('/api/roster', wrap(async (req, res) => {
  const students = await allStudents(req.config);
  res.json(students.map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)));
}));

app.post('/api/login', wrap(async (req, res) => {
  const { role, studentId, pin, password } = req.body || {};
  const ip = req.ip || 'x';
  const secret = secretOf(req.config);
  if (role === 'admin') {
    const key = `admin|${ip}`;
    if (auth.throttled(key)) return res.status(429).json({ error: 'Too many tries. Wait two minutes.' });
    if (!password || !auth.safeEqual(password, adminPasswordOf(req.config))) {
      auth.recordFailure(key);
      return res.status(401).json({ error: 'Wrong password.' });
    }
    auth.clearFailures(key);
    auth.setSession(req, res, { role: 'admin' }, secret);
    return res.json({ role: 'admin' });
  }
  const key = `${studentId}|${ip}`;
  if (auth.throttled(key)) return res.status(429).json({ error: 'Too many tries. Wait two minutes, or ask your guide for your password.' });
  const student = studentId && req.config.studentIds.includes(studentId) ? await getStudent(studentId) : null;
  if (!student || !pin || !auth.safeEqual(auth.normalizePassword(pin), auth.normalizePassword(student.pin))) {
    auth.recordFailure(key);
    return res.status(401).json({ error: 'That password does not match. It is your last name and 2026, like smith2026. Ask your guide if it still does not work.' });
  }
  auth.clearFailures(key);
  auth.setSession(req, res, { role: 'student', studentId }, secret);
  res.json({ role: 'student', studentId });
}));

app.post('/api/logout', (req, res) => {
  auth.clearSession(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => res.json(req.session ? { role: req.session.role, studentId: req.session.studentId } : null));

app.get('/api/catalog', needLogin, (req, res) => {
  const { groups, legs } = req.config;
  res.json({ stops: stopsOf(req.config), groups, legs });
});

// ---------- student ----------

// Where each of a student's stops falls in the tour, and who speaks before/after.
function tourContext(config, students, studentId) {
  const segOwner = new Map();
  for (const s of students) for (const seg of s.segments) segOwner.set(seg.id, { student: s, seg });
  const flat = [];
  for (const leg of config.legs) for (const segId of config.layout[leg.id] || []) if (segOwner.has(segId)) flat.push({ leg, segId });
  const out = {};
  flat.forEach((item, i) => {
    if (segOwner.get(item.segId).student.id !== studentId) return;
    const prev = flat[i - 1] && segOwner.get(flat[i - 1].segId);
    const next = flat[i + 1] && segOwner.get(flat[i + 1].segId);
    out[item.segId] = {
      position: i + 1,
      total: flat.length,
      leg: item.leg.name,
      before: prev ? { name: prev.student.name, title: prev.seg.title } : null,
      after: next ? { name: next.student.name, title: next.seg.title } : null,
    };
  });
  return out;
}

app.get('/api/my', needStudent, wrap(async (req, res) => {
  const students = await allStudents(req.config);
  const me = students.find((s) => s.id === req.session.studentId);
  if (!me) return res.status(404).json({ error: 'Student not found.' });
  const group = req.config.groups.find((g) => g.id === me.group);
  res.json({ student: publicStudent(me), group, tour: tourContext(req.config, students, me.id) });
}));

function applySegmentEdit(seg, body, stops) {
  if (body.title !== undefined) seg.title = clip(body.title, 140) || '';
  if (body.text !== undefined) seg.text = clip(body.text, 20000) || '';
  if (body.stopId !== undefined) seg.stopId = body.stopId && stops.some((s) => s.id === body.stopId) ? body.stopId : null;
  seg.updatedAt = new Date().toISOString();
}

async function editSegment(req, res, studentId) {
  const st = await getStudent(studentId);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  const seg = st.segments.find((s) => s.id === req.params.segId);
  if (!seg) return res.status(404).json({ error: 'Stop not found.' });
  applySegmentEdit(seg, req.body || {}, stopsOf(req.config));
  st.updatedAt = seg.updatedAt;
  if (st.status === 'not-started' && seg.text) st.status = 'draft';
  await saveStudent(st);
  res.json(publicStudent(st));
}

async function addSegment(req, res, studentId) {
  const st = await getStudent(studentId);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  if (st.segments.length >= 8) return res.status(400).json({ error: 'That is plenty of stops for one speaker (8 max).' });
  const seg = { id: `${st.id}-${crypto.randomBytes(3).toString('hex')}`, stopId: null, title: 'New stop', text: '', updatedAt: new Date().toISOString() };
  applySegmentEdit(seg, req.body || {}, stopsOf(req.config));
  st.segments.push(seg);
  st.updatedAt = seg.updatedAt;
  await saveStudent(st);
  res.json(publicStudent(st));
}

async function deleteSegment(req, res, studentId) {
  const st = await getStudent(studentId);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  st.segments = st.segments.filter((s) => s.id !== req.params.segId);
  st.updatedAt = new Date().toISOString();
  await saveStudent(st);
  const config = await getConfig();
  for (const k of Object.keys(config.layout)) config.layout[k] = config.layout[k].filter((id) => id !== req.params.segId);
  await saveConfig(config);
  res.json(publicStudent(st));
}

app.put('/api/my/segments/:segId', needStudent, wrap((req, res) => editSegment(req, res, req.session.studentId)));
app.post('/api/my/segments', needStudent, wrap((req, res) => addSegment(req, res, req.session.studentId)));
app.delete('/api/my/segments/:segId', needStudent, wrap((req, res) => deleteSegment(req, res, req.session.studentId)));
app.put('/api/my/status', needStudent, wrap(async (req, res) => {
  const st = await getStudent(req.session.studentId);
  if (['draft', 'ready'].includes(req.body.status)) st.status = req.body.status;
  await saveStudent(st);
  res.json(publicStudent(st));
}));

// ---------- admin ----------

app.get('/api/admin/state', needAdmin, wrap(async (req, res) => {
  const { groups, legs, layout, customStops } = req.config;
  const students = await allStudents(req.config);
  res.json({ groups, legs, layout, customStops, stops: stopsOf(req.config), students, storage: store.kind });
}));

app.get('/api/admin/export', needAdmin, wrap(async (req, res) => {
  const { sessionSecret, generatedAdminPassword, ...config } = req.config;
  const students = await allStudents(req.config);
  res.setHeader('Content-Disposition', `attachment; filename="skyline-speakers-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), config, students });
}));

// Replace everything with a backup file (from "Download backup" or `npm run make-import`).
app.post('/api/admin/import', needAdmin, wrap(async (req, res) => {
  const { config: inc, students } = req.body || {};
  if (!inc || !Array.isArray(students) || !Array.isArray(inc.legs) || !Array.isArray(inc.groups)) {
    return res.status(400).json({ error: 'That file is not a Skyline Speakers backup.' });
  }
  const config = await getConfig();
  const ids = [];
  for (const raw of students) {
    if (!raw || !raw.name) continue;
    const id = slug(raw.id || raw.name);
    if (ids.includes(id)) continue;
    ids.push(id);
    await saveStudent({
      id,
      name: clip(raw.name, 80),
      email: clip(raw.email || '', 120),
      group: clip(raw.group || 'none', 40),
      note: clip(raw.note || '', 2000),
      earlierDrafts: Array.isArray(raw.earlierDrafts) ? raw.earlierDrafts.slice(0, 10) : [],
      segments: (Array.isArray(raw.segments) ? raw.segments : []).slice(0, 8).map((s, i) => ({
        id: clip(s.id, 80) || `${id}-${i + 1}`, stopId: s.stopId || null, title: clip(s.title || '', 140), text: clip(s.text || '', 20000), updatedAt: s.updatedAt || new Date().toISOString(),
      })),
      status: ['not-started', 'draft', 'ready'].includes(raw.status) ? raw.status : 'draft',
      updatedAt: raw.updatedAt || new Date().toISOString(),
      pin: typeof raw.pin === 'string' && raw.pin.trim() ? clip(raw.pin.trim(), 40) : auth.defaultPassword(raw.name),
    });
  }
  for (const old of config.studentIds) if (!ids.includes(old)) await store.del(`student:${old}`);
  config.studentIds = ids;
  config.groups = inc.groups;
  config.legs = inc.legs;
  config.layout = inc.layout || {};
  config.customStops = inc.customStops || [];
  await saveConfig(config);
  res.json({ students: ids.length });
}));

app.put('/api/admin/layout', needAdmin, wrap(async (req, res) => {
  const incoming = req.body.layout || {};
  const config = await getConfig();
  const layout = {};
  const seen = new Set();
  for (const leg of config.legs) {
    layout[leg.id] = (Array.isArray(incoming[leg.id]) ? incoming[leg.id] : []).filter((id) => typeof id === 'string' && !seen.has(id) && seen.add(id));
  }
  config.layout = layout;
  await saveConfig(config);
  res.json({ layout });
}));

app.put('/api/admin/groups', needAdmin, wrap(async (req, res) => {
  const config = await getConfig();
  const groups = (req.body.groups || [])
    .filter((g) => g && g.name)
    .map((g) => ({
      id: clip(g.id, 40) || slug(g.name) || crypto.randomBytes(3).toString('hex'),
      name: clip(g.name, 40),
      color: /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : '#8a8f9c',
      targetSeconds: Math.max(15, Math.min(900, Number(g.targetSeconds) || 120)),
    }));
  if (!groups.some((g) => g.id === 'none')) groups.push({ id: 'none', name: 'Unassigned', color: '#8a8f9c', targetSeconds: 120 });
  config.groups = groups;
  await saveConfig(config);
  // Students in a deleted group fall back to Unassigned.
  const ids = new Set(groups.map((g) => g.id));
  for (const st of await allStudents(config)) {
    if (!ids.has(st.group)) {
      st.group = 'none';
      await saveStudent(st);
    }
  }
  res.json({ groups });
}));

app.post('/api/admin/students', needAdmin, wrap(async (req, res) => {
  const name = clip((req.body.name || '').trim(), 80);
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  const config = await getConfig();
  let id = slug(name);
  while (config.studentIds.includes(id)) id += '-2';
  const st = {
    id, name, email: clip(req.body.email || '', 120), group: req.body.group || 'none', note: '', earlierDrafts: [],
    segments: [], status: 'not-started', updatedAt: new Date().toISOString(), pin: auth.defaultPassword(name),
  };
  await saveStudent(st);
  config.studentIds.push(id);
  await saveConfig(config);
  res.json(st);
}));

app.put('/api/admin/students/:id', needAdmin, wrap(async (req, res) => {
  const st = await getStudent(req.params.id);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  const b = req.body || {};
  if (b.name !== undefined) st.name = clip(b.name, 80) || st.name;
  if (b.email !== undefined) st.email = clip(b.email, 120);
  if (b.group !== undefined && req.config.groups.some((g) => g.id === b.group)) st.group = b.group;
  if (b.note !== undefined) st.note = clip(b.note, 2000);
  if (['not-started', 'draft', 'ready'].includes(b.status)) st.status = b.status;
  if (typeof b.pin === 'string' && b.pin.trim().length >= 3) st.pin = clip(b.pin.trim(), 40);
  if (b.resetPin) st.pin = auth.defaultPassword(st.name);
  await saveStudent(st);
  res.json(st);
}));

app.delete('/api/admin/students/:id', needAdmin, wrap(async (req, res) => {
  const config = await getConfig();
  const st = await getStudent(req.params.id);
  config.studentIds = config.studentIds.filter((id) => id !== req.params.id);
  if (st) {
    const segIds = new Set(st.segments.map((s) => s.id));
    for (const k of Object.keys(config.layout)) config.layout[k] = config.layout[k].filter((id) => !segIds.has(id));
  }
  await saveConfig(config);
  await store.del(`student:${req.params.id}`);
  res.json({ ok: true });
}));

// Set every student's password back to the default (last name + 2026).
app.post('/api/admin/reset-passwords', needAdmin, wrap(async (req, res) => {
  const students = await allStudents(req.config);
  for (const st of students) {
    st.pin = auth.defaultPassword(st.name);
    await saveStudent(st);
  }
  res.json({ count: students.length });
}));

app.put('/api/admin/students/:id/segments/:segId', needAdmin, wrap((req, res) => editSegment(req, res, req.params.id)));
app.post('/api/admin/students/:id/segments', needAdmin, wrap((req, res) => addSegment(req, res, req.params.id)));
app.delete('/api/admin/students/:id/segments/:segId', needAdmin, wrap((req, res) => deleteSegment(req, res, req.params.id)));

app.post('/api/admin/stops', needAdmin, wrap(async (req, res) => {
  const b = req.body || {};
  const name = clip((b.name || '').trim(), 100);
  const lat = Number(b.lat);
  const lon = Number(b.lon);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Name and a map spot are required.' });
  const config = await getConfig();
  const stop = {
    id: `custom-${crypto.randomBytes(3).toString('hex')}`, name, short: clip(b.short || name, 30), kind: 'custom',
    branch: ['main', 'north', 'south'].includes(b.branch) ? b.branch : 'main', address: clip(b.address || '', 120),
    facts: clip(b.facts || '', 600), map: '', lat, lon,
  };
  config.customStops = [...(config.customStops || []), stop];
  await saveConfig(config);
  res.json(stop);
}));

app.delete('/api/admin/stops/:id', needAdmin, wrap(async (req, res) => {
  const config = await getConfig();
  config.customStops = (config.customStops || []).filter((s) => s.id !== req.params.id);
  await saveConfig(config);
  res.json({ ok: true });
}));

// ---------- static + errors ----------

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.expose ? err.message : 'Something went wrong on the server.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Skyline Speakers running at http://localhost:${port} (storage: ${store.kind})`);
    init().catch((e) => console.error(e));
  });
}

module.exports = app;
