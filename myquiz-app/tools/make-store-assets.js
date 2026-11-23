// Builds the Google Play listing images into store/: a 1024x500 feature graphic and 1080x1920 captioned phone
// JPEG screenshots in Hindi (store/screenshots/hi) and English (store/screenshots/en); store/raw keeps the captures.
// Usage: serve the app (python3 -m http.server 8765 --bind 127.0.0.1) and run: node tools/make-store-assets.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/index.html';
const OUT = path.join(__dirname, '..', 'store');
const W = 390, H = 760;   // the phone screen captured, in CSS pixels (2x)

const CAPTIONS = {
  home: ['रोज़ कुछ नया सीखें — हिंदी में', 'Learn something new every day'],
  learn: ['हर विषय, अध्याय-वार अभ्यास', 'Every subject, chapter by chapter'],
  quiz: ['हर उत्तर की पूरी व्याख्या', 'A full explanation for every answer'],
  result: ['स्कोर देखें, पॉइंट्स कमाएँ', 'See your score, earn points'],
  ca: ['रोज़ की करेंट अफेयर्स', 'Daily current affairs'],
  today: ['आज का दिन: इतिहास में आज', 'This day in history'],
  dark: ['हिंदी या English, लाइट या डार्क', 'Hindi or English, light or dark'],
};
const SUB = {
  home: ['रोज़ की चुनौती, स्ट्रीक और पॉइंट्स', 'Daily challenge, streaks and points'],
  learn: ['इतिहास, भूगोल, संविधान, विज्ञान, खेल और अधिक', 'History, geography, polity, science, sports and more'],
  quiz: ['गलत विकल्प क्यों गलत हैं — वह भी', 'Including why the other options are wrong'],
  result: ['साप्ताहिक और मासिक लीडरबोर्ड', 'Weekly and monthly leaderboards'],
  ca: ['परीक्षा के तथ्य और क्विज़ के साथ', 'With exam facts and a quiz'],
  today: ['महत्वपूर्ण दिवस और उनसे जुड़े प्रश्न', 'Important days and their questions'],
  dark: ['आँखों के लिए आरामदायक', 'Easy on the eyes, day and night'],
};

const shot = async (page, file) => { const b = await page.screenshot({ type: 'png' }); fs.writeFileSync(file, b); return b; };
const answerRight = async p => {
  const want = await p.evaluate(async () => { const s = JSON.parse(localStorage.getItem('mq.sess') || 'null'); const qt = document.querySelector('.qtext').textContent.trim(); const all = await (await fetch('data/questions.json')).json(); const q = all.find(x => (s && x.id === s.ids[s.i]) || x.q.trim() === qt || (x.en && x.en.q.trim() === qt)); if (!q) return null; return [q.o[q.a], q.en ? q.en.o[q.a] : q.o[q.a]]; });
  for (const o of await p.$$('.opt')) { const t = await o.textContent(); if (want && (t.includes(want[0]) || t.includes(want[1]))) { await o.click(); return; } }
  await p.click('.opt[data-i="0"]');
};
const quiet = async p => { await p.waitForFunction(() => !document.querySelector('#toast-root .toast'), null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(250); };

async function captureScreens(browser, lang) {
  const dir = path.join(OUT, 'raw', lang); fs.mkdirSync(dir, { recursive: true });
  const mk = async scheme => {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.addInitScript(l => { try { if (!localStorage.getItem('mq.progress')) localStorage.setItem('mq.progress', JSON.stringify({ v: 2, name: l === 'hi' ? 'आशा' : 'Asha', onb: 1, exam: 'ssc', set: { lang: l, scale: 1, theme: 'system', mode: 'practice', count: 10 }, updatedAt: 1 })); } catch {} }, lang);
    return [ctx, p];
  };
  let [ctx, p] = await mk('light');
  await p.goto(BASE + '#subject/history'); await p.waitForSelector('[data-act="start-subject"]');
  await p.click('[data-act="start-subject"]');
  for (let i = 0; i < 30; i++) {
    await p.waitForSelector('.qtext');
    await answerRight(p);
    if (i === 1) { await p.waitForTimeout(600); await p.evaluate(() => window.scrollTo(0, 0)); await quiet(p); await shot(p, path.join(dir, 'quiz.png')); }
    const last = await p.$eval('[data-act="next-q"]', e => /परिणाम|result/i.test(e.textContent));
    await p.click('[data-act="next-q"]');
    if (last) break;
  }
  await p.waitForSelector('.result-hero'); await p.waitForTimeout(650); await shot(p, path.join(dir, 'result.png'));
  await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(900); await quiet(p); await shot(p, path.join(dir, 'home.png'));
  await p.evaluate(() => { location.hash = 'learn'; }); await p.waitForTimeout(800); await p.evaluate(() => window.scrollTo(0, 230)); await p.waitForTimeout(300); await shot(p, path.join(dir, 'learn.png'));
  await p.evaluate(() => { location.hash = 'ca'; }); await p.waitForTimeout(800); await p.evaluate(() => { const n = document.querySelector('.news'); if (n) window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - 150); }); await p.waitForTimeout(300); await shot(p, path.join(dir, 'ca.png'));
  await p.evaluate(() => { location.hash = 'today'; }); await p.waitForTimeout(700);
  if (!(await p.$('.daycard .day-art'))) { const nx = await p.$('main .btn-navy'); if (nx) { await nx.click(); await p.waitForTimeout(800); } }
  await shot(p, path.join(dir, 'today.png'));
  const progress = await p.evaluate(() => localStorage.getItem('mq.progress'));
  await ctx.close();
  [ctx, p] = await mk('dark');
  await p.addInitScript(v => { try { localStorage.setItem('mq.progress', v); } catch {} }, progress);
  await p.goto(BASE + '#home'); await p.waitForTimeout(1200); await quiet(p); await shot(p, path.join(dir, 'dark.png'));
  await ctx.close();
  return dir;
}

const dataUri = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap">';
const BG = 'linear-gradient(160deg,#0A2A66 0%,#1D3C93 52%,#3A32C4 100%)';

function frameHtml(img, title, sub) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
  body{background:${BG};font-family:'Baloo 2','Noto Sans Devanagari',sans-serif;color:#fff;position:relative}
  .glow1{position:absolute;width:760px;height:760px;right:-260px;top:-300px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,199,39,.38),transparent)}
  .glow2{position:absolute;width:700px;height:700px;left:-300px;bottom:-280px;border-radius:50%;background:radial-gradient(closest-side,rgba(56,189,248,.32),transparent)}
  h1{position:absolute;left:80px;right:80px;top:96px;margin:0;text-align:center;font-size:74px;line-height:1.15;font-weight:800}
  p{position:absolute;left:80px;right:80px;top:300px;margin:0;text-align:center;font-size:40px;line-height:1.3;font-weight:600;color:rgba(255,255,255,.88)}
  .phone{position:absolute;left:170px;top:430px;width:740px;height:1442px;border-radius:64px;background:#0B1020;padding:14px;box-shadow:0 40px 80px -20px rgba(0,0,0,.55)}
  .phone img{width:712px;height:1388px;border-radius:52px;display:block;object-fit:cover;object-position:top}
  </style></head><body><div class="glow1"></div><div class="glow2"></div><h1>${title}</h1><p>${sub}</p><div class="phone"><img src="${img}"></div></body></html>`;
}
function featureHtml(img, lang) {
  const t = lang === 'hi' ? ['सामान्य ज्ञान, अब हिंदी में आसान', 'रोज़ क्विज़ · करेंट अफेयर्स · मॉक टेस्ट'] : ['Easy GK in Hindi & English', 'Daily quiz · Current affairs · Mock tests'];
  const tile = (g, d) => `<span style="background:${g}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  html,body{margin:0;width:1024px;height:500px;overflow:hidden}
  body{background:${BG};font-family:'Baloo 2','Noto Sans Devanagari',sans-serif;color:#fff;position:relative}
  .glow1{position:absolute;width:520px;height:520px;right:120px;top:-260px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,199,39,.35),transparent)}
  .glow2{position:absolute;width:480px;height:480px;left:-200px;bottom:-260px;border-radius:50%;background:radial-gradient(closest-side,rgba(56,189,248,.32),transparent)}
  .logo{position:absolute;left:72px;top:84px;display:flex;align-items:center;gap:18px;font-size:86px;font-weight:800;line-height:1}
  .logo svg{width:92px;height:92px}
  .q{color:#FFC727}
  .copy{position:absolute;left:72px;top:200px;width:560px}
  h2{margin:0;font-size:40px;font-weight:700;line-height:1.2;white-space:nowrap}
  .sub{margin-top:8px;font-size:26px;font-weight:600;color:rgba(255,255,255,.86);white-space:nowrap}
  .tiles{position:absolute;left:72px;top:338px;display:flex;gap:16px}
  .tiles span{width:76px;height:76px;border-radius:20px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25),0 12px 20px -12px rgba(0,0,0,.6)}
  .tiles svg{width:40px;height:40px}
  .phone{position:absolute;right:72px;top:46px;width:292px;height:570px;border-radius:40px;background:#0B1020;padding:9px;box-shadow:0 30px 60px -20px rgba(0,0,0,.6);transform:rotate(4deg)}
  .phone img{width:274px;height:552px;border-radius:32px;display:block;object-fit:cover;object-position:top}
  </style></head><body><div class="glow1"></div><div class="glow2"></div>
  <div class="logo"><svg viewBox="0 0 48 48"><path d="M24 7 1.5 17.5 24 28l22.5-10.5z" fill="#FFC727"/><path d="M10 22.6V32c0 3.9 6.3 7 14 7s14-3.1 14-7v-9.4L24 29z" fill="#FFC727"/><rect x="41.6" y="18.6" width="2.4" height="13" rx="1.2" fill="#FFC727"/></svg><span>MY <span class="q">QUIZ</span></span></div>
  <div class="copy"><h2>${t[0]}</h2><div class="sub">${t[1]}</div></div>
  <div class="tiles">${tile('linear-gradient(140deg,#4F8DF9,#1D4ED8)', '<path d="M12 5a3 3 0 1 0-6 .1 4 4 0 0 0-2.5 5.8 4 4 0 0 0 .5 6.6A4 4 0 1 0 12 18z"/><path d="M12 5a3 3 0 1 1 6 .1 4 4 0 0 1 2.5 5.8 4 4 0 0 1-.5 6.6A4 4 0 1 1 12 18z"/>')}${tile('linear-gradient(140deg,#18A04F,#0B7A43)', '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')}${tile('linear-gradient(140deg,#F26A12,#C2410C)', '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>')}${tile('linear-gradient(140deg,#9B6BFA,#6425D0)', '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>')}</div>
  <div class="phone"><img src="${img}"></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  for (const lang of ['hi', 'en']) {
    const raw = process.env.ONLY === 'feature' ? path.join(OUT, 'raw', lang) : await captureScreens(browser, lang);
    const dir = path.join(OUT, 'screenshots', lang); fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    let n = 0;
    if (process.env.ONLY !== 'feature') for (const k of ['home', 'learn', 'quiz', 'result', 'ca', 'today', 'dark']) {
      const i = lang === 'hi' ? 0 : 1;
      await page.setContent(frameHtml(dataUri(path.join(raw, k + '.png')), CAPTIONS[k][i], SUB[k][i]), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(dir, `${String(++n).padStart(2, '0')}-${k}.jpg`), type: 'jpeg', quality: 92 });
    }
    await page.close();
    const fg = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    await fg.setContent(featureHtml(dataUri(path.join(raw, 'home.png')), lang), { waitUntil: 'networkidle' });
    await fg.evaluate(() => document.fonts.ready);
    await fg.screenshot({ path: path.join(OUT, `feature-graphic-${lang}.png`) });
    await fg.close();
  }
  await browser.close();
  console.log('store assets written to', OUT);
})().catch(e => { console.error(e); process.exit(1); });
