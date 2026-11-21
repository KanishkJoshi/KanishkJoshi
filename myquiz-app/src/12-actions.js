// ───────────────────────────── actions ─────────────────────────────
const nav = to => go(to);
// Titles are kept in both languages so a session can switch language mid-way.
const dayTitle = (hi, en, md) => [`${hi} · ${fmtMDin(md, 'hi')}`, `${en} · ${fmtMDin(md, 'en')}`];
function setLangPref(l) {
  const next = l === 'en' ? 'en' : 'hi';
  if (next === LANG && U.s.set.lang === next) return;
  U.s.set.lang = next;
  U.touch();
  applySettings();
  LB.queue();
  if (sheetOpen()) closeSheet();
  render();
  announce(L('भाषा: हिंदी', 'Language: English'));
  toast(L('भाषा बदली: हिंदी', 'Language changed: English'));
}
const REPORT_REASONS = [['उत्तर गलत लगता है', 'The answer looks wrong'], ['प्रश्न या विकल्प में त्रुटि', 'Mistake in the question or options'], ['व्याख्या अधूरी या गलत', 'Explanation incomplete or wrong'], ['अन्य', 'Other']];
const ACTIONS = {
  'sheet-bg': (el, e) => { if (e.target === el) closeSheet(); },
  'sheet-close': () => closeSheet(),
  'confirm-ok': async el => { const cb = confirmCb; confirmCb = null; el.disabled = true; closeSheet(); if (cb) await cb(); },
  back: el => {
    const to = el.dataset.to || 'home';
    if (route === 'play' && S && !S.done && Object.keys(S.ans).length) {
      openSheet(`${sheetHead(L('क्विज बीच में छोड़ें?', 'Leave the quiz?'))}<p style="margin:0">${L('आपके दिए उत्तर और पॉइंट्स प्रगति में सहेज लिए गए हैं।', 'Your answers and points so far are saved.')}</p><div class="btnrow"><button class="btn btn-cta" data-act="finish-now">${L('परिणाम देखें', 'See result')}</button><button class="btn btn-grey" data-act="quit-now" data-to="${esc(to)}">${L('छोड़ें', 'Leave')}</button><button class="btn btn-outline" data-act="sheet-close">${L('जारी रखें', 'Continue')}</button></div>`, { label: L('क्विज छोड़ें', 'Leave the quiz') });
      return;
    }
    nav(to);
  },
  'finish-now': () => { closeSheet(); finishSession(); },
  'quit-now': el => { closeSheet(); const to = el.dataset.to; S = null; nav(to); },
  notifs: () => {
    const list = notifications();
    openSheet(`${sheetHead(L('सूचनाएँ', 'Notifications'))}<div class="list">${list.length ? list.map(n => n.to ? `<a class="row" href="#${n.to}" data-act="sheet-nav">${ic(n.icon)}<span class="row-main">${esc(n.text)}</span>${ic('chev-right', 'chev')}</a>` : `<button class="row" data-act="${n.act}">${ic(n.icon)}<span class="row-main">${esc(n.text)}</span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('bell', L('कोई नई सूचना नहीं', 'No new notifications'), '')}</div>`, { label: L('सूचनाएँ', 'Notifications') });
  },
  'sheet-nav': (el, e) => { e.preventDefault(); const to = el.getAttribute('href').slice(1); closeSheet(); nav(to); },
  'lang-toggle': () => setLangPref(LANG === 'hi' ? 'en' : 'hi'),
  'set-lang': el => setLangPref(el.dataset.v),
  'onb-exam': el => { onb.exam = onb.exam === el.dataset.v ? '' : el.dataset.v; $$('[data-act="onb-exam"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === onb.exam))); },
  'onb-goal': el => { onb.goal = Number(el.dataset.v); $$('[data-act="onb-goal"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === onb.goal))); },
  'onb-skip': () => { LS.set('onb-skip', true); render(); },
  'profile-edit': () => profileSheet(),
  'start-daily': () => startSession('daily', [`दैनिक क्विज · ${fmtMDin(todayISO().slice(5), 'hi')}`, `Daily quiz · ${fmtMDin(todayISO().slice(5), 'en')}`], dailyQuestions(), { back: route === 'leaders' ? 'leaders' : 'home' }),
  'start-subject': el => {
    const k = el.dataset.s, sj = SUBJ[k];
    const pool = M().bySubj[k] || [];
    startSession('subject', [sj.name, sj.en], pick(pool, U.s.set.count || pool.length), { back: 'quiz', timed: U.s.set.mode === 'timed' });
  },
  'start-revision': () => {
    const qs = U.due().map(id => M().byId.get(id)).filter(Boolean).slice(0, 20);
    if (!qs.length) { closeSheet(); toast(L('अभी दोहराव के लिए कोई प्रश्न नहीं है — बढ़िया!', 'Nothing to revise right now. Great!'), 'info'); return; }
    startSession('revision', ['गलत प्रश्नों का दोहराव', 'Revision of wrong answers'], shuffle(qs), { back: route === 'quiz' ? 'quiz' : 'home' });
  },
  'start-bookmarked': () => {
    const qs = U.s.bm.q.map(id => M().byId.get(id)).filter(Boolean);
    if (!qs.length) { toast(L('पहले क्विज में कुछ प्रश्न बुकमार्क करें।', 'Save some questions during a quiz first.'), 'info'); return; }
    startSession('bookmarks', ['बुकमार्क प्रश्न', 'Saved questions'], shuffle(qs), { back: route === 'bookmarks' ? 'bookmarks' : 'quiz' });
  },
  'start-ca': () => {
    const pool = (M().bySubj.ca || []).slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)));
    startSession('ca', ['करेंट अफेयर्स क्विज', 'Current affairs quiz'], pick(pool.slice(0, 20), 10), { back: 'ca' });
  },
  'news-quiz': el => startSession('news', ['ख़बर से प्रश्न', 'Questions from the news'], (M().bySubj.ca || []).filter(q => q.n === el.dataset.id), { back: 'ca' }),
  'day-quiz': el => { const md = el.dataset.md; startSession('day', dayTitle('आज का दिन', 'Today in History', md), shuffle(M().all.filter(q => q.day === md)), { back: 'today' }); },
  'set-mode': el => { U.s.set.mode = el.dataset.v; U.touch(); render(); },
  'set-count': el => { U.s.set.count = Number(el.dataset.v); U.touch(); render(); },
  'search-open': () => {
    openSheet(`${sheetHead(L('प्रश्न खोजें', 'Search questions'))}<div class="search">${ic('search')}<input id="q-search" type="search" placeholder="${L('जैसे: संविधान, 1857, ISRO', 'e.g. constitution, 1857, ISRO')}" autocomplete="off" aria-label="${L('प्रश्न खोजें', 'Search questions')}"></div><div id="search-results" class="list"></div>`, { label: L('प्रश्न खोजें', 'Search questions') });
    renderSearch('');
  },
  'open-q': el => { const q = M().byId.get(el.dataset.id); if (q) startSession('single', ['प्रश्न अभ्यास', 'Question practice'], [q], { back: 'quiz' }); },
  answer: el => answer(Number(el.dataset.i)),
  'prev-q': () => { if (S && S.i > 0) { S.i--; S.shownAt = Date.now(); render(); window.scrollTo(0, 0); } },
  'next-q': () => nextQ(),
  'bm-q': el => { const added = U.toggleBm('q', el.dataset.id); toast(added ? L('प्रश्न बुकमार्क में सहेजा गया', 'Question saved') : L('बुकमार्क से हटाया गया', 'Removed from saved')); render(); },
  'bm-n': el => { const added = U.toggleBm('n', el.dataset.id); toast(added ? L('ख़बर सहेजी गई', 'News saved') : L('सहेजी ख़बरों से हटाई गई', 'Removed from saved news')); openNews(el.dataset.id); render(); },
  'share-q': () => {
    if (!S) return;
    const q = S.qs[S.i];
    shareText(`MY QUIZ ${L('प्रश्न', 'question')} 🧠\n${qT(q)}\n${qO(q).map((o, i) => `${LETTERS[i]}. ${o}`).join('\n')}\n\n${L('उत्तर ऐप में देखें!', 'Find the answer in the app!')}`);
  },
  'share-result': () => {
    if (!S) return;
    const c = S.qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
    shareText(L(`मैंने MY QUIZ पर "${sTitle()}" में ${S.qs.length} में से ${c} प्रश्न सही किए और ${S.pts} पॉइंट्स कमाए! 🎯 ${U.streak()} दिन की स्ट्रीक जारी है। क्या आप मुझसे बेहतर कर सकते हैं?`,
      `I got ${c} of ${S.qs.length} right in "${sTitle()}" on MY QUIZ and earned ${S.pts} points! 🎯 My streak is ${U.streak()} days. Can you beat me?`));
  },
  'share-news': el => {
    const n = M().newsById.get(el.dataset.id);
    if (n) shareText(`📰 ${nT(n)}\n${nS(n)}\n\n${nF(n).map(f => '• ' + f).join('\n')}\n— MY QUIZ Current Affairs`);
  },
  'report-q': el => {
    const id = el.dataset.id;
    openSheet(`${sheetHead(L('प्रश्न में त्रुटि बताएँ', 'Report an error in this question'))}<form data-form="report" data-id="${esc(id)}" style="display:flex;flex-direction:column;gap:12px">
      <fieldset style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:10px"><legend class="lbl" style="font-weight:700;margin-bottom:6px">${L('क्या समस्या है?', 'What is wrong?')}</legend>${REPORT_REASONS.map(([hi, en], i) => `<label class="check"><input type="radio" name="reason" value="${esc(L(hi, en))}" ${i === 0 ? 'checked' : ''}> ${L(hi, en)}</label>`).join('')}</fieldset>
      <div class="field"><label for="rp-note">${L('विवरण (वैकल्पिक)', 'Details (optional)')}</label><textarea class="textarea" id="rp-note" rows="3" maxlength="500" placeholder="${L('जैसे: सही उत्तर 1885 होना चाहिए — स्रोत: NCERT', 'e.g. The right answer should be 1885 (source: NCERT)')}"></textarea></div>
      <button class="btn btn-cta btn-block" type="submit">${ic('send')} ${L('रिपोर्ट भेजें', 'Send report')}</button></form>`, { label: L('त्रुटि बताएँ', 'Report error') });
  },
  'ai-explain': async el => {
    if (!S) return;
    const q = S.qs.find(x => x.id === el.dataset.id);
    if (!q) return;
    S.ai[q.id] = { text: '', err: '' };
    render();
    const box = () => document.getElementById('ai-' + q.id);
    try {
      await AI.text(explainPrompt(q, S.ans[q.id]), { onText: ({ text }) => { if (S && S.ai[q.id]) S.ai[q.id].text = text; const b = box(); if (b) b.textContent = text; } });
    } catch (e) {
      if (S && S.ai[q.id]) { S.ai[q.id].err = AI.msg(e); if (e && e.text) S.ai[q.id].text = e.text; }
    }
    if (route === 'play') render();
  },
  'retry-wrong': () => {
    if (!S) return;
    const qs = S.qs.filter(q => !(S.ans[q.id] && S.ans[q.id].ok)).map(q => M().byId.get(q.id)).filter(Boolean);
    const title = S.title.map((t, i) => String(t).replace(/ · (दोबारा|retry)$/, '') + (i ? ' · retry' : ' · दोबारा'));
    startSession(S.kind === 'daily' ? 'practice' : S.kind, title, qs, { back: S.back, timed: S.timed });
  },
  'ca-cat': el => { caCat = el.dataset.cat || ''; if (route !== 'ca') nav('ca'); else render(); },
  'open-news': el => openNews(el.dataset.id),
  'day-step': el => { dayCursor = addDays(dayCursor || todayISO(), Number(el.dataset.v)); dayPick = 0; render(); },
  'day-today': () => { dayCursor = null; dayPick = 0; render(); },
  'day-goto': el => { dayCursor = el.dataset.iso === todayISO() ? null : el.dataset.iso; dayPick = 0; closeSheet(); if (route !== 'today') nav('today'); else { render(); window.scrollTo(0, 0); } },
  'day-pick': el => { dayPick = Number(el.dataset.i); render(); },
  'day-calendar': () => openDayCalendar(),
  'cal-month': el => openDayCalendar(Number(el.dataset.v)),
  'mock-intro': el => openMockIntro(el.dataset.id),
  'mock-start': el => startExam(el.dataset.id),
  'exam-resume': () => nav('exam'),
  'exam-sel': el => {
    if (!E) return;
    const id = E.qs[E.i], i = Number(el.dataset.i), st = E.st[id] || {};
    E.st[id] = { ...st, v: true, sel: st.sel === i ? null : i };
    saveExam(); render();
  },
  'exam-mark': () => { if (!E) return; const id = E.qs[E.i]; const st = E.st[id] || {}; E.st[id] = { ...st, v: true, mk: !st.mk }; saveExam(); if (E.i < E.qs.length - 1 && !st.mk) examMove(E.i + 1); else render(); },
  'exam-clear': () => { if (!E) return; const id = E.qs[E.i]; E.st[id] = { ...(E.st[id] || {}), sel: null }; saveExam(); render(); },
  'exam-prev': () => E && examMove(E.i - 1),
  'exam-next': () => { if (!E) return; if (E.i < E.qs.length - 1) examMove(E.i + 1); else openSheet(submitAskHtml(), { label: L('सबमिट करें', 'Submit') }); },
  'exam-go': el => { closeSheet(); examMove(Number(el.dataset.i)); },
  'exam-palette': () => openSheet(paletteHtml(), { label: L('प्रश्न पैलेट', 'Question palette') }),
  'exam-submit-ask': () => openSheet(submitAskHtml(), { label: L('सबमिट करें', 'Submit') }),
  'exam-submit': () => submitExam(false),
  'exam-exit': () => openSheet(`${sheetHead(L('परीक्षा से बाहर जाएँ?', 'Leave the test?'))}<p style="margin:0">${L('परीक्षा जारी रहेगी और समय चलता रहेगा। आप "अभ्यास परीक्षा" से इसे फिर खोल सकते हैं।', 'The test stays open and the timer keeps running. You can reopen it from "Mock Tests".')}</p><div class="btnrow"><button class="btn btn-grey" data-act="exam-leave">${L('बाहर जाएँ', 'Leave')}</button><button class="btn btn-cta" data-act="exam-submit-ask">${L('सबमिट करें', 'Submit')}</button><button class="btn btn-outline" data-act="sheet-close">${L('जारी रखें', 'Continue')}</button></div>`, { label: L('परीक्षा से बाहर', 'Leave the test') }),
  'exam-leave': () => { closeSheet(); nav('mock'); },
  'bm-tab': el => { bmTab = el.dataset.v; render(); },
  'set-goal': el => { U.s.goal = Number(el.dataset.v); U.touch(); render(); },
  'set-scale': el => { U.s.set.scale = Number(el.dataset.v); U.touch(); applySettings(); render(); },
  'set-theme': el => { U.s.set.theme = el.dataset.v; U.touch(); applySettings(); render(); },
  'reset-ask': () => confirmSheet(L('प्रगति रीसेट करें?', 'Reset progress?'), L('आपके सभी उत्तर, स्ट्रीक, पॉइंट्स, बैज, बुकमार्क और मॉक टेस्ट इतिहास हट जाएँगे। यह वापस नहीं होगा।', 'All your answers, streak, points, badges, saved items and mock history will be deleted. This cannot be undone.'), L('हाँ, रीसेट करें', 'Yes, reset'), () => {
    const keep = { name: U.s.name, exam: U.s.exam, goal: U.s.goal, set: U.s.set, lb: U.s.lb };
    U.s = { ...DEF(), ...keep }; U.touch(); LB.queue(); toast(L('प्रगति रीसेट हो गई', 'Progress reset')); render();
  }),
  // ── rewards & leaderboard ──
  'lb-tab': el => { lbTab = el.dataset.v; render(); },
  'pts-info': () => openPointsInfo(),
  'pts-history': () => openPointsHistory(),
  'lb-hide': () => {
    U.s.lb.hide = !U.s.lb.hide; U.touch(); LB.queue();
    toast(U.s.lb.hide ? L('आपका नाम लीडरबोर्ड से छिपा दिया गया', 'Your name is now hidden from the leaderboard') : L('आपका नाम लीडरबोर्ड पर दिखेगा', 'Your name will show on the leaderboard'));
    render();
  },
  // ── admin ──
  'ai-src': el => {
    aiForm.src = el.dataset.v;
    const m = M();
    if (aiForm.src === 'ca') { const n = m.newsById.get(aiForm.newsId) || m.news[0]; if (n) { aiForm.newsId = n.id; aiForm.text = newsToText(n); } aiForm.subj = 'ca'; }
    else if (aiForm.src === 'day') { aiForm.dayId = ''; aiForm.subj = 'misc'; }
    else aiForm.text = '';
    render();
  },
  'ai-level': el => { aiForm.level = Number(el.dataset.v); render(); },
  'ai-generate': () => generateAI(),
  'ai-stop': () => { if (aiGen.ctl) aiGen.ctl.abort(); },
  'ai-edit': el => {
    const i = Number(el.dataset.i), q = aiGen.items[i];
    if (!q) return;
    openQEditor({ ...q, s: aiForm.subj, d: aiForm.level }, edited => { aiGen.items[i] = { ...q, ...edited }; render(); });
  },
  'ai-queue': async el => {
    const picked = aiGen.items.filter((_, i) => aiGen.sel.has(i));
    if (!picked.length) return;
    el.disabled = true;
    const day = aiForm.src === 'day' ? M().days.find(d => d.id === aiForm.dayId) : null;
    const extra = aiForm.src === 'ca' && aiForm.subj === 'ca' ? { n: aiForm.newsId } : day ? { day: day.md } : {};
    try {
      for (const q of picked) {
        await CMS.putDraft({ type: 'q', status: 'draft', origin: 'ai', source: String(aiForm.text).slice(0, 2000), data: { id: 'q' + rid(), s: q.s || aiForm.subj, t: q.t || '', q: q.q, o: q.o, a: q.a, e: q.e, d: Number(q.d || aiForm.level) || 2, ...(q.en ? { en: q.en } : {}), ...extra } });
      }
      toast(L(`${picked.length} प्रश्न समीक्षा कतार में भेजे गए`, `${picked.length} questions sent to the review queue`));
      aiGen = { status: 'idle', items: [], err: '', sel: new Set() };
      reviewTab = 'drafts';
      nav('admin-review');
    } catch (e) { el.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'review-tab': el => { reviewTab = el.dataset.v; render(); },
  'draft-approve': async el => {
    const d = C.drafts.find(x => x.id === el.dataset.id);
    if (!d) return;
    el.disabled = true;
    try { await CMS.putDraft({ ...clone(d), status: 'approved', reviewedAt: Date.now() }); reviewChecks[d.id] = []; toast(L('स्वीकृत — अब "प्रकाशित करें" में उपलब्ध', 'Approved: now available in "Publish"')); }
    catch (e) { el.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'draft-reject': el => {
    const id = el.dataset.id;
    confirmSheet(L('ड्राफ़्ट अस्वीकार करें?', 'Reject this draft?'), L('यह ड्राफ़्ट हमेशा के लिए हट जाएगा।', 'This draft will be deleted for good.'), L('अस्वीकार करें', 'Reject'), async () => { try { await CMS.delDraft(id); toast(L('ड्राफ़्ट हटाया गया', 'Draft deleted')); } catch (e) { toast(dbMsg(e), 'err'); } });
  },
  'draft-edit': el => {
    const d = C.drafts.find(x => x.id === el.dataset.id);
    if (!d) return;
    if (d.type === 'q') openQEditor(d.data, async q => { try { await CMS.putDraft({ ...clone(d), data: { ...d.data, ...q } }); toast(L('ड्राफ़्ट अपडेट हुआ', 'Draft updated')); } catch (e) { toast(dbMsg(e), 'err'); } });
    else if (d.type === 'news') newsEditorSheet(d);
    else dayEditorSheet(d);
  },
  'report-resolve': async el => {
    const r = C.reports.find(x => x.id === el.dataset.id && String(x.uid) === el.dataset.uid);
    if (!r) return;
    el.disabled = true;
    try { await CMS.resolveReport(r); toast(L('रिपोर्ट हल की गई', 'Report resolved')); } catch (e) { el.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'unpublish-ask': el => {
    const c = el.dataset.c, id = el.dataset.id;
    confirmSheet(L('प्रकाशित सामग्री हटाएँ?', 'Remove published content?'), L('यह सामग्री विद्यार्थियों को तुरंत दिखना बंद हो जाएगी। ऐप की मूल सामग्री पर इसका असर नहीं होगा।', 'Students stop seeing this content right away. The built-in content is not affected.'), L('हटाएँ', 'Remove'), async () => { try { await CMS.unpublish(c, id); toast(L('हटाया गया', 'Removed')); } catch (e) { toast(dbMsg(e), 'err'); } });
  },
  'bank-new': () => openQEditor({ s: bankState.subj || 'misc' }, async q => {
    try { await CMS.putDraft({ type: 'q', status: 'draft', origin: 'manual', data: { ...q, id: 'q' + rid() } }); toast(L('नया प्रश्न समीक्षा कतार में भेजा गया', 'New question sent to the review queue')); } catch (e) { toast(dbMsg(e), 'err'); }
  }, L('नया प्रश्न', 'New question')),
  'bank-edit': el => {
    const q = M().byId.get(el.dataset.id);
    if (!q || q.gen) return;
    const orig = { id: q.id, s: q.s, t: q.t, q: q.q, o: q.o, a: q.a, e: q.e, d: q.d, ...(q.n ? { n: q.n } : {}), ...(q.day ? { day: q.day } : {}), ...(q.en ? { en: q.en } : {}) };
    openQEditor(orig, async edited => {
      try { await CMS.putDraft({ type: 'q', status: 'draft', origin: 'manual', note: L('संपादन', 'Edit'), data: { ...orig, ...edited, id: q.id } }); toast(L('संपादन समीक्षा कतार में भेजा गया', 'Edit sent to the review queue')); } catch (e) { toast(dbMsg(e), 'err'); }
    });
  },
  'bank-remove': el => {
    const q = M().byId.get(el.dataset.id);
    if (!q) return;
    if (q.src === 'base') confirmSheet(L('मूल प्रश्न छिपाएँ?', 'Hide this built-in question?'), L('यह प्रश्न विद्यार्थियों को दिखना बंद हो जाएगा। बाद में "प्रकाशित करें" सूची से इसे फिर दिखा सकते हैं।', 'Students stop seeing this question. You can bring it back later from the "Publish" list.'), L('छिपाएँ', 'Hide'), async () => { try { await CMS.hide('q', q.id); toast(L('प्रश्न छिपाया गया', 'Question hidden')); } catch (e) { toast(dbMsg(e), 'err'); } });
    else confirmSheet(q.src === 'edited' ? L('संपादन हटाएँ?', 'Remove the edit?') : L('प्रश्न हटाएँ?', 'Remove the question?'), q.src === 'edited' ? L('प्रश्न अपने मूल रूप में लौट आएगा।', 'The question goes back to its original form.') : L('यह प्रश्न विद्यार्थियों को दिखना बंद हो जाएगा।', 'Students stop seeing this question.'), L('हाँ', 'Yes'), async () => { try { await CMS.unpublish('q', q.id); toast(L('हो गया', 'Done')); } catch (e) { toast(dbMsg(e), 'err'); } });
  },
  'bank-subj': el => { bankState.subj = el.dataset.v; bankState.limit = 40; render(); },
  'bank-more': () => { bankState.limit += 40; const box = $('#bank-list'); if (box) box.innerHTML = bankListHtml(); },
  'news-to-ai': el => { const n = M().newsById.get(el.dataset.id); if (!n) return; aiForm.src = 'ca'; aiForm.newsId = n.id; aiForm.text = newsToText(n); aiForm.subj = 'ca'; aiGen = { status: 'idle', items: [], err: '', sel: new Set() }; nav('admin-ai'); },
  'day-to-ai': el => { const d = M().days.find(x => x.id === el.dataset.id); if (!d) return; aiForm.src = 'day'; aiForm.dayId = d.id; aiForm.text = dayToText(d); aiForm.subj = 'misc'; aiGen = { status: 'idle', items: [], err: '', sel: new Set() }; nav('admin-ai'); },
  'news-ai': async () => {
    const raw = String(newsForm.raw || '').trim();
    if (raw.length < 60) { toast(L('मूल लेख कम से कम 60 अक्षरों का पेस्ट करें।', 'Paste an original article of at least 60 characters.'), 'err'); return; }
    newsAI = { status: 'loading', err: '' };
    render();
    try {
      const out = await AI.json(newsPrompt(raw));
      if (!out || typeof out !== 'object') throw { code: 'invalid_json' };
      if (out.title) newsForm.title = String(out.title).slice(0, 120);
      if (CATS.some(c => c.k === out.cat)) newsForm.cat = out.cat;
      if (out.summary) newsForm.summary = String(out.summary).slice(0, 800);
      if (Array.isArray(out.facts)) newsForm.facts = out.facts.map(String).slice(0, 6).join('\n');
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(out.date || ''))) newsForm.date = out.date;
      const en = out.en && typeof out.en === 'object' ? out.en : null;
      if (en) {
        if (en.title) newsForm.enTitle = String(en.title).slice(0, 140);
        if (en.summary) newsForm.enSummary = String(en.summary).slice(0, 800);
        if (Array.isArray(en.facts)) newsForm.enFacts = en.facts.map(String).slice(0, 6).join('\n');
      }
      newsAI = { status: 'idle', err: '' };
      toast(L('AI ने फ़ॉर्म भर दिया — जाँचकर भेजें', 'The AI filled the form. Check it, then send.'));
    } catch (e) { newsAI = { status: 'idle', err: AI.msg(e) }; }
    if (route === 'admin-news') render();
  },
  'announce-ask': el => {
    const kind = el.dataset.v === 'month' ? 'month' : 'week';
    const key = LB.announceKey(kind);
    const top = LB.board(kind === 'week' ? 'lastweek' : 'lastmonth').filter(r => r.p > 0 && (P.demo || !r.sample)).slice(0, 10);
    if (!top.length) { toast(L('इस अवधि में किसी को पॉइंट्स नहीं मिले।', 'Nobody earned points in this period.'), 'info'); return; }
    const prize = kind === 'week' ? L(LB.settings.weekPrize, LB.settings.weekPrizeEn) : L(LB.settings.monthPrize, LB.settings.monthPrizeEn);
    const period = kind === 'week' ? fmtWeek(key) : fmtMonth(key);
    confirmSheet(L('विजेता घोषित करें?', 'Announce the winners?'),
      `<p style="margin:0 0 10px">${L(`${period} के टॉप ${top.length} नाम सभी विद्यार्थियों को "विजेता" टैब में दिखेंगे।`, `The top ${top.length} names for ${period} will be shown to every student in the "Winners" tab.`)}</p>
      <ol class="win-list">${top.map((x, i) => `<li><span class="lrank tnum">${x.rank}</span>${i < 3 ? `<span class="wmedal" style="--medal:${MEDALS[i]}">${ic('medal')}</span>` : ''}<span class="lname">${esc(x.n)}</span><span class="lpts tnum">${fmtNum(x.p)}</span></li>`).join('')}</ol>
      ${prize ? `<p class="prize-line" style="margin-top:10px">${ic('gift')} ${esc(prize)}</p>` : `<p class="small muted" style="margin:10px 0 0">${L('कोई इनाम टेक्स्ट सेट नहीं है।', 'No prize text is set.')}</p>`}`,
      L('घोषित करें', 'Announce'), async () => {
        try { await LB.announce(kind); toast(L('विजेता घोषित हो गए', 'Winners announced')); lbTab = 'winners'; render(); }
        catch (e) { toast(dbMsg(e), 'err'); }
      }, false);
  },
  'lb-mod': async el => {
    const u = el.dataset.u, hide = el.dataset.v === '1';
    el.disabled = true;
    try { await LB.setHidden(u, hide); toast(hide ? L('नाम लीडरबोर्ड से छिपाया गया', 'Name hidden from the leaderboard') : L('नाम फिर से दिखेगा', 'Name will show again')); }
    catch (e) { el.disabled = false; toast(dbMsg(e), 'err'); }
  },
};
const CHANGES = {
  'ai-news': el => { const n = M().newsById.get(el.value); if (n) { aiForm.newsId = n.id; aiForm.text = newsToText(n); render(); } },
  'ai-day': el => { const d = M().days.find(x => x.id === el.value); if (d) { aiForm.dayId = d.id; aiForm.text = dayToText(d); render(); } },
  'pub-pick': el => { if (el.checked) pubForm.skip.delete(el.value); else pubForm.skip.add(el.value); },
  'ai-pick': el => { const i = Number(el.dataset.i); if (el.checked) aiGen.sel.add(i); else aiGen.sel.delete(i); render(); },
};
// Display names: plain text, no control characters, at most 24 characters.
const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
const FORMS = {
  onb: f => {
    const name = ($('#onb-name', f).value || '').trim().slice(0, 40);
    if (!name) { toast(L('अपना नाम लिखें', 'Write your name'), 'err'); $('#onb-name', f).focus(); return; }
    U.s.name = name; U.s.exam = onb.exam; U.s.goal = onb.goal; U.touch(); LB.queue();
    toast(L(`स्वागत है, ${name}!`, `Welcome, ${name}!`)); render();
  },
  profile: f => {
    U.s.name = ($('#pf-name', f).value || '').trim().slice(0, 40);
    U.s.exam = onb.exam; U.touch(); LB.queue(); closeSheet(); toast(L('प्रोफ़ाइल सहेजी गई', 'Profile saved')); render();
  },
  lbname: f => {
    const name = cleanName(($('#lb-name', f).value || ''));
    U.s.lb.name = name; lbForm.name = null; U.touch(); LB.queue();
    toast(name ? L(`लीडरबोर्ड पर आपका नाम: ${name}`, `Your leaderboard name: ${name}`) : L(`लीडरबोर्ड पर आपका नाम: ${LB.myName()}`, `Your leaderboard name: ${LB.myName()}`));
    render();
  },
  prizes: async f => {
    const g = id => String(($('#' + id, f) || {}).value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      await LB.saveSettings({ weekPrize: g('pz-week'), weekPrizeEn: g('pz-week-en'), monthPrize: g('pz-month'), monthPrizeEn: g('pz-month-en') });
      Object.keys(prizeForm).forEach(k => { prizeForm[k] = null; });
      toast(L('इनाम सहेजे गए — लीडरबोर्ड पर दिखेंगे', 'Prizes saved: they now show on the leaderboard'));
      render();
    } catch (e) { btn.disabled = false; toast(dbMsg(e), 'err'); }
  },
  report: async f => {
    const q = (S && S.qs.find(x => x.id === f.dataset.id)) || M().byId.get(f.dataset.id);
    if (!q) return;
    const reason = (f.querySelector('input[name="reason"]:checked') || {}).value || L('अन्य', 'Other');
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    try { await CMS.report(q, reason, $('#rp-note', f).value); closeSheet(); toast(L('धन्यवाद! रिपोर्ट हमारी टीम को भेज दी गई', 'Thank you! Your report was sent to our team')); }
    catch (e) { btn.disabled = false; toast(e && e.code === 'not_granted' ? L('रिपोर्ट भेजने के लिए साइन इन करें', 'Sign in to send a report') : dbMsg(e), 'err'); }
  },
  qedit: f => {
    const g = id => ($('#' + id, f).value || '').trim();
    const q = { s: g('qe-s'), d: Number(g('qe-d')) || 1, t: g('qe-t'), q: g('qe-q'), o: [0, 1, 2, 3].map(i => g('qe-o' + i)), a: Number((f.querySelector('input[name="qe-a"]:checked') || {}).value ?? -1), e: g('qe-e') };
    const en = { q: g('qe-en-q'), o: [0, 1, 2, 3].map(i => g('qe-en-o' + i)), e: g('qe-en-e'), t: g('qe-en-t') };
    const anyEn = en.q || en.e || en.t || en.o.some(Boolean);
    const err = q.q.length < 8 ? L('प्रश्न पूरा लिखें।', 'Write the full question.')
      : q.o.some(o => !o) ? L('चारों विकल्प भरें।', 'Fill in all four options.')
        : new Set(q.o).size !== 4 ? L('विकल्प अलग-अलग होने चाहिए।', 'The options must be different.')
          : !(q.a >= 0 && q.a <= 3) ? L('सही विकल्प चुनें।', 'Select the right option.')
            : q.e.length < 10 ? L('व्याख्या लिखें — इससे विद्यार्थी सीखते हैं।', 'Write an explanation: it is how students learn.')
              : anyEn && (en.q.length < 8 || en.o.some(o => !o)) ? L('अंग्रेज़ी में प्रश्न और चारों विकल्प भरें, या अंग्रेज़ी भाग खाली छोड़ें।', 'Fill in the English question and all four options, or leave the English part empty.')
                : anyEn && new Set(en.o).size !== 4 ? L('अंग्रेज़ी विकल्प अलग-अलग होने चाहिए।', 'The English options must be different.') : '';
    if (err) { $('#qe-err', f).textContent = err; return; }
    q.en = anyEn ? en : undefined;
    const cb = qEditCb; qEditCb = null; closeSheet(); if (cb) cb(q);
  },
  publish: async f => {
    const ids = $$('input[name="pub"]:checked', f).map(i => i.value);
    const date = $('#pub-date', f).value || todayISO();
    if (!ids.length) { toast(L('कम से कम एक सामग्री चुनें', 'Select at least one item'), 'err'); return; }
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    let done = 0;
    try {
      for (const id of ids) { const d = C.drafts.find(x => x.id === id); if (d) { await CMS.publish(d, date < todayISO() ? todayISO() : date); done++; } }
      toast(date > todayISO() ? L(`${done} सामग्री प्रकाशित — ${fmtDate(date, false)} से दिखेगी`, `${done} items published: visible from ${fmtDate(date, false)}`) : L(`${done} सामग्री प्रकाशित — विद्यार्थियों को अभी दिखेगी`, `${done} items published: students see them now`));
    } catch (e) { btn.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'news-new': async f => {
    const n = readNews(f, 'nf'), err = newsError(n);
    if (err) { toast(err, 'err'); return; }
    try {
      await CMS.putDraft({ type: 'news', status: 'draft', origin: 'manual', source: newsForm.raw ? String(newsForm.raw).slice(0, 2000) : undefined, data: { id: 'n' + rid(), date: n.date, cat: n.cat, title: n.title, summary: n.summary, facts: n.facts, source: n.source, ...(n.en ? { en: n.en } : {}) } });
      Object.assign(newsForm, { title: '', summary: '', facts: '', srcName: '', srcUrl: '', raw: '', date: '', enTitle: '', enSummary: '', enFacts: '' });
      toast(L('समाचार समीक्षा कतार में भेजा गया', 'News sent to the review queue')); render();
    } catch (e) { toast(dbMsg(e), 'err'); }
  },
  'news-edit': async f => {
    const d = C.drafts.find(x => x.id === f.dataset.id); if (!d) return;
    const n = readNews(f, 'ne'), err = newsError(n);
    if (err) { $('#ne-err', f).textContent = err; return; }
    try { await CMS.putDraft({ ...clone(d), data: { ...d.data, ...n, en: n.en } }); closeSheet(); toast(L('ड्राफ़्ट अपडेट हुआ', 'Draft updated')); } catch (e) { toast(dbMsg(e), 'err'); }
  },
  'day-new': async f => {
    const d = readDay(f, 'df'), err = dayError(d);
    if (err) { toast(err, 'err'); return; }
    try {
      await CMS.putDraft({ type: 'day', status: 'draft', origin: 'manual', data: { id: 'd' + rid(), ...d } });
      Object.assign(dayForm, { t: '', y: '', h: '', o: '', f: '', enT: '', enH: '', enO: '', enF: '' });
      toast(L('दिवस समीक्षा कतार में भेजा गया', 'Day sent to the review queue')); render();
    } catch (e) { toast(dbMsg(e), 'err'); }
  },
  'day-edit': async f => {
    const d = C.drafts.find(x => x.id === f.dataset.id); if (!d) return;
    const v = readDay(f, 'de'), err = dayError(v);
    if (err) { $('#de-err', f).textContent = err; return; }
    try { await CMS.putDraft({ ...clone(d), data: { ...d.data, ...v, en: v.en } }); closeSheet(); toast(L('ड्राफ़्ट अपडेट हुआ', 'Draft updated')); } catch (e) { toast(dbMsg(e), 'err'); }
  },
};
const BINDS = { aiForm, newsForm, dayForm, onb, pubForm, prizeForm, lbForm };
function setBind(path, el) { const [o, k] = path.split('.'); if (BINDS[o]) { BINDS[o][k] = el.value; if (o === 'T') T.save(); } }
function renderSearch(term) {
  const box = $('#search-results');
  if (!box) return;
  const t = term.trim().toLowerCase();
  if (t.length < 2) { box.innerHTML = emptyState('search', L('कम से कम 2 अक्षर लिखें', 'Type at least 2 letters'), L('प्रश्न, विकल्प और व्याख्या में (हिंदी और English दोनों में) खोज होगी।', 'Searches questions, options and explanations in Hindi and English.')); return; }
  const hay = q => (q.q + ' ' + q.o.join(' ') + ' ' + (q.e || '') + (q.en ? ' ' + (q.en.q || '') + ' ' + (q.en.o || []).join(' ') + ' ' + (q.en.e || '') : '')).toLowerCase();
  const res = M().all.filter(q => hay(q).includes(t)).slice(0, 30);
  box.innerHTML = res.length ? res.map(q => `<button class="row" data-act="open-q" data-id="${esc(q.id)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(qT(q))}</span><span class="row-sub">${esc(subjName(q.s))}</span></span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('search', L('कोई प्रश्न नहीं मिला', 'No questions found'), L('दूसरा शब्द आज़माएँ।', 'Try another word.'));
}
function updateApproveBtn(id, el) {
  if (el) { (reviewChecks[id] = reviewChecks[id] || [])[Number(el.dataset.ci)] = el.checked; }
  const boxes = $$(`input[data-chk="${CSS.escape(id)}"]`);
  const btn = document.getElementById('ap-' + id);
  if (btn) btn.disabled = !boxes.every(b => b.checked);
}

