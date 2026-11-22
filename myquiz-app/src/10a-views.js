// ───────────────────────────── views: learner ─────────────────────────────
function notifications() {
  const m = M(), t = todayISO(), out = [];
  const todays = m.daysByMd[t.slice(5)] || [];
  if (todays.length) out.push({ icon: 'calendar', text: L('आज का दिन: ', 'Today: ') + todays.map(dT).join(', '), to: 'today' });
  const recent = m.news.filter(n => diffDays(n.date, t) <= 3 && diffDays(n.date, t) >= 0).length;
  if (recent) out.push({ icon: 'newspaper', text: L(`पिछले 3 दिनों की ${recent} नई करेंट अफेयर्स`, `${recent} new current-affairs items in the last 3 days`), to: 'ca' });
  const due = U.due().length;
  if (due) out.push({ icon: 'rotate', text: L(`${due} प्रश्न दोहराव के लिए तैयार`, `${due} questions ready for revision`), act: 'start-revision' });
  if (!U.s.daily[t] && C.baseState === 'ok') out.push({ icon: 'zap', text: L('आज का दैनिक क्विज अभी बाकी है', 'Today\'s daily quiz is still waiting'), act: 'start-daily' });
  const rank = LB.myRank('week');
  if (rank && rank <= 10) out.push({ icon: 'trophy', text: L(`आप इस सप्ताह लीडरबोर्ड पर #${rank} हैं`, `You are #${rank} on this week's leaderboard`), to: 'leaders' });
  return out;
}
function newsCard(n) {
  const c = catOf(n.cat);
  return `<button class="news" data-act="open-news" data-id="${esc(n.id)}" style="--c1:${c.c1};--c2:${c.c2}"><span class="thumb">${ic(c.icon)}</span><span class="news-main"><span><span class="badge">${esc(catLabel(n.cat))}</span></span><span class="nt">${esc(nT(n))}</span><span class="ns">${esc(nS(n))}</span><span class="more">${L('विस्तार से पढ़ें', 'Read more')} ${ic('arrow-right')}</span></span></button>`;
}
const langBtn = (cls = 'iconbtn') => `<button class="${cls} lang-btn" data-act="lang-toggle" aria-label="${L('Switch to English', 'हिंदी में बदलें')}" title="${L('Switch to English', 'हिंदी में बदलें')}"><span>${L('EN', 'हिं')}</span></button>`;
const onb = { name: '', exam: '', goal: 10 };
function explainBox(q, a) {
  const o = qO(q), why = qWhy(q), ctx = qCtx(q), ref = qRef(q), n = q.n && M().newsById.get(q.n);
  const head = a.sel === -1 ? `<span class="ans-bad">${ic('clock')} ${L('समय समाप्त!', 'Time is up!')}</span>` : a.ok ? `<span class="ans-ok">${ic('check')} ${L('सही उत्तर!', 'Correct!')}</span>` : `<span class="ans-bad">${ic('x')} ${L('गलत उत्तर', 'Wrong answer')}</span>`;
  const st = S.ai[q.id];
  const earned = a.pts ? `<span class="pts pts-pop">+${a.pts} ${L('पॉइंट्स', 'points')}</span>` : '';
  const notes = o.map((x, i) => (i !== q.a && why[i] ? `<li><span class="key" aria-hidden="true">${LETTERS[i]}</span><span><b>${esc(x)}:</b> ${esc(why[i])}</span></li>` : '')).join('');
  const related = (M().byCh[chOf(q)] || []).length > 1;
  return `<div class="explain" role="region" aria-label="${L('व्याख्या', 'Explanation')}">
    <div class="ex-head"><h3>${head}</h3>${earned}</div>
    <div class="ex-sec" style="border-top:0;padding-top:0"><h4>${ic('check')} ${L('सही उत्तर', 'Correct answer')}: ${LETTERS[q.a]}. ${esc(o[q.a])}</h4><p>${esc(qE(q) || L('व्याख्या जल्द जोड़ी जाएगी।', 'An explanation will be added soon.'))}</p></div>
    ${notes ? `<div class="ex-sec"><h4>${ic('x')} ${L('बाकी विकल्प क्यों गलत हैं', 'Why the other options are wrong')}</h4><ul class="why-list">${notes}</ul></div>` : ''}
    ${ctx ? `<div class="ex-sec"><h4>${ic('bulb')} ${L('पृष्ठभूमि और जुड़े तथ्य', 'Background and related facts')}</h4><p>${esc(ctx)}</p></div>` : ''}
    <div class="ex-sec"><h4>${ic('graduation')} ${L('परीक्षा में उपयोगी', 'Exam relevance')}</h4><p class="excats">${examsOf(q).map(e => `<span class="tag">${esc(examLabel(e))}</span>`).join('')} ${diffBars(q.d)}</p></div>
    ${ref || n ? `<p class="ex-ref">${ic('book')} ${L('स्रोत', 'Source')}: ${n ? `<button class="link" data-act="open-news" data-id="${esc(n.id)}">${esc(nT(n))}</button>${nSrc(n) ? ' — ' + esc(nSrc(n)) : ''}` : esc(ref)}</p>` : ''}
    ${st ? `<div class="ai-box" id="ai-${esc(q.id)}">${esc(st.text || L('सोच रहा है…', 'Thinking…'))}</div>${st.err ? `<p class="small" style="color:var(--bad);margin:0">${esc(st.err)}</p>` : ''}` : ''}
    <div class="btnrow">${related ? `<button class="btn btn-sm btn-outline" data-act="practice-related" data-id="${esc(q.id)}">${ic('layers')} ${L('जुड़े प्रश्न', 'Related practice')}</button>` : ''}${AI.available() && !st ? `<button class="btn btn-sm btn-outline" data-act="ai-explain" data-id="${esc(q.id)}">${ic('sparkles')} ${L('AI से और समझें', 'Explain more with AI')}</button>` : ''}${AI.available() ? `<button class="btn btn-sm btn-outline" data-act="tutor" data-id="${esc(q.id)}">${ic('message')} ${L('AI ट्यूटर से पूछें', 'Ask the AI tutor')}</button>` : ''}</div>
  </div>`;
}
function vPlay() {
  if (!S || !S.qs.length) return redirect('quiz');
  const q = S.qs[S.i], n = S.qs.length, a = S.ans[q.id], o = qO(q);
  const opts = o.map((x, i) => {
    let cls = '', mark = '';
    if (a) {
      if (i === q.a) { cls = 'ok'; mark = `<span class="mark">${ic('check')}</span>`; }
      else if (i === a.sel) { cls = 'bad'; mark = `<span class="mark">${ic('x')}</span>`; }
    }
    return `<button class="opt ${cls}" data-act="answer" data-i="${i}" ${a ? 'disabled' : ''}><span class="key">${LETTERS[i]}.</span><span class="txt">${esc(x)}</span>${mark}</button>`;
  }).join('');
  const bm = U.isBm('q', q.id);
  const last = S.i === n - 1;
  const timer = S.timed && !a ? `<span class="timer" id="qtimer">${ic('clock')} <span id="qtimer-v">${TIMED_SECONDS}</span> ${L('से.', 's')}</span>` : '';
  return `${appbar(esc(sTitle()), { back: S.back, right: `${langBtn()}<span class="pill pill-q tnum">${L('प्रश्न', 'Q')} ${S.i + 1} / ${n}</span>` })}
<main class="page gutter">
  <div class="qtop">
    <div class="progress" role="progressbar" aria-label="${L('प्रगति', 'Progress')}" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${S.i + 1}"><i style="width:${((S.i + (a ? 1 : 0)) / n) * 100}%"></i></div>
    <div class="qmeta"><span class="tag">${esc(subjName(q.s))} · ${esc(chName(chOf(q)))}</span>${diffBars(q.d)}<span class="qmeta-r">${S.pts ? ptsChip(S.pts) : ''}${timer}</span></div>
  </div>
  <h2 class="qtext">${esc(qT(q))}</h2>
  <div class="opts" role="group" aria-label="${L('विकल्प', 'Options')}">${opts}</div>
  ${a ? explainBox(q, a) : ''}
  <div class="qtools">
    <button class="btn btn-sm btn-outline" data-act="bm-q" data-id="${esc(q.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? L('सहेजा गया', 'Saved') : L('बुकमार्क', 'Save')}</button>
    <button class="btn btn-sm btn-outline" data-act="share-q">${ic('share')} ${L('शेयर', 'Share')}</button>
    <button class="btn btn-sm btn-outline" data-act="report-q" data-id="${esc(q.id)}">${ic('flag')} ${L('त्रुटि बताएँ', 'Report error')}</button>
  </div>
  <div class="qfoot">
    <button class="btn btn-grey" data-act="prev-q" ${S.i === 0 ? 'disabled' : ''}>${ic('arrow-left')} ${L('पिछला प्रश्न', 'Previous')}</button>
    <button class="btn btn-cta" data-act="next-q">${last ? L('परिणाम देखें', 'See result') : L('अगला प्रश्न', 'Next question')} ${ic('arrow-right')}</button>
  </div>
</main>`;
}

function vResult() {
  if (!S || !S.done) return redirect('quiz');
  const n = S.qs.length;
  let c = 0, w = 0, sk = 0;
  for (const q of S.qs) { const a = S.ans[q.id]; if (!a) sk++; else if (a.ok) c++; else w++; }
  const p = n ? c / n : 0;
  const secs = Math.round((S.endedAt - S.startedAt) / 1000);
  const msg = p >= 0.8 ? L('शानदार! आपकी तैयारी बहुत अच्छी है।', 'Excellent! Your preparation is strong.') : p >= 0.5 ? L('अच्छा प्रयास! थोड़ा और अभ्यास करें।', 'Good effort! A little more practice.') : L('कोई बात नहीं — गलत प्रश्न दोहराएँ, सुधार ज़रूर होगा।', 'No problem: revise the wrong ones and you will improve.');
  const review = S.qs.map((q, i) => {
    const a = S.ans[q.id], o = qO(q);
    const yours = a ? (a.sel === -1 ? L('समय समाप्त', 'Time ran out') : o[a.sel]) : L('छोड़ा गया', 'Skipped');
    return `<div class="review-item"><b>${i + 1}. ${esc(qT(q))}</b><span class="ans">${L('सही उत्तर', 'Correct answer')}: <span class="ans-ok">${esc(o[q.a])}</span></span>${a && a.ok ? '' : `<span class="ans">${L('आपका उत्तर', 'Your answer')}: <span class="ans-bad">${esc(yours)}</span></span>`}<span class="small muted">${esc(qE(q) || '')}</span></div>`;
  }).join('');
  const qPts = S.pts - S.bonus.reduce((x, b) => x + b[1], 0);
  return `${appbar(L('परिणाम', 'Result'), { back: S.back })}
<main class="page gutter">
  <section class="card result-hero">
    <div class="big-ring">${ring(p, 150, 12, p >= 0.5 ? 'var(--ring)' : 'var(--bad-solid)')}<b class="tnum">${c}/${n}<small>${L('सही उत्तर', 'correct')}</small></b></div>
    <h2 style="font-family:var(--font-display);font-size:1.35rem;margin:6px 0 0">${esc(sTitle())}</h2>
    <p class="muted" style="margin:0">${msg}</p>
    <span class="pill pill-gold">${ic('coins')} +${fmtNum(S.pts)} ${L('पॉइंट्स', 'points')}</span>
  </section>
  <section class="card" style="display:flex;flex-direction:column;gap:8px"><h3 class="sec-title" style="font-size:1rem">${ic('coins')} ${L('इस राउंड के पॉइंट्स', 'Points this round')}</h3>
    <div class="ptsrow"><span>${L('प्रश्नों से', 'From questions')}</span><b>+${fmtNum(qPts)}</b></div>
    ${S.bonus.map(([r, v]) => `<div class="ptsrow"><span>${L(PTS_REASON[r][0], PTS_REASON[r][1])}</span><b>+${v}</b></div>`).join('')}
    ${!S.pts ? `<p class="small muted" style="margin:0">${L('इन प्रश्नों के पॉइंट्स आज पहले ही मिल चुके हैं। नए प्रश्न हल करें या कल फिर खेलें।', 'You already earned points for these questions today. Try new questions or play again tomorrow.')}</p>` : ''}
    <a class="link" href="#leaders">${L('लीडरबोर्ड देखें', 'See the leaderboard')} ${ic('chev-right')}</a></section>
  <div class="stats">
    <div class="stat s-ok"><b>${c}</b><span>${L('सही', 'Correct')}</span></div><div class="stat s-bad"><b>${w}</b><span>${L('गलत', 'Wrong')}</span></div><div class="stat"><b>${sk}</b><span>${L('छोड़े', 'Skipped')}</span></div>
    <div class="stat"><b>${pct(c, n)}%</b><span>${L('सटीकता', 'Accuracy')}</span></div><div class="stat"><b class="tnum">${fmtSecs(secs)}</b><span>${L('समय', 'Time')}</span></div><div class="stat"><b>${U.streak()}</b><span>${L('दिन की स्ट्रीक', 'Day streak')}</span></div>
  </div>
  ${S.kind === 'assess' ? `<section class="card next"><span class="k">${L('आपका स्तर', 'Your level')}</span><h3>${levelName(U.s.level)} · ${U.s.level}%</h3><p>${U.s.level >= 80 ? L('बहुत बढ़िया! उन्नत अध्याय और मॉक टेस्ट से शुरुआत करें।', 'Excellent! Start with advanced chapters and mock tests.') : U.s.level >= 40 ? L('अच्छी शुरुआत। रोज़ की चुनौती और अध्याय-अभ्यास से आगे बढ़ें।', 'A good start. Build up with the daily challenge and chapter practice.') : L('कोई बात नहीं — आसान अध्यायों से शुरू करें, हर व्याख्या ध्यान से पढ़ें।', 'No problem — start with beginner chapters and read every explanation.')}</p><button class="btn btn-cta btn-block" data-act="nav" data-to="home">${L('मेरा डैशबोर्ड', 'My dashboard')} ${ic('arrow-right')}</button></section>` : ''}
  <div class="btnrow">${w + sk ? `<button class="btn btn-cta" data-act="retry-wrong">${ic('rotate')} ${L('गलत/छोड़े प्रश्न दोबारा', 'Retry wrong / skipped')}</button>` : ''}<button class="btn btn-outline" data-act="share-result">${ic('share')} ${L('स्कोर शेयर करें', 'Share score')}</button></div>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} ${L('उत्तरों की समीक्षा', 'Answer review')}</h2><div class="list">${review}</div></section>
  <div class="grid2"><a class="btn btn-grey" href="#learn">${L('सीखें', 'Learn')}</a><a class="btn btn-navy" href="#home">${L('होम', 'Home')}</a></div>
</main>`;
}

let caCat = '';
let dayCursor = null; // ISO date shown on "आज का दिन" (null = today)
let dayPick = 0;
function upcomingDays(fromISO, n) {
  const m = M(), out = [];
  for (let i = 1; i <= 366 && out.length < n; i++) {
    const d = addDays(fromISO, i);
    for (const e of (m.daysByMd[d.slice(5)] || [])) { if (out.length < n) out.push({ ...e, iso: d }); }
  }
  return out;
}
function openDayCalendar(month) {
  const m = M();
  const cur = month ?? parseISO(dayCursor || todayISO()).getMonth();
  const year = parseISO(todayISO()).getFullYear();
  const items = m.days.filter(d => Number(d.md.slice(0, 2)) === cur + 1);
  openSheet(`${sheetHead(L('महत्वपूर्ण दिवस कैलेंडर', 'Important days calendar'))}
  <div class="chips">${MONTHS[LANG].map((mn, i) => `<button class="chip" data-act="cal-month" data-v="${i}" aria-pressed="${i === cur}">${mn}</button>`).join('')}</div>
  <div class="list">${items.length ? items.map(d => `<button class="row" data-act="day-goto" data-iso="${year}-${d.md}"><span class="upc"><span class="d"><b class="tnum">${Number(d.md.slice(3))}</b><span>${monthShort(cur)}</span></span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(dT(d))}</span><span class="row-sub">${esc(kindLabel(d.k))}</span></span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('calendar', L('इस महीने में कोई दिवस दर्ज नहीं', 'No days listed for this month'), '')}</div>`, { label: L('कैलेंडर', 'Calendar') });
  const el = $('[data-act="cal-month"][aria-pressed="true"]'); if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' });
}

