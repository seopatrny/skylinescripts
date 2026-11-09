// Chicago River map drawn as SVG from approximate real coordinates.
// RiverMap.create(el, { onPinClick, onPick }) → { setStops, setPins, highlight, pickMode }
(function () {
  const B = { north: 41.9125, south: 41.853, west: -87.6625, east: -87.604 };
  const K = 16800; // px per degree latitude
  const COS = Math.cos((41.885 * Math.PI) / 180);
  const W = Math.round((B.east - B.west) * COS * K);
  const H = Math.round((B.north - B.south) * K);
  const xy = (lat, lon) => [(lon - B.west) * COS * K, (B.north - lat) * K];
  const ll = (x, y) => [B.north - y / K, B.west + x / (COS * K)];
  const pts = (arr) => arr.map(([a, b]) => xy(a, b).map((v) => v.toFixed(1)).join(',')).join(' ');

  const MAIN = [[41.8886, -87.6085], [41.8886, -87.6140], [41.8884, -87.6200], [41.8883, -87.6245], [41.8880, -87.6280], [41.8877, -87.6310], [41.8874, -87.6330], [41.8871, -87.6346], [41.8869, -87.6365], [41.8868, -87.6380]];
  const NORTH = [[41.8868, -87.6380], [41.8884, -87.6383], [41.8893, -87.6388], [41.8913, -87.6403], [41.8925, -87.6414], [41.8945, -87.6425], [41.8966, -87.6441], [41.8975, -87.6452], [41.8995, -87.6490], [41.9012, -87.6532], [41.9035, -87.6574], [41.9070, -87.6598], [41.9112, -87.6597], [41.9130, -87.6600]];
  const CANAL = [[41.8975, -87.6452], [41.9000, -87.6468], [41.9035, -87.6490], [41.9080, -87.6515], [41.9105, -87.6545], [41.9112, -87.6597]];
  const SOUTH = [[41.8868, -87.6380], [41.8857, -87.6381], [41.8843, -87.6382], [41.8818, -87.6381], [41.8793, -87.6379], [41.8765, -87.6380], [41.8750, -87.6378], [41.8725, -87.6372], [41.8690, -87.6368], [41.8670, -87.6362], [41.8640, -87.6355], [41.8605, -87.6350], [41.8585, -87.6355], [41.8570, -87.6368], [41.8556, -87.6392], [41.8545, -87.6430], [41.8538, -87.6480], [41.8530, -87.6520]];
  const LAKE = [[41.9140, -87.6262], [41.9100, -87.6255], [41.9025, -87.6232], [41.8990, -87.6190], [41.8968, -87.6152], [41.8948, -87.6122], [41.8934, -87.6108], [41.8890, -87.6094], [41.8878, -87.6098], [41.8860, -87.6112], [41.8820, -87.6135], [41.8760, -87.6152], [41.8700, -87.6158], [41.8640, -87.6150], [41.8580, -87.6125], [41.8520, -87.6100], [41.8520, -87.5900], [41.9140, -87.5900]];
  const PIER = [[41.8931, -87.6110], [41.8931, -87.5960], [41.8908, -87.5960], [41.8908, -87.6100]];
  const EW = [['North Ave', 41.9108], ['Division St', 41.9036], ['Chicago Ave', 41.8966], ['Grand Ave', 41.8913], ['Lake St', 41.8857], ['Madison St', 41.8819], ['Jackson Blvd', 41.8781], ['Congress Pkwy', 41.8754], ['Roosevelt Rd', 41.8673], ['18th St', 41.8579]];
  const NS = [['Halsted St', -87.6474], ['Canal St', -87.6396], ['LaSalle St', -87.6325], ['State St', -87.6278], ['Michigan Ave', -87.6245]];
  const AREAS = [['GOOSE ISLAND', 41.9035, -87.6533], ['RIVER NORTH', 41.8935, -87.6310], ['STREETERVILLE', 41.8935, -87.6190], ['THE LOOP', 41.8810, -87.6290], ['WEST LOOP', 41.8810, -87.6500], ['SOUTH LOOP', 41.8700, -87.6260], ['CHINATOWN', 41.8545, -87.6330], ['LAKE MICHIGAN', 41.8800, -87.6080]];

  function riverPath(arr, cls) {
    return `<polyline class="${cls}" points="${pts(arr)}"/>`;
  }

  function baseSvg() {
    const streets = [
      ...EW.map(([n, lat]) => {
        const [x1, y] = xy(lat, B.west);
        const [x2] = xy(lat, -87.6160);
        const [lx] = xy(lat, -87.6462);
        return `<line class="street" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><text class="street-label" x="${lx}" y="${y}" dy="-0.35em">${n}</text>`;
      }),
      ...NS.map(([n, lon]) => {
        const [x, y1] = xy(B.north, lon);
        const [, y2] = xy(B.south, lon);
        const [, ly] = xy(41.8700, lon);
        return `<line class="street" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><text class="street-label" transform="translate(${x},${ly}) rotate(-90)" dy="-0.35em">${n}</text>`;
      }),
    ].join('');
    const areas = AREAS.map(([n, a, b]) => {
      const [x, y] = xy(a, b);
      return `<text class="area-label" x="${x}" y="${y}" text-anchor="middle">${n}</text>`;
    }).join('');
    return `
      <rect class="land" x="0" y="0" width="${W}" height="${H}"/>
      ${streets}
      <polygon class="lake" points="${pts(LAKE)}"/>
      <polygon class="land pier" points="${pts(PIER)}"/>
      <g class="river">
        ${riverPath(MAIN, 'water')}${riverPath(NORTH, 'water')}${riverPath(CANAL, 'water canal')}${riverPath(SOUTH, 'water')}
      </g>
      ${areas}`;
  }

  function create(el, opts = {}) {
    el.classList.add('rivermap');
    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of the Chicago River with tour stops">
        <g class="base">${baseSvg()}</g>
        <g class="stops"></g>
        <g class="pins"></g>
      </svg>
      <div class="map-tools">
        <button type="button" data-z="in" title="Zoom in" aria-label="Zoom in">+</button>
        <button type="button" data-z="out" title="Zoom out" aria-label="Zoom out">−</button>
        <button type="button" data-z="loop" title="Downtown">Loop</button>
        <button type="button" data-z="all" title="Whole route">All</button>
      </div>
      <div class="map-tip" hidden></div>
      <div class="map-pickhint" hidden>Click the river where the new stop should go · <button type="button" data-cancel>Cancel</button></div>`;
    const svg = el.querySelector('svg');
    const gStops = el.querySelector('.stops');
    const gPins = el.querySelector('.pins');
    const tip = el.querySelector('.map-tip');
    const pickHint = el.querySelector('.map-pickhint');
    let view = loopView();
    let picking = null;

    function loopView() {
      const [x1, y1] = xy(41.8975, -87.6480);
      const [x2, y2] = xy(41.8660, -87.6090);
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    function applyView() {
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
      // --s = SVG units per screen pixel, so pins and labels keep a steady size while zooming.
      const cw = svg.clientWidth || el.clientWidth || 600;
      const ch = svg.clientHeight || el.clientHeight || 600;
      const scale = Math.max(view.w / cw, view.h / ch);
      svg.style.setProperty('--s', scale.toFixed(4));
    }
    new ResizeObserver(() => applyView()).observe(el);
    function zoom(f, cx, cy) {
      const nw = Math.max(W / 12, Math.min(W, view.w * f));
      const nh = (nw / view.w) * view.h;
      cx = cx ?? view.x + view.w / 2;
      cy = cy ?? view.y + view.h / 2;
      view = { x: cx - ((cx - view.x) * nw) / view.w, y: cy - ((cy - view.y) * nh) / view.h, w: nw, h: nh };
      applyView();
    }
    applyView();

    el.querySelector('.map-tools').addEventListener('click', (e) => {
      const z = e.target.dataset.z;
      if (z === 'in') zoom(0.7);
      if (z === 'out') zoom(1 / 0.7);
      if (z === 'loop') { view = loopView(); applyView(); }
      if (z === 'all') { view = { x: 0, y: 0, w: W, h: H }; applyView(); }
    });

    function svgPoint(evt) {
      const p = svg.createSVGPoint();
      p.x = evt.clientX;
      p.y = evt.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    }
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = svgPoint(e);
      zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    }, { passive: false });

    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.pin') || picking) return;
      drag = { x: e.clientX, y: e.clientY, v: { ...view }, moved: false };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = svg.getBoundingClientRect();
      const dx = ((e.clientX - drag.x) / r.width) * view.w;
      const dy = ((e.clientY - drag.y) / r.height) * view.h;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      view = { ...drag.v, x: drag.v.x - dx, y: drag.v.y - dy };
      applyView();
    });
    svg.addEventListener('pointerup', () => { drag = null; });

    svg.addEventListener('click', (e) => {
      if (picking) {
        const p = svgPoint(e);
        const [lat, lon] = ll(p.x, p.y);
        const cb = picking;
        stopPicking();
        cb({ lat: +lat.toFixed(5), lon: +lon.toFixed(5) });
        return;
      }
      const pin = e.target.closest('.pin');
      if (pin && opts.onPinClick) opts.onPinClick(pin.dataset.id);
    });
    pickHint.querySelector('[data-cancel]').addEventListener('click', stopPicking);
    function stopPicking() {
      picking = null;
      el.classList.remove('picking');
      pickHint.hidden = true;
    }

    function showTip(e, html) {
      tip.innerHTML = html;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - r.left + 12, r.width - 230) + 'px';
      tip.style.top = e.clientY - r.top + 12 + 'px';
    }
    el.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-tip]');
      if (t) showTip(e, t.dataset.tip);
      const pin = e.target.closest('.pin');
      if (pin && opts.onHover) opts.onHover(pin.dataset.id);
    });
    el.addEventListener('pointerout', (e) => {
      if (e.target.closest('[data-tip]')) tip.hidden = true;
      if (e.target.closest('.pin') && opts.onHover) opts.onHover(null);
    });

    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    return {
      // Every catalog stop as a faint dot so the admin sees what is still open.
      setStops(stops) {
        gStops.innerHTML = stops.map((s) => {
          const [x, y] = xy(s.lat, s.lon);
          return `<g class="stop" transform="translate(${x},${y})" data-tip="${esc(`<b>${esc(s.name)}</b><br>${esc(s.address || '')}`)}"><circle r="3.2"/></g>`;
        }).join('');
      },
      // pins: [{ id, lat, lon, label, color, tip }]
      setPins(pins) {
        // Spread pins that sit on the same spot so all numbers stay readable.
        const seen = new Map();
        gPins.innerHTML = pins.map((p) => {
          let [x, y] = xy(p.lat, p.lon);
          const key = `${Math.round(x / 6)}:${Math.round(y / 6)}`;
          const n = seen.get(key) || 0;
          seen.set(key, n + 1);
          if (n) { const a = n * 1.9; x += Math.cos(a) * 11; y += Math.sin(a) * 11; }
          return `<g class="pin${p.dim ? ' dim' : ''}" data-id="${esc(p.id)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" data-tip="${esc(p.tip)}" tabindex="0">
            <g class="pin-body"><circle r="9" fill="${esc(p.color)}"/><text text-anchor="middle" dy="3.4">${esc(p.label)}</text></g></g>`;
        }).join('');
      },
      highlight(id) {
        gPins.querySelectorAll('.pin').forEach((g) => g.classList.toggle('hl', g.dataset.id === id));
        const g = id && gPins.querySelector(`.pin[data-id="${CSS.escape(id)}"]`);
        if (g) gPins.appendChild(g);
      },
      pickMode(cb) {
        picking = cb;
        el.classList.add('picking');
        pickHint.hidden = false;
      },
    };
  }

  window.RiverMap = { create };
})();
