// Google sign-in (Firebase mode) end to end. The real SDK files are swapped for an in-memory stand-in with the
// same compat API (auth + Firestore), and config.js is swapped for a test config. State survives reloads.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html';
const errors = [];
let fails = 0;
const step = m => console.log('•', m);
const check = (ok, m) => { if (!ok) fails++; console.log(ok ? '  ✔' : '  ✘ FAIL', m); };

const CONFIG = `window.MYQUIZ_CONFIG = Object.assign({ firebase: { apiKey: 'test-key', authDomain: 'test.firebaseapp.com', projectId: 'test', appId: '1:1:web:1' }, allowGuest: true }, window.MYQUIZ_CONFIG || {});`;
const FAKE = `(() => {
  const K = '__fbmock';
  const load = () => { try { return JSON.parse(localStorage.getItem(K)) || { user: null, store: {} }; } catch { return { user: null, store: {} }; } };
  const st = load();
  const save = () => localStorage.setItem(K, JSON.stringify(st));
  const segs = p => p.split('/').filter(Boolean);
  const listeners = new Set();
  const freeze = o => JSON.parse(JSON.stringify(o));
  const snapDoc = path => { const d = st.store[path]; return { id: segs(path).pop(), exists: d !== undefined, data: () => (d === undefined ? undefined : freeze(d)), metadata: { fromCache: false } }; };
  const docsOf = coll => Object.keys(st.store).filter(k => { const s = segs(k); return s.length === segs(coll).length + 1 && k.startsWith(coll + '/'); }).sort().map(snapDoc);
  const notify = () => { save(); for (const l of listeners) setTimeout(() => l.kind === 'c' ? l.fn({ docs: docsOf(l.path), metadata: { fromCache: false } }) : l.fn(snapDoc(l.path)), 5); };
  const denied = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const uid = () => st.user && st.user.uid;
  const isAdmin = () => !!(st.user && st.store['admins/' + st.user.email]);
  // A small subset of firestore.rules, enough to prove the app respects them.
  const canWrite = path => {
    const s = segs(path);
    if (!uid()) return false;
    if (s[0] === 'pub' || s[0] === 'cms') return isAdmin();
    if (s[0] === 'admins') return isAdmin() && !!(st.store['admins/' + st.user.email] || {}).owner;
    if (s[0] === 'lb' || s[0] === 'reports') return s[1] === uid() || isAdmin();
    if (s[0] === 'data') return s[2] === uid();
    return false;
  };
  const canRead = path => { const s = segs(path); if (s[0] === 'pub') return true; if (!uid()) return false; if (s[0] === 'cms' || (s[0] === 'reports' && s.length === 1)) return isAdmin(); if (s[0] === 'data') return s[2] === uid(); return true; };
  const doc = path => ({ id: segs(path).pop(), path,
    get: async () => { if (!canRead(path)) throw denied(); return snapDoc(path); },
    set: async data => { if (!canWrite(path)) throw denied(); st.store[path] = freeze(data); window.__writes = (window.__writes || 0) + 1; notify(); },
    delete: async () => { if (!canWrite(path)) throw denied(); delete st.store[path]; notify(); },
    onSnapshot: (fn, err) => { if (!canRead(path)) { setTimeout(() => err && err(denied()), 5); return () => {}; } const l = { kind: 'd', path, fn }; listeners.add(l); setTimeout(() => fn(snapDoc(path)), 5); return () => listeners.delete(l); } });
  const collection = path => ({ path,
    get: async () => { if (!canRead(path)) throw denied(); return { docs: docsOf(path), metadata: { fromCache: false } }; },
    onSnapshot: (fn, err) => { if (!canRead(path)) { setTimeout(() => err && err(denied()), 5); return () => {}; } const l = { kind: 'c', path, fn }; listeners.add(l); setTimeout(() => fn({ docs: docsOf(path), metadata: { fromCache: false } }), 5); return () => listeners.delete(l); } });
  const authCbs = [];
  const auth = {
    get currentUser() { return st.user; },
    onAuthStateChanged(cb) { authCbs.push(cb); setTimeout(() => cb(st.user), 20); return () => {}; },
    async getRedirectResult() { return { user: null }; },
    async signInWithPopup() { const n = window.__next || { uid: 'g_asha', displayName: 'Asha Verma', email: 'asha@example.com', photoURL: '' }; st.user = n; save(); authCbs.forEach(cb => cb(st.user)); return { user: st.user }; },
    async signInWithRedirect() {},
    async signOut() { st.user = null; save(); authCbs.forEach(cb => cb(null)); },
  };
  function GoogleAuthProvider() { this.setCustomParameters = () => {}; }
  const fs = { doc, collection, enablePersistence: async () => {} };
  const apps = [];
  window.firebase = { apps, initializeApp: c => { apps.push(c); return {}; }, auth: Object.assign(() => auth, { GoogleAuthProvider }), firestore: () => fs };
  window.__fb = { st, save };
})();`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'application/javascript', body: CONFIG }));
  await ctx.route('**/vendor/firebase-10.12.2/firebase-app-compat.js', r => r.fulfill({ contentType: 'application/javascript', body: FAKE }));
  await ctx.route(/vendor\/firebase-10\.12\.2\/firebase-(auth|firestore)-compat\.js$/, r => r.fulfill({ contentType: 'application/javascript', body: '/* stand-in */' }));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('__fbmock') || '{}').store || {});
  const go = async (r, sel) => { await page.evaluate(r => { location.hash = r; }, r); if (sel) await page.waitForSelector(sel); await page.waitForTimeout(150); };

  // 1. The sign-in screen comes first and blocks the rest of the app
  await page.goto(BASE + '#home');
  await page.waitForSelector('[data-act="google-signin"]:not([disabled])');
  check(!(await page.$('.bnav')), 'sign-in screen is shown first (no navigation behind it)');
  await go('learn');
  check(!!(await page.$('[data-act="google-signin"]')), 'other screens stay behind the sign-in screen');
  await page.click('[data-act="set-lang"][data-v="en"]');
  check((await page.textContent('[data-act="google-signin"]')).includes('Continue with Google'), 'sign-in screen in English');

  // 2. Sign in → onboarding with the Google first name → home
  await page.click('[data-act="google-signin"]');
  await page.waitForSelector('.onb-page #wz-name');
  check(await page.inputValue('#wz-name') === 'Asha', 'onboarding is prefilled with the Google first name');
  await page.click('[data-act="wz-finish"]');
  await page.waitForSelector('.dash .next');
  await page.click('[data-act="start-daily"]');
  await page.waitForSelector('.qtext');
  await page.click('.opt >> nth=0'); await page.waitForSelector('.explain');
  await page.waitForTimeout(3200);
  let s = await store();
  check(!!s['data/users/g_asha/progress'] && Object.keys(s['data/users/g_asha/progress'].ans || {}).length === 1, 'progress saved to the account (Firestore)');
  check(!!s['lb/g_asha'] && s['lb/g_asha'].n === 'Asha', 'leaderboard entry written under the account');

  // 3. Not an admin yet → after the owner record exists, the admin panel opens
  await go('admin', 'main');
  check((await page.textContent('main')).includes('editors only'), 'students cannot open the admin panel');
  await page.evaluate(() => { window.__fb.st.store['admins/asha@example.com'] = { owner: true }; window.__fb.save(); });
  await page.reload();
  await page.waitForSelector('.stat3');
  check(true, 'after the owner record exists, the same page reloads as the admin panel');
  await go('profile', '.account');
  const acc = await page.textContent('.account');
  step('account card: ' + acc.replace(/\s+/g, ' ').trim());
  check(acc.includes('asha@example.com') && acc.includes('Owner'), 'profile shows the Google account and role');
  await go('admin', '[data-act="upload-help"]');
  await page.click('[data-act="upload-help"]');
  await page.waitForSelector('.sheet .earn li');
  check((await page.$$('.sheet .earn li')).length === 6, 'upload help explains six steps');
  const [tpl] = await Promise.all([page.waitForEvent('download'), page.click('.sheet [data-act="template"]')]);
  check(tpl.suggestedFilename() === 'myquiz-question-template.csv', 'CSV template downloads');
  await page.keyboard.press('Escape');

  // 4. Owner adds an admin; admin uploads via CSV → review → publish → in Firestore for every student
  await go('admin-team', '#team-email');
  await page.fill('#team-email', 'Ravi@Example.com');
  await page.click('form[data-form="team-add"] button[type="submit"]');
  await page.waitForTimeout(300);
  check(!!(await store())['admins/ravi@example.com'], 'owner adds an admin by email');
  await go('admin-io', '#imp-text');
  await page.fill('#imp-text', 'id,subject,chapter,difficulty,question,A,B,C,D,answer,explanation,reference,question_en,A_en,B_en,C_en,D_en,explanation_en\n,science,sc-phy,1,बल का SI मात्रक क्या है?,न्यूटन,जूल,वाट,पास्कल,A,बल का SI मात्रक न्यूटन (N) है।,NCERT विज्ञान,What is the SI unit of force?,Newton,Joule,Watt,Pascal,The SI unit of force is the newton (N).');
  await page.click('[data-act="import-check"]');
  await page.click('form[data-form="import"] button[type="submit"]');
  await page.waitForSelector('.draft');
  const card = page.locator('article.draft', { hasText: 'SI unit of force' });
  for (const cb of await card.locator('input[data-chk]').all()) await cb.check();
  await card.locator('[data-act="draft-approve"]').click();
  await page.waitForTimeout(300);
  await go('admin-publish', 'form[data-form="publish"]');
  await page.click('form[data-form="publish"] button[type="submit"]');
  await page.waitForTimeout(400);
  s = await store();
  const pub = Object.keys(s).filter(k => k.startsWith('pub/q/items/'));
  check(pub.length === 1 && s[pub[0]].q.includes('SI'), 'published question is in Firestore for all students');
  check(Object.keys(s).filter(k => k.startsWith('cms/drafts/items/')).length === 0, 'draft removed after publishing');

  // 5. Sign out clears this phone; another student sees none of Asha's progress
  await go('profile', '[data-act="signout"]');
  await page.click('[data-act="signout"]');
  await page.click('.sheet [data-act="confirm-ok"]');
  await page.waitForSelector('[data-act="google-signin"]:not([disabled])');
  const leftover = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mq.progress') || '{"ans":{}}').ans || {}).length);
  check(leftover === 0 && (await page.evaluate(() => localStorage.getItem('mq.owner'))) === null, 'sign-out clears local progress');
  await page.evaluate(() => { window.__next = { uid: 'g_ravi', displayName: 'Ravi Kumar', email: 'ravi@example.com', photoURL: '' }; });
  await page.click('[data-act="google-signin"]');
  await page.waitForSelector('.onb-page #wz-name');
  check(await page.inputValue('#wz-name') === 'Ravi', 'second account starts fresh with its own name');
  await page.click('[data-act="wz-finish"]');
  await page.waitForSelector('.dash .next');
  await go('admin', 'main');
  check(!(await page.textContent('main')).includes('editors only'), 'an admin added by email gets the admin panel');
  await go('learn', '.list .row');
  check((await page.textContent('main')).length > 0, 'published content loads for the new account');

  // 6. Guest mode (when allowed) works offline-style and invites sign-in on the leaderboard
  await go('profile', '[data-act="signout"]');
  await page.click('[data-act="signout"]');
  await page.click('.sheet [data-act="confirm-ok"]');
  await page.waitForSelector('[data-act="guest"]');
  await page.click('[data-act="guest"]');
  await page.waitForSelector('.onb-page, .dash .next');
  if (await page.$('.onb-page')) await page.click('[data-act="wz-finish"]');
  await page.waitForSelector('.dash .next');
  await go('leaders', 'main');
  const lbText = await page.textContent('main');
  if (!lbText.includes('Sign in with Google to join the leaderboard')) step('leaders (guest): ' + lbText.replace(/\s+/g, ' ').slice(0, 300));
  check(lbText.includes('Sign in with Google to join the leaderboard'), 'guests are invited to sign in for the leaderboard');

  // 7. The real SDK files load and expose the API the app uses
  const p2 = await browser.newPage();
  await p2.goto('http://127.0.0.1:8765/docs/');
  const api = await p2.evaluate(async () => {
    for (const f of ['app', 'auth', 'firestore']) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/vendor/firebase-10.12.2/firebase-' + f + '-compat.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const app = firebase.initializeApp({ apiKey: 'x', authDomain: 'x.firebaseapp.com', projectId: 'x', appId: '1:1:web:1' });
    const db = firebase.firestore(), d = db.doc('a/b'), c = db.collection('a');
    return { version: firebase.SDK_VERSION, doc: typeof d.onSnapshot, coll: typeof c.onSnapshot, auth: typeof firebase.auth().signInWithPopup, provider: typeof firebase.auth.GoogleAuthProvider, app: !!app };
  });
  step('real SDK: ' + JSON.stringify(api));
  check(api.version === '10.12.2' && api.doc === 'function' && api.coll === 'function' && api.auth === 'function' && api.provider === 'function', 'vendored Firebase SDK exposes the compat API');

  await browser.close();
  console.log(`\nERRORS (${errors.length}):` + (errors.length ? '\n  ' + [...new Set(errors)].join('\n  ') : ''));
  console.log(fails ? `GOOGLE CHECKS: ${fails} failed` : 'GOOGLE CHECKS: all passed');
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e.message.split('\n')[0]); process.exit(1); });
