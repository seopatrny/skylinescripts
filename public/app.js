/* Skyline Speakers front end: one small vanilla-JS app for students and admins. */
(function () {
  const $app = document.getElementById('app');
  const WPM = 120; // speaking pace used for time estimates

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const words = (t) => (String(t || '').trim().match(/\S+/g) || []).length;
  const secs = (t) => Math.round((words(t) / WPM) * 60);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const firstName = (n) => String(n || '').split(' ')[0];
  const ago = (iso) => {
    if (!iso) return '';
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)} min ago`;
    if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('on'), 2200);
  }
  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/login') { state.me = null; route(); }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  function debounce(fn, ms) {
    let t;
    const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.flush = (...a) => { clearTimeout(t); fn(...a); };
    return d;
  }
  const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 24h4V12h3v12h3V6h3v18h3V14h3v10h4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M2 28c4-2 8 2 14 0s10 2 14 0" stroke="#50c3e6" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;

  const state = { me: undefined, catalog: null, my: null, admin: null, tab: 'tour', hidden: new Set(), focusGroup: null };
  const stopById = (id) => state.catalog && state.catalog.stops.find((s) => s.id === id);
  const groupById = (id) => state.catalog && (state.catalog.groups.find((g) => g.id === id) || state.catalog.groups.find((g) => g.id === 'none'));

  function stopOptions(selected) {
    const by = { main: 'Main Branch', north: 'North Branch', south: 'South Branch' };
    const out = [`<option value="">Choose a building or story…</option>`];
    for (const [k, label] of Object.entries(by)) {
      const list = state.catalog.stops.filter((s) => (s.branch || 'main') === k);
      out.push(`<optgroup label="${label}">${list.map((s) => `<option value="${esc(s.id)}"${s.id === selected ? ' selected' : ''}>${esc(s.name)}${s.map ? ` (${esc(s.map)})` : ''}</option>`).join('')}</optgroup>`);
    }
    return out.join('');
  }

  // ---------- routing ----------
  async function boot() {
    try {
      state.me = await api('GET', '/api/me');
    } catch {
      state.me = null;
    }
    route();
  }
  window.addEventListener('hashchange', () => {
    if (state.me && state.me.role === 'admin') {
      state.tab = (location.hash || '#tour').slice(1);
      renderAdmin();
    }
  });
  async function route() {
    if (!state.me) return renderLogin();
    state.catalog = await api('GET', '/api/catalog');
    if (state.me.role === 'admin') {
      state.tab = (location.hash || '#tour').slice(1);
      await loadAdmin();
      renderAdmin();
    } else {
      await loadMy();
      renderStudent();
    }
  }
  async function logout() {
    await api('POST', '/api/logout');
    state.me = null;
    history.replaceState(null, '', '/');
    renderLogin();
  }

  // ---------- login ----------
  async function renderLogin(mode = 'student') {
    let roster = [];
    let setupError = '';
    try { roster = await api('GET', '/api/roster'); } catch (e) { setupError = e.message; }
    $app.innerHTML = `
      <div class="login-wrap">
        <form class="login-card" autocomplete="off">
          <div class="login-hero">
            <h1>Skyline Speakers</h1>
            <p>Write your stop on the Chicago River tour.</p>
            <svg class="skyline" viewBox="0 0 150 60" aria-hidden="true"><path d="M0 60V40h10V22h8v38h6V8h10v52h6V30h12v30h8V14h4V4h4v10h4v46h6V36h10v24h8V20h10v40h10V44h12v16z" fill="#fff"/></svg>
          </div>
          <div class="tabs" role="tablist">
            <button type="button" data-mode="student" class="${mode === 'student' ? 'on' : ''}">I'm a student</button>
            <button type="button" data-mode="admin" class="${mode === 'admin' ? 'on' : ''}">I'm a guide</button>
          </div>
          <div class="login-body">
            ${mode === 'student' ? `
              <label class="field">Your name
                <select name="studentId" required>
                  <option value="">Pick your name…</option>
                  ${roster.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}
                </select>
              </label>
              <label class="field">Your password
                <input class="pin-input" name="pin" type="password" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="lastname2026" required>
              </label>` : `
              <label class="field">Guide password
                <input name="password" type="password" required autocomplete="current-password">
              </label>`}
            <div class="err">${esc(setupError)}</div>
            <button class="btn primary" type="submit" style="justify-content:center;padding:11px">Log in</button>
          </div>
        </form>
      </div>`;
    const form = $app.querySelector('form');
    form.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => renderLogin(b.dataset.mode)));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      const err = form.querySelector('.err');
      err.textContent = '';
      try {
        state.me = await api('POST', '/api/login', mode === 'admin' ? { role: 'admin', password: fd.password } : { studentId: fd.studentId, pin: fd.pin });
        route();
      } catch (ex) {
        err.textContent = ex.message;
      }
    });
    (form.querySelector('select, input') || {}).focus?.();
  }

  function topbar(inner, who) {
    return `<header class="topbar"><div class="brand">${LOGO}<span>Skyline Speakers</span></div>${inner || ''}<div class="spacer"></div>
      <span class="who">${esc(who || '')}</span><button class="btn small" data-act="logout">Log out</button></header>`;
  }

  // ---------- segment editor (shared by students and admins) ----------
  function scriptPlaceholder(group) {
    if (group && group.targetSeconds <= 90) {
      return 'HOOK\nLook! This is ___. It has a big secret!\n\nFIND THE BUILDING\nCan you see it? Look for ___!\n\nTHE AMAZING STORY\nLook! …\nGuess what? …\nWow! Here is more. …\n\nLOOK CLOSELY\nWhat shapes and colors do you see?\n\nTHE BIG FINISH\nNow you know a secret about ___! Thank you!';
    }
    return 'HOOK\nWhat if I told you that ___ has a story you would never expect?\n\nFIND THE BUILDING\nWhat should riders look for?\n\nTHE AMAZING STORY\nWho built it? When? Why? What makes it unique? What is the one fact people will remember?\n\nLOOK CLOSELY\nGive riders something to spot.\n\nTHE BIG FINISH\nSo the next time you pass ___, remember its secret. Thank you for riding with me!';
  }

  function segFields(seg, group, compact) {
    return `
      <div class="seg-row">
        <label class="field">Stop on the river<select data-f="stopId">${stopOptions(seg.stopId)}</select></label>
        <label class="field">Title<input type="text" data-f="title" value="${esc(seg.title)}" maxlength="140"></label>
      </div>
      <textarea class="script" data-f="text" spellcheck="true" placeholder="${esc(scriptPlaceholder(group))}" ${compact ? 'style="min-height:260px"' : ''}>${esc(seg.text)}</textarea>
      <div class="seg-foot">
        <span data-out="words">${words(seg.text)} words</span>
        <span data-out="time">about ${fmt(secs(seg.text))} out loud</span>
        <button type="button" class="btn small ghost" data-act="practice">▶ Practice</button>
        <button type="button" class="btn small ghost danger" data-act="remove">Remove stop</button>
        <span class="saved muted" data-out="saved">${seg.updatedAt ? `Saved ${ago(seg.updatedAt)}` : ''}</span>
      </div>`;
  }

  // Wires autosave on an element containing [data-seg] blocks. save(segId, patch) → Promise<student>
  function bindSegEditors(root, { getSeg, save, remove, onChange }) {
    const pending = new Map();
    const saver = (segId) => {
      if (!pending.has(segId)) {
        pending.set(segId, debounce(async (patch) => {
          const box = root.querySelector(`[data-seg="${CSS.escape(segId)}"] [data-out="saved"]`);
          try {
            await save(segId, patch);
            if (box) box.textContent = 'Saved ✓';
          } catch (e) {
            if (box) box.textContent = `Not saved: ${e.message}`;
          }
        }, 700));
      }
      return pending.get(segId);
    };
    root.addEventListener('input', (e) => {
      const block = e.target.closest('[data-seg]');
      const f = e.target.dataset.f;
      if (!block || !f || f === 'stopId') return;
      const segId = block.dataset.seg;
      const seg = getSeg(segId);
      seg[f] = e.target.value;
      if (f === 'text') {
        block.querySelector('[data-out="words"]').textContent = `${words(seg.text)} words`;
        block.querySelector('[data-out="time"]').textContent = `about ${fmt(secs(seg.text))} out loud`;
      }
      block.querySelector('[data-out="saved"]').textContent = 'Saving…';
      saver(segId)({ title: seg.title, text: seg.text });
      onChange && onChange(segId, f);
    });
    root.addEventListener('change', (e) => {
      const block = e.target.closest('[data-seg]');
      if (!block || e.target.dataset.f !== 'stopId') return;
      const segId = block.dataset.seg;
      const seg = getSeg(segId);
      const prev = stopById(seg.stopId);
      seg.stopId = e.target.value || null;
      const stop = stopById(seg.stopId);
      const titleInput = block.querySelector('[data-f="title"]');
      if (stop && (!seg.title || seg.title === 'New stop' || /^My (stop|building)/.test(seg.title) || (prev && seg.title === prev.name))) {
        seg.title = stop.name;
        titleInput.value = stop.name;
      }
      block.querySelector('[data-out="saved"]').textContent = 'Saving…';
      saver(segId).flush({ stopId: seg.stopId, title: seg.title, text: seg.text });
      onChange && onChange(segId, 'stopId');
    });
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      const block = e.target.closest('[data-seg]');
      if (!btn || !block) return;
      const seg = getSeg(block.dataset.seg);
      if (btn.dataset.act === 'practice') practice(seg);
      if (btn.dataset.act === 'remove') {
        if (!confirm(`Remove "${seg.title || 'this stop'}"${seg.text ? ' and its script' : ''}? This cannot be undone.`)) return;
        await remove(seg.id);
      }
    });
  }

  function practice(seg) {
    const el = document.createElement('div');
    el.className = 'practice';
    el.innerHTML = `<header><b style="flex:1;font-size:18px">${esc(seg.title || 'Practice')}</b>
      <span class="timer">0:00</span><span style="opacity:.7">goal ≈ ${fmt(secs(seg.text))}</span>
      <button class="btn" data-p="go">Start</button><button class="btn" data-p="reset">Reset</button><button class="btn" data-p="close">Close</button></header>
      <div class="text">${esc(seg.text || 'Nothing written yet.')}</div>`;
    document.body.appendChild(el);
    let start = null; let acc = 0; let iv = null;
    const timer = el.querySelector('.timer');
    const tick = () => { timer.textContent = fmt((acc + (start ? Date.now() - start : 0)) / 1000); };
    el.addEventListener('click', (e) => {
      const p = e.target.dataset.p;
      if (p === 'go') {
        if (start) { acc += Date.now() - start; start = null; clearInterval(iv); e.target.textContent = 'Start'; }
        else { start = Date.now(); iv = setInterval(tick, 250); e.target.textContent = 'Pause'; }
      }
      if (p === 'reset') { acc = 0; start = null; clearInterval(iv); tick(); el.querySelector('[data-p="go"]').textContent = 'Start'; }
      if (p === 'close') { clearInterval(iv); el.remove(); }
    });
  }

  // ---------- student view ----------
  async function loadMy() {
    state.my = await api('GET', '/api/my');
  }

  function renderStudent() {
    const { student, group, tour } = state.my;
    const total = student.segments.reduce((a, s) => a + secs(s.text), 0);
    const target = group ? group.targetSeconds : 120;
    const pct = Math.min(100, (total / target) * 100);
    $app.innerHTML = `
      ${topbar('', student.name)}
      <main>
        <div class="student-head">
          <div>
            <div class="muted" style="font-weight:600">Your tour script</div>
            <h1>Hi, ${esc(firstName(student.name))}!</h1>
            <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span class="chip"><span class="dot" style="background:${esc(group?.color)}"></span>${esc(group?.name || 'Unassigned')}</span>
              <label class="chip" style="cursor:pointer"><input type="checkbox" data-act="ready" ${student.status === 'ready' ? 'checked' : ''}> Ready for my guide to review</label>
            </div>
          </div>
          <div class="timebar">
            <div style="display:flex;justify-content:space-between;font-size:13.5px"><b>About ${fmt(total)} total</b><span class="muted">goal about ${fmt(target)}</span></div>
            <div class="track"><div class="fill ${total > target * 1.15 ? 'over' : ''}" style="width:${pct}%"></div></div>
          </div>
        </div>
        ${student.note ? `<div class="note">${esc(student.note)}</div>` : ''}
        <div id="segs">
          ${student.segments.map((seg) => segCard(seg, group, tour[seg.id])).join('') || `<div class="note">You don't have a stop yet. Add one to start writing.</div>`}
        </div>
        <button class="btn primary" data-act="add">+ Add a stop</button>
        <button class="btn" data-act="library">📚 Browse all buildings & stories</button>
        ${student.earlierDrafts?.length ? `<div style="margin-top:22px">${student.earlierDrafts.map((d) => `
          <details class="drafts"><summary>Earlier draft: ${esc(d.label)}</summary><pre>${esc(d.text)}</pre></details>`).join('')}</div>` : ''}
        <div class="panel" style="margin-top:22px;padding:14px 18px">
          <h3 style="font-size:15px;margin-bottom:6px">Research checklist</h3>
          <ul class="tips">
            <li><b>Who?</b> Who designed it?</li><li><b>When?</b> When was it built?</li><li><b>Why?</b> Why was it built?</li>
            <li><b>What?</b> What makes its architecture unique?</li><li><b>Wow!</b> What's one fact people will remember?</li>
          </ul>
          <p class="muted" style="margin:6px 0 0;font-size:13.5px">Your work saves by itself as you type. Use ▶ Practice to read it out loud with a timer.</p>
        </div>
      </main>`;
    $app.querySelector('[data-act="logout"]').onclick = logout;
    $app.querySelector('[data-act="library"]').onclick = openLibrary;
    $app.querySelector('[data-act="add"]').onclick = async () => {
      try {
        state.my.student = await api('POST', '/api/my/segments', {});
        renderStudent();
        const blocks = $app.querySelectorAll('[data-seg]');
        blocks[blocks.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) { toast(e.message); }
    };
    $app.querySelector('[data-act="ready"]').onchange = async (e) => {
      state.my.student = await api('PUT', '/api/my/status', { status: e.target.checked ? 'ready' : 'draft' });
      toast(e.target.checked ? 'Marked ready. Nice work!' : 'Back to draft');
    };
    const segs = $app.querySelector('#segs');
    bindSegEditors(segs, {
      getSeg: (id) => state.my.student.segments.find((s) => s.id === id),
      save: (id, patch) => api('PUT', `/api/my/segments/${encodeURIComponent(id)}`, patch).then(updateTotals),
      remove: async (id) => { state.my.student = await api('DELETE', `/api/my/segments/${encodeURIComponent(id)}`); renderStudent(); },
      onChange: (id, f) => {
        if (f === 'stopId') {
          const block = segs.querySelector(`[data-seg="${CSS.escape(id)}"]`);
          const seg = state.my.student.segments.find((s) => s.id === id);
          block.querySelector('.seg-side').outerHTML = segSide(seg, state.my.tour[seg.id]);
        }
        if (f === 'text') updateTotals();
      },
    });
    function updateTotals() {
      const t = state.my.student.segments.reduce((a, s) => a + secs(s.text), 0);
      const bar = $app.querySelector('.timebar');
      bar.querySelector('b').textContent = `About ${fmt(t)} total`;
      const fill = bar.querySelector('.fill');
      fill.style.width = `${Math.min(100, (t / target) * 100)}%`;
      fill.classList.toggle('over', t > target * 1.15);
    }
  }

  // Year, architect and stories for a stop (from the volunteer tour guide's sheet).
  function resourcesHTML(stop, open) {
    const r = stop && stop.resources;
    if (!r) return '';
    const meta = [r.year && `Built ${r.year}`, r.architect && `Architect: ${r.architect}`].filter(Boolean).join(' · ');
    return `<details class="resources"${open ? ' open' : ''}><summary>📚 Resources${r.stories.length ? ` · ${r.stories.length} stor${r.stories.length === 1 ? 'y' : 'ies'}` : ''}</summary>
      ${meta ? `<div class="res-meta">${esc(meta)}</div>` : ''}
      ${r.stories.map((t) => `<p>${esc(t)}</p>`).join('')}
      <div class="res-src">Source: ${esc(r.source)}. Double-check facts before you use them.</div></details>`;
  }

  // Every building and story with photo, facts and resources; used by students and guides.
  function resourcesLibrary(el) {
    const branches = { main: 'Main Branch', north: 'North Branch', south: 'South Branch' };
    const paint = (q) => {
      const term = q.trim().toLowerCase();
      const list = state.catalog.stops.filter((st) => !term || JSON.stringify([st.name, st.facts, st.address, st.resources]).toLowerCase().includes(term));
      el.querySelector('.lib-list').innerHTML = Object.entries(branches).map(([k, label]) => {
        const items = list.filter((st) => (st.branch || 'main') === k);
        if (!items.length) return '';
        return `<h3 class="lib-branch">${label}</h3>` + items.map((st) => `<article class="lib-item">
          ${st.photo ? `<img src="/photos/${esc(st.photo)}" alt="" loading="lazy">` : `<div class="noimg small">${esc(st.short || st.name)}</div>`}
          <div><h4>${esc(st.name)}${st.map ? ` <span class="muted">· map ${esc(st.map)}</span>` : ''}</h4>
            <div class="muted" style="font-size:13px">${esc([st.side, st.address].filter(Boolean).join(' · '))}</div>
            <p style="margin:6px 0">${esc(st.facts || '')}</p>${resourcesHTML(st, !!term)}</div></article>`).join('');
      }).join('') || '<p class="muted">Nothing matches that search.</p>';
    };
    el.innerHTML = `<input type="text" class="lib-search" placeholder="Search buildings and stories (try: Ferris Bueller, roller skates, wolves)…"><div class="lib-list"></div>`;
    el.querySelector('.lib-search').addEventListener('input', (e) => paint(e.target.value));
    paint('');
  }

  function openLibrary() {
    const wrap = document.createElement('div');
    wrap.className = 'overlay';
    wrap.innerHTML = `<div class="drawer" role="dialog" aria-label="Resources"><header><h2>Resources: every building</h2><button class="btn small" data-x="close">Close</button></header><div class="body lib"></div></div>`;
    document.body.appendChild(wrap);
    resourcesLibrary(wrap.querySelector('.lib'));
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.dataset.x === 'close') close(); });
    wrap.querySelector('.lib-search').focus();
  }

  function segSide(seg, pos) {
    const stop = stopById(seg.stopId);
    return `<aside class="seg-side">
      ${stop?.photo ? `<img src="/photos/${esc(stop.photo)}" alt="${esc(stop.name)}" loading="lazy">` : `<div class="noimg">${esc(stop ? stop.name : 'Pick your stop')}</div>`}
      ${stop ? `<h3>${esc(stop.name)}</h3><div class="muted">${esc([stop.side, stop.address].filter(Boolean).join(' · '))}${stop.map ? ` · map ${esc(stop.map)}` : ''}</div><div>${esc(stop.facts || '')}</div>${resourcesHTML(stop)}` : '<div class="muted">Choose a building or story from the list to see its photo and facts.</div>'}
      ${pos ? `<div class="tourpos">You are stop <b>#${pos.position}</b> of ${pos.total} · ${esc(pos.leg)}<br>
        ${pos.before ? `Before you: ${esc(pos.before.name)} (${esc(pos.before.title)})<br>` : 'You go first!<br>'}
        ${pos.after ? `After you: ${esc(pos.after.name)} (${esc(pos.after.title)})` : 'You go last!'}</div>` : `<div class="tourpos muted">Your guide hasn't placed this stop on the tour yet.</div>`}
    </aside>`;
  }

  function segCard(seg, group, pos) {
    return `<section class="seg-card" data-seg="${esc(seg.id)}">
      <div class="seg-main">${segFields(seg, group)}</div>
      ${segSide(seg, pos)}
    </section>`;
  }

  // ---------- admin ----------
  // Swap in a clean <main> so listeners from the previous render don't pile up.
  function freshView(view) {
    const v = view.cloneNode(false);
    view.replaceWith(v);
    return v;
  }
  async function loadAdmin() {
    state.admin = await api('GET', '/api/admin/state');
    state.catalog.stops = state.admin.stops;
    state.catalog.groups = state.admin.groups;
    state.catalog.legs = state.admin.legs;
  }
  function index() {
    const segs = new Map();
    for (const st of state.admin.students) for (const seg of st.segments) segs.set(seg.id, { st, seg });
    const placed = new Set();
    let n = 0;
    const order = new Map();
    for (const leg of state.admin.legs) {
      state.admin.layout[leg.id] = (state.admin.layout[leg.id] || []).filter((id) => segs.has(id));
      for (const id of state.admin.layout[leg.id]) { placed.add(id); order.set(id, { n: ++n, leg }); }
    }
    const unscheduled = [...segs.keys()].filter((id) => !placed.has(id));
    return { segs, order, unscheduled, total: n };
  }

  function renderAdmin() {
    const tabs = [['tour', 'Tour & river'], ['groups', 'Groups'], ['students', 'Students'], ['resources', 'Resources'], ['print', 'Print']];
    $app.innerHTML = `${topbar(`<nav>${tabs.map(([k, l]) => `<button data-tab="${k}" class="${state.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>`, 'Guide')}<main id="view"></main>`;
    $app.querySelector('[data-act="logout"]').onclick = logout;
    $app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { location.hash = b.dataset.tab; }));
    const view = $app.querySelector('#view');
    if (state.tab === 'groups') return renderGroups(view);
    if (state.tab === 'students') return renderStudents(view);
    if (state.tab === 'print') return renderPrint(view);
    if (state.tab === 'resources') { view.innerHTML = '<div class="panel lib" style="padding:16px 20px;max-width:900px;margin:0 auto"></div>'; return resourcesLibrary(view.firstElementChild); }
    return renderTour(view);
  }

  function cardHTML(id, ix) {
    const { st, seg } = ix.segs.get(id);
    const g = groupById(st.group);
    const stop = stopById(seg.stopId);
    const o = ix.order.get(id);
    return `<div class="card${seg.text ? '' : ' empty'}" data-id="${esc(id)}">
      <span class="num">${o ? o.n : '–'}</span>
      <span class="bar" style="background:${esc(g.color)}"></span>
      <div><div class="t1">${esc(stop ? stop.short || stop.name : seg.title || 'No stop chosen')}</div>
        <div class="t2">${esc(st.name)} · ${esc(g.name)}</div></div>
      <div class="meta"><span>${state.admin.ratings?.[st.id]?.color ? `<span class="rdot ${esc(state.admin.ratings[st.id].color)}" title="Guide progress rating"></span> ` : ''}${fmt(secs(seg.text))}</span><span class="status ${esc(st.status)}">${esc(st.status.replace('-', ' '))}</span></div>
    </div>`;
  }

  function pinsFor(ix, colorBy = 'group') {
    const pins = [];
    for (const [id, { st, seg }] of ix.segs) {
      const stop = stopById(seg.stopId);
      if (!stop || stop.lat == null) continue;
      const g = groupById(st.group);
      const o = ix.order.get(id);
      const dim = state.hidden.has(g.id) || (state.focusGroup && state.focusGroup !== g.id);
      pins.push({
        id, lat: stop.lat, lon: stop.lon, label: o ? o.n : '?', color: o || colorBy === 'group' ? g.color : '#8a8f9c', dim,
        tip: `<b>${o ? `#${o.n} · ` : 'Not scheduled · '}${esc(stop.name)}</b><br>${esc(st.name)} (${esc(g.name)})${o ? `<br><span class="muted">${esc(o.leg.name)}</span>` : ''}`,
      });
    }
    return pins.sort((a, b) => (a.label === '?') - (b.label === '?') || b.label - a.label);
  }

  function renderTour(view) {
    view = freshView(view);
    const ix = index();
    const legSecs = (legId) => state.admin.layout[legId].reduce((a, id) => a + secs(ix.segs.get(id).seg.text), 0);
    const totalSecs = [...ix.order.keys()].reduce((a, id) => a + secs(ix.segs.get(id).seg.text), 0);
    const noStop = state.admin.students.filter((s) => !s.segments.length).length;
    const ready = state.admin.students.filter((s) => s.status === 'ready').length;
    view.innerHTML = `
      <div class="board">
        <div class="mapcol panel">
          <div class="panel-head"><h2>Chicago River</h2>
            <div class="legend">${state.admin.groups.map((g) => `<span data-g="${esc(g.id)}" class="${state.hidden.has(g.id) ? 'off' : ''}"><i class="dot" style="background:${esc(g.color)}"></i>${esc(g.name)}</span>`).join('')}</div>
            <span class="spacer" style="flex:1"></span>
            <button class="btn small" data-act="addstop">+ Stop on map</button>
          </div>
          <div id="map"></div>
          <div class="stats">
            <div><b>${ix.total}</b>stops on the tour</div>
            <div><b>${fmt(totalSecs)}</b>speaking time</div>
            <div><b>${ix.unscheduled.length}</b>not placed</div>
            <div><b>${ready}/${state.admin.students.length}</b>marked ready</div>
            <div><b>${noStop}</b>students with no stop</div>
          </div>
        </div>
        <div class="legs">
          <section class="leg unscheduled"><div class="leg-head"><h3>Not on the tour yet</h3><span class="hint">Drag into a leg</span>
              ${ix.unscheduled.length ? '<button class="btn small primary" data-act="autoplace" style="margin-left:auto" title="Put each stop in the leg where the boat passes it">Place new stops</button>' : ''}</div>
            <div class="slots" data-empty="Drag stops here" data-leg="__pool">${ix.unscheduled.map((id) => cardHTML(id, ix)).join('')}</div></section>
          ${state.admin.legs.map((leg) => {
            const t = legSecs(leg.id);
            return `<section class="leg"><div class="leg-head"><h3>${esc(leg.name)}</h3><span class="hint">${esc(leg.hint || '')}</span>
              <span class="time ${t > leg.budgetMin * 60 ? 'over' : ''}" title="Speaking time / leg budget">${fmt(t)} / ${leg.budgetMin}:00</span></div>
              <div class="slots" data-empty="Drag stops here" data-leg="${esc(leg.id)}">${state.admin.layout[leg.id].map((id) => cardHTML(id, ix)).join('')}</div></section>`;
          }).join('')}
        </div>
      </div>`;

    const map = RiverMap.create(view.querySelector('#map'), {
      onPinClick: (id) => openStudentDrawer(ix.segs.get(id).st.id, id),
      onHover: (id) => view.querySelectorAll('.card').forEach((c) => c.classList.toggle('hl', c.dataset.id === id)),
    });
    map.setStops(state.admin.stops);
    map.setPins(pinsFor(ix));

    view.querySelectorAll('.legend [data-g]').forEach((s) => (s.onclick = () => {
      const g = s.dataset.g;
      state.hidden.has(g) ? state.hidden.delete(g) : state.hidden.add(g);
      s.classList.toggle('off');
      map.setPins(pinsFor(ix));
    }));
    const autoBtn = view.querySelector('[data-act="autoplace"]');
    if (autoBtn) autoBtn.onclick = autoPlace;
    view.querySelector('[data-act="addstop"]').onclick = () => {
      map.pickMode(async ({ lat, lon }) => {
        const name = prompt('Name of the new stop (a building, bridge or story):');
        if (!name) return;
        const branch = lon < -87.6385 && lat > 41.8875 ? 'north' : lat < 41.8862 ? 'south' : 'main';
        try {
          await api('POST', '/api/admin/stops', { name, lat, lon, branch });
          toast('Stop added. Students can pick it now.');
          await loadAdmin();
          renderAdmin();
        } catch (e) { toast(e.message); }
      });
    };

    view.querySelectorAll('.card').forEach((c) => {
      c.addEventListener('mouseenter', () => map.highlight(c.dataset.id));
      c.addEventListener('mouseleave', () => map.highlight(null));
      c.addEventListener('click', () => openStudentDrawer(ix.segs.get(c.dataset.id).st.id, c.dataset.id));
    });

    view.querySelectorAll('.slots').forEach((el) => {
      Sortable.create(el, {
        group: 'tour', animation: 150, ghostClass: 'sortable-ghost', forceFallback: true, fallbackTolerance: 4,
        onEnd: async () => {
          const layout = {};
          view.querySelectorAll('.slots[data-leg]').forEach((s) => {
            if (s.dataset.leg !== '__pool') layout[s.dataset.leg] = [...s.querySelectorAll('.card')].map((c) => c.dataset.id);
          });
          state.admin.layout = layout;
          renderTour(view); // renumber cards + pins
          try { await api('PUT', '/api/admin/layout', { layout }); } catch (e) { toast(`Not saved: ${e.message}`); }
        },
      });
    });
  }

  // Which leg the boat passes a stop on (follows the workshop run of show), and a
  // sort key for where it falls inside that leg.
  const LEG1 = new Set(['wrigley', 'tribune', 'trump', 'ama', 'marina', 'reid-murdoch', 'themart']);
  const LEG4 = new Set(['300-lasalle', 'riverwalk', 'nbc', 'aqua', 'st-regis', 'london-house', 'carbide', 'lake-point']);
  function legForStop(stop) {
    if (!stop) return null;
    if (stop.id === 'welcome') return 'intro';
    if (LEG1.has(stop.id)) return 'leg1';
    if (LEG4.has(stop.id)) return 'leg4';
    if (stop.id === '333-wacker' || stop.branch === 'north') return 'leg2';
    if (stop.branch === 'south') return 'leg3';
    return stop.lon > -87.6235 ? 'leg4' : 'leg1';
  }
  function routeKey(leg, stop) {
    if (!stop) return 0;
    if (leg === 'leg1') return -stop.lon; // heading west
    if (leg === 'leg4') return stop.lon; // heading east to the lake
    if (leg === 'leg2') return stop.id === '333-wacker' ? 99 : stop.lat; // north, 333 W Wacker on the way back
    if (leg === 'leg3') return -stop.lat; // heading south
    return 0;
  }

  // Put every unplaced stop that has a building into its leg, in river order.
  async function autoPlace() {
    await loadAdmin();
    const ix = index();
    const layout = JSON.parse(JSON.stringify(state.admin.layout));
    const plan = [];
    const skipped = [];
    for (const id of ix.unscheduled) {
      const { st, seg } = ix.segs.get(id);
      const stop = stopById(seg.stopId);
      const leg = legForStop(stop);
      if (!leg || !layout[leg]) { skipped.push(`${st.name} (${seg.title || 'no stop chosen'})`); continue; }
      const key = routeKey(leg, stop);
      const list = layout[leg];
      let at = list.findIndex((other) => routeKey(leg, stopById(ix.segs.get(other)?.seg.stopId)) > key);
      if (at < 0) at = list.length;
      list.splice(at, 0, id);
      plan.push(`• ${st.name}: ${stop.short || stop.name} → ${state.admin.legs.find((l) => l.id === leg).name}`);
    }
    if (!plan.length) return toast(skipped.length ? 'Those stops need a building chosen before they can be placed.' : 'Nothing to place.');
    const msg = `Place these ${plan.length} stop(s)?\n\n${plan.join('\n')}${skipped.length ? `\n\nLeft for you to place (no building chosen yet):\n${skipped.join('\n')}` : ''}\n\nYou can still drag them afterwards.`;
    if (!confirm(msg)) return;
    try {
      await api('PUT', '/api/admin/layout', { layout });
      await loadAdmin();
      renderAdmin();
      toast(`Placed ${plan.length} stop(s)`);
    } catch (e) { toast(`Not saved: ${e.message}`); }
  }

  // Drawer: every stop of one student, editable by the admin.
  function openStudentDrawer(studentId, focusSegId) {
    const st = state.admin.students.find((s) => s.id === studentId);
    if (!st) return;
    const g = groupById(st.group);
    const wrap = document.createElement('div');
    wrap.className = 'overlay';
    const paint = () => {
      wrap.innerHTML = `<div class="drawer" role="dialog" aria-label="${esc(st.name)}">
        <header><h2>${esc(st.name)}</h2>
          <select data-x="group" style="width:auto">${state.admin.groups.map((x) => `<option value="${esc(x.id)}"${x.id === st.group ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          <button class="btn small" data-x="close">Close</button></header>
        <div class="body">
          <label class="field">Note shown to the student<textarea data-x="note" rows="2" style="margin-top:4px">${esc(st.note || '')}</textarea></label>
          <div class="muted" style="font-size:13px">${esc(st.email || '')} · status <span class="status ${esc(st.status)}">${esc(st.status.replace('-', ' '))}</span> · last edit ${esc(ago(st.updatedAt))} · goal ≈ ${fmt(g.targetSeconds)}</div>
          ${st.segments.map((seg) => `<section class="panel" style="padding:14px" data-seg="${esc(seg.id)}">${segFields(seg, g, true)}</section>`).join('') || '<div class="muted">No stops yet.</div>'}
          <div><button class="btn" data-x="add">+ Add a stop for ${esc(firstName(st.name))}</button></div>
          ${(st.earlierDrafts || []).map((d) => `<details class="drafts"><summary>Earlier draft: ${esc(d.label)}</summary><pre>${esc(d.text)}</pre></details>`).join('')}
        </div></div>`;
      const focus = focusSegId && wrap.querySelector(`[data-seg="${CSS.escape(focusSegId)}"]`);
      if (focus) setTimeout(() => focus.scrollIntoView({ block: 'start' }), 30);
    };
    paint();
    document.body.appendChild(wrap);
    let dirty = false;
    const close = async () => {
      wrap.remove();
      if (dirty) { await loadAdmin(); renderAdmin(); }
    };
    const saveNote = debounce(async (note) => { await api('PUT', `/api/admin/students/${st.id}`, { note }); }, 600);
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap || e.target.dataset.x === 'close') close();
      if (e.target.dataset.x === 'add') {
        Object.assign(st, await api('POST', `/api/admin/students/${st.id}/segments`, {}));
        dirty = true;
        focusSegId = st.segments[st.segments.length - 1].id;
        paint();
      }
    });
    wrap.addEventListener('input', (e) => { if (e.target.dataset.x === 'note') { st.note = e.target.value; saveNote(st.note); } });
    wrap.addEventListener('change', async (e) => {
      if (e.target.dataset.x === 'group') {
        st.group = e.target.value;
        await api('PUT', `/api/admin/students/${st.id}`, { group: st.group });
        dirty = true;
        toast(`${firstName(st.name)} moved to ${groupById(st.group).name}`);
      }
    });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(); } });
    bindSegEditors(wrap, {
      getSeg: (id) => st.segments.find((s) => s.id === id),
      save: async (id, patch) => { dirty = true; return api('PUT', `/api/admin/students/${st.id}/segments/${encodeURIComponent(id)}`, patch); },
      remove: async (id) => { Object.assign(st, await api('DELETE', `/api/admin/students/${st.id}/segments/${encodeURIComponent(id)}`)); dirty = true; paint(); },
    });
  }

  // ---------- groups ----------
  function renderGroups(view) {
    view = freshView(view);
    const ix = index();
    const kids = (gid) => state.admin.students.filter((s) => s.group === gid).sort((a, b) => a.name.localeCompare(b.name));
    view.innerHTML = `
      <div class="groups-layout">
        <div class="mapcol panel">
          <div class="panel-head"><h2>Where each group speaks</h2><span class="muted" style="font-size:13px">Click a group's dot to spotlight it</span></div>
          <div id="map"></div>
        </div>
        <div>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
            <h2 style="font-size:18px">Student groups</h2><span class="muted">Drag students between groups. Changes save right away.</span>
            <span style="flex:1"></span><button class="btn" data-act="addgroup">+ New group</button>
          </div>
          <div class="group-cols">
            ${state.admin.groups.map((g) => `
              <section class="gcol${state.focusGroup === g.id ? ' focus' : ''}" style="--gc:${esc(g.color)}" data-gid="${esc(g.id)}">
                <div class="gcol-head">
                  <div class="row"><button class="btn small ghost" data-act="focus" title="Spotlight on map"><span class="dot" style="background:${esc(g.color)}"></span></button>
                    <input type="text" value="${esc(g.name)}" data-gf="name" ${g.id === 'none' ? 'readonly' : ''}>
                    <input type="color" value="${esc(g.color)}" data-gf="color" aria-label="Group color"></div>
                  <div class="target">Goal <input type="number" min="0.25" max="15" step="0.25" value="${g.targetSeconds / 60}" data-gf="targetMin"> min
                    <span style="flex:1"></span><b>${kids(g.id).length}</b>
                    ${g.id !== 'none' ? '<button class="btn small ghost danger" data-act="delgroup" title="Delete group">✕</button>' : ''}</div>
                </div>
                <div class="slots" data-empty="Drag students here" data-gid="${esc(g.id)}">${kids(g.id).map((s) => `<div class="kid" data-sid="${esc(s.id)}">${esc(s.name)}<small>${s.segments.length} stop${s.segments.length === 1 ? '' : 's'}</small></div>`).join('')}</div>
              </section>`).join('')}
          </div>
        </div>
      </div>`;
    const map = RiverMap.create(view.querySelector('#map'), { onPinClick: (id) => openStudentDrawer(ix.segs.get(id).st.id, id) });
    map.setStops(state.admin.stops);
    map.setPins(pinsFor(ix));

    const saveGroups = debounce(async () => {
      try {
        const r = await api('PUT', '/api/admin/groups', { groups: state.admin.groups });
        state.admin.groups = state.catalog.groups = r.groups;
      } catch (e) { toast(e.message); }
    }, 500);
    view.addEventListener('input', (e) => {
      const col = e.target.closest('[data-gid]');
      const f = e.target.dataset.gf;
      if (!col || !f) return;
      const g = state.admin.groups.find((x) => x.id === col.dataset.gid);
      if (f === 'name') g.name = e.target.value;
      if (f === 'color') { g.color = e.target.value; col.style.setProperty('--gc', g.color); col.querySelector('.dot').style.background = g.color; map.setPins(pinsFor(ix)); }
      if (f === 'targetMin') g.targetSeconds = Math.round(Number(e.target.value) * 60) || 60;
      saveGroups();
    });
    view.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const col = btn.closest('[data-gid]');
      if (btn.dataset.act === 'focus') {
        state.focusGroup = state.focusGroup === col.dataset.gid ? null : col.dataset.gid;
        view.querySelectorAll('.gcol').forEach((c) => c.classList.toggle('focus', c.dataset.gid === state.focusGroup));
        map.setPins(pinsFor(ix));
      }
      if (btn.dataset.act === 'addgroup') {
        const name = prompt('Group name (for example: Red Team, L2 North Branch):');
        if (!name) return;
        const palette = ['#9b51e0', '#00a3a3', '#e06c2f', '#5b8c00', '#c2185b', '#4a6fa5'];
        state.admin.groups.splice(state.admin.groups.length - 1, 0, { id: '', name, color: palette[state.admin.groups.length % palette.length], targetSeconds: 120 });
        try { await api('PUT', '/api/admin/groups', { groups: state.admin.groups }); } catch (ex) { toast(ex.message); }
        await loadAdmin();
        renderAdmin();
      }
      if (btn.dataset.act === 'delgroup') {
        const g = state.admin.groups.find((x) => x.id === col.dataset.gid);
        if (!confirm(`Delete the group "${g.name}"? Its students move to Unassigned.`)) return;
        state.admin.groups = state.admin.groups.filter((x) => x !== g);
        await api('PUT', '/api/admin/groups', { groups: state.admin.groups });
        await loadAdmin();
        renderAdmin();
      }
    });
    view.querySelectorAll('.gcol .slots').forEach((el) => Sortable.create(el, {
      group: 'groups', animation: 150, forceFallback: true, fallbackTolerance: 4,
      onAdd: async (evt) => {
        const sid = evt.item.dataset.sid;
        const gid = evt.to.dataset.gid;
        const st = state.admin.students.find((s) => s.id === sid);
        st.group = gid;
        try {
          await api('PUT', `/api/admin/students/${sid}`, { group: gid });
          toast(`${firstName(st.name)} → ${groupById(gid).name}`);
        } catch (e) { toast(e.message); }
        renderGroups(view);
      },
    }));
  }

  // ---------- students ----------
  function renderStudents(view) {
    view = freshView(view);
    const ratings = state.admin.ratings || {};
    const colorOf = (id) => ratings[id]?.color || 'none';
    const all = [...state.admin.students].sort((a, b) => a.name.localeCompare(b.name));
    const filter = state.rateFilter || 'all';
    const list = filter === 'all' ? all : all.filter((s) => colorOf(s.id) === filter);
    const count = (c) => all.filter((s) => colorOf(s.id) === c).length;
    const RATE_LABEL = { red: 'Needs help', yellow: 'In progress', green: 'On track', none: 'Not rated' };
    view.innerHTML = `
      <div class="panel">
        <div class="panel-head"><h2>Students (${list.length})</h2><span class="muted" style="font-size:13px">Students pick their name and type their password (last name + 2026). Click a password to change it.</span>
          <span style="flex:1"></span>
          <button class="btn small" data-act="resetall" title="Set every password to last name + 2026">Reset all passwords</button>
          <button class="btn small" data-act="cards">Print login cards</button>
          <a class="btn small" href="/api/admin/export" download>Download backup</a>
          <label class="btn small" title="Load a backup or roster file">Import…<input type="file" accept=".json,application/json" data-act="import" hidden></label></div>
        <div class="rate-bar">
          <span class="muted" style="font-size:13px;font-weight:600">Script progress (only guides see this):</span>
          ${['all', 'red', 'yellow', 'green', 'none'].map((c) => `<button type="button" class="rate-filter${filter === c ? ' on' : ''}" data-rf="${c}">${c === 'all' ? `All ${all.length}` : `<span class="rdot ${c}"></span>${RATE_LABEL[c]} ${count(c)}`}</button>`).join('')}
        </div>
        <div class="table-wrap"><table class="students">
          <thead><tr><th>Name</th><th>Progress</th><th>Group</th><th>Password</th><th>Stops</th><th>Time</th><th>Status</th><th>Last edit</th><th></th></tr></thead>
          <tbody>${list.map((s) => {
            const t = s.segments.reduce((a, x) => a + secs(x.text), 0);
            const g = groupById(s.group);
            return `<tr data-sid="${esc(s.id)}">
              <td><b>${esc(s.name)}</b><div class="muted" style="font-size:12.5px">${esc(s.email || '')}</div></td>
              <td class="rate-cell"><div class="rate-btns" role="radiogroup" aria-label="Progress for ${esc(s.name)}">${['red', 'yellow', 'green'].map((c) => `<button type="button" class="rate ${c}${colorOf(s.id) === c ? ' on' : ''}" data-act="rate" data-c="${c}" role="radio" aria-checked="${colorOf(s.id) === c}" title="${RATE_LABEL[c]}"></button>`).join('')}</div>
                <input type="text" class="rate-note" data-rnote maxlength="300" placeholder="Note…" value="${esc(ratings[s.id]?.note || '')}"></td>
              <td style="white-space:nowrap"><span class="dot" style="background:${esc(g.color)}"></span> <select data-sf="group">${state.admin.groups.map((x) => `<option value="${esc(x.id)}"${x.id === s.group ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></td>
              <td style="white-space:nowrap"><button type="button" class="pin pin-edit" data-act="setpw" title="Change password">${esc(s.pin)}</button> <button class="btn small ghost" data-act="reset" title="Reset to last name + 2026">↻</button></td>
              <td class="stops-cell">${stopPickButton(s)}</td>
              <td style="font-variant-numeric:tabular-nums;white-space:nowrap">${fmt(t)} <span class="muted">/ ${fmt(g.targetSeconds)}</span></td>
              <td><select data-sf="status">${['not-started', 'draft', 'ready'].map((x) => `<option${x === s.status ? ' selected' : ''} value="${x}">${x.replace('-', ' ')}</option>`).join('')}</select></td>
              <td class="muted">${esc(ago(s.updatedAt))}</td>
              <td style="white-space:nowrap"><button class="btn small" data-act="open">Scripts</button> <button class="btn small ghost danger" data-act="del" title="Remove student">✕</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <form class="addrow">
          <label class="field">Name<input type="text" name="name" required></label>
          <label class="field">School email<input type="email" name="email"></label>
          <label class="field" style="flex:0 0 160px">Group<select name="group">${state.admin.groups.map((x) => `<option value="${esc(x.id)}"${x.id === 'none' ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <button class="btn primary" type="submit">+ Add student</button>
        </form>
      </div>
      <p class="muted" style="font-size:13px">Data is stored in ${state.admin.storage === 'redis' ? 'the hosted key-value database' : 'a file on this server (data/db.json)'}.</p>`;
    view.querySelectorAll('[data-rf]').forEach((b) => (b.onclick = () => { state.rateFilter = b.dataset.rf; renderStudents(view); }));
    const saveRating = async (id, patch) => {
      try {
        const r = await api('PUT', `/api/admin/ratings/${encodeURIComponent(id)}`, patch);
        state.admin.ratings = state.admin.ratings || {};
        if (r) state.admin.ratings[id] = r; else delete state.admin.ratings[id];
        return true;
      } catch (ex) { toast(`Not saved: ${ex.message}`); return false; }
    };
    const noteSavers = {};
    view.addEventListener('input', (e) => {
      if (!e.target.matches('[data-rnote]')) return;
      const id = e.target.closest('[data-sid]').dataset.sid;
      (noteSavers[id] ||= debounce((v) => saveRating(id, { note: v }), 600))(e.target.value);
    });
    view.querySelector('[data-act="resetall"]').onclick = async () => {
      if (!confirm('Set EVERY student\'s password to their last name + 2026 (for example smith2026)?')) return;
      try {
        const r = await api('POST', '/api/admin/reset-passwords');
        await loadAdmin();
        renderStudents(view);
        toast(`Reset ${r.count} passwords`);
      } catch (ex) { toast(ex.message); }
    };
    view.querySelector('[data-act="cards"]').onclick = () => { state.printMode = 'cards'; location.hash = 'print'; };
    view.querySelector('[data-act="import"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const n = (data.students || []).length;
        if (!confirm(`Replace all current students, scripts, groups and tour order with the ${n} students in "${file.name}"?`)) return;
        const r = await api('POST', '/api/admin/import', data);
        await loadAdmin();
        renderAdmin();
        toast(`Imported ${r.students} students`);
      } catch (ex) { toast(`Import failed: ${ex.message}`); }
    });
    view.addEventListener('change', async (e) => {
      const row = e.target.closest('[data-sid]');
      const f = e.target.dataset.sf;
      if (!row || !f) return;
      const st = state.admin.students.find((s) => s.id === row.dataset.sid);
      st[f] = e.target.value;
      try { await api('PUT', `/api/admin/students/${st.id}`, { [f]: st[f] }); toast('Saved'); } catch (ex) { toast(ex.message); }
      if (f === 'group') renderStudents(view);
    });
    view.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      const row = e.target.closest('[data-sid]');
      if (!btn || !row) return;
      const st = state.admin.students.find((s) => s.id === row.dataset.sid);
      if (btn.dataset.act === 'open') openStudentDrawer(st.id);
      if (btn.dataset.act === 'rate') {
        const cur = state.admin.ratings?.[st.id]?.color || null;
        const next = cur === btn.dataset.c ? null : btn.dataset.c;
        if (await saveRating(st.id, { color: next })) renderStudents(view);
      }
      if (btn.dataset.act === 'stops') openStopPicker(btn, st, () => { row.querySelector('.stops-cell').innerHTML = stopPickButton(st); });
      if (btn.dataset.act === 'reset') {
        Object.assign(st, await api('PUT', `/api/admin/students/${st.id}`, { resetPin: true }));
        renderStudents(view);
        toast(`${firstName(st.name)}'s password: ${st.pin}`);
      }
      if (btn.dataset.act === 'setpw') {
        const pw = prompt(`New password for ${st.name} (at least 3 characters):`, st.pin);
        if (pw == null || pw.trim() === st.pin) return;
        if (pw.trim().length < 3) return toast('Passwords need at least 3 characters.');
        try {
          Object.assign(st, await api('PUT', `/api/admin/students/${st.id}`, { pin: pw.trim() }));
          renderStudents(view);
          toast(`${firstName(st.name)}'s password: ${st.pin}`);
        } catch (ex) { toast(ex.message); }
      }
      if (btn.dataset.act === 'del') {
        if (!confirm(`Remove ${st.name} and all of their scripts? This cannot be undone.`)) return;
        await api('DELETE', `/api/admin/students/${st.id}`);
        await loadAdmin();
        renderStudents(view);
      }
    });
    view.querySelector('form.addrow').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      try {
        const st = await api('POST', '/api/admin/students', fd);
        await loadAdmin();
        renderStudents(view);
        toast(`Added ${st.name}. Password: ${st.pin}`);
      } catch (ex) { toast(ex.message); }
    });
  }

  // ---------- stop assignment (multi-select) ----------
  function stopPickButton(st) {
    const chips = st.segments.map((x) => `<span class="sp-chip${x.text ? ' has-text' : ''}" title="${x.text ? 'Has a script' : 'No script yet'}">${esc(stopById(x.stopId)?.short || x.title || 'Untitled stop')}</span>`).join('');
    return `<button type="button" class="stoppick-btn" data-act="stops" aria-haspopup="listbox">${chips || '<span class="muted">Assign stops</span>'}<span class="sp-caret">▾</span></button>`;
  }

  // Checklist of every stop; ticking assigns it to the student, unticking removes it.
  function openStopPicker(anchor, st, onChange) {
    document.querySelector('.stoppick-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'stoppick-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', `Stops for ${st.name}`);
    const takenBy = () => {
      const m = new Map();
      for (const o of state.admin.students) {
        if (o.id === st.id) continue;
        for (const x of o.segments) if (x.stopId) m.set(x.stopId, [...(m.get(x.stopId) || []), firstName(o.name)]);
      }
      return m;
    };
    const branches = { main: 'Main Branch', north: 'North Branch', south: 'South Branch' };
    let term = '';
    const paint = () => {
      const taken = takenBy();
      const mine = new Set(st.segments.map((x) => x.stopId).filter(Boolean));
      const loose = st.segments.filter((x) => !x.stopId);
      const match = (x) => !term || x.name.toLowerCase().includes(term);
      pop.querySelector('.sp-list').innerHTML =
        (loose.length && !term ? `<div class="sp-group">Stops with no building yet</div>` + loose.map((x) => `
          <label class="sp-opt"><input type="checkbox" checked data-seg="${esc(x.id)}"><span>${esc(x.title || 'Untitled stop')}${x.text ? ' <em>· has script</em>' : ''}</span></label>`).join('') : '') +
        Object.entries(branches).map(([k, label]) => {
          const items = state.admin.stops.filter((x) => (x.branch || 'main') === k && match(x));
          if (!items.length) return '';
          return `<div class="sp-group">${label}</div>` + items.map((x) => {
            const who = taken.get(x.id);
            return `<label class="sp-opt${mine.has(x.id) ? ' on' : ''}"><input type="checkbox" data-stop="${esc(x.id)}"${mine.has(x.id) ? ' checked' : ''}>
              <span>${esc(x.name)}${x.map ? ` <small class="muted">(${esc(x.map)})</small>` : ''}${who ? ` <small class="sp-taken">· ${esc(who.join(', '))}</small>` : ''}</span></label>`;
          }).join('');
        }).join('') || '<div class="muted" style="padding:10px">No stops match.</div>';
    };
    pop.innerHTML = `<div class="sp-head"><b>${esc(firstName(st.name))}'s stops</b><button type="button" class="btn small" data-x="done">Done</button></div>
      <input type="text" class="sp-search" placeholder="Search stops…" aria-label="Search stops">
      <div class="sp-list" role="listbox" aria-multiselectable="true"></div>
      <div class="sp-foot muted">New stops land in "Not on the tour yet" on the Tour tab. Names after a stop show who else has it.</div>`;
    document.body.appendChild(pop);
    paint();
    const r = anchor.getBoundingClientRect();
    const w = Math.min(380, window.innerWidth - 32);
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(16, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 16))}px`;
    pop.style.top = `${r.bottom + window.scrollY + 6}px`;
    pop.querySelector('.sp-search').focus();

    const close = () => {
      pop.remove();
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', onKey);
    };
    const outside = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', onKey);
    pop.querySelector('[data-x="done"]').onclick = close;
    pop.querySelector('.sp-search').addEventListener('input', (e) => { term = e.target.value.trim().toLowerCase(); paint(); });

    pop.addEventListener('change', async (e) => {
      const box = e.target;
      if (box.type !== 'checkbox') return;
      box.disabled = true;
      try {
        if (box.checked && box.dataset.stop) {
          const stop = stopById(box.dataset.stop);
          Object.assign(st, await api('POST', `/api/admin/students/${st.id}/segments`, { stopId: stop.id, title: stop.name }));
          toast(`${stop.short || stop.name} → ${firstName(st.name)}`);
        } else {
          const seg = box.dataset.seg ? st.segments.find((x) => x.id === box.dataset.seg) : st.segments.find((x) => x.stopId === box.dataset.stop);
          if (seg) {
            if (seg.text && !confirm(`${st.name} already wrote a script for "${seg.title}". Remove the stop and delete that script?`)) { box.checked = true; return; }
            Object.assign(st, await api('DELETE', `/api/admin/students/${st.id}/segments/${encodeURIComponent(seg.id)}`));
            for (const k of Object.keys(state.admin.layout)) state.admin.layout[k] = state.admin.layout[k].filter((id) => id !== seg.id);
          }
        }
        onChange();
      } catch (ex) {
        box.checked = !box.checked;
        toast(ex.message);
      } finally {
        box.disabled = false;
        paint();
      }
    });
  }

  // ---------- print ----------
  function renderPrint(view) {
    view = freshView(view);
    const ix = index();
    const mode = state.printMode || 'script';
    const date = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    let body = '';
    if (mode === 'cards') {
      const list = [...state.admin.students].sort((a, b) => a.name.localeCompare(b.name));
      body = `<h1>Skyline Speakers · login cards</h1><p class="muted">Go to ${esc(location.origin)} · pick your name · type your password</p>
        <div class="logincards">${list.map((s) => `<div class="logincard"><b>${esc(s.name)}</b><span class="muted" style="font-size:12px">${esc(location.host)}</span><div class="p">${esc(s.pin)}</div></div>`).join('')}</div>`;
    } else {
      const rows = [];
      for (const leg of state.admin.legs) for (const id of state.admin.layout[leg.id]) rows.push({ leg, id, ...ix.segs.get(id) });
      const total = rows.reduce((a, r) => a + secs(r.seg.text), 0);
      body = `<h1>Skyline Speakers · Run of show</h1><p class="muted">${esc(date)} · ${rows.length} stops · about ${fmt(total)} of speaking</p>
        <table><thead><tr><th>#</th><th>Stop</th><th>Speaker</th><th>Group</th><th>Time</th></tr></thead><tbody>
        ${state.admin.legs.map((leg) => {
          const r = rows.filter((x) => x.leg === leg);
          if (!r.length) return '';
          return `<tr><td colspan="5" style="background:var(--panel-2);font-weight:800">${esc(leg.name)}</td></tr>` + r.map((x) => `<tr><td>${ix.order.get(x.id).n}</td><td>${esc(stopById(x.seg.stopId)?.name || x.seg.title)}</td><td>${esc(x.st.name)}</td><td>${esc(groupById(x.st.group).name)}</td><td>${fmt(secs(x.seg.text))}</td></tr>`).join('');
        }).join('')}</tbody></table>
        ${state.admin.legs.map((leg) => {
          const r = rows.filter((x) => x.leg === leg);
          if (!r.length) return '';
          return `<h2>${esc(leg.name)}</h2>` + r.map((x) => `<div class="stop"><h3><span>#${ix.order.get(x.id).n}</span>${esc(stopById(x.seg.stopId)?.name || x.seg.title)}<span class="muted" style="font-weight:500;font-size:14px">· ${esc(x.st.name)} · ${fmt(secs(x.seg.text))}</span></h3>
            <div class="script">${esc(x.seg.text) || '<i class="muted">No script yet.</i>'}</div></div>`).join('');
        }).join('')}
        ${ix.unscheduled.length ? `<h2>Not on the tour yet</h2><p>${ix.unscheduled.map((id) => { const { st, seg } = ix.segs.get(id); return `${esc(st.name)}: ${esc(stopById(seg.stopId)?.name || seg.title)}`; }).join(' · ')}</p>` : ''}`;
    }
    view.innerHTML = `<div class="print-controls">
        <button class="btn ${mode === 'script' ? 'primary' : ''}" data-m="script">Full tour script</button>
        <button class="btn ${mode === 'cards' ? 'primary' : ''}" data-m="cards">Login cards</button>
        <button class="btn" data-act="print">🖨 Print</button></div>
      <article class="print-doc">${body}</article>`;
    view.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { state.printMode = b.dataset.m; renderPrint(view); }));
    view.querySelector('[data-act="print"]').onclick = () => window.print();
  }

  boot();
})();
