// First-run data: groups, tour legs, and (from the gitignored roster.private.js)
// the Skyline Speakers roster, the scripts students emailed on Nov 4, 2026, and
// a starting run of show based on the workshop's plan
// (Wendella dock → Main Branch west → North Branch out and back → South Branch
// out and back → Main Branch east to the lake).
//
// Groups were inferred from the script template each student used (the 4-minute
// MS template vs. the short "Look! It has a big secret!" template). Students
// with no script yet are Unassigned. The admin can change all of it in the app.

// Emails arrive hard-wrapped at ~76 characters. Rejoin lines inside a paragraph.
function unwrap(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).join(' '))
    .join('\n\n');
}

const groups = [
  { id: 'wl', name: 'WL/LL', color: '#e0567a', targetSeconds: 60 },
  { id: 'l1', name: 'L1', color: '#f0a020', targetSeconds: 90 },
  { id: 'l2', name: 'L2', color: '#2aa876', targetSeconds: 120 },
  { id: 'ms', name: 'MS', color: '#3d6be0', targetSeconds: 240 },
  { id: 'none', name: 'Unassigned', color: '#8a8f9c', targetSeconds: 120 },
];

const legs = [
  { id: 'intro', name: 'Welcome & framing', hint: 'At the dock, before the boat heads west', budgetMin: 4 },
  { id: 'leg1', name: 'Leg 1 · Main Branch heading west', hint: 'Michigan Ave to Wolf Point', budgetMin: 12 },
  { id: 'leg2', name: 'Leg 2 · North Branch, out and back', hint: 'Wolf Point to Goose Island and back', budgetMin: 25 },
  { id: 'leg3', name: 'Leg 3 · South Branch, out and back', hint: 'Wolf Point to River City / Roosevelt and back', budgetMin: 40 },
  { id: 'leg4', name: 'Leg 4 · Main Branch heading east', hint: 'Wolf Point to the lake', budgetMin: 26 },
  { id: 'closing', name: 'Closing', hint: 'Back at the dock', budgetMin: 3 },
];

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function loadPrivate() {
  try {
    return require('./roster.private.js');
  } catch {
    return { roster: [], scripts: {}, notes: {}, earlierDrafts: {}, placementOrder: [] };
  }
}

function buildSeed() {
  const { roster, scripts, notes, earlierDrafts, placementOrder } = loadPrivate();
  const now = new Date().toISOString();
  const students = [];
  const layout = Object.fromEntries(legs.map((l) => [l.id, []]));
  // Run-of-show order inside each leg follows the order students appear below.
  for (const r of roster) {
    const id = slug(r.name);
    const segs = (scripts[r.name] || []).map(([stopId, title, text, leg], i) => ({
      id: `${id}-${i + 1}`,
      stopId,
      title,
      text: text ? unwrap(text) : '',
      _leg: leg,
      updatedAt: now,
    }));
    students.push({
      id,
      name: r.name,
      email: r.email,
      group: r.group,
      note: notes[r.name] || '',
      earlierDrafts: (earlierDrafts[r.name] || []).map((d) => ({ ...d, text: unwrap(d.text) })),
      segments: segs,
      status: segs.some((s) => s.text) ? 'draft' : 'not-started',
      updatedAt: now,
    });
  }
  for (const name of placementOrder) {
    const st = students.find((s) => s.name === name);
    if (!st) continue;
    for (const seg of st.segments) if (seg._leg) layout[seg._leg].push(seg.id);
  }
  for (const st of students) for (const seg of st.segments) delete seg._leg;
  return { groups, legs, students, layout };
}

module.exports = { buildSeed, slug, unwrap };
