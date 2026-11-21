// ───────────────────────────── learner progress & reward points ─────────────────────────────
const DEF = () => ({
  v: 2, name: '', exam: '', goal: 10, best: 0, won: false,
  days: {}, ans: {}, bm: { q: [], n: [] }, mocks: [], daily: {}, dailySet: null,
  pts: { total: 0, days: {}, log: [] }, // reward points: lifetime total, per-day totals, recent history
  pq: { d: '', ids: [] },               // questions that already earned points today
  fl: { d: '', k: [] },                 // once-per-day bonuses already given today
  lb: { name: '', hide: false },        // how this learner appears on the leaderboard
  badges: {},                           // badge id -> date earned
  set: { scale: 1, theme: 'system', mode: 'practice', count: 10, lang: 'hi' },
  updatedAt: 0,
});
const obj = (v, d) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);
const U = {
  s: DEF(),
  norm(x) {
    const d = DEF();
    const s = { ...d, ...obj(x, {}) };
    s.bm = { q: Array.isArray(s.bm && s.bm.q) ? s.bm.q : [], n: Array.isArray(s.bm && s.bm.n) ? s.bm.n : [] };
    s.set = { ...d.set, ...obj(s.set, {}) };
    for (const k of ['days', 'ans', 'daily', 'badges']) s[k] = obj(s[k], {});
    if (!Array.isArray(s.mocks)) s.mocks = [];
    const p = obj(s.pts, {});
    s.pts = { total: Number(p.total) || 0, days: obj(p.days, {}), log: Array.isArray(p.log) ? p.log : [] };
    if (!s.pts.total && Number(x && x.xp) > 0) s.pts.total = Math.round(Number(x.xp)); // v1 XP carries over
    s.pq = obj(s.pq, d.pq); if (!Array.isArray(s.pq.ids)) s.pq.ids = [];
    s.fl = obj(s.fl, d.fl); if (!Array.isArray(s.fl.k)) s.fl.k = [];
    s.lb = { ...d.lb, ...obj(s.lb, {}) };
    s.name = String(s.name || '').slice(0, 40);
    s.goal = [10, 20, 30].includes(Number(s.goal)) ? Number(s.goal) : 10;
    s.set.lang = s.set.lang === 'en' ? 'en' : 'hi';
    delete s.xp;
    return s;
  },
  load() { this.s = this.norm(LS.get('progress', null)); },
  async syncRemote() {
    if (!P.cdb || !P.uid) return;
    try {
      const snap = await P.cdb.doc(`data/users/${P.uid}/progress`).get();
      P.progressRemote = true;
      if (snap.exists) {
        const r = this.norm(clone(snap.data()));
        if ((r.updatedAt || 0) > (this.s.updatedAt || 0)) { this.s = r; LS.set('progress', this.s); applySettings(); scheduleRender(); }
        else if ((this.s.updatedAt || 0) > (r.updatedAt || 0)) this.queue();
      } else if (this.s.updatedAt) this.queue();
    } catch { P.progressRemote = false; }
  },
  touch() { this.s.updatedAt = Date.now(); LS.set('progress', this.s); this.queue(); },
  queue() { if (!P.progressRemote) return; clearTimeout(this.t); this.t = setTimeout(() => this.flush(), 1500); },
  async flush() {
    if (!P.progressRemote) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try { await P.cdb.doc(`data/users/${P.uid}/progress`).set(clone(this.s)); }
    catch (e) { if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'quota_exceeded'].includes(e.code)) P.progressRemote = false; }
    finally { this.busy = false; if (this.again) { this.again = false; this.flush(); } }
  },
  prune() {
    const cutoff = addDays(todayISO(), -120);
    for (const k of Object.keys(this.s.days)) if (k < cutoff) delete this.s.days[k];
    for (const k of Object.keys(this.s.daily)) if (k < cutoff) delete this.s.daily[k];
    for (const k of Object.keys(this.s.pts.days)) if (k < cutoff) delete this.s.pts.days[k];
  },
  // ── reward points ──
  award(reason, n) {
    const t = todayISO(), p = this.s.pts;
    const today = p.days[t] || 0;
    const add = Math.max(0, Math.min(Math.round(n), PTS.cap - today));
    if (!add) return 0;
    p.total += add;
    p.days[t] = today + add;
    const last = p.log[0];
    if (last && last.r === reason && Date.now() - last.t < 15 * 60000) { last.n += add; last.c = (last.c || 1) + 1; last.t = Date.now(); }
    else { p.log.unshift({ t: Date.now(), r: reason, n: add }); if (p.log.length > 60) p.log.length = 60; }
    return add;
  },
  once(key) {
    const t = todayISO();
    if (this.s.fl.d !== t) this.s.fl = { d: t, k: [] };
    if (this.s.fl.k.includes(key)) return false;
    this.s.fl.k.push(key);
    return true;
  },
  firstToday(id) {
    const t = todayISO();
    if (this.s.pq.d !== t) this.s.pq = { d: t, ids: [] };
    if (this.s.pq.ids.includes(id)) return false;
    this.s.pq.ids.push(id);
    return true;
  },
  ptsToday() { return this.s.pts.days[todayISO()] || 0; },
  ptsWeek(wk) { let s = 0; const end = addDays(wk, 6); for (const [d, n] of Object.entries(this.s.pts.days)) if (d >= wk && d <= end) s += n; return s; },
  ptsMonth(mk) { let s = 0; for (const [d, n] of Object.entries(this.s.pts.days)) if (d.startsWith(mk)) s += n; return s; },
  // Records an answer: spaced-repetition box, daily counts, points and once-a-day bonuses.
  // Returns the points earned by this answer.
  record(q, ok, opts = {}) {
    const t = todayISO();
    const a = this.s.ans[q.id] || { c: 0, w: 0, b: 0 };
    if (ok) { a.c++; a.b = Math.min(SRS_GAPS.length - 1, (a.b || 0) + 1); } else { a.w++; a.b = 0; }
    a.l = ok ? 1 : 0; a.t = Date.now(); a.due = addDays(t, SRS_GAPS[a.b]);
    this.s.ans[q.id] = a;
    this.s.days[t] = (this.s.days[t] || 0) + 1;
    let earned = 0;
    this.lastBonus = []; // once-a-day bonuses unlocked by this answer, as [reason, points]
    const bonus = (reason, n) => { const got = this.award(reason, n); if (got) { earned += got; this.lastBonus.push([reason, got]); } };
    if (this.firstToday(q.id)) earned += this.award(ok ? 'correct' : 'wrong', ok ? PTS.correct + (opts.timed ? PTS.timed : 0) : PTS.wrong);
    const cnt = this.s.days[t];
    if (cnt >= this.s.goal && this.once('goal')) bonus('goal', PTS.goal);
    const st = this.streak();
    if (st > (this.s.best || 0)) this.s.best = st;
    if (cnt >= STREAK_MIN && this.once('streak')) bonus('streak', Math.min(PTS.streakStep * Math.max(1, st), PTS.streakMax));
    this.prune();
    this.checkBadges();
    this.touch();
    LB.queue();
    return earned;
  },
  streak() {
    const days = this.s.days;
    let d = todayISO();
    if ((days[d] || 0) < STREAK_MIN) d = addDays(d, -1);
    let n = 0;
    while ((days[d] || 0) >= STREAK_MIN) { n++; d = addDays(d, -1); }
    return n;
  },
  todayCount() { return this.s.days[todayISO()] || 0; },
  due() {
    const t = todayISO(), m = M();
    return Object.entries(this.s.ans).filter(([id, a]) => a.w > 0 && (a.b || 0) < SRS_GAPS.length - 1 && (a.due || t) <= t && m.byId.has(id)).map(([id]) => id);
  },
  isBm(kind, id) { return this.s.bm[kind].includes(id); },
  toggleBm(kind, id) {
    const arr = this.s.bm[kind], i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.unshift(id);
    this.touch();
    return i < 0;
  },
  subjStats(k) {
    const qs = M().bySubj[k] || [];
    let seen = 0, right = 0, c = 0, w = 0;
    for (const q of qs) { const a = this.s.ans[q.id]; if (a) { seen++; if (a.l) right++; c += a.c; w += a.w; } }
    return { total: qs.length, seen, right, acc: pct(c, c + w) };
  },
  totals() {
    let c = 0, w = 0, n = 0;
    for (const a of Object.values(this.s.ans)) { c += a.c || 0; w += a.w || 0; n++; }
    return { attempts: c + w, correct: c, unique: n, acc: pct(c, c + w) };
  },
  checkBadges() {
    const tot = this.totals();
    const st = { answers: tot.attempts, acc: tot.acc, best: this.s.best || 0, mocks: this.s.mocks.length, total: this.s.pts.total, won: !!this.s.won };
    const fresh = BADGES.filter(b => !this.s.badges[b.id] && b.test(st));
    for (const b of fresh) this.s.badges[b.id] = todayISO();
    if (fresh.length) setTimeout(() => toast(L('नया बैज मिला: ', 'New badge: ') + L(fresh[0].hi, fresh[0].en)), 600);
    return fresh;
  },
};
function applySettings() {
  const s = U.s.set;
  setLang(s.lang);
  document.documentElement.style.setProperty('--scale', String(clamp(Number(s.scale) || 1, 0.85, 1.3)));
  if (P.mode === 'standalone') {
    if (s.theme === 'dark' || s.theme === 'light') document.documentElement.dataset.theme = s.theme;
    else delete document.documentElement.dataset.theme;
  }
}

