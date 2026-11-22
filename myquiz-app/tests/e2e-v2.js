// v2 feature test (artifact mode with the mock runtime from e2e-artifact.js):
// language switch, reward points + anti-farming, leaderboard privacy, display name / hide,
// prizes, winner announcements and moderation. Other students are seeded as lb/* documents.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '';
const BASE = 'http://127.0.0.1:8765/index.html';
const src = fs.readFileSync(path.join(__dirname, 'e2e-artifact.js'), 'utf8');
eval(src.slice(src.indexOf('const MOCK = () => {'), src.indexOf('(async () => {')).replace('const MOCK', 'globalThis.MOCK'));
const errors = [];
let fails = 0;
const step = m => console.log('•', m);
const check = (ok, m) => { if (!ok) fails++; console.log(ok ? '  ✔' : '  ✘ FAIL', m); };
const DEV = /[ऀ-ॿ]/;

const SEED = () => {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const lwd = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7);
  const wk = iso(mon), lw = iso(lwd), mo = iso(now).slice(0, 7);
  const pmd = new Date(now.getFullYear(), now.getMonth() - 1, 1), pm = iso(pmd).slice(0, 7);
  window.__keys = { wk, lw, mo, pm };
  window.__store.set('lb/u_ravi', { n: 'Ravi', wk, wp: 50, pw: lw, pwp: 120, mo, mp: 170, pm, pmp: 300, tp: 900, at: Date.now() });
  window.__store.set('lb/u_meena', { n: 'Meena', wk: lw, wp: 200, pw: '', pwp: 0, mo, mp: 200, pm, pmp: 0, tp: 500, at: Date.now() - 6 * 864e5 });
  window.__store.set('lb/u_bad', { n: 'BadName', wk, wp: 30, pw: lw, pwp: 5, mo, mp: 35, pm, pmp: 0, tp: 35, at: Date.now() });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(MOCK);
  await page.addInitScript(SEED);
  await page.addInitScript(() => { try { if (!localStorage.getItem('mq.progress')) localStorage.setItem('mq.progress', JSON.stringify({ v: 2, onb: true, updatedAt: 1 })); } catch {} });
  const store = k => page.evaluate(k => { const v = window.__store.get(k); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }, k);
  const go = async (r, sel) => { await page.evaluate(r => { location.hash = r; }, r); if (sel) await page.waitForSelector(sel); await page.waitForTimeout(150); };
  const names = () => page.$$eval('.pod-name, .lrow .lname', els => els.map(e => e.textContent.trim()));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const shot = async n => { if (OUT) await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); };

  await page.goto(BASE + '#home');
  await page.waitForSelector('.dash .next');
  const keys = await page.evaluate(() => window.__keys);
  step('week keys: ' + JSON.stringify(keys));

  // 1. Leaderboard shows other students as plain names + points; no links into profiles.
  await go('leaders', '.podium, .lb-list');
  let n = await names();
  step('this week: ' + n.join(', '));
  check(n.includes('Ravi') && n.includes('BadName') && !n.includes('Meena'), 'this week lists Ravi and BadName, not Meena (no points this week)');
  check((await page.$$('.podium a, .lb-list a, .podium button, .lb-list button')).length === 0, 'no links or buttons on leaderboard rows (no profile access)');
  await page.click('.pod-name');
  check(await page.evaluate(() => location.hash) === '#leaders', 'tapping a name does not navigate anywhere');
  await page.click('[data-act="lb-tab"][data-v="lastweek"]');
  n = await names();
  check(n[0] === 'Meena' && n.includes('Ravi'), 'last week: Meena first, Ravi listed → ' + n.join(', '));
  await shot('lb-lastweek');

  // 2. Points for a first answer, none for repeating the same question the same day.
  await go('subject/history', '[data-s="history"]');
  await page.click('[data-act="start-subject"][data-s="history"]');
  await page.waitForSelector('.qtext');
  const qtext = (await page.textContent('.qtext')).trim();
  await page.click('.opt >> nth=0');
  await page.waitForSelector('.explain');
  const okText = (await page.textContent('.opt.ok .txt')).trim();
  const firstRight = await page.$eval('.opt >> nth=0', el => el.classList.contains('ok'));
  const pop = (await page.textContent('.explain .pts-pop')).trim();
  step(`first answer ${firstRight ? 'right' : 'wrong'} → ${pop}`);
  check(pop.startsWith(firstRight ? '+10' : '+1'), 'points shown for the first answer');
  await go('subject/history', '[data-act="search-open"]');
  await page.click('[data-act="search-open"]');
  await page.fill('#q-search', qtext.slice(0, 18));
  await page.waitForSelector('#search-results .row');
  await page.click('#search-results .row >> nth=0');
  await page.waitForSelector('.qtext');
  check((await page.textContent('.qtext')).trim() === qtext, 'search reopened the same question');
  await page.click(`.opt:has-text("${okText.replace(/"/g, '\\"')}")`);
  await page.waitForSelector('.explain');
  check((await page.$$('.explain .pts-pop')).length === 0, 'no points for the same question again today');
  await page.waitForTimeout(3200);
  const prog = await store('data/users/u_test1/progress');
  const lbMe = await store('lb/u_test1');
  step(`progress pts.total=${prog && prog.pts.total} · lb doc=${JSON.stringify(lbMe)}`);
  check(prog && prog.pts.total === (firstRight ? 10 : 1), 'points saved in private progress');
  check(lbMe && lbMe.wp === prog.pts.total && lbMe.wk === keys.wk && Object.keys(lbMe).sort().join() === 'at,mo,mp,n,pm,pmp,pw,pwp,tp,wk,wp', 'leaderboard doc holds only name + point totals');

  // 3. Language switch: whole UI and content in English, remembered in progress.
  await go('profile', '[data-act="set-lang"][data-v="en"]');
  await page.click('[data-act="set-lang"][data-v="en"]');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.documentElement.lang) === 'en', '<html lang> = en');
  check((await page.textContent('.appbar h1')).trim() === 'Profile & settings', 'profile title in English');
  check((await page.$$eval('.bnav a span', els => els.map(e => e.textContent).join('|'))) === 'Home|Learn|Compete|Progress', 'bottom nav in English');
  for (const r of ['home', 'learn', 'subject/history', 'chapter/h-mod', 'revise', 'compete', 'builder', 'progress', 'ca', 'today', 'mock', 'leaders', 'bookmarks']) {
    await go(r, '#app main');
    const t = await page.evaluate(() => { const a = document.querySelector('#app').cloneNode(true); a.querySelectorAll('.lang-btn, [data-act="set-lang"]').forEach(b => b.remove()); return a.innerText; });
    const hit = (t.match(/[^\n]*[ऀ-ॿ][^\n]*/) || [''])[0];
    check(!DEV.test(t), `#${r} has no Hindi text in English mode${hit ? ' → "' + hit.slice(0, 80) + '"' : ''}`);
    check(!(await overflow()), `#${r} fits 360px in English`);
  }
  await page.waitForTimeout(1800);
  check(((await store('data/users/u_test1/progress')) || {}).set.lang === 'en', 'language saved with the learner\'s progress');
  await go('subject/polity', '[data-s="polity"]');
  await page.click('[data-act="start-subject"][data-s="polity"]');
  await page.waitForSelector('.qtext');
  check(!DEV.test(await page.textContent('.qtext')) && !DEV.test(await page.textContent('.opts')), 'question and options in English');
  await page.click('.opt >> nth=1');
  await page.waitForSelector('.explain');
  await page.click('.lang-btn');
  await page.waitForTimeout(150);
  check(DEV.test(await page.textContent('.qtext')) && (await page.$('.explain')) !== null, 'quick switch to Hindi keeps the answer and explanation');
  await page.click('.lang-btn');
  await page.waitForTimeout(150);
  check(!DEV.test(await page.textContent('.explain p')), 'explanation back in English');
  await shot('play-en');

  // 4. Display name and hiding from the leaderboard.
  await go('profile', '#lb-name');
  await page.fill('#lb-name', 'Asha K');
  await page.click('form[data-form="lbname"] button[type="submit"]');
  await page.waitForTimeout(3000);
  check(((await store('lb/u_test1')) || {}).n === 'Asha K', 'display name published to the leaderboard');
  await page.click('[data-act="lb-hide"]');
  await page.waitForTimeout(3000);
  check((await store('lb/u_test1')) === null, 'hiding removes my leaderboard entry');
  await go('leaders', '.podium, .lb-list');
  check((await page.$$('.lrow.me, .pod.me')).length === 0, 'my row is not shown while hidden');
  await go('profile', '[data-act="lb-hide"]');
  await page.click('[data-act="lb-hide"]');
  await page.waitForTimeout(3000);
  check(((await store('lb/u_test1')) || {}).n === 'Asha K', 'showing again restores my entry');

  // 5. Admin: prizes, winners, moderation.
  await go('admin-rewards', '#pz-week');
  await page.fill('#pz-week', 'टॉप 3 को ₹100 का कैशबैक');
  await page.fill('#pz-week-en', '₹100 cashback for the top 3');
  await page.click('form[data-form="prizes"] button[type="submit"]');
  await page.waitForTimeout(300);
  const rw = await store('pub/settings/items/rewards');
  check(rw && rw.weekPrizeEn === '₹100 cashback for the top 3' && rw.weekPrize.startsWith('टॉप 3'), 'prize settings saved');
  await go('leaders', '.lb-head');
  await page.click('[data-act="lb-tab"][data-v="week"]');
  check((await page.textContent('.lb-head .prize-line')).includes('₹100 cashback for the top 3'), 'prize shown on the leaderboard (English)');
  await go('admin-rewards', '[data-act="announce-ask"][data-v="week"]');
  await page.click('[data-act="announce-ask"][data-v="week"]');
  await page.waitForSelector('.sheet [data-act="confirm-ok"]');
  await page.click('.sheet [data-act="confirm-ok"]');
  await page.waitForTimeout(300);
  const win = await store('pub/winners/items/w-' + keys.lw);
  step('winners doc: ' + JSON.stringify(win && { kind: win.kind, key: win.key, top: win.top.map(x => x.n + ':' + x.p), prizeEn: win.prizeEn }));
  check(win && win.kind === 'week' && win.top[0].n === 'Meena' && win.top.every(x => Object.keys(x).sort().join() === 'n,p,u'), 'winners stored with names and points only');
  await go('leaders', '.seg-4');
  await page.click('[data-act="lb-tab"][data-v="winners"]');
  check((await page.textContent('.win-card')).includes('Meena'), 'winners tab lists the announced winners');
  await shot('lb-winners');
  await go('admin-rewards', '[data-act="lb-mod"][data-u="u_bad"]');
  await page.click('[data-act="lb-mod"][data-u="u_bad"][data-v="1"]');
  await page.waitForTimeout(300);
  check((((await store('pub/settings/items/lbhide')) || {}).uids || []).includes('u_bad'), 'moderation list saved');
  await go('leaders', '.seg-4');
  await page.click('[data-act="lb-tab"][data-v="week"]');
  n = await names();
  check(!n.includes('BadName') && n.includes('Ravi'), 'hidden name removed from the board → ' + n.join(', '));
  check(!(await overflow()), '#leaders fits 360px with data');
  await shot('lb-week-en');

  // 6. Points history and badges in Profile.
  await go('progress', '[data-act="pts-history"]');
  await page.click('[data-act="pts-history"]');
  await page.waitForSelector('.sheet .earn li');
  check((await page.$$('.sheet .earn li')).length >= 1, 'points history lists entries');
  await page.click('.sheet [data-act="sheet-close"]');
  check((await page.$$('.bdg.got')).length >= 1, 'first badge earned');
  check(!(await overflow()), '#profile fits 360px');

  await browser.close();
  console.log(`\nERRORS (${errors.length}):` + (errors.length ? '\n  ' + errors.join('\n  ') : ''));
  console.log(fails ? `V2 CHECKS: ${fails} failed` : 'V2 CHECKS: all passed');
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e.message.split('\n')[0]); process.exit(1); });
