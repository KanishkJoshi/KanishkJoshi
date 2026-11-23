// AdSense placement (self-hosted app): one unit below the content on reading screens, never on quiz screens,
// not re-requested when the same screen re-renders, and off without a config or in the tester build.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const errors = [];
let fails = 0;
const check = (ok, m) => { if (!ok) fails++; console.log(ok ? '  ✔' : '  ✘ FAIL', m); };
const ADS = "window.MYQUIZ_CONFIG = Object.assign({ adsense: { client: 'ca-pub-1234567890123456', slot: '1234567890' } }, window.MYQUIZ_CONFIG || {});";
const seed = () => { try { localStorage.setItem('mq.progress', JSON.stringify({ v: 2, name: 'Asha', onb: 1, set: { lang: 'en' }, updatedAt: 1 })); } catch {} };

(async () => {
  const browser = await chromium.launch();
  const open = async (config, url) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    if (config) await ctx.route('**/config.js', r => r.fulfill({ contentType: 'application/javascript', body: config }));
    await ctx.route(/pagead2\.googlesyndication\.com/, r => r.fulfill({ contentType: 'application/javascript', body: '/* ad script stand-in */' }));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(seed);
    await page.goto(url);
    await page.waitForSelector('.dash .next');
    return [ctx, page];
  };
  const requests = page => page.evaluate(() => (window.adsbygoogle || []).length);
  const go = async (page, r) => { await page.evaluate(r => { location.hash = r; }, r); await page.waitForTimeout(300); };

  // 1. Configured: home shows one unit below the content, labelled as an advertisement
  let [ctx, page] = await open(ADS, BASE + '#home');
  await page.waitForSelector('#ad-root ins.adsbygoogle', { state: 'attached' });   // empty until Google fills it
  check(await page.$eval('#ad-root ins', e => e.dataset.adClient === 'ca-pub-1234567890123456' && e.dataset.adSlot === '1234567890'), 'home shows the configured ad unit');
  check((await page.textContent('#ad-root .ad-label')).trim() === 'Advertisement', 'the unit is labelled "Advertisement"');
  check(await page.$eval('#app', a => a.classList.contains('has-ad') && a.nextElementSibling.id === 'ad-root'), 'the unit sits after the page content, outside the re-rendered area');
  const first = await requests(page);
  await page.evaluate(() => { document.querySelector('#ad-root ins').dataset.mark = '1'; });
  await page.click('[data-act="notifs"]').catch(() => {});
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));   // forces a same-screen re-render
  await page.waitForTimeout(300);
  check(await requests(page) === first && await page.$eval('#ad-root ins', e => e.dataset.mark === '1'), 'a re-render of the same screen keeps the same ad (no new request)');
  await go(page, 'learn');
  check(await requests(page) === first + 1, 'moving to another screen requests a new ad');
  await go(page, 'subject/history');
  await page.click('[data-act="start-subject"]');
  await page.waitForSelector('.qtext');
  check(await page.$eval('#ad-root', e => e.hidden && !e.querySelector('ins')), 'no ad on the quiz screen');
  await go(page, 'profile');
  check(await page.$eval('#ad-root', e => e.hidden), 'no ad on the profile screen');
  await go(page, 'admin');
  check(await page.$eval('#ad-root', e => e.hidden), 'no ad on admin screens');
  await go(page, 'home');
  check(!(await page.$eval('#ad-root', e => e.hidden)) && !!(await page.$('#ad-root ins')), 'the ad comes back on home');
  check(await page.$$eval('script[src*="adsbygoogle.js"]', s => s.length === 1 && s[0].src.includes('client=ca-pub-1234567890123456')), 'the AdSense script loads once, with the publisher ID');
  await ctx.close();

  // 2. No AdSense config: no ad area, no script
  [ctx, page] = await open(null, BASE + '#home');
  await page.waitForTimeout(400);
  check(!(await page.$('#ad-root')) && !(await page.$('script[src*="adsbygoogle"]')), 'without an AdSense config there are no ads');
  await ctx.close();

  // 3. Tester build: never shows ads, even with a config
  [ctx, page] = await open(ADS, BASE + '?demo=1#home');
  await page.waitForTimeout(400);
  check(!(await page.$('#ad-root ins')), 'the tester build shows no ads');
  await ctx.close();

  await browser.close();
  console.log(`\nERRORS (${errors.length}):` + (errors.length ? '\n  ' + [...new Set(errors)].join('\n  ') : ''));
  console.log(fails ? `ADS CHECKS: ${fails} failed` : 'ADS CHECKS: all passed');
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e.message.split('\n')[0]); process.exit(1); });
