// Artifact-mode test: injects an in-memory mock of window.claude (db, user, sample)
// that follows the documented contracts (frozen snapshots, async delivery, path parity).
const { chromium } = require('playwright');
const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:8765/index.html';
const errors = [];
const step = m => console.log('•', m);

const MOCK = () => {
  const store = new Map(); // path -> data
  const listeners = new Set(); // {coll, fn}
  const segs = p => p.split('/').filter(Boolean);
  const freeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  const snapDoc = (path) => { const d = store.get(path); return { id: segs(path).pop(), exists: d !== undefined, data: () => (d === undefined ? undefined : freeze(JSON.parse(JSON.stringify(d)))), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const collDocs = coll => [...store.keys()].filter(k => { const s = segs(k); return s.length === segs(coll).length + 1 && k.startsWith(coll + '/'); }).sort().map(snapDoc);
  const notify = () => { for (const l of listeners) { const docs = collDocs(l.coll); setTimeout(() => l.fn({ docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: () => [] }), 5); } };
  const docRef = path => {
    if (segs(path).length % 2) throw new TypeError('doc path must have even segments: ' + path);
    return {
      id: segs(path).pop(), path,
      get: async () => snapDoc(path),
      set: async data => { if (!data || typeof data !== 'object' || Array.isArray(data)) throw { code: 'invalid_argument' }; store.set(path, JSON.parse(JSON.stringify(data))); window.__writes = (window.__writes || 0) + 1; notify(); },
      update: async data => { if (!store.has(path)) throw { code: 'invalid_argument' }; store.set(path, { ...store.get(path), ...JSON.parse(JSON.stringify(data)) }); notify(); },
      delete: async () => { store.delete(path); notify(); },
      onSnapshot: (fn) => { setTimeout(() => fn(snapDoc(path)), 5); return () => {}; },
      collection: sub => collRef(path + '/' + sub),
    };
  };
  const collRef = path => {
    if (segs(path).length % 2 === 0) throw new TypeError('collection path must have odd segments: ' + path);
    const q = { path, where: () => q, orderBy: () => q, limit: () => q, get: async () => { const docs = collDocs(path); return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false } }; },
      onSnapshot: (fn) => { const l = { coll: path, fn }; listeners.add(l); const docs = collDocs(path); setTimeout(() => fn({ docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: () => [] }), 5); return () => listeners.delete(l); },
      doc: id => docRef(path + '/' + (id || Math.random().toString(36).slice(2))), add: async d => { const r = docRef(path + '/' + Math.random().toString(36).slice(2)); await r.set(d); return r; } };
    return q;
  };
  const db = Object.freeze({ doc: docRef, collection: collRef });
  const user = Object.freeze({ id: async () => 'u_test1', isOwner: async () => true, canEdit: async () => true, can: async () => true, me: async () => ({ id: 'u_test1', name: '', isOwner: true, canEdit: true }) });
  const genQs = [
    { q: 'भारत का पहला स्वदेशी H5N1 टीका किसके लिए है?', o: ['मुर्गियों के लिए', 'मनुष्यों के लिए', 'गायों के लिए', 'मछलियों के लिए'], a: 0, e: 'यह टीका मुर्गियों (पोल्ट्री) के लिए विकसित किया गया है।', t: 'पशु स्वास्थ्य' },
    { q: 'स्वदेशी H5N1 टीका किस शहर के संस्थान ने विकसित किया?', o: ['पुणे', 'हैदराबाद', 'भोपाल', 'लखनऊ'], a: 2, e: 'ICAR-NIHSAD भोपाल में स्थित है।', t: 'संस्थान' },
    { q: 'अमान्य प्रश्न', o: ['एक', 'एक', 'दो', 'तीन'], a: 1, e: '' },
  ];
  const sample = async (input, opts = {}) => { const text = 'सही उत्तर इसलिए सही है क्योंकि… याद रखने की ट्रिक: CPU = दिमाग़।'; await new Promise(r => setTimeout(r, 50)); if (opts.onText) { opts.onText({ text: text.slice(0, 10), delta: text.slice(0, 10) }); opts.onText({ text, delta: text.slice(10) }); } window.__sampleCalls = (window.__sampleCalls || 0) + 1; return { text, truncated: false, modelTierApplied: 'quick' }; };
  sample.json = async (input) => { await new Promise(r => setTimeout(r, 80)); window.__jsonCalls = (window.__jsonCalls || 0) + 1; if (String(input).includes('करेंट अफेयर्स प्रविष्टि')) return { title: 'AI शीर्षक: परीक्षण समाचार', cat: 'राष्ट्रीय', summary: 'यह AI द्वारा भरा गया परीक्षण सारांश है जो बीस अक्षरों से लंबा है।', facts: ['तथ्य क', 'तथ्य ख'], date: '2026-11-21' }; return JSON.parse(JSON.stringify(genQs)); };
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const caps = { db, user, sample };
  window.claude = { use: name => new Promise(res => setTimeout(() => res(caps[name] || null), 30)) };
  window.__store = store;
};

(async () => {
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || process.env.https_proxy, bypass: '127.0.0.1,localhost' } });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.addInitScript(() => { try { if (!localStorage.getItem('mq.progress')) localStorage.setItem('mq.progress', JSON.stringify({ v: 2, onb: true, updatedAt: 1 })); } catch {} });
  await page.goto(BASE + '#home', { waitUntil: 'networkidle' });
  await page.waitForSelector('.dash .next');
  await page.waitForTimeout(300);
  step('mode check (no local admin demo note expected): ' + await page.evaluate(() => typeof window.claude.use));

  // Learner: answer a question, then ask AI to explain
  await page.click('[data-act="start-daily"]'); await page.waitForSelector('.opt');
  await (await page.$$('.opt'))[0].click(); await page.waitForSelector('[data-act="ai-explain"]');
  await page.click('[data-act="ai-explain"]'); await page.waitForTimeout(300);
  step('AI explain box: ' + (await page.textContent('.ai-box')).slice(0, 40));
  await page.screenshot({ path: OUT + '/a1-ai-explain.png' });
  // Report
  await page.click('[data-act="report-q"]'); await page.click('form[data-form="report"] button[type="submit"]'); await page.waitForTimeout(200);
  await page.waitForTimeout(1800); // progress flush debounce
  const progress = await page.evaluate(() => { const v = window.__store.get('data/users/u_test1/progress'); return v ? Object.keys(v.ans).length : -1; });
  step('progress saved to data/users/u_test1/progress, answers: ' + progress);
  step('report doc items: ' + await page.evaluate(() => (window.__store.get('reports/u_test1') || {}).items?.length));

  // Admin: AI generate → queue → approve → publish
  await page.goto(BASE + '#admin'); await page.waitForSelector('.stat3');
  step('admin note: ' + ((await page.$('.note')) ? (await page.textContent('.note')).slice(0, 30) : 'none'));
  await page.goto(BASE + '#admin-ai'); await page.waitForSelector('#ai-news');
  await page.selectOption('#ai-news', 'n2611-h5n1');
  await page.click('[data-act="ai-generate"]'); await page.waitForSelector('[data-act="ai-queue"]');
  step('AI generated valid: ' + (await page.$$('article.draft')).length + ', dropped note: ' + ((await page.$('.sec-head .small')) ? await page.textContent('.sec-head .small') : '-'));
  await page.screenshot({ path: OUT + '/a2-ai-results.png', fullPage: true });
  await page.click('[data-act="ai-queue"]'); await page.waitForSelector('article.draft');
  step('drafts in db: ' + await page.evaluate(() => [...window.__store.keys()].filter(k => k.startsWith('cms/drafts/items/')).length));
  await page.waitForTimeout(300);
  for (let k = 0; k < 2; k++) {
    const id = await page.getAttribute('article.draft [data-act="draft-approve"]', 'data-id');
    for (let c = 0; c < 3; c++) await page.check(`input[data-chk="${id}"][data-ci="${c}"]`);
    await page.waitForTimeout(120);
    step('ticks survive re-render: ' + (await page.$$eval(`input[data-chk="${id}"]`, els => els.every(e => e.checked))));
    await page.click(`#ap-${id}`); await page.waitForTimeout(250);
  }
  await page.goto(BASE + '#admin-publish'); await page.waitForSelector('form[data-form="publish"]');
  await page.click('form[data-form="publish"] button[type="submit"]'); await page.waitForTimeout(300);
  const pubKeys = await page.evaluate(() => [...window.__store.keys()].filter(k => k.startsWith('pub/q/items/')));
  step('published question docs: ' + pubKeys.length + ' (drafts left: ' + await page.evaluate(() => [...window.__store.keys()].filter(k => k.startsWith('cms/drafts/items/')).length) + ')');
  await page.goto(BASE + '#subject/ca'); await page.waitForSelector('.sum .row-sub');
  step('CA subject count now: ' + await page.textContent('.sum .row-sub'));
  // News AI fill
  await page.goto(BASE + '#admin-news'); await page.waitForSelector('#nf-title');
  await page.click('details summary'); await page.fill('#nf-raw', 'यह एक लंबा मूल समाचार लेख है जिसे परीक्षण के लिए पेस्ट किया गया है ताकि AI इससे फ़ॉर्म भर सके। इसमें पर्याप्त अक्षर हैं।');
  await page.click('[data-act="news-ai"]'); await page.waitForTimeout(400);
  step('AI-filled news title: ' + await page.inputValue('#nf-title'));
  // Bank: hide a base question → hidden override in pub
  await page.goto(BASE + '#admin-bank'); await page.waitForSelector('[data-act="bank-remove"]');
  await page.click('[data-act="bank-remove"]'); await page.click('[data-act="confirm-ok"]'); await page.waitForTimeout(250);
  step('hidden overrides: ' + await page.evaluate(() => [...window.__store.entries()].filter(([k, v]) => k.startsWith('pub/q/items/') && v.hidden).length));
  // Reports tab shows learner report
  await page.goto(BASE + '#admin-review'); await page.click('[data-act="review-tab"][data-v="reports"]');
  step('reports visible to admin: ' + (await page.$$('article.draft')).length);
  await page.click('[data-act="report-resolve"]'); await page.waitForTimeout(200);
  step('report items after resolve: ' + await page.evaluate(() => (window.__store.get('reports/u_test1') || {}).items?.length));
  await page.goto(BASE + '#progress'); await page.waitForSelector('.week');
  step('storage line: ' + (await page.textContent('.card p.small.muted:last-of-type')).trim());
  console.log('\nERRORS (' + errors.length + '):\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
