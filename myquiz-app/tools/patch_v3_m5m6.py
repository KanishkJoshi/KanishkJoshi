import pathlib, re
def R(p): return pathlib.Path(p).read_text(encoding='utf-8')
def W(p, s): pathlib.Path(p).write_text(s, encoding='utf-8')
def rep(s, old, new, n=1):
    assert s.count(old) == n, (old[:80], s.count(old))
    return s.replace(old, new)
def cut(s, start, end):
    a = s.index(start); b = s.index(end, a + len(start)); return s[:a] + s[b:]
# A. onboarding: skip on the first screen
p = 'src/10c-v3-views.js'; s = R(p)
s = rep(s, "    ${foot('wz-next', false)}`;", "    <div class=\"onb-foot\"><button class=\"btn btn-grey\" data-act=\"wz-finish\">${L('अभी छोड़ें', 'Skip for now')}</button><button class=\"btn btn-cta\" data-act=\"wz-next\">${L('आगे', 'Next')} ${ic('arrow-right')}</button></div>`;")
W(p, s)
# B. old CA / news sheet / Aaj ka Din replaced by 10e
p = 'src/10a-views.js'; s = R(p)
s = cut(s, 'function vCA() {', 'function openNews(id) {')
s = cut(s, 'function openNews(id) {', 'let dayCursor')
s = cut(s, 'function vToday() {', 'function openDayCalendar(')
W(p, s)
# C. CA feed renders separately so live search keeps focus
p = 'src/10e-v3-daily.js'; s = R(p)
old = s[s.index("function vCA() {"):s.index("  return `${appbar(`${ic('newspaper')} ${L('करेंट अफेयर्स', 'Current affairs')}`, { back: 'learn'")]
new = '''function caFeedHtml() {
  const m = M(), tab = CA_TABS.some(x => x[0] === caTab) ? caTab : 'today';
  const list = caRange(tab).filter(caMatch), latest = m.news[0];
  const groups = {};
  for (const n of list) { const k = tab === 'archive' ? n.date.slice(0, 7) : n.date; (groups[k] = groups[k] || []).push(n); }
  const feed = Object.keys(groups).sort().reverse().map(k => `<h3 class="dgroup">${tab === 'archive' ? `${fmtMonth(k)} · ${groups[k].length}` : `${fmtDate(k)} · ${weekday(k)}`}</h3>${groups[k].map(newsCard).join('')}`).join('');
  if (feed) return feed;
  return tab === 'today' && !caQuery && !caCat
    ? `<div class="card">${emptyState('newspaper', L('आज की ख़बरें अभी प्रकाशित नहीं हुईं', 'Today\\'s news is not published yet'), latest ? `${L('नवीनतम ख़बरें', 'Latest stories')}: ${fmtDate(latest.date, false)}` : '')}</div>${m.news.slice(0, 3).map(newsCard).join('')}`
    : tab === 'saved' && !caQuery && !caCat ? `<div class="card">${emptyState('bookmark', L('कोई ख़बर सहेजी नहीं गई', 'No saved stories'), L('किसी ख़बर में "सहेजें" दबाएँ।', 'Tap "Save" on a story.'))}</div>`
      : `<div class="card">${emptyState('search', L('कोई ख़बर नहीं मिली', 'No stories found'), L('खोज, श्रेणी या अवधि बदलकर देखें।', 'Try another search, category or period.'))}</div>`;
}
function vCA() {
  const m = M(), t = todayISO(), tab = CA_TABS.some(x => x[0] === caTab) ? caTab : 'today';
  const list = caRange(tab).filter(caMatch), latest = m.news[0], qs = caQs(list);
  const revise = (tab === 'week' || tab === 'month') && list.length ? `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1rem">${ic('rotate')} ${tab === 'week' ? L('साप्ताहिक रिवीज़न', 'Weekly revision') : L('मासिक करेंट अफेयर्स', 'Monthly current affairs')}</h2>
    <p class="small muted" style="margin:0">${L(`${list.length} ख़बरें · ${qs.length} प्रश्न`, `${list.length} stories · ${qs.length} questions`)}</p>
    <div class="grid2"><button class="btn btn-cta" data-act="ca-range-quiz" data-v="${tab}" ${qs.length ? '' : 'disabled'}>${ic('zap')} ${L('क्विज', 'Quiz')}</button><a class="btn btn-outline" href="#ca-notes/${tab}">${ic('printer')} ${L('PDF नोट्स', 'PDF notes')}</a></div></section>` : '';
'''
s = s.replace(old, new)
s = rep(s, '''  <div id="ca-feed" style="display:flex;flex-direction:column;gap:12px">${C.baseState === 'loading' ? skeletonCards(3) : feed || empty}</div>''',
           '''  <div id="ca-feed" style="display:flex;flex-direction:column;gap:12px">${C.baseState === 'loading' ? skeletonCards(3) : caFeedHtml()}</div>''')
W(p, s)
# D. router, nav, events
p = 'src/14-router-boot.js'; s = R(p)
s = rep(s, "progress: vProgress, play: vPlay,", "progress: vProgress, news: vNews, 'ca-notes': vCaNotes, 'admin-translate': vAdminTranslate, 'admin-analytics': vAdminAnalytics, 'admin-io': vAdminIO, play: vPlay,")
s = rep(s, "const NO_NAV = new Set(['welcome', 'play', 'result', 'exam', 'exam-result', 'cards', 'notes',", "const NO_NAV = new Set(['welcome', 'play', 'result', 'exam', 'exam-result', 'cards', 'notes', 'ca-notes',")
s = rep(s, "window.addEventListener('hashchange', () => { setRoute(location.hash);", "window.addEventListener('hashchange', () => { stopSpeak(); setRoute(location.hash);")
s = rep(s, "  if (t.id === 'q-search') renderSearch(t.value);", "  if (t.id === 'q-search') renderSearch(t.value);\n  else if (t.id === 'ca-search') { caQuery = t.value; const box = $('#ca-feed'); if (box) box.innerHTML = caFeedHtml(); }")
s = rep(s, "  if (t.id === 'mock-agree') { const b = $('#mock-start'); if (b) b.disabled = !t.checked; }",
           "  if (t.id === 'mock-agree') { const b = $('#mock-start'); if (b) b.disabled = !t.checked; }\n  if (t.id === 'imp-file' && t.files && t.files[0]) { t.files[0].text().then(x => { IMP.text = x.slice(0, 2000000); IMP.res = parseImport(IMP.text); render(); }).catch(() => toast(L('फ़ाइल पढ़ी नहीं जा सकी।', 'Could not read the file.'), 'err')); }")
s = rep(s, "      subscribeLive(); subscribeCms(); LB.subscribe();", "      subscribeLive(); subscribeCms(); LB.subscribe();\n      try { P.cdb.doc('pub/settings/items/cms').onSnapshot(x => { if (x.exists) Object.assign(CMSSET, x.data() || {}); }, () => { /* optional */ }); } catch { /* optional */ }")
s = rep(s, "  if (LOCAL()) { loadLocalCms(); LB.loadLocal(); seedDemo(); }", "  if (LOCAL()) { loadLocalCms(); LB.loadLocal(); seedDemo(); Object.assign(CMSSET, LS.get('cms.settings', {}) || {}); }")
W(p, s)
p = 'src/09-ui.js'; s = R(p)
s = rep(s, "bookmarks: 'learn', mock:", "bookmarks: 'learn', 'ca-notes': 'learn', mock:")
W(p, s)
# E. progress model: Aaj ka Din results and saved days
p = 'src/06-progress.js'; s = R(p)
s = rep(s, "  wc: {},                               // weekly challenge results by week key {score, max, sec, at}", "  wc: {},                               // weekly challenge results by week key {score, max, sec, at}\n  t5: {},                               // Aaj ka Din 5-question results by date")
s = rep(s, "days: {}, ans: {}, bm: { q: [], n: [] },", "days: {}, ans: {}, bm: { q: [], n: [], d: [] },")
s = rep(s, "    s.bm = { q: Array.isArray(s.bm && s.bm.q) ? s.bm.q : [], n: Array.isArray(s.bm && s.bm.n) ? s.bm.n : [] };", "    s.bm = { q: Array.isArray(s.bm && s.bm.q) ? s.bm.q : [], n: Array.isArray(s.bm && s.bm.n) ? s.bm.n : [], d: Array.isArray(s.bm && s.bm.d) ? s.bm.d : [] };")
s = rep(s, "    for (const k of ['days', 'ans', 'daily', 'badges', 'dok', 'wc']) s[k] = obj(s[k], {});", "    for (const k of ['days', 'ans', 'daily', 'badges', 'dok', 'wc', 't5']) s[k] = obj(s[k], {});")
W(p, s)
# F. engine: record the daily five
p = 'src/08-engine.js'; s = R(p)
s = rep(s, "  if (S.kind === 'assess') {", "  if (S.kind === 'today5') { U.s.t5[todayISO()] = S.qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length; U.touch(); }\n  if (S.kind === 'assess') {")
W(p, s)
# G. platform: voice, downloads, owner
p = 'src/03-platform-ai.js'; s = R(p)
s = rep(s, "  const [db, user, sample] = await Promise.all([use('db'), use('user'), use('sample')]);\n  P.db = db; P.cdb = P.demo ? null : db; P.user = user; P.sample = sample;",
           "  const [db, user, sample, tts, downloads] = await Promise.all([use('db'), use('user'), use('sample'), use('tts'), use('downloads')]);\n  P.db = db; P.cdb = P.demo ? null : db; P.user = user; P.sample = sample; P.tts = tts; P.downloads = downloads;")
s = rep(s, "    try { P.editor = !!db && (await user.canEdit()); } catch { P.editor = false; }", "    try { P.editor = !!db && (await user.canEdit()); } catch { P.editor = false; }\n    try { P.owner = !!(await user.isOwner()); } catch { P.owner = false; }")
s = rep(s, "  user: null, sample: null, uid: null,", "  user: null, sample: null, tts: null, downloads: null, uid: null, owner: false,")
W(p, s)
# H. bookmarks: saved days
p = 'src/10b-views.js'; s = R(p)
s = rep(s, "  const nList = ns.length ? ns.map(newsCard).join('')", "  const ds = U.s.bm.d.map(id => m.days.find(d => d.id === id)).filter(Boolean);\n  const dList = ds.length ? `<div class=\"list\">${ds.map(d => `<button class=\"row\" data-act=\"day-goto\" data-iso=\"${parseISO(todayISO()).getFullYear()}-${d.md}\"><span class=\"row-ic\" style=\"--c:var(--brand)\">${ic('calendar')}</span><span class=\"row-main\"><span class=\"row-title\" style=\"font-size:1rem\">${esc(dT(d))}</span><span class=\"row-sub\">${fmtMD(d.md)} · ${esc(kindLabel(d.k))}</span></span>${ic('chev-right', 'chev')}</button>`).join('')}</div>` : `<div class=\"card\">${emptyState('calendar', L('कोई दिवस सहेजा नहीं गया', 'No saved days'), L('\"आज का दिन\" में \"सहेजें\" दबाएँ।', 'Tap \"Save\" in Today in History.'))}</div>`;\n  const nList = ns.length ? ns.map(newsCard).join('')")
s = rep(s, "<button data-act=\"bm-tab\" data-v=\"n\" aria-pressed=\"${bmTab === 'n'}\">${L('समाचार', 'News')} (${ns.length})</button></div>\n  ${bmTab === 'q' ? qList : nList}",
           "<button data-act=\"bm-tab\" data-v=\"n\" aria-pressed=\"${bmTab === 'n'}\">${L('समाचार', 'News')} (${ns.length})</button><button data-act=\"bm-tab\" data-v=\"d\" aria-pressed=\"${bmTab === 'd'}\">${L('दिवस', 'Days')} (${ds.length})</button></div>\n  ${bmTab === 'q' ? qList : bmTab === 'd' ? dList : nList}")
s = rep(s, "<div class=\"seg\" role=\"group\" aria-label=\"${L('बुकमार्क प्रकार', 'Saved items')}\">", "<div class=\"seg\" style=\"grid-template-columns:repeat(3,minmax(0,1fr))\" role=\"group\" aria-label=\"${L('बुकमार्क प्रकार', 'Saved items')}\">")
s = rep(s, "  return `${appbar(`${ic('bookmark')} ${L('बुकमार्क', 'Saved')}`)}", "  return `${appbar(`${ic('bookmark')} ${L('बुकमार्क', 'Saved')}`, { back: 'revise' })}")
W(p, s)
# I. admin views
p = 'src/11-views-admin.js'; s = R(p)
s = cut(s, "// Question editor (sheet) — used by AI results, review, bank and new questions.\nlet qEditCb = null;\nfunction openQEditor(", "function newsEditorSheet(d) {")
s = rep(s, "const ADMIN_ROUTES = new Set(['admin', 'admin-ai', 'admin-review', 'admin-publish', 'admin-bank', 'admin-news', 'admin-days', 'admin-rewards']);",
           "const ADMIN_ROUTES = new Set(['admin', 'admin-ai', 'admin-review', 'admin-publish', 'admin-bank', 'admin-news', 'admin-days', 'admin-rewards', 'admin-translate', 'admin-analytics', 'admin-io']);")
s = rep(s, "    ${draftPreview(d)}\n", "    ${draftPreview(d)}\n    ${qualityHtml(d)}\n")
s = rep(s, "data-act=\"draft-approve\" data-id=\"${esc(d.id)}\" ${checks.every((_, i) => (reviewChecks[d.id] || [])[i]) ? '' : 'disabled'}>",
           "data-act=\"draft-approve\" data-id=\"${esc(d.id)}\" data-block=\"${hasErr(d) || otherEditorNeeded(d) ? 1 : 0}\" ${checks.every((_, i) => (reviewChecks[d.id] || [])[i]) && !hasErr(d) && !otherEditorNeeded(d) ? '' : 'disabled'}>")
s = rep(s, "    ${act('admin-publish', 'send', L('प्रकाशित करें', 'Publish'), approved)}\n  </div>",
           "    ${act('admin-publish', 'send', L('प्रकाशित करें', 'Publish'), approved)}\n    ${act('admin-translate', 'languages', L('अनुवाद प्रबंधन', 'Translations'), missingEn().length)}\n    ${act('admin-analytics', 'chart', L('विश्लेषण', 'Analytics'))}\n    ${act('admin-io', 'download', L('आयात / निर्यात', 'Import / export'))}\n  </div>\n  <button class=\"switch\" data-act=\"cms-foureyes\" role=\"switch\" aria-checked=\"${CMSSET.fourEyes}\"><span class=\"row-main\"><b>${L('दूसरे संपादक की मंज़ूरी ज़रूरी', 'Require a second editor\\'s approval')}</b><span class=\"row-sub\">${L('ड्राफ़्ट बनाने वाला संपादक उसे ख़ुद स्वीकृत नहीं कर सकेगा (केवल मालिक बदल सकता है)। आपकी भूमिका: ', 'The editor who created a draft cannot approve it (owner only). Your role: ')}${LOCAL() ? L('डेमो', 'demo') : P.owner ? L('मालिक', 'owner') : L('संपादक', 'editor')}</span></span><span class=\"knob\" aria-hidden=\"true\"></span></button>")
s = rep(s, "<button class=\"link\" data-act=\"bank-edit\" data-id=\"${esc(q.id)}\">${ic('pencil')} ${L('संपादित करें', 'Edit')}</button>",
           "<button class=\"link\" data-act=\"bank-edit\" data-id=\"${esc(q.id)}\">${ic('pencil')} ${L('संपादित करें', 'Edit')}</button><button class=\"link\" data-act=\"bank-history\" data-id=\"${esc(q.id)}\">${ic('clock')} ${L('इतिहास', 'History')}</button>")
W(p, s)
# J. approve button respects blocking checks
p = 'src/12-actions.js'; s = R(p)
s = rep(s, "  if (btn) btn.disabled = !boxes.every(b => b.checked);", "  if (btn) btn.disabled = btn.dataset.block === '1' || !boxes.every(b => b.checked);")
s = rep(s, "    const orig = { id: q.id, s: q.s, t: q.t, q: q.q, o: q.o, a: q.a, e: q.e, d: q.d, ...(q.n ? { n: q.n } : {}), ...(q.day ? { day: q.day } : {}), ...(q.en ? { en: q.en } : {}) };",
           "    const orig = { id: q.id, s: q.s, t: q.t, q: q.q, o: q.o, a: q.a, e: q.e, d: q.d, ...(q.ch ? { ch: q.ch } : {}), ...(q.ex ? { ex: q.ex } : {}), ...(q.why ? { why: q.why } : {}), ...(q.ctx ? { ctx: q.ctx } : {}), ...(q.ref ? { ref: q.ref } : {}), ...(q.n ? { n: q.n } : {}), ...(q.day ? { day: q.day } : {}), ...(q.en ? { en: q.en } : {}) };")
W(p, s)
# K. CMS: author on drafts, history on publish
p = 'src/05-cms.js'; s = R(p)
s = rep(s, "    const doc = clone({ ...d, id: d.id || rid(), createdAt: d.createdAt || now, updatedAt: now });", "    const doc = clone({ ...d, id: d.id || rid(), by: d.by || P.uid || 'local', createdAt: d.createdAt || now, updatedAt: now });")
s = rep(s, "    const coll = COLL[d.type];\n    await this.putPub(coll,", "    const coll = COLL[d.type], id = d.data.id || 'x' + d.id;\n    const prev = (C.pub[coll] || []).find(x => x.id === id) || (C.base[coll] || []).find(x => x.id === id);\n    if (prev && !prev.hidden) { try { await pushHistory(id, prev); } catch { /* history is best-effort */ } }\n    await this.putPub(coll,")
W(p, s)
print('all patches applied')
