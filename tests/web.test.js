// End-to-end test of the standalone web app (repo root), in a phone-sized Chromium.
// Serve the repo root first:  python3 -m http.server 8765   (from the repo root)
// Then:  cd tests && npm install && node web.test.js      (cloud workspace: CHROMIUM_PATH is not needed)
// Checks: welcome screen, starter foods, removed tabs, Økt (TLS phases, logging, rest timer, notes, videos, warm-up, training days, deload), reload, offline start, backup file, reminder banner, restore.
const { chromium } = require('playwright'); const fs = require('fs'); const pathMod = require('path');
const URL = process.env.FORGE_URL || 'http://localhost:8765/';
const OUT = pathMod.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
process.chdir(OUT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const mk = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: 'dark', acceptDownloads: true });
    await ctx.addInitScript(() => { window.prompt = () => { throw new Error('prompt used'); }; window.confirm = () => { throw new Error('confirm used'); }; window.alert = () => { throw new Error('alert used'); }; });
    return ctx; };
  const errs = []; const watch = (p) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); };
  const ctx = await mk(); const p = await ctx.newPage(); watch(p);
  await p.goto(URL); await sleep(800);
  console.log('welcome:', await p.textContent('#sheetRoot .sheet-head h3').catch(() => 'NONE'));
  await p.screenshot({ path: 'w1-welcome.png' });
  await p.click('#frFresh'); await sleep(800);
  console.log('tab profile visible:', await p.isVisible('#view-profile'), 'toast:', await p.textContent('#toastRoot'));
  await p.screenshot({ path: 'w2-profile.png', fullPage: true });
  await p.fill('#pVekt', '92'); await p.press('#pVekt', 'Enter'); await p.click('h1'); await sleep(300);
  // foods
  await p.click('.seg button[data-sec=kosthold]'); await p.click('nav.tabs button[data-tab=foods]'); await sleep(400);
  console.log('foods listed:', await p.$$eval('#foodList button[data-edit]', (e) => e.length));
  await p.click('nav.tabs button[data-tab=plan]'); await sleep(400);
  console.log('plan name:', await p.textContent('#planName'));
  await p.screenshot({ path: 'w3-plan.png' });
  // removed features are gone
  console.log('tabs:', await p.$$eval('nav.tabs button', (e) => e.map((x) => x.dataset.tab)));
  await p.click('.seg button[data-sec=trening]'); await p.click('nav.tabs button[data-tab=logg]'); await sleep(300);
  console.log('logg fields:', await p.$$eval('#loggWeek .wk-fields label', (e) => e.map((x) => x.textContent.trim())));
  // økt: today's workout from the TLS program, log a set, rest timer, Styrke follows
  await p.click('nav.tabs button[data-tab=okt]'); await sleep(400);
  console.log('okt title:', await p.textContent('#oktTitle'), '| days:', await p.$$eval('#oktDays .chip', (e) => e.map((x) => x.textContent)));
  console.log('okt exercises:', await p.$$eval('#oktList .ex h3', (e) => e.map((x) => x.textContent)));
  console.log('okt hints:', await p.$$eval('#oktList .ex-last', (e) => e.map((x) => x.textContent)));
  console.log('okt default reps:', await p.$$eval('#oktList .ex', (e) => e.map((x) => x.querySelector('input[data-oact=reps]').value)));
  await p.screenshot({ path: 'w5-okt.png', fullPage: true });
  await p.fill('#oktList [data-ex="0"] [data-set="0"] input[data-oact=kg]', '30'); await p.press('#oktList [data-ex="0"] [data-set="0"] input[data-oact=kg]', 'Enter'); await sleep(200);
  await p.click('#oktList [data-ex="0"] [data-set="0"] .okbtn'); await sleep(600);
  console.log('set ticked:', await p.$$eval('#oktList [data-ex="0"] .set.ok', (e) => e.length), 'next set kg carried:', await p.inputValue('#oktList [data-ex="0"] [data-set="1"] input[data-oact=kg]'), '| rest bar:', await p.isVisible('#restBar'), await p.textContent('#restTime'));
  await p.click('#oktList [data-ex="0"] [data-set="1"] [data-oact="kg+"]'); await sleep(200);
  console.log('step +:', await p.inputValue('#oktList [data-ex="0"] [data-set="1"] input[data-oact=kg]'));
  await p.screenshot({ path: 'w6-okt-rest.png' });
  await p.click('#restBar [data-rest=stop]'); await sleep(200);
  // notes: add one, it shows on the card
  await p.click('#oktList [data-ex="0"] .tools [data-oact=note]'); await sleep(200);
  await p.focus('#neText'); await sleep(450); console.log('sheet lifted for keyboard (px):', await p.$eval('#sheetRoot .sheet', (e) => e.style.bottom));
  await p.fill('#neText', 'Stangholder på hull 24\nSikkerhetsstenger på 12'); await p.click('#neSave'); await sleep(400); console.log('after save: sheet open', !!(await p.$('#sheetRoot .sheet')), '| toggle', await p.$$eval('#oktList [data-ex="0"] [data-oact=notes]', (e) => e.map((x) => x.textContent)));
  console.log('notes on card:', await p.$$eval('#oktList [data-ex="0"] .ex-note', (e) => e.map((x) => x.textContent)));
  console.log('video links:', await p.$$eval('#oktList .ex-head a.vid', (e) => e.map((x) => x.href)));
  console.log('warm-up:', await p.textContent('#oktList [data-ex="0"] .ex-warm'));
  // ⚙: training days and this week's deload
  await p.click('#oktCfgBtn'); await sleep(200);
  console.log('settings modus on:', await p.$eval('.pick[data-key=modus] .on', (e) => e.textContent), '| days hidden:', await p.$eval('#ocDays', (e) => e.hidden));
  await p.click('.pick[data-key=modus] [data-v=faste]'); await sleep(100);
  await p.click('.pick[data-day="0"] [data-wd="0"]'); await p.click('.pick[data-day="1"] [data-wd="2"]'); await p.click('.pick[data-day="2"] [data-wd="6"]');
  const hasDl = await p.$('.pick[data-key=dl]'); if (hasDl) await p.click('.pick[data-key=dl] [data-v="1"]');
  await p.click('#ocSave'); await sleep(500);
  console.log('after settings: title', await p.textContent('#oktTitle'), '| chips', await p.$$eval('#oktDays .chip', (e) => e.map((x) => x.textContent)), '| sub', await p.textContent('#oktSub'));
  console.log('banner:', await p.textContent('#oktBanner'));
  await p.screenshot({ path: 'w7-okt-deload.png', fullPage: true });
  const nb = await p.$('#oktNoDeload'); if (nb) { await nb.click(); await sleep(300); console.log('banner after Tren vanlig:', JSON.stringify(await p.textContent('#oktBanner'))); }
  // add-exercise list holds Matthews' exercises
  await p.click('#oktList [data-oact=addex]'); await sleep(200);
  console.log('picker has hip thrust:', await p.$$eval('#exPick [data-pick]', (e) => e.some((x) => x.dataset.pick === 'Barbell Hip Thrust')), 'count', await p.$$eval('#exPick [data-pick]', (e) => e.length));
  await p.click('#sheetRoot .sheet-foot [data-close]'); await sleep(200);
  // reload: data kept, no welcome
  await p.reload(); await sleep(900);
  console.log('after reload welcome?', !!(await p.$('#frFresh')), 'weight', await (async () => { await p.click('#profileBtn'); await sleep(300); return p.inputValue('#pVekt'); })());
  console.log('safety:', (await p.textContent('#safetyStatus')).replace(/\s+/g, ' '));
  console.log('install info:', await p.textContent('#installInfo'));
  console.log('pStart:', await p.inputValue('#pStart'));
  await p.click('.seg button[data-sec=trening]'); await p.click('nav.tabs button[data-tab=okt]'); await sleep(400);
  console.log('okt after reload, ticked sets:', await p.$$eval('#oktList .set.ok', (e) => e.length), '| saved session tools:', !!(await p.$('[data-oact=delsession]')));
  await p.click('#profileBtn'); await sleep(200);
  // offline
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 5000 }).catch(() => console.log('no SW controller yet'));
  await ctx.setOffline(true); await p.reload(); await sleep(900);
  console.log('offline loads, h1:', await p.textContent('h1'), 'font ok:', await p.evaluate(() => document.fonts.check('600 20px "Big Shoulders Display"')));
  await ctx.setOffline(false);
  // backup -> download
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }), p.click('#backupBtn')]);
  const path = 'backup.json'; await dl.saveAs(path); const bk = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log('backup week records:', bk.uker.map((w) => w.id + ':' + Object.keys(w.styrke || {}).join('/'))); console.log('backup okter:', (bk.okter || []).map((o) => o.id + ':' + o.navn), 'notater', (bk.notater || []).length); console.log('backup file:', dl.suggestedFilename(), 'foods', bk.matvarer.length, 'weeks', bk.uker.length, 'vekt', bk.profil.vekt, 'start', bk.trening.start);
  console.log('safety after backup:', (await p.textContent('#safetyStatus')).replace(/\s+/g, ' ').slice(0, 80));
  // reminder banner
  await p.evaluate(() => { localStorage.setItem('forge.lastBackup', Date.now() - 9 * 86400000); localStorage.setItem('forge.changed', Date.now()); });
  await p.reload(); await sleep(800);
  console.log('banner:', await p.isVisible('#backupBanner'), await p.textContent('#backupText'));
  await p.screenshot({ path: 'w4-banner.png' });
  // restore on a fresh "device"
  const ctx2 = await mk(); const q = await ctx2.newPage(); watch(q);
  await q.goto(URL); await sleep(800);
  const [chooser] = await Promise.all([q.waitForEvent('filechooser'), q.click('#frRestore')]);
  await chooser.setFiles(path); await sleep(400);
  console.log('confirm:', (await q.textContent('#sheetRoot .sheet-body')).replace(/\s+/g, ' '));
  await q.click('#askOk'); await sleep(900);
  await q.click('#profileBtn'); await sleep(300);
  console.log('restored weight:', await q.inputValue('#pVekt'), 'start', await q.inputValue('#pStart'));
  await q.click('.seg button[data-sec=trening]'); await sleep(300);
  await q.click('nav.tabs button[data-tab=okt]'); await sleep(300);
  console.log('restored okt ticked sets:', await q.$$eval('#oktList .set.ok', (e) => e.length), '| notes', await q.$$eval('#oktList .ex-note', (e) => e.length));
  await q.reload(); await sleep(800); console.log('restored survives reload, welcome?', !!(await q.$('#frFresh')));
  console.log('errors', errs);
  await b.close();
})();
