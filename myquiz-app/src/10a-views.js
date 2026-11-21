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
function topicChips() {
  const m = M(), out = [];
  for (const d of (m.daysByMd[todayISO().slice(5)] || [])) out.push(`<a class="chip" href="#today">${ic('calendar')}${esc(dT(d))}</a>`);
  for (const c of uniq(m.news.slice(0, 8).map(n => n.cat)).slice(0, 4)) out.push(`<button class="chip" data-act="ca-cat" data-cat="${esc(c)}">${esc(catLabel(c))}</button>`);
  return out.join('') || `<span class="small muted">${L('आज के विषय जल्द आएँगे।', 'Today\'s topics are coming soon.')}</span>`;
}
function newsCard(n) {
  const c = catOf(n.cat);
  return `<button class="news" data-act="open-news" data-id="${esc(n.id)}" style="--c1:${c.c1};--c2:${c.c2}"><span class="thumb">${ic(c.icon)}</span><span class="news-main"><span><span class="badge">${esc(catLabel(n.cat))}</span></span><span class="nt">${esc(nT(n))}</span><span class="ns">${esc(nS(n))}</span><span class="more">${L('विस्तार से पढ़ें', 'Read more')} ${ic('arrow-right')}</span></span></button>`;
}
const langBtn = (cls = 'iconbtn') => `<button class="${cls} lang-btn" data-act="lang-toggle" aria-label="${L('Switch to English', 'हिंदी में बदलें')}" title="${L('Switch to English', 'हिंदी में बदलें')}"><span>${L('EN', 'हिं')}</span></button>`;
const onb = { name: '', exam: '', goal: 10 };
function onboardCard() {
  return `<section class="card onb" aria-label="${L('प्रोफ़ाइल बनाएँ', 'Create your profile')}"><form data-form="onb" style="display:flex;flex-direction:column;gap:12px">
  <h2 style="font-size:1.1rem;font-weight:800">${L('अपनी तैयारी को निजी बनाएँ', 'Make your preparation personal')}</h2>
  <div class="field"><span class="lbl">${L('भाषा', 'Language')}</span><div class="chips">${[['hi', 'हिंदी'], ['en', 'English']].map(([v, l]) => `<button type="button" class="chip" data-act="set-lang" data-v="${v}" aria-pressed="${LANG === v}">${l}</button>`).join('')}</div></div>
  <div class="field"><label for="onb-name">${L('आपका नाम', 'Your name')}</label><input class="input" id="onb-name" data-bind="onb.name" value="${esc(onb.name)}" maxlength="40" placeholder="${L('जैसे: राहुल', 'e.g. Rahul')}" autocomplete="given-name"></div>
  <div class="field"><span class="lbl">${L('लक्ष्य परीक्षा', 'Target exam')}</span><div class="chips wrap">${EXAMS.map(([v, en]) => `<button type="button" class="chip" data-act="onb-exam" data-v="${esc(v)}" aria-pressed="${onb.exam === v}">${esc(L(v, en))}</button>`).join('')}</div></div>
  <div class="field"><span class="lbl">${L('रोज़ का लक्ष्य', 'Daily goal')}</span><div class="chips">${[10, 20, 30].map(n => `<button type="button" class="chip" data-act="onb-goal" data-v="${n}" aria-pressed="${onb.goal === n}">${n} ${L('प्रश्न', 'questions')}</button>`).join('')}</div></div>
  <div class="btnrow"><button class="btn btn-cta" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button><button class="btn btn-grey" type="button" data-act="onb-skip">${L('बाद में', 'Later')}</button></div>
  </form></section>`;
}
function rewardCard() {
  const wk = weekKey(todayISO()), wp = U.ptsWeek(wk), rank = LB.myRank('week');
  const prize = L(LB.settings.weekPrize, LB.settings.weekPrizeEn);
  return `<a class="reward" href="#leaders">
    <span class="reward-ic">${ic('trophy')}</span>
    <span class="row-main"><span class="row-title">${L('इस सप्ताह', 'This week')}: ${fmtNum(wp)} ${L('पॉइंट्स', 'points')}${rank ? ` · ${L('रैंक', 'rank')} #${rank}` : ''}</span>
    <span class="row-sub">${prize ? `${L('इनाम', 'Prize')}: ${esc(prize)}` : L(`कुल ${fmtNum(U.s.pts.total)} पॉइंट्स · हर सही उत्तर पर +${PTS.correct}`, `${fmtNum(U.s.pts.total)} points in total · +${PTS.correct} for every correct answer`)}</span></span>
    ${ic('chev-right', 'chev')}</a>`;
}
function vHome() {
  const m = M(), t = todayISO();
  const name = U.s.name.trim();
  const cnt = U.todayCount(), goal = U.s.goal || 10, st = U.streak();
  const daily = U.s.daily[t];
  const due = U.due().length;
  const notif = notifications().length;
  const latest = m.news.slice(0, 2);
  return `
<header class="hero"><div class="gutter">
  <div class="brandrow">
    <div class="logo">${capLogo()}<span>MY <span class="q">QUIZ</span></span></div>
    <div class="hero-actions">
      ${langBtn()}
      <button class="iconbtn" data-act="notifs" aria-label="${L('सूचनाएँ', 'Notifications')}${notif ? ` (${notif})` : ''}">${ic('bell')}${notif ? `<span class="dot">${notif}</span>` : ''}</button>
      <a class="avatar" href="#profile" aria-label="${L('प्रोफ़ाइल', 'Profile')}">${name ? esc(initial(name)) : ic('user')}</a>
    </div>
  </div>
  <p class="greet">${L('नमस्कार', 'Hello')}${name ? `, ${esc(name)}` : ''}! ${L('आपका स्वागत है।', 'Welcome.')}</p>
  <p class="greet-sub">${L('आज कुछ नया सीखिए और अपना ज्ञान बढ़ाइए।', 'Learn something new today and grow your knowledge.')}</p>
</div></header>
<main class="home-body gutter">
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <section class="daily" aria-label="${L('आज की तैयारी', 'Today\'s preparation')}">
    <div class="ringbox" aria-label="${L(`आज ${goal} में से ${cnt} प्रश्न`, `${cnt} of ${goal} questions today`)}">${ring(cnt / goal, 68, 7)}<b class="tnum">${Math.min(cnt, 999)}<small>/ ${goal} ${L('प्रश्न', 'Qs')}</small></b></div>
    <div><h2>${L('आज की तैयारी कैसी चल रही है?', 'How is today\'s preparation going?')}</h2><p>${daily ? L(`दैनिक क्विज पूरा — ${daily.score}/${daily.total} सही। बढ़िया!`, `Daily quiz done: ${daily.score}/${daily.total} correct. Great!`) : L('आज का दैनिक क्विज पूरा करें।', 'Complete today\'s daily quiz.')}</p></div>
    <div class="daily-foot"><span class="streak" title="${L(`रोज़ कम से कम ${STREAK_MIN} प्रश्न हल करें`, `Answer at least ${STREAK_MIN} questions a day`)}">${ic('flame')} ${L(`${st} दिन की स्ट्रीक`, `${st}-day streak`)}</span>
      <button class="btn btn-cta btn-sm" data-act="start-daily" ${C.baseState !== 'ok' ? 'disabled' : ''}>${daily ? L('फिर से खेलें', 'Play again') : L('शुरू करें', 'Start')} ${ic('arrow-right')}</button></div>
  </section>
  ${rewardCard()}
  <section class="tiles" aria-label="${L('मुख्य विभाग', 'Main sections')}">
    <a class="tile t-blue" href="#quiz">${ic('help')}<b>${L('क्विज', 'Quiz')}</b><span>${L('विषयवार सामान्य ज्ञान', 'Subject-wise GK')}</span></a>
    <a class="tile t-green" href="#today">${ic('calendar')}<b>${L('आज का दिन', 'Today in History')}</b><span>${L('महत्वपूर्ण दिवस', 'Important days')}</span></a>
    <a class="tile t-orange" href="#ca">${ic('newspaper')}<b class="latin">Current Affairs</b><span>${L('दैनिक समसामयिकी', 'Daily news for exams')}</span></a>
    <a class="tile t-purple" href="#mock">${ic('clipboard')}<b>${L('अभ्यास परीक्षा', 'Mock Tests')}</b><span>${L('मॉक टेस्ट', 'Exam practice')}</span></a>
  </section>
  ${!name && !LS.get('onb-skip', false) ? onboardCard() : ''}
  ${due ? `<button class="revise" data-act="start-revision"><span class="ico">${ic('rotate')}</span><span class="row-main"><b>${L(`${due} प्रश्न दोहराव के लिए तैयार`, `${due} questions ready for revision`)}</b><span class="row-sub">${L('पहले गलत हुए प्रश्न फिर से हल करें — याद पक्की होगी', 'Retry questions you got wrong to make them stick')}</span></span>${ic('chev-right', 'chev')}</button>` : ''}
  <section aria-label="${L('आज के महत्वपूर्ण विषय', 'Today\'s important topics')}"><h2 class="sec-title">${ic('star', 'star')} ${L('आज के महत्वपूर्ण विषय', 'Today\'s important topics')}</h2><div class="chips" style="margin-top:10px">${C.baseState === 'loading' ? '<div class="skeleton" style="height:34px;width:100%"></div>' : topicChips()}</div></section>
  ${latest.length ? `<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2 class="sec-title">${ic('newspaper')} ${L('ताज़ा करेंट अफेयर्स', 'Latest current affairs')}</h2><a class="link" href="#ca">${L('सभी देखें', 'See all')} ${ic('chev-right')}</a></div>${latest.map(newsCard).join('')}</section>` : ''}
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>${L('एडमिन पैनल', 'Admin panel')}<span class="row-sub">${LOCAL() ? L('डेमो: समाचार, AI प्रश्न, समीक्षा और प्रकाशन', 'Demo: news, AI questions, review and publishing') : L('समाचार, AI प्रश्न, समीक्षा, प्रकाशन और पुरस्कार', 'News, AI questions, review, publishing and prizes')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
</main>
${bottomNav('home')}`;
}

function vQuiz() {
  const s = U.s.set;
  const rows = SUBJECTS.map(sj => {
    const st = U.subjStats(sj.k);
    return `<button class="row" data-act="start-subject" data-s="${sj.k}" style="--c:${sj.c}"><span class="row-ic">${ic(sj.icon)}</span><span class="row-main"><span class="row-title">${subjName(sj.k)}</span><span class="row-sub">${st.seen ? L(`${st.seen}/${st.total} हल किए · सटीकता ${st.acc}%`, `${st.seen}/${st.total} done · ${st.acc}% accuracy`) : L('अभी शुरू नहीं किया', 'Not started yet')}</span><span class="minibar"><i style="width:${pct(st.seen, st.total)}%"></i></span></span><span class="count tnum">${st.total} ${L('प्रश्न', 'Qs')}</span>${ic('chev-right', 'chev')}</button>`;
  }).join('');
  return `${appbar(L('क्विज – विषय चुनें', 'Quiz: choose a subject'), { back: 'home', right: `<button class="iconbtn" data-act="search-open" aria-label="${L('प्रश्न खोजें', 'Search questions')}">${ic('search')}</button>` })}
<main class="page gutter">
  <div class="seg" role="group" aria-label="${L('क्विज मोड', 'Quiz mode')}">
    <button data-act="set-mode" data-v="practice" aria-pressed="${s.mode !== 'timed'}">${L('अभ्यास मोड', 'Practice')}<small>${L('तुरंत उत्तर और व्याख्या', 'Instant answer and explanation')}</small></button>
    <button data-act="set-mode" data-v="timed" aria-pressed="${s.mode === 'timed'}">${L('समयबद्ध', 'Timed')}<small>${L(`${TIMED_SECONDS} सेकंड प्रति प्रश्न · +${PTS.timed} बोनस`, `${TIMED_SECONDS} s per question · +${PTS.timed} bonus`)}</small></button>
  </div>
  <div class="sec-head"><span class="small muted">${L('एक बार में प्रश्न', 'Questions per round')}</span><div class="chips">${[10, 20, 0].map(n => `<button class="chip" data-act="set-count" data-v="${n}" aria-pressed="${(s.count ?? 10) === n}">${n || L('सभी', 'All')}</button>`).join('')}</div></div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <div class="list">${C.baseState === 'loading' ? skeletonRows(6) : rows}</div>
  <div class="tip">${ic('bulb')}<p>${L('अपनी पसंद का विषय चुनें और ज्ञान की परीक्षा दें। हर सही उत्तर पर पॉइंट्स मिलते हैं।', 'Pick a subject and test your knowledge. Every correct answer earns points.')}</p></div>
  <div class="grid2"><button class="btn btn-outline" data-act="start-bookmarked">${ic('bookmark')} ${L('बुकमार्क प्रश्न', 'Saved questions')}</button><button class="btn btn-outline" data-act="start-revision">${ic('rotate')} ${L('दोहराव', 'Revision')}</button></div>
</main>
${bottomNav('quiz')}`;
}

function explainBox(q, a) {
  const head = a.sel === -1 ? `<span class="ans-bad">${L('समय समाप्त!', 'Time is up!')}</span>` : a.ok ? `<span class="ans-ok">${L('सही उत्तर!', 'Correct!')}</span>` : `<span class="ans-bad">${L('गलत उत्तर।', 'Wrong answer.')}</span>`;
  const st = S.ai[q.id];
  const aiBtn = AI.available() && !st ? `<button class="link" data-act="ai-explain" data-id="${esc(q.id)}">${ic('sparkles')} ${L('AI से और समझें', 'Explain more with AI')}</button>` : '';
  const earned = a.pts ? `<span class="pts pts-pop">+${a.pts} ${L('पॉइंट्स', 'points')}</span>` : '';
  return `<div class="explain">${ic('bulb', 'bulb')}<div style="min-width:0"><h3>${head} ${L('व्याख्या:', 'Explanation:')} ${earned}</h3><p>${esc(qE(q) || L('व्याख्या जल्द जोड़ी जाएगी।', 'An explanation will be added soon.'))}</p>${st ? `<div class="ai-box" id="ai-${esc(q.id)}">${esc(st.text || L('सोच रहा है…', 'Thinking…'))}</div>${st.err ? `<p class="small" style="color:var(--bad);margin-top:6px">${esc(st.err)}</p>` : ''}` : ''}${aiBtn ? `<div style="margin-top:8px">${aiBtn}</div>` : ''}</div></div>`;
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
    <div class="qmeta"><span class="tag">${esc(subjName(q.s))}${qTopic(q) ? ' · ' + esc(qTopic(q)) : ''}</span><span class="qmeta-r">${S.pts ? ptsChip(S.pts) : ''}${timer}</span></div>
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
  <div class="btnrow">${w + sk ? `<button class="btn btn-cta" data-act="retry-wrong">${ic('rotate')} ${L('गलत/छोड़े प्रश्न दोबारा', 'Retry wrong / skipped')}</button>` : ''}<button class="btn btn-outline" data-act="share-result">${ic('share')} ${L('स्कोर शेयर करें', 'Share score')}</button></div>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} ${L('उत्तरों की समीक्षा', 'Answer review')}</h2><div class="list">${review}</div></section>
  <div class="grid2"><a class="btn btn-grey" href="#quiz">${L('विषय सूची', 'Subjects')}</a><a class="btn btn-navy" href="#home">${L('होम', 'Home')}</a></div>
</main>`;
}

let caCat = '';
function vCA() {
  const m = M(), t = todayISO();
  const list = caCat ? m.news.filter(n => n.cat === caCat) : m.news;
  const groups = {};
  for (const n of list) (groups[n.date] = groups[n.date] || []).push(n);
  const caQs = (m.bySubj.ca || []).length;
  const todayN = m.news.filter(n => n.date === t).length;
  const latest = m.news[0] && m.news[0].date;
  const feed = Object.keys(groups).sort().reverse().map(d => `<h3 class="dgroup">${fmtDate(d)} · ${weekday(d)}</h3>${groups[d].map(newsCard).join('')}`).join('');
  return `${appbar(`${ic('newspaper')} Current Affairs`, { back: 'home', right: `<span class="pill pill-green">${L('दैनिक अपडेट', 'Daily update')}</span>` })}
<main class="page gutter">
  <div class="datebar">${ic('calendar')} <span class="tnum">${fmtDate(t)}</span></div>
  <p class="small muted" style="margin:-10px 0 0;text-align:center">${todayN ? L(`आज की ${todayN} नई ख़बरें`, `${todayN} new items today`) : L('आज की ख़बरें अभी प्रकाशित नहीं हुईं', 'Today\'s news is not published yet') + (latest ? ` · ${L('नवीनतम', 'latest')}: ${fmtDate(latest, false)}` : '')}</p>
  ${caQs ? `<button class="ca-cta" data-act="start-ca">${ic('zap')}<span class="row-main"><b>${L('करेंट अफेयर्स क्विज', 'Current affairs quiz')}</b><span>${L(`${Math.min(caQs, 10)} प्रश्न · नवीनतम ख़बरों से`, `${Math.min(caQs, 10)} questions from the latest news`)}</span></span>${ic('arrow-right')}</button>` : ''}
  <div class="chips" role="group" aria-label="${L('श्रेणी चुनें', 'Choose a category')}"><button class="chip" data-act="ca-cat" data-cat="" aria-pressed="${!caCat}">${L('सभी', 'All')}</button>${uniq(m.news.map(n => n.cat)).map(c => `<button class="chip" data-act="ca-cat" data-cat="${esc(c)}" aria-pressed="${caCat === c}">${esc(catLabel(c))}</button>`).join('')}</div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${C.baseState === 'loading' ? skeletonCards(3) : feed || emptyState('newspaper', L('इस श्रेणी में अभी कोई ख़बर नहीं', 'No news in this category yet'), '')}
</main>
${bottomNav('')}`;
}
function openNews(id) {
  const m = M(), n = m.newsById.get(id);
  if (!n) return;
  const c = catOf(n.cat);
  const qs = (m.bySubj.ca || []).filter(q => q.n === n.id);
  const bm = U.isBm('n', n.id);
  const src = n.source || {}, url = safeUrl(src.url), facts = nF(n);
  openSheet(`${sheetHead(esc(nT(n)))}
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge" style="--c2:${c.c2}">${esc(catLabel(n.cat))}</span><span class="small muted">${fmtDate(n.date)} · ${weekday(n.date)}</span></div>
  <p style="margin:0;font-size:1.05rem">${esc(nS(n))}</p>
  ${facts.length ? `<div class="card" style="box-shadow:none;background:var(--surface-2)"><h3 class="sec-title" style="font-size:1rem;margin-bottom:10px">${ic('target')} ${L('परीक्षा के लिए मुख्य तथ्य', 'Key facts for exams')}</h3><ul class="facts">${facts.map(f => `<li>${ic('check')}<span>${esc(f)}</span></li>`).join('')}</ul></div>` : ''}
  ${nSrc(n) ? `<p class="small muted" style="margin:0">${L('स्रोत', 'Source')}: ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(nSrc(n))} ${ic('external')}</a>` : esc(nSrc(n))}</p>` : ''}
  <div class="btnrow">${qs.length ? `<button class="btn btn-cta" data-act="news-quiz" data-id="${esc(n.id)}">${ic('help')} ${L(`इस ख़बर से ${qs.length} प्रश्न`, `${qs.length} questions from this story`)}</button>` : ''}<button class="btn btn-outline" data-act="bm-n" data-id="${esc(n.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? L('सहेजा गया', 'Saved') : L('सहेजें', 'Save')}</button><button class="btn btn-outline" data-act="share-news" data-id="${esc(n.id)}">${ic('share')} ${L('शेयर', 'Share')}</button></div>`, { label: nT(n) });
}

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
function vToday() {
  const m = M(), t = todayISO();
  const iso = dayCursor || t, md = iso.slice(5);
  const entries = m.daysByMd[md] || [];
  const d = entries[clamp(dayPick, 0, Math.max(0, entries.length - 1))];
  const isToday = iso === t;
  const rel = m.all.filter(q => q.day === md).length;
  const up = upcomingDays(iso, 6);
  const dd = parseISO(iso);
  let card;
  if (C.baseState === 'loading') card = '<div class="skeleton" style="height:300px;border-radius:20px"></div>';
  else if (!d) {
    const nx = up[0];
    card = `<div class="card">${emptyState('calendar', L('इस तारीख़ के लिए कोई प्रमुख दिवस दर्ज नहीं है', 'No important day is listed for this date'), nx ? `${L('अगला महत्वपूर्ण दिवस', 'Next important day')}: <b>${esc(dT(nx))}</b> (${fmtMD(nx.md)})` : '')}${nx ? `<button class="btn btn-navy btn-block" data-act="day-goto" data-iso="${nx.iso}">${L('देखें', 'View')}: ${esc(dT(nx))} ${ic('arrow-right')}</button>` : ''}</div>`;
  } else {
    const k = kindOf(d.k), facts = dF(d);
    card = `${entries.length > 1 ? `<div class="chips" role="group" aria-label="${L('इस दिन के दिवस', 'Days on this date')}">${entries.map((e, i) => `<button class="chip" data-act="day-pick" data-i="${i}" aria-pressed="${e === d}">${esc(dT(e))}</button>`).join('')}</div>` : ''}
    <article class="daycard">
      <div class="day-top">
        <div class="day-art"><span class="dn tnum">${dd.getDate()}</span><span class="dm">${MONTHS[LANG][dd.getMonth()]}</span>${ic(k.icon)}</div>
        <div class="day-title"><span><span class="badge" style="--c2:${k.c}">${esc(kindLabel(d.k))}</span></span><h2>${esc(dT(d))}</h2><span class="small" style="color:var(--muted)">(${fmtMD(d.md)}${d.y ? ` · ${L(k.y, k.yEn)}: ${d.y}` : ''})</span></div>
      </div>
      <div class="day-sec">${ic('book-open')}<div><h3>${L('शुरुआत का इतिहास', 'History')}</h3><p>${esc(dH(d))}</p></div></div>
      ${dO(d) ? `<div class="day-sec">${ic('target')}<div><h3>${L('उद्देश्य', 'Purpose')}</h3><p>${esc(dO(d))}</p></div></div>` : ''}
      ${facts.length ? `<div class="day-sec">${ic('star')}<div><h3>${L('महत्वपूर्ण तथ्य', 'Key facts')}</h3><ul>${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>` : ''}
    </article>
    ${rel ? `<button class="btn btn-navy btn-block" data-act="day-quiz" data-md="${md}">${L(`इस दिन से जुड़े ${rel} प्रश्न देखें`, `See ${rel} questions about this day`)} ${ic('arrow-right')}</button>` : ''}`;
  }
  return `${appbar(`${ic('calendar')} ${L('आज का दिन', 'Today in History')}`, { back: 'home', right: `<button class="iconbtn" data-act="day-calendar" aria-label="${L('कैलेंडर से तारीख़ चुनें', 'Pick a date from the calendar')}">${ic('list')}</button>` })}
<main class="page gutter">
  <div class="daynav">
    <button class="iconbtn" data-act="day-step" data-v="-1" aria-label="${L('पिछला दिन', 'Previous day')}">${ic('chev-left')}</button>
    <div class="when tnum">${isToday ? L('आज, ', 'Today, ') : ''}${fmtDate(iso, false)}<small>${WEEKDAYS[LANG][dd.getDay()]}${isToday ? '' : ` · <button class="link" data-act="day-today">${L('आज पर लौटें', 'Back to today')}</button>`}</small></div>
    <button class="iconbtn" data-act="day-step" data-v="1" aria-label="${L('अगला दिन', 'Next day')}">${ic('chev-right')}</button>
  </div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${card}
  ${up.length ? `<section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1.05rem">${ic('calendar')} ${L('आने वाले महत्वपूर्ण दिवस', 'Coming up')}</h2>${up.map(e => { const dn = diffDays(t, e.iso); return `<button class="upc link" style="color:inherit;font-weight:600;text-align:left" data-act="day-goto" data-iso="${e.iso}"><span class="d"><b class="tnum">${parseISO(e.iso).getDate()}</b><span>${monthShort(parseISO(e.iso).getMonth())}</span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(dT(e))}</span><span class="row-sub">${esc(kindLabel(e.k))} · ${dn === 1 ? L('कल', 'tomorrow') : dn > 0 ? L(`${dn} दिन बाद`, `in ${dn} days`) : fmtDate(e.iso, false)}</span></span></button>`; }).join('')}</section>` : ''}
</main>
${bottomNav('')}`;
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

