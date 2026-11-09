# Skyline Speakers

A small website for the Skyline Speakers workshop at Alpha School Chicago.

- **Students** log in by picking their name and typing a password (their last name + 2026, like `smith2026`), then write and edit their own tour stop scripts. Each stop shows the building photo, instructor facts, a time estimate against their group's goal, where they fall in the tour (who speaks before and after), and a full-screen ▶ Practice mode with a timer. Work saves as they type.
- **Guides (admin)** log in with a password and get:
  - **Tour & river**: a map of the Chicago River (Main, North and South Branches, Goose Island, the lakefront) with every speaker's stop pinned and numbered in tour order, next to the run of show. Drag stops between legs and up or down to change the order; the numbers and pins update. Each leg shows speaking time against its time budget. Click any stop to read or edit the script. "+ Stop on map" adds a new stop (building, bridge or story) by clicking the river.
  - **Groups**: drag students between groups (WL/LL, L1, L2, MS, or new ones), set each group's color and per-speaker time goal, and spotlight a group's stops on the river map.
  - **Students**: roster with group, password (always visible; click to change, ↻ to reset, or reset everyone at once), stops (a multi-select dropdown to assign stops), time, status, last edit. Add or remove students. Download a JSON backup.
  - **Resources**: every building with its photo, facts, year, architect and stories from a volunteer river tour guide, searchable. Students see the same stories in a 📚 Resources section beside each stop and in "Browse all buildings & stories".
  - **Print**: the full run of show with every script in tour order, and printable login cards with each student's password.

## Student data stays out of this repo

This repository is public, so the roster (names, school emails) and student scripts are **not committed**. They live in `data/roster.private.js`, which is gitignored.

- **Running locally with that file present**: the database is seeded from it on first start.
- **On a hosted site**: run `npm run make-import` locally to produce `data/roster-import.private.json`, then upload it on the **Students** tab with **Import…**. The same button restores any file from **Download backup**.

The private roster was built from the Nov 4, 2026 script emails and the Skyline Speakers email list:

- Scripts that cover two or three buildings are split into one stop per building, so each stop can sit at its own spot on the river.
- Students given a role but no script yet get an empty stop at the right place (Goose Island; welcome and river history; the Great Chicago Fire plus a building to choose), with a note explaining the role. An earlier draft that no longer matches a role is kept under "Earlier drafts".
- A script that arrived only as a screenshot could not be copied in. That student has an empty stop and a note asking them to type it.
- **Groups are guesses** based on which script template each student used: the short "Look! It has a big secret!" template means WL/LL, the 4-minute template means MS. Everyone else is Unassigned. Fix these on the Groups tab.

Buildings come from the instructor "Maps and Buildings" packet, with photos from the CAC Tour Photo Sheets (`public/photos`). Goose Island, the Great Chicago Fire site, the welcome stop and 300 N LaSalle were added. See `data/buildings.js`.

## Run it locally

```bash
npm install
```

```bash
ADMIN_PASSWORD=choose-a-password npm start
```

Open http://localhost:3000. Data is saved to `data/db.json` (not committed). If you do not set `ADMIN_PASSWORD`, a random one is generated on first start and printed in the terminal.

## Deploy

`main` is the production branch: point your host (Vercel, Render, …) at `main`, and anything merged or pushed to `main` goes live. Do feature work on other branches.

Any Node 18+ host works.

**Vercel**: import the repo and keep the **Express** preset (Vercel serves `public/` and runs `server.js`). `vercel.json` pins the preset and clears any Output Directory override; do not set Output Directory to `public`, or Vercel looks for the server there and fails with "No entrypoint found which imports express". Before or after the first deploy, open the project's **Storage** tab and add an **Upstash Redis** (KV) store; that sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Under **Settings → Environment Variables** add `ADMIN_PASSWORD` and `SESSION_SECRET` (any long random string), then redeploy. Without the Redis store the login page shows a message saying the database is missing, because Vercel cannot save files.

**Render, Railway, Fly, a school server**: `npm install && npm start`. Either attach a persistent disk and set `DATA_FILE` to a path on it, or set the Upstash variables above (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work).

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Guide login password |
| `SESSION_SECRET` | Signs login cookies (otherwise one is generated and stored) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash / Vercel KV storage |
| `KV_PREFIX` | Start of every database key (default `skylinescripts:`), so one Redis can be shared with other apps |
| `DATA_FILE` | Path for file storage when not using KV |
| `PORT` | Port for `npm start` (default 3000) |

## Notes

- Student passwords default to last name + 2026 (set `PASSWORD_SUFFIX` to change the 2026) and are stored as plain text so guides can see and print them. Capital letters don't matter when logging in. Because they are easy to guess, a student could log in as a classmate; change any password by clicking it on the Students tab. Six wrong tries lock that account for two minutes from that device.
- Time estimates assume about 120 words per minute.
