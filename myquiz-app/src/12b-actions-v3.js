// ───────────────────────────── v3 actions ─────────────────────────────
const herePath = () => route + (routeArg ? '/' + routeArg : '');
const chTitle = id => (CHM[id] ? [CHM[id].hi, CHM[id].en] : ['अध्याय', 'Chapter']);
function practise(kind, title, list, opts = {}) {
  const pool = diffPool(list).length ? diffPool(list) : list;
  startSession(kind, title, pick(pool, opts.n || U.s.set.count || 10), { back: opts.back || herePath(), ch: opts.ch, timed: U.s.set.mode === 'timed' });
}
function reviewCard(id, known) {
  const t = todayISO(), a = U.s.ans[id] || { c: 0, w: 0, b: 0 };
  a.b = known ? Math.min(SRS_GAPS.length - 1, (a.b || 0) + 1) : 0;
  a.l = known ? 1 : 0; a.due = addDays(t, SRS_GAPS[a.b]); a.fc = (a.fc || 0) + 1; a.t = Date.now();
  U.s.ans[id] = a; U.touch();
}
function finishOnboarding() {
  const name = String(onb.name || '').trim().slice(0, 40);
  if (name) U.s.name = name;
  U.s.exam = onb.exam || U.s.exam || 'gk';
  U.s.goal = [10, 20, 30].includes(Number(onb.goal)) ? Number(onb.goal) : U.s.goal || 10;
  U.s.onb = true; U.touch(); LB.queue();
}
Object.assign(ACTIONS, {
  nav: el => go(el.dataset.to || 'home'),
  'retry-load': () => { C.baseState = 'loading'; render(); loadBase(); },
  'set-exam': el => { U.s.exam = el.dataset.v; learnState.ex = null; U.touch(); render(); },
  resume: () => { if (!resumeSession()) toast(L('पिछला सत्र अब उपलब्ध नहीं है।', 'The previous session is no longer available.'), 'info'); },
  'set-diff': el => { U.s.set.diff = Number(el.dataset.v) || 0; U.touch(); render(); },
  'learn-ex': el => { learnState.ex = el.dataset.v; render(); },
  'start-subject': el => { const k = el.dataset.s, sj = SUBJ[k]; practise('subject', [sj.name, sj.en], M().bySubj[k] || [], { back: 'subject/' + k }); },
  'practice-ch': el => { const id = el.dataset.ch; practise('chapter', chTitle(id), M().byCh[id] || [], { ch: id, back: route === 'home' ? 'home' : 'chapter/' + id }); },
  'practice-topic': el => {
    const ch = el.dataset.ch, t = el.dataset.t || '', list = (M().byCh[ch] || []).filter(q => (q.t || '') === t);
    const en = (list[0] && list[0].en && list[0].en.t) || t;
    practise('topic', [t || chTitle(ch)[0], en || chTitle(ch)[1]], list.length ? list : M().byCh[ch] || [], { ch });
  },
  'practice-related': el => {
    const q = (S && S.qs.find(x => x.id === el.dataset.id)) || M().byId.get(el.dataset.id);
    if (!q) return;
    const same = (M().byCh[chOf(q)] || []).filter(x => x.id !== q.id);
    const topic = same.filter(x => (x.t || '') === (q.t || ''));
    startSession('related', [`जुड़े प्रश्न: ${chTitle(chOf(q))[0]}`, `Related: ${chTitle(chOf(q))[1]}`], pick(topic.length >= 3 ? topic : same, 5), { back: (S && S.back) || 'learn', ch: chOf(q) });
  },
  'practice-mistakes': () => {
    const m = M(), qs = Object.entries(U.s.ans).filter(([id, a]) => !a.l && m.byId.has(id)).sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).slice(0, 20).map(([id]) => m.byId.get(id));
    if (!qs.length) { toast(L('अभी कोई गलती नहीं — बढ़िया!', 'No mistakes to revisit — great!'), 'info'); return; }
    startSession('revision', ['गलतियों का अभ्यास', 'Practise your mistakes'], shuffle(qs), { back: herePath() });
  },
  'open-q': el => { const q = M().byId.get(el.dataset.id); if (q) startSession('single', ['प्रश्न अभ्यास', 'Question practice'], [q], { back: herePath(), ch: chOf(q) }); },
  'exam-pool': el => {
    const m = M(), ch = el.dataset.ch, s = el.dataset.s;
    const list = diffPool(ch ? m.byCh[ch] || [] : m.bySubj[s] || []);
    const ids = pick(list, 20).map(q => q.id);
    const title = ch ? chTitle(ch).map((x, i) => `${x} · ${i ? 'test' : 'टेस्ट'}`) : [`${SUBJ[s].name} · टेस्ट`, `${SUBJ[s].en} · test`];
    startExamWith({ title, ids, mins: Math.max(5, Math.ceil(ids.length * 0.6)), pos: 1, neg: 0.25, back: herePath() });
  },
  'cards-start': el => { const src = el.dataset.src || 'due'; FC = { src, ids: deckFor(src), i: 0, flip: false, known: 0, forgot: 0 }; if (route === 'cards') { render(); window.scrollTo(0, 0); } else go('cards'); },
  'card-flip': () => { if (FC) { FC.flip = true; render(); } },
  'card-grade': el => {
    if (!FC) return;
    const known = el.dataset.v === '1', id = FC.ids[FC.i];
    if (id) reviewCard(id, known);
    if (known) FC.known++; else FC.forgot++;
    FC.i++; FC.flip = false; render();
  },
  'start-wchal': () => { const wk = weekKey(todayISO()); startExamWith({ kind: 'wchal', id: 'wchal-' + wk, title: ['साप्ताहिक चुनौती', 'Weekly challenge'], ids: wchalIds(wk), mins: 10, pos: 1, neg: 0.25, seed: 'wchal:' + wk, meta: { wk }, back: 'compete' }); },
  'friend-new': () => {
    const m = M(), pool = exPool(m.qs, U.s.exam || 'gk');
    startExamWith({ kind: 'friend', id: 'friend', title: ['दोस्त के लिए चुनौती', 'Challenge for a friend'], ids: shuffle(pool.length >= 10 ? pool : m.qs).slice(0, 10).map(q => q.id), mins: 5, pos: 1, neg: 0, back: 'compete', meta: { create: true } });
  },
  'friend-accept': el => {
    const x = readChallenge(el.dataset.code);
    if (!x) { toast(L('यह चुनौती कोड सही नहीं है।', 'This challenge code is not valid.'), 'err'); return; }
    startExamWith({ kind: 'friend', id: 'friend', title: [`${x.n || 'दोस्त'} की चुनौती`, `${x.n || 'Friend'}'s challenge`], ids: x.ids, mins: 5, pos: 1, neg: 0, back: 'compete', meta: { opp: x } });
  },
  'friend-share': () => {
    const R = lastExam;
    if (!R || !R.ex) return;
    const code = b64e({ v: 1, n: U.s.name.trim().split(/\s+/)[0] || LB.myName(), ids: R.ex.qs, sc: R.score, max: R.max, sec: R.timeSec });
    shareText(challengeText(code, R));
  },
  'share-achv': () => {
    const lv = levelOf(U.s.pts.total), got = BADGES.filter(b => U.s.badges[b.id]).map(b => L(b.hi, b.en));
    shareText(L(`🏅 MY QUIZ पर मैं स्तर ${lv.lvl} पर हूँ — ${fmtNum(U.s.pts.total)} पॉइंट्स, ${U.streak()} दिन की स्ट्रीक। मेरे बैज: ${got.join(', ')}।`, `🏅 I'm at Level ${lv.lvl} on MY QUIZ — ${fmtNum(U.s.pts.total)} points and a ${U.streak()}-day streak. My badges: ${got.join(', ')}.`));
  },
  'exam-retake': () => { const x = lastExam && lastExam.ex; if (x) startExamWith({ id: x.id, kind: x.kind === 'wchal' ? 'wchal' : x.kind === 'friend' ? 'friend' : 'custom', title: x.title, ids: x.qs, mins: Math.max(1, Math.round((x.endsAt - x.startedAt) / 60000)), pos: x.pos, neg: x.neg, back: x.back, meta: x.meta, seed: x.kind === 'wchal' ? x.seed : undefined }); },
  'ai-notes': el => aiNotes(el.dataset.ch),
  'notes-ch': el => go('notes/' + el.dataset.ch),
  print: () => { try { window.print(); } catch { toast(L('प्रिंट उपलब्ध नहीं है — टेक्स्ट कॉपी करें।', 'Printing is not available here — copy the text instead.'), 'info'); } },
  'notes-copy': el => copyText(notesText(el.dataset.ch), L('नोट्स कॉपी हुए', 'Notes copied')),
  'notes-copy-ai': () => { const b = $('#ai-notes'); if (b) copyText(b.textContent, L('नोट्स कॉपी हुए', 'Notes copied')); },
  tutor: el => { const q = (S && S.qs.find(x => x.id === el.dataset.id)) || M().byId.get(el.dataset.id); if (q) openTutor(q); },
  'tutor-ask': el => tutorAsk(el.dataset.v),
  // onboarding
  'wz-next': () => { if (WZ.step === 0) { const i = $('#wz-name'); if (i) onb.name = i.value; } WZ.step = Math.min(3, WZ.step + 1); render(); window.scrollTo(0, 0); },
  'wz-back': () => { WZ.step = Math.max(0, WZ.step - 1); render(); },
  'wz-exam': el => { onb.exam = el.dataset.v; render(); },
  'wz-goal': el => { onb.goal = Number(el.dataset.v); render(); },
  'wz-finish': () => { finishOnboarding(); go('home'); toast(L('आपकी योजना तैयार है — शुरू करें!', 'Your plan is ready — let\'s begin!')); },
  'start-assess': () => { finishOnboarding(); startSession('assess', ['स्तर जाँच', 'Level check'], assessQuestions(), { back: 'home' }); },
  'bld-s': el => { BLD.s = el.dataset.v; BLD.ch = ''; render(); },
  'bld-d': el => { BLD.d = Number(el.dataset.v) || 0; render(); },
  'bld-n': el => { BLD.n = Number(el.dataset.v) || 10; render(); },
  'bld-mins': el => { BLD.mins = Number(el.dataset.v) || 10; render(); },
  'bld-mk': el => { BLD.mk = Number(el.dataset.v) || 0; render(); },
  'bld-start': () => {
    const mk = MARKING[BLD.mk] || MARKING[0], ids = pick(builderPool(), BLD.n).map(q => q.id);
    const name = BLD.ch ? chTitle(BLD.ch) : BLD.s ? [SUBJ[BLD.s].name, SUBJ[BLD.s].en] : ['मिश्रित', 'Mixed'];
    startExamWith({ title: [`आपका टेस्ट: ${name[0]}`, `Your test: ${name[1]}`], ids, mins: BLD.mins, pos: mk[0], neg: mk[1], back: 'builder' });
  },
});
Object.assign(CHANGES, { 'bld-ch': el => { BLD.ch = el.value; render(); } });
Object.assign(FORMS, {
  'challenge-code': f => {
    const raw = String(($('#ch-code', f) || {}).value || '').trim();
    const code = (raw.match(/challenge\/([A-Za-z0-9_-]+)/) || [])[1] || (raw.match(/[A-Za-z0-9_-]{24,}/) || [])[0] || '';
    if (!code || !readChallenge(code)) { toast(L('यह चुनौती कोड सही नहीं है।', 'This challenge code is not valid.'), 'err'); return; }
    go('challenge/' + code);
  },
  tutor: f => { const i = $('#tutor-in', f); const v = i ? i.value : ''; if (i) i.value = ''; tutorAsk(v); },
});
// Current affairs and Aaj ka Din (views in 10e-v3-daily.js)
Object.assign(ACTIONS, {
  'ca-tab': el => { caTab = el.dataset.v; render(); },
  'ca-range-quiz': el => { const qs = caQs(caRange(el.dataset.v)); startSession('ca', el.dataset.v === 'week' ? ['साप्ताहिक करेंट अफेयर्स क्विज', 'Weekly current affairs quiz'] : ['मासिक करेंट अफेयर्स क्विज', 'Monthly current affairs quiz'], shuffle(qs).slice(0, 20), { back: 'ca' }); },
  tts: el => { if (TTS.on) { stopSpeak(); return; } const n = M().newsById.get(el.dataset.id); if (n) speak(articleText(n)); },
  'today-five': () => { const qs = todayFive(todayISO()).filter(Boolean); startSession('today5', ['आज का दिन · 5 प्रश्न', 'Today in History · 5 questions'], qs, { back: 'today' }); },
  'bm-d': el => { const added = U.toggleBm('d', el.dataset.id); toast(added ? L('दिवस सहेजा गया', 'Day saved') : L('सहेजे गए दिवसों से हटाया गया', 'Removed from saved days')); render(); },
  'share-day': el => { const d = M().days.find(x => x.id === el.dataset.id); if (d) shareText(`📅 ${fmtMD(d.md)} — ${dT(d)}\n${dH(d)}\n${dF(d).map(f => '• ' + f).join('\n')}\n— MY QUIZ ${L('आज का दिन', 'Today in History')}`); },
});
