// ───────────────────────────── v3: home dashboard, learn tree, revision, compete, progress, onboarding ─────────────────────────────
const learnState = { ex: null };          // exam filter on Learn (null = the learner's exam)
const diffPool = list => (U.s.set.diff ? list.filter(q => (q.d || 1) === U.s.set.diff) : list);
const exPool = (list, ex) => (ex && ex !== 'all' ? list.filter(q => examsOf(q).includes(ex)) : list);
const mLabel = lvl => `<span class="mlabel l${lvl}">${esc(L(MASTERY[lvl][0], MASTERY[lvl][1]))}</span>`;
const qState = q => { const a = U.s.ans[q.id]; return !a ? ['', 'help', L('अभी नहीं किया', 'Not tried')] : a.l ? ['ok', 'check', L('पिछली बार सही', 'Right last time')] : ['bad', 'x', L('पिछली बार गलत', 'Wrong last time')]; };
const dataAttrs = d => Object.entries(d || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
const diffChips = () => `<div class="chips" role="group" aria-label="${L('कठिनाई', 'Difficulty')}">${[0, 1, 2, 3].map(d => `<button class="chip" data-act="set-diff" data-v="${d}" aria-pressed="${(U.s.set.diff || 0) === d}">${d ? esc(diffLabel(d)) : L('सभी स्तर', 'All levels')}</button>`).join('')}</div>`;

// The single most useful thing to do next.
function nextChapter() {
  const ex = U.s.exam || 'gk';
  const rel = CHAPTERS.filter(c => c.s !== 'days' && c.ex.includes(ex) && (M().byCh[c.id] || []).length);
  const st = rel.map(c => ({ c, s: U.chStats(c.id) }));
  const started = st.filter(x => x.s.seen && x.s.cov < 100).sort((a, b) => b.s.cov - a.s.cov)[0];
  const fresh = st.find(x => !x.s.seen);
  return (started || fresh || {}).c || null;
}
function nextAction() {
  const t = todayISO();
  if (E && !E.submitted) return { title: L('आपकी परीक्षा अधूरी है', 'Your test is unfinished'), sub: examTitle(E), cta: L('परीक्षा जारी रखें', 'Resume test'), act: 'exam-resume' };
  const sv = savedSession();
  if (sv) return { title: L('जहाँ छोड़ा था, वहीं से शुरू करें', 'Pick up where you left off'), sub: `${L(sv.title[0], sv.title[1])} · ${Object.keys(sv.ans || {}).length}/${sv.ids.length} ${L('हल किए', 'done')}`, cta: L('जारी रखें', 'Continue'), act: 'resume' };
  if (!U.s.daily[t] && C.baseState === 'ok') return { title: L('आज की दैनिक चुनौती', 'Today\'s daily challenge'), sub: L(`10 प्रश्न · लगभग 5 मिनट · पूरा करने पर +${PTS.daily} पॉइंट्स`, `10 questions · about 5 minutes · +${PTS.daily} points when done`), cta: L('चुनौती शुरू करें', 'Start the challenge'), act: 'start-daily' };
  const due = U.due().length;
  if (due) return { title: L(`${due} प्रश्न दोहराने का समय आ गया`, `${due} questions are due for revision`), sub: L('सही समय पर दोहराने से याद लंबे समय तक रहती है।', 'Revising at the right time makes learning stick.'), cta: L('दोहराव शुरू करें', 'Start revision'), act: 'start-revision' };
  const weak = U.weakTopics(1)[0];
  if (weak) return { title: L(`कमज़ोर विषय: ${weak.t}`, `Weak topic: ${weak.tEn}`), sub: L(`सटीकता ${weak.acc}% — इसे मज़बूत करें`, `${weak.acc}% accuracy — let's strengthen it`), cta: L('अभ्यास करें', 'Practise'), act: 'practice-topic', data: { ch: weak.ch, t: weak.t } };
  const ch = nextChapter();
  if (ch) return { title: L(`अगला अध्याय: ${ch.hi}`, `Next chapter: ${ch.en}`), sub: `${subjName(ch.s)} · ${U.chStats(ch.id).cov}% ${L('पूरा', 'done')}`, cta: L('अभ्यास करें', 'Practise'), act: 'practice-ch', data: { ch: ch.id } };
  return { title: L('बहुत बढ़िया — आज का काम पूरा!', 'Great — today\'s work is done!'), sub: L('एक मॉक टेस्ट से अपनी तैयारी परखें।', 'Test yourself with a mock exam.'), cta: L('मॉक टेस्ट देखें', 'See mock tests'), act: 'nav', data: { to: 'mock' } };
}
function recommendations(skip) {
  const out = [], t = todayISO(), m = M();
  const add = (icon, title, sub, act, data) => { if (act !== skip && out.length < 4) out.push({ icon, title, sub, act, data }); };
  const due = U.due().length;
  if (due) add('rotate', L(`${due} प्रश्नों का दोहराव`, `Revise ${due} questions`), L('स्पेस्ड रिपीटिशन से याद पक्की करें', 'Spaced repetition makes it stick'), 'start-revision');
  for (const w of U.weakTopics(2)) add('target', L(`कमज़ोर: ${w.t}`, `Weak: ${w.tEn}`), `${chName(w.ch)} · ${L('सटीकता', 'accuracy')} ${w.acc}%`, 'practice-topic', { ch: w.ch, t: w.t });
  const ch = nextChapter();
  if (ch) add('layers', L(`अध्याय: ${ch.hi}`, `Chapter: ${ch.en}`), `${subjName(ch.s)} · ${examLabel(U.s.exam || 'gk')} ${L('के लिए', 'relevant')}`, 'nav', { to: 'chapter/' + ch.id });
  const wk = weekKey(t);
  if (!U.s.wc[wk] && C.baseState === 'ok') add('swords', L('साप्ताहिक चुनौती', 'Weekly challenge'), L('सबके लिए एक जैसे 15 प्रश्न · एक प्रयास', 'The same 15 questions for everyone · one attempt'), 'nav', { to: 'compete' });
  if ((m.bySubj.ca || []).length) add('newspaper', L('करेंट अफेयर्स क्विज', 'Current affairs quiz'), L('नवीनतम ख़बरों से 10 प्रश्न', '10 questions from the latest news'), 'start-ca');
  return out;
}
const recRow = r => `<button class="row" data-act="${r.act}"${dataAttrs(r.data)}><span class="row-ic" style="--c:var(--brand)">${ic(r.icon)}</span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(r.title)}</span><span class="row-sub">${esc(r.sub)}</span></span>${ic('chev-right', 'chev')}</button>`;

function vHome() {
  const m = M(), t = todayISO(), s = U.s;
  const name = s.name.trim(), goal = s.goal || 10, cnt = U.todayCount(), st = U.streak();
  const na = nextAction();
  const wk = weekKey(t), ws = U.rangeStats(wk, addDays(wk, 6)), rank = LB.myRank('week');
  const recent = s.recent.filter(r => (m.byCh[r.ch] || []).length).slice(0, 5);
  const weak = U.weakTopics(3);
  const caToday = m.news.filter(n => n.date === t).length, dayToday = (m.daysByMd[t.slice(5)] || [])[0];
  return `${topbar(`${capLogo()}<span>MY <span class="q">QUIZ</span></span>`)}
<section class="welcome"><div class="gutter"><h2>${L('नमस्कार', 'Hello')}${name ? `, ${esc(name)}` : ''}!</h2><p>${s.exam ? `${esc(examLabel(s.exam))} ${L('की तैयारी', 'preparation')} · ` : ''}${L(`रोज़ ${goal} प्रश्न का लक्ष्य`, `goal: ${goal} questions a day`)}</p></div></section>
<main class="page gutter dash">
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <section class="card next" aria-label="${L('आपका अगला क़दम', 'Your next step')}">
    <span class="k">${L('आपका अगला क़दम', 'Your next step')}</span>
    <h3>${esc(na.title)}</h3><p>${esc(na.sub)}</p>
    <div class="ringbox" role="img" aria-label="${L(`आज ${goal} में से ${cnt} प्रश्न`, `${cnt} of ${goal} questions today`)}">${ring(cnt / goal, 76, 7, cnt >= goal ? 'var(--ok-solid)' : 'var(--ring)')}<b class="tnum">${Math.min(cnt, 999)}<small>/ ${goal}</small></b></div>
    <button class="btn btn-cta btn-block" data-act="${na.act}"${dataAttrs(na.data)} ${C.baseState === 'loading' ? 'disabled' : ''}>${esc(na.cta)} ${ic('arrow-right')}</button>
    <div class="meta-row"><span>${ic('flame')} <b>${st}</b> ${L('दिन की स्ट्रीक', 'day streak')}</span><span>${ic('coins')} <b>${fmtNum(U.ptsToday())}</b> ${L('पॉइंट्स आज', 'points today')}</span></div>
  </section>
  <section class="sec" aria-label="${L('यह सप्ताह', 'This week')}">
    <div class="sec-head"><h2 class="sec-title">${ic('chart')} ${L('यह सप्ताह', 'This week')}</h2><a class="link" href="#progress">${L('पूरी प्रगति', 'Full progress')} ${ic('chev-right')}</a></div>
    <div class="card">${weekBars(true)}<div class="meta-row" style="margin-top:8px"><span><b>${ws.n}</b> ${L('प्रश्न', 'questions')}</span><span><b>${ws.acc}%</b> ${L('सटीकता', 'accuracy')}</span><span><b>${fmtNum(ws.pts)}</b> ${L('पॉइंट्स', 'points')}</span>${rank ? `<span>${L('रैंक', 'Rank')} <b>#${rank}</b></span>` : ''}</div></div>
  </section>
  ${recent.length ? `<section class="sec"><h2 class="sec-title">${ic('book-open')} ${L('पढ़ाई जारी रखें', 'Continue learning')}</h2><div class="hscroll">${recent.map(r => { const x = U.chStats(r.ch); return `<a class="mini-card" href="#chapter/${esc(r.ch)}"><span class="s">${esc(subjName((CHM[r.ch] || {}).s || ''))}</span><span class="t">${esc(chName(r.ch))}</span><span class="s">${x.cov}% ${L('पूरा', 'done')} · ${mLabel(x.level)}</span><span class="minibar ${x.level >= 3 ? 'ok' : ''}"><i style="width:${x.cov}%"></i></span></a>`; }).join('')}</div></section>` : ''}
  <section class="sec"><h2 class="sec-title">${ic('sparkles')} ${L('आपके लिए सुझाव', 'Recommended for you')}</h2><div class="list">${recommendations(na.act).map(recRow).join('') || `<div class="empty">${L('अभी कोई सुझाव नहीं — कुछ प्रश्न हल करें।', 'No suggestions yet — answer a few questions.')}</div>`}</div></section>
  ${weak.length ? `<section class="sec"><h2 class="sec-title">${ic('target')} ${L('कमज़ोर विषय', 'Weak topics')}</h2><div class="list">${weak.map(w => `<button class="row" data-act="practice-topic" data-ch="${esc(w.ch)}" data-t="${esc(w.t)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(L(w.t, w.tEn))}</span><span class="row-sub">${esc(chName(w.ch))}</span><span class="minibar"><i style="width:${w.acc}%;background:var(--bad-solid)"></i></span></span><span class="pct">${w.acc}%</span>${ic('chev-right', 'chev')}</button>`).join('')}</div></section>` : ''}
  <section class="sec"><h2 class="sec-title">${ic('calendar')} ${L('आज की पढ़ाई', 'Today\'s reading')}</h2>
    <div class="split"><a class="tile2" href="#ca">${ic('newspaper')}<b>${L('करेंट अफेयर्स', 'Current affairs')}</b><span>${caToday ? L(`आज की ${caToday} ख़बरें`, `${caToday} stories today`) : m.news[0] ? `${L('नवीनतम', 'Latest')}: ${fmtDate(m.news[0].date, false)}` : ''}</span></a>
    <a class="tile2" href="#today">${ic('calendar')}<b>${L('आज का दिन', 'Today in History')}</b><span>${dayToday ? esc(dT(dayToday)) : L('इतिहास में आज और 5 प्रश्न', 'On this day and 5 questions')}</span></a></div>
  </section>
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>${L('एडमिन पैनल', 'Admin panel')}<span class="row-sub">${LOCAL() ? L('डेमो: बदलाव इसी ब्राउज़र में', 'Demo: changes stay in this browser') : L('सामग्री, AI प्रश्न, समीक्षा, प्रकाशन और पुरस्कार', 'Content, AI questions, review, publishing and prizes')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
</main>
${bottomNav('home')}`;
}

// ── Learn: subjects → chapters → topics ──
function vLearn() {
  const m = M(), ex = learnState.ex ?? (U.s.exam || 'all');
  const subj = SUBJECTS.map(sj => {
    const list = exPool(m.bySubj[sj.k] || [], ex);
    if (!list.length) return '';
    const x = U.stats(list), chs = chaptersOf(sj.k).filter(c => exPool(m.byCh[c.id] || [], ex).length).length;
    return `<a class="row" href="#subject/${sj.k}" style="--c:${sj.c}"><span class="row-ic">${ic(sj.icon)}</span><span class="row-main"><span class="row-title">${subjName(sj.k)}</span><span class="row-sub">${L(`${chs} अध्याय · ${list.length} प्रश्न`, `${chs} chapters · ${list.length} questions`)} · ${mLabel(x.level)}</span><span class="minibar ${x.level >= 3 ? 'ok' : ''}"><i style="width:${x.cov}%"></i></span></span><span class="pct">${x.cov}%</span>${ic('chev-right', 'chev')}</a>`;
  }).join('');
  const due = U.due().length, wrong = Object.values(U.s.ans).filter(a => !a.l).length;
  return `${topbar(L('सीखें', 'Learn'))}
<main class="page gutter">
  <button class="search" data-act="search-open" style="width:100%;cursor:text;text-align:left">${ic('search')}<span class="muted">${L('प्रश्न, विषय या शब्द खोजें', 'Search questions, topics or words')}</span></button>
  <div class="sec"><span class="small muted">${ic('graduation')} ${L('परीक्षा के अनुसार', 'By exam')}</span><div class="chips" role="group" aria-label="${L('परीक्षा', 'Exam')}"><button class="chip" data-act="learn-ex" data-v="all" aria-pressed="${ex === 'all'}">${L('सभी', 'All')}</button>${EXAMS.map(e => `<button class="chip" data-act="learn-ex" data-v="${e.id}" aria-pressed="${ex === e.id}">${esc(L(e.hi, e.en))}</button>`).join('')}</div></div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <section class="sec"><h2 class="sec-title">${ic('layers')} ${L('विषय', 'Subjects')}</h2><div class="list">${C.baseState === 'loading' ? skeletonRows(5) : subj || emptyState('layers', L('इस परीक्षा के लिए अभी प्रश्न नहीं', 'No questions for this exam yet'), '')}</div></section>
  <section class="sec"><h2 class="sec-title">${ic('calendar')} ${L('रोज़ की पढ़ाई', 'Daily learning')}</h2>
    <div class="split"><a class="tile2" href="#ca">${ic('newspaper')}<b>${L('करेंट अफेयर्स', 'Current affairs')}</b><span>${L('दैनिक, साप्ताहिक, मासिक', 'Daily, weekly, monthly')}</span></a><a class="tile2" href="#today">${ic('calendar')}<b>${L('आज का दिन', 'Today in History')}</b><span>${L('3–5 मिनट का दैनिक सत्र', 'A 3–5 minute daily session')}</span></a></div></section>
  <section class="sec"><div class="sec-head"><h2 class="sec-title">${ic('rotate')} ${L('दोहराव', 'Revision')}</h2><a class="link" href="#revise">${L('सब देखें', 'See all')} ${ic('chev-right')}</a></div>
    <div class="split"><button class="tile2" data-act="start-revision"><span class="n tnum">${due}</span><b>${L('आज दोहराने हैं', 'Due today')}</b><span>${L('स्पेस्ड रिपीटिशन', 'Spaced repetition')}</span></button><a class="tile2" href="#cards"><span class="n">${ic('cards')}</span><b>${L('फ़्लैशकार्ड', 'Flashcards')}</b><span>${L('जल्दी दोहराव', 'Quick recall')}</span></a>
    <button class="tile2" data-act="practice-mistakes"><span class="n tnum">${wrong}</span><b>${L('गलतियाँ', 'Mistakes')}</b><span>${L('फिर से हल करें', 'Try them again')}</span></button><a class="tile2" href="#bookmarks"><span class="n tnum">${U.s.bm.q.length + U.s.bm.n.length}</span><b>${L('सहेजे गए', 'Saved')}</b><span>${L('प्रश्न और ख़बरें', 'Questions and news')}</span></a></div></section>
</main>
${bottomNav('learn')}`;
}
function vSubject() {
  const k = routeArg, sj = SUBJ[k];
  if (!sj) return redirect('learn');
  const m = M(), all = m.bySubj[k] || [], x = U.stats(all), pool = diffPool(all);
  const weak = U.weakTopics(3, k);
  const chs = chaptersOf(k).map(c => {
    const list = m.byCh[c.id] || [], cx = U.stats(list), topics = uniq(list.map(q => q.t || '')).filter(Boolean).length, nd = diffPool(list).length;
    return `<a class="row" href="#chapter/${esc(c.id)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(L(c.hi, c.en))}</span><span class="row-sub">${L(`${list.length} प्रश्न`, `${list.length} questions`)}${topics > 1 ? ` · ${L(`${topics} विषय`, `${topics} topics`)}` : ''}${U.s.set.diff ? ` · ${nd} ${esc(diffLabel(U.s.set.diff))}` : ''} · ${mLabel(cx.level)}</span><span class="minibar ${cx.level >= 3 ? 'ok' : ''}"><i style="width:${cx.cov}%"></i></span></span><span class="pct">${cx.cov}%</span>${ic('chev-right', 'chev')}</a>`;
  }).join('');
  return `${appbar(esc(subjName(k)), { back: 'learn', right: `<button class="iconbtn" data-act="search-open" aria-label="${L('प्रश्न खोजें', 'Search questions')}">${ic('search')}</button>` })}
<main class="page gutter">
  <section class="card sum"><div class="sum-top"><div class="ringbox">${ring(x.cov / 100, 64, 6)}<b class="tnum" style="font-size:.9rem">${x.cov}%</b></div><span class="row-main"><b>${esc(subjName(k))}</b><span class="row-sub">${L(`${all.length} प्रश्न · सटीकता ${x.acc}%`, `${all.length} questions · ${x.acc}% accuracy`)} · ${mLabel(x.level)}</span></span></div>
    <div class="grid2"><button class="btn btn-cta" data-act="start-subject" data-s="${k}" ${pool.length ? '' : 'disabled'}>${ic('play')} ${L('अभ्यास', 'Practise')}</button><button class="btn btn-outline" data-act="exam-pool" data-s="${k}" ${pool.length >= 3 ? '' : 'disabled'}>${ic('clock')} ${L('परीक्षा मोड', 'Exam mode')}</button></div>
    <p class="small muted" style="margin:0">${L('अभ्यास: हर उत्तर पर तुरंत व्याख्या। परीक्षा मोड: समय-सीमा, उत्तर अंत में।', 'Practice: instant explanation after every answer. Exam mode: timed, answers only at the end.')}</p></section>
  ${diffChips()}
  <section class="sec"><h2 class="sec-title">${ic('layers')} ${L('अध्याय', 'Chapters')}</h2><div class="list">${chs || emptyState('layers', L('अभी कोई अध्याय नहीं', 'No chapters yet'), '')}</div></section>
  ${weak.length ? `<section class="sec"><h2 class="sec-title">${ic('target')} ${L('इस विषय में कमज़ोर', 'Weak in this subject')}</h2><div class="list">${weak.map(w => `<button class="row" data-act="practice-topic" data-ch="${esc(w.ch)}" data-t="${esc(w.t)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(L(w.t, w.tEn))}</span><span class="row-sub">${esc(chName(w.ch))}</span></span><span class="pct">${w.acc}%</span>${ic('chev-right', 'chev')}</button>`).join('')}</div></section>` : ''}
</main>
${bottomNav('learn')}`;
}
function vChapter() {
  const id = routeArg, c = CHM[id] || chaptersOf(String(id).replace(/-other$/, '')).find(x => x.id === id);
  if (!c) return redirect('learn');
  const m = M(), all = m.byCh[id] || [], x = U.stats(all), pool = diffPool(all);
  const topics = {};
  for (const q of all) { const k = q.t || ''; (topics[k] = topics[k] || { t: k, tEn: (q.en && q.en.t) || k, list: [] }).list.push(q); }
  const tl = Object.values(topics);
  const ex = CHM[id] ? CHM[id].ex : ['gk'];
  return `${appbar(esc(L(c.hi, c.en)), { back: 'subject/' + c.s })}
<main class="page gutter">
  <section class="card sum"><div class="sum-top"><div class="ringbox">${ring(x.cov / 100, 64, 6)}<b class="tnum" style="font-size:.9rem">${x.cov}%</b></div><span class="row-main"><span class="row-sub">${esc(subjName(c.s))}</span><b>${esc(L(c.hi, c.en))}</b><span class="row-sub">${L(`${all.length} प्रश्न · सटीकता ${x.acc}%`, `${all.length} questions · ${x.acc}% accuracy`)} · ${mLabel(x.level)}</span></span></div>
    <div><span class="small muted">${L('इन परीक्षाओं के लिए उपयोगी', 'Useful for')}:</span> <span class="excats">${ex.map(e => `<span class="tag">${esc(examLabel(e))}</span>`).join('')}</span></div>
    <div class="grid2"><button class="btn btn-cta" data-act="practice-ch" data-ch="${esc(id)}" ${pool.length ? '' : 'disabled'}>${ic('play')} ${L('अभ्यास', 'Practise')}</button><button class="btn btn-outline" data-act="exam-pool" data-ch="${esc(id)}" ${pool.length >= 3 ? '' : 'disabled'}>${ic('clock')} ${L('परीक्षा मोड', 'Exam mode')}</button></div>
    <div class="grid2"><button class="btn btn-outline" data-act="cards-start" data-src="ch:${esc(id)}" ${all.length ? '' : 'disabled'}>${ic('cards')} ${L('फ़्लैशकार्ड', 'Flashcards')}</button>${AI.available() ? `<button class="btn btn-outline" data-act="ai-notes" data-ch="${esc(id)}">${ic('sparkles')} ${L('AI नोट्स', 'AI notes')}</button>` : `<button class="btn btn-outline" data-act="notes-ch" data-ch="${esc(id)}">${ic('printer')} ${L('नोट्स', 'Notes')}</button>`}</div></section>
  ${diffChips()}
  ${tl.length > 1 ? `<section class="sec"><h2 class="sec-title">${ic('target')} ${L('विषय', 'Topics')}</h2><div class="list">${tl.map(tp => { const tx2 = U.stats(tp.list); return `<button class="row" data-act="practice-topic" data-ch="${esc(id)}" data-t="${esc(tp.t)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(L(tp.t, tp.tEn))}</span><span class="row-sub">${L(`${tp.list.length} प्रश्न`, `${tp.list.length} questions`)} · ${mLabel(tx2.level)}</span><span class="minibar"><i style="width:${tx2.cov}%"></i></span></span><span class="pct">${tx2.cov}%</span>${ic('chev-right', 'chev')}</button>`; }).join('')}</div></section>` : ''}
  <section class="sec"><div class="sec-head"><h2 class="sec-title">${ic('list')} ${L('प्रश्न बैंक', 'Question bank')}</h2><span class="small muted">${pool.length}${U.s.set.diff ? ' · ' + esc(diffLabel(U.s.set.diff)) : ''}</span></div>
    <div class="list">${pool.map(q => { const [cls, icon, label] = qState(q); return `<button class="qrow" data-act="open-q" data-id="${esc(q.id)}"><span class="qst ${cls}" role="img" aria-label="${esc(label)}">${ic(icon)}</span><span class="qt">${esc(qT(q))}<br>${diffBars(q.d)}${U.isBm('q', q.id) ? ` · <span class="small muted">${ic('bookmark', 'fill')}</span>` : ''}</span></button>`; }).join('') || emptyState('filter', L('इस स्तर का कोई प्रश्न नहीं', 'No questions at this level'), '')}</div></section>
</main>
${bottomNav('learn')}`;
}

// ── Revision hub and flashcards ──
function vRevise() {
  const m = M(), due = U.due().length;
  const wrongIds = Object.entries(U.s.ans).filter(([id, a]) => !a.l && m.byId.has(id)).sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).map(([id]) => id);
  const counts = [0, 0, 0, 0, 0];
  for (const c of CHAPTERS) if ((m.byCh[c.id] || []).length) counts[U.chStats(c.id).level]++;
  const weak = U.weakTopics(5);
  return `${appbar(`${ic('rotate')} ${L('दोहराव', 'Revision')}`, { back: 'learn' })}
<main class="page gutter">
  <section class="card next"><span class="k">${L('स्मार्ट दोहराव', 'Smart revision')}</span><h3>${due ? L(`आज ${due} प्रश्न दोहराने हैं`, `${due} questions due today`) : L('आज कोई दोहराव बाकी नहीं', 'Nothing due today')}</h3>
    <p>${L('गलत हुए प्रश्न 1, 3, 7, 14 और 30 दिन बाद फिर आते हैं — हर सही उत्तर के साथ अंतराल बढ़ता है।', 'Questions you miss come back after 1, 3, 7, 14 and 30 days — each right answer stretches the gap.')}</p>
    <div class="ringbox"><span class="lvl-badge" style="width:56px;height:56px">${ic('rotate')}</span></div>
    <button class="btn btn-cta btn-block" data-act="start-revision" ${due ? '' : 'disabled'}>${ic('play')} ${L('दोहराव शुरू करें', 'Start revision')}</button></section>
  <div class="split">
    <button class="tile2" data-act="cards-start" data-src="due">${ic('cards')}<b>${L('फ़्लैशकार्ड', 'Flashcards')}</b><span>${L('याद है या नहीं — ख़ुद परखें', 'Test your recall')}</span></button>
    <button class="tile2" data-act="practice-mistakes" ${wrongIds.length ? '' : 'disabled'}>${ic('x')}<b>${L(`गलतियाँ (${wrongIds.length})`, `Mistakes (${wrongIds.length})`)}</b><span>${L('पिछली बार गलत हुए प्रश्न', 'Wrong last time')}</span></button>
    <a class="tile2" href="#bookmarks">${ic('bookmark')}<b>${L(`सहेजे गए (${U.s.bm.q.length})`, `Saved (${U.s.bm.q.length})`)}</b><span>${L('बुकमार्क प्रश्न और ख़बरें', 'Saved questions and news')}</span></a>
    <button class="tile2" data-act="cards-start" data-src="saved" ${U.s.bm.q.length ? '' : 'disabled'}>${ic('star')}<b>${L('सहेजे प्रश्नों के कार्ड', 'Saved as cards')}</b><span>${L('बुकमार्क से फ़्लैशकार्ड', 'Flashcards from saved')}</span></button>
  </div>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('layers')} ${L('अध्यायों में महारत', 'Chapter mastery')}</h2>
    <div class="cmp">${MASTERY.map((mm, i) => `<span>${mLabel(i)}</span><span></span><b>${counts[i]}</b>`).reverse().join('')}</div>
    <p class="small muted" style="margin:0">${L('महारत = अध्याय के सभी प्रश्न किए और 90%+ पिछली बार सही।', 'Mastered = every question in the chapter tried and 90%+ right last time.')}</p></section>
  ${weak.length ? `<section class="sec"><h2 class="sec-title">${ic('target')} ${L('कमज़ोर विषयों का दोहराव', 'Revise weak topics')}</h2><div class="list">${weak.map(w => `<button class="row" data-act="practice-topic" data-ch="${esc(w.ch)}" data-t="${esc(w.t)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(L(w.t, w.tEn))}</span><span class="row-sub">${esc(chName(w.ch))}</span></span><span class="pct">${w.acc}%</span>${ic('chev-right', 'chev')}</button>`).join('')}</div></section>` : ''}
  ${wrongIds.length ? `<section class="sec"><h2 class="sec-title">${ic('list')} ${L('हाल की गलतियाँ', 'Recent mistakes')}</h2><div class="list">${wrongIds.slice(0, 8).map(id => { const q = m.byId.get(id); return `<button class="qrow" data-act="open-q" data-id="${esc(id)}"><span class="qst bad" role="img" aria-label="${L('पिछली बार गलत', 'Wrong last time')}">${ic('x')}</span><span class="qt">${esc(qT(q))}</span></button>`; }).join('')}</div></section>` : ''}
</main>
${bottomNav('learn')}`;
}
let FC = null; // flashcard deck {src, ids, i, flip, known, forgot}
function deckFor(src) {
  const m = M();
  let ids = [];
  if (src === 'due') ids = U.due();
  if (src === 'saved') ids = U.s.bm.q.slice();
  if (src === 'mistakes' || (src === 'due' && ids.length < 5)) ids = uniq([...ids, ...Object.entries(U.s.ans).filter(([, a]) => !a.l).map(([id]) => id)]);
  if (src.startsWith('ch:')) ids = shuffle((m.byCh[src.slice(3)] || []).map(q => q.id));
  if (!ids.length) ids = shuffle(m.qs.filter(q => !U.s.ans[q.id]).map(q => q.id)).slice(0, 15); // nothing to revise: new cards
  return ids.filter(id => m.byId.has(id)).slice(0, 20);
}
function vCards() {
  if (!FC || !FC.ids.length) FC = { src: 'due', ids: deckFor('due'), i: 0, flip: false, known: 0, forgot: 0 };
  const n = FC.ids.length;
  if (FC.i >= n) {
    return `${appbar(`${ic('cards')} ${L('फ़्लैशकार्ड', 'Flashcards')}`, { back: 'revise' })}
<main class="page gutter"><section class="card result-hero"><span class="lvl-badge">${ic('check')}</span><h2 style="margin:8px 0 0;font-size:1.25rem">${L('डेक पूरा हुआ!', 'Deck complete!')}</h2>
  <div class="stats" style="width:100%"><div class="stat s-ok"><b>${FC.known}</b><span>${L('याद था', 'Knew it')}</span></div><div class="stat s-bad"><b>${FC.forgot}</b><span>${L('भूल गए', 'Forgot')}</span></div><div class="stat"><b>${n}</b><span>${L('कार्ड', 'Cards')}</span></div></div>
  <p class="muted small" style="margin:0">${L('भूले हुए कार्ड कल फिर आएँगे।', 'Cards you forgot will come back tomorrow.')}</p></section>
  <div class="grid2"><button class="btn btn-cta" data-act="cards-start" data-src="${esc(FC.src)}">${ic('rotate')} ${L('फिर से', 'Again')}</button><a class="btn btn-grey" href="#revise">${L('दोहराव', 'Revision')}</a></div></main>`;
  }
  const q = M().byId.get(FC.ids[FC.i]);
  if (!q) { FC.i++; return vCards(); }
  const o = qO(q);
  return `${appbar(`${ic('cards')} ${L('फ़्लैशकार्ड', 'Flashcards')}`, { back: 'revise', right: langBtn() })}
<main class="page gutter">
  <div class="progress" role="progressbar" aria-label="${L('प्रगति', 'Progress')}" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${FC.i}"><i style="width:${(FC.i / n) * 100}%"></i></div>
  <p class="fc-count">${L('कार्ड', 'Card')} ${FC.i + 1} / ${n} · ${esc(chName(chOf(q)))}</p>
  <article class="fc" aria-live="polite">
    <p class="fc-q">${esc(qT(q))}</p>
    ${FC.flip ? `<div class="fc-a"><b>${ic('check')} ${esc(o[q.a])}</b>${esc(qE(q))}</div>` : `<p class="small muted" style="margin:0">${L('पहले मन में उत्तर सोचें, फिर देखें।', 'Think of the answer first, then reveal it.')}</p>`}
    ${FC.flip ? `<div class="grid2"><button class="btn btn-danger" data-act="card-grade" data-v="0">${ic('x')} ${L('भूल गया', 'Forgot')}</button><button class="btn btn-cta" data-act="card-grade" data-v="1">${ic('check')} ${L('याद था', 'Knew it')}</button></div>` : `<button class="btn btn-navy btn-block" data-act="card-flip">${ic('eye')} ${L('उत्तर देखें', 'Show answer')}</button>`}
  </article>
</main>`;
}

// ── Compete ──
const wchalIds = wk => {
  const m = M(), pool = m.qs.filter(q => q.s !== 'ca').sort((a, b) => a.id.localeCompare(b.id));
  const ca = (m.bySubj.ca || []).slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)) || a.id.localeCompare(b.id)).slice(0, 10);
  return [...shuffle(pool, rng('wchal:' + wk)).slice(0, 11), ...shuffle(ca, rng('wchal-ca:' + wk)).slice(0, 4)].map(q => q.id);
};
function vCompete() {
  const t = todayISO(), wk = weekKey(t), wc = U.s.wc[wk], daily = U.s.daily[t], rank = LB.myRank('week'), top = LB.board('week').filter(r => r.p > 0).slice(0, 3);
  return `${topbar(L('मुक़ाबला', 'Compete'))}
<main class="page gutter">
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic('zap')} ${L('दैनिक चुनौती', 'Daily challenge')}</h2>${daily ? `<span class="tag tag-live">${L('पूरी', 'Done')}</span>` : ''}</div>
    <p class="small muted" style="margin:0">${daily ? L(`आज ${daily.total} में से ${daily.score} सही। कल नई चुनौती आएगी।`, `Today: ${daily.score} of ${daily.total} right. A new challenge comes tomorrow.`) : L(`नवीनतम करेंट अफेयर्स, आज का दिन और प्रश्न बैंक से 10 प्रश्न · +${PTS.daily} पॉइंट्स`, `10 questions from the latest news, today's day and the bank · +${PTS.daily} points`)}</p>
    <button class="btn ${daily ? 'btn-outline' : 'btn-cta'}" data-act="start-daily" ${C.baseState !== 'ok' ? 'disabled' : ''}>${daily ? L('फिर से खेलें (बिना बोनस)', 'Play again (no bonus)') : L('शुरू करें', 'Start')}</button></section>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic('swords')} ${L('साप्ताहिक चुनौती', 'Weekly challenge')}</h2><span class="small muted">${esc(fmtWeek(wk))}</span></div>
    <p class="small muted" style="margin:0">${L(`सभी विद्यार्थियों के लिए एक जैसे 15 प्रश्न, 10 मिनट, परीक्षा मोड। केवल पहला प्रयास गिना जाता है · +${PTS.wchal} पॉइंट्स।`, `The same 15 questions for every student, 10 minutes, exam mode. Only the first attempt counts · +${PTS.wchal} points.`)}</p>
    ${wc ? `<div class="meta-row"><span>${L('आपका स्कोर', 'Your score')}: <b>${fmtScore(wc.score)}/${wc.max}</b></span><span>${L('समय', 'Time')}: <b>${fmtSecs(wc.sec)}</b></span></div>` : ''}
    <button class="btn ${wc ? 'btn-outline' : 'btn-cta'}" data-act="start-wchal" ${C.baseState !== 'ok' ? 'disabled' : ''}>${wc ? L('अभ्यास के लिए फिर दें', 'Retake for practice') : L('चुनौती शुरू करें', 'Start the challenge')}</button></section>
  <section class="sec"><div class="sec-head"><h2 class="sec-title">${ic('clipboard')} ${L('मॉक टेस्ट', 'Mock tests')}</h2><a class="link" href="#mock">${L('सभी', 'All')} ${ic('chev-right')}</a></div>
    <div class="list">${MOCKS.map(mk => `<button class="row" data-act="mock-intro" data-id="${mk.id}"><span class="row-ic" style="--c:var(--brand)">${ic('clipboard')}</span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(mockTitle(mk))}</span><span class="row-sub">${mk.mins} ${L('मिनट', 'min')} · +${mk.pos} / −${mk.neg}</span></span>${ic('chev-right', 'chev')}</button>`).join('')}
    <a class="row" href="#builder"><span class="row-ic" style="--c:var(--ok)">${ic('sliders')}</span><span class="row-main"><span class="row-title" style="font-size:1rem">${L('अपना टेस्ट बनाएँ', 'Build your own test')}</span><span class="row-sub">${L('विषय, अध्याय, कठिनाई, समय और नेगेटिव मार्किंग चुनें', 'Choose subject, chapter, level, time and negative marking')}</span></span>${ic('chev-right', 'chev')}</a></div></section>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1.05rem">${ic('users')} ${L('दोस्त को चुनौती दें', 'Challenge a friend')}</h2>
    <p class="small muted" style="margin:0">${L('10 प्रश्न हल करें और लिंक भेजें — दोस्त वही प्रश्न हल करेगा और दोनों के स्कोर की तुलना होगी। कोई खाता या नंबर साझा नहीं होता।', 'Answer 10 questions and send the link — your friend gets the same questions and you compare scores. No account or phone number is shared.')}</p>
    <button class="btn btn-outline" data-act="friend-new" ${C.baseState !== 'ok' ? 'disabled' : ''}>${ic('link')} ${L('चुनौती बनाएँ', 'Create a challenge')}</button></section>
  <section class="sec"><div class="sec-head"><h2 class="sec-title">${ic('trophy')} ${L('लीडरबोर्ड', 'Leaderboard')}</h2><a class="link" href="#leaders">${L('पूरा देखें', 'Open')} ${ic('chev-right')}</a></div>
    <div class="list">${top.map(r => `<div class="lrow${r.me ? ' me' : ''}"><span class="lrank tnum">${r.rank}</span>${lbAvatar(r)}<span class="lname">${esc(r.n)}</span><span class="lpts tnum">${fmtNum(r.p)}</span></div>`).join('') || `<div class="empty">${L('इस सप्ताह अभी कोई रैंकिंग नहीं', 'No rankings this week yet')}</div>`}
    <div class="lrow"><span class="row-main small">${L('आपकी रैंक', 'Your rank')}: <b>${rank ? '#' + rank : '–'}</b> · ${fmtNum(U.ptsWeek(wk))} ${L('पॉइंट्स', 'points')}</span></div></div></section>
</main>
${bottomNav('compete')}`;
}

// ── Progress & analytics ──
const LEVEL_STEP = 100;
function levelOf(total) { let lvl = 1, need = 0; while (total >= need + LEVEL_STEP * lvl) { need += LEVEL_STEP * lvl; lvl++; } return { lvl, from: need, to: need + LEVEL_STEP * lvl }; }
const delta = (a, b, unit = '') => { const d = a - b; return `<span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d ? ic(d > 0 ? 'arrow-up' : 'arrow-down') : ''}${d > 0 ? '+' : ''}${d}${unit}</span>`; };
function vProgress() {
  const s = U.s, tot = U.totals(), lv = levelOf(s.pts.total), t = todayISO();
  const wk = weekKey(t), lw = addDays(wk, -7), cw = U.rangeStats(wk, addDays(wk, 6)), pw = U.rangeStats(lw, addDays(lw, 6));
  const m = M();
  const subj = SUBJECTS.map(sj => { const x = U.stats(m.bySubj[sj.k] || []); return `<div class="bar-row" style="--c:${sj.c}"><span>${subjName(sj.k)}</span><span class="track" title="${L('कवरेज', 'Coverage')} ${x.cov}%"><i style="width:${x.score}%"></i></span><b>${x.score}%</b></div>`; }).join('');
  const weak = U.weakTopics(5);
  const hist = s.hist.slice(0, 12).map(h => { const q = m.byId.get(h.id); if (!q) return ''; return `<div class="hist"><span class="qst ${h.ok ? 'ok' : 'bad'}" role="img" aria-label="${h.ok ? L('सही', 'Right') : L('गलत', 'Wrong')}">${ic(h.ok ? 'check' : 'x')}</span><span class="row-main">${esc(qT(q).slice(0, 90))}${qT(q).length > 90 ? '…' : ''}<span class="row-sub">${relTime(h.t)}${h.ms ? ` · ${Math.round(h.ms / 1000)} ${L('से.', 's')}` : ''} · ${h.m === 'e' ? L('परीक्षा', 'Exam') : h.m === 'r' ? L('दोहराव', 'Revision') : L('अभ्यास', 'Practice')}</span></span></div>`; }).join('');
  const earned = BADGES.filter(b => s.badges[b.id]).length;
  const badges = BADGES.map(b => { const d = s.badges[b.id]; return `<li class="bdg${d ? ' got' : ''}" title="${esc(L(b.dhi, b.den))}"><span class="bdg-ic">${ic(d ? b.icon : 'lock')}</span><b>${esc(L(b.hi, b.en))}</b><span>${d ? fmtDate(d) : esc(L(b.dhi, b.den))}</span></li>`; }).join('');
  const mocks = s.mocks.slice(0, 5);
  return `${topbar(L('प्रगति', 'Progress'))}
<main class="page gutter">
  <section class="card lvl"><div class="lvl-top"><span class="lvl-badge" aria-hidden="true">${lv.lvl}</span><span class="row-main"><b style="font-size:1.1rem">${L(`स्तर ${lv.lvl}`, `Level ${lv.lvl}`)}</b><span class="row-sub">${fmtNum(s.pts.total)} ${L('पॉइंट्स', 'points')} · ${L(`अगले स्तर के लिए ${fmtNum(lv.to - s.pts.total)}`, `${fmtNum(lv.to - s.pts.total)} to next level`)}</span></span><button class="iconbtn" data-act="pts-history" aria-label="${L('पॉइंट्स इतिहास', 'Points history')}">${ic('list')}</button></div>
    <div class="lvl-bar" role="progressbar" aria-valuemin="${lv.from}" aria-valuemax="${lv.to}" aria-valuenow="${s.pts.total}"><i style="width:${pct(s.pts.total - lv.from, lv.to - lv.from)}%"></i></div></section>
  <div class="stats">
    <div class="stat"><b>${tot.attempts}</b><span>${L('कुल उत्तर', 'Answers')}</span></div><div class="stat s-ok"><b>${tot.acc}%</b><span>${L('सटीकता', 'Accuracy')}</span></div><div class="stat"><b>${U.avgSecs() || '–'}</b><span>${L('से./प्रश्न', 's / question')}</span></div>
    <div class="stat"><b>${U.streak()}</b><span>${L('स्ट्रीक', 'Streak')}</span></div><div class="stat"><b>${s.best || 0}</b><span>${L('सर्वश्रेष्ठ', 'Best streak')}</span></div><div class="stat"><b>${s.mocks.length}</b><span>${L('टेस्ट', 'Tests')}</span></div>
  </div>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('trend')} ${L('यह सप्ताह बनाम पिछला', 'This week vs last')}</h2>
    <div class="cmp"><span>${L('प्रश्न', 'Questions')}</span><b>${cw.n}</b>${delta(cw.n, pw.n)}<span>${L('सटीकता', 'Accuracy')}</span><b>${cw.acc}%</b>${delta(cw.acc, pw.acc, '%')}<span>${L('पॉइंट्स', 'Points')}</span><b>${fmtNum(cw.pts)}</b>${delta(cw.pts, pw.pts)}</div>
    ${weekBars()}</section>
  <section class="card"><h2 class="sec-title" style="font-size:1rem;margin-bottom:12px">${ic('target')} ${L('विषयवार महारत', 'Subject mastery')}</h2><div class="bars">${subj}</div><p class="small muted" style="margin:10px 0 0">${L('हर विषय के कितने प्रश्न पिछली बार सही हुए।', 'Share of each subject\'s questions you got right last time.')}</p></section>
  <section class="sec"><h2 class="sec-title">${ic('target')} ${L('कमज़ोर विषय', 'Weak topics')}</h2><div class="list">${weak.map(w => `<button class="row" data-act="practice-topic" data-ch="${esc(w.ch)}" data-t="${esc(w.t)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(L(w.t, w.tEn))}</span><span class="row-sub">${esc(chName(w.ch))} · ${w.c + w.w} ${L('प्रयास', 'attempts')}</span></span><span class="pct">${w.acc}%</span>${ic('chev-right', 'chev')}</button>`).join('') || `<div class="empty">${L('अभी कोई कमज़ोर विषय नहीं — शाबाश! (कम से कम 2 प्रयास के बाद दिखते हैं)', 'No weak topics yet — well done! (They appear after at least 2 attempts.)')}</div>`}</div></section>
  ${mocks.length ? `<section class="sec"><h2 class="sec-title">${ic('clipboard')} ${L('टेस्ट का रुझान', 'Test trend')}</h2><div class="list">${mocks.map(h => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:.95rem">${esc(examTitle(h) || h.title || '')}</span><span class="row-sub">${fmtDate(h.date)} · ${pct(h.c, h.c + h.w)}% ${L('सटीकता', 'accuracy')} · ${fmtSecs(h.timeSec || 0)}</span></span><b class="tnum">${fmtScore(h.score)}/${h.max}</b></div>`).join('')}</div></section>` : ''}
  <section class="card"><div class="sec-head" style="margin-bottom:12px"><h2 class="sec-title" style="font-size:1rem">${ic('award')} ${L('उपलब्धियाँ', 'Achievements')}</h2><span class="small muted">${earned}/${BADGES.length}</span></div><ul class="bdgs">${badges}</ul>
    ${earned ? `<button class="btn btn-outline btn-block" style="margin-top:12px" data-act="share-achv">${ic('share')} ${L('उपलब्धि शेयर करें', 'Share achievements')}</button>` : ''}</section>
  <section class="sec"><div class="sec-head"><h2 class="sec-title">${ic('clock')} ${L('हाल के उत्तर', 'Recent answers')}</h2><span class="small muted">${s.hist.length}</span></div><div class="list">${hist || `<div class="empty">${L('अभी कोई उत्तर नहीं', 'No answers yet')}</div>`}</div></section>
</main>
${bottomNav('progress')}`;
}

// ── First-time onboarding ──
const WZ = { step: 0 };
function vWelcome() {
  const st = WZ.step, dots = `<div class="dots" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>`;
  const foot = (next, back = true, label = L('आगे', 'Next')) => `<div class="onb-foot">${back ? `<button class="btn btn-grey" data-act="wz-back">${ic('arrow-left')} ${L('पीछे', 'Back')}</button>` : ''}<button class="btn btn-cta" data-act="${next}">${label} ${ic('arrow-right')}</button></div>`;
  let body;
  if (st === 0) body = `<svg class="illus" viewBox="0 0 120 120" role="img" aria-label="${L('किताब और टोपी', 'A book and a graduation cap')}"><circle cx="60" cy="60" r="56" fill="var(--sky-soft)"/><path d="M28 78l32-12 32 12v8l-32-12-32 12z" fill="var(--navy)"/><path d="M60 30 24 46l36 16 36-16z" fill="var(--navy)"/><path d="M40 54v14c0 6 9 10 20 10s20-4 20-10V54" fill="none" stroke="var(--sky)" stroke-width="5"/><circle cx="92" cy="50" r="4" fill="var(--gold)"/></svg>
    <h1>${L('MY QUIZ में आपका स्वागत है', 'Welcome to MY QUIZ')}</h1><p class="lead">${L('सीखें → अभ्यास करें → समझें → दोहराएँ → मुक़ाबला करें → बेहतर बनें। पहले भाषा चुनें।', 'Learn → practise → understand → revise → compete → improve. First, choose your language.')}</p>
    <div class="choices">${[['hi', 'हिंदी', 'सरल हिंदी में'], ['en', 'English', 'In simple English']].map(([v, l, d]) => `<button class="choice" data-act="set-lang" data-v="${v}" aria-pressed="${LANG === v}" lang="${v}">${l}<span>${d}</span></button>`).join('')}</div>
    <div class="field"><label for="wz-name">${L('आपका नाम (वैकल्पिक)', 'Your name (optional)')}</label><input class="input" id="wz-name" data-bind="onb.name" value="${esc(onb.name || U.s.name)}" maxlength="40" autocomplete="given-name" placeholder="${L('जैसे: राहुल', 'e.g. Rahul')}"></div>
    ${foot('wz-next', false)}`;
  else if (st === 1) body = `<h1>${L('आप किस परीक्षा की तैयारी कर रहे हैं?', 'Which exam are you preparing for?')}</h1><p class="lead">${L('हम उसी के अनुसार अध्याय और टेस्ट सुझाएँगे। बाद में बदल सकते हैं।', 'We\'ll suggest chapters and tests for it. You can change it later.')}</p>
    <div class="choices">${EXAMS.map(e => `<button class="choice" data-act="wz-exam" data-v="${e.id}" aria-pressed="${(onb.exam || U.s.exam) === e.id}">${esc(L(e.hi, e.en))}<span>${esc(L(e.dhi, e.den))}</span></button>`).join('')}</div>${foot('wz-next')}`;
  else if (st === 2) body = `<h1>${L('रोज़ कितना पढ़ेंगे?', 'How much will you study each day?')}</h1><p class="lead">${L('छोटा लक्ष्य रोज़ पूरा करना बड़े लक्ष्य से बेहतर है।', 'A small goal met every day beats a big one.')}</p>
    <div class="choices one">${[[10, '~5 मिनट · आराम से', '~5 min · relaxed'], [20, '~10 मिनट · नियमित', '~10 min · regular'], [30, '~15 मिनट · गंभीर', '~15 min · serious']].map(([n, hi, en]) => `<button class="choice" data-act="wz-goal" data-v="${n}" aria-pressed="${(onb.goal || U.s.goal) === n}">${L(`${n} प्रश्न रोज़`, `${n} questions a day`)}<span>${L(hi, en)}</span></button>`).join('')}</div>${foot('wz-next')}`;
  else body = `<h1>${L('5 प्रश्नों से अपना स्तर जानें', 'Find your level with 5 questions')}</h1><p class="lead">${L('अलग-अलग विषयों से 5 प्रश्न। इससे सुझाव आपके स्तर के अनुसार होंगे। कोई पॉइंट्स नहीं कटेंगे।', 'Five questions from different subjects, so suggestions match your level. Nothing is deducted.')}</p>
    <ul class="facts"><li>${ic('check')}<span>${L('लगभग 2 मिनट', 'About 2 minutes')}</span></li><li>${ic('check')}<span>${L('हर उत्तर पर व्याख्या', 'An explanation after every answer')}</span></li><li>${ic('check')}<span>${L('चाहें तो छोड़ दें', 'Skip it if you like')}</span></li></ul>
    <div class="onb-foot"><button class="btn btn-grey" data-act="wz-finish">${L('अभी छोड़ें', 'Skip for now')}</button><button class="btn btn-cta" data-act="start-assess" ${C.baseState !== 'ok' ? 'disabled' : ''}>${ic('play')} ${L('शुरू करें', 'Start')}</button></div>`;
  return `<main class="onb-page gutter">${dots}${body}</main>`;
}
function assessQuestions() {
  const m = M(), out = [];
  for (const [s, d] of [['history', 1], ['geography', 2], ['polity', 1], ['science', 1], ['misc', 2]]) {
    const pool = (m.bySubj[s] || []).filter(q => (q.d || 1) >= d);
    const q = shuffle(pool.length ? pool : m.bySubj[s] || [], rng('assess:' + s))[0];
    if (q) out.push(q);
  }
  return out;
}
const levelName = sc => (sc == null ? '' : sc >= 80 ? L('उन्नत', 'Advanced') : sc >= 40 ? L('मध्यम', 'Intermediate') : L('शुरुआती', 'Beginner'));
