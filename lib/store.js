// Tiny key/value store with two backends:
//  - Upstash Redis / Vercel KV over REST (when KV_REST_API_URL + KV_REST_API_TOKEN
//    or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set). Needed on
//    serverless hosts like Vercel, where the filesystem does not persist.
//  - A local JSON file (data/db.json) for running on a normal server or laptop.
// Values are JSON. Every student lives under their own key, so two students
// saving at the same moment never overwrite each other.

const fs = require('fs');
const path = require('path');

// Every key starts with this, so the site can share a Redis database with other
// apps (for example the Skyline Quest game) without touching their data.
const PREFIX = process.env.KV_PREFIX || 'skylinescripts:';

function redisStore(url, token) {
  async function cmd(args) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`KV error ${res.status}: ${await res.text()}`);
    const body = await res.json();
    if (body.error) throw new Error(`KV error: ${body.error}`);
    return body.result;
  }
  return {
    kind: 'redis',
    async get(key) {
      const v = await cmd(['GET', PREFIX + key]);
      return v == null ? null : JSON.parse(v);
    },
    async set(key, value) {
      await cmd(['SET', PREFIX + key, JSON.stringify(value)]);
    },
    async del(key) {
      await cmd(['DEL', PREFIX + key]);
    },
    async mget(keys) {
      if (!keys.length) return [];
      const vals = await cmd(['MGET', ...keys.map((k) => PREFIX + k)]);
      return vals.map((v) => (v == null ? null : JSON.parse(v)));
    },
  };
}

function fileStore(file) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = {};
  }
  let writing = Promise.resolve();
  function persist() {
    const snapshot = JSON.stringify(data, null, 1);
    writing = writing.then(async () => {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      const tmp = file + '.tmp';
      await fs.promises.writeFile(tmp, snapshot);
      await fs.promises.rename(tmp, file);
    });
    return writing;
  }
  const clone = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return {
    kind: 'file',
    async get(key) {
      return clone(data[key]);
    },
    async set(key, value) {
      data[key] = clone(value);
      await persist();
    },
    async del(key) {
      delete data[key];
      await persist();
    },
    async mget(keys) {
      return keys.map((k) => clone(data[k]));
    },
  };
}

function createStore() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisStore(url, token);
  if (process.env.VERCEL) {
    // Vercel can't keep files, so refuse to run without a database, with a message
    // the login page can show instead of a crash.
    const fail = async () => {
      const e = new Error('The site needs its database: in Vercel, open Storage, add an Upstash Redis (KV) store to this project, then redeploy.');
      e.expose = true;
      throw e;
    };
    return { kind: 'missing', get: fail, set: fail, del: fail, mget: fail };
  }
  return fileStore(process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'db.json'));
}

module.exports = { createStore };
