// End-to-end test of the standalone web app (repo root), in a phone-sized Chromium.
// Serve the repo root first:  python3 -m http.server 8765   (from the repo root)
// Then:  cd tests && npm install && node web.test.js      (cloud workspace: CHROMIUM_PATH is not needed)
// Checks: welcome screen, starter foods, saving, reload, offline start, backup file, reminder banner, restore.
const { chromium } = require('playwright'); const fs = require('fs'); const pathMod = require('path');
const URL = process.env.FORGE_URL || 'http://localhost:8765/';
const OUT = pathMod.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
process.chdir(OUT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
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
  // styrke: add exercise
  await p.click('.seg button[data-sec=trening]'); await p.click('nav.tabs button[data-tab=styrke]'); await sleep(300);
  console.log('styrke empty text:', await p.textContent('#styrkeList .empty').catch(() => 'none'), '| title', await p.textContent('#styrkeTitle'));
  await p.click('#addLiftBtn'); await sleep(200); await p.fill('#sheetRoot input', 'Knebøy'); await p.click('#sheetRoot .sheet-foot .btn.primary'); await sleep(200);
  await p.fill('#leVekt', '40'); await p.fill('#leReps', '8'); await p.click('#leSave'); await sleep(300);
  console.log('lifts:', await p.$$eval('#styrkeList .lift .n', (e) => e.map((x) => x.textContent)));
  // reload: data kept, no welcome
  await p.reload(); await sleep(900);
  console.log('after reload welcome?', !!(await p.$('#frFresh')), 'weight', await (async () => { await p.click('#profileBtn'); await sleep(300); return p.inputValue('#pVekt'); })());
  console.log('safety:', (await p.textContent('#safetyStatus')).replace(/\s+/g, ' '));
  console.log('install info:', await p.textContent('#installInfo'));
  console.log('pStart:', await p.inputValue('#pStart'));
  // offline
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 5000 }).catch(() => console.log('no SW controller yet'));
  await ctx.setOffline(true); await p.reload(); await sleep(900);
  console.log('offline loads, h1:', await p.textContent('h1'), 'font ok:', await p.evaluate(() => document.fonts.check('600 20px "Big Shoulders Display"')));
  await ctx.setOffline(false);
  // backup -> download
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }), p.click('#backupBtn')]);
  const path = 'backup.json'; await dl.saveAs(path); const bk = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log('backup file:', dl.suggestedFilename(), 'foods', bk.matvarer.length, 'weeks', bk.uker.length, 'vekt', bk.profil.vekt, 'start', bk.trening.start);
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
  await q.click('.seg button[data-sec=trening]'); await q.click('nav.tabs button[data-tab=styrke]'); await sleep(300);
  console.log('restored lifts:', await q.$$eval('#styrkeList .lift .n', (e) => e.map((x) => x.textContent)));
  await q.reload(); await sleep(800); console.log('restored survives reload, welcome?', !!(await q.$('#frFresh')));
  console.log('errors', errs);
  await b.close();
})();
