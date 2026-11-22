// End-to-end smoke test for MY QUIZ (standalone mode) at phone size.
const { chromium } = require('playwright');
const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:8765/index.html';
const errors = [];
const shot = async (page, name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); };
const step = (msg) => console.log('•', msg);

(async () => {
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || process.env.https_proxy, bypass: '127.0.0.1,localhost' } });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'hi-IN', timezoneId: 'Asia/Kolkata' });
  const page = await ctx.newPage(); globalThis.__page = page;
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('requestfailed: ' + r.url()); });

  await page.goto(BASE + '#home', { waitUntil: 'networkidle' });
  await page.waitForSelector('.onb-page');
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate(() => document.fonts.check('16px "Noto Sans"') && document.fonts.check('16px "Noto Sans Devanagari"'));
  step('fonts loaded: ' + fontsOk);
  await shot(page, '01-home');

  // Onboarding (first run): language + name → exam → daily goal → skip the level check
  await page.fill('#wz-name', 'राहुल');
  await page.click('[data-act="wz-next"]');
  await page.click('[data-act="wz-exam"][data-v="ssc"]');
  await page.click('[data-act="wz-next"]');
  await page.click('[data-act="wz-goal"][data-v="10"]');
  await page.click('[data-act="wz-next"]');
  await shot(page, '01b-onboarding-level');
  await page.click('[data-act="wz-finish"]');
  await page.waitForSelector('.dash .next');
  step('greeting: ' + (await page.textContent('.welcome')).replace(/\s+/g, ' ').trim());

  // Daily quiz: answer all 10 (alternate first/second option), check explanation + result
  await page.click('[data-act="start-daily"]');
  await page.waitForSelector('.qtext');
  await shot(page, '02-play-unanswered');
  for (let i = 0; i < 10; i++) {
    const opts = await page.$$('.opt');
    await opts[i % 2].click();
    await page.waitForSelector('.explain');
    if (i === 0) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, '03-play-answered'); }
    if (i === 1) { await page.click('[data-act="bm-q"]'); }
    await page.click('[data-act="next-q"]');
  }
  await page.waitForSelector('.result-hero');
  await shot(page, '04-result');
  step('result: ' + (await page.textContent('.big-ring b')));

  // Subjects list
  await page.goto(BASE + '#subject/history'); await page.waitForSelector('[data-act="start-subject"]');
  await shot(page, '05-subjects');
  await page.click('[data-act="set-mode"][data-v="timed"]');
  await page.click('[data-act="start-subject"][data-s="history"]');
  await page.waitForSelector('#qtimer');
  await page.waitForTimeout(1300);
  step('timer: ' + (await page.textContent('#qtimer-v')));
  await shot(page, '06-play-timed');
  await page.click('.opt');
  await page.click('[data-act="back"]');
  await page.waitForSelector('.sheet');
  await shot(page, '07-quit-sheet');
  await page.click('[data-act="quit-now"]');
  await page.click('[data-act="set-mode"][data-v="practice"]');

  // Search
  await page.click('[data-act="search-open"]');
  await page.fill('#q-search', 'संविधान');
  await page.waitForTimeout(150);
  step('search results: ' + (await page.$$('#search-results .row')).length);
  await page.keyboard.press('Escape');

  // Current affairs
  await page.goto(BASE + '#ca'); await page.waitForSelector('.news');
  await shot(page, '08-ca');
  await page.click('.news');
  await page.waitForSelector('.article h1');
  await shot(page, '09-ca-detail');
  step('article sections: ' + (await page.$$eval('.art-sec h2', els => els.map(e => e.textContent.trim()).join(' | '))));
  await page.click('.article [data-act="bm-n"]');
  await page.click('[data-act="news-quiz"]');
  await page.waitForSelector('.qtext');
  step('news quiz title: ' + (await page.textContent('.appbar h1')));

  // Aaj ka din
  await page.goto(BASE + '#today'); await page.waitForSelector('.daycard, .card .empty'); if (!(await page.$('.daycard'))) { await page.click('.card [data-act="day-goto"]'); await page.waitForSelector('.daycard'); }
  await shot(page, '10-today');
  step('today title: ' + (await page.textContent('.day-title h2')));
  await page.click('[data-act="day-step"][data-v="1"]'); await page.click('[data-act="day-step"][data-v="1"]');
  step('+2 days: ' + (await page.textContent('.daynav .when')));
  await page.click('[data-act="day-calendar"]');
  await page.waitForSelector('.sheet');
  await page.click('[data-act="cal-month"][data-v="7"]');
  await page.click('.sheet [data-act="day-goto"]');
  step('calendar pick: ' + (await page.textContent('.day-title h2')));
  await page.click('[data-act="day-quiz"]');
  await page.waitForSelector('.qtext');

  // Mock exam
  await page.goto(BASE + '#mock'); await page.waitForSelector('[data-act="mock-intro"]');
  await shot(page, '11-mock');
  await page.click('[data-act="mock-intro"][data-id="gk-1"]');
  await page.check('#mock-agree');
  await page.click('#mock-start');
  await page.waitForSelector('.exambar');
  await shot(page, '12-exam');
  for (let i = 0; i < 8; i++) {
    const opts = await page.$$('.opt');
    await opts[i % 4].click();
    if (i === 3) await page.click('[data-act="exam-mark"]');
    else await page.click('[data-act="exam-next"]');
  }
  await page.click('[data-act="exam-palette"]');
  await page.waitForSelector('.pal');
  await shot(page, '13-palette');
  await page.click('[data-act="exam-submit-ask"]');
  await page.click('[data-act="exam-submit"]');
  await page.waitForSelector('.result-hero');
  await shot(page, '14-exam-result');
  step('exam score: ' + (await page.textContent('.big-ring b')));

  // Bookmarks + profile
  await page.goto(BASE + '#bookmarks'); await page.waitForSelector('.seg');
  step('bookmarks: ' + (await page.textContent('.seg')));
  await shot(page, '15-bookmarks');
  await page.goto(BASE + '#progress'); await page.waitForSelector('.week');
  await shot(page, '16-profile');

  // Report an error on a question
  await page.goto(BASE + '#subject/polity'); await page.click('[data-act="start-subject"][data-s="polity"]');
  await page.waitForSelector('.qtext');
  await page.click('[data-act="report-q"]');
  await page.fill('#rp-note', 'परीक्षण रिपोर्ट');
  await page.click('form[data-form="report"] button[type="submit"]');
  await page.waitForTimeout(200);

  // Admin pipeline (local demo mode)
  await page.goto(BASE + '#admin'); await page.waitForSelector('.stat3');
  await shot(page, '17-admin');
  await page.goto(BASE + '#admin-news'); await page.waitForSelector('#nf-title');
  await page.fill('#nf-title', 'परीक्षण: नया समाचार शीर्षक');
  await page.fill('#nf-summary', 'यह परीक्षण के लिए जोड़ा गया समाचार है जिसका सारांश बीस अक्षरों से लंबा है।');
  await page.fill('#nf-facts', 'तथ्य एक\nतथ्य दो');
  await page.click('form[data-form="news-new"] button[type="submit"]');
  await page.waitForTimeout(200);
  await page.goto(BASE + '#admin-bank'); await page.waitForSelector('[data-act="bank-new"]');
  await page.click('[data-act="bank-new"]');
  await page.fill('#qe-q', 'परीक्षण प्रश्न: भारत की राजधानी क्या है?');
  for (const [i, v] of ['मुंबई', 'नई दिल्ली', 'कोलकाता', 'चेन्नई'].entries()) await page.fill('#qe-o' + i, v);
  await page.check('input[name="qe-a"][value="1"]');
  await page.fill('#qe-e', 'नई दिल्ली भारत की राजधानी है।');
  await page.click('form[data-form="qedit"] button[type="submit"]');
  await page.waitForTimeout(200);
  await page.goto(BASE + '#admin-review'); await page.waitForSelector('.draft');
  await shot(page, '18-review');
  const drafts = await page.$$('article.draft');
  step('drafts in review: ' + drafts.length);
  for (let k = 0; k < drafts.length; k++) {
    const art = (await page.$$('article.draft'))[0];
    for (const cb of await art.$$('input[data-chk]')) await cb.check();
    await (await art.$('[data-act="draft-approve"]')).click();
    await page.waitForTimeout(150);
  }
  await page.click('[data-act="review-tab"][data-v="reports"]');
  step('reports: ' + (await page.$$('article.draft')).length);
  await page.goto(BASE + '#admin-publish'); await page.waitForSelector('form[data-form="publish"]');
  await shot(page, '19-publish');
  await page.click('form[data-form="publish"] button[type="submit"]');
  await page.waitForTimeout(300);
  step('live after publish: ' + (await page.$$('.list .row')).length);
  await page.goto(BASE + '#ca'); await page.waitForSelector('.news');
  step('CA first title: ' + (await page.textContent('.news .nt')));
  await page.goto(BASE + '#admin-ai'); await page.waitForSelector('#ai-text');
  await shot(page, '20-admin-ai');

  // Dark mode + large text
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(BASE + '#home'); await page.waitForSelector('.dash .next');
  await shot(page, '21-home-dark');
  await page.goto(BASE + '#compete'); await page.waitForSelector('[data-act="start-daily"]');
  await page.click('[data-act="start-daily"]'); await page.waitForSelector('.qtext');
  await (await page.$$('.opt'))[0].click(); await page.waitForSelector('.explain');
  await shot(page, '22-play-dark');
  await page.goto(BASE + '#today'); await page.waitForSelector('.daycard, .card .empty'); if (!(await page.$('.daycard'))) { await page.click('.card [data-act="day-goto"]'); await page.waitForSelector('.daycard'); }
  await shot(page, '23-today-dark');

  // Overflow check on every route at 360px wide
  await page.setViewportSize({ width: 360, height: 760 });
  for (const r of ['home', 'quiz', 'ca', 'today', 'mock', 'bookmarks', 'profile', 'admin', 'admin-ai', 'admin-review', 'admin-publish', 'admin-bank', 'admin-news', 'admin-days']) {
    await page.goto(BASE + '#' + r); await page.waitForTimeout(250);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 0) errors.push(`overflow ${ov}px on #${r}`);
  }
  console.log('\nERRORS (' + errors.length + '):\n' + errors.join('\n'));
  await browser.close();
})().catch(async e => { console.error('TEST CRASH', e.message.split('\n')[0]); try { const pg = globalThis.__page; if (pg) { console.log('URL', pg.url()); console.log((await pg.evaluate(() => document.querySelector('#app').innerText)).slice(0, 700)); } } catch (x) { console.log('dump failed', x.message); } process.exit(1); });
