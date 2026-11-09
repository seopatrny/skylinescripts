// Builds an upload file from data/roster.private.js for the admin "Import" button:
//   npm run make-import            → data/roster-import.private.json
const fs = require('fs');
const path = require('path');
const { buildSeed } = require('../data/seed');

const seed = buildSeed();
if (!seed.students.length) {
  console.error('data/roster.private.js is missing or empty.');
  process.exit(1);
}
const out = path.join(__dirname, '..', 'data', 'roster-import.private.json');
fs.writeFileSync(out, JSON.stringify({
  exportedAt: new Date().toISOString(),
  config: { groups: seed.groups, legs: seed.legs, layout: seed.layout, customStops: [], studentIds: seed.students.map((s) => s.id) },
  students: seed.students,
}, null, 1));
console.log(`Wrote ${out} (${seed.students.length} students)`);
