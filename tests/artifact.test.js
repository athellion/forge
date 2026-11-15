// End-to-end test of the claude.ai version (artifact/the-forge.html) with a mocked window.claude.use('db').
// The fixture uses the old Jefit names, a stock list and an "Adherence" diary line, so the one-time data update
// is tested too. Serve the repo root first (python3 -m http.server 8765), then: node artifact.test.js
// Contains no real data: the fixture is made up.
const { chromium } = require('playwright'); const fs = require('fs'); const pathMod = require('path');
const URL = (process.env.FORGE_URL || 'http://localhost:8765/') + 'artifact/the-forge.html';
const OUT = pathMod.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); process.chdir(OUT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ex = (navn, kg, reps) => ({ navn, sett: [0, 1, 2].map(() => ({ kg, reps, ok: true })) });
const FIX = {
  'settings/trening': { start: '2026-09-14', baseline: '2026-09-12', fotoHverUke: 4, program: [
    { dag: 'Man', navn: 'Push', ovelser: ['Barbell Bench Press', 'Barbell Incline Bench Press', 'Dumbbell Bench Press', 'Cable Tricep Pushdown (V-Bar)'] },
    { dag: 'Tir', navn: 'Pull', ovelser: ['Barbell Deadlift', 'Dumbbell One-Arm Row', 'Cable Lat Pulldown (Wide Grip)', 'Dumbbell Alternating Bicep Curl'] },
    { dag: 'Ons', navn: 'Upper Body A', ovelser: ['Dumbbell Seated Shoulder Press', 'Dumbbell Lateral Raise', 'Dumbbell Rear Lateral Raise', 'Dumbbell Seated Tricep Press'] },
    { dag: 'Tor', navn: 'Legs', ovelser: ['Barbell Squat', 'Machine Seated Leg Curl', 'Machine Leg Press', 'Dumbbell Lunge'] },
    { dag: 'Fre', navn: 'Upper Body B', ovelser: ['Barbell Bench Press (Close Grip)', 'Machine Assisted Chin-Up', 'Cable Seated Row', 'Barbell Curl'] }] },
  'settings/app': { currentPlanId: 'p1', tema: 'dark' },
  'foods/f1': { kategori: 'Protein', navn: 'Kyllingfilet', kcal100: 105, protein100: 23, karb100: 0, fett100: 1.5, fiber100: 0 },
  'plans/p1': { navn: 'Testplan', meals: { frokost: [{ foodId: 'f1', antall: 200 }], lunsj: [], pre: [], post: [], kvelds: [] } },
  'inventory/f1': { mengde: 400, sted: 'kjoleskap', basis: false },
  'weeks/w008': { uke: 8, dato: '2026-11-07', vekt: { man: 94.5 }, midje: 101, okter: 5, kosthold: 4, kommentar: '',
    dagbok: { energi: 3, tekst: 'DIET: Adherence 4. Menus as planned, adherence 4. Diet rated 4.' },
    styrke: { 'Machine Leg Press': { dato: '2026-11-05', vekt: 183, reps: 6, sett: [[183, 6]], kommentar: '' }, 'Barbell Squat': { dato: '2026-11-05', vekt: 47.5, reps: 6, sett: [[47.5, 6]] } } },
  'okter/o2026-11-02': { dato: '2026-11-02', dag: 0, navn: 'Push', ovelser: [ex('Barbell Bench Press', 52.5, 6), ex('Barbell Incline Bench Press', 47.5, 5), ex('Dumbbell Bench Press', 20, 6), ex('Cable Tricep Pushdown (V-Bar)', 25, 8)] },
  'okter/o2026-11-05': { dato: '2026-11-05', dag: 3, navn: 'Legs', ovelser: [ex('Barbell Squat', 47.5, 6), ex('Machine Seated Leg Curl', 89, 6), ex('Machine Leg Press', 183, 6), ex('Dumbbell Lunge', 8, 6)] },
  'notater/n-barbell-squat': { navn: 'Barbell Squat', notater: [{ id: 'j52', tekst: 'Høyde på stang-holder er 24. hull fra gulvet.', dato: '2026-09-17' }, { id: 'j48', tekst: 'Husk sikkerhetsstenger!', dato: '2025-07-24' }] },
};
const MOCK = (fix) => {
  const store = new Map(Object.entries(fix)); const docSubs = new Map(), colSubs = new Map(); window.__store = store; window.__writes = [];
  const col = (p) => p.split('/')[0];
  const docSnap = (p) => ({ exists: store.has(p), data: () => JSON.parse(JSON.stringify(store.get(p))) });
  const colSnap = (c) => ({ docs: [...store.keys()].filter((k) => col(k) === c).map((k) => ({ id: k.split('/')[1], data: () => JSON.parse(JSON.stringify(store.get(k))) })) });
  const notify = (p) => { setTimeout(() => { for (const cb of docSubs.get(p) || []) cb(docSnap(p)); for (const cb of colSubs.get(col(p)) || []) cb(colSnap(col(p))); }, 5); };
  const sub = (m, k, cb, snap) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(cb); setTimeout(() => cb(snap()), 5); return () => m.get(k).delete(cb); };
  const db = {
    doc: (p) => ({ onSnapshot: (cb) => sub(docSubs, p, cb, () => docSnap(p)),
      set: async (d) => { store.set(p, JSON.parse(JSON.stringify(d))); window.__writes.push('set ' + p); notify(p); },
      delete: async () => { store.delete(p); window.__writes.push('del ' + p); notify(p); } }),
    collection: (c) => ({ onSnapshot: (cb) => sub(colSubs, c, cb, () => colSnap(c)) }),
  };
  window.claude = { use: async (what) => (what === 'db' ? db : { save: async () => {} }) };
};
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errs = [];
  const open = async (time) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.addInitScript(MOCK, FIX);
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); }); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.clock.install({ time: new Date(time) });
    await p.goto(URL); await sleep(1200); return p;
  };
  // ---- Monday 16 Nov 2026 (week 10): Push by weekday, migrated names, notes, videos, warm-up
  let p = await open('2026-11-16T17:00:00');
  const st = await p.evaluate(() => Object.fromEntries([...window.__store.entries()]));
  console.log('migrated program:', st['settings/trening'].program.map((d) => d.ovelser.join(', ')).join(' | '));
  console.log('migrated flag:', st['settings/trening'].migrert, '| inventory left:', Object.keys(st).filter((k) => k.startsWith('inventory/')));
  console.log('migrated okter:', st['okter/o2026-11-05'].ovelser.map((x) => x.navn).join(', '));
  console.log('migrated week:', Object.keys(st['weeks/w008'].styrke).join(', '), '| diary:', st['weeks/w008'].dagbok.tekst);
  console.log('tabs:', await p.$$eval('nav.tabs button', (e) => e.map((x) => x.dataset.tab)));
  await p.click('.seg button[data-sec=trening]'); await p.click('nav.tabs button[data-tab=okt]'); await sleep(400);
  console.log('okt title:', await p.textContent('#oktTitle'), '| sub:', await p.textContent('#oktSub'));
  console.log('chips:', await p.$$eval('#oktDays .chip', (e) => e.map((x) => x.textContent)));
  console.log('exercises:', await p.$$eval('#oktList .ex h3', (e) => e.map((x) => x.textContent)));
  console.log('hints:', await p.$$eval('#oktList .ex-last', (e) => e.map((x) => x.textContent)));
  console.log('warm-up:', await p.textContent('#oktList [data-ex="0"] .ex-warm'));
  console.log('videos:', await p.$$eval('#oktList .ex-head a.vid', (e) => e.length));
  await p.screenshot({ path: 'a1-okt-push.png', fullPage: true });
  await p.click('#oktDays [data-oday="3"]'); await sleep(300);
  console.log('legs notes hidden:', await p.$$eval('#oktList [data-ex="0"] .ex-note', (e) => e.length), '| toggle:', await p.textContent('#oktList [data-ex="0"] [data-oact=notes]'));
  await p.click('#oktList [data-ex="0"] [data-oact=notes]'); await sleep(200);
  console.log('legs notes:', await p.$$eval('#oktList [data-ex="0"] .ex-note', (e) => e.map((x) => x.textContent)));
  console.log('legs hints:', await p.$$eval('#oktList .ex-last', (e) => e.map((x) => x.textContent)));
  await p.screenshot({ path: 'a2-okt-legs.png', fullPage: true });
  // edit a note, change a video
  await p.click('#oktList [data-ex="0"] .ex-note >> nth=1'); await sleep(200);
  await p.fill('#neText', 'Husk sikkerhetsstenger (hull 12)!'); await p.click('#neSave'); await sleep(300);
  console.log('edited note:', await p.$$eval('#oktList [data-ex="0"] .ex-note', (e) => e.map((x) => x.textContent)));
  await p.click('#oktList [data-ex="1"] [data-oact=exmenu]'); await sleep(200);
  console.log('menu video row:', await p.textContent('#sheetRoot .sheet-body .row.between'));
  await p.click('#exVid'); await sleep(200); await p.fill('#sheetRoot input', 'https://youtu.be/abc123'); await p.click('#sheetRoot .sheet-foot .btn.primary'); await sleep(300);
  console.log('custom video:', await p.$eval('#oktList [data-ex="1"] a.vid', (e) => e.href));
  // Logg: fields gone
  await p.click('nav.tabs button[data-tab=logg]'); await sleep(300);
  console.log('logg fields:', await p.$$eval('#loggWeek .wk-fields label', (e) => e.map((x) => x.textContent.trim())), '| header:', await p.textContent('#hdrStatus'));
  await p.click('.seg button[data-sec=kosthold]'); await sleep(300);
  console.log('plan marks left:', await p.$$eval('#view-plan .inv, #subtractDayBtn', (e) => e.length));
  await p.context().close();
  // ---- Wednesday 11 Nov 2026 (week 9): deload week
  p = await open('2026-11-11T17:00:00');
  await p.click('.seg button[data-sec=trening]'); await p.click('nav.tabs button[data-tab=okt]'); await sleep(400);
  console.log('deload title:', await p.textContent('#oktTitle'), '| sub:', await p.textContent('#oktSub'), '| header:', await p.textContent('#hdrStatus'));
  console.log('deload banner:', await p.textContent('#oktBanner'));
  console.log('deload sets:', await p.$$eval('#oktList .ex', (e) => e.map((x) => x.querySelectorAll('.set').length + '×' + x.querySelector('input[data-oact=reps]').value)));
  console.log('deload hints:', await p.$$eval('#oktList .ex-last', (e) => e.map((x) => x.textContent)));
  await p.screenshot({ path: 'a3-okt-deload.png', fullPage: true });
  await p.click('#oktNoDeload'); await sleep(400);
  console.log('after Tren vanlig:', await p.$$eval('#oktList .ex', (e) => e.map((x) => x.querySelectorAll('.set').length)), '| banner', JSON.stringify(await p.textContent('#oktBanner')));
  // ⚙: in-turn mode
  await p.click('#oktCfgBtn'); await sleep(200);
  console.log('settings: modus', await p.$eval('.pick[data-key=modus] .on', (e) => e.textContent), '| day rows', await p.$$eval('#ocDays .ocday', (e) => e.length), '| week pick', await p.$eval('.pick[data-key=dl] .on', (e) => e.textContent));
  await p.screenshot({ path: 'a4-settings.png', fullPage: true });
  await p.click('.pick[data-key=modus] [data-v=rotasjon]'); await p.click('#ocSave'); await sleep(400);
  console.log('in turn: chips', await p.$$eval('#oktDays .chip', (e) => e.map((x) => x.textContent)), '| title', await p.textContent('#oktTitle'));
  console.log('errors', errs.filter((e) => !/status of 404/.test(e))); // the 404 is the browser's favicon request
  await b.close();
})();
