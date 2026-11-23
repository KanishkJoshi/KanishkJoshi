function vMock() {
  if (E && !E.submitted && Date.now() > E.endsAt) { setTimeout(() => submitExam(true), 0); }
  const cards = MOCKS.map(mk => {
    const hist = U.s.mocks.filter(h => h.id === mk.id);
    const n = C.baseState === 'ok' ? mockQuestionIds(mk).length : 0;
    const best = hist.length ? Math.max(...hist.map(h => h.score)) : null;
    return `<article class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-head"><h2 style="font-size:1.12rem;font-weight:800;line-height:1.35">${esc(mockTitle(mk))}</h2>${hist.length ? `<span class="tag">${L(`${hist.length} बार दिया`, `Taken ${hist.length}×`)}</span>` : `<span class="tag tag-live">${L('नया', 'New')}</span>`}</div>
      <p class="small muted" style="margin:0">${esc(L(mk.desc, mk.descEn))}</p>
      <div class="chips wrap"><span class="chip">${ic('help')} ${n} ${L('प्रश्न', 'questions')}</span><span class="chip">${ic('clock')} ${mk.mins} ${L('मिनट', 'min')}</span><span class="chip">${ic('target')} +${mk.pos} / −${mk.neg}</span><span class="chip">${ic('coins')} ${L(`अंक × ${PTS.mockX} पॉइंट्स`, `score × ${PTS.mockX} points`)}</span></div>
      ${best != null ? `<p class="small" style="margin:0">${L('सर्वश्रेष्ठ स्कोर', 'Best score')}: <b>${fmtScore(best)}</b> / ${n * mk.pos}</p>` : ''}
      <button class="btn btn-cta" data-act="mock-intro" data-id="${mk.id}" ${n < 5 ? 'disabled' : ''}>${ic('play')} ${L('परीक्षा शुरू करें', 'Start test')}</button>
    </article>`;
  }).join('');
  const resume = E && !E.submitted ? `<div class="note note-warn">${ic('clock')}<div><b>${L('एक परीक्षा जारी है', 'A test is in progress')}: ${esc(examTitle(E))}</b><br><button class="link" data-act="exam-resume">${L('जारी रखें', 'Continue')} ${ic('arrow-right')}</button></div></div>` : '';
  const hist = U.s.mocks.slice(0, 5).map(h => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(examTitle(h) || h.title)}</span><span class="row-sub">${fmtDate(h.date)} · ${L(`सही ${h.c}, गलत ${h.w}, छोड़े ${h.u}`, `${h.c} right, ${h.w} wrong, ${h.u} skipped`)}</span></span><b class="tnum">${fmtScore(h.score)}/${h.max}</b></div>`).join('');
  return `${appbar(`${ic('clipboard')} ${L('अभ्यास परीक्षा', 'Mock Tests')}`, { back: 'home' })}
<main class="page gutter">
  <div class="note">${ic('info')}<div>${L('परीक्षा जैसा अनुभव: समय-सीमा, नेगेटिव मार्किंग, प्रश्न पैलेट और "समीक्षा हेतु चिह्नित" विकल्प।', 'A real exam feel: time limit, negative marking, question palette and "mark for review".')}</div></div>
  ${resume}
  ${C.baseState === 'loading' ? skeletonCards(2) : cards}
  ${hist ? `<section><h2 class="sec-title" style="margin-bottom:10px">${ic('chart')} ${L('पिछले प्रयास', 'Previous attempts')}</h2><div class="list">${hist}</div></section>` : ''}
</main>
${bottomNav('')}`;
}
function openMockIntro(id) {
  const mk = MOCKS.find(x => x.id === id);
  if (!mk) return;
  const n = mockQuestionIds(mk).length;
  openSheet(`${sheetHead(esc(mockTitle(mk)))}
  <ul class="facts">
    <li>${ic('check')}<span>${L(`कुल ${n} प्रश्न, समय ${mk.mins} मिनट। समय पूरा होते ही परीक्षा अपने-आप सबमिट होगी।`, `${n} questions in ${mk.mins} minutes. The test submits itself when time runs out.`)}</span></li>
    <li>${ic('check')}<span>${L(`सही उत्तर पर +${mk.pos} अंक, गलत उत्तर पर −${mk.neg} अंक। छोड़े गए प्रश्न पर 0।`, `+${mk.pos} marks for a right answer, −${mk.neg} for a wrong one, 0 for a skipped one.`)}</span></li>
    <li>${ic('check')}<span>${L('"समीक्षा हेतु चिह्नित" से प्रश्न बाद में देखने के लिए निशान लगाएँ। चिह्नित प्रश्न का चुना हुआ उत्तर भी गिना जाएगा।', 'Use "mark for review" to come back to a question later. A marked question\'s chosen answer still counts.')}</span></li>
    <li>${ic('check')}<span>${L(`ऊपर ${ic('grid')} पैलेट से किसी भी प्रश्न पर सीधे जाएँ।`, `Jump to any question from the ${ic('grid')} palette at the top.`)}</span></li>
    <li>${ic('coins')}<span>${L(`रिवॉर्ड: हर सही उत्तर के पॉइंट्स, और कुल अंक × ${PTS.mockX} बोनस पॉइंट्स (हर टेस्ट पर दिन में एक बार)।`, `Rewards: points for each right answer, plus your score × ${PTS.mockX} as bonus points (once per test per day).`)}</span></li>
  </ul>
  <label class="check"><input type="checkbox" id="mock-agree"> ${L('मैंने सभी निर्देश पढ़ लिए हैं।', 'I have read all the instructions.')}</label>
  <button class="btn btn-cta btn-block" id="mock-start" data-act="mock-start" data-id="${mk.id}" disabled>${ic('play')} ${L('परीक्षा शुरू करें', 'Start test')}</button>`, { label: mockTitle(mk) });
}

function vExam() {
  if (!E || E.submitted) return redirect('mock');
  const id = E.qs[E.i], q = examQ(id);
  if (!q) { setTimeout(() => examMove(E.i + 1 < E.qs.length ? E.i + 1 : 0), 0); return ''; }
  const st = E.st[id] || {}, n = E.qs.length;
  const remaining = Math.max(0, E.endsAt - Date.now());
  const opts = qO(q).map((o, i) => `<button class="opt ${st.sel === i ? 'sel' : ''}" data-act="exam-sel" data-i="${i}" aria-pressed="${st.sel === i}"><span class="key">${LETTERS[i]}</span><span class="txt">${esc(o)}</span></button>`).join('');
  return `<header class="exambar"><div class="exambar-in gutter">
    <button class="iconbtn" data-act="exam-exit" aria-label="${L('परीक्षा से बाहर जाएँ', 'Leave the test')}">${ic('x')}</button>
    <span class="t">${esc(examTitle(E))}</span>
    <span class="timer tnum ${remaining < 60000 ? 'low' : ''}" id="etimer">${ic('clock')} <span id="etimer-v">${fmtSecs(Math.ceil(remaining / 1000))}</span></span>
    ${langBtn()}
    <button class="iconbtn" data-act="exam-palette" aria-label="${L('प्रश्न पैलेट', 'Question palette')}">${ic('grid')}</button>
  </div></header>
<main class="page gutter">
  <div class="qmeta"><b class="tnum">${L('प्रश्न', 'Question')} ${E.i + 1} / ${n}</b><span class="tag">${esc(subjName(q.s))}</span><span class="small muted tnum">+${E.pos} / −${E.neg}</span></div>
  <div class="progress" aria-hidden="true"><i style="width:${(examCounts().ans / n) * 100}%"></i></div>
  <h2 class="qtext">${esc(qT(q))}</h2>
  <div class="opts" role="group" aria-label="${L('विकल्प', 'Options')}">${opts}</div>
  ${st.mk ? `<p class="small" style="margin:0;color:var(--violet);font-weight:700">${ic('flag')} ${L('यह प्रश्न समीक्षा हेतु चिह्नित है', 'This question is marked for review')}</p>` : ''}
</main>
<div class="exam-actions gutter">
  <button class="btn btn-sm btn-outline" data-act="exam-mark">${ic('flag')} ${st.mk ? L('चिह्न हटाएँ', 'Unmark') : L('समीक्षा हेतु चिह्नित', 'Mark for review')}</button>
  <button class="btn btn-sm btn-outline" data-act="exam-clear" ${st.sel == null ? 'disabled' : ''}>${ic('rotate')} ${L('उत्तर हटाएँ', 'Clear answer')}</button>
  <button class="btn btn-grey" data-act="exam-prev" ${E.i === 0 ? 'disabled' : ''}>${ic('arrow-left')} ${L('पिछला', 'Previous')}</button>
  <button class="btn btn-cta" data-act="exam-next">${E.i === n - 1 ? L('सबमिट करें', 'Submit') : L('सेव करें और आगे', 'Save & next')} ${ic('arrow-right')}</button>
</div>`;
}
function paletteHtml() {
  const k = examCounts();
  return `${sheetHead(L('प्रश्न पैलेट', 'Question palette'))}
  <div class="legend">
    <span><i style="background:var(--ok-solid);border-color:var(--ok-solid)"></i>${L('उत्तर दिया', 'Answered')} (${k.ans})</span>
    <span><i style="background:var(--bad-solid);border-color:var(--bad-solid)"></i>${L('उत्तर नहीं दिया', 'Not answered')} (${k.na})</span>
    <span><i style="background:var(--violet);border-color:var(--violet);border-radius:50%"></i>${L('समीक्षा हेतु', 'For review')} (${k.mk})</span>
    <span><i></i>${L('नहीं देखा', 'Not seen')} (${k.nv})</span>
  </div>
  <div class="pal">${E.qs.map((id, i) => { const s = E.st[id] || {}; const cls = s.mk ? (s.sel != null ? 'p-mka' : 'p-mk') : s.sel != null ? 'p-ans' : s.v ? 'p-na' : ''; return `<button class="${cls} ${i === E.i ? 'p-cur' : ''}" data-act="exam-go" data-i="${i}" aria-label="${L('प्रश्न', 'Question')} ${i + 1}">${i + 1}</button>`; }).join('')}</div>
  <button class="btn btn-cta btn-block" data-act="exam-submit-ask">${ic('send')} ${L('परीक्षा सबमिट करें', 'Submit test')}</button>`;
}
function submitAskHtml() {
  const k = examCounts();
  return `${sheetHead(L('परीक्षा सबमिट करें?', 'Submit the test?'))}
  <div class="stats"><div class="stat s-ok"><b>${k.ans}</b><span>${L('उत्तर दिए', 'Answered')}</span></div><div class="stat s-bad"><b>${E.qs.length - k.ans}</b><span>${L('बाकी', 'Left')}</span></div><div class="stat"><b>${k.mk}</b><span>${L('चिह्नित', 'Marked')}</span></div></div>
  <p class="muted" style="margin:0">${L('सबमिट करने के बाद उत्तर नहीं बदले जा सकेंगे।', 'You cannot change answers after submitting.')}</p>
  <div class="grid2"><button class="btn btn-grey" data-act="sheet-close">${L('वापस जाएँ', 'Go back')}</button><button class="btn btn-cta" data-act="exam-submit">${L('हाँ, सबमिट करें', 'Yes, submit')}</button></div>`;
}
function vExamResult() {
  const R = lastExam;
  if (!R || !R.ex) return redirect('mock');
  const ex = R.ex, p = R.max ? Math.max(0, R.score) / R.max : 0;
  const bars = Object.entries(R.bySubj).map(([s, b]) => `<div class="bar-row" style="--c:${SUBJ[s] ? SUBJ[s].c : 'var(--brand)'}"><span>${esc(subjName(s))}</span><span class="track"><i style="width:${pct(b.c, b.n)}%"></i></span><b>${b.c}/${b.n}</b></div>`).join('');
  const sol = ex.qs.map((id, i) => {
    const q = examQ(id, ex);
    if (!q) return '';
    const s = ex.st[id] || {}, o = qO(q);
    const yours = s.sel == null ? L('छोड़ा गया', 'Skipped') : o[s.sel];
    const ok = s.sel === q.a;
    return `<div class="review-item"><b>${i + 1}. ${esc(qT(q))}</b><span class="ans">${L('सही उत्तर', 'Correct answer')}: <span class="ans-ok">${esc(o[q.a])}</span></span>${ok ? `<span class="ans ans-ok">+${ex.pos}</span>` : `<span class="ans">${L('आपका उत्तर', 'Your answer')}: <span class="ans-bad">${esc(yours)}</span>${s.sel == null ? '' : ` <span class="ans-bad">(−${ex.neg})</span>`}</span>`}<span class="small muted">${esc(qE(q) || '')}</span></div>`;
  }).join('');
  const tm = ex.tm || {}, answered = ex.qs.filter(id => (ex.st[id] || {}).sel != null);
  const avg = answered.length ? Math.round(answered.reduce((x, id) => x + (tm[id] || 0), 0) / answered.length / 1000) : 0;
  const slow = ex.qs.filter(id => tm[id]).sort((a, b) => tm[b] - tm[a]).slice(0, 3).map(id => examQ(id, ex)).filter(Boolean);
  const opp = ex.kind === 'friend' && ex.meta && ex.meta.opp;
  const retake = MOCKS.some(mk => mk.id === ex.id) ? `<button class="btn btn-cta" data-act="mock-intro" data-id="${esc(ex.id)}">${ic('rotate')} ${L('फिर से दें', 'Retake')}</button>` : `<button class="btn btn-cta" data-act="exam-retake">${ic('rotate')} ${L('फिर से दें', 'Retake')}</button>`;
  return `${appbar(L('परीक्षा परिणाम', 'Test result'), { back: ex.back || 'mock' })}
<main class="page gutter">
  <section class="card result-hero">
    <div class="big-ring">${ring(p, 150, 12, p >= 0.5 ? 'var(--ring)' : 'var(--bad-solid)')}<b class="tnum">${fmtScore(R.score)}<small>/ ${R.max} ${L('अंक', 'marks')}</small></b></div>
    <h2 style="font-family:var(--font-display);font-size:1.3rem;margin:6px 0 0">${esc(examTitle(ex))}</h2>
    <p class="muted" style="margin:0">${L('नेगेटिव मार्किंग सहित स्कोर', 'Score after negative marking')}</p>
    ${R.pts != null ? `<span class="pill pill-gold">${ic('coins')} +${fmtNum(R.pts)} ${L('पॉइंट्स', 'points')}</span>${R.bonus ? `<span class="small muted">${L(`इसमें मॉक बोनस +${R.bonus} शामिल`, `Includes a mock bonus of +${R.bonus}`)}</span>` : ''}` : ''}
  </section>
  ${opp ? `<section class="card next"><span class="k">${L('दोस्त से तुलना', 'You vs your friend')}</span><h3>${R.score > opp.sc ? L('आप जीत गए! 🎉', 'You won! 🎉') : R.score === opp.sc ? L('बराबरी!', 'It\'s a tie!') : L(`${opp.n || 'दोस्त'} आगे रहे — फिर कोशिश करें`, `${opp.n || 'Your friend'} is ahead — try again`)}</h3>
    <p>${L('आप', 'You')}: <b>${fmtScore(R.score)}/${R.max}</b> (${fmtSecs(R.timeSec)}) · ${esc(opp.n || L('दोस्त', 'Friend'))}: <b>${fmtScore(opp.sc)}/${opp.max}</b>${opp.sec ? ` (${fmtSecs(opp.sec)})` : ''}</p>
    <button class="btn btn-cta btn-block" data-act="friend-share">${ic('share')} ${L('अपना स्कोर वापस भेजें', 'Send your score back')}</button></section>` : ''}
  ${ex.kind === 'friend' && !opp ? `<section class="card next"><span class="k">${L('दोस्त को चुनौती', 'Challenge a friend')}</span><h3>${L('अब दोस्त की बारी!', 'Now it\'s your friend\'s turn!')}</h3><p>${L('लिंक/कोड भेजें — दोस्त यही प्रश्न हल करेगा और दोनों के स्कोर की तुलना होगी।', 'Send the link/code — your friend answers the same questions and you compare scores.')}</p><button class="btn btn-cta btn-block" data-act="friend-share">${ic('share')} ${L('चुनौती भेजें', 'Send the challenge')}</button></section>` : ''}
  ${ex.kind === 'wchal' ? `<div class="note">${ic('swords')}<div>${R.firstTry ? L(`साप्ताहिक चुनौती का आपका आधिकारिक स्कोर ${fmtScore(R.score)}/${R.max} दर्ज हुआ।`, `Your official weekly challenge score of ${fmtScore(R.score)}/${R.max} is recorded.`) : L('यह अभ्यास प्रयास था — आधिकारिक स्कोर पहला प्रयास ही रहता है।', 'This was a practice attempt — your official score is your first attempt.')}</div></div>` : ''}
  <div class="stats">
    <div class="stat s-ok"><b>${R.c}</b><span>${L('सही', 'Correct')}</span></div><div class="stat s-bad"><b>${R.w}</b><span>${L('गलत', 'Wrong')}</span></div><div class="stat"><b>${R.u}</b><span>${L('छोड़े', 'Skipped')}</span></div>
    <div class="stat"><b>${pct(R.c, R.c + R.w)}%</b><span>${L('सटीकता', 'Accuracy')}</span></div><div class="stat"><b>${R.c + R.w}/${R.n}</b><span>${L('प्रयास', 'Attempted')}</span></div><div class="stat"><b class="tnum">${fmtSecs(R.timeSec)}</b><span>${L('समय', 'Time')}</span></div>
  </div>
  <section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 class="sec-title" style="font-size:1.05rem">${ic('clock')} ${L('समय विश्लेषण', 'Time analysis')}</h2>
    <p class="small" style="margin:0">${L(`औसत ${avg} सेकंड प्रति हल किया प्रश्न। सही उत्तर पर +${ex.pos}, गलत पर −${fmtScore(ex.neg)}।`, `Average ${avg} seconds per answered question. +${ex.pos} per right answer, −${fmtScore(ex.neg)} per wrong one.`)}</p>
    ${slow.length ? `<span class="small muted">${L('सबसे ज़्यादा समय लिया', 'Took the longest')}:</span><ul class="small" style="margin:0;padding-left:1.2em">${slow.map(q => `<li>${esc(qT(q).slice(0, 80))}${qT(q).length > 80 ? '…' : ''} — ${Math.round((tm[q.id] || 0) / 1000)} ${L('से.', 's')}</li>`).join('')}</ul>` : ''}</section>
  <section class="card"><h2 class="sec-title" style="font-size:1.05rem;margin-bottom:12px">${ic('chart')} ${L('विषयवार प्रदर्शन', 'Subject-wise performance')}</h2><div class="bars">${bars}</div></section>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} ${L('समाधान', 'Solutions')}</h2><div class="list">${sol}</div></section>
  <div class="grid2">${retake}<a class="btn btn-grey" href="#compete">${L('मुक़ाबला', 'Compete')}</a></div>
</main>`;
}

let bmTab = 'q';
function vBookmarks() {
  const m = M();
  const qs = U.s.bm.q.map(id => m.byId.get(id)).filter(Boolean);
  const ns = U.s.bm.n.map(id => m.newsById.get(id)).filter(Boolean);
  const qList = qs.length
    ? `<button class="btn btn-cta" data-act="start-bookmarked">${ic('play')} ${L(`इन ${qs.length} प्रश्नों का अभ्यास करें`, `Practise these ${qs.length} questions`)}</button><div class="list">${qs.map(q => `<div class="review-item"><b>${esc(qT(q))}</b><span class="ans">${L('उत्तर', 'Answer')}: <span class="ans-ok">${esc(qO(q)[q.a])}</span></span><span class="small muted">${esc(subjName(q.s))}</span><div><button class="link" data-act="bm-q" data-id="${esc(q.id)}" style="color:var(--bad)">${ic('trash')} ${L('हटाएँ', 'Remove')}</button></div></div>`).join('')}</div>`
    : `<div class="card">${emptyState('bookmark', L('अभी कोई प्रश्न सहेजा नहीं गया', 'No saved questions yet'), L('क्विज खेलते समय "बुकमार्क" दबाकर कठिन प्रश्न यहाँ सहेजें।', 'Tap "Save" during a quiz to keep tricky questions here.'))}</div>`;
  const ds = U.s.bm.d.map(id => m.days.find(d => d.id === id)).filter(Boolean);
  const dList = ds.length ? `<div class="list">${ds.map(d => `<button class="row" data-act="day-goto" data-iso="${parseISO(todayISO()).getFullYear()}-${d.md}"><span class="row-ic" style="--c:var(--brand)">${ic('calendar')}</span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(dT(d))}</span><span class="row-sub">${fmtMD(d.md)} · ${esc(kindLabel(d.k))}</span></span>${ic('chev-right', 'chev')}</button>`).join('')}</div>` : `<div class="card">${emptyState('calendar', L('कोई दिवस सहेजा नहीं गया', 'No saved days'), L('"आज का दिन" में "सहेजें" दबाएँ।', 'Tap "Save" in Today in History.'))}</div>`;
  const nList = ns.length ? ns.map(newsCard).join('') : `<div class="card">${emptyState('newspaper', L('कोई ख़बर सहेजी नहीं गई', 'No saved news'), L('करेंट अफेयर्स में किसी ख़बर को खोलकर "सहेजें" दबाएँ।', 'Open a current-affairs story and tap "Save".'))}</div>`;
  return `${appbar(`${ic('bookmark')} ${L('बुकमार्क', 'Saved')}`, { back: 'revise' })}
<main class="page gutter">
  <div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))" role="group" aria-label="${L('बुकमार्क प्रकार', 'Saved items')}"><button data-act="bm-tab" data-v="q" aria-pressed="${bmTab === 'q'}">${L('प्रश्न', 'Questions')} (${qs.length})</button><button data-act="bm-tab" data-v="n" aria-pressed="${bmTab === 'n'}">${L('समाचार', 'News')} (${ns.length})</button><button data-act="bm-tab" data-v="d" aria-pressed="${bmTab === 'd'}">${L('दिवस', 'Days')} (${ds.length})</button></div>
  ${bmTab === 'q' ? qList : bmTab === 'd' ? dList : nList}
</main>
${bottomNav('bookmarks')}`;
}

// ── leaderboard: names and points only; rows are plain text (no profile links) ──
let lbTab = 'week';
const LB_TABS = [['week', 'इस सप्ताह', 'This week'], ['lastweek', 'पिछला सप्ताह', 'Last week'], ['month', 'इस महीने', 'This month'], ['winners', 'विजेता', 'Winners']];
const MEDALS = ['#E8A400', '#9AA4B2', '#C26B2E'];
function lbAvatar(r, i = -1) {
  const style = i >= 0 && i < 3 ? ` style="--medal:${MEDALS[i]}"` : '';
  return `<span class="lb-av${i >= 0 && i < 3 ? ' medal' : ''}"${style} aria-hidden="true">${esc(initial(r.n))}</span>`;
}
function lbRow(r) {
  return `<li class="lrow${r.me ? ' me' : ''}"${r.me ? ' aria-current="true"' : ''}><span class="lrank tnum">${r.rank ? r.rank : '–'}</span>${lbAvatar(r)}<span class="lname">${esc(r.n)}${r.me ? ` <span class="tag tag-live">${L('आप', 'You')}</span>` : ''}</span><span class="lpts tnum">${fmtNum(r.p)}</span></li>`;
}
function podium(top) {
  // Ranked order in the markup (1, 2, 3) for screen readers; CSS places #1 in the middle.
  return `<ol class="podium" aria-label="${L('टॉप 3', 'Top 3')}">${[0, 1, 2].filter(i => top[i]).map(i => { const r = top[i]; return `<li class="pod pod-${i + 1}${r.me ? ' me' : ''}"><span class="pod-medal" style="--medal:${MEDALS[i]}">${ic(i === 0 ? 'crown' : 'medal')}<b>${r.rank}</b></span>${lbAvatar(r, i)}<span class="pod-name">${esc(r.n)}</span><span class="pod-pts tnum">${fmtNum(r.p)} <small>${L('पॉइंट्स', 'pts')}</small></span><span class="pod-step"></span></li>`; }).join('')}</ol>`;
}
function lbPeriod(kind) {
  const t = todayISO(), wk = weekKey(t), s = LB.settings;
  if (kind === 'week') return { label: fmtWeek(wk), note: `${ic('clock')} ${L('समाप्त होने में', 'Ends in')} ${timeLeft(LB.msToWeekEnd())}`, prize: L(s.weekPrize, s.weekPrizeEn) };
  if (kind === 'lastweek') { const lw = addDays(wk, -7); const w = LB.winners.find(x => x.kind === 'week' && x.key === lw); return { label: fmtWeek(lw), note: `${ic('check')} ${L('अंतिम परिणाम', 'Final results')}${w ? ' · ' + L('विजेता घोषित', 'winners announced') : ''}`, prize: w ? L(w.prize, w.prizeEn) : L(s.weekPrize, s.weekPrizeEn) }; }
  return { label: fmtMonth(monthKey(t)), note: `${ic('clock')} ${L('समाप्त होने में', 'Ends in')} ${timeLeft(LB.msToMonthEnd())}`, prize: L(s.monthPrize, s.monthPrizeEn) };
}
function lbNotes() {
  const out = [];
  if (P.demo) out.push(`<div class="note">${ic('info')}<div>${L('टेस्ट संस्करण: "(उदाहरण)" वाले नाम नमूना विद्यार्थी हैं, ताकि आप लीडरबोर्ड आज़मा सकें।', 'Test build: names marked "(sample)" are example students so you can try the leaderboard.')}</div></div>`);
  else if (P.cloud && !P.uid) out.push(`<div class="note">${ic('user')}<div>${L('लीडरबोर्ड में जुड़ने के लिए Google से साइन इन करें।', 'Sign in with Google to join the leaderboard.')}<br><button class="link" data-act="google-signin">${L('साइन इन करें', 'Sign in')} ${ic('arrow-right')}</button></div></div>`);
  else if (P.mode === 'standalone' && !P.cloud) out.push(`<div class="note">${ic('info')}<div>${L('यह ऑफ़लाइन संस्करण है — यहाँ सिर्फ़ आपके पॉइंट्स दिखते हैं। ऑनलाइन संस्करण में सभी विद्यार्थियों की रैंकिंग बनती है।', 'This is the offline copy, so only your own points appear here. The online version ranks every student.')}</div></div>`);
  else if (LB.denied || !P.uid) out.push(`<div class="note note-warn">${ic('alert')}<div>${L('आपके पॉइंट्स इस लीडरबोर्ड पर नहीं भेजे जा सके (अनुमति नहीं है)। आपके पॉइंट्स आपकी प्रोफ़ाइल में सुरक्षित हैं।', 'Your points could not be added to this leaderboard (no permission). They are still saved in your profile.')}</div></div>`);
  else if (LB.state === 'error') out.push(`<div class="note note-warn">${ic('alert')}<div>${L('लीडरबोर्ड लोड नहीं हुआ। थोड़ी देर बाद फिर देखें।', 'The leaderboard did not load. Check again in a little while.')}</div></div>`);
  if (U.s.lb.hide) out.push(`<div class="note">${ic('lock')}<div>${L('आपने ख़ुद को लीडरबोर्ड से छिपाया है। ', 'You have hidden yourself from the leaderboard. ')}<a class="link" href="#profile">${L('प्रोफ़ाइल में बदलें', 'Change in Profile')}</a></div></div>`);
  return out.join('');
}
function vWinners() {
  const list = LB.winners.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 12);
  if (!list.length) return `<div class="card">${emptyState('award', L('अभी कोई विजेता घोषित नहीं हुआ', 'No winners announced yet'), L('हर सोमवार पिछले सप्ताह के और हर महीने की 1 तारीख़ को पिछले महीने के टॉप विद्यार्थी यहाँ घोषित होते हैं।', 'Every Monday the top students of the past week, and on the 1st the top students of the past month, are announced here.'))}</div>`;
  const me = LB.myId();
  return list.map(w => {
    const mine = (w.top || []).findIndex(x => x && x.u === me);
    const prize = L(w.prize, w.prizeEn);
    return `<article class="card win-card">
      <div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic(w.kind === 'week' ? 'calendar' : 'award')} ${w.kind === 'week' ? `${L('सप्ताह', 'Week')}: ${fmtWeek(w.key)}` : `${L('महीना', 'Month')}: ${fmtMonth(w.key)}`}</h2></div>
      ${prize ? `<p class="prize-line">${ic('gift')} ${esc(prize)}</p>` : ''}
      ${mine >= 0 ? `<p class="win-me">${ic('crown')} ${L(`बधाई! आप #${mine + 1} पर रहे।`, `Congratulations! You finished #${mine + 1}.`)}</p>` : ''}
      <ol class="win-list">${(w.top || []).slice(0, 10).map((x, i) => `<li${x.u === me ? ' class="me"' : ''}><span class="lrank tnum">${i + 1}</span>${i < 3 ? `<span class="wmedal" style="--medal:${MEDALS[i]}">${ic('medal')}</span>` : ''}<span class="lname">${esc(LB.display(x))}</span><span class="lpts tnum">${fmtNum(x.p)}</span></li>`).join('')}</ol>
    </article>`;
  }).join('');
}
function vLeaders() {
  const tab = LB_TABS.some(t => t[0] === lbTab) ? lbTab : 'week';
  const tabs = `<div class="seg seg-4" role="group" aria-label="${L('लीडरबोर्ड अवधि', 'Leaderboard period')}">${LB_TABS.map(([v, hi, en]) => `<button data-act="lb-tab" data-v="${v}" aria-pressed="${tab === v}">${L(hi, en)}</button>`).join('')}</div>`;
  let body;
  if (tab === 'winners') body = vWinners();
  else if (P.cdb && LB.state === 'loading') body = `<div class="list">${skeletonRows(5)}</div>`;
  else {
    const rows = LB.board(tab), per = lbPeriod(tab);
    const ranked = rows.filter(r => r.p > 0);
    const mine = rows.find(r => r.me);
    const top = ranked.slice(0, 3), rest = ranked.slice(3, 50);
    const meOutside = mine && mine.rank && mine.rank > 50;
    const myPts = mine ? mine.p : 0;
    body = `<section class="lb-head">
      <div class="lb-period"><b>${esc(per.label)}</b><span>${per.note}</span></div>
      ${per.prize ? `<p class="prize-line">${ic('gift')} ${L('इनाम', 'Prize')}: ${esc(per.prize)}</p>` : ''}
      <div class="lb-mine">${U.s.lb.hide ? `<span>${ic('lock')} ${L('आप छिपे हुए हैं', 'You are hidden')}</span>` : `<span>${L('आपके पॉइंट्स', 'Your points')}: <b class="tnum">${fmtNum(myPts)}</b></span><span>${L('रैंक', 'Rank')}: <b class="tnum">${mine && mine.rank ? '#' + mine.rank : '–'}</b></span>`}</div>
    </section>
    ${top.length ? podium(top) : `<div class="card">${emptyState('trophy', tab === 'lastweek' ? L('पिछले सप्ताह कोई पॉइंट्स नहीं मिले', 'No points were earned last week') : L('अभी किसी के पॉइंट्स नहीं', 'Nobody has points yet'), tab === 'lastweek' ? '' : L('एक क्विज खेलें और लीडरबोर्ड पर सबसे पहले आएँ!', 'Play a quiz and be first on the board!'))}${tab !== 'lastweek' ? `<button class="btn btn-cta btn-block" data-act="start-daily" ${C.baseState !== 'ok' ? 'disabled' : ''}>${ic('zap')} ${L('दैनिक क्विज खेलें', 'Play the daily quiz')}</button>` : ''}</div>`}
    ${rest.length ? `<ol class="lb-list">${rest.map(lbRow).join('')}</ol>` : ''}
    ${meOutside ? `<ol class="lb-list lb-list-me">${lbRow(mine)}</ol>` : ''}
    ${mine && !mine.rank && !U.s.lb.hide && top.length ? `<p class="small muted" style="margin:0;text-align:center">${L('आप अभी रैंकिंग में नहीं हैं — एक प्रश्न का सही उत्तर दें और जुड़ जाएँ।', 'You are not ranked yet. Answer a question correctly to join.')}</p>` : ''}`;
  }
  return `${appbar(`${ic('trophy')} ${L('लीडरबोर्ड', 'Leaderboard')}`, { right: `<button class="iconbtn" data-act="pts-info" aria-label="${L('पॉइंट्स कैसे मिलते हैं', 'How points work')}" title="${L('पॉइंट्स कैसे मिलते हैं', 'How points work')}">${ic('info')}</button>` })}
<main class="page gutter">
  ${tabs}
  ${lbNotes()}
  ${body}
  <p class="privacy">${ic('lock')} ${L('लीडरबोर्ड पर सिर्फ़ नाम और पॉइंट्स दिखते हैं। कोई भी किसी दूसरे विद्यार्थी की प्रोफ़ाइल, उत्तर या प्रगति नहीं देख सकता।', 'The leaderboard shows only names and points. Nobody can open another student\'s profile, answers or progress.')}</p>
  <button class="btn btn-outline btn-block" data-act="pts-info">${ic('coins')} ${L('पॉइंट्स कैसे कमाएँ?', 'How do I earn points?')}</button>
</main>
${bottomNav('leaders')}`;
}
function openPointsInfo() {
  const rows = [
    ['check', L('सही उत्तर', 'Correct answer'), `+${PTS.correct}`, L('हर प्रश्न पर दिन में पहली बार', 'first attempt of each question per day')],
    ['clock', L('समयबद्ध मोड में सही उत्तर', 'Correct in timed mode'), `+${PTS.timed}`, L('अतिरिक्त बोनस', 'extra bonus')],
    ['help', L('गलत उत्तर (प्रयास)', 'Wrong answer (effort)'), `+${PTS.wrong}`, L('कोशिश के लिए', 'for trying')],
    ['zap', L('दैनिक क्विज पूरा', 'Daily quiz completed'), `+${PTS.daily}`, L('दिन में एक बार', 'once a day')],
    ['star', L('दैनिक क्विज में सभी सही', 'Perfect daily quiz'), `+${PTS.perfect}`, L('दिन में एक बार', 'once a day')],
    ['target', L('रोज़ का लक्ष्य पूरा', 'Daily goal reached'), `+${PTS.goal}`, L('दिन में एक बार', 'once a day')],
    ['flame', L('स्ट्रीक बोनस', 'Streak bonus'), `+${PTS.streakStep}×`, L(`स्ट्रीक के दिन (अधिकतम ${PTS.streakMax})`, `streak days (max ${PTS.streakMax})`)],
    ['clipboard', L('मॉक टेस्ट', 'Mock test'), `${L('अंक', 'score')}×${PTS.mockX}`, L('हर टेस्ट पर दिन में एक बार', 'once per test per day')],
  ];
  openSheet(`${sheetHead(L('पॉइंट्स कैसे कमाएँ', 'How to earn points'))}
  <ul class="earn">${rows.map(([i, a, b, c]) => `<li><span class="earn-ic">${ic(i)}</span><span class="row-main"><b>${a}</b><span class="row-sub">${c}</span></span><span class="pts">${b}</span></li>`).join('')}</ul>
  <div class="note">${ic('info')}<div>${L(`निष्पक्ष खेल: एक प्रश्न पर दिन में एक ही बार पॉइंट्स मिलते हैं और रोज़ अधिकतम ${PTS.cap} पॉइंट्स। साप्ताहिक लीडरबोर्ड हर सोमवार और मासिक लीडरबोर्ड हर महीने की 1 तारीख़ को नए सिरे से शुरू होता है।`, `Fair play: each question earns points once a day and you can earn at most ${PTS.cap} points a day. The weekly board restarts every Monday and the monthly board on the 1st of each month.`)}</div></div>`, { label: L('पॉइंट्स कैसे कमाएँ', 'How to earn points') });
}
function openPointsHistory() {
  const log = U.s.pts.log;
  openSheet(`${sheetHead(L('पॉइंट्स इतिहास', 'Points history'))}
  ${log.length ? `<ul class="earn">${log.slice(0, 40).map(e => { const r = PTS_REASON[e.r] || [e.r, e.r]; return `<li><span class="earn-ic">${ic('coins')}</span><span class="row-main"><b>${L(r[0], r[1])}${e.c > 1 ? ` <span class="small muted">×${e.c}</span>` : ''}</b><span class="row-sub">${relTime(e.t)}</span></span><span class="pts">+${fmtNum(e.n)}</span></li>`; }).join('')}</ul>` : emptyState('coins', L('अभी कोई पॉइंट्स नहीं', 'No points yet'), L('क्विज खेलकर पॉइंट्स कमाना शुरू करें।', 'Play a quiz to start earning points.'))}`, { label: L('पॉइंट्स इतिहास', 'Points history') });
}

function weekBars(mini = false) {
  const t = todayISO(), goal = U.s.goal || 10;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const counts = days.map(d => U.s.days[d] || 0);
  const max = Math.max(goal, ...counts);
  return `<div class="week${mini ? ' mini' : ''}" role="img" aria-label="${L('पिछले 7 दिनों में हल किए प्रश्न', 'Questions answered in the last 7 days')}: ${counts.join(', ')}"><span class="goal-line" style="bottom:${(goal / max) * 100 * 0.72 + 14}%"></span>${days.map((d, i) => `<div class="col"><em>${counts[i] || ''}</em><span class="b ${counts[i] >= goal ? 'met' : ''}" style="height:${Math.max(3, (counts[i] / max) * 72)}%"></span><span>${d === t ? L('आज', 'Today') : WEEKDAYS_SHORT[LANG][parseISO(d).getDay()]}</span></div>`).join('')}</div>`;
}
const lbForm = { name: null };
function vProfile() {
  const tot = U.totals(), st = U.streak(), s = U.s;
  const name = s.name.trim();
  const t = todayISO();
  const where = LOCAL() ? L('इसी डिवाइस के ब्राउज़र में', 'in this device\'s browser') : P.progressRemote ? L('आपके खाते में (हर डिवाइस पर)', 'in your account (on every device)') : L('इसी ब्राउज़र में', 'in this browser');
  const scales = [[0.9, 'छोटा', 'Small'], [1, 'सामान्य', 'Normal'], [1.12, 'बड़ा', 'Large'], [1.25, 'बहुत बड़ा', 'Extra large']];
  const rank = LB.myRank('week');
  const lbName = lbForm.name ?? s.lb.name;
  return `${appbar(`${ic('user')} ${L('प्रोफ़ाइल और सेटिंग्स', 'Profile & settings')}`, { back: 'home' })}
<main class="page gutter">
  ${accountCard()}
  <section class="card admin-hero" style="display:flex;align-items:center;gap:14px">
    <span class="avatar" style="width:58px;height:58px;font-size:1.5rem">${name ? esc(initial(name)) : ic('user')}</span>
    <span class="row-main"><span class="row-title" style="font-size:1.2rem">${name ? esc(name) : L('विद्यार्थी', 'Student')}</span><span class="row-sub" style="color:rgba(255,255,255,.85)">${s.exam ? `${L('लक्ष्य', 'Target')}: ${esc(examLabel(s.exam))}` : L('लक्ष्य परीक्षा चुनें', 'Choose a target exam')} · ${L(`रोज़ ${s.goal} प्रश्न`, `${s.goal} questions a day`)}</span></span>
    <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff" data-act="profile-edit">${ic('pencil')} ${L('बदलें', 'Edit')}</button>
  </section>
  <section class="card pts-card">
    <div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic('coins')} ${L('रिवॉर्ड पॉइंट्स', 'Reward points')}</h2><button class="link" data-act="pts-history">${L('इतिहास', 'History')} ${ic('chev-right')}</button></div>
    <div class="pts-total tnum">${fmtNum(s.pts.total)}<small>${L('कुल पॉइंट्स', 'total points')}</small></div>
    <div class="stats stats-4"><div class="stat"><b>${fmtNum(U.ptsToday())}</b><span>${L('आज', 'Today')}</span></div><div class="stat"><b>${fmtNum(U.ptsWeek(weekKey(t)))}</b><span>${L('इस सप्ताह', 'This week')}</span></div><div class="stat"><b>${fmtNum(U.ptsMonth(monthKey(t)))}</b><span>${L('इस महीने', 'This month')}</span></div><div class="stat"><b>${rank ? '#' + rank : '–'}</b><span>${L('सप्ताह रैंक', 'Week rank')}</span></div></div>
    <div class="btnrow"><a class="btn btn-sm btn-outline" href="#leaders">${ic('trophy')} ${L('लीडरबोर्ड', 'Leaderboard')}</a><button class="btn btn-sm btn-outline" data-act="pts-info">${ic('info')} ${L('पॉइंट्स कैसे मिलते हैं', 'How points work')}</button></div>
  </section>
  <a class="act" href="#progress"><span class="ai">${ic('chart')}</span><span>${L('मेरी प्रगति', 'My progress')}<span class="row-sub">${L(`स्तर ${levelOf(s.pts.total).lvl} · सटीकता ${tot.acc}% · ${st} दिन की स्ट्रीक · बैज और विषयवार महारत`, `Level ${levelOf(s.pts.total).lvl} · ${tot.acc}% accuracy · ${st}-day streak · badges and subject mastery`)}</span></span>${ic('chev-right', 'chev')}</a>
  <section class="card" id="settings" style="display:flex;flex-direction:column;gap:14px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('sliders')} ${L('सेटिंग्स', 'Settings')}</h2>
    <div class="field"><span class="lbl">${ic('languages')} ${L('भाषा / Language', 'Language / भाषा')}</span><div class="chips">${[['hi', 'हिंदी'], ['en', 'English']].map(([v, l]) => `<button class="chip" data-act="set-lang" data-v="${v}" aria-pressed="${LANG === v}" lang="${v}">${l}</button>`).join('')}</div><span class="small muted">${L('प्रश्न, समाचार और पूरा ऐप चुनी गई भाषा में दिखेगा।', 'Questions, news and the whole app appear in the chosen language.')}</span></div>
    <div class="field"><span class="lbl">${ic('graduation')} ${L('लक्ष्य परीक्षा', 'Target exam')}</span><div class="chips wrap">${EXAMS.map(e => `<button class="chip" data-act="set-exam" data-v="${e.id}" aria-pressed="${s.exam === e.id}">${esc(L(e.hi, e.en))}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">${L('रोज़ का लक्ष्य', 'Daily goal')}</span><div class="chips wrap">${[10, 20, 30].map(n => `<button class="chip" data-act="set-goal" data-v="${n}" aria-pressed="${s.goal === n}">${n} ${L('प्रश्न', 'questions')}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">${ic('type')} ${L('अक्षरों का आकार', 'Text size')}</span><div class="chips wrap">${scales.map(([v, hi, en]) => `<button class="chip" data-act="set-scale" data-v="${v}" aria-pressed="${Number(s.set.scale) === v}">${L(hi, en)}</button>`).join('')}</div></div>
    ${P.mode === 'standalone' ? `<div class="field"><span class="lbl">${ic('moon')} ${L('थीम', 'Theme')}</span><div class="chips">${[['system', 'सिस्टम', 'System'], ['light', 'लाइट', 'Light'], ['dark', 'डार्क', 'Dark']].map(([v, hi, en]) => `<button class="chip" data-act="set-theme" data-v="${v}" aria-pressed="${s.set.theme === v}">${L(hi, en)}</button>`).join('')}</div></div>` : ''}
    <p class="small muted" style="margin:0">${ic('lock')} ${L(`आपकी प्रगति ${where} सहेजी जाती है।`, `Your progress is saved ${where}.`)}</p>
  </section>
  <section class="card" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('trophy')} ${L('लीडरबोर्ड पर आप', 'You on the leaderboard')}</h2>
    <form data-form="lbname" class="lbname"><div class="field" style="flex:1;min-width:0"><label for="lb-name">${L('दिखने वाला नाम', 'Display name')}</label><input class="input" id="lb-name" data-bind="lbForm.name" maxlength="24" value="${esc(lbName)}" placeholder="${esc(LB.myName())}" autocomplete="off"></div><button class="btn btn-navy" type="submit">${L('सहेजें', 'Save')}</button></form>
    <button class="switch" data-act="lb-hide" role="switch" aria-checked="${!s.lb.hide}"><span class="row-main"><b>${L('लीडरबोर्ड पर मेरा नाम दिखाएँ', 'Show my name on the leaderboard')}</b><span class="row-sub">${L('बंद करने पर आपके पॉइंट्स बनते रहेंगे, पर नाम रैंकिंग में नहीं दिखेगा।', 'When off you keep earning points, but your name is left out of the rankings.')}</span></span><span class="knob" aria-hidden="true"></span></button>
    <p class="small muted" style="margin:0">${ic('lock')} ${L('दूसरे विद्यार्थी सिर्फ़ आपका दिखने वाला नाम और पॉइंट्स देखते हैं — आपकी प्रोफ़ाइल, उत्तर और प्रगति निजी रहती है।', 'Other students see only your display name and points. Your profile, answers and progress stay private.')}</p>
  </section>
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>${L('एडमिन पैनल', 'Admin panel')}<span class="row-sub">${LOCAL() ? L('डेमो: बदलाव इसी ब्राउज़र में', 'Demo: changes stay in this browser') : L('सामग्री, AI प्रश्न, समीक्षा, प्रकाशन और पुरस्कार', 'Content, AI questions, review, publishing and prizes')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
  <button class="btn btn-danger" data-act="reset-ask">${ic('trash')} ${L('प्रगति रीसेट करें', 'Reset progress')}</button>
  <p class="small muted" style="text-align:center;margin:0">MY QUIZ · ${L('संस्करण', 'Version')} ${esc(BUILD)}</p>
</main>
${bottomNav('profile')}`;
}
function profileSheet() {
  onb.exam = U.s.exam; onb.goal = U.s.goal;
  openSheet(`${sheetHead(L('प्रोफ़ाइल बदलें', 'Edit profile'))}<form data-form="profile" style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><label for="pf-name">${L('आपका नाम', 'Your name')}</label><input class="input" id="pf-name" maxlength="40" value="${esc(U.s.name)}" autocomplete="given-name"></div>
  <div class="field"><span class="lbl">${L('लक्ष्य परीक्षा', 'Target exam')}</span><div class="chips wrap" id="pf-exam">${EXAMS.map(e => `<button type="button" class="chip" data-act="onb-exam" data-v="${e.id}" aria-pressed="${onb.exam === e.id}">${esc(L(e.hi, e.en))}</button>`).join('')}</div></div>
  <button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button></form>`, { label: L('प्रोफ़ाइल बदलें', 'Edit profile') });
}

