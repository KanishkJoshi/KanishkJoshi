// ───────────────────────────── views: admin ─────────────────────────────
const typeLabel = t => { const x = TYPE_LABEL[t === 'days' ? 'day' : t]; return x ? L(x[0], x[1]) : t; };
function vNoAdmin() {
  return `${appbar(L('एडमिन पैनल', 'Admin panel'), { back: 'profile' })}<main class="page gutter"><div class="card">${emptyState('lock', L('यह भाग केवल संपादकों के लिए है', 'This area is for editors only'), P.ready ? L('सामग्री जोड़ने या प्रकाशित करने के लिए इस ऐप के संपादक से पहुँच माँगें।', 'Ask an editor of this app for access to add or publish content.') : L('आपकी पहुँच जाँची जा रही है…', 'Checking your access…'))}</div></main>`;
}
const ADMIN_ROUTES = new Set(['admin', 'admin-ai', 'admin-review', 'admin-publish', 'admin-bank', 'admin-news', 'admin-days', 'admin-rewards']);
function cmsNote() {
  if (P.demo) return `<div class="note">${ic('info')}<div>${L('<b>टेस्ट संस्करण:</b> यहाँ किए बदलाव केवल आपके ब्राउज़र में सहेजे जाते हैं — बेझिझक आज़माएँ। असली ऐप पर कोई असर नहीं होगा।', '<b>Test build:</b> changes here are saved only in your browser, so try anything. The real app is not affected.')}</div></div>`;
  if (P.mode === 'standalone') return `<div class="note">${ic('info')}<div>${L('<b>डेमो मोड:</b> यहाँ किए बदलाव केवल इसी ब्राउज़र में सहेजे जाते हैं। असली ऐप में यही पैनल सर्वर से जुड़ेगा।', '<b>Demo mode:</b> changes here are saved only in this browser. In the real app this panel connects to the server.')}</div></div>`;
  if (C.cmsState === 'loading') return `<div class="note">${ic('clock')}<div>${L('ड्राफ़्ट लोड हो रहे हैं…', 'Loading drafts…')}</div></div>`;
  if (C.cmsState === 'slow' || C.cmsState === 'error') return `<div class="note note-warn">${ic('alert')}<div>${L('सर्वर से ड्राफ़्ट अभी नहीं मिल पाए। दिख रही जानकारी पुरानी हो सकती है।', 'Drafts could not be loaded from the server yet. What you see may be out of date.')}</div></div>`;
  return '';
}
function vAdmin() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M(), t = todayISO();
  const newsWeek = m.news.filter(n => { const d = diffDays(n.date, t); return d >= 0 && d <= 7; }).length;
  const pending = C.drafts.filter(d => d.status !== 'approved');
  const aiPending = pending.filter(d => d.origin === 'ai').length;
  const approved = C.drafts.filter(d => d.status === 'approved').length;
  const live = m.qs.length + m.news.length + m.days.length;
  const reports = C.reports.length;
  const lw = LB.announceKey('week');
  const weekDue = !LB.winners.some(w => w.kind === 'week' && w.key === lw) && LB.board('lastweek').some(r => r.p > 0 && !r.me) ? 1 : 0;
  const players = LB.board('week').filter(r => r.p > 0).length;
  const act = (href, icon, label, cnt = 0) => `<a class="act" href="#${href}"><span class="ai">${ic(icon)}</span><span>${label}</span>${ic('chev-right', 'chev')}${cnt ? `<span class="cnt">${cnt}</span>` : ''}</a>`;
  return `<header class="appbar admin-hero"><div class="appbar-in gutter">
    <div class="logo" style="flex:1;font-size:1.45rem">${capLogo()}<span>MY <span class="q">QUIZ</span><small>ADMIN PANEL</small></span></div>
    ${langBtn()}
    <a class="iconbtn" href="#home" aria-label="${L('ऐप पर लौटें', 'Back to the app')}" title="${L('ऐप पर लौटें', 'Back to the app')}">${ic('settings')}</a>
  </div></header>
<main class="page gutter">
  <h2 style="margin:0;text-align:center;font-size:1.2rem;font-weight:800">${L('नमस्कार! आज का कार्य', 'Hello! Today\'s work')}</h2>
  ${cmsNote()}
  <div class="stat3">
    <a class="astat a-blue" href="#admin-news" style="text-decoration:none">${ic('newspaper')}<span>${L('इस सप्ताह के समाचार', 'News this week')}</span><b>${newsWeek}</b></a>
    <a class="astat a-green" href="#admin-review" style="text-decoration:none">${ic('sparkles')}<span>${L('AI प्रश्न (समीक्षा हेतु)', 'AI questions to review')}</span><b>${aiPending}</b></a>
    <a class="astat a-violet" href="#admin-publish" style="text-decoration:none">${ic('rocket')}<span>${L('लाइव सामग्री', 'Live content')}</span><b>${live}</b></a>
  </div>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h3 class="sec-title" style="font-size:1rem">${ic('shield')} ${L('सामग्री पाइपलाइन', 'Content pipeline')}</h3>
    <div class="pipeline"><div class="pipe"><b>${newsWeek}</b>${L('स्रोत समाचार', 'Source news')}</div><div class="pipe"><b>${aiPending}</b>${L('AI ड्राफ़्ट', 'AI drafts')}</div><div class="pipe"><b>${pending.length}</b>${L('समीक्षा बाकी', 'To review')}</div><div class="pipe"><b>${approved}</b>${L('प्रकाशन हेतु', 'To publish')}</div></div>
    <p class="small muted" style="margin:0">${L('हर AI प्रश्न मानव समीक्षा के बाद ही विद्यार्थियों तक पहुँचता है।', 'Every AI question reaches students only after a human review.')}</p></section>
  <a class="reward" href="#admin-rewards"><span class="reward-ic">${ic('trophy')}</span><span class="row-main"><span class="row-title">${L('पुरस्कार और लीडरबोर्ड', 'Rewards & leaderboard')}</span><span class="row-sub">${L(`इस सप्ताह ${players} विद्यार्थी रैंकिंग में`, `${players} students ranked this week`)}${weekDue ? ' · ' + L('पिछले सप्ताह के विजेता घोषित करें', 'announce last week\'s winners') : ''}</span></span>${weekDue ? '<span class="cnt">1</span>' : ''}${ic('chev-right', 'chev')}</a>
  <h3 class="sec-title">${ic('sliders')} ${L('आपके कार्य के विकल्प', 'Your tools')}</h3>
  <div class="actions2">
    ${act('admin-news', 'newspaper', L('आज के समाचार देखें', 'Today\'s news'))}
    ${act('admin-days', 'calendar', L('आज का दिन', 'Today in History'))}
    ${act('admin-ai', 'sparkles', L('AI से प्रश्न बनवाएँ', 'Generate questions with AI'))}
    ${act('admin-review', 'shield', L('सामग्री की जाँच करें', 'Review content'), pending.length + reports)}
    ${act('admin-bank', 'book', L('GK प्रश्न बैंक', 'GK question bank'))}
    ${act('admin-publish', 'send', L('प्रकाशित करें', 'Publish'), approved)}
  </div>
</main>`;
}

const aiForm = { src: 'ca', newsId: '', dayId: '', text: '', subj: 'ca', n: 5, level: 2 };
let aiGen = { status: 'idle', items: [], err: '', sel: new Set() };
const newsToText = n => `${n.title}\nतारीख़: ${fmtDate(n.date)}\n${n.summary}\n${(n.facts || []).map(f => '• ' + f).join('\n')}${n.en && n.en.title ? `\n\nEnglish: ${n.en.title}\n${n.en.summary || ''}` : ''}`;
const dayToText = d => `${d.t} (${fmtMDin(d.md, 'hi')})\n${d.h}\n${d.o ? 'उद्देश्य: ' + d.o + '\n' : ''}${(d.f || []).map(f => '• ' + f).join('\n')}${d.en && d.en.t ? `\n\nEnglish: ${d.en.t}\n${d.en.h || ''}` : ''}`;
function vAdminAI() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M();
  if (aiForm.src === 'ca' && !aiForm.newsId && m.news[0]) { aiForm.newsId = m.news[0].id; aiForm.text = newsToText(m.news[0]); }
  const t = todayISO();
  const daysSorted = m.days.slice().sort((a, b) => { const da = (a.md >= t.slice(5) ? 0 : 1) + a.md, db = (b.md >= t.slice(5) ? 0 : 1) + b.md; return da.localeCompare(db); });
  if (aiForm.src === 'day' && !aiForm.dayId && daysSorted[0]) { aiForm.dayId = daysSorted[0].id; aiForm.text = dayToText(daysSorted[0]); }
  const avail = AI.available();
  const why = P.demo ? L('इस टेस्ट संस्करण में AI के लिए claude.ai खाते से साइन इन होना ज़रूरी है। यह टेस्ट (T21) छोड़ सकते हैं।', 'In this test build AI needs you to be signed in to claude.ai. You may skip this test (T21).')
    : P.mode === 'standalone' ? L('स्टैंडअलोन संस्करण में <code>window.MYQUIZ_CONFIG = { aiEndpoint: "…" }</code> सेट करें (README देखें)। तब तक "GK प्रश्न बैंक" से प्रश्न हाथ से जोड़ें।', 'In the standalone version set <code>window.MYQUIZ_CONFIG = { aiEndpoint: "…" }</code> (see README). Until then add questions by hand from the "GK question bank".')
      : L('इस दृश्य में Claude उपलब्ध नहीं है।', 'Claude is not available in this view.');
  return `${adminBar(L('AI से प्रश्न बनवाएँ', 'Generate questions with AI'))}
<main class="page gutter">
  ${avail ? '' : `<div class="note note-warn">${ic('alert')}<div><b>${L('AI अभी जुड़ा नहीं है।', 'AI is not connected yet.')}</b> ${why}</div></div>`}
  <div class="note">${ic('shield')}<div>${L('AI केवल नीचे दिए स्रोत पाठ से प्रश्न बनाता है — हिंदी और English दोनों में। हर प्रश्न प्रकाशन से पहले "सामग्री की जाँच" में मानव समीक्षा से गुज़रता है।', 'AI writes questions only from the source text below, in both Hindi and English. Every question passes human review in "Review content" before publishing.')}</div></div>
  <section class="card" style="display:flex;flex-direction:column;gap:14px">
    <div class="field"><span class="lbl">${L('स्रोत चुनें', 'Choose a source')}</span><div class="chips">${[['ca', 'करेंट अफेयर्स', 'Current affairs'], ['day', 'आज का दिन', 'Important day'], ['text', 'अपना पाठ', 'Your own text']].map(([v, hi, en]) => `<button class="chip" data-act="ai-src" data-v="${v}" aria-pressed="${aiForm.src === v}">${L(hi, en)}</button>`).join('')}</div></div>
    ${aiForm.src === 'ca' ? `<div class="field"><label for="ai-news">${L('समाचार', 'News')}</label><select class="select" id="ai-news" data-change="ai-news">${m.news.map(n => `<option value="${esc(n.id)}" ${n.id === aiForm.newsId ? 'selected' : ''}>${fmtDate(n.date, false)} — ${esc(nT(n))}</option>`).join('')}</select></div>` : ''}
    ${aiForm.src === 'day' ? `<div class="field"><label for="ai-day">${L('दिवस', 'Day')}</label><select class="select" id="ai-day" data-change="ai-day">${daysSorted.map(d => `<option value="${esc(d.id)}" ${d.id === aiForm.dayId ? 'selected' : ''}>${fmtMD(d.md)} — ${esc(dT(d))}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="ai-text">${L('स्रोत पाठ', 'Source text')} <span class="muted small">(${L('आप इसे बदल सकते हैं', 'you can edit it')})</span></label><textarea class="textarea" id="ai-text" data-bind="aiForm.text" rows="7" placeholder="${L('यहाँ समाचार, लेख या नोट्स पेस्ट करें…', 'Paste news, an article or notes here…')}">${esc(aiForm.text)}</textarea></div>
    <div class="grid2">
      <div class="field"><label for="ai-subj">${L('विषय', 'Subject')}</label><select class="select" id="ai-subj" data-bind="aiForm.subj">${SUBJECTS.filter(s => s.k !== 'days').map(s => `<option value="${s.k}" ${s.k === aiForm.subj ? 'selected' : ''}>${subjName(s.k)}</option>`).join('')}</select></div>
      <div class="field"><label for="ai-n">${L('प्रश्नों की संख्या', 'Number of questions')}</label><select class="select" id="ai-n" data-bind="aiForm.n">${[3, 5, 8].map(n => `<option value="${n}" ${Number(aiForm.n) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="field"><span class="lbl">${L('कठिनाई', 'Difficulty')}</span><div class="chips">${[[1, 'आसान', 'Easy'], [2, 'मध्यम', 'Medium'], [3, 'कठिन', 'Hard']].map(([v, hi, en]) => `<button class="chip" data-act="ai-level" data-v="${v}" aria-pressed="${Number(aiForm.level) === v}">${L(hi, en)}</button>`).join('')}</div></div>
    ${aiGen.status === 'loading'
      ? `<div class="btnrow"><button class="btn btn-brand" disabled>${ic('sparkles')} ${L('प्रश्न बन रहे हैं…', 'Writing questions…')}</button><button class="btn btn-outline" data-act="ai-stop">${L('रोकें', 'Stop')}</button></div><p class="small muted" style="margin:0">${L('इसमें 10–60 सेकंड लग सकते हैं। पहली बार Claude के उपयोग की अनुमति माँगी जाएगी।', 'This can take 10–60 seconds. The first time, you will be asked to allow Claude.')}</p>`
      : `<button class="btn btn-brand" data-act="ai-generate" ${avail ? '' : 'disabled'}>${ic('sparkles')} ${L('प्रश्न बनाएँ', 'Generate questions')}</button>`}
  </section>
  ${aiResults()}
</main>`;
}
function aiResults() {
  if (aiGen.status === 'error') return `<div class="note note-warn">${ic('alert')}<div>${esc(aiGen.err)}</div></div>`;
  if (aiGen.status !== 'done') return '';
  if (!aiGen.items.length) return `<div class="note note-warn">${ic('alert')}<div>${L('AI से कोई मान्य प्रश्न नहीं मिला। स्रोत पाठ बढ़ाकर फिर कोशिश करें।', 'The AI returned no valid questions. Add more source text and try again.')}</div></div>`;
  return `<section style="display:flex;flex-direction:column;gap:12px">
    <div class="sec-head"><h2 class="sec-title">${ic('sparkles')} ${L(`${aiGen.items.length} प्रश्न तैयार`, `${aiGen.items.length} questions ready`)}</h2>${aiGen.dropped ? `<span class="small muted">${L(`${aiGen.dropped} अमान्य हटाए गए`, `${aiGen.dropped} invalid removed`)}</span>` : ''}</div>
    ${aiGen.items.map((q, i) => `<article class="card draft"><label class="check"><input type="checkbox" data-change="ai-pick" data-i="${i}" ${aiGen.sel.has(i) ? 'checked' : ''}> <b>${L(`प्रश्न ${i + 1} चुनें`, `Select question ${i + 1}`)}</b></label>${qPreview(q)}<div><button class="link" data-act="ai-edit" data-i="${i}">${ic('pencil')} ${L('संपादित करें', 'Edit')}</button></div></article>`).join('')}
    <button class="btn btn-cta" data-act="ai-queue" ${aiGen.sel.size ? '' : 'disabled'}>${ic('send')} ${L(`चुने हुए ${aiGen.sel.size} प्रश्न समीक्षा में भेजें`, `Send ${aiGen.sel.size} selected questions to review`)}</button>
    <button class="btn btn-outline" data-act="ai-generate">${ic('rotate')} ${L('फिर से बनाएँ', 'Generate again')}</button>
  </section>`;
}
async function generateAI() {
  const text = String(aiForm.text || '').trim();
  if (text.length < 40) { toast(L('स्रोत पाठ कम से कम 40 अक्षरों का होना चाहिए।', 'The source text must be at least 40 characters long.'), 'err'); return; }
  const ctl = new AbortController();
  aiGen = { status: 'loading', items: [], err: '', sel: new Set(), ctl };
  render();
  try {
    const out = await AI.json(genPrompt({ ...aiForm, text }), { signal: ctl.signal });
    const arr = Array.isArray(out) ? out : out && Array.isArray(out.questions) ? out.questions : [];
    const items = arr.map(normalizeAIQ).filter(Boolean);
    aiGen = { status: 'done', items, dropped: arr.length - items.length, err: '', sel: new Set(items.map((_, i) => i)) };
  } catch (e) {
    aiGen = { status: e && e.code === 'cancelled' ? 'idle' : 'error', items: [], err: AI.msg(e), sel: new Set() };
  }
  if (route === 'admin-ai') render();
}

let reviewTab = 'drafts';
const reviewChecks = {}; // draft id -> ticked review items; survives background re-renders
const CHECKS = {
  q: [['तथ्य स्रोत से मिलाए गए हैं', 'Facts checked against the source'], ['केवल एक विकल्प सही है और भाषा (हिंदी/English) शुद्ध है', 'Only one option is right and the Hindi/English is correct'], ['व्याख्या सही और पूरी है', 'The explanation is right and complete']],
  news: [['तथ्य और तारीख़ स्रोत से मिलाए गए हैं', 'Facts and date checked against the source'], ['शीर्षक और सारांश स्पष्ट हैं', 'Title and summary are clear'], ['स्रोत का नाम/लिंक सही है', 'Source name/link is correct']],
  day: [['तारीख़ और इतिहास सही है', 'Date and history are correct'], ['तथ्य किसी विश्वसनीय स्रोत से मिलाए गए हैं', 'Facts checked against a reliable source'], ['भाषा शुद्ध और स्पष्ट है', 'Language is correct and clear']],
};
const enBlock = (title, body) => `<div class="qprev-en"><span class="tag">EN</span><b>${esc(title)}</b>${body}</div>`;
const noEn = () => `<span class="small muted">${L('अंग्रेज़ी संस्करण नहीं है — अंग्रेज़ी में हिंदी दिखेगी।', 'No English version: English users will see the Hindi text.')}</span>`;
function draftPreview(d) {
  const x = d.data || {};
  const facts = f => (Array.isArray(f) && f.length ? `<ul class="small" style="margin:0;padding-left:1.2em">${f.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '');
  if (d.type === 'q') return `${qPreview(x)}<span class="small muted">${esc(subjName(x.s))}${x.t ? ' · ' + esc(x.t) : ''}${x.n && M().newsById.get(x.n) ? ` · ${L('ख़बर', 'News')}: ${esc(nT(M().newsById.get(x.n)))}` : ''}</span>`;
  if (d.type === 'news') return `<div class="qprev"><span><span class="badge" style="--c2:${catOf(x.cat).c2}">${esc(catLabel(x.cat))}</span> <span class="small muted">${x.date ? fmtDate(x.date) : ''}</span></span><b>${esc(x.title)}</b><span>${esc(x.summary)}</span>${facts(x.facts)}${x.source && x.source.name ? `<span class="small muted">${L('स्रोत', 'Source')}: ${esc(x.source.name)}${safeUrl(x.source.url) ? ` · <a href="${esc(safeUrl(x.source.url))}" target="_blank" rel="noopener noreferrer">${L('लिंक', 'link')} ${ic('external')}</a>` : ''}</span>` : ''}
    ${x.en && x.en.title ? enBlock(x.en.title, `<span>${esc(x.en.summary || '')}</span>${facts(x.en.facts)}`) : noEn()}</div>`;
  if (d.type === 'day') return `<div class="qprev"><span><span class="badge" style="--c2:${kindOf(x.k).c}">${esc(kindLabel(x.k))}</span> <span class="small muted">${x.md ? fmtMD(x.md) : ''}</span></span><b>${esc(x.t)}</b><span>${esc(x.h)}</span>${x.o ? `<span class="small">${L('उद्देश्य', 'Purpose')}: ${esc(x.o)}</span>` : ''}${facts(x.f)}
    ${x.en && x.en.t ? enBlock(x.en.t, `<span>${esc(x.en.h || '')}</span>${x.en.o ? `<span class="small">${esc(x.en.o)}</span>` : ''}${facts(x.en.f)}`) : noEn()}</div>`;
  return '';
}
function vAdminReview() {
  if (!P.isAdmin) return vNoAdmin();
  const drafts = C.drafts.filter(d => d.status !== 'approved').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const reports = C.reports.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const dl = drafts.map(d => {
    const base = d.type === 'q' && C.base.q.some(b => b.id === (d.data || {}).id);
    const checks = CHECKS[d.type] || CHECKS.q;
    return `<article class="card draft">
    <div class="draft-head"><span class="tag ${d.origin === 'ai' ? 'tag-ai' : ''}">${d.origin === 'ai' ? 'AI' : L('मैनुअल', 'Manual')}</span><span class="tag">${typeLabel(d.type)}</span>${base ? `<span class="tag">${L('मूल प्रश्न में संपादन', 'Edit of a built-in question')}</span>` : ''}${d.note && !base ? `<span class="tag">${esc(d.note)}</span>` : ''}<span class="small muted">${relTime(d.createdAt)}</span></div>
    ${draftPreview(d)}
    ${d.source ? `<details><summary class="small" style="cursor:pointer;font-weight:700;color:var(--brand)">${L('स्रोत पाठ देखें', 'Show source text')}</summary><p class="small" style="white-space:pre-wrap;margin:6px 0 0">${esc(d.source)}</p></details>` : ''}
    <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:8px"><legend class="small muted" style="padding:0;margin-bottom:6px">${L('समीक्षा सूची — सभी पर निशान लगाने के बाद ही स्वीकृति', 'Review checklist: tick every item to approve')}</legend>${checks.map((c, i) => `<label class="check"><input type="checkbox" data-chk="${esc(d.id)}" data-ci="${i}" ${(reviewChecks[d.id] || [])[i] ? 'checked' : ''}> ${L(c[0], c[1])}</label>`).join('')}</fieldset>
    <div class="btnrow"><button class="btn btn-sm btn-cta" id="ap-${esc(d.id)}" data-act="draft-approve" data-id="${esc(d.id)}" ${checks.every((_, i) => (reviewChecks[d.id] || [])[i]) ? '' : 'disabled'}>${ic('check')} ${L('स्वीकृत करें', 'Approve')}</button><button class="btn btn-sm btn-outline" data-act="draft-edit" data-id="${esc(d.id)}">${ic('pencil')} ${L('संपादित करें', 'Edit')}</button><button class="btn btn-sm btn-danger" data-act="draft-reject" data-id="${esc(d.id)}">${ic('trash')} ${L('अस्वीकार', 'Reject')}</button></div>
  </article>`;
  }).join('');
  const rl = reports.map(r => {
    const q = M().byId.get(r.qid);
    return `<article class="card draft"><div class="draft-head"><span class="tag" style="background:var(--bad-soft);color:var(--bad)">${esc(r.reason)}</span><span class="small muted">${relTime(r.at)}</span></div><b>${esc(q ? q.q : r.qtext)}</b>${q ? `<span class="small">${L('उत्तर', 'Answer')}: <span class="ans-ok">${esc(q.o[q.a])}</span></span>` : `<span class="small muted">${L('यह प्रश्न अब उपलब्ध नहीं है।', 'This question is no longer available.')}</span>`}${r.note ? `<p class="small" style="margin:0">${L('विद्यार्थी की टिप्पणी', 'Student\'s note')}: ${esc(r.note)}</p>` : ''}<div class="btnrow">${q && !q.gen ? `<button class="btn btn-sm btn-outline" data-act="bank-edit" data-id="${esc(q.id)}">${ic('pencil')} ${L('प्रश्न सुधारें', 'Fix question')}</button>` : ''}<button class="btn btn-sm btn-cta" data-act="report-resolve" data-id="${esc(r.id)}" data-uid="${esc(r.uid)}">${ic('check')} ${L('हल हो गया', 'Resolved')}</button></div></article>`;
  }).join('');
  return `${adminBar(L('सामग्री की जाँच करें', 'Review content'))}
<main class="page gutter">
  ${cmsNote()}
  <div class="seg" role="group" aria-label="${L('जाँच प्रकार', 'Review type')}"><button data-act="review-tab" data-v="drafts" aria-pressed="${reviewTab === 'drafts'}">${L('ड्राफ़्ट', 'Drafts')} (${drafts.length})</button><button data-act="review-tab" data-v="reports" aria-pressed="${reviewTab === 'reports'}">${L('त्रुटि रिपोर्ट', 'Error reports')} (${reports.length})</button></div>
  ${reviewTab === 'drafts'
    ? (dl || `<div class="card">${emptyState('shield', L('समीक्षा के लिए कुछ बाकी नहीं', 'Nothing left to review'), L('नए प्रश्न "AI से प्रश्न बनवाएँ" या "GK प्रश्न बैंक" से जोड़ें।', 'Add new questions with "Generate questions with AI" or the "GK question bank".'))}<a class="btn btn-brand btn-block" href="#admin-ai">${ic('sparkles')} ${L('AI से प्रश्न बनवाएँ', 'Generate questions with AI')}</a></div>`)
    : (rl || `<div class="card">${emptyState('flag', L('कोई त्रुटि रिपोर्ट नहीं', 'No error reports'), L('विद्यार्थी "त्रुटि बताएँ" से जो रिपोर्ट भेजेंगे, वे यहाँ दिखेंगी।', 'Reports students send with "Report error" appear here.'))}</div>`)}
</main>`;
}
function vAdminPublish() {
  if (!P.isAdmin) return vNoAdmin();
  const approved = C.drafts.filter(d => d.status === 'approved').sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
  const live = [...C.pub.q.map(x => ({ ...x, _c: 'q' })), ...C.pub.news.map(x => ({ ...x, _c: 'news' })), ...C.pub.days.map(x => ({ ...x, _c: 'days' }))].sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)).slice(0, 25);
  const label = x => x.hidden ? `${L('छिपाया गया', 'Hidden')}: ${esc(x.id)}` : x._c === 'q' ? esc(x.q) : x._c === 'news' ? esc(x.title) : esc(x.t);
  const t = todayISO();
  return `${adminBar(L('प्रकाशित करें', 'Publish'))}
<main class="page gutter">
  ${cmsNote()}
  ${approved.length ? `<form class="card" data-form="publish" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('send')} ${L('प्रकाशन हेतु स्वीकृत', 'Approved for publishing')} (${approved.length})</h2>
    ${approved.map(d => `<label class="check"><input type="checkbox" name="pub" value="${esc(d.id)}" data-change="pub-pick" ${pubForm.skip.has(d.id) ? '' : 'checked'}> <span><span class="tag">${typeLabel(d.type)}</span> ${esc(d.type === 'q' ? d.data.q : d.type === 'news' ? d.data.title : d.data.t)}</span></label>`).join('')}
    <div class="field"><label for="pub-date">${L('कब से दिखाएँ', 'Show from')}</label><input class="input" type="date" id="pub-date" data-bind="pubForm.date" value="${pubForm.date && pubForm.date >= t ? pubForm.date : t}" min="${t}"></div>
    <button class="btn btn-cta" type="submit">${ic('rocket')} ${L('चुनी हुई सामग्री प्रकाशित करें', 'Publish the selected content')}</button>
  </form>` : `<div class="card">${emptyState('send', L('प्रकाशन के लिए कुछ स्वीकृत नहीं है', 'Nothing is approved for publishing'), L('पहले "सामग्री की जाँच करें" में ड्राफ़्ट स्वीकृत करें।', 'First approve drafts in "Review content".'))}<a class="btn btn-outline btn-block" href="#admin-review">${ic('shield')} ${L('सामग्री की जाँच करें', 'Review content')}</a></div>`}
  <section style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title">${ic('rocket')} ${L('हाल में प्रकाशित (लाइव)', 'Recently published (live)')}</h2>
  ${live.length ? `<div class="list">${live.map(x => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:.98rem">${label(x)}</span><span class="row-sub">${typeLabel(x._c)} · ${x.publishAt && x.publishAt > t ? L(`${fmtDate(x.publishAt, false)} से दिखेगा`, `visible from ${fmtDate(x.publishAt, false)}`) : relTime(x.publishedAt)}</span></span><button class="iconbtn" style="color:var(--bad)" data-act="unpublish-ask" data-c="${x._c}" data-id="${esc(x.id)}" aria-label="${L('हटाएँ', 'Remove')}">${ic('trash')}</button></div>`).join('')}</div>` : `<div class="card">${emptyState('rocket', L('अभी तक कुछ प्रकाशित नहीं किया गया', 'Nothing published yet'), L('ऐप की मूल सामग्री हमेशा उपलब्ध रहती है; यहाँ केवल नई प्रकाशित सामग्री दिखती है।', 'The built-in content is always available; only newly published content appears here.'))}</div>`}
  </section>
</main>`;
}
const bankState = { subj: '', term: '', limit: 40 };
const pubForm = { date: '', skip: new Set() }; // unticked approved items + chosen date
function bankListHtml() {
  const m = M(), t = bankState.term.trim().toLowerCase();
  const hay = q => (q.q + ' ' + q.o.join(' ') + (q.en ? ' ' + (q.en.q || '') + ' ' + (q.en.o || []).join(' ') : '')).toLowerCase();
  const all = m.qs.filter(q => (!bankState.subj || q.s === bankState.subj) && (!t || hay(q).includes(t)));
  const list = all.slice(0, bankState.limit);
  const tag = q => q.src === 'base' ? `<span class="tag">${L('मूल', 'Built-in')}</span>` : q.src === 'edited' ? `<span class="tag tag-live">${L('संपादित', 'Edited')}</span>` : `<span class="tag tag-live">${L('लाइव', 'Live')}</span>`;
  const del = q => q.src === 'base' ? L('छिपाएँ', 'Hide') : q.src === 'edited' ? L('मूल पर लौटाएँ', 'Restore original') : L('हटाएँ', 'Remove');
  const enTag = q => (q.en && q.en.q ? '<span class="tag">EN ✓</span>' : `<span class="tag tag-warn">${L('EN नहीं', 'No EN')}</span>`);
  return `<p class="small muted" style="margin:0">${L(`${all.length} प्रश्न`, `${all.length} questions`)}${bankState.subj ? '' : L(` · इनके अलावा ${m.dayQs.length} प्रश्न "महत्वपूर्ण दिवस" कैलेंडर से अपने-आप बनते हैं`, ` · plus ${m.dayQs.length} questions made automatically from the important-days calendar`)}</p>
  <div class="list">${list.map(q => `<div class="review-item"><div class="draft-head">${tag(q)}${enTag(q)}<span class="small muted">${esc(subjName(q.s))}${q.t ? ' · ' + esc(qTopic(q)) : ''}</span></div><b>${esc(qT(q))}</b><span class="ans">${L('उत्तर', 'Answer')}: <span class="ans-ok">${esc(qO(q)[q.a])}</span></span><div class="btnrow" style="gap:14px"><button class="link" data-act="bank-edit" data-id="${esc(q.id)}">${ic('pencil')} ${L('संपादित करें', 'Edit')}</button><button class="link" style="color:var(--bad)" data-act="bank-remove" data-id="${esc(q.id)}">${ic('trash')} ${del(q)}</button></div></div>`).join('') || emptyState('search', L('कोई प्रश्न नहीं मिला', 'No questions found'), '')}</div>
  ${all.length > list.length ? `<button class="btn btn-outline" data-act="bank-more">${L('और दिखाएँ', 'Show more')} (${all.length - list.length})</button>` : ''}`;
}
function vAdminBank() {
  if (!P.isAdmin) return vNoAdmin();
  return `${adminBar(L('GK प्रश्न बैंक', 'GK question bank'))}
<main class="page gutter">
  ${cmsNote()}
  <button class="btn btn-brand" data-act="bank-new">${ic('plus')} ${L('नया प्रश्न जोड़ें', 'Add a new question')}</button>
  <div class="search">${ic('search')}<input id="bank-search" type="search" placeholder="${L('प्रश्न या विकल्प खोजें', 'Search questions or options')}" value="${esc(bankState.term)}" autocomplete="off" aria-label="${L('प्रश्न बैंक में खोजें', 'Search the question bank')}"></div>
  <div class="chips" role="group" aria-label="${L('विषय', 'Subject')}"><button class="chip" data-act="bank-subj" data-v="" aria-pressed="${!bankState.subj}">${L('सभी', 'All')}</button>${SUBJECTS.filter(s => s.k !== 'days').map(s => `<button class="chip" data-act="bank-subj" data-v="${s.k}" aria-pressed="${bankState.subj === s.k}">${subjName(s.k)}</button>`).join('')}</div>
  <div id="bank-list" style="display:flex;flex-direction:column;gap:12px">${bankListHtml()}</div>
</main>`;
}
const newsForm = { title: '', cat: CATS[0].k, date: '', summary: '', facts: '', srcName: '', srcUrl: '', raw: '', enTitle: '', enSummary: '', enFacts: '' };
let newsAI = { status: 'idle', err: '' };
const optional = () => `<span class="muted small">(${L('वैकल्पिक', 'optional')})</span>`;
function newsFields(p, v) {
  const b = k => (p === 'nf' ? `data-bind="newsForm.${k}"` : '');
  const en = v.en || {};
  const enV = (k, ek) => (v[k] != null ? v[k] : en[ek] != null ? en[ek] : '');
  const enFacts = v.enFacts != null ? v.enFacts : Array.isArray(en.facts) ? en.facts.join('\n') : '';
  const hasEn = !!(enV('enTitle', 'title') || enV('enSummary', 'summary'));
  return `<div class="field"><label for="${p}-title">${L('शीर्षक', 'Title')} (हिंदी)</label><input class="input" id="${p}-title" ${b('title')} value="${esc(v.title || '')}" maxlength="120"></div>
  <div class="grid2"><div class="field"><label for="${p}-cat">${L('श्रेणी', 'Category')}</label><select class="select" id="${p}-cat" ${b('cat')}>${CATS.map(c => `<option value="${esc(c.k)}" ${c.k === v.cat ? 'selected' : ''}>${esc(catLabel(c.k))}</option>`).join('')}</select></div>
  <div class="field"><label for="${p}-date">${L('तारीख़', 'Date')}</label><input class="input" type="date" id="${p}-date" ${b('date')} value="${esc(v.date || todayISO())}"></div></div>
  <div class="field"><label for="${p}-summary">${L('सारांश (2–3 वाक्य)', 'Summary (2–3 sentences)')} (हिंदी)</label><textarea class="textarea" id="${p}-summary" ${b('summary')} rows="4">${esc(v.summary || '')}</textarea></div>
  <div class="field"><label for="${p}-facts">${L('परीक्षा के लिए मुख्य तथ्य', 'Key exam facts')} <span class="muted small">(${L('हर पंक्ति में एक', 'one per line')})</span></label><textarea class="textarea" id="${p}-facts" ${b('facts')} rows="4">${esc(Array.isArray(v.facts) ? v.facts.join('\n') : v.facts || '')}</textarea></div>
  <div class="grid2"><div class="field"><label for="${p}-srcname">${L('स्रोत का नाम', 'Source name')}</label><input class="input" id="${p}-srcname" ${b('srcName')} value="${esc(v.srcName ?? (v.source && v.source.name) ?? '')}" placeholder="${L('जैसे: PIB', 'e.g. PIB')}"></div>
  <div class="field"><label for="${p}-srcurl">${L('स्रोत लिंक', 'Source link')}</label><input class="input" type="url" id="${p}-srcurl" ${b('srcUrl')} value="${esc(v.srcUrl ?? (v.source && v.source.url) ?? '')}" placeholder="https://"></div></div>
  <details class="en-fields" ${hasEn ? 'open' : ''}><summary>${ic('languages')} English ${optional()}</summary>
    <div class="field"><label for="${p}-entitle">Title (English)</label><input class="input" id="${p}-entitle" ${b('enTitle')} value="${esc(enV('enTitle', 'title'))}" maxlength="140" lang="en"></div>
    <div class="field"><label for="${p}-ensummary">Summary (English)</label><textarea class="textarea" id="${p}-ensummary" ${b('enSummary')} rows="3" lang="en">${esc(enV('enSummary', 'summary'))}</textarea></div>
    <div class="field"><label for="${p}-enfacts">Key facts (English, one per line)</label><textarea class="textarea" id="${p}-enfacts" ${b('enFacts')} rows="3" lang="en">${esc(enFacts)}</textarea></div>
  </details>`;
}
function readNews(f, p) {
  const g = k => ((f.querySelector(`#${p}-${k}`) || {}).value || '').trim();
  const lines = k => g(k).split('\n').map(s => s.trim()).filter(Boolean);
  const out = { title: g('title'), cat: g('cat'), date: g('date'), summary: g('summary'), facts: lines('facts'), source: { name: g('srcname'), url: g('srcurl') } };
  const en = { title: g('entitle'), summary: g('ensummary'), facts: lines('enfacts') };
  if (en.title || en.summary || en.facts.length) out.en = en;
  return out;
}
function newsError(n) {
  if (n.title.length < 8) return L('शीर्षक कम से कम 8 अक्षरों का लिखें।', 'Write a title of at least 8 characters.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) return L('सही तारीख़ चुनें।', 'Choose a valid date.');
  if (n.summary.length < 20) return L('सारांश थोड़ा विस्तार से लिखें।', 'Write a slightly longer summary.');
  if (n.source.url && !safeUrl(n.source.url)) return L('स्रोत लिंक https:// से शुरू होना चाहिए।', 'The source link must start with https://');
  if (n.en && (!n.en.title || !n.en.summary)) return L('अंग्रेज़ी में शीर्षक और सारांश दोनों लिखें, या अंग्रेज़ी भाग खाली छोड़ें।', 'Write both the English title and summary, or leave the English part empty.');
  return '';
}
function vAdminNews() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M();
  return `${adminBar(L('समाचार प्रबंधन', 'Manage news'))}
<main class="page gutter">
  ${cmsNote()}
  <form class="card" data-form="news-new" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('plus')} ${L('नया समाचार जोड़ें', 'Add news')}</h2>
    ${AI.available() ? `<details ${newsForm.raw ? 'open' : ''}><summary style="cursor:pointer;font-weight:700;color:var(--brand)">${ic('sparkles')} ${L('मूल लेख से AI द्वारा भरें (हिंदी + English)', 'Fill from the original article with AI (Hindi + English)')}</summary><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><textarea class="textarea" id="nf-raw" data-bind="newsForm.raw" rows="5" placeholder="${L('PIB/अख़बार का मूल समाचार यहाँ पेस्ट करें', 'Paste the original PIB/newspaper story here')}">${esc(newsForm.raw)}</textarea><button type="button" class="btn btn-sm btn-brand" data-act="news-ai" ${newsAI.status === 'loading' ? 'disabled' : ''}>${ic('sparkles')} ${newsAI.status === 'loading' ? L('भर रहा है…', 'Filling…') : L('AI से भरें', 'Fill with AI')}</button>${newsAI.err ? `<p class="small" style="margin:0;color:var(--bad)">${esc(newsAI.err)}</p>` : ''}</div></details>` : ''}
    ${newsFields('nf', newsForm)}
    <button class="btn btn-cta" type="submit">${ic('send')} ${L('समीक्षा के लिए भेजें', 'Send for review')}</button>
  </form>
  <section style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title">${ic('newspaper')} ${L('सभी समाचार', 'All news')} (${m.news.length})</h2>
  <div class="list">${m.news.slice(0, 30).map(n => `<div class="review-item"><div class="draft-head"><span class="badge" style="--c2:${catOf(n.cat).c2}">${esc(catLabel(n.cat))}</span><span class="small muted">${fmtDate(n.date)}</span>${n.src === 'base' ? `<span class="tag">${L('मूल', 'Built-in')}</span>` : `<span class="tag tag-live">${L('लाइव', 'Live')}</span>`}${n.en && n.en.title ? '<span class="tag">EN ✓</span>' : ''}</div><b>${esc(nT(n))}</b><div class="btnrow" style="gap:14px"><button class="link" data-act="news-to-ai" data-id="${esc(n.id)}">${ic('sparkles')} ${L('इससे AI प्रश्न', 'AI questions from this')}</button>${n.src === 'base' ? '' : `<button class="link" style="color:var(--bad)" data-act="unpublish-ask" data-c="news" data-id="${esc(n.id)}">${ic('trash')} ${L('हटाएँ', 'Remove')}</button>`}</div></div>`).join('')}</div></section>
</main>`;
}
const dayForm = { date: todayISO(), t: '', k: 'राष्ट्रीय', y: '', h: '', o: '', f: '', enT: '', enH: '', enO: '', enF: '' };
function dayFields(p, v) {
  const b = k => (p === 'df' ? `data-bind="dayForm.${k}"` : '');
  const dateVal = v.date || (v.md ? `${parseISO(todayISO()).getFullYear()}-${v.md}` : todayISO());
  const en = v.en || {};
  const enV = (k, ek) => (v[k] != null ? v[k] : en[ek] != null ? en[ek] : '');
  const enF = v.enF != null ? v.enF : Array.isArray(en.f) ? en.f.join('\n') : '';
  return `<div class="grid2"><div class="field"><label for="${p}-date">${L('तारीख़', 'Date')}</label><input class="input" type="date" id="${p}-date" ${b('date')} value="${esc(dateVal)}"></div>
  <div class="field"><label for="${p}-k">${L('प्रकार', 'Type')}</label><select class="select" id="${p}-k" ${b('k')}>${Object.keys(KINDS).map(k => `<option value="${esc(k)}" ${k === v.k ? 'selected' : ''}>${esc(kindLabel(k))}</option>`).join('')}</select></div></div>
  <div class="field"><label for="${p}-t">${L('दिवस का नाम', 'Name of the day')} (हिंदी)</label><input class="input" id="${p}-t" ${b('t')} value="${esc(v.t || '')}" maxlength="90"></div>
  <div class="field"><label for="${p}-y">${L('शुरुआत / घटना का वर्ष', 'Year started / of the event')} ${optional()}</label><input class="input" id="${p}-y" ${b('y')} inputmode="numeric" value="${esc(v.y || '')}" maxlength="4"></div>
  <div class="field"><label for="${p}-h">${L('शुरुआत का इतिहास', 'History')} (हिंदी)</label><textarea class="textarea" id="${p}-h" ${b('h')} rows="3">${esc(v.h || '')}</textarea></div>
  <div class="field"><label for="${p}-o">${L('उद्देश्य', 'Purpose')} ${optional()}</label><textarea class="textarea" id="${p}-o" ${b('o')} rows="2" style="min-height:70px">${esc(v.o || '')}</textarea></div>
  <div class="field"><label for="${p}-f">${L('महत्वपूर्ण तथ्य', 'Key facts')} <span class="muted small">(${L('हर पंक्ति में एक', 'one per line')})</span></label><textarea class="textarea" id="${p}-f" ${b('f')} rows="3">${esc(Array.isArray(v.f) ? v.f.join('\n') : v.f || '')}</textarea></div>
  <details class="en-fields" ${enV('enT', 't') ? 'open' : ''}><summary>${ic('languages')} English ${optional()}</summary>
    <div class="field"><label for="${p}-ent">Name of the day (English)</label><input class="input" id="${p}-ent" ${b('enT')} value="${esc(enV('enT', 't'))}" maxlength="120" lang="en"></div>
    <div class="field"><label for="${p}-enh">History (English)</label><textarea class="textarea" id="${p}-enh" ${b('enH')} rows="3" lang="en">${esc(enV('enH', 'h'))}</textarea></div>
    <div class="field"><label for="${p}-eno">Purpose (English)</label><textarea class="textarea" id="${p}-eno" ${b('enO')} rows="2" style="min-height:70px" lang="en">${esc(enV('enO', 'o'))}</textarea></div>
    <div class="field"><label for="${p}-enf">Key facts (English, one per line)</label><textarea class="textarea" id="${p}-enf" ${b('enF')} rows="3" lang="en">${esc(enF)}</textarea></div>
  </details>`;
}
function readDay(f, p) {
  const g = k => ((f.querySelector(`#${p}-${k}`) || {}).value || '').trim();
  const lines = k => g(k).split('\n').map(s => s.trim()).filter(Boolean);
  const date = g('date');
  const y = parseInt(g('y'), 10);
  const out = { md: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5) : '', t: g('t'), k: g('k'), y: Number.isFinite(y) ? y : undefined, h: g('h'), o: g('o') || undefined, f: lines('f') };
  const en = { t: g('ent'), h: g('enh'), o: g('eno') || undefined, f: lines('enf') };
  if (en.t || en.h || en.o || en.f.length) out.en = en;
  return out;
}
function dayError(d) {
  if (!d.md) return L('सही तारीख़ चुनें।', 'Choose a valid date.');
  if (d.t.length < 4) return L('दिवस का नाम लिखें।', 'Write the name of the day.');
  if (d.h.length < 20) return L('शुरुआत का इतिहास थोड़ा विस्तार से लिखें।', 'Write a slightly longer history.');
  if (d.en && (!d.en.t || !d.en.h)) return L('अंग्रेज़ी में नाम और इतिहास दोनों लिखें, या अंग्रेज़ी भाग खाली छोड़ें।', 'Write both the English name and history, or leave the English part empty.');
  return '';
}
function vAdminDays() {
  if (!P.isAdmin) return vNoAdmin();
  const t = todayISO();
  const todays = (M().daysByMd[t.slice(5)] || []).map(e => ({ ...e, iso: t }));
  const up = [...todays, ...upcomingDays(t, 14)];
  return `${adminBar(L('आज का दिन – प्रबंधन', 'Manage important days'))}
<main class="page gutter">
  ${cmsNote()}
  <section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1.05rem">${ic('calendar')} ${L('आज और आने वाले दिवस', 'Today and coming up')}</h2>
  ${up.map(e => `<div class="upc"><span class="d"><b class="tnum">${parseISO(e.iso).getDate()}</b><span>${monthShort(parseISO(e.iso).getMonth())}</span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(dT(e))}</span><span class="row-sub">${esc(kindLabel(e.k))} · ${e.src === 'base' ? L('मूल', 'Built-in') : L('लाइव', 'Live')}</span></span><button class="link" data-act="day-to-ai" data-id="${esc(e.id)}">${ic('sparkles')} ${L('AI प्रश्न', 'AI questions')}</button></div>`).join('')}</section>
  <form class="card" data-form="day-new" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('plus')} ${L('नया दिवस जोड़ें', 'Add an important day')}</h2>
    ${dayFields('df', dayForm)}
    <button class="btn btn-cta" type="submit">${ic('send')} ${L('समीक्षा के लिए भेजें', 'Send for review')}</button>
  </form>
</main>`;
}

// ── rewards: prizes, winner announcements, leaderboard moderation ──
const prizeForm = { weekPrize: null, weekPrizeEn: null, monthPrize: null, monthPrizeEn: null };
function announceCard(kind) {
  const key = LB.announceKey(kind);
  const board = LB.board(kind === 'week' ? 'lastweek' : 'lastmonth').filter(r => r.p > 0 && (P.demo || !r.sample));
  const done = LB.winners.find(w => w.kind === kind && w.key === key);
  const label = kind === 'week' ? `${L('पिछला सप्ताह', 'Last week')}: ${fmtWeek(key)}` : `${L('पिछला महीना', 'Last month')}: ${fmtMonth(key)}`;
  return `<article class="card win-card">
    <div class="sec-head"><h3 class="sec-title" style="font-size:1rem">${ic(kind === 'week' ? 'calendar' : 'award')} ${label}</h3>${done ? `<span class="tag tag-live">${L('घोषित', 'Announced')}</span>` : ''}</div>
    ${board.length ? `<ol class="win-list">${board.slice(0, 3).map((x, i) => `<li${x.me ? ' class="me"' : ''}><span class="lrank tnum">${x.rank}</span><span class="wmedal" style="--medal:${MEDALS[i]}">${ic('medal')}</span><span class="lname">${esc(x.n)}</span><span class="lpts tnum">${fmtNum(x.p)}</span></li>`).join('')}</ol>` : `<p class="small muted" style="margin:0">${L('इस अवधि में किसी को पॉइंट्स नहीं मिले।', 'Nobody earned points in this period.')}</p>`}
    ${done ? `<p class="small muted" style="margin:0">${L('घोषित', 'Announced')} ${relTime(done.at)} · ${L(`टॉप ${done.top.length} सहेजे गए`, `top ${done.top.length} saved`)}</p>` : ''}
    <button class="btn ${done ? 'btn-outline' : 'btn-cta'}" data-act="announce-ask" data-v="${kind}" ${board.length ? '' : 'disabled'}>${ic('award')} ${done ? L('फिर से घोषित करें (अपडेट)', 'Announce again (update)') : L('विजेता घोषित करें', 'Announce winners')}</button>
  </article>`;
}
function vAdminRewards() {
  if (!P.isAdmin) return vNoAdmin();
  const s = LB.settings, f = k => (prizeForm[k] ?? s[k] ?? '');
  const pool = LB.pool().filter(e => e.u !== LB.myId());
  const visible = pool.filter(e => !LB.hidden.includes(e.u)).sort((a, b) => (b.tp || 0) - (a.tp || 0)).slice(0, 40);
  const hidden = LB.hidden.map(u => pool.find(e => e.u === u) || { u, n: '' });
  const week = LB.board('week').filter(r => r.p > 0);
  return `${adminBar(L('पुरस्कार और लीडरबोर्ड', 'Rewards & leaderboard'))}
<main class="page gutter">
  ${LOCAL() ? `<div class="note">${ic('info')}<div>${P.demo ? L('<b>टेस्ट संस्करण:</b> इनाम, विजेता और छिपाए गए नाम केवल इसी ब्राउज़र में सहेजे जाते हैं। सूची में नमूना विद्यार्थी हैं।', '<b>Test build:</b> prizes, winners and hidden names are saved only in this browser. The list shows sample students.') : L('<b>ऑफ़लाइन संस्करण:</b> यहाँ सिर्फ़ इसी डिवाइस का डेटा है। सभी विद्यार्थियों की रैंकिंग ऑनलाइन संस्करण में बनती है।', '<b>Offline copy:</b> only this device\'s data is here. Rankings of all students are built in the online version.')}</div></div>` : ''}
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic('trophy')} ${L('इस सप्ताह', 'This week')}</h2><a class="link" href="#leaders">${L('लीडरबोर्ड देखें', 'Open leaderboard')} ${ic('chev-right')}</a></div>
    <div class="stats stats-3"><div class="stat"><b>${week.length}</b><span>${L('रैंक में विद्यार्थी', 'Students ranked')}</span></div><div class="stat"><b>${fmtNum(week[0] ? week[0].p : 0)}</b><span>${L('सबसे ज़्यादा पॉइंट्स', 'Top points')}</span></div><div class="stat"><b class="tnum" style="font-size:1rem">${timeLeft(LB.msToWeekEnd())}</b><span>${L('बाकी समय', 'Time left')}</span></div></div>
  </section>
  <form class="card" data-form="prizes" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('gift')} ${L('इनाम', 'Prizes')}</h2>
    <p class="small muted" style="margin:0">${L('यह टेक्स्ट लीडरबोर्ड पर सभी विद्यार्थियों को दिखेगा। खाली छोड़ने पर कोई इनाम नहीं दिखेगा।', 'This text is shown to every student on the leaderboard. Leave it empty to show no prize.')}</p>
    <div class="field"><label for="pz-week">${L('साप्ताहिक इनाम (हिंदी)', 'Weekly prize (Hindi)')}</label><input class="input" id="pz-week" data-bind="prizeForm.weekPrize" value="${esc(f('weekPrize'))}" maxlength="120" placeholder="${L('जैसे: टॉप 3 को ₹100 का Paytm कैशबैक', 'e.g. टॉप 3 को ₹100 का Paytm कैशबैक')}"></div>
    <div class="field"><label for="pz-week-en">${L('साप्ताहिक इनाम (English)', 'Weekly prize (English)')}</label><input class="input" id="pz-week-en" data-bind="prizeForm.weekPrizeEn" value="${esc(f('weekPrizeEn'))}" maxlength="120" lang="en" placeholder="e.g. ₹100 Paytm cashback for the top 3"></div>
    <div class="field"><label for="pz-month">${L('मासिक इनाम (हिंदी)', 'Monthly prize (Hindi)')}</label><input class="input" id="pz-month" data-bind="prizeForm.monthPrize" value="${esc(f('monthPrize'))}" maxlength="120" placeholder="${L('जैसे: टॉप 1 को मुफ़्त टेस्ट सीरीज़', 'e.g. टॉप 1 को मुफ़्त टेस्ट सीरीज़')}"></div>
    <div class="field"><label for="pz-month-en">${L('मासिक इनाम (English)', 'Monthly prize (English)')}</label><input class="input" id="pz-month-en" data-bind="prizeForm.monthPrizeEn" value="${esc(f('monthPrizeEn'))}" maxlength="120" lang="en" placeholder="e.g. Free test series for the winner"></div>
    <button class="btn btn-cta" type="submit">${ic('check')} ${L('इनाम सहेजें', 'Save prizes')}</button>
  </form>
  <section style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title">${ic('award')} ${L('विजेता घोषित करें', 'Announce winners')}</h2>
    <p class="small muted" style="margin:0">${L('पिछले सप्ताह/महीने का लीडरबोर्ड अपने-आप बनता है। "घोषित करें" दबाने पर टॉप 10 के नाम और पॉइंट्स "विजेता" टैब में सबको दिखेंगे और विजेताओं को बैज मिलेगा। इनाम देने के लिए विजेताओं से अपने सामान्य माध्यम (जैसे WhatsApp ग्रुप) से संपर्क करें।', 'Last week\'s and last month\'s boards are built automatically. "Announce" shows the top 10 names and points to everyone in the "Winners" tab and gives the winners a badge. Contact the winners through your usual channel (such as a WhatsApp group) to hand out prizes.')}</p>
    ${announceCard('week')}
    ${announceCard('month')}
  </section>
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('shield')} ${L('नाम मॉडरेशन', 'Name moderation')}</h2>
    <p class="small muted" style="margin:0">${L('अनुचित नाम को लीडरबोर्ड से छिपाएँ। छिपाए गए विद्यार्थी के पॉइंट्स बने रहते हैं, सिर्फ़ नाम नहीं दिखता।', 'Hide an inappropriate name from the leaderboard. The student keeps their points; only the name is not shown.')}</p>
    ${visible.length ? `<ul class="mod-list">${visible.map(e => `<li><span class="lname">${esc(LB.display(e))}</span><span class="small muted tnum">${fmtNum(e.tp || 0)}</span><button class="btn btn-sm btn-outline" data-act="lb-mod" data-u="${esc(e.u)}" data-v="1">${ic('lock')} ${L('छिपाएँ', 'Hide')}</button></li>`).join('')}</ul>` : `<p class="small muted" style="margin:0">${L('अभी लीडरबोर्ड पर कोई और विद्यार्थी नहीं है।', 'No other students are on the leaderboard yet.')}</p>`}
    ${hidden.length ? `<h3 class="small" style="margin:6px 0 0;font-weight:800">${L('छिपाए गए', 'Hidden')} (${hidden.length})</h3><ul class="mod-list">${hidden.map(e => `<li><span class="lname">${esc(LB.display(e))}</span><button class="btn btn-sm btn-outline" data-act="lb-mod" data-u="${esc(e.u)}" data-v="0">${ic('rotate')} ${L('फिर दिखाएँ', 'Show again')}</button></li>`).join('')}</ul>` : ''}
  </section>
  <button class="btn btn-outline" data-act="pts-info">${ic('coins')} ${L('पॉइंट्स के नियम देखें', 'See the points rules')}</button>
</main>`;
}

// Question editor (sheet) — used by AI results, review, bank and new questions.
let qEditCb = null;
function openQEditor(init, onSave, title) {
  const q = { s: 'misc', t: '', q: '', o: ['', '', '', ''], a: 0, e: '', d: 1, ...clone(init || {}) };
  const en = q.en && typeof q.en === 'object' ? q.en : { q: '', o: ['', '', '', ''], e: '', t: '' };
  const eo = Array.isArray(en.o) ? en.o : ['', '', '', ''];
  title = title || L('प्रश्न संपादित करें', 'Edit question');
  qEditCb = onSave;
  openSheet(`${sheetHead(title)}<form data-form="qedit" style="display:flex;flex-direction:column;gap:12px">
  <div class="grid2"><div class="field"><label for="qe-s">${L('विषय', 'Subject')}</label><select class="select" id="qe-s">${SUBJECTS.filter(s => s.k !== 'days').map(s => `<option value="${s.k}" ${s.k === q.s ? 'selected' : ''}>${subjName(s.k)}</option>`).join('')}</select></div>
  <div class="field"><label for="qe-d">${L('कठिनाई', 'Difficulty')}</label><select class="select" id="qe-d">${[[1, 'आसान', 'Easy'], [2, 'मध्यम', 'Medium'], [3, 'कठिन', 'Hard']].map(([v, hi, enl]) => `<option value="${v}" ${Number(q.d) === v ? 'selected' : ''}>${L(hi, enl)}</option>`).join('')}</select></div></div>
  <div class="field"><label for="qe-t">${L('उप-विषय', 'Topic')}</label><input class="input" id="qe-t" value="${esc(q.t || '')}" maxlength="40"></div>
  <div class="field"><label for="qe-q">${L('प्रश्न', 'Question')} (हिंदी)</label><textarea class="textarea" id="qe-q" rows="3" style="min-height:80px">${esc(q.q)}</textarea></div>
  <div class="field"><span class="lbl">${L('विकल्प', 'Options')} <span class="muted small">(${L('सही विकल्प चुनें', 'select the right one')})</span></span>${[0, 1, 2, 3].map(i => `<div class="optedit"><input type="radio" name="qe-a" value="${i}" ${q.a === i ? 'checked' : ''} aria-label="${L(`विकल्प ${LETTERS[i]} सही है`, `Option ${LETTERS[i]} is right`)}"><input class="input" id="qe-o${i}" value="${esc(q.o[i] || '')}" placeholder="${L('विकल्प', 'Option')} ${LETTERS[i]}"></div>`).join('')}</div>
  <div class="field"><label for="qe-e">${L('व्याख्या', 'Explanation')}</label><textarea class="textarea" id="qe-e" rows="3" style="min-height:80px">${esc(q.e || '')}</textarea></div>
  <details class="en-fields" ${en.q ? 'open' : ''}><summary>${ic('languages')} English ${optional()}</summary>
    <p class="small muted" style="margin:0">${L('विकल्प उसी क्रम में लिखें — सही उत्तर वही रहेगा जो ऊपर चुना है।', 'Write the options in the same order; the right answer is the one selected above.')}</p>
    <div class="field"><label for="qe-en-q">Question (English)</label><textarea class="textarea" id="qe-en-q" rows="2" style="min-height:70px" lang="en">${esc(en.q || '')}</textarea></div>
    ${[0, 1, 2, 3].map(i => `<div class="field"><label for="qe-en-o${i}" class="small">Option ${LETTERS[i]}</label><input class="input" id="qe-en-o${i}" value="${esc(eo[i] || '')}" lang="en"></div>`).join('')}
    <div class="field"><label for="qe-en-e">Explanation (English)</label><textarea class="textarea" id="qe-en-e" rows="2" style="min-height:70px" lang="en">${esc(en.e || '')}</textarea></div>
    <div class="field"><label for="qe-en-t">Topic (English)</label><input class="input" id="qe-en-t" value="${esc(en.t || '')}" maxlength="40" lang="en"></div>
  </details>
  <p class="small" id="qe-err" style="margin:0;color:var(--bad)" role="alert"></p>
  <button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button></form>`, { label: title });
}
function newsEditorSheet(d) {
  const title = L('समाचार संपादित करें', 'Edit news');
  openSheet(`${sheetHead(title)}<form data-form="news-edit" data-id="${esc(d.id)}" style="display:flex;flex-direction:column;gap:12px">${newsFields('ne', d.data)}<p class="small" id="ne-err" style="margin:0;color:var(--bad)" role="alert"></p><button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button></form>`, { label: title });
}
function dayEditorSheet(d) {
  const title = L('दिवस संपादित करें', 'Edit day');
  openSheet(`${sheetHead(title)}<form data-form="day-edit" data-id="${esc(d.id)}" style="display:flex;flex-direction:column;gap:12px">${dayFields('de', d.data)}<p class="small" id="de-err" style="margin:0;color:var(--bad)" role="alert"></p><button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button></form>`, { label: title });
}
let confirmCb = null;
function confirmSheet(title, text, okLabel, onOk, danger = true) {
  confirmCb = onOk;
  openSheet(`${sheetHead(title)}<div style="margin:0">${text}</div><div class="grid2"><button class="btn btn-grey" data-act="sheet-close">${L('रद्द करें', 'Cancel')}</button><button class="btn ${danger ? 'btn-danger' : 'btn-cta'}" data-act="confirm-ok">${okLabel}</button></div>`, { label: title });
}

