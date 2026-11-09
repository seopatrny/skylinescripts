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

  const state = { me: undefined, catalog: null, my: null, admin: null, tab: 'tour', hidden: new Set(), focusGroup: null, showPins: false };
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
    try { roster = await api('GET', '/api/roster'); } catch {}
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
              <label class="field">Your PIN
                <input class="pin-input" name="pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••" required>
              </label>` : `
              <label class="field">Guide password
                <input name="password" type="password" required autocomplete="current-password">
              </label>`}
            <div class="err"></div>
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

  function segSide(seg, pos) {
    const stop = stopById(seg.stopId);
    return `<aside class="seg-side">
      ${stop?.photo ? `<img src="/photos/${esc(stop.photo)}" alt="${esc(stop.name)}" loading="lazy">` : `<div class="noimg">${esc(stop ? stop.name : 'Pick your stop')}</div>`}
      ${stop ? `<h3>${esc(stop.name)}</h3><div class="muted">${esc([stop.side, stop.address].filter(Boolean).join(' · '))}${stop.map ? ` · map ${esc(stop.map)}` : ''}</div><div>${esc(stop.facts || '')}</div>` : '<div class="muted">Choose a building or story from the list to see its photo and facts.</div>'}
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
    const tabs = [['tour', 'Tour & river'], ['groups', 'Groups'], ['students', 'Students'], ['print', 'Print']];
    $app.innerHTML = `${topbar(`<nav>${tabs.map(([k, l]) => `<button data-tab="${k}" class="${state.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>`, 'Guide')}<main id="view"></main>`;
    $app.querySelector('[data-act="logout"]').onclick = logout;
    $app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { location.hash = b.dataset.tab; }));
    const view = $app.querySelector('#view');
    if (state.tab === 'groups') return renderGroups(view);
    if (state.tab === 'students') return renderStudents(view);
    if (state.tab === 'print') return renderPrint(view);
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
      <div class="meta"><span>${fmt(secs(seg.text))}</span><span class="status ${esc(st.status)}">${esc(st.status.replace('-', ' '))}</span></div>
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
          <section class="leg unscheduled"><div class="leg-head"><h3>Not on the tour yet</h3><span class="hint">Drag into a leg</span></div>
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
    const list = [...state.admin.students].sort((a, b) => a.name.localeCompare(b.name));
    view.innerHTML = `
      <div class="panel">
        <div class="panel-head"><h2>Students (${list.length})</h2><span class="muted" style="font-size:13px">Students log in by picking their name and typing their PIN.</span>
          <span style="flex:1"></span>
          <button class="btn small" data-act="pins">${state.showPins ? 'Hide PINs' : 'Show PINs'}</button>
          <button class="btn small" data-act="cards">Print login cards</button>
          <a class="btn small" href="/api/admin/export" download>Download backup</a>
          <label class="btn small" title="Load a backup or roster file">Import…<input type="file" accept=".json,application/json" data-act="import" hidden></label></div>
        <div class="table-wrap"><table class="students">
          <thead><tr><th>Name</th><th>Group</th><th>PIN</th><th>Stops</th><th>Time</th><th>Status</th><th>Last edit</th><th></th></tr></thead>
          <tbody>${list.map((s) => {
            const t = s.segments.reduce((a, x) => a + secs(x.text), 0);
            const g = groupById(s.group);
            return `<tr data-sid="${esc(s.id)}">
              <td><b>${esc(s.name)}</b><div class="muted" style="font-size:12.5px">${esc(s.email || '')}</div></td>
              <td><span class="dot" style="background:${esc(g.color)}"></span> <select data-sf="group">${state.admin.groups.map((x) => `<option value="${esc(x.id)}"${x.id === s.group ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></td>
              <td><span class="pin">${state.showPins ? esc(s.pin) : '••••'}</span> <button class="btn small ghost" data-act="reset" title="Make a new PIN">↻</button></td>
              <td>${s.segments.map((x) => esc(stopById(x.stopId)?.short || x.title)).join(', ') || '<span class="muted">none</span>'}</td>
              <td style="font-variant-numeric:tabular-nums">${fmt(t)} <span class="muted">/ ${fmt(g.targetSeconds)}</span></td>
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
    view.querySelector('[data-act="pins"]').onclick = () => { state.showPins = !state.showPins; renderStudents(view); };
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
      if (btn.dataset.act === 'reset') {
        if (!confirm(`Give ${st.name} a new PIN? The old one will stop working.`)) return;
        Object.assign(st, await api('PUT', `/api/admin/students/${st.id}`, { resetPin: true }));
        state.showPins = true;
        renderStudents(view);
        toast(`New PIN for ${firstName(st.name)}: ${st.pin}`);
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
        state.showPins = true;
        renderStudents(view);
        toast(`Added ${st.name}. PIN ${st.pin}`);
      } catch (ex) { toast(ex.message); }
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
      body = `<h1>Skyline Speakers · login cards</h1><p class="muted">Go to ${esc(location.origin)} · pick your name · type your PIN</p>
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
