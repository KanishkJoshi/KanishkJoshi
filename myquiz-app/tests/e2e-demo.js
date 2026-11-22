// Tester-build (demo) tests: standalone ?demo=1, then artifact mode with a mocked runtime.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:8765/index.html';
const errors = [];
const step = m => console.log('•', m);
const shot = async (page, name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${name}.png` }); };

(async () => {
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || process.env.https_proxy, bypass: '127.0.0.1,localhost' } });

  // ── A. standalone ?demo=1 ──
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8765' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('A console: ' + m.text()); });
  page.on('pageerror', e => errors.push('A pageerror: ' + e.message));
  await page.goto(BASE + '?demo=1#home', { waitUntil: 'networkidle' });
  await page.waitForSelector('.demo-strip');
  step('strip: ' + (await page.textContent('.demo-strip')).replace(/\s+/g, ' ').trim());
  await shot(page, 'd1-home-demo');
  // sticky offsets: scroll a long page and check the appbar sits below the strip
  await page.goto(BASE + '?demo=1#learn'); await page.waitForSelector('.appbar');
  await page.evaluate(() => window.scrollTo(0, 400)); await page.waitForTimeout(150);
  const tops = await page.evaluate(() => ({ strip: document.querySelector('#demo-root').getBoundingClientRect().top, bar: document.querySelector('.appbar').getBoundingClientRect().top, stripH: document.querySelector('#demo-root').getBoundingClientRect().height }));
  step(`sticky: strip top ${tops.strip}, appbar top ${tops.bar}, strip height ${tops.stripH}`);
  // test hub
  await page.goto(BASE + '?demo=1#test'); await page.waitForSelector('.tcase');
  await page.fill('#t-name', 'प्रिया');
  step('cases: ' + (await page.$$('.tcase')).length);
  await page.click('.tcase[data-tc="T01"] summary');
  await page.click('[data-act="tc-pass"][data-id="T01"]');
  await page.waitForTimeout(200);
  step('after pass, open case: ' + await page.getAttribute('.tcase[open]', 'data-tc') + ' | strip: ' + (await page.textContent('.demo-btn[href="#test"]')).trim());
  await shot(page, 'd2-test-hub');
  // fail → bug form from a test case
  await page.click('[data-act="tc-fail"][data-id="T02"]');
  await page.waitForSelector('form[data-form="bug"]');
  await page.click('[data-act="bug-sev"][data-v="critical"]');
  await page.fill('#bg-what', 'दैनिक क्विज में 5वें प्रश्न के बाद स्क्रीन ख़ाली हो गई।');
  await page.fill('#bg-exp', 'अगला प्रश्न खुलना चाहिए था।');
  await shot(page, 'd3-bug-form');
  await page.click('form[data-form="bug"] button[type="submit"]');
  await page.waitForSelector('[data-act="bug-wa"]');
  const wa = await page.getAttribute('.sheet [data-act="bug-wa"]', 'href');
  step('WA link ok: ' + wa.startsWith('https://wa.me/?text=') + ' | decoded starts: ' + decodeURIComponent(wa.split('text=')[1]).split('\n')[0]);
  await shot(page, 'd4-bug-sent');
  await page.click('.sheet [data-act="bug-copy"]'); await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => 'n/a'));
  step('clipboard has report: ' + clip.includes('टेस्टर: प्रिया') + ' | screen line: ' + (clip.split('\n').find(l => l.startsWith('स्क्रीन')) || ''));
  await page.keyboard.press('Escape');
  // bug from the strip while playing a quiz (context should name the question)
  await page.goto(BASE + '?demo=1#subject/history'); await page.click('[data-act="start-subject"][data-s="history"]'); await page.waitForSelector('.qtext');
  await page.click('.demo-strip [data-act="bug-open"]'); await page.waitForSelector('form[data-form="bug"]');
  step('play context: ' + (await page.textContent('.sheet .note b')).slice(0, 60));
  await page.fill('#bg-title', 'परीक्षण'); await page.fill('#bg-what', 'केवल परीक्षण के लिए रिपोर्ट');
  await page.click('form[data-form="bug"] button[type="submit"]'); await page.waitForSelector('[data-act="bug-wa"]');
  await page.keyboard.press('Escape');
  // full report
  await page.goto(BASE + '?demo=1#test'); await page.waitForSelector('[data-act="report-wa"]');
  await page.click('[data-act="report-copy"]'); await page.waitForTimeout(200);
  const full = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  step('full report first lines: ' + full.split('\n').slice(0, 5).join(' | '));
  step('bugs listed: ' + (await page.$$('.list .review-item')).length + ' | T02 state: ' + (await page.textContent('.tcase[data-tc="T02"] .tc-st')));
  // admin works locally with seeded example drafts
  await page.goto(BASE + '?demo=1#admin-review'); await page.waitForSelector('.draft');
  step('seeded drafts in review: ' + (await page.$$('article.draft')).length + ' | demo note: ' + (await page.textContent('.note')).slice(0, 25));
  // a JS error is captured and flagged on the strip
  await page.evaluate(() => setTimeout(() => { throw new Error('simulated tester-visible error'); }, 0)); await page.waitForTimeout(200);
  step('error dot shown: ' + !!(await page.$('.demo-dot')));
  // reset keeps bugs, clears progress
  await page.goto(BASE + '?demo=1#test'); await page.click('[data-act="demo-reset-ask"]'); await page.click('[data-act="confirm-ok"]'); await page.waitForTimeout(300);
  step('after reset → route: ' + (await page.evaluate(() => location.hash)) + ' | progress answers: ' + await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mq.progress') || '{"ans":{}}').ans || {}).length) + ' | bugs kept: ' + await page.evaluate(() => JSON.parse(localStorage.getItem('mq.test.bugs') || '[]').length));
  // dark + overflow across routes at 360px
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 360, height: 760 });
  for (const r of ['home', 'quiz', 'ca', 'today', 'mock', 'bookmarks', 'profile', 'test', 'admin']) {
    await page.goto(BASE + '?demo=1#' + r); await page.waitForTimeout(200);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 0) errors.push(`overflow ${ov}px on #${r}`);
  }
  await page.goto(BASE + '?demo=1#test'); await shot(page, 'd5-test-dark-360');
  errors.splice(0, errors.length, ...errors.filter(e => !e.includes('simulated tester-visible error')));
  await ctx.close();

  // ── B. artifact mode (mocked runtime) with demo config ──
  const mockSrc = fs.readFileSync(__dirname + '/e2e-artifact.js', 'utf8');
  const MOCK = eval('(' + mockSrc.slice(mockSrc.indexOf('const MOCK = () => {') + 'const MOCK = '.length, mockSrc.indexOf('\n};\n', mockSrc.indexOf('const MOCK = () => {')) + 2) + ')');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx2.addInitScript(() => { window.MYQUIZ_CONFIG = { demo: true, build: 'Demo test' }; });
  await ctx2.addInitScript(MOCK);
  const p2 = await ctx2.newPage();
  p2.on('console', m => { if (m.type() === 'error') errors.push('B console: ' + m.text()); });
  p2.on('pageerror', e => errors.push('B pageerror: ' + e.message));
  await p2.goto(BASE + '#home', { waitUntil: 'networkidle' }); await p2.waitForSelector('.demo-strip'); await p2.waitForTimeout(300);
  if (await p2.$('.onb-page')) { await p2.click('[data-act="wz-finish"]'); await p2.waitForSelector('.dash .next'); }
  // learner activity + admin publish must stay local
  await p2.click('[data-act="start-daily"]'); await p2.waitForSelector('.opt'); await (await p2.$$('.opt'))[0].click(); await p2.waitForTimeout(1800);
  await p2.goto(BASE + '#admin-review'); await p2.waitForSelector('article.draft');
  const id = await p2.getAttribute('article.draft [data-act="draft-approve"]', 'data-id');
  for (let c = 0; c < 3; c++) await p2.check(`input[data-chk="${id}"][data-ci="${c}"]`);
  await p2.click(`#ap-${id}`); await p2.waitForTimeout(200);
  await p2.goto(BASE + '#admin-publish'); await p2.click('form[data-form="publish"] button[type="submit"]'); await p2.waitForTimeout(300);
  const keys = await p2.evaluate(() => [...window.__store.keys()]);
  step('db keys after learner+admin activity (should be none): ' + JSON.stringify(keys));
  // a bug report reaches the shared inbox
  await p2.goto(BASE + '#test'); await p2.waitForSelector('#t-name'); await p2.fill('#t-name', 'अमित');
  await p2.click('.tcase[data-tc="T01"] summary'); await p2.click('[data-act="tc-pass"][data-id="T01"]');
  await p2.click('.demo-strip [data-act="bug-open"]'); await p2.fill('#bg-title', 'इनबॉक्स परीक्षण'); await p2.fill('#bg-what', 'यह रिपोर्ट इनबॉक्स में जानी चाहिए');
  await p2.click('form[data-form="bug"] button[type="submit"]'); await p2.waitForTimeout(1800);
  const fb = await p2.evaluate(() => window.__store.get('feedback/u_test1'));
  step('feedback doc: name=' + (fb && fb.name) + ' items=' + (fb && fb.items.length) + ' results=' + (fb && JSON.stringify(fb.results)));
  await p2.keyboard.press('Escape');
  await p2.goto(BASE + '#test-inbox'); await p2.waitForTimeout(300);
  step('owner inbox cards: ' + (await p2.$$('main section.card')).length + ' | first bug: ' + (await p2.textContent('main .review-item b')));
  await shot(p2, 'd6-inbox');
  console.log('\nERRORS (' + errors.length + '):\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
