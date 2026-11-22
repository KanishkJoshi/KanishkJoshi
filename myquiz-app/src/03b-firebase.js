// ───────────────────────────── Google sign-in (Firebase Auth + Firestore) ─────────────────────────────
// Active only in the self-hosted app when config.js has a Firebase config (P.cloud). The Firestore compat
// API matches the database API the rest of the app already uses (doc/collection/get/set/delete/onSnapshot),
// so progress, leaderboard, reports and admin publishing all go to Firestore with no other changes.
const FB = { state: P.cloud ? 'loading' : 'off', err: '', busy: false, started: false, cms: false, guest: false };
const FB_SDK = String(CFG.firebaseSdk || 'vendor/firebase-10.12.2/').replace(/\/?$/, '/');
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); });
}
function authMsg(e) {
  const m = {
    'auth/network-request-failed': ['इंटरनेट कनेक्शन नहीं मिला — जाँचकर फिर कोशिश करें।', 'No internet connection — check it and try again.'],
    'auth/unauthorized-domain': ['यह वेबसाइट Firebase में अनुमत नहीं है — एडमिन को docs/FIREBASE-SETUP.md का चरण 5 देखना होगा।', 'This website is not allowed in Firebase — the admin needs step 5 of docs/FIREBASE-SETUP.md.'],
    'auth/operation-not-allowed': ['Firebase में Google साइन-इन चालू नहीं है — एडमिन से संपर्क करें।', 'Google sign-in is not enabled in Firebase — contact the admin.'],
    'auth/user-disabled': ['यह खाता बंद कर दिया गया है।', 'This account has been disabled.'],
    'auth/too-many-requests': ['बहुत सारे प्रयास — थोड़ी देर बाद फिर कोशिश करें।', 'Too many attempts — try again in a little while.'],
  }[e && e.code];
  return m ? L(m[0], m[1]) : L('साइन इन नहीं हो सका — फिर कोशिश करें।', 'Could not sign in — please try again.');
}
async function initFirebase() {
  try {
    for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']) await loadScript(FB_SDK + f);
    if (!firebase.apps.length) firebase.initializeApp(CFG.firebase);
    const db = firebase.firestore();
    try { await db.enablePersistence({ synchronizeTabs: true }); } catch { /* private window or another tab owns it: works online only */ }
    P.db = P.cdb = db;
    const auth = firebase.auth();
    try { await auth.getRedirectResult(); } catch (e) { FB.err = authMsg(e); }
    FB.guest = !!LS.get('guest', false) && !!CFG.allowGuest;
    auth.onAuthStateChanged(u => { onAuth(u).catch(() => { FB.state = u ? 'in' : 'out'; render(); }); });
  } catch {
    FB.state = 'error'; P.ready = true;
    FB.err = L('लॉगिन सेवा लोड नहीं हुई — इंटरनेट जाँचें और फिर कोशिश करें।', 'The sign-in service did not load — check the internet and try again.');
    scheduleRender();
  }
}
// One phone can be shared: progress on this device belongs to one account at a time.
function adoptLocalProgress(uid) {
  const owner = LS.get('owner', null);
  if (owner && owner !== uid) clearLocalLearner();
  LS.set('owner', uid);
}
function clearLocalLearner() {
  const lang = U.s.set.lang;
  for (const k of ['progress', 'sess', 'exam', 'lastExam', 'owner', 'guest', 'onb-skip']) LS.del(k);
  U.s = DEF(); U.s.set.lang = lang; S = null; E = null; lastExam = null;
  LS.set('progress', U.s); // keep only the language choice (updatedAt 0, so an account's saved progress always wins)
}
function startCloud() {
  if (!FB.started) {
    FB.started = true;
    subscribeLive(); LB.subscribe();
    try { P.cdb.doc('pub/settings/items/cms').onSnapshot(x => { if (x.exists) Object.assign(CMSSET, x.data() || {}); }, () => { /* optional */ }); } catch { /* optional */ }
  }
  if (P.isAdmin && !FB.cms) { FB.cms = true; subscribeCms(); }
}
async function onAuth(u) {
  if (!u) {
    FB.state = 'out'; P.uid = null; P.authUser = null; P.isAdmin = P.editor = P.owner = false; P.progressRemote = false; P.ready = true;
    if (FB.guest) subscribeLive();
    render();
    return;
  }
  P.uid = u.uid;
  P.authUser = { name: String(u.displayName || '').slice(0, 60), email: String(u.email || '').toLowerCase(), photo: safeUrl(u.photoURL) };
  FB.guest = false; LS.del('guest');
  adoptLocalProgress(u.uid);
  try { const s = await P.cdb.doc('admins/' + P.authUser.email).get(); const a = s.exists ? s.data() || {} : null; P.isAdmin = P.editor = !!a; P.owner = !!(a && a.owner); }
  catch { P.isAdmin = P.editor = P.owner = false; }
  FB.state = 'in'; P.ready = true;
  startCloud();
  await U.syncRemote();
  if (!U.s.name && P.authUser.name) { U.s.name = P.authUser.name.split(/\s+/)[0]; onb.name = U.s.name; U.touch(); }
  LB.queue();
  if (!U.s.onb) go('welcome');                 // new learners always set up language, exam and goal first
  else if (route === 'login' || route === 'welcome') go('home');
  else render();
}
async function signInGoogle() {
  if (FB.busy || !window.firebase) return;
  FB.busy = true; FB.err = ''; render();
  const provider = new firebase.auth.GoogleAuthProvider();
  try { provider.setCustomParameters({ prompt: 'select_account' }); } catch { /* optional */ }
  try { await firebase.auth().signInWithPopup(provider); }
  catch (e) {
    const code = e && e.code;
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(code)) {
      try { await firebase.auth().signInWithRedirect(provider); return; } catch (e2) { FB.err = authMsg(e2); }
    } else if (code !== 'auth/popup-closed-by-user') FB.err = authMsg(e);
  }
  FB.busy = false; render();
}
async function signOutAll() {
  try { clearTimeout(U.t); await U.flush(); } catch { /* best effort */ }
  try { await firebase.auth().signOut(); } catch { /* ignore */ }
  clearLocalLearner();
  try { history.replaceState(null, '', '#login'); } catch { /* ignore */ }
  location.reload();
}
const GOOGLE_G = '<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
// The sign-in screen is the first screen of the self-hosted app; nothing else opens until the learner signs in.
const authGate = () => (P.cloud && FB.state !== 'in' && !(FB.guest && FB.state === 'out') ? vLogin : null);
function vLogin() {
  if (!P.cloud) return redirect('home');
  if (FB.state === 'in' || (FB.guest && FB.state === 'out')) return redirect(U.s.onb ? 'home' : 'welcome');
  const waiting = FB.state === 'loading', off = navigator.onLine === false;
  return `<main class="onb-page gutter login">
  <div class="chips" style="justify-content:flex-end" role="group" aria-label="${L('भाषा', 'Language')}">${[['hi', 'हिंदी'], ['en', 'English']].map(([v, l]) => `<button class="chip" data-act="set-lang" data-v="${v}" aria-pressed="${LANG === v}" lang="${v}">${l}</button>`).join('')}</div>
  <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="${L('किताब और टोपी', 'A book and a graduation cap')}"><circle cx="60" cy="60" r="56" fill="var(--sky-soft)"/><path d="M28 78l32-12 32 12v8l-32-12-32 12z" fill="var(--navy)"/><path d="M60 30 24 46l36 16 36-16z" fill="var(--navy)"/><path d="M40 54v14c0 6 9 10 20 10s20-4 20-10V54" fill="none" stroke="var(--sky)" stroke-width="5"/><circle cx="92" cy="50" r="4" fill="var(--gold)"/></svg>
  <div><h1>MY QUIZ</h1><p class="lead">${L('हिंदी और English में सामान्य ज्ञान — सीखें, अभ्यास करें, दोहराएँ और मुक़ाबला करें।', 'General knowledge in Hindi and English — learn, practise, revise and compete.')}</p></div>
  <ul class="facts">
    <li>${ic('check')}<span>${L('आपकी प्रगति हर फ़ोन और कंप्यूटर पर सुरक्षित', 'Your progress is saved on every phone and computer')}</span></li>
    <li>${ic('check')}<span>${L('रोज़ की चुनौती, साप्ताहिक लीडरबोर्ड और इनाम', 'Daily challenges, weekly leaderboards and prizes')}</span></li>
    <li>${ic('check')}<span>${L('ताज़ा करेंट अफेयर्स और मॉक टेस्ट', 'Fresh current affairs and mock tests')}</span></li>
  </ul>
  ${FB.err ? `<div class="note note-warn" role="alert">${ic('alert')}<div>${esc(FB.err)}</div></div>` : ''}
  ${off ? `<div class="note note-warn">${ic('wifi-off')}<div>${L('पहली बार साइन इन करने के लिए इंटरनेट चाहिए।', 'You need the internet to sign in the first time.')}</div></div>` : ''}
  <div class="onb-foot" style="flex-direction:column">
    ${FB.state === 'error' ? `<button class="btn btn-cta btn-block" data-act="reload">${ic('rotate')} ${L('फिर कोशिश करें', 'Try again')}</button>`
      : `<button class="btn btn-google btn-block" data-act="google-signin" ${waiting || FB.busy ? 'disabled' : ''}>${GOOGLE_G}<span>${waiting ? L('तैयार हो रहा है…', 'Getting ready…') : FB.busy ? L('साइन इन हो रहा है…', 'Signing in…') : L('Google से जारी रखें', 'Continue with Google')}</span></button>`}
    ${CFG.allowGuest ? `<button class="btn btn-grey btn-block" data-act="guest">${L('बिना साइन इन जारी रखें', 'Continue without signing in')}</button>` : ''}
    <p class="small muted" style="margin:0;text-align:center">${L('हम आपका नाम, ईमेल और फ़ोटो केवल आपकी प्रगति सहेजने के लिए लेते हैं। लीडरबोर्ड पर सिर्फ़ आपका दिखने वाला नाम और पॉइंट्स दिखते हैं।', 'We use your name, email and photo only to save your progress. The leaderboard shows just your display name and points.')}${safeUrl(CFG.privacyUrl) ? ` <a href="${esc(safeUrl(CFG.privacyUrl))}" target="_blank" rel="noopener noreferrer">${L('गोपनीयता नीति', 'Privacy policy')}</a>` : ''}</p>
  </div>
</main>`;
}
// Profile card for the signed-in account (self-hosted app only).
function accountCard() {
  if (!P.cloud) return '';
  if (FB.state !== 'in') return `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1.05rem">${ic('user')} ${L('खाता', 'Account')}</h2><p class="small muted" style="margin:0">${L('आप साइन इन नहीं हैं — प्रगति केवल इस फ़ोन पर है और लीडरबोर्ड में नहीं जुड़ती।', 'You are not signed in — progress stays on this phone and does not join the leaderboard.')}</p><button class="btn btn-google btn-block" data-act="google-signin">${GOOGLE_G}<span>${L('Google से साइन इन करें', 'Sign in with Google')}</span></button></section>`;
  const a = P.authUser || {};
  return `<section class="card account"><div class="sum-top">${a.photo ? `<img class="acc-photo" src="${esc(a.photo)}" alt="" referrerpolicy="no-referrer" width="48" height="48">` : `<span class="lvl-badge" style="width:48px;height:48px">${esc(initial(a.name || a.email || '?'))}</span>`}<span class="row-main"><b>${esc(a.name || L('विद्यार्थी', 'Student'))}</b><span class="row-sub">${esc(a.email || '')}</span><span class="row-sub">${ic('graduation')} ${P.owner ? L('मालिक (एडमिन)', 'Owner (admin)') : P.isAdmin ? L('एडमिन', 'Admin') : L('विद्यार्थी', 'Student')} · Google</span></span></div>
  <button class="btn btn-outline btn-block" data-act="signout">${ic('arrow-left')} ${L('साइन आउट', 'Sign out')}</button></section>`;
}
