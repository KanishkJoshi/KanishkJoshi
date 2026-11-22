// ───────────────────────────── v3 admin: quality checks, tagging, translations, history, import/export, analytics ─────────────────────────────
const CMSSET = { fourEyes: false };          // pub/settings/items/cms (owner): a second editor must approve
const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const words = s => new Set(norm(s).split(' ').filter(w => w.length > 1));
function similarity(a, b) { const A = words(a), B = words(b); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n); }
// Automated checks run on every question draft before a human sees it. err blocks approval; warn needs attention.
function qualityChecks(d) {
  const x = d.data || {}, out = [], add = (lvl, hi, en) => out.push({ lvl, msg: L(hi, en) });
  if (d.type !== 'q') {
    if (d.type === 'news' && !(x.source && x.source.name)) add('warn', 'स्रोत का नाम नहीं दिया गया।', 'No source name given.');
    if (!x.en || !(x.en.title || x.en.t)) add('warn', 'अंग्रेज़ी संस्करण नहीं है।', 'No English version.');
    if (!out.length) add('ok', 'बुनियादी जाँच ठीक।', 'Basic checks passed.');
    return out;
  }
  const o = Array.isArray(x.o) ? x.o : [];
  if (o.length !== 4 || o.some(s => !String(s).trim())) add('err', 'चार भरे हुए विकल्प चाहिए।', 'Four filled-in options are required.');
  else if (new Set(o.map(norm)).size !== 4) add('err', 'दो विकल्प एक जैसे हैं।', 'Two options are the same.');
  if (!(Number.isInteger(x.a) && x.a >= 0 && x.a <= 3)) add('err', 'सही उत्तर चुना नहीं गया।', 'The correct answer is not set.');
  if (String(x.q || '').trim().length < 12) add('err', 'प्रश्न बहुत छोटा है।', 'The question is too short.');
  if (String(x.e || '').trim().length < 20) add('warn', 'व्याख्या बहुत छोटी है।', 'The explanation is very short.');
  const ans = o[x.a] || '';
  if (ans && x.e && !norm(x.e).includes(norm(ans)) && !(x.en && x.en.e && norm(x.en.e).includes(norm((x.en.o || [])[x.a] || '')))) add('warn', 'व्याख्या में सही उत्तर का ज़िक्र नहीं है — मिलान करें।', 'The explanation does not mention the correct answer — check it.');
  if (d.source && ans && !norm(d.source).includes(norm(ans)) && !norm(d.source).includes(norm((x.en && (x.en.o || [])[x.a]) || '~'))) add('warn', 'सही उत्तर स्रोत पाठ में नहीं मिला — तथ्य जाँचें।', 'The correct answer was not found in the source text — verify the fact.');
  const all = [...M().qs, ...C.drafts.filter(y => y.type === 'q' && y.id !== d.id).map(y => y.data || {})];
  const dup = all.filter(y => y && y.id !== x.id && y.q).map(y => ({ y, s: similarity(x.q, y.q) })).filter(z => z.s >= 0.6).sort((a, b) => b.s - a.s)[0];
  if (dup) add('warn', `संभावित दोहराव (${Math.round(dup.s * 100)}% समान): "${String(dup.y.q).slice(0, 70)}"`, `Possible duplicate (${Math.round(dup.s * 100)}% similar): "${String(dup.y.q).slice(0, 70)}"`);
  if (!x.en || !x.en.q || !Array.isArray(x.en.o) || x.en.o.length !== 4) add('warn', 'अंग्रेज़ी अनुवाद नहीं है।', 'No English translation.');
  if (!x.ch) add('warn', 'अध्याय टैग नहीं है।', 'No chapter tag.');
  const why = Array.isArray(x.why) ? x.why : [];
  if (why.filter((w, i) => i !== x.a && String(w || '').trim()).length < 3) add('warn', 'हर गलत विकल्प के लिए "क्यों गलत" नोट जोड़ें।', 'Add a "why it\'s wrong" note for every wrong option.');
  if (!x.ref && !x.n) add('warn', 'स्रोत/संदर्भ नहीं दिया गया।', 'No source or reference given.');
  if (!out.length) add('ok', 'सभी स्वचालित जाँच ठीक।', 'All automated checks passed.');
  return out;
}
const hasErr = d => qualityChecks(d).some(c => c.lvl === 'err');
const otherEditorNeeded = d => CMSSET.fourEyes && !LOCAL() && d.by && d.by === P.uid;
function qualityHtml(d) {
  const cs = qualityChecks(d);
  return `<div class="ex-sec" style="border-top:1px dashed var(--line)"><h4>${ic('shield')} ${L('स्वचालित जाँच', 'Automated checks')}</h4><ul class="why-list">${cs.map(c => `<li class="${c.lvl === 'ok' ? 'c' : ''}"><span class="key" aria-hidden="true">${c.lvl === 'ok' ? '✓' : c.lvl === 'err' ? '✕' : '!'}</span><span>${esc(c.msg)}</span></li>`).join('')}</ul>
    ${otherEditorNeeded(d) ? `<p class="small" style="margin:0;color:var(--warn)">${ic('users')} ${L('यह ड्राफ़्ट आपने बनाया है — किसी दूसरे संपादक को स्वीकृत करना होगा।', 'You created this draft — another editor must approve it.')}</p>` : ''}</div>`;
}

// Question editor v3: tags (chapter, exams, difficulty), notes for wrong options, background and reference, English.
let qEditCb = null;
function openQEditor(init, onSave, title) {
  const q = { s: 'misc', t: '', q: '', o: ['', '', '', ''], a: 0, e: '', d: 1, ...clone(init || {}) };
  const en = q.en && typeof q.en === 'object' ? q.en : {};
  const eo = Array.isArray(en.o) ? en.o : ['', '', '', ''];
  const why = Array.isArray(q.why) ? q.why : ['', '', '', ''], ewhy = Array.isArray(en.why) ? en.why : ['', '', '', ''];
  const chs = CHAPTERS.filter(c => c.s === q.s);
  const ex = Array.isArray(q.ex) ? q.ex : [];
  title = title || L('प्रश्न संपादित करें', 'Edit question');
  qEditCb = onSave;
  openSheet(`${sheetHead(title)}<form data-form="qedit" style="display:flex;flex-direction:column;gap:12px">
  <div class="grid2"><div class="field"><label for="qe-s">${L('विषय', 'Subject')}</label><select class="select" id="qe-s" data-change="qe-subj">${SUBJECTS.filter(s => s.k !== 'days').map(s => `<option value="${s.k}" ${s.k === q.s ? 'selected' : ''}>${subjName(s.k)}</option>`).join('')}</select></div>
  <div class="field"><label for="qe-d">${L('कठिनाई', 'Difficulty')}</label><select class="select" id="qe-d">${[1, 2, 3].map(v => `<option value="${v}" ${Number(q.d) === v ? 'selected' : ''}>${esc(diffLabel(v))}</option>`).join('')}</select></div></div>
  <div class="grid2"><div class="field"><label for="qe-ch">${L('अध्याय', 'Chapter')}</label><select class="select" id="qe-ch"><option value="">—</option>${chs.map(c => `<option value="${c.id}" ${q.ch === c.id ? 'selected' : ''}>${esc(L(c.hi, c.en))}</option>`).join('')}</select></div>
  <div class="field"><label for="qe-t">${L('उप-विषय', 'Topic')}</label><input class="input" id="qe-t" value="${esc(q.t || '')}" maxlength="40"></div></div>
  <div class="field"><span class="lbl">${L('परीक्षा टैग', 'Exam tags')} <span class="muted small">(${L('खाली = अध्याय के अनुसार', 'empty = from the chapter')})</span></span><div class="chips wrap">${EXAMS.map(e => `<label class="chip"><input type="checkbox" name="qe-ex" value="${e.id}" ${ex.includes(e.id) ? 'checked' : ''} style="accent-color:var(--navy)"> ${esc(L(e.hi, e.en))}</label>`).join('')}</div></div>
  <div class="field"><label for="qe-q">${L('प्रश्न', 'Question')} (हिंदी)</label><textarea class="textarea" id="qe-q" rows="3" style="min-height:80px">${esc(q.q)}</textarea></div>
  <div class="field"><span class="lbl">${L('विकल्प और "क्यों गलत" नोट', 'Options and "why it\'s wrong" notes')} <span class="muted small">(${L('सही विकल्प चुनें', 'select the right one')})</span></span>${[0, 1, 2, 3].map(i => `<div class="optedit"><input type="radio" name="qe-a" value="${i}" ${q.a === i ? 'checked' : ''} aria-label="${L(`विकल्प ${LETTERS[i]} सही है`, `Option ${LETTERS[i]} is right`)}"><input class="input" id="qe-o${i}" value="${esc(q.o[i] || '')}" placeholder="${L('विकल्प', 'Option')} ${LETTERS[i]}"></div><input class="input" id="qe-w${i}" value="${esc(why[i] || '')}" placeholder="${L(`${LETTERS[i]} क्यों गलत है (सही विकल्प के लिए खाली छोड़ें)`, `Why ${LETTERS[i]} is wrong (leave empty for the right one)`)}" style="margin:4px 0 8px 30px;width:calc(100% - 30px);font-size:.9rem">`).join('')}</div>
  <div class="field"><label for="qe-e">${L('व्याख्या', 'Explanation')}</label><textarea class="textarea" id="qe-e" rows="3" style="min-height:80px">${esc(q.e || '')}</textarea></div>
  <div class="field"><label for="qe-ctx">${L('पृष्ठभूमि / जुड़े तथ्य', 'Background / related facts')} ${optional()}</label><textarea class="textarea" id="qe-ctx" rows="2" style="min-height:64px">${esc(q.ctx || '')}</textarea></div>
  <div class="field"><label for="qe-ref">${L('स्रोत / संदर्भ', 'Source / reference')}</label><input class="input" id="qe-ref" value="${esc(q.ref || '')}" placeholder="${L('जैसे: NCERT कक्षा 9 भूगोल – अपवाह', 'e.g. NCERT Class 9 Geography – Drainage')}"></div>
  <details class="en-fields" ${en.q ? 'open' : ''}><summary>${ic('languages')} English ${optional()}</summary>
    <p class="small muted" style="margin:0">${L('विकल्प उसी क्रम में लिखें — सही उत्तर वही रहेगा जो ऊपर चुना है।', 'Write the options in the same order; the right answer is the one selected above.')}</p>
    <div class="field"><label for="qe-en-q">Question (English)</label><textarea class="textarea" id="qe-en-q" rows="2" style="min-height:70px" lang="en">${esc(en.q || '')}</textarea></div>
    ${[0, 1, 2, 3].map(i => `<div class="field"><label for="qe-en-o${i}" class="small">Option ${LETTERS[i]}</label><input class="input" id="qe-en-o${i}" value="${esc(eo[i] || '')}" lang="en"><input class="input" id="qe-en-w${i}" value="${esc(ewhy[i] || '')}" lang="en" placeholder="Why ${LETTERS[i]} is wrong" style="margin-top:4px;font-size:.9rem"></div>`).join('')}
    <div class="field"><label for="qe-en-e">Explanation (English)</label><textarea class="textarea" id="qe-en-e" rows="2" style="min-height:70px" lang="en">${esc(en.e || '')}</textarea></div>
    <div class="field"><label for="qe-en-ctx">Background (English)</label><textarea class="textarea" id="qe-en-ctx" rows="2" style="min-height:64px" lang="en">${esc(en.ctx || '')}</textarea></div>
    <div class="grid2"><div class="field"><label for="qe-en-t">Topic (English)</label><input class="input" id="qe-en-t" value="${esc(en.t || '')}" maxlength="40" lang="en"></div><div class="field"><label for="qe-en-ref">Reference (English)</label><input class="input" id="qe-en-ref" value="${esc(en.ref || '')}" lang="en"></div></div>
  </details>
  <p class="small" id="qe-err" style="margin:0;color:var(--bad)" role="alert"></p>
  <button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button></form>`, { label: title });
}

// Translation queue: content still missing English.
function missingEn() {
  const m = M();
  return [
    ...m.qs.filter(q => !(q.en && q.en.q && Array.isArray(q.en.o) && q.en.o.length === 4)).map(q => ({ kind: 'q', id: q.id, text: q.q })),
    ...m.news.filter(n => !(n.en && n.en.title)).map(n => ({ kind: 'news', id: n.id, text: n.title })),
    ...m.days.filter(d => !(d.en && d.en.t)).map(d => ({ kind: 'day', id: d.id, text: d.t })),
  ];
}
function vAdminTranslate() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M(), miss = missingEn();
  const pctEn = (list, ok) => pct(list.filter(ok).length, list.length);
  const qOk = q => q.en && q.en.q, nOk = n => n.en && n.en.title, dOk = d => d.en && d.en.t;
  return `${adminBar(L('अनुवाद प्रबंधन', 'Translation management'))}
<main class="page gutter">
  ${cmsNote()}
  <div class="stats stats-3"><div class="stat"><b>${pctEn(m.qs, qOk)}%</b><span>${L('प्रश्न', 'Questions')}</span></div><div class="stat"><b>${pctEn(m.news, nOk)}%</b><span>${L('समाचार', 'News')}</span></div><div class="stat"><b>${pctEn(m.days, dOk)}%</b><span>${L('दिवस', 'Days')}</span></div></div>
  <p class="small muted" style="margin:0">${L('अंग्रेज़ी में उपलब्ध सामग्री का प्रतिशत। अनुवाद जोड़ने पर बदलाव समीक्षा के बाद ही प्रकाशित होता है।', 'Share of content available in English. A new translation is published only after review.')}</p>
  <section class="sec"><h2 class="sec-title">${ic('languages')} ${L(`अंग्रेज़ी बाकी (${miss.length})`, `Missing English (${miss.length})`)}</h2>
    <div class="list">${miss.slice(0, 40).map(x => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:.95rem">${esc(String(x.text).slice(0, 90))}</span><span class="row-sub">${typeLabel(x.kind)}</span></span>${x.kind === 'q' ? `<button class="btn btn-sm btn-outline" data-act="bank-edit" data-id="${esc(x.id)}">${ic('pencil')} ${L('अनुवाद', 'Translate')}</button>` : `<span class="small muted">${L('समाचार/दिवस प्रबंधन में', 'In News/Days')}</span>`}</div>`).join('') || `<div class="empty">${ic('check')}<b>${L('सारी सामग्री दोनों भाषाओं में है', 'Everything is available in both languages')}</b></div>`}</div></section>
</main>`;
}

// Content inventory & learner analytics for editors.
function vAdminAnalytics() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M(), qs = m.qs;
  const byDiff = [1, 2, 3].map(d => qs.filter(q => (q.d || 1) === d).length);
  const withWhy = qs.filter(q => Array.isArray(q.why) && q.why.filter(Boolean).length >= 3).length;
  const withRef = qs.filter(q => q.ref || q.n).length;
  const reps = {};
  for (const r of C.reports) reps[r.qid] = (reps[r.qid] || 0) + 1;
  const topRep = Object.entries(reps).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const t = todayISO(), wk = weekKey(t);
  const active = LB.pool().filter(e => e.wk === wk && e.wp > 0);
  const chRows = CHAPTERS.filter(c => c.s !== 'days').map(c => ({ c, n: (m.byCh[c.id] || []).filter(q => !q.gen).length })).sort((a, b) => a.n - b.n);
  return `${adminBar(L('सामग्री और उपयोग विश्लेषण', 'Content and usage analytics'))}
<main class="page gutter">
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('book')} ${L('प्रश्न बैंक', 'Question bank')}</h2>
    <div class="stats stats-3"><div class="stat"><b>${qs.length}</b><span>${L('प्रश्न', 'Questions')}</span></div><div class="stat"><b>${m.dayQs.length}</b><span>${L('कैलेंडर से', 'From calendar')}</span></div><div class="stat"><b>${m.news.length}</b><span>${L('समाचार', 'News')}</span></div></div>
    <div class="cmp">${[1, 2, 3].map((d, i) => `<span>${esc(diffLabel(d))}</span><span class="track" style="height:8px;border-radius:999px;background:var(--grey);overflow:hidden;min-width:80px"><i style="display:block;height:100%;width:${pct(byDiff[i], qs.length)}%;background:var(--sky)"></i></span><b>${byDiff[i]}</b>`).join('')}</div>
    <p class="small muted" style="margin:0">${L(`"क्यों गलत" नोट: ${pct(withWhy, qs.length)}% · स्रोत/संदर्भ: ${pct(withRef, qs.length)}%`, `"Why it's wrong" notes: ${pct(withWhy, qs.length)}% · source/reference: ${pct(withRef, qs.length)}%`)}</p></section>
  <section class="sec"><h2 class="sec-title">${ic('layers')} ${L('सबसे कम प्रश्नों वाले अध्याय', 'Chapters with the fewest questions')}</h2><div class="list">${chRows.slice(0, 6).map(r => `<a class="row" href="#chapter/${r.c.id}"><span class="row-main"><span class="row-title" style="font-size:.95rem">${esc(L(r.c.hi, r.c.en))}</span><span class="row-sub">${esc(subjName(r.c.s))}</span></span><b class="tnum">${r.n}</b></a>`).join('')}</div><p class="small muted" style="margin:0">${L('यहाँ से शुरू करें: AI या प्रश्न बैंक से इन अध्यायों में प्रश्न जोड़ें।', 'Start here: add questions to these chapters with AI or the question bank.')}</p></section>
  <section class="sec"><h2 class="sec-title">${ic('flag')} ${L('सबसे ज़्यादा रिपोर्ट किए गए प्रश्न', 'Most-reported questions')}</h2><div class="list">${topRep.map(([id, n]) => { const q = m.byId.get(id); return `<div class="row"><span class="row-main"><span class="row-title" style="font-size:.95rem">${esc(q ? q.q.slice(0, 90) : id)}</span></span><b class="tnum">${n}</b></div>`; }).join('') || `<div class="empty">${L('कोई रिपोर्ट नहीं', 'No reports')}</div>`}</div></section>
  <section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 class="sec-title" style="font-size:1rem">${ic('users')} ${L('विद्यार्थी (इस सप्ताह)', 'Students (this week)')}</h2>
    <div class="stats stats-3"><div class="stat"><b>${active.length}</b><span>${L('सक्रिय', 'Active')}</span></div><div class="stat"><b>${fmtNum(active.reduce((x, e) => x + (e.wp || 0), 0))}</b><span>${L('कुल पॉइंट्स', 'Total points')}</span></div><div class="stat"><b>${active.length ? fmtNum(Math.round(active.reduce((x, e) => x + (e.wp || 0), 0) / active.length)) : 0}</b><span>${L('औसत', 'Average')}</span></div></div>
    <p class="small muted" style="margin:0">${LOCAL() ? L('ऑफ़लाइन/टेस्ट संस्करण में यहाँ केवल इस डिवाइस या नमूना विद्यार्थियों का डेटा है।', 'In the offline/test build this shows only this device or sample students.') : L('लीडरबोर्ड पर दिख रहे विद्यार्थियों पर आधारित। DAU और D1/D7/D30 रिटेंशन के लिए प्रोडक्शन बैकएंड चाहिए (README देखें)।', 'Based on students visible on the leaderboard. DAU and D1/D7/D30 retention need the production backend (see README).')}</p></section>
</main>`;
}

// Import / export of the question bank (JSON or CSV). Imported questions arrive as drafts for review.
const CSV_COLS = ['id', 'subject', 'chapter', 'difficulty', 'question', 'A', 'B', 'C', 'D', 'answer', 'explanation', 'reference', 'question_en', 'A_en', 'B_en', 'C_en', 'D_en', 'explanation_en'];
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function bankCsv() {
  return [CSV_COLS.join(','), ...M().qs.map(q => { const en = q.en || {}, eo = en.o || []; return [q.id, q.s, q.ch || '', q.d || 1, q.q, ...q.o, LETTERS[q.a], q.e || '', q.ref || '', en.q || '', eo[0] || '', eo[1] || '', eo[2] || '', eo[3] || '', en.e || ''].map(csvCell).join(','); })].join('\n');
}
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
// Accepts the app's JSON format (array of questions) or the CSV columns above. Returns {items, errors}.
function parseImport(text) {
  const t = String(text || '').trim(), items = [], errors = [];
  let raw = [];
  if (t.startsWith('[') || t.startsWith('{')) {
    try { const j = JSON.parse(t); raw = Array.isArray(j) ? j : Array.isArray(j.questions) ? j.questions : []; } catch { errors.push(L('JSON पढ़ा नहीं जा सका।', 'Could not read the JSON.')); }
  } else {
    const rows = parseCsv(t), head = (rows.shift() || []).map(h => h.trim());
    const col = k => head.indexOf(k);
    raw = rows.map(r => { const g = k => (col(k) >= 0 ? String(r[col(k)] || '').trim() : ''); const a = 'ABCD'.indexOf(g('answer').toUpperCase());
      return { id: g('id'), s: g('subject'), ch: g('chapter'), d: Number(g('difficulty')) || 1, q: g('question'), o: ['A', 'B', 'C', 'D'].map(g), a, e: g('explanation'), ref: g('reference'),
        en: g('question_en') ? { q: g('question_en'), o: ['A_en', 'B_en', 'C_en', 'D_en'].map(g), e: g('explanation_en') } : undefined }; });
  }
  raw.forEach((x, i) => {
    const q = { s: SUBJ[x.s] ? x.s : 'misc', ch: CHM[x.ch] ? x.ch : undefined, d: [1, 2, 3].includes(Number(x.d)) ? Number(x.d) : 1, t: String(x.t || ''), q: String(x.q || '').trim(), o: (Array.isArray(x.o) ? x.o : []).map(s => String(s || '').trim()), a: Number(x.a), e: String(x.e || '').trim(), ref: String(x.ref || '').trim() || undefined, en: x.en && x.en.q ? x.en : undefined, why: Array.isArray(x.why) ? x.why : undefined, ctx: x.ctx || undefined };
    if (q.q.length < 8 || q.o.length !== 4 || q.o.some(s => !s) || !(q.a >= 0 && q.a <= 3)) errors.push(L(`पंक्ति ${i + 1}: प्रश्न, चार विकल्प और सही उत्तर (A–D) चाहिए।`, `Row ${i + 1}: a question, four options and the answer (A–D) are required.`));
    else items.push({ ...q, id: x.id && /^[\w-]{2,40}$/.test(x.id) ? x.id : 'q' + rid() });
  });
  return { items: items.slice(0, 500), errors };
}
const IMP = { text: '', res: null };
function vAdminIO() {
  if (!P.isAdmin) return vNoAdmin();
  const r = IMP.res;
  return `${adminBar(L('आयात / निर्यात', 'Import / export'))}
<main class="page gutter">
  ${cmsNote()}
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('download')} ${L('निर्यात', 'Export')}</h2>
    <p class="small muted" style="margin:0">${L(`पूरा प्रश्न बैंक (${M().qs.length} प्रश्न) — बैकअप या एक्सेल में संपादन के लिए।`, `The whole question bank (${M().qs.length} questions) — for backup or editing in a spreadsheet.`)}</p>
    <div class="grid2"><button class="btn btn-outline" data-act="export" data-v="csv">CSV</button><button class="btn btn-outline" data-act="export" data-v="json">JSON</button></div></section>
  <form class="card" data-form="import" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('plus')} ${L('आयात', 'Import')}</h2>
    <p class="small muted" style="margin:0">${L('CSV (कॉलम: ', 'CSV (columns: ')}<code>${CSV_COLS.slice(0, 12).join(', ')}…</code>${L(') या JSON पेस्ट करें, या फ़ाइल चुनें। हर प्रश्न ड्राफ़्ट बनकर स्वचालित जाँच और मानव समीक्षा से गुज़रेगा।', ') or JSON, or choose a file. Every question becomes a draft and goes through automated checks and human review.')}</p>
    <input type="file" id="imp-file" accept=".csv,.json,text/csv,application/json" class="input">
    <textarea class="textarea" id="imp-text" data-bind="IMP.text" rows="6" placeholder="${L('यहाँ CSV या JSON पेस्ट करें', 'Paste CSV or JSON here')}">${esc(IMP.text)}</textarea>
    ${r ? `<div class="note ${r.errors.length ? 'note-warn' : ''}">${ic(r.errors.length ? 'alert' : 'check')}<div>${L(`${r.items.length} मान्य प्रश्न`, `${r.items.length} valid questions`)}${r.errors.length ? `<br>${r.errors.slice(0, 5).map(esc).join('<br>')}` : ''}</div></div>` : ''}
    <div class="grid2"><button class="btn btn-outline" type="button" data-act="import-check">${ic('shield')} ${L('जाँचें', 'Check')}</button><button class="btn btn-cta" type="submit" ${r && r.items.length ? '' : 'disabled'}>${ic('send')} ${L('समीक्षा में भेजें', 'Send to review')}</button></div></form>
</main>`;
}
async function saveFile(name, text, type) {
  if (P.downloads) { try { await P.downloads.save({ filename: name, data: new Blob([text], { type }) }); return; } catch (e) { if (e && e.code === 'not_granted') return; } }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch { copyText(text, L('फ़ाइल नहीं बन सकी — टेक्स्ट कॉपी हुआ', 'Could not create the file — the text was copied')); }
}

// Version history of published items (kept for editors in cms/history, or this browser in the demo).
async function historyOf(id) {
  if (P.cdb) { try { const s = await P.cdb.doc('cms/history/items/' + id).get(); return s.exists ? clone((s.data() || {}).v || []) : []; } catch { return []; } }
  return (LS.get('cms.history', {}) || {})[id] || [];
}
async function pushHistory(id, data) {
  const entry = { at: Date.now(), by: P.uid || 'local', data: clone(data) };
  if (P.cdb) {
    const ref = P.cdb.doc('cms/history/items/' + id), s = await ref.get().catch(() => null);
    const v = s && s.exists ? clone((s.data() || {}).v || []) : [];
    await ref.set({ v: [entry, ...v].slice(0, 10) });
  } else { const all = LS.get('cms.history', {}) || {}; all[id] = [entry, ...(all[id] || [])].slice(0, 10); LS.set('cms.history', all); }
}
async function openHistory(id) {
  const q = M().byId.get(id);
  openSheet(`${sheetHead(`${ic('clock')} ${L('संस्करण इतिहास', 'Version history')}`)}<p class="small muted" style="margin:0">${esc(q ? q.q : id)}</p><div id="hist-box" class="list"><div class="empty">${L('लोड हो रहा है…', 'Loading…')}</div></div>`, { label: L('संस्करण इतिहास', 'Version history') });
  const v = await historyOf(id), box = $('#hist-box');
  if (!box) return;
  box.innerHTML = v.length ? v.map((h, i) => `<div class="review-item"><b>${esc(String(h.data.q || h.data.title || h.data.t || '').slice(0, 120))}</b><span class="small muted">${relTime(h.at)} · ${L('उत्तर', 'Answer')}: ${esc((h.data.o || [])[h.data.a] || '—')}</span><div><button class="link" data-act="hist-restore" data-id="${esc(id)}" data-i="${i}">${ic('rotate')} ${L('इसे बहाल करें (समीक्षा के लिए)', 'Restore this (sends to review)')}</button></div></div>`).join('')
    : `<div class="empty">${L('अभी कोई पिछला संस्करण नहीं। प्रकाशित बदलावों के बाद यहाँ पुराने संस्करण दिखेंगे।', 'No earlier versions yet. Older versions appear here after published changes.')}</div>`;
}
