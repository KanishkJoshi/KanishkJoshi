// v3 flows end to end (standalone build, fresh learner).
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const errors = [];
let fails = 0;
const step = m => console.log('•', m);
const check = (ok, m) => { if (!ok) fails++; console.log(ok ? '  ✔' : '  ✘ FAIL', m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { window.__copied = ''; try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch {} navigator.clipboard.writeText = async t => { window.__copied = t; }; });
  const go = async (r, sel) => { await page.evaluate(r => { location.hash = r; }, r); if (sel) await page.waitForSelector(sel); await page.waitForTimeout(120); };
  const answerAll = async n => { for (let i = 0; i < n; i++) { await page.click('.opt >> nth=0'); await page.waitForSelector('.explain'); await page.click('[data-act="next-q"]'); await page.waitForTimeout(40); } };
  const finishExam = async () => { await page.click('.opt >> nth=0'); await page.click('[data-act="exam-palette"]'); await page.click('[data-act="exam-submit-ask"]'); await page.click('[data-act="exam-submit"]'); await page.waitForSelector('.result-hero'); };

  // 1. Onboarding: English, exam, goal, level check
  await page.goto(BASE + '#home');
  await page.waitForSelector('.onb-page');
  check(await page.evaluate(() => location.hash) === '#welcome', 'first run opens onboarding');
  await page.click('[data-act="set-lang"][data-v="en"]');
  await page.fill('#wz-name', 'Meera');
  await page.click('[data-act="wz-next"]');
  await page.click('[data-act="wz-exam"][data-v="ssc"]'); await page.click('[data-act="wz-next"]');
  await page.click('[data-act="wz-goal"][data-v="20"]'); await page.click('[data-act="wz-next"]');
  await page.click('[data-act="start-assess"]');
  await page.waitForSelector('.qtext');
  await answerAll(5);
  await page.waitForSelector('.result-hero');
  const lvl = await page.textContent('.result-hero ~ .next h3, .card.next h3');
  step('level card: ' + lvl.trim());
  check(/Beginner|Intermediate|Advanced/.test(lvl), 'level check shows a level');
  await page.click('.card.next [data-act="nav"][data-to="home"]');
  await page.waitForSelector('.dash .next');
  check((await page.textContent('.welcome')).includes('SSC CGL'), 'home shows the chosen exam');
  check((await page.textContent('.dash .next .ringbox')).includes('20'), 'home shows the 20-question goal');

  // 2. Learn tree + rich explanation
  await go('learn', '.list .row');
  check((await page.$$('.list a.row[href^="#subject/"]')).length >= 6, 'learn lists subjects');
  await go('subject/polity', '.list a.row[href^="#chapter/"]');
  await go('chapter/p-rights', '[data-act="practice-ch"]');
  const nAll = (await page.$$('.qrow')).length;
  await page.click('[data-act="set-diff"][data-v="2"]');
  const nMid = (await page.$$('.qrow')).length;
  step(`chapter bank: all ${nAll}, intermediate ${nMid}`);
  check(nMid <= nAll, 'difficulty filter narrows the bank');
  await page.click('[data-act="set-diff"][data-v="0"]');
  await page.click('[data-act="practice-ch"]');
  await page.waitForSelector('.qtext');
  await page.click('.opt >> nth=0');
  await page.waitForSelector('.explain');
  const whyN = (await page.$$('.why-list li')).length;
  const secs = await page.$$eval('.ex-sec h4', els => els.map(e => e.textContent.trim()));
  step('explanation sections: ' + secs.join(' | '));
  check(whyN >= 3, 'explanation lists why the other options are wrong');
  check(secs.some(x => /Exam relevance/.test(x)) && secs.some(x => /Background/.test(x)), 'explanation has background and exam relevance');
  check(!!(await page.$('[data-act="practice-related"]')), 'related practice offered');
  await page.click('[data-act="back"]'); await page.click('[data-act="quit-now"]').catch(() => {});

  // 3. Exam mode from a chapter with time analysis
  await go('chapter/h-free', '[data-act="exam-pool"]');
  await page.click('[data-act="exam-pool"]');
  await page.waitForSelector('.exambar');
  check(!(await page.$('.explain')), 'exam mode shows no answer while answering');
  await finishExam();
  check((await page.textContent('main')).includes('Time analysis'), 'exam result has time analysis');

  // 4. Test builder with SSC-style marking
  await go('builder', '[data-act="bld-start"]');
  await page.click('[data-act="bld-s"][data-v="geography"]');
  await page.click('[data-act="bld-mk"][data-v="3"]');
  await page.click('[data-act="bld-n"][data-v="5"]');
  await page.click('[data-act="bld-start"]');
  await page.waitForSelector('.exambar');
  check((await page.textContent('.qmeta')).includes('+2 / −0.5'), 'builder applies +2/−0.5 marking');
  await finishExam();

  // 5. Weekly challenge: first attempt is official
  await go('compete', '[data-act="start-wchal"]');
  await page.click('[data-act="start-wchal"]');
  await page.waitForSelector('.exambar');
  await finishExam();
  check((await page.textContent('main')).includes('official weekly challenge score'), 'first weekly attempt is recorded');
  await go('compete', '[data-act="start-wchal"]');
  check((await page.textContent('main')).includes('Your score'), 'compete shows the weekly score');

  // 6. Friend challenge: create → code → accept → compare
  await page.click('[data-act="friend-new"]');
  await page.waitForSelector('.exambar');
  await finishExam();
  await page.click('[data-act="friend-share"]');
  const shared = await page.evaluate(() => window.__copied);
  const code = (shared.match(/[A-Za-z0-9_-]{40,}/) || [])[0];
  check(!!code, 'challenge text contains a code');
  await go('challenge/' + code, '[data-act="friend-accept"]');
  check((await page.textContent('main')).includes('challenged you'), 'challenge landing shows the friend\'s score');
  await page.click('[data-act="friend-accept"]');
  await page.waitForSelector('.exambar');
  await finishExam();
  check(/You won|tie|ahead/.test(await page.textContent('main')), 'result compares both scores');
  await go('challenge', '#ch-code');
  await page.fill('#ch-code', shared);
  await page.click('form[data-form="challenge-code"] button[type="submit"]');
  await page.waitForSelector('[data-act="friend-accept"]');
  check(true, 'pasting the whole message opens the challenge');

  // 7. Flashcards update the schedule
  await go('cards', '.fc');
  await page.click('[data-act="card-flip"]');
  await page.click('[data-act="card-grade"][data-v="1"]');
  check((await page.textContent('.fc-count')).startsWith('Card 2'), 'flashcards advance after grading');

  // 8. Current affairs article + notes, Aaj ka Din session
  await go('ca', '.seg');
  await page.click('[data-act="ca-tab"][data-v="archive"]');
  await page.waitForSelector('#ca-feed .news');
  await page.fill('#ca-search', 'solar');
  await page.waitForTimeout(150);
  check((await page.$$('#ca-feed .news')).length === 1, 'search narrows the feed (focus kept)');
  check(await page.evaluate(() => document.activeElement && document.activeElement.id === 'ca-search'), 'search box keeps focus while typing');
  await page.click('#ca-feed .news');
  await page.waitForSelector('.article h1');
  const art = await page.$$eval('.art-sec h2', els => els.map(e => e.textContent.trim()));
  step('article: ' + art.join(' | '));
  check(art.length >= 6 && art.some(x => /Why it matters/.test(x)) && art.some(x => /schemes/.test(x)), 'article has the exam-oriented sections');
  await page.click('.article a[href^="#ca-notes/"]');
  await page.waitForSelector('[data-act="print"]');
  check(true, 'PDF notes page opens');
  await go('today', '.daynav');
  await page.click('[data-act="today-five"]');
  await page.waitForSelector('.qtext');
  await answerAll(5);
  await page.waitForSelector('.result-hero');
  await go('today', '.daynav');
  check((await page.textContent('.card.next h3')).includes('Session done'), 'Aaj ka Din session is marked done');

  // 9. Progress analytics
  await go('progress', '.lvl');
  const ptxt = await page.textContent('main');
  check(/Level \d/.test(ptxt) && ptxt.includes('This week vs last') && ptxt.includes('Recent answers'), 'progress shows level, comparison and history');

  // 10. Admin: quality checks, import, export, history
  await go('admin-io', '#imp-text');
  await page.fill('#imp-text', 'id,subject,chapter,difficulty,question,A,B,C,D,answer,explanation\nimp1,science,sc-phy,2,What is the SI unit of force?,Newton,Joule,Watt,Pascal,A,The SI unit of force is the newton (N).');
  await page.click('[data-act="import-check"]');
  check((await page.textContent('main')).includes('1 valid questions'), 'CSV import is validated');
  await page.click('form[data-form="import"] button[type="submit"]');
  await page.waitForSelector('.draft');
  check((await page.textContent('main')).includes('SI unit of force'), 'imported question waits in review');
  check((await page.textContent('.draft')).includes('Automated checks') && (await page.textContent('.draft')).includes('No English translation'), 'drafts show automated checks (missing English flagged)');
  await go('admin-io', '[data-act="export"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"][data-v="csv"]')]);
  check(/myquiz-questions-.*\.csv$/.test(dl.suggestedFilename()), 'CSV export downloads');
  await go('admin-bank', '[data-act="bank-edit"]');
  await page.click('[data-act="bank-edit"] >> nth=0');
  await page.waitForSelector('#qe-ch');
  await page.fill('#qe-e', 'Edited explanation for the version history test, long enough.');
  await page.click('form[data-form="qedit"] button[type="submit"]');
  await go('admin-review', '.draft');
  const edited = page.locator('article.draft', { hasText: 'Edited explanation for the version history' });
  for (const cb of await edited.locator('input[data-chk]').all()) await cb.check();
  await edited.locator('[data-act="draft-approve"]').click();
  await go('admin-publish', 'form[data-form="publish"]');
  await page.click('form[data-form="publish"] button[type="submit"]');
  await page.waitForTimeout(300);
  const hist = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mq.cms.history') || '{}')).length);
  check(hist >= 1, 'publishing an edit stores the previous version');
  await go('admin-translate', 'main');
  check((await page.textContent('main')).includes('100%'), 'translation screen reports coverage');

  await browser.close();
  console.log(`\nERRORS (${errors.length}):` + (errors.length ? '\n  ' + [...new Set(errors)].join('\n  ') : ''));
  console.log(fails ? `V3 CHECKS: ${fails} failed` : 'V3 CHECKS: all passed');
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e.message.split('\n')[0]); process.exit(1); });
