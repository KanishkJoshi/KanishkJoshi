// ───────────────────────────── router & render ─────────────────────────────
const ROUTES = { home: vHome, quiz: vQuiz, play: vPlay, result: vResult, ca: vCA, today: vToday, mock: vMock, exam: vExam, 'exam-result': vExamResult, bookmarks: vBookmarks, leaders: vLeaders, profile: vProfile, admin: vAdmin, 'admin-ai': vAdminAI, 'admin-review': vAdminReview, 'admin-publish': vAdminPublish, 'admin-bank': vAdminBank, 'admin-news': vAdminNews, 'admin-days': vAdminDays, 'admin-rewards': vAdminRewards, test: vTest, 'test-inbox': vTestInbox };
const NO_NAV = new Set(['play', 'result', 'exam', 'exam-result', 'test-inbox', ...ADMIN_ROUTES]);
let route = 'home';
const routeFromHash = () => { const h = decodeURIComponent(location.hash.replace(/^#/, '')); return ROUTES[h] ? h : 'home'; };
function go(r) {
  if (!ROUTES[r]) r = 'home';
  if (location.hash.replace(/^#/, '') === r) { route = r; render(true); return; }
  location.hash = r;
}
function redirect(r) {
  setTimeout(() => { try { history.replaceState(null, '', '#' + r); } catch { /* ignore */ } route = r; render(true); }, 0);
  return '<main class="page gutter"></main>';
}
window.addEventListener('hashchange', () => { route = routeFromHash(); if (DEMO) T.note('→' + route); closeSheet(); render(true); });

let renderQueued = false, deferred = false, tickId = 0;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const a = document.activeElement;
    if (a && $('#app').contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { deferred = true; return; }
    render(false);
  });
}
function render(routeChanged = false) {
  clearInterval(tickId); tickId = 0;
  const app = $('#app');
  app.innerHTML = (ROUTES[route] || vHome)();
  app.classList.toggle('no-nav', NO_NAV.has(route));
  app.classList.toggle('exam-pad', route === 'exam');
  if (routeChanged) window.scrollTo(0, 0);
  if (DEMO) renderDemoStrip();
  afterRender();
}
function afterRender() {
  if (route === 'play' && S && S.timed) {
    const q = S.qs[S.i];
    if (q && !S.ans[q.id]) {
      const tick = () => {
        const left = Math.ceil(TIMED_SECONDS - (Date.now() - S.shownAt) / 1000);
        const v = $('#qtimer-v');
        if (v) v.textContent = String(Math.max(0, left));
        const t = $('#qtimer');
        if (t) t.classList.toggle('low', left <= 10);
        if (left <= 0) { clearInterval(tickId); tickId = 0; answer(-1); }
      };
      tick(); tickId = setInterval(tick, 250);
    }
  }
  if (route === 'exam' && E) {
    const tick = () => {
      if (!E) return;
      const left = E.endsAt - Date.now();
      const v = $('#etimer-v');
      if (v) v.textContent = fmtSecs(Math.max(0, Math.ceil(left / 1000)));
      const t = $('#etimer');
      if (t) t.classList.toggle('low', left < 60000);
      if (left <= 0) { clearInterval(tickId); tickId = 0; submitExam(true); }
    };
    tick(); tickId = setInterval(tick, 500);
  }
}

// ───────────────────────────── events ─────────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' && (el.getAttribute('href') || '#').startsWith('#')) e.preventDefault();
  if (DEMO) { const x = el.dataset.s || el.dataset.v || el.dataset.i || el.dataset.id || ''; T.note(el.dataset.act + (x ? ':' + String(x).slice(0, 14) : '')); }
  fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  if (DEMO) T.note('form:' + f.dataset.form);
  const fn = FORMS[f.dataset.form];
  if (fn) fn(f);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q-search') renderSearch(t.value);
  else if (t.id === 'bank-search') { bankState.term = t.value; bankState.limit = 40; const box = $('#bank-list'); if (box) box.innerHTML = bankListHtml(); }
  if (t.dataset.bind) setBind(t.dataset.bind, t);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.chk) updateApproveBtn(t.dataset.chk, t);
  if (t.id === 'mock-agree') { const b = $('#mock-start'); if (b) b.disabled = !t.checked; }
  if (t.dataset.bind) setBind(t.dataset.bind, t);
  if (t.dataset.change && CHANGES[t.dataset.change]) CHANGES[t.dataset.change](t);
});
document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.tc) { if (d.open) T.open = d.dataset.tc; else if (T.open === d.dataset.tc) T.open = ''; } }, true);
document.addEventListener('focusout', () => { if (deferred) { deferred = false; setTimeout(scheduleRender, 0); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) { closeSheet(); return; }
  if (sheetOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  if (route === 'play' && S) {
    const k = e.key.toLowerCase();
    const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
    if (k in map && !S.ans[S.qs[S.i].id]) { e.preventDefault(); answer(map[k]); }
    else if (k === 'arrowright') { e.preventDefault(); nextQ(); }
    else if (k === 'arrowleft') { e.preventDefault(); ACTIONS['prev-q'](); }
  }
});
// Save right away when the app goes to the background, so the leaderboard never misses points.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  clearTimeout(U.t); U.flush();
  if (LB.canShare()) { clearTimeout(LB.t); LB.push(); }
});

// ───────────────────────────── boot ─────────────────────────────
function boot() {
  if (DEMO) {
    document.documentElement.classList.add('demo');
    const onErr = msg => { T.errors.push({ m: String(msg || 'error').slice(0, 180), at: route, t: Date.now() }); if (T.errors.length > 10) T.errors.shift(); renderDemoStrip(); };
    window.addEventListener('error', e => onErr(e.message || (e.error && e.error.message)));
    window.addEventListener('unhandledrejection', e => { const r = e.reason; onErr(r && (r.message || r.code) ? r.message || r.code : r); });
  }
  U.load();
  applySettings();
  const live = document.createElement('div');
  live.id = 'sr-live'; live.className = 'sr'; live.setAttribute('aria-live', 'assertive');
  document.body.appendChild(live);
  route = routeFromHash();
  if (LOCAL()) { loadLocalCms(); LB.loadLocal(); seedDemo(); }
  render(true);
  loadBase();
  initPlatform().then(() => {
    if (P.mode === 'artifact' && !P.demo) {
      subscribeLive(); subscribeCms(); LB.subscribe();
      U.syncRemote().then(() => LB.queue());
    }
    if (P.demo) { subscribeInbox(); T.push(); }
    scheduleRender();
  });
  if (P.mode === 'standalone' && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
}
boot();
})();
