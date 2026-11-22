// ───────────────────────────── v3: test builder, friend challenges, notes, AI tutor ─────────────────────────────
const MARKING = [[1, 0, '+1 / 0'], [1, 0.25, '+1 / −0.25'], [1, 1 / 3, '+1 / −⅓'], [2, 0.5, '+2 / −0.5']];
const BLD = { s: '', ch: '', d: 0, n: 10, mins: 10, mk: 1 };
function builderPool() {
  const m = M();
  let list = BLD.ch ? m.byCh[BLD.ch] || [] : BLD.s ? m.bySubj[BLD.s] || [] : m.all;
  if (BLD.d) list = list.filter(q => (q.d || 1) === BLD.d);
  return list;
}
function vBuilder() {
  const m = M(), pool = builderPool(), mk = MARKING[BLD.mk] || MARKING[0];
  const chs = BLD.s ? chaptersOf(BLD.s) : [];
  const chip = (act, v, cur, label) => `<button class="chip" data-act="${act}" data-v="${esc(v)}" aria-pressed="${String(cur) === String(v)}">${label}</button>`;
  return `${appbar(`${ic('sliders')} ${L('अपना टेस्ट बनाएँ', 'Build your own test')}`, { back: 'compete' })}
<main class="page gutter">
  <div class="note">${ic('info')}<div>${L('परीक्षा मोड: उत्तर अंत में दिखेंगे, समय-सीमा और नेगेटिव मार्किंग लागू होगी।', 'Exam mode: answers are shown only at the end, with a time limit and negative marking.')}</div></div>
  <section class="card" style="display:flex;flex-direction:column;gap:14px">
    <div class="field"><span class="lbl">${L('विषय', 'Subject')}</span><div class="chips wrap">${chip('bld-s', '', BLD.s, L('सभी', 'All'))}${SUBJECTS.map(sj => chip('bld-s', sj.k, BLD.s, esc(subjName(sj.k)))).join('')}</div></div>
    ${chs.length ? `<div class="field"><label for="bld-ch">${L('अध्याय', 'Chapter')}</label><select class="select" id="bld-ch" data-change="bld-ch"><option value="">${L('सभी अध्याय', 'All chapters')}</option>${chs.map(c => `<option value="${esc(c.id)}" ${BLD.ch === c.id ? 'selected' : ''}>${esc(L(c.hi, c.en))} (${(m.byCh[c.id] || []).length})</option>`).join('')}</select></div>` : ''}
    <div class="field"><span class="lbl">${L('कठिनाई', 'Difficulty')}</span><div class="chips wrap">${[0, 1, 2, 3].map(d => chip('bld-d', d, BLD.d, d ? esc(diffLabel(d)) : L('मिश्रित', 'Mixed'))).join('')}</div></div>
    <div class="field"><span class="lbl">${L('प्रश्न', 'Questions')}</span><div class="chips">${[5, 10, 20, 30].map(n => chip('bld-n', n, BLD.n, String(n))).join('')}</div></div>
    <div class="field"><span class="lbl">${L('समय', 'Time')}</span><div class="chips">${[5, 10, 15, 20, 30].map(n => chip('bld-mins', n, BLD.mins, `${n} ${L('मिनट', 'min')}`)).join('')}</div></div>
    <div class="field"><span class="lbl">${L('अंक योजना (सही / गलत)', 'Marking (right / wrong)')}</span><div class="chips wrap">${MARKING.map((x, i) => chip('bld-mk', i, BLD.mk, x[2])).join('')}</div><span class="small muted">${L('SSC: +2/−0.5 · UPSC: +1/−⅓ के बराबर', 'SSC: +2/−0.5 · UPSC: equivalent to +1/−⅓')}</span></div>
    <p class="small" style="margin:0">${L(`उपलब्ध प्रश्न: ${pool.length}`, `Questions available: ${pool.length}`)}${pool.length < BLD.n ? ` — ${L(`टेस्ट में ${pool.length} प्रश्न होंगे`, `the test will have ${pool.length}`)}` : ''}</p>
    <button class="btn btn-cta" data-act="bld-start" ${pool.length >= 3 ? '' : 'disabled'}>${ic('play')} ${L('टेस्ट शुरू करें', 'Start test')} · ${Math.min(BLD.n, pool.length)} ${L('प्रश्न', 'Qs')} · ${BLD.mins} ${L('मिनट', 'min')} · ${mk[2]}</button>
  </section>
</main>
${bottomNav('compete')}`;
}

// Friend challenges travel as a short code (also inside a link where the host allows it): same questions, compare scores.
const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function b64d(c) { try { const s = String(c).trim().replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s + '==='.slice((s.length + 3) % 4))))); } catch { return null; } }
function readChallenge(code) {
  const x = b64d(code);
  if (!x || x.v !== 1 || !Array.isArray(x.ids)) return null;
  const ids = x.ids.map(String).filter(id => M().byId.has(id)).slice(0, 30);
  return ids.length >= 3 ? { n: String(x.n || '').slice(0, 24), ids, sc: Number(x.sc) || 0, max: Number(x.max) || ids.length, sec: Number(x.sec) || 0 } : null;
}
function challengeText(code, R) {
  const link = P.mode === 'standalone' && /^https?:/.test(location.protocol) ? `${location.origin}${location.pathname}#challenge/${code}` : '';
  return L(`🧠 MY QUIZ चुनौती! मैंने ${R.n} में से ${R.c} सही किए (${fmtScore(R.score)}/${R.max})। क्या आप मुझे हरा सकते हैं?\n${link ? link + '\n' : ''}ऐप में "मुक़ाबला → चुनौती कोड डालें" में यह कोड पेस्ट करें:\n${code}`,
    `🧠 MY QUIZ challenge! I got ${R.c} of ${R.n} right (${fmtScore(R.score)}/${R.max}). Can you beat me?\n${link ? link + '\n' : ''}In the app, open "Compete → Enter a challenge code" and paste:\n${code}`);
}
function vChallenge() {
  const x = routeArg ? readChallenge(routeArg) : null;
  return `${appbar(`${ic('users')} ${L('दोस्त की चुनौती', 'Friend challenge')}`, { back: 'compete' })}
<main class="page gutter">
  ${x ? `<section class="card next"><span class="k">${L('चुनौती', 'Challenge')}</span><h3>${esc(x.n || L('आपके दोस्त', 'Your friend'))} ${L('ने आपको चुनौती दी है', 'challenged you')}</h3>
    <p>${L(`${x.ids.length} प्रश्न · उनका स्कोर ${fmtScore(x.sc)}/${x.max}${x.sec ? ` · ${fmtSecs(x.sec)}` : ''}`, `${x.ids.length} questions · their score ${fmtScore(x.sc)}/${x.max}${x.sec ? ` · ${fmtSecs(x.sec)}` : ''}`)}</p>
    <div class="ringbox"><span class="lvl-badge">${ic('swords')}</span></div>
    <button class="btn btn-cta btn-block" data-act="friend-accept" data-code="${esc(routeArg)}">${ic('play')} ${L('चुनौती स्वीकार करें', 'Accept the challenge')}</button></section>
    <p class="small muted" style="margin:0">${L('परीक्षा मोड · 5 मिनट · कोई नेगेटिव मार्किंग नहीं। उत्तर अंत में दिखेंगे।', 'Exam mode · 5 minutes · no negative marking. Answers are shown at the end.')}</p>`
    : `<section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1.05rem">${ic('link')} ${L('चुनौती कोड डालें', 'Enter a challenge code')}</h2>
    ${routeArg ? `<div class="note note-warn">${ic('alert')}<div>${L('यह कोड सही नहीं है या इसके प्रश्न इस ऐप में नहीं हैं।', 'This code is not valid, or its questions are not in this app.')}</div></div>` : ''}
    <form data-form="challenge-code" style="display:flex;flex-direction:column;gap:10px"><textarea class="textarea" id="ch-code" rows="3" placeholder="${L('दोस्त का भेजा कोड यहाँ पेस्ट करें', 'Paste the code your friend sent')}" style="min-height:80px"></textarea><button class="btn btn-cta" type="submit">${ic('arrow-right')} ${L('चुनौती खोलें', 'Open challenge')}</button></form></section>`}
</main>
${bottomNav('compete')}`;
}

// Printable chapter notes (verified content only) — "Save as PDF" from the print dialog.
function vNotes() {
  const id = routeArg, list = (M().byCh[id] || []).slice().sort((a, b) => (a.d || 1) - (b.d || 1));
  if (!list.length) return redirect('learn');
  const items = list.map((q, i) => { const o = qO(q), why = qWhy(q); return `<article class="review-item"><b>${i + 1}. ${esc(qT(q))}</b><span class="ans">${L('उत्तर', 'Answer')}: <span class="ans-ok">${esc(o[q.a])}</span></span><span class="small">${esc(qE(q) || '')}</span>${qCtx(q) ? `<span class="small muted">${esc(qCtx(q))}</span>` : ''}${why.some(Boolean) ? `<ul class="small" style="margin:0;padding-left:1.2em">${o.map((x, j) => (j !== q.a && why[j] ? `<li>${esc(x)}: ${esc(why[j])}</li>` : '')).join('')}</ul>` : ''}</article>`; }).join('');
  return `${appbar(`${ic('printer')} ${L('नोट्स', 'Notes')}`, { back: 'chapter/' + id })}
<main class="page gutter">
  <section class="card article"><h1>${esc(chName(id))}</h1><div class="art-meta">${esc(subjName((CHM[id] || {}).s || ''))} · ${list.length} ${L('प्रश्न', 'questions')} · MY QUIZ · ${fmtDate(todayISO())}</div>
    <div class="art-tools no-print"><button class="btn btn-sm btn-cta" data-act="print">${ic('printer')} ${L('प्रिंट / PDF सहेजें', 'Print / save as PDF')}</button><button class="btn btn-sm btn-outline" data-act="notes-copy" data-ch="${esc(id)}">${ic('copy')} ${L('टेक्स्ट कॉपी करें', 'Copy text')}</button></div></section>
  <div class="list">${items}</div>
</main>`;
}
function notesText(id) {
  return [`${chName(id)} — MY QUIZ`, ''].concat((M().byCh[id] || []).map((q, i) => { const o = qO(q); return `${i + 1}. ${qT(q)}\n   ${L('उत्तर', 'Answer')}: ${o[q.a]}\n   ${qE(q) || ''}`; })).join('\n');
}

// AI tutor: follow-up questions about one question, grounded in its verified explanation.
const TUTOR = { q: null, msgs: [], busy: false, ctl: null };
function tutorContext(q) {
  const o = qO(q), why = qWhy(q);
  return [`${L('प्रश्न', 'Question')}: ${qT(q)}`, `${L('विकल्प', 'Options')}: ${o.map((x, i) => `${LETTERS[i]}) ${x}`).join('  ')}`, `${L('सही उत्तर', 'Correct answer')}: ${LETTERS[q.a]}) ${o[q.a]}`,
    `${L('सत्यापित व्याख्या', 'Verified explanation')}: ${qE(q) || '—'}`, qCtx(q) ? `${L('पृष्ठभूमि', 'Background')}: ${qCtx(q)}` : '',
    why.some(Boolean) ? `${L('गलत विकल्प क्यों गलत हैं', 'Why the wrong options are wrong')}: ${o.map((x, i) => (i !== q.a && why[i] ? `${x} — ${why[i]}` : '')).filter(Boolean).join(' | ')}` : ''].filter(Boolean).join('\n');
}
function tutorPrompt(q, ask) {
  const hist = TUTOR.msgs.slice(-6).map(m => `${m.me ? L('विद्यार्थी', 'Student') : L('ट्यूटर', 'Tutor')}: ${m.text}`).join('\n');
  return LANG === 'en'
    ? `You are a patient tutor for Indian competitive-exam students. Answer in simple English, at most 120 words, short sentences, no Markdown.
Use only the verified material below and well-established textbook facts. If you are not sure of a fact, say so plainly instead of guessing. Never invent dates, numbers or names.

Verified material:
${tutorContext(q)}

Conversation so far:
${hist || '—'}

Student: ${ask}
Tutor:`
    : `आप भारत की प्रतियोगी परीक्षाओं के विद्यार्थियों के धैर्यवान शिक्षक हैं। सरल हिंदी में, अधिकतम 120 शब्दों में, छोटे वाक्यों में उत्तर दें। Markdown का प्रयोग न करें।
केवल नीचे दी गई सत्यापित सामग्री और पाठ्यपुस्तकों के स्थापित तथ्यों का प्रयोग करें। किसी तथ्य पर पक्का भरोसा न हो तो साफ़ कहें, अनुमान न लगाएँ। तारीख़, संख्या या नाम कभी न गढ़ें।

सत्यापित सामग्री:
${tutorContext(q)}

अब तक की बातचीत:
${hist || '—'}

विद्यार्थी: ${ask}
शिक्षक:`;
}
const TUTOR_QUICK = [['आसान भाषा में समझाएँ', 'Explain it simply'], ['रोज़मर्रा का एक उदाहरण दें', 'Give a real-life example'], ['याद रखने की ट्रिक बताएँ', 'Give me a memory trick'], ['इससे जुड़े विषय कौन-से हैं?', 'Which related topics should I study?']];
function tutorHtml() {
  const q = TUTOR.q;
  return `${sheetHead(`${ic('message')} ${L('AI ट्यूटर', 'AI tutor')}`)}
  <p class="small muted" style="margin:0">${esc(qT(q))}</p>
  <div class="chat" id="tutor-chat">${TUTOR.msgs.map(m => `<div class="msg ${m.me ? 'me' : 'ai'}">${esc(m.text || (TUTOR.busy ? L('सोच रहा है…', 'Thinking…') : ''))}${m.err ? `<br><span style="color:var(--bad)">${esc(m.err)}</span>` : ''}</div>`).join('') || `<div class="msg ai">${L('इस प्रश्न के बारे में कुछ भी पूछें — मैं सत्यापित व्याख्या के आधार पर समझाऊँगा।', 'Ask anything about this question — I\'ll explain using the verified explanation.')}</div>`}</div>
  <div class="chips">${TUTOR_QUICK.map(([hi, en]) => `<button class="chip" data-act="tutor-ask" data-v="${esc(L(hi, en))}" ${TUTOR.busy ? 'disabled' : ''}>${esc(L(hi, en))}</button>`).join('')}</div>
  <form class="chat-form" data-form="tutor"><input class="input" id="tutor-in" maxlength="300" placeholder="${L('अपना प्रश्न लिखें', 'Type your question')}" autocomplete="off" ${TUTOR.busy ? 'disabled' : ''}><button class="btn btn-cta" type="submit" ${TUTOR.busy ? 'disabled' : ''} aria-label="${L('भेजें', 'Send')}">${ic('send')}</button></form>
  <p class="small muted" style="margin:0">${ic('info')} ${L('AI के उत्तर गलत भी हो सकते हैं — मुख्य तथ्य ऊपर दी गई सत्यापित व्याख्या से मिलाएँ।', 'AI answers can be wrong — check key facts against the verified explanation.')}</p>`;
}
function openTutor(q) { if (TUTOR.q !== q) { TUTOR.q = q; TUTOR.msgs = []; } openSheet(tutorHtml(), { label: L('AI ट्यूटर', 'AI tutor'), onClose: () => { if (TUTOR.ctl) TUTOR.ctl.abort(); } }); }
async function tutorAsk(text) {
  const q = TUTOR.q, ask = String(text || '').trim().slice(0, 300);
  if (!q || !ask || TUTOR.busy) return;
  TUTOR.msgs.push({ me: true, text: ask });
  const reply = { me: false, text: '' };
  TUTOR.msgs.push(reply);
  TUTOR.busy = true; TUTOR.ctl = new AbortController();
  const redraw = () => { if (sheetOpen() && $('#tutor-chat')) { $('#sheet-root .sheet').innerHTML = '<div class="sheet-grip"></div>' + tutorHtml(); const c = $('#tutor-chat'); if (c) c.scrollTop = c.scrollHeight; } };
  redraw();
  try { await AI.text(tutorPrompt(q, ask), { signal: TUTOR.ctl.signal, onText: ({ text }) => { reply.text = text; const els = $$('#tutor-chat .msg.ai'); if (els.length) els[els.length - 1].textContent = text; } }); }
  catch (e) { reply.err = AI.msg(e); if (e && e.text) reply.text = e.text; }
  TUTOR.busy = false; TUTOR.ctl = null;
  redraw();
  const inp = $('#tutor-in'); if (inp) inp.focus({ preventScroll: true });
}
// AI revision notes for a chapter, summarised only from its verified questions.
async function aiNotes(id) {
  const list = (M().byCh[id] || []).slice(0, 40);
  const src = list.map(q => `• ${qT(q)} → ${qO(q)[q.a]}. ${qE(q) || ''} ${qCtx(q) || ''}`).join('\n');
  openSheet(`${sheetHead(`${ic('sparkles')} ${L('AI रिविज़न नोट्स', 'AI revision notes')}`)}<p class="small muted" style="margin:0">${esc(chName(id))} · ${L('केवल इस अध्याय के सत्यापित प्रश्नों से बने', 'Made only from this chapter\'s verified questions')}</p><div class="ai-box" id="ai-notes" style="white-space:pre-wrap">${L('नोट्स बन रहे हैं…', 'Writing notes…')}</div><div class="btnrow"><button class="btn btn-sm btn-outline" data-act="notes-copy-ai">${ic('copy')} ${L('कॉपी करें', 'Copy')}</button><a class="btn btn-sm btn-outline" href="#notes/${esc(id)}">${ic('printer')} ${L('पूरे नोट्स (प्रिंट)', 'Full notes (print)')}</a></div>`, { label: L('AI रिविज़न नोट्स', 'AI revision notes') });
  const prompt = LANG === 'en'
    ? `Write short exam revision notes in simple English from ONLY the verified facts below. 8–12 bullet points starting with "• ", one fact each, grouped logically. No Markdown headings, no facts that are not below.\n\nVerified facts (${chName(id)}):\n${src}`
    : `नीचे दिए केवल सत्यापित तथ्यों से सरल हिंदी में परीक्षा के लिए छोटे रिविज़न नोट्स लिखें। 8–12 बिंदु, हर बिंदु "• " से शुरू, एक बिंदु में एक तथ्य, विषय के अनुसार क्रम में। Markdown शीर्षक नहीं, और नीचे न दिया कोई तथ्य नहीं।\n\nसत्यापित तथ्य (${chName(id)}):\n${src}`;
  try { await AI.text(prompt, { onText: ({ text }) => { const b = $('#ai-notes'); if (b) b.textContent = text; } }); }
  catch (e) { const b = $('#ai-notes'); if (b) b.textContent = AI.msg(e); }
}
