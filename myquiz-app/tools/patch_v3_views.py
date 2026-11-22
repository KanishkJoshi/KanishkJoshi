import pathlib, re
def lines(p): return pathlib.Path(p).read_text(encoding='utf-8').split('\n')
def cut(ls, start_pat, end_pat):
    """Remove lines from the line matching start_pat up to (not including) the next line matching end_pat."""
    i = next(k for k, l in enumerate(ls) if re.match(start_pat, l))
    j = next(k for k in range(i + 1, len(ls)) if re.match(end_pat, ls[k]))
    return ls[:i] + ls[j:]
p = 'src/10a-views.js'
ls = lines(p)
ls = cut(ls, r'^function topicChips\(', r'^function newsCard\(')
ls = cut(ls, r'^function onboardCard\(', r'^function explainBox\(')
s = '\n'.join(ls)
# explanation panel v3
a = s.index('function explainBox(q, a) {'); b = s.index('function vPlay() {')
s = s[:a] + r'''function explainBox(q, a) {
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
''' + s[b:]
# question meta: chapter + difficulty
s = s.replace("""<div class="qmeta"><span class="tag">${esc(subjName(q.s))}${qTopic(q) ? ' · ' + esc(qTopic(q)) : ''}</span><span class="qmeta-r">""",
              """<div class="qmeta"><span class="tag">${esc(subjName(q.s))} · ${esc(chName(chOf(q)))}</span>${diffBars(q.d)}<span class="qmeta-r">""")
assert 'diffBars(q.d)}<span class="qmeta-r">' in s
# result screen: level check outcome
old = """  <div class="btnrow">${w + sk ? `<button class="btn btn-cta" data-act="retry-wrong">"""
assert s.count(old) == 1
s = s.replace(old, """  ${S.kind === 'assess' ? `<section class="card next"><span class="k">${L('आपका स्तर', 'Your level')}</span><h3>${levelName(U.s.level)} · ${U.s.level}%</h3><p>${U.s.level >= 80 ? L('बहुत बढ़िया! उन्नत अध्याय और मॉक टेस्ट से शुरुआत करें।', 'Excellent! Start with advanced chapters and mock tests.') : U.s.level >= 40 ? L('अच्छी शुरुआत। रोज़ की चुनौती और अध्याय-अभ्यास से आगे बढ़ें।', 'A good start. Build up with the daily challenge and chapter practice.') : L('कोई बात नहीं — आसान अध्यायों से शुरू करें, हर व्याख्या ध्यान से पढ़ें।', 'No problem — start with beginner chapters and read every explanation.')}</p><button class="btn btn-cta btn-block" data-act="nav" data-to="home">${L('मेरा डैशबोर्ड', 'My dashboard')} ${ic('arrow-right')}</button></section>` : ''}
""" + old)
s = s.replace("""  <div class="grid2"><a class="btn btn-grey" href="#quiz">${L('विषय सूची', 'Subjects')}</a><a class="btn btn-navy" href="#home">${L('होम', 'Home')}</a></div>""",
              """  <div class="grid2"><a class="btn btn-grey" href="#learn">${L('सीखें', 'Learn')}</a><a class="btn btn-navy" href="#home">${L('होम', 'Home')}</a></div>""")
pathlib.Path(p).write_text(s, encoding='utf-8')

p = 'src/10b-views.js'
s = pathlib.Path(p).read_text(encoding='utf-8')
old = "function weekBars() {"
assert s.count(old) == 1
s = s.replace(old, "function weekBars(mini = false) {")
s = s.replace("""return `<div class="week" role="img" aria-label=""", """return `<div class="week${mini ? ' mini' : ''}" role="img" aria-label=""")
assert "week${mini ? ' mini' : ''}" in s
s = s.replace("""${EXAMS.map(([v, en]) => `<button type="button" class="chip" data-act="onb-exam" data-v="${esc(v)}" aria-pressed="${onb.exam === v}">${esc(L(v, en))}</button>`).join('')}""",
              """${EXAMS.map(e => `<button type="button" class="chip" data-act="onb-exam" data-v="${e.id}" aria-pressed="${onb.exam === e.id}">${esc(L(e.hi, e.en))}</button>`).join('')}""")
assert 'data-v="${e.id}"' in s
pathlib.Path(p).write_text(s, encoding='utf-8')
print('patched')
