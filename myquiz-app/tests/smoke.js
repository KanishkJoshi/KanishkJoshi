// Smoke test: every route in Hindi and English, light and dark, at 360px; reports page errors and overflow.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = process.argv[3] || '';
const routes = ['home', 'learn', 'subject/history', 'chapter/h-mod', 'chapter/d-intl', 'revise', 'cards', 'compete', 'builder', 'challenge', 'progress', 'notes/p-rights', 'news/n2611-isa', 'ca-notes/week', 'ca', 'admin-translate', 'admin-analytics', 'admin-io', 'today', 'mock', 'bookmarks', 'leaders', 'profile', 'welcome', 'admin', 'admin-ai', 'admin-review', 'admin-publish', 'admin-bank', 'admin-news', 'admin-days', 'admin-rewards'];
(async () => {
  const browser = await chromium.launch();
  let problems = 0;
  for (const scheme of ['light', 'dark']) {
    for (const lang of ['hi', 'en']) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, colorScheme: scheme, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errs.push('console: ' + m.text()); });
      await page.addInitScript(l => { try { localStorage.setItem('mq.progress', JSON.stringify({ v: 2, name: 'Asha', set: { lang: l, scale: 1, theme: 'system', mode: 'practice', count: 10 }, updatedAt: 1 })); } catch {} }, lang);
      await page.goto(BASE + '#home');
      await page.waitForSelector('.dash .next');
      for (const r of routes) {
        await page.evaluate(r => { location.hash = r; }, r);
        await page.waitForTimeout(250);
        const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, lang: document.documentElement.lang, hasMain: !!document.querySelector('#app main, #app .page'), text: document.querySelector('#app').innerText.slice(0, 80).replace(/\s+/g, ' ') }));
        const over = info.sw > info.cw + 1;
        if (over || !info.hasMain || info.lang !== lang) { problems++; console.log(`[${scheme}/${lang}] #${r} overflow=${over} (${info.sw}/${info.cw}) main=${info.hasMain} lang=${info.lang}`); }
        if (SHOTS && scheme === 'light') await page.screenshot({ path: `${SHOTS}/${lang}-${r}.png`, fullPage: true });
      }
      if (errs.length) { problems += errs.length; console.log(`[${scheme}/${lang}] errors:\n  ` + [...new Set(errs)].join('\n  ')); }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(problems ? `SMOKE: ${problems} problem(s)` : 'SMOKE: all routes OK in hi/en × light/dark at 360px');
})().catch(e => { console.error(e); process.exit(1); });
