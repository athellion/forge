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
| `tests/artifact.test.js` | Playwright test of the artifact with a mocked database and made-up data |

## How the app works (both versions)
- **Kosthold:** Dagsplan (five meal slots frokost/lunsj/pre/post/kvelds, budget gauges; carb and fat
  ceilings are dynamic remainders holding calories fixed), saved meals ("Bytt måltid"/"Lagre", adjusted
  meals show "(justert)"), Matvarer (per-100 g values, unit + grams per unit; dishes built from foods).
  Lager (inventory) was removed on 15 Nov 2026, with its stock marks and "Trekk dagens plan fra lageret".
- **Profil:** Mifflin-St Jeor BMR × activity factor × goal factor (DEFINERE 0.78 / BYGGE 1.1 /
  VEDLIKEHOLDE 1.0). Protein minimum = lean mass × 2.5 g/kg when cutting, × 2.0 otherwise (his deliberate
  choice, Oct 2026). Theme toggle, fullscreen (phones only), export/import.
- **Trening:** Økt (below), Logg (daily weights, weekly average, waist, weekly comment, chart with deadlift on a
  right-hand axis, scale correction `settings/trening.vektskala`), Dagbok (ratings + diary; artifact only), Mål
  (monthly measurements). Removed 15 Nov 2026: the Styrke tab and the Jefit importer (the weekly best-set records
  `weeks.styrke` stay, kept up to date by Økt, and feed the deadlift line, the Excel Styrke sheet and his diary
  write-ups), and Logg's "Økter" and "Kosthold 1–5" fields (old values stay in the data; Kosthold was always his
  rating of how much he *enjoyed* the week's food, not adherence).
- The app opens on the day plan that was open last (`settings/app.currentPlanId`, set by `rememberPlan()` whenever a
  plan is opened, created or duplicated). There is no "gjeldende" (current) plan any more (removed 30 Oct 2026).
- **Økt** (first Trening tab, added 4 Nov 2026): the workout logger. Opens today's session from the program by the
  training-day setting (`settings/trening.dager`: `{modus: 'faste', uke: [weekday per program day]}` or
  `{modus: 'rotasjon'}` = the workout after the last one logged; set under ⚙; chips show the weekday or 1, 2, 3; on
  other days pick a workout or "Fri økt"). Per exercise: last time's sets and Matthews'
  double progression (`suggestion()`: up one weight step once the top weight reached `repsMax` in `toppSett` sets;
  defaults reps 4–6, 3 sets, rest 3:00, editable under ⚙ and stored as `settings/trening.okt`). Weight step =
  smallest jump in the exercise's history (`stepFor()`), else 2.5 kg (bars/dumbbells) / 5 kg. Sessions are saved in
  collection `okter`, one doc per date (`o2026-11-04`: {dato, dag, navn, ovelser: [{navn, sett: [{kg, reps, ok}],
  kommentar?}], kilde?}); a session from the program is only saved once something is changed. Every change rebuilds
  the week's `styrke[name]` from that week's sessions (`syncStyrke()`, best Epley set wins) and raises `okter`.
  Rest timer (fixed bar above the tabs) starts on each ticked set, end time kept in localStorage `forge.rest`,
  plays the chosen sound (`okt.lyd`: synth (default: detuned saws through a plucked low-pass + echo; E5+E4 ×3, then an A major chord), nedtelling (3 warm E5 notes, then a long A5), alarm, bjelle, klokke, myk) at 3-2-1 s and at zero via Web Audio through a compressor; screen wake lock while Økt is open, where allowed. New best Epley → toast + sparks.
  Sessions with `kilde: 'jefit'` came from the old Jefit importer (full history from 14 Sep 2026).
  Added 15 Nov 2026 (both apps):
  - **Notes** per exercise (not per day): collection `notater`, doc id `noteDocId(name)` = `n-` + slug,
    `{navn, notater: [{id, tekst, dato}]}`. Shown on the card newest first; tap to edit/delete, "+ Notat" to add.
    His Jefit notes (51, from 2015 on) were imported by exercise id with Matthews' names; they are in backups.
  - **Videos:** `MATTHEWS` = Matthews' exercise names with his TLS demonstration videos (34 links; the three lat
    pulldown grips share one; Assisted Pull-Up has none). ▶ on the card opens it (plain link). Own link per
    exercise under ⋯ → `settings/trening.videoer[name]`. All of `MATTHEWS` is in the "Legg til øvelse" list.
  - **Names:** Matthews' terminology everywhere. `RENAME_2026_11` maps the old Jefit names; `maybeMigrate()` ran
    once per database (flag `settings/trening.migrert` contains '2026-11-15'): renamed okter/weeks.styrke/program,
    deleted `inventory`, and changed "adherence N"/"Diet rated N" to "enjoyment" in diary texts. It can be removed
    once his app has run it.
  - **Deload:** every `deloadEtter + 1`th week (default 8 → weeks 9, 18, …; `isDeloadWeek()`), switchable per week
    under ⚙ or "Tren vanlig" (`settings/trening.deloadUker`). Deload sessions (`deload: true`): 2 sets at the last
    working weight, 3 reps for the first two lifts and 4 for the rest; kept out of `performances()` (progression,
    records) and `syncStyrke()`. The header counts down to the next deload week.
  - **Warm-up** line under the first lift of a program session: 6 reps at ~50 % and 4 at ~70 % of the working
    weight (rounded to the weight step, never under a 20 kg bar).
  - Rep range per exercise: the program day's positional `reps` (stored on the exercise as `rr`), else `okt.repsMin/Max`.
  The web app got Økt on 15 Nov 2026; the Økt code is identical in both files except `OKT_DEFAULT`.
- Week numbers count from `settings/trening.start` (a Monday); `baseline` is the Saturday before.
- **Data model** (collections): `foods`, `plans`, `meals`, `inventory` (doc id = food id), `weeks`
  (`w000`…), `months`, `okter` (workout sessions), `notater` (exercise notes), and `settings/{app, profile, trening}`.
  (`inventory` is gone.)
- claude.ai blocks `prompt()`/`confirm()` in artifacts — the app uses its own `askText`/`askConfirm` sheets.
  Keep it that way in both versions.

## Web app differences (`index.html` vs the artifact)
- **Storage:** `makeLocalDb()` implements the same interface the app used on claude.ai
  (`doc(path).onSnapshot/set/delete`, `collection(name).onSnapshot`, plus `setMany`) on IndexedDB
  database `forge` (stores `docs` keyed `collection/id`, and `meta`). Each write commits before the UI updates.
- **Files:** `localFiles.save` — plain download; backups use the phone's share sheet when available.
- **First run** (empty database): welcome sheet → "Start på nytt" (seeds foods, an empty plan `p-start`,
  training start = this Monday, or the coming Monday when started on a Saturday or Sunday, placeholder profile: woman, 80 kg, 168 cm, 40 y, 35 %) or "Gjenopprett
  sikkerhetskopi".
- **Data safety:** `navigator.storage.persist()`; weekly reminder banner when there are changes since the last
  backup (7 days after the last backup or first use); one-tap backup (`TheForge-sikkerhetskopi_DATE.json`,
  same format as the artifact's JSON export, so backups move between versions); on a PC an optional folder
  (File System Access API, handle kept in `meta`) gets an automatic copy at most daily when something changed.
  Restore marks the data as backed up. Status shown under Profil → Sikkerhetskopi.
- **Profil** also has "Første treningsuke starter" (start date) and install instructions/button.
- **Program:** Matthews' *Thinner Leaner Stronger* 3-day routine, all six phases (`DEFAULT_TRENING.faser`, from the TLS
  bonus PDF), each followed by its deload week: phase = 8 training weeks, then deload (same `deloadEtter` rule), then
  the next phase; after phase 6 it starts over (`phaseIndex()`). Days Lower Body A / Push / Pull with `reps: TLS_REPS`
  (6–8, 6–8, 8–10, 8–10). Training days default to `rotasjon` (she can switch to fixed days). `OKT_DEFAULT`:
  reps 8–10 for added exercises, `toppSett: 1` (TLS guide: up in weight after one top-rep set). The artifact has
  one phase: his 5-day BLS split on fixed weekdays Mon–Fri.
- **No Dagbok** (the diary is how he and Claude work; she doesn't use it): no tab, no Excel sheet.
- No fullscreen button once installed (standalone already hides browser bars).
- The folder backup could not be tested in the cloud workspace (no folder picker in headless Chromium).

## Test
```sh
python3 -m http.server 8765          # from the repo root
cd tests && npm install && node web.test.js
```
If Playwright's own browser download is blocked, point it at an installed Chromium:
`CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node web.test.js`.
Expect `errors []` at the end. `node artifact.test.js` tests the artifact the same way with a mocked
`window.claude.use('db')` and a made-up fixture in the old format (tests the one-time update, notes, videos, deload,
training days); its clock is fixed with `page.clock`.
