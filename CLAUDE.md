# The Forge — handover for Claude

The Forge is Bjørnar's diet and training app, built with Claude from 12 September 2026 (baseline day of
his cut on Michael Matthews' *Bigger Leaner Stronger*). It is the system of record for his diet, weights,
strength, diary and monthly measurements. Interface and food names are Norwegian; code comments English.
It belongs to the family of his apps (Sanctum, Atrium, Velum) but is not named after a room — it's the forge.

There are **two versions built from the same code**:

| Version | Where | Data | Used by |
|---|---|---|---|
| **Artifact** (`artifact/the-forge.html`) | claude.ai artifact https://claude.ai/artifact/RLQAJCkc6gWCy7zbQioDDn | claude.ai artifact database (`window.claude.use('db')`); Claude reads/writes it with ArtifactData | Bjørnar, in the Claude project "The Forge" |
| **Web app** (repo root: `index.html` + `sw.js` …) | GitHub Pages: https://athellion.github.io/forge/ | IndexedDB on the user's own device | His sister (and anyone else he gives the link) |

The web app was made on 25 October 2026 so his sister can use The Forge without a Claude account and
without sharing a database with him. It must never contain his personal data — only the starter food list.

## Where things live
- Repo: `athellion/forge` (public — required for free GitHub Pages; holds no personal data).
- Artifact: publish `artifact/the-forge.html` **with `url` set to the artifact link above** (publishing
  without it creates a new artifact). Capabilities: `db`, `downloads`. The live artifact is the truth for
  his app; if it was changed from the Claude project, read it back into `artifact/the-forge.html` first.
- His data (foods, plans, meals, inventory, weeks, months, settings) lives only in the artifact database,
  never in this repo. Project rules for the data (pin writes with `if_version`, Oda first for nutrition
  values, etc.) are in the Claude project's instructions.

## Working on it
1. Change `artifact/the-forge.html` and/or `index.html`. Most features belong in both: make the change in
   one, then port it to the other (the files differ only in the parts listed under "Web app differences").
2. Test (below). Add to the test for anything new in the web app.
3. Deliver: publish the artifact (with `url`), and/or push to `main` — Pages redeploys in a minute or two.
   **Bump `CACHE` in `sw.js`** when fonts, icons or `seed-foods.json` change (index.html is always fetched
   fresh when online, so a plain code change needs no bump).
4. Explain results in plain language; he is not a programmer by trade.

## Files
| File | Role |
|---|---|
| `artifact/the-forge.html` | The claude.ai version. One self-contained file |
| `index.html` | The web app. Same app, local storage and safety features added |
| `sw.js` | Service worker: keeps the app files for offline use; page network-first (4 s), the rest cache-first |
| `manifest.webmanifest` | Installable app (name, icons, standalone display) |
| `seed-foods.json` | Starter food list for a fresh web-app user: Bjørnar's food database (127 items incl. dish f900) as of 25 Oct 2026 |
| `fonts/` | Self-hosted Big Shoulders Display (600/700/800) and IBM Plex Sans (400/500/600), latin subset |
| `icons/` | Anvil icon PNGs (32/180/192/512, maskable 512), rendered from the same SVG as his phone/PC shortcut |
| `tests/web.test.js` | Playwright end-to-end test of the web app |

## How the app works (both versions)
- **Kosthold:** Dagsplan (five meal slots frokost/lunsj/pre/post/kvelds, budget gauges; carb and fat
  ceilings are dynamic remainders holding calories fixed), saved meals ("Bytt måltid"/"Lagre", adjusted
  meals show "(justert)"), Lager (inventory, grams; ✓/!/✗ marks in the plan; "Trekk dagens plan fra
  lageret"), Matvarer (per-100 g values, unit + grams per unit; dishes built from foods).
- **Profil:** Mifflin-St Jeor BMR × activity factor × goal factor (DEFINERE 0.78 / BYGGE 1.1 /
  VEDLIKEHOLDE 1.0). Protein minimum = lean mass × 2.5 g/kg when cutting, × 2.0 otherwise (his deliberate
  choice, Oct 2026). Theme toggle, fullscreen (phones only), export/import.
- **Trening:** Logg (daily weights, weekly average, waist, chart with deadlift on a right-hand axis,
  scale correction `settings/trening.vektskala`), Styrke (best set per exercise per week, Epley 1RM,
  Jefit CSV importer), Dagbok (ratings + diary), Mål (monthly measurements).
- The app opens on the day plan that was open last (`settings/app.currentPlanId`, set by `rememberPlan()` whenever a
  plan is opened, created or duplicated). There is no "gjeldende" (current) plan any more (removed 30 Oct 2026).
- Week numbers count from `settings/trening.start` (a Monday); `baseline` is the Saturday before.
- **Data model** (collections): `foods`, `plans`, `meals`, `inventory` (doc id = food id), `weeks`
  (`w000`…), `months`, and `settings/{app, profile, trening}`.
- claude.ai blocks `prompt()`/`confirm()` in artifacts — the app uses its own `askText`/`askConfirm` sheets.
  Keep it that way in both versions.

## Web app differences (`index.html` vs the artifact)
- **Storage:** `makeLocalDb()` implements the same interface the app used on claude.ai
  (`doc(path).onSnapshot/set/delete`, `collection(name).onSnapshot`, plus `setMany`) on IndexedDB
  database `forge` (stores `docs` keyed `collection/id`, and `meta`). Each write commits before the UI updates.
- **Files:** `localFiles.save` — plain download; backups use the phone's share sheet when available.
- **First run** (empty database): welcome sheet → "Start på nytt" (seeds foods, an empty plan `p-start`,
  training start = this Monday, placeholder profile: woman, 80 kg, 168 cm, 40 y, 35 %) or "Gjenopprett
  sikkerhetskopi".
- **Data safety:** `navigator.storage.persist()`; weekly reminder banner when there are changes since the last
  backup (7 days after the last backup or first use); one-tap backup (`TheForge-sikkerhetskopi_DATE.json`,
  same format as the artifact's JSON export, so backups move between versions); on a PC an optional folder
  (File System Access API, handle kept in `meta`) gets an automatic copy at most daily when something changed.
  Restore marks the data as backed up. Status shown under Profil → Sikkerhetskopi.
- **Profil** also has "Første treningsuke starter" (start date) and install instructions/button.
- **Styrke** has no fixed program (`program: []`): it lists every exercise ever logged. The artifact has his
  5-day BLS split.
- No fullscreen button once installed (standalone already hides browser bars).
- The folder backup could not be tested in the cloud workspace (no folder picker in headless Chromium).

## Test
```sh
python3 -m http.server 8765          # from the repo root
cd tests && npm install && node web.test.js
```
Expect `errors []` at the end. The artifact version has no test file here; it was tested with Playwright and a
mocked `window.claude.use('db')` backed by a copy of the database.
