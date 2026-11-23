// ───────────────────────────── leaderboard ─────────────────────────────
// Each learner publishes only a display name and point totals to lb/{their id}; progress stays private.
// Totals for the current and previous week/month are recomputed from the learner's own daily points,
// so "last week" boards keep working even for learners who have not opened the app this week.
const SAMPLE_NAMES = [['अनन्या', 'Ananya'], ['रोहित', 'Rohit'], ['सना', 'Sana'], ['विक्रम', 'Vikram'], ['मेघा', 'Megha'], ['आदित्य', 'Aditya'], ['पूजा', 'Pooja'], ['करण', 'Karan'], ['नेहा', 'Neha']];
// Self-hosted app (Firestore): each board reads only its top students, when a screen needs it, so the
// number of reads stays flat as students grow. Totals are saved in batches (see LB_SYNC_MS) and right away
// at the end of a quiz or when the app goes to the background. Needs the indexes in firestore.indexes.json.
const LB_TOP = 50, LB_TOP_ADMIN = 500, LB_FRESH_MS = 120e3;
const LB_SYNC_MS = Number(CFG.lbSyncMs) || 30000;
// The boards each screen shows; the self-hosted app loads only those (router: LB.ensure).
const LB_NEED = { home: ['week'], compete: ['week'], profile: ['week'], 'leaders-week': ['week'], 'leaders-lastweek': ['lastweek'], 'leaders-month': ['month'], admin: ['week', 'lastweek'], 'admin-rewards': ['week', 'month', 'lastweek', 'lastmonth'], 'admin-analytics': ['week'] };
const LB = {
  entries: [], winners: [], hidden: [],
  settings: { weekPrize: '', weekPrizeEn: '', monthPrize: '', monthPrizeEn: '' },
  state: 'idle', t: 0, busy: false, again: false, denied: false,
  cloud: { docs: {}, at: {}, top: {}, busy: {} },
  canShare() { return !!(P.cdb && P.uid) && !this.denied; },
  myId() { return P.uid || 'me'; },
  // The published name is the learner's chosen display name (or first name). Learners without one are
  // stored with an empty name and shown as "Student 1234" in each viewer's own language.
  pubName() { return String(U.s.lb.name || U.s.name.split(/\s+/)[0] || '').trim().slice(0, 24); },
  display(e) { const n = String((e && e.n) || '').trim().slice(0, 30); return n || `${L('विद्यार्थी', 'Student')} ${1000 + (hashSeed(String((e && e.u) || 'local')) % 9000)}`; },
  myName() { return this.display({ n: this.pubName(), u: this.myId() }); },
  myEntry() {
    const t = todayISO(), wk = weekKey(t), pw = addDays(wk, -7), mo = monthKey(t), pm = prevMonthKey(mo);
    return { n: this.pubName(), wk, wp: U.ptsWeek(wk), pw, pwp: U.ptsWeek(pw), mo, mp: U.ptsMonth(mo), pm, pmp: U.ptsMonth(pm), tp: U.s.pts.total, at: Date.now() };
  },
  queue() { if (!this.canShare()) return; clearTimeout(this.t); this.t = setTimeout(() => { this.t = 0; this.push(); }, P.cloud ? LB_SYNC_MS : 2500); },
  // Save a pending total now (end of a quiz, app going to the background).
  flushSoon(ms = 1200) { if (!this.t) return; clearTimeout(this.t); this.t = setTimeout(() => { this.t = 0; this.push(); }, ms); },
  async push() {
    if (!this.canShare()) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    const ref = P.cdb.doc('lb/' + P.uid);
    try {
      if (U.s.lb.hide || U.s.pts.total <= 0) await ref.delete();
      else await ref.set(clone(this.myEntry()));
    } catch (e) {
      if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'permission-denied', 'unauthenticated'].includes(e.code)) this.denied = true;
    } finally { this.busy = false; if (this.again) { this.again = false; this.push(); } }
  },
  subscribe() {
    if (!P.cdb) return;
    this.state = 'loading';
    const refresh = () => { if (['leaders', 'home', 'profile', 'admin-rewards'].includes(route)) scheduleRender(); };
    try {
      if (P.cloud) this.state = 'ok';   // boards load on demand: ensure()
      else P.cdb.collection('lb').onSnapshot(snap => {
        this.entries = snap.docs.map(d => ({ ...d.data(), u: d.id })).filter(e => typeof e.n === 'string');
        this.state = 'ok'; refresh();
      }, () => { this.state = 'error'; refresh(); });
      (P.cloud ? P.cdb.collection('pub/winners/items').orderBy('at', 'desc').limit(8) : P.cdb.collection('pub/winners/items')).onSnapshot(snap => {
        this.winners = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(w => Array.isArray(w.top) && (w.kind === 'week' || w.kind === 'month'));
        this.checkWon(); refresh();
      }, () => { /* winners are optional */ });
      P.cdb.doc('pub/settings/items/rewards').onSnapshot(s => { if (s.exists) this.settings = { ...this.settings, ...s.data() }; refresh(); }, () => { /* optional */ });
      P.cdb.doc('pub/settings/items/lbhide').onSnapshot(s => { const u = s.exists ? (s.data() || {}).uids : null; this.hidden = Array.isArray(u) ? u : []; refresh(); }, () => { /* optional */ });
    } catch { this.state = 'error'; }
  },
  loadLocal() {
    this.settings = { ...this.settings, ...obj(LS.get('lb.settings', {}), {}) };
    this.winners = (LS.get('lb.winners', []) || []).filter(w => w && Array.isArray(w.top));
    this.hidden = LS.get('lb.hidden', []) || [];
    this.state = 'ok';
  },
  // Tester build only: clearly labelled example students so the boards can be tried out.
  samples() {
    const t = todayISO(), wk = weekKey(t), lw = addDays(wk, -7), mo = monthKey(t), lm = prevMonthKey(mo);
    const daysIn = (parseISO(t).getDay() + 6) % 7 + 1;
    return SAMPLE_NAMES.map(([hi, en], i) => {
      const r = rng('sample:' + i + ':' + wk), r2 = rng('sample:' + i + ':' + lw);
      const wp = Math.round((40 + r() * 110) * daysIn * (0.5 + r()));
      const pwp = Math.round((40 + r2() * 110) * 7 * (0.5 + r2()));
      return { u: 'sample-' + i, sample: true, n: `${L(hi, en)} ${L('(उदाहरण)', '(sample)')}`, wk, wp, pw: lw, pwp, mo, mp: wp + Math.round(pwp * 0.8), pm: lm, pmp: Math.round(pwp * 3.4), tp: pwp * 6 };
    });
  },
  pool(kind) { return P.demo ? this.samples() : P.cloud ? (this.cloud.docs[kind] || []) : P.cdb ? this.entries : []; },
  loaded(kind) { return !P.cloud || !!this.cloud.at[kind]; },
  // Fetch a board's top students when a screen needs it (at most every 2 minutes per board).
  ensure(kinds, top = LB_TOP) {
    if (!P.cloud || !P.cdb || !P.uid) return;
    for (const kind of kinds) {
      const c = this.cloud;
      if (c.busy[kind] || (Date.now() - (c.at[kind] || 0) < LB_FRESH_MS && (c.top[kind] || 0) >= top)) continue;
      c.busy[kind] = true;
      this.fetchKind(kind, top)
        .then(docs => { c.docs[kind] = docs; c.top[kind] = top; this.state = 'ok'; })
        .catch(() => { this.state = 'error'; })
        .finally(() => { c.at[kind] = Date.now(); c.busy[kind] = false; scheduleRender(); });
    }
  },
  async fetchKind(kind, top) {
    const t = todayISO(), wk = weekKey(t), lw = addDays(wk, -7), mo = monthKey(t), lm = prevMonthKey(mo);
    const q = (key, val, pts) => P.cdb.collection('lb').where(key, '==', val).orderBy(pts, 'desc').limit(top).get();
    const snaps = kind === 'week' ? [await q('wk', wk, 'wp')]
      : kind === 'month' ? [await q('mo', mo, 'mp')]
        : kind === 'lastweek' ? await Promise.all([q('wk', lw, 'wp'), q('pw', lw, 'pwp')])
          : await Promise.all([q('mo', lm, 'mp'), q('pm', lm, 'pmp')]);
    const map = new Map();
    for (const s of snaps) for (const d of s.docs) map.set(d.id, { ...d.data(), u: d.id });
    return [...map.values()].filter(e => typeof e.n === 'string');
  },
  board(kind) {
    const t = todayISO(), wk = weekKey(t), lw = addDays(wk, -7), mo = monthKey(t), lm = prevMonthKey(mo);
    const val = e => (kind === 'week' ? (e.wk === wk ? e.wp : 0)
      : kind === 'lastweek' ? (e.wk === lw ? e.wp : e.pw === lw ? e.pwp : 0)
        : kind === 'month' ? (e.mo === mo ? e.mp : 0)
          : (e.mo === lm ? e.mp : e.pm === lm ? e.pmp : 0));
    const me = this.myId();
    const rows = this.pool(kind).filter(e => e.u !== me && !this.hidden.includes(e.u))
      .map(e => ({ u: e.u, n: this.display(e), raw: String(e.n || '').slice(0, 30), p: Math.max(0, Number(val(e)) || 0), sample: !!e.sample }));
    if (!U.s.lb.hide) rows.push({ u: me, n: this.myName(), raw: this.pubName(), p: val(this.myEntry()), me: true });
    const list = rows.filter(r => r.p > 0 || r.me).sort((a, b) => b.p - a.p || (a.me ? -1 : b.me ? 1 : a.n.localeCompare(b.n)));
    let rank = 0, prev = null;
    list.forEach((r, i) => { if (r.p !== prev) { rank = i + 1; prev = r.p; } r.rank = r.p > 0 ? rank : null; });
    // Self-hosted: only the top students are read, so below them a learner's exact rank is unknown ("50+").
    const got = (this.cloud.docs[kind] || []).length, cap = this.cloud.top[kind] || LB_TOP;
    if (P.cloud && got >= cap) { const mine = list.find(r => r.me); if (mine && mine.rank && mine.rank > cap) { mine.beyond = true; mine.rank = cap + 1; } }
    return list;
  },
  myRank(kind) { if (!this.loaded(kind)) return null; const r = this.board(kind).find(x => x.me); return r && r.rank && !r.beyond ? r.rank : null; },
  winnersFor(kind) { return this.winners.filter(w => w.kind === kind).sort((a, b) => String(b.key).localeCompare(String(a.key))); },
  checkWon() {
    const me = this.myId();
    if (!U.s.won && this.winners.some(w => (w.top || []).slice(0, 3).some(x => x && x.u === me))) { U.s.won = true; U.checkBadges(); U.touch(); }
  },
  async saveSettings(s) {
    this.settings = { ...this.settings, ...s };
    if (P.cdb) await P.cdb.doc('pub/settings/items/rewards').set(clone(this.settings));
    else LS.set('lb.settings', this.settings);
    bump();
  },
  async setHidden(u, hide) {
    const set = new Set(this.hidden);
    if (hide) set.add(u); else set.delete(u);
    this.hidden = [...set];
    if (P.cdb) await P.cdb.doc('pub/settings/items/lbhide').set({ uids: this.hidden });
    else LS.set('lb.hidden', this.hidden);
    bump();
  },
  announceKey(kind) { const t = todayISO(); return kind === 'week' ? addDays(weekKey(t), -7) : prevMonthKey(monthKey(t)); },
  async announce(kind) {
    const key = this.announceKey(kind);
    const top = this.board(kind === 'week' ? 'lastweek' : 'lastmonth').filter(e => e.p > 0 && (P.demo || !e.sample)).slice(0, 10).map(e => ({ u: e.u, n: e.raw, p: e.p }));
    const s = this.settings;
    const doc = { kind, key, top, prize: kind === 'week' ? s.weekPrize : s.monthPrize, prizeEn: kind === 'week' ? s.weekPrizeEn : s.monthPrizeEn, at: Date.now() };
    const id = (kind === 'week' ? 'w-' : 'm-') + key;
    if (P.cdb) await P.cdb.doc('pub/winners/items/' + id).set(clone(doc));
    else { this.winners = [...this.winners.filter(w => w.id !== id), { ...doc, id }]; LS.set('lb.winners', this.winners); }
    this.checkWon();
    bump();
    return top;
  },
  msToWeekEnd() { return parseISO(addDays(weekKey(todayISO()), 7)) - Date.now(); },
  msToMonthEnd() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1) - n; },
};

