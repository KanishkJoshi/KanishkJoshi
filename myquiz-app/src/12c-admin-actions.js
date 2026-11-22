// ───────────────────────────── v3 admin actions ─────────────────────────────
const lines2 = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);
Object.assign(FORMS, {
  qedit: f => {
    const g = id => (($('#' + id, f) || {}).value || '').trim();
    const q = { s: g('qe-s'), d: Number(g('qe-d')) || 1, ch: g('qe-ch') || undefined, t: g('qe-t'), q: g('qe-q'), o: [0, 1, 2, 3].map(i => g('qe-o' + i)), a: Number((f.querySelector('input[name="qe-a"]:checked') || {}).value ?? -1), e: g('qe-e'),
      why: [0, 1, 2, 3].map(i => g('qe-w' + i)), ctx: g('qe-ctx') || undefined, ref: g('qe-ref') || undefined, ex: $$('input[name="qe-ex"]:checked', f).map(i => i.value) };
    if (!q.ex.length) delete q.ex;
    if (q.a >= 0) q.why[q.a] = '';
    if (!q.why.some(Boolean)) delete q.why;
    const en = { q: g('qe-en-q'), o: [0, 1, 2, 3].map(i => g('qe-en-o' + i)), e: g('qe-en-e'), t: g('qe-en-t'), why: [0, 1, 2, 3].map(i => g('qe-en-w' + i)), ctx: g('qe-en-ctx') || undefined, ref: g('qe-en-ref') || undefined };
    const anyEn = en.q || en.e || en.t || en.o.some(Boolean);
    const err = q.q.length < 8 ? L('प्रश्न पूरा लिखें।', 'Write the full question.')
      : q.o.some(o => !o) ? L('चारों विकल्प भरें।', 'Fill in all four options.')
        : new Set(q.o).size !== 4 ? L('विकल्प अलग-अलग होने चाहिए।', 'The options must be different.')
          : !(q.a >= 0 && q.a <= 3) ? L('सही विकल्प चुनें।', 'Select the right option.')
            : q.e.length < 10 ? L('व्याख्या लिखें — इससे विद्यार्थी सीखते हैं।', 'Write an explanation: it is how students learn.')
              : anyEn && (en.q.length < 8 || en.o.some(o => !o)) ? L('अंग्रेज़ी में प्रश्न और चारों विकल्प भरें, या अंग्रेज़ी भाग खाली छोड़ें।', 'Fill in the English question and all four options, or leave the English part empty.')
                : anyEn && new Set(en.o).size !== 4 ? L('अंग्रेज़ी विकल्प अलग-अलग होने चाहिए।', 'The English options must be different.') : '';
    if (err) { $('#qe-err', f).textContent = err; return; }
    if (anyEn) { if (q.a >= 0) en.why[q.a] = ''; if (!en.why.some(Boolean)) delete en.why; q.en = en; } else q.en = undefined;
    const cb = qEditCb; qEditCb = null; closeSheet(); if (cb) cb(q);
  },
  import: async f => {
    const r = IMP.res || parseImport(IMP.text);
    if (!r.items.length) { toast(L('आयात के लिए कोई मान्य प्रश्न नहीं।', 'No valid questions to import.'), 'err'); return; }
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    let n = 0;
    try { for (const q of r.items) { await CMS.putDraft({ type: 'q', status: 'draft', origin: 'import', note: L('आयात', 'Import'), data: clone(q) }); n++; } toast(L(`${n} प्रश्न समीक्षा कतार में भेजे गए`, `${n} questions sent to the review queue`)); IMP.text = ''; IMP.res = null; reviewTab = 'drafts'; go('admin-review'); }
    catch (e) { btn.disabled = false; toast(dbMsg(e), 'err'); }
  },
});
Object.assign(CHANGES, {
  'qe-subj': el => { const sel = $('#qe-ch'); if (sel) sel.innerHTML = `<option value="">—</option>${CHAPTERS.filter(c => c.s === el.value).map(c => `<option value="${c.id}">${esc(L(c.hi, c.en))}</option>`).join('')}`; },
});
Object.assign(ACTIONS, {
  export: el => {
    const t = todayISO();
    if (el.dataset.v === 'csv') saveFile(`myquiz-questions-${t}.csv`, '﻿' + bankCsv(), 'text/csv');
    else saveFile(`myquiz-questions-${t}.json`, JSON.stringify(M().qs.map(q => { const x = clone(q); delete x.src; return x; }), null, 1), 'application/json');
  },
  'import-check': () => { const ta = $('#imp-text'); if (ta) IMP.text = ta.value; IMP.res = parseImport(IMP.text); render(); },
  'bank-history': el => openHistory(el.dataset.id),
  'hist-restore': async el => {
    const v = await historyOf(el.dataset.id), h = v[Number(el.dataset.i)];
    if (!h) return;
    try { await CMS.putDraft({ type: h.data.q ? 'q' : h.data.title ? 'news' : 'day', status: 'draft', origin: 'manual', note: L('पुराना संस्करण', 'Older version'), data: { ...clone(h.data), id: el.dataset.id } }); closeSheet(); toast(L('पुराना संस्करण समीक्षा कतार में भेजा गया', 'The older version was sent to the review queue')); }
    catch (e) { toast(dbMsg(e), 'err'); }
  },
  'cms-foureyes': async () => {
    if (!P.owner && !LOCAL()) { toast(L('यह सेटिंग केवल ऐप का मालिक बदल सकता है।', 'Only the app owner can change this setting.'), 'info'); return; }
    CMSSET.fourEyes = !CMSSET.fourEyes;
    try { if (P.cdb) await P.cdb.doc('pub/settings/items/cms').set(clone(CMSSET)); else LS.set('cms.settings', CMSSET); toast(CMSSET.fourEyes ? L('अब दूसरे संपादक की मंज़ूरी ज़रूरी है', 'A second editor\'s approval is now required') : L('दूसरे संपादक की मंज़ूरी अब ज़रूरी नहीं', 'A second editor\'s approval is no longer required')); }
    catch (e) { CMSSET.fourEyes = !CMSSET.fourEyes; toast(dbMsg(e), 'err'); }
    render();
  },
});
// Sign-in, sign-out, upload help and the admin team (self-hosted app with Google sign-in)
Object.assign(ACTIONS, {
  'google-signin': () => signInGoogle(),
  signout: () => confirmSheet(L('साइन आउट करें?', 'Sign out?'), L('आपकी प्रगति आपके Google खाते में सुरक्षित रहेगी। इस फ़ोन से स्थानीय डेटा हटा दिया जाएगा।', 'Your progress stays safe in your Google account. Local data on this phone will be cleared.'), L('साइन आउट', 'Sign out'), () => signOutAll(), false),
  guest: () => { FB.guest = true; LS.set('guest', true); subscribeLive(); go(U.s.onb ? 'home' : 'welcome'); },
  reload: () => location.reload(),
  'upload-help': () => openUploadHelp(),
  template: () => saveFile('myquiz-question-template.csv', '\ufeff' + templateCsv(), 'text/csv'),
  'team-remove': el => {
    const email = el.dataset.email;
    confirmSheet(L('एडमिन हटाएँ?', 'Remove this admin?'), esc(email), L('हटाएँ', 'Remove'), async () => {
      try { await P.cdb.doc('admins/' + email).delete(); toast(L('एडमिन हटाया गया', 'Admin removed')); loadTeam(); } catch (e) { toast(dbMsg(e), 'err'); }
    });
  },
});
Object.assign(FORMS, {
  'team-add': async f => {
    const email = String(($('#team-email', f) || {}).value || '').trim().toLowerCase();
    if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) { toast(L('सही ईमेल लिखें।', 'Enter a valid email.'), 'err'); return; }
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    try { await P.cdb.doc('admins/' + email).set({ owner: false, by: (P.authUser || {}).email || '', at: Date.now() }); toast(L(`${email} अब एडमिन है`, `${email} is now an admin`)); loadTeam(); }
    catch (e) { btn.disabled = false; toast(dbMsg(e), 'err'); }
  },
});

