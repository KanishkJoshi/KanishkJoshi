// ───────────────────────────── quiz sessions ─────────────────────────────
let S = null; // active practice session; titles are [hindi, english] pairs
function pick(pool, n, seed) {
  const r = seed ? rng(seed) : Math.random;
  const unseen = [], wrong = [], rest = [];
  for (const q of shuffle(pool, r)) { const a = U.s.ans[q.id]; if (!a) unseen.push(q); else if (!a.l) wrong.push(q); else rest.push(q); }
  return [...unseen, ...wrong, ...rest].slice(0, n || pool.length);
}
function startSession(kind, title, questions, opts = {}) {
  const qs = (questions || []).filter(Boolean);
  if (!qs.length) { toast(L('इस सेट में अभी कोई प्रश्न नहीं है।', 'There are no questions in this set yet.'), 'info'); return; }
  const seed = rid();
  S = { kind, title: Array.isArray(title) ? title : [title, title], back: opts.back || 'quiz', timed: !!opts.timed, qs: qs.map(q => presentQ(q, seed)), i: 0, ans: {}, startedAt: Date.now(), shownAt: Date.now(), ai: {}, done: false, pts: 0, bonus: [] };
  closeSheet();
  go('play');
}
const sTitle = () => (S ? L(S.title[0], S.title[1]) : '');
function dailyQuestions() {
  const t = todayISO(), m = M();
  if (U.s.dailySet && U.s.dailySet.date === t) {
    const qs = U.s.dailySet.ids.map(id => m.byId.get(id)).filter(Boolean);
    if (qs.length >= 5) return qs;
  }
  const ca = (m.bySubj.ca || []).slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)));
  const caPick = pick(ca.slice(0, 8), 3, 'daily-ca:' + t);
  const dayPick = pick(m.all.filter(q => q.day === t.slice(5)), 2, 'daily-day:' + t);
  const used = new Set([...caPick, ...dayPick].map(q => q.id));
  const rest = pick(m.qs.filter(q => q.s !== 'ca' && !used.has(q.id)), 10 - caPick.length - dayPick.length, 'daily-bank:' + t);
  const qs = shuffle([...caPick, ...dayPick, ...rest], rng('daily:' + t));
  U.s.dailySet = { date: t, ids: qs.map(q => q.id) };
  U.touch();
  return qs;
}
function answer(sel) {
  if (!S) return;
  const q = S.qs[S.i];
  if (!q || S.ans[q.id]) return;
  const ok = sel === q.a;
  const earned = U.record(q, ok, { timed: S.timed });
  S.ans[q.id] = { sel, ok, ms: Date.now() - S.shownAt, pts: earned };
  S.pts += earned;
  S.bonus.push(...(U.lastBonus || []));
  render();
  const o = qO(q);
  announce(sel === -1 ? L('समय समाप्त', 'Time is up') : ok ? L('सही उत्तर', 'Correct') : L(`गलत उत्तर। सही उत्तर है ${o[q.a]}`, `Wrong. The correct answer is ${o[q.a]}`));
  const ex = $('.explain');
  if (ex) ex.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
}
function nextQ() {
  if (!S) return;
  if (S.i < S.qs.length - 1) { S.i++; S.shownAt = Date.now(); render(); window.scrollTo(0, 0); }
  else finishSession();
}
function finishSession() {
  if (!S) return;
  S.done = true; S.endedAt = Date.now();
  if (S.kind === 'daily') {
    const ok = S.qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
    U.s.daily[todayISO()] = { score: ok, total: S.qs.length };
    if (U.once('daily')) { const n = U.award('daily', PTS.daily); if (n) { S.pts += n; S.bonus.push(['daily', n]); } }
    if (ok === S.qs.length && S.qs.length >= 5 && U.once('perfect')) { const n = U.award('perfect', PTS.perfect); if (n) { S.pts += n; S.bonus.push(['perfect', n]); } }
    U.checkBadges();
    U.touch();
    LB.queue();
  }
  go('result');
}

// ───────────────────────────── mock exams ─────────────────────────────
let E = (() => { const e = LS.get('exam', null); return e && Array.isArray(e.qs) && e.st && !e.submitted ? e : null; })();
let lastExam = LS.get('lastExam', null);
const saveExam = () => { if (E) LS.set('exam', E); };
const examTitle = ex => { const mk = MOCKS.find(m => m.id === (ex && ex.id)); return mk ? mockTitle(mk) : (ex && ex.title) || ''; };
function mockQuestionIds(mk) {
  const m = M(), ids = [];
  for (const [s, n] of Object.entries(mk.mix)) {
    let pool = m.bySubj[s] || [];
    pool = mk.latest ? pool.slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)) || a.id.localeCompare(b.id)).slice(0, n)
      : shuffle(pool.slice().sort((a, b) => a.id.localeCompare(b.id)), rng(mk.id + ':' + s)).slice(0, n);
    ids.push(...pool.map(q => q.id));
  }
  return ids;
}
function examQ(id, ex = E) { const q = M().byId.get(id); return q ? presentQ(q, ex.seed) : null; }
function startExam(id) {
  const mk = MOCKS.find(x => x.id === id);
  if (!mk) return;
  const ids = mockQuestionIds(mk);
  if (ids.length < 5) { toast(L('इस परीक्षा के लिए पर्याप्त प्रश्न नहीं हैं।', 'There are not enough questions for this test.'), 'err'); return; }
  const now = Date.now();
  E = { id: mk.id, pos: mk.pos, neg: mk.neg, qs: ids, i: 0, st: { [ids[0]]: { v: true } }, startedAt: now, endsAt: now + mk.mins * 60000, seed: 'exam:' + now, submitted: false };
  saveExam();
  closeSheet();
  go('exam');
}
function examMove(i) {
  if (!E) return;
  E.i = clamp(i, 0, E.qs.length - 1);
  const id = E.qs[E.i];
  E.st[id] = { ...(E.st[id] || {}), v: true };
  saveExam();
  render();
  window.scrollTo(0, 0);
}
function examCounts(ex = E) {
  let ans = 0, na = 0, mk = 0, nv = 0;
  for (const id of ex.qs) { const s = ex.st[id] || {}; if (s.mk) mk++; if (s.sel != null) ans++; else if (s.v) na++; else nv++; }
  return { ans, na, mk, nv };
}
function examResult(ex) {
  let c = 0, w = 0, u = 0;
  const bySubj = {};
  for (const id of ex.qs) {
    const q = examQ(id, ex);
    if (!q) continue;
    const s = ex.st[id] || {};
    const b = bySubj[q.s] = bySubj[q.s] || { c: 0, w: 0, u: 0, n: 0 };
    b.n++;
    if (s.sel == null) { u++; b.u++; } else if (s.sel === q.a) { c++; b.c++; } else { w++; b.w++; }
  }
  const score = Math.round((c * ex.pos - w * ex.neg) * 100) / 100;
  return { c, w, u, n: ex.qs.length, score, max: ex.qs.length * ex.pos, bySubj, timeSec: Math.round(((ex.submittedAt || Date.now()) - ex.startedAt) / 1000) };
}
function submitExam(auto = false) {
  if (!E || E.submitted) return;
  E.submitted = true;
  E.submittedAt = Math.min(Date.now(), E.endsAt);
  const R = examResult(E);
  let pts = 0;
  for (const id of E.qs) { const s = E.st[id]; if (s && s.sel != null) { const q = examQ(id); if (q) pts += U.record(q, s.sel === q.a); } }
  const bonus = U.once('mock:' + E.id) ? U.award('mock', Math.max(0, Math.round(R.score)) * PTS.mockX) : 0;
  R.pts = pts + bonus; R.bonus = bonus;
  U.s.mocks.unshift({ id: E.id, title: E.title || '', date: todayISO(), score: R.score, max: R.max, c: R.c, w: R.w, u: R.u, timeSec: R.timeSec });
  U.s.mocks = U.s.mocks.slice(0, 30);
  U.checkBadges();
  U.touch();
  LB.queue();
  lastExam = { ...R, ex: clone(E) };
  LS.set('lastExam', lastExam);
  LS.del('exam');
  E = null;
  closeSheet();
  go('exam-result');
  if (auto) toast(L('समय समाप्त — परीक्षा अपने-आप सबमिट हो गई', 'Time is up: the test was submitted automatically'), 'info');
}

