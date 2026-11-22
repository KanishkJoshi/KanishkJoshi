// ───────────────────────────── v3: current affairs (articles) and Aaj ka Din (daily session) ─────────────────────────────
let caTab = 'today', caQuery = '';
const CA_TABS = [['today', 'आज', 'Today'], ['week', 'सप्ताह', 'Week'], ['month', 'महीना', 'Month'], ['archive', 'संग्रह', 'Archive'], ['saved', 'सहेजे', 'Saved']];
const nX = (n, k) => tx(n, k);                                           // article section in the current language
const nList = (n, k) => (LANG === 'en' && n.en && Array.isArray(n.en[k]) && n.en[k].length ? n.en[k] : Array.isArray(n[k]) ? n[k] : []);
function caMatch(n) {
  if (caCat && n.cat !== caCat) return false;
  const t = caQuery.trim().toLowerCase();
  if (!t) return true;
  return [n.title, n.summary, n.en && n.en.title, n.en && n.en.summary, ...(n.facts || [])].join(' ').toLowerCase().includes(t);
}
function caRange(tab) {
  const m = M(), t = todayISO(), wk = weekKey(t), mo = monthKey(t);
  if (tab === 'today') return m.news.filter(n => n.date === t);
  if (tab === 'week') return m.news.filter(n => n.date >= wk && n.date <= t);
  if (tab === 'month') return m.news.filter(n => n.date.startsWith(mo));
  if (tab === 'saved') return U.s.bm.n.map(id => m.newsById.get(id)).filter(Boolean);
  return m.news;
}
const caQs = list => { const ids = new Set(list.map(n => n.id)); return (M().bySubj.ca || []).filter(q => ids.has(q.n)); };
function caFeedHtml() {
  const m = M(), tab = CA_TABS.some(x => x[0] === caTab) ? caTab : 'today';
  const list = caRange(tab).filter(caMatch), latest = m.news[0];
  const groups = {};
  for (const n of list) { const k = tab === 'archive' ? n.date.slice(0, 7) : n.date; (groups[k] = groups[k] || []).push(n); }
  const feed = Object.keys(groups).sort().reverse().map(k => `<h3 class="dgroup">${tab === 'archive' ? `${fmtMonth(k)} · ${groups[k].length}` : `${fmtDate(k)} · ${weekday(k)}`}</h3>${groups[k].map(newsCard).join('')}`).join('');
  if (feed) return feed;
  return tab === 'today' && !caQuery && !caCat
    ? `<div class="card">${emptyState('newspaper', L('आज की ख़बरें अभी प्रकाशित नहीं हुईं', 'Today\'s news is not published yet'), latest ? `${L('नवीनतम ख़बरें', 'Latest stories')}: ${fmtDate(latest.date, false)}` : '')}</div>${m.news.slice(0, 3).map(newsCard).join('')}`
    : tab === 'saved' && !caQuery && !caCat ? `<div class="card">${emptyState('bookmark', L('कोई ख़बर सहेजी नहीं गई', 'No saved stories'), L('किसी ख़बर में "सहेजें" दबाएँ।', 'Tap "Save" on a story.'))}</div>`
      : `<div class="card">${emptyState('search', L('कोई ख़बर नहीं मिली', 'No stories found'), L('खोज, श्रेणी या अवधि बदलकर देखें।', 'Try another search, category or period.'))}</div>`;
}
function vCA() {
  const m = M(), t = todayISO(), tab = CA_TABS.some(x => x[0] === caTab) ? caTab : 'today';
  const list = caRange(tab).filter(caMatch), latest = m.news[0], qs = caQs(list);
  const revise = (tab === 'week' || tab === 'month') && list.length ? `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('rotate')} ${tab === 'week' ? L('साप्ताहिक रिवीज़न', 'Weekly revision') : L('मासिक करेंट अफेयर्स', 'Monthly current affairs')}</h2>
    <p class="small muted" style="margin:0">${L(`${list.length} ख़बरें · ${qs.length} प्रश्न`, `${list.length} stories · ${qs.length} questions`)}</p>
    <div class="grid2"><button class="btn btn-cta" data-act="ca-range-quiz" data-v="${tab}" ${qs.length ? '' : 'disabled'}>${ic('zap')} ${L('क्विज', 'Quiz')}</button><a class="btn btn-outline" href="#ca-notes/${tab}">${ic('printer')} ${L('PDF नोट्स', 'PDF notes')}</a></div></section>` : '';
  return `${appbar(`${ic('newspaper')} ${L('करेंट अफेयर्स', 'Current affairs')}`, { back: 'learn', right: `<span class="pill pill-green">${L('दैनिक अपडेट', 'Daily update')}</span>` })}
<main class="page gutter">
  <div class="datebar">${ic('calendar')} <span class="tnum">${fmtDate(t)}</span></div>
  <p class="small muted" style="margin:-10px 0 0;text-align:center">${latest ? L(`आख़िरी अपडेट: ${fmtDate(latest.date)}`, `Last updated: ${fmtDate(latest.date)}`) : ''}</p>
  <div class="seg" style="grid-template-columns:repeat(5,minmax(0,1fr))" role="group" aria-label="${L('अवधि', 'Period')}">${CA_TABS.map(([v, hi, en]) => `<button data-act="ca-tab" data-v="${v}" aria-pressed="${tab === v}">${L(hi, en)}</button>`).join('')}</div>
  <div class="search">${ic('search')}<input id="ca-search" type="search" value="${esc(caQuery)}" placeholder="${L('ख़बरों में खोजें', 'Search the news')}" autocomplete="off" aria-label="${L('ख़बरों में खोजें', 'Search the news')}"></div>
  <div class="chips" role="group" aria-label="${L('श्रेणी चुनें', 'Choose a category')}"><button class="chip" data-act="ca-cat" data-cat="" aria-pressed="${!caCat}">${L('सभी', 'All')}</button>${uniq(m.news.map(n => n.cat)).map(c => `<button class="chip" data-act="ca-cat" data-cat="${esc(c)}" aria-pressed="${caCat === c}">${esc(catLabel(c))}</button>`).join('')}</div>
  ${(m.bySubj.ca || []).length ? `<button class="ca-cta" data-act="start-ca">${ic('zap')}<span class="row-main"><b>${L('करेंट अफेयर्स क्विज', 'Current affairs quiz')}</b><span>${L('नवीनतम ख़बरों से 10 प्रश्न', '10 questions from the latest news')}</span></span>${ic('arrow-right')}</button>` : ''}
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${revise}
  <div id="ca-feed" style="display:flex;flex-direction:column;gap:12px">${C.baseState === 'loading' ? skeletonCards(3) : caFeedHtml()}</div>
</main>
${bottomNav('ca')}`;
}
function openNews(id) { go('news/' + id); }
// Listen to an article: the claude.ai voice when offered, else the browser's speech engine (Hindi or English).
const TTS = { on: false };
const ttsAvailable = () => !!(P.tts || ('speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'));
function stopSpeak() {
  try { if (P.tts && P.tts.stop) P.tts.stop(); } catch { /* ignore */ }
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* ignore */ }
  if (TTS.on) { TTS.on = false; const b = $('[data-act="tts"]'); if (b) b.innerHTML = `${ic('volume')} ${L('सुनें', 'Listen')}`; }
}
function speak(text) {
  stopSpeak();
  const done = () => { TTS.on = false; const b = $('[data-act="tts"]'); if (b) b.innerHTML = `${ic('volume')} ${L('सुनें', 'Listen')}`; };
  TTS.on = true;
  const b = $('[data-act="tts"]'); if (b) b.innerHTML = `${ic('stop')} ${L('रोकें', 'Stop')}`;
  if (P.tts) { Promise.resolve().then(() => P.tts.speak(text.slice(0, 2000), { language: LANG === 'en' ? 'en' : 'hi' })).catch(() => {}).finally(done); return; }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG === 'en' ? 'en-IN' : 'hi-IN'; u.rate = 0.95;
    const v = window.speechSynthesis.getVoices().find(x => (x.lang || '').toLowerCase().startsWith(LANG === 'en' ? 'en' : 'hi'));
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    window.speechSynthesis.speak(u);
  } catch { done(); toast(L('इस डिवाइस पर सुनने की सुविधा उपलब्ध नहीं है।', 'Listening is not available on this device.'), 'info'); }
}
const articleText = n => [nT(n), nS(n), nX(n, 'details'), nX(n, 'why'), ...nF(n)].filter(Boolean).join('। ');
function vNews() {
  const m = M(), n = m.newsById.get(routeArg);
  if (!n) return C.baseState === 'loading' ? `${appbar(L('करेंट अफेयर्स', 'Current affairs'), { back: 'ca' })}<main class="page gutter">${skeletonCards(2)}</main>` : redirect('ca');
  const c = catOf(n.cat), qs = (m.bySubj.ca || []).filter(q => q.n === n.id), bm = U.isBm('n', n.id);
  const src = n.source || {}, url = safeUrl(src.url), facts = nF(n), schemes = nList(n, 'schemes'), orgs = nList(n, 'orgs');
  const related = m.news.filter(x => x.id !== n.id && x.cat === n.cat).slice(0, 2);
  const sec = (icon, hi, en, body) => (body ? `<section class="art-sec"><h2>${ic(icon)} ${L(hi, en)}</h2>${body}</section>` : '');
  const ul = arr => (arr.length ? `<ul class="facts">${arr.map(f => `<li>${ic('check')}<span>${esc(f)}</span></li>`).join('')}</ul>` : '');
  return `${appbar(`${ic('newspaper')} ${L('करेंट अफेयर्स', 'Current affairs')}`, { back: 'ca' })}
<main class="page gutter">
  <article class="card article">
    <div class="art-meta"><span class="badge" style="--c2:${c.c2}">${esc(catLabel(n.cat))}</span><span>${fmtDate(n.date)}${n.time ? ' · ' + esc(n.time) : ''} · ${weekday(n.date)}</span></div>
    <h1>${esc(nT(n))}</h1>
    <div class="art-meta">${nSrc(n) ? `<span>${L('स्रोत', 'Source')}: ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(nSrc(n))} ${ic('external')}</a>` : esc(nSrc(n))}</span>` : ''}</div>
    <div class="art-tools no-print">${ttsAvailable() ? `<button class="btn btn-sm btn-outline" data-act="tts" data-id="${esc(n.id)}">${ic('volume')} ${L('सुनें', 'Listen')}</button>` : ''}<button class="btn btn-sm btn-outline" data-act="bm-n" data-id="${esc(n.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? L('सहेजा गया', 'Saved') : L('सहेजें', 'Save')}</button><button class="btn btn-sm btn-outline" data-act="share-news" data-id="${esc(n.id)}">${ic('share')} ${L('शेयर', 'Share')}</button><a class="btn btn-sm btn-outline" href="#ca-notes/${esc(n.id)}">${ic('printer')} PDF</a></div>
    ${sec('list', 'सारांश', 'Summary', `<p>${esc(nS(n))}</p>`)}
    ${sec('book-open', 'विस्तार से', 'In detail', nX(n, 'details') ? `<p>${esc(nX(n, 'details'))}</p>` : '')}
    ${sec('target', 'यह क्यों महत्वपूर्ण है', 'Why it matters', nX(n, 'why') ? `<p>${esc(nX(n, 'why'))}</p>` : '')}
    ${sec('clock', 'पृष्ठभूमि', 'Background', nX(n, 'bg') ? `<p>${esc(nX(n, 'bg'))}</p>` : '')}
    ${sec('star', 'परीक्षा के लिए मुख्य तथ्य', 'Key facts for exams', ul(facts))}
    ${sec('clipboard', 'संबंधित योजनाएँ और नीतियाँ', 'Related schemes and policies', ul(schemes))}
    ${sec('landmark', 'संबंधित संस्थाएँ', 'Organisations and institutions', ul(orgs))}
  </article>
  ${qs.length ? `<button class="ca-cta" data-act="news-quiz" data-id="${esc(n.id)}">${ic('help')}<span class="row-main"><b>${L(`इस ख़बर से ${qs.length} अभ्यास प्रश्न`, `${qs.length} practice questions from this story`)}</b><span>${L('हर उत्तर पर व्याख्या', 'An explanation after every answer')}</span></span>${ic('arrow-right')}</button>` : ''}
  ${related.length ? `<section class="sec"><h2 class="sec-title">${ic('newspaper')} ${L('इसी श्रेणी की और ख़बरें', 'More in this category')}</h2>${related.map(newsCard).join('')}</section>` : ''}
</main>
${bottomNav('ca')}`;
}
// Printable notes for a story, this week or this month.
function vCaNotes() {
  const m = M(), arg = routeArg;
  const list = arg === 'week' || arg === 'month' ? caRange(arg) : [m.newsById.get(arg)].filter(Boolean);
  if (!list.length) return redirect('ca');
  const title = arg === 'week' ? `${L('साप्ताहिक करेंट अफेयर्स', 'Weekly current affairs')} · ${fmtWeek(weekKey(todayISO()))}` : arg === 'month' ? `${L('मासिक करेंट अफेयर्स', 'Monthly current affairs')} · ${fmtMonth(monthKey(todayISO()))}` : L('करेंट अफेयर्स नोट्स', 'Current affairs notes');
  return `${appbar(`${ic('printer')} ${L('नोट्स', 'Notes')}`, { back: arg === 'week' || arg === 'month' ? 'ca' : 'news/' + arg })}
<main class="page gutter">
  <section class="card article"><h1>${esc(title)}</h1><div class="art-meta">MY QUIZ · ${L('तैयार', 'Prepared')} ${fmtDate(todayISO())} · ${list.length} ${L('ख़बरें', 'stories')}</div>
    <div class="art-tools no-print"><button class="btn btn-sm btn-cta" data-act="print">${ic('printer')} ${L('प्रिंट / PDF सहेजें', 'Print / save as PDF')}</button></div></section>
  ${list.map(n => `<article class="card article"><div class="art-meta"><span>${fmtDate(n.date)}</span><span>${esc(catLabel(n.cat))}</span>${nSrc(n) ? `<span>${L('स्रोत', 'Source')}: ${esc(nSrc(n))}</span>` : ''}</div><h1 style="font-size:1.1rem">${esc(nT(n))}</h1><p style="margin:0">${esc(nS(n))}</p>${nX(n, 'why') ? `<p class="small" style="margin:0"><b>${L('क्यों महत्वपूर्ण', 'Why it matters')}:</b> ${esc(nX(n, 'why'))}</p>` : ''}${nF(n).length ? `<ul class="small" style="margin:0;padding-left:1.2em">${nF(n).map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</article>`).join('')}
</main>`;
}

// ── Aaj ka Din: a 3–5 minute daily session ──
function todayFive(iso) {
  const m = M(), md = iso.slice(5), mon = md.slice(0, 2);
  const own = m.dayQs.filter(q => q.day === md);
  const month = shuffle(m.dayQs.filter(q => q.day && q.day.slice(0, 2) === mon && q.day !== md), rng('t5:' + iso));
  const hist = shuffle(m.bySubj.history || [], rng('t5h:' + iso));
  return uniq([...own.slice(0, 2), ...month, ...hist].map(q => q.id)).slice(0, 5).map(id => m.byId.get(id));
}
function vToday() {
  const m = M(), t = todayISO();
  const iso = dayCursor || t, md = iso.slice(5);
  const entries = m.daysByMd[md] || [];
  const d = entries[clamp(dayPick, 0, Math.max(0, entries.length - 1))];
  const isToday = iso === t, dd = parseISO(iso), mon = md.slice(0, 2);
  const rel = m.all.filter(q => q.day === md).length;
  const up = upcomingDays(iso, 5);
  const t5 = (U.s.t5 || {})[t];
  const monthDays = m.days.filter(x => x.md.slice(0, 2) === mon);
  const near = m.days.filter(x => ['जयंती', 'स्मृति दिवस'].includes(x.k) && Math.abs(diffDays(`${dd.getFullYear()}-${x.md}`, iso)) <= 10 && x !== d);
  const session = isToday ? `<section class="card next"><span class="k">${L('आज का सत्र · 3–5 मिनट', 'Today\'s session · 3–5 min')}</span><h3>${t5 != null ? L(`आज का सत्र पूरा — 5 में से ${t5} सही`, `Session done — ${t5} of 5 right`) : L('पढ़ें → 5 प्रश्न → दोहराएँ', 'Read → 5 questions → revise')}</h3>
    <p>${L('① नीचे की कहानी और तथ्य पढ़ें ② 5 प्रश्नों की चुनौती दें ③ फ़्लैशकार्ड से दोहराएँ।', '① Read the story and facts below ② take the 5-question challenge ③ revise with flashcards.')}</p>
    <div class="ringbox"><span class="lvl-badge">${t5 != null ? ic('check') : '5'}</span></div>
    <div class="grid2" style="grid-column:1/-1"><button class="btn btn-cta" data-act="today-five" ${C.baseState === 'ok' ? '' : 'disabled'}>${ic('zap')} ${t5 != null ? L('फिर से', 'Again') : L('5 प्रश्न', '5 questions')}</button><button class="btn btn-outline" data-act="cards-start" data-src="ch:${esc(d ? KIND_CH[d.k] || 'd-nat' : 'd-nat')}">${ic('cards')} ${L('फ़्लैशकार्ड', 'Flashcards')}</button></div></section>` : '';
  let card;
  if (C.baseState === 'loading') card = '<div class="skeleton" style="height:300px;border-radius:16px"></div>';
  else if (!d) {
    const nx = up[0];
    card = `<div class="card">${emptyState('calendar', L('इस तारीख़ के लिए कोई प्रमुख दिवस दर्ज नहीं है', 'No important day is listed for this date'), nx ? `${L('अगला महत्वपूर्ण दिवस', 'Next important day')}: <b>${esc(dT(nx))}</b> (${fmtMD(nx.md)})` : '')}${nx ? `<button class="btn btn-navy btn-block" data-act="day-goto" data-iso="${nx.iso}">${L('देखें', 'View')}: ${esc(dT(nx))} ${ic('arrow-right')}</button>` : ''}</div>`;
  } else {
    const k = kindOf(d.k), facts = dF(d), bm = U.isBm('d', d.id);
    card = `${entries.length > 1 ? `<div class="chips" role="group" aria-label="${L('इस दिन के दिवस', 'Days on this date')}">${entries.map((e, i) => `<button class="chip" data-act="day-pick" data-i="${i}" aria-pressed="${e === d}">${esc(dT(e))}</button>`).join('')}</div>` : ''}
    <article class="daycard">
      <div class="day-top">
        <div class="day-art" role="img" aria-label="${esc(`${dd.getDate()} ${MONTHS[LANG][dd.getMonth()]} — ${kindLabel(d.k)}`)}"><span class="dn tnum">${dd.getDate()}</span><span class="dm">${MONTHS[LANG][dd.getMonth()]}</span>${ic(k.icon)}</div>
        <div class="day-title"><span><span class="badge" style="--c2:${k.c}">${esc(kindLabel(d.k))}</span></span><h2>${esc(dT(d))}</h2><span class="small" style="color:var(--muted)">(${fmtMD(d.md)}${d.y ? ` · ${L(k.y, k.yEn)}: ${d.y}` : ''})</span></div>
      </div>
      <div class="day-sec">${ic('book-open')}<div><h3>${L('कहानी: शुरुआत कैसे हुई', 'The story: how it began')}</h3><p>${esc(dH(d))}</p></div></div>
      ${dO(d) ? `<div class="day-sec">${ic('target')}<div><h3>${L('उद्देश्य', 'Purpose')}</h3><p>${esc(dO(d))}</p></div></div>` : ''}
      ${facts.length ? `<div class="day-sec">${ic('star')}<div><h3>${L('महत्वपूर्ण तथ्य', 'Key facts')}</h3><ul>${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>` : ''}
      <div class="btnrow" style="padding:0 16px 16px"><button class="btn btn-sm btn-outline" data-act="bm-d" data-id="${esc(d.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? L('सहेजा गया', 'Saved') : L('सहेजें', 'Save')}</button><button class="btn btn-sm btn-outline" data-act="share-day" data-id="${esc(d.id)}">${ic('share')} ${L('शेयर', 'Share')}</button><a class="btn btn-sm btn-outline" href="#chapter/${esc(KIND_CH[d.k] || 'd-nat')}">${ic('layers')} ${L('जुड़ा अध्याय', 'Related chapter')}</a></div>
    </article>
    ${rel ? `<button class="btn btn-navy btn-block" data-act="day-quiz" data-md="${md}">${L(`इस दिन से जुड़े ${rel} प्रश्न देखें`, `See ${rel} questions about this day`)} ${ic('arrow-right')}</button>` : ''}`;
  }
  const tl = monthDays.map(x => `<button class="upc link" style="color:inherit;font-weight:500;text-align:left" data-act="day-goto" data-iso="${dd.getFullYear()}-${x.md}"><span class="d" ${x.md === md ? 'style="background:var(--navy);"' : ''}><b class="tnum" ${x.md === md ? 'style="color:#fff"' : ''}>${Number(x.md.slice(3))}</b><span ${x.md === md ? 'style="color:#fff"' : ''}>${monthShort(Number(mon) - 1)}</span></span><span class="row-main"><span class="row-title" style="font-size:.98rem">${esc(dT(x))}</span><span class="row-sub">${esc(kindLabel(x.k))}${x.y ? ` · ${x.y}` : ''}</span></span></button>`).join('');
  return `${appbar(`${ic('calendar')} ${L('आज का दिन', 'Today in History')}`, { back: 'learn', right: `<button class="iconbtn" data-act="day-calendar" aria-label="${L('कैलेंडर से तारीख़ चुनें', 'Pick a date from the calendar')}">${ic('list')}</button>` })}
<main class="page gutter">
  <div class="daynav">
    <button class="iconbtn" data-act="day-step" data-v="-1" aria-label="${L('पिछला दिन', 'Previous day')}">${ic('chev-left')}</button>
    <div class="when tnum">${isToday ? L('आज, ', 'Today, ') : ''}${fmtDate(iso, false)}<small>${WEEKDAYS[LANG][dd.getDay()]}${isToday ? '' : ` · <button class="link" data-act="day-today">${L('आज पर लौटें', 'Back to today')}</button>`}</small></div>
    <button class="iconbtn" data-act="day-step" data-v="1" aria-label="${L('अगला दिन', 'Next day')}">${ic('chev-right')}</button>
  </div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${session}
  ${card}
  ${near.length ? `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('users')} ${L('आसपास की जयंतियाँ और स्मृति दिवस', 'Anniversaries around this date')}</h2>${near.map(x => `<button class="upc link" style="color:inherit;font-weight:500;text-align:left" data-act="day-goto" data-iso="${dd.getFullYear()}-${x.md}"><span class="d"><b class="tnum">${Number(x.md.slice(3))}</b><span>${monthShort(Number(x.md.slice(0, 2)) - 1)}</span></span><span class="row-main"><span class="row-title" style="font-size:.98rem">${esc(dT(x))}</span><span class="row-sub">${esc(kindLabel(x.k))}</span></span></button>`).join('')}</section>` : ''}
  ${tl ? `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('clock')} ${L(`${MONTHS.hi[Number(mon) - 1]} की समय-रेखा`, `${MONTHS.en[Number(mon) - 1]} timeline`)}</h2>${tl}</section>` : ''}
  ${up.length ? `<section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1rem">${ic('calendar')} ${L('आने वाले महत्वपूर्ण दिवस', 'Coming up')}</h2>${up.map(e => { const dn = diffDays(t, e.iso); return `<button class="upc link" style="color:inherit;font-weight:500;text-align:left" data-act="day-goto" data-iso="${e.iso}"><span class="d"><b class="tnum">${parseISO(e.iso).getDate()}</b><span>${monthShort(parseISO(e.iso).getMonth())}</span></span><span class="row-main"><span class="row-title" style="font-size:.98rem">${esc(dT(e))}</span><span class="row-sub">${esc(kindLabel(e.k))} · ${dn === 1 ? L('कल', 'tomorrow') : dn > 0 ? L(`${dn} दिन बाद`, `in ${dn} days`) : fmtDate(e.iso, false)}</span></span></button>`; }).join('')}</section>` : ''}
</main>
${bottomNav('today')}`;
}
