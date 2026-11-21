/* MY QUIZ — app.js (v1.0)
 * हिंदी सामान्य ज्ञान ऐप: दैनिक क्विज, विषयवार क्विज, करेंट अफेयर्स, आज का दिन,
 * अभ्यास परीक्षा (मॉक टेस्ट), बुकमार्क, प्रगति, और एडमिन CMS (AI प्रश्न → मानव समीक्षा → प्रकाशन)।
 *
 * Runs in two environments with the same code:
 *  • Standalone (any static host or installed PWA). Built-in content comes from /data/*.json;
 *    admin changes and learner progress are kept in this browser's localStorage. Optional AI:
 *    set window.MYQUIZ_CONFIG = { aiEndpoint: "https://…" } before app.js (see README).
 *  • claude.ai Artifact. Published content lives in the `db` capability under pub/…, drafts and
 *    reports under cms/… and reports/… (editors only), each learner's progress under
 *    data/users/<id>/progress, and Claude is reached through the `sample` capability.
 */
(() => {
'use strict';

// ───────────────────────────── constants ─────────────────────────────
const STREAK_MIN = 5;                    // answers in a day that keep the streak alive
const TIMED_SECONDS = 30;                // per question in timed practice
const SRS_GAPS = [0, 1, 3, 7, 14, 30];   // days until a question is due again, by Leitner box
const HI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const HI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const HI_DAYS_SHORT = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const LETTERS = ['A', 'B', 'C', 'D'];

const SUBJECTS = [
  { k: 'history', name: 'भारतीय इतिहास', icon: 'landmark', c: '#E0532A' },
  { k: 'geography', name: 'भूगोल', icon: 'globe', c: '#13915C' },
  { k: 'polity', name: 'भारतीय संविधान', icon: 'scale', c: '#C88A00' },
  { k: 'science', name: 'सामान्य विज्ञान', icon: 'flask', c: '#7A3FE0' },
  { k: 'sports', name: 'खेलकूद', icon: 'trophy', c: '#D97706' },
  { k: 'misc', name: 'अन्य विषय', icon: 'book', c: '#1F63E0' },
  { k: 'ca', name: 'करेंट अफेयर्स', icon: 'newspaper', c: '#C2410C' },
  { k: 'days', name: 'महत्वपूर्ण दिवस', icon: 'calendar', c: '#11803B' },
];
const SUBJ = Object.fromEntries(SUBJECTS.map(s => [s.k, s]));
const CATS = [
  { k: 'राष्ट्रीय', icon: 'landmark', c1: '#3B5BDB', c2: '#1C2F8F' },
  { k: 'अंतरराष्ट्रीय', icon: 'globe', c1: '#2E9BD6', c2: '#155E8F' },
  { k: 'विज्ञान एवं तकनीक', icon: 'rocket', c1: '#4C6EF5', c2: '#2B3FB8' },
  { k: 'खेल', icon: 'trophy', c1: '#F59F00', c2: '#A85400' },
  { k: 'अर्थव्यवस्था', icon: 'trend', c1: '#12B886', c2: '#08765A' },
  { k: 'पर्यावरण', icon: 'leaf', c1: '#40C057', c2: '#237A33' },
  { k: 'कला एवं संस्कृति', icon: 'film', c1: '#BE4BDB', c2: '#7B2A99' },
];
const KINDS = {
  'राष्ट्रीय': { c: '#C2410C', icon: 'flag', y: 'प्रारंभ' },
  'अंतरराष्ट्रीय': { c: '#1D4ED8', icon: 'globe', y: 'प्रारंभ' },
  'जयंती': { c: '#7C3AED', icon: 'star', y: 'प्रारंभ' },
  'स्थापना दिवस': { c: '#0F766E', icon: 'landmark', y: 'स्थापना' },
  'स्मृति दिवस': { c: '#475569', icon: 'bulb', y: 'घटना वर्ष' },
};
const EXAMS = ['SSC', 'रेलवे', 'बैंकिंग', 'राज्य PSC', 'पुलिस', 'शिक्षक भर्ती', 'अन्य'];
const MOCKS = [
  { id: 'gk-1', title: 'सामान्य ज्ञान मिनी मॉक – 1', desc: 'इतिहास, भूगोल, संविधान, विज्ञान, खेल और विविध — SSC जैसी अंकन योजना।', mix: { history: 4, geography: 3, polity: 4, science: 4, sports: 2, misc: 3 }, mins: 12, pos: 2, neg: 0.5 },
  { id: 'ca-latest', title: 'करेंट अफेयर्स मॉक', desc: 'हाल की प्रमुख ख़बरों से 12 प्रश्न।', mix: { ca: 12 }, latest: true, mins: 8, pos: 2, neg: 0.5 },
  { id: 'days-1', title: 'महत्वपूर्ण दिवस मॉक', desc: 'राष्ट्रीय और अंतरराष्ट्रीय दिवस, जयंती और स्थापना दिवस।', mix: { days: 15 }, mins: 8, pos: 1, neg: 0.25 },
];
const TYPE_LABEL = { q: 'प्रश्न', news: 'समाचार', day: 'दिवस' };
const COLL = { q: 'q', news: 'news', day: 'days' };

// ───────────────────────────── utilities ─────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const parseISO = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const fmtDate = (iso, year = true) => { const d = parseISO(iso); return `${d.getDate()} ${HI_MONTHS[d.getMonth()]}${year ? ' ' + d.getFullYear() : ''}`; };
const fmtMD = md => { const [m, d] = String(md).split('-').map(Number); return `${d} ${HI_MONTHS[(m || 1) - 1]}`; };
const weekday = iso => HI_DAYS[parseISO(iso).getDay()];
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const clone = v => JSON.parse(JSON.stringify(v));
const uniq = a => [...new Set(a)];
const fmtSecs = s => `${Math.floor(s / 60)}:${pad(Math.max(0, s) % 60)}`;
const fmtScore = x => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
const initial = name => (Array.from(String(name).trim())[0] || '?').toUpperCase();
const safeUrl = u => (/^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '');
const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function hashSeed(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function rng(seed) { let a = hashSeed(String(seed)); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function relTime(ts) { if (!ts) return ''; const s = (Date.now() - ts) / 1000; if (s < 60) return 'अभी'; if (s < 3600) return `${Math.floor(s / 60)} मिनट पहले`; if (s < 86400) return `${Math.floor(s / 3600)} घंटे पहले`; if (s < 7 * 86400) return `${Math.floor(s / 86400)} दिन पहले`; return fmtDate(isoOf(new Date(ts))); }
const LS = {
  get(k, d) { try { const v = localStorage.getItem('mq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mq.' + k, JSON.stringify(v)); } catch { /* storage may be unavailable */ } },
  del(k) { try { localStorage.removeItem('mq.' + k); } catch { /* ignore */ } },
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"></use></svg>`;
const capLogo = () => '<svg class="cap" aria-hidden="true" focusable="false"><use href="#i-cap"></use></svg>';

// ───────────────────────────── platform ─────────────────────────────
const P = {
  mode: window.claude && typeof window.claude.use === 'function' ? 'artifact' : 'standalone',
  db: null, user: null, sample: null, uid: null,
  isAdmin: false, ready: false, progressRemote: false,
};
if (P.mode === 'standalone') P.isAdmin = true; // local demo: the admin panel edits this browser's copy only
const aiEndpoint = () => (window.MYQUIZ_CONFIG && window.MYQUIZ_CONFIG.aiEndpoint) || '';

async function initPlatform() {
  if (P.mode !== 'artifact') { P.ready = true; return; }
  const use = n => Promise.resolve().then(() => window.claude.use(n)).catch(() => null);
  const [db, user, sample] = await Promise.all([use('db'), use('user'), use('sample')]);
  P.db = db; P.user = user; P.sample = sample;
  if (user) {
    try { P.uid = await user.id(); } catch { P.uid = null; }
    try { P.isAdmin = !!db && (await user.canEdit()); } catch { P.isAdmin = false; }
  }
  P.ready = true;
}

function dbMsg(e) {
  const c = e && e.code;
  return ({
    invalid_argument: 'यह बदलाव सहेजा नहीं जा सका — आपके पास अनुमति नहीं है या डेटा अमान्य है।',
    quota_exceeded: 'संग्रहण सीमा भर गई है — पुरानी सामग्री हटाकर फिर कोशिश करें।',
    resource_exhausted: 'बहुत तेज़ी से बदलाव हो रहे हैं — कुछ सेकंड रुककर फिर कोशिश करें।',
    unavailable: 'सर्वर अभी उपलब्ध नहीं है — थोड़ी देर बाद फिर कोशिश करें।',
    revoked: 'आपकी पहुँच बदल गई है — पेज दोबारा खोलें।',
    not_granted: 'इस कार्य की अनुमति नहीं है।',
  }[c]) || 'सहेजा नहीं जा सका — फिर कोशिश करें।';
}

// ───────────────────────────── AI (Claude) ─────────────────────────────
const AI = {
  available() { return !!P.sample || !!aiEndpoint(); },
  async json(prompt, { signal } = {}) {
    if (P.sample) return P.sample.json(prompt, { signal, cache: false });
    return parseJsonLoose(await AI.endpoint(prompt, signal));
  },
  async text(prompt, { signal, onText } = {}) {
    if (P.sample) { const r = await P.sample(prompt, { signal, onText, modelTier: 'quick' }); return r.text; }
    const t = await AI.endpoint(prompt, signal);
    if (onText) onText({ text: t, delta: t });
    return t;
  },
  async endpoint(prompt, signal) {
    const ep = aiEndpoint();
    if (!ep) throw { code: 'unavailable' };
    const r = await fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt }), signal });
    if (!r.ok) throw { code: 'upstream_error' };
    const data = await r.json();
    return String(data.text ?? '');
  },
  msg(e) {
    return ({
      not_granted: 'AI की अनुमति नहीं दी गई। अनुमति देकर फिर कोशिश करें।',
      sampling_disabled: 'इस खाते के लिए AI उपलब्ध नहीं है।',
      rate_limited: 'अभी बहुत अनुरोध हो गए हैं — थोड़ी देर बाद फिर कोशिश करें।',
      invalid_json: 'AI का उत्तर सही प्रारूप में नहीं आया। "फिर से बनाएँ" दबाएँ।',
      refused: 'AI ने यह अनुरोध पूरा नहीं किया। स्रोत पाठ बदलकर देखें।',
      prompt_too_large: 'स्रोत पाठ बहुत लंबा है — इसे छोटा करें।',
      session_expired: 'दोबारा साइन इन करें।',
      unavailable: 'AI इस संस्करण में जुड़ा नहीं है।',
      cancelled: 'रोक दिया गया।',
    }[e && e.code]) || 'AI से उत्तर नहीं मिला। थोड़ी देर बाद फिर कोशिश करें।';
  },
};
function parseJsonLoose(t) {
  try { return JSON.parse(t); } catch { /* fall through */ }
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* fall through */ } }
  const s = t.search(/[[{]/), e = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* fall through */ } }
  throw { code: 'invalid_json' };
}

function genPrompt(f) {
  const level = { 1: 'आसान', 2: 'मध्यम', 3: 'कठिन' }[f.level] || 'मध्यम';
  return `आप भारत की सरकारी प्रतियोगी परीक्षाओं (SSC, रेलवे, राज्य PSC आदि) के लिए हिंदी में सामान्य ज्ञान के बहुविकल्पीय प्रश्न (MCQ) बनाने वाले अनुभवी शिक्षक हैं।

नीचे दिए "स्रोत पाठ" के आधार पर ठीक ${f.n} प्रश्न बनाइए।

नियम:
1. हर प्रश्न केवल स्रोत पाठ में लिखे तथ्यों पर आधारित हो। पाठ में न दिया गया कोई तथ्य, संख्या या नाम न जोड़ें।
2. हर प्रश्न के ठीक 4 विकल्प हों और केवल एक सही हो। विकल्प एक ही प्रकार के और लगभग समान लंबाई के हों। "उपरोक्त सभी" या "इनमें से कोई नहीं" जैसे विकल्प न दें।
3. सही विकल्प की स्थिति (0 से 3) प्रश्नों में बदलती रहे।
4. "e" में 1–2 वाक्यों की व्याख्या दें, जिसमें स्रोत पाठ का तथ्य हो।
5. भाषा सरल और शुद्ध हिंदी (देवनागरी) हो। संख्याएँ अंकों में लिखें। ISRO जैसे प्रचलित संक्षिप्त नाम चल सकते हैं।
6. कठिनाई स्तर: ${level}। विषय: ${(SUBJ[f.subj] || {}).name || 'सामान्य ज्ञान'}।
7. "t" में 2–4 शब्दों का उप-विषय लिखें।

केवल JSON array लौटाइए, कोई और पाठ नहीं। प्रारूप:
[{"q":"प्रश्न?","o":["विकल्प 1","विकल्प 2","विकल्प 3","विकल्प 4"],"a":2,"e":"व्याख्या","t":"उप-विषय"}]

स्रोत पाठ:
"""
${String(f.text).slice(0, 12000)}
"""`;
}
function explainPrompt(q, a) {
  const wrong = a && !a.ok && a.sel >= 0;
  return `आप एक धैर्यवान शिक्षक हैं। प्रतियोगी परीक्षा की तैयारी कर रहे विद्यार्थी को सरल हिंदी में समझाइए कि नीचे दिए प्रश्न का सही उत्तर क्यों सही है${wrong ? ' और विद्यार्थी का चुना हुआ विकल्प क्यों गलत है' : ''}।
- अधिकतम 110 शब्द, छोटे वाक्य।
- केवल वही तथ्य लिखें जिनके बारे में आप पूरी तरह आश्वस्त हों।
- अंत में "याद रखने की ट्रिक:" से शुरू होने वाली एक पंक्ति दें।
- Markdown, बुलेट या तारांकन चिह्न का प्रयोग न करें।

प्रश्न: ${q.q}
विकल्प: ${q.o.map((o, i) => `${LETTERS[i]}) ${o}`).join('   ')}
सही उत्तर: ${LETTERS[q.a]}) ${q.o[q.a]}
${wrong ? `विद्यार्थी का उत्तर: ${LETTERS[a.sel]}) ${q.o[a.sel]}\n` : ''}दी गई व्याख्या: ${q.e || '—'}`;
}
function newsPrompt(raw) {
  return `नीचे दिए समाचार पाठ से प्रतियोगी परीक्षा के लिए हिंदी करेंट अफेयर्स प्रविष्टि बनाइए। केवल पाठ में दिए तथ्यों का प्रयोग करें; कुछ भी अनुमान से न जोड़ें।
केवल एक JSON object लौटाइए:
{"title":"हिंदी शीर्षक, अधिकतम 80 अक्षर","cat":"इनमें से एक: ${CATS.map(c => c.k).join(' | ')}","summary":"2–3 वाक्यों का हिंदी सारांश","facts":["परीक्षा के लिए उपयोगी एक-पंक्ति तथ्य"],"date":"YYYY-MM-DD यदि पाठ में घटना की तारीख़ हो, वरना खाली"}
facts में 3–5 बिंदु हों।

समाचार पाठ:
"""
${String(raw).slice(0, 12000)}
"""`;
}
function normalizeAIQ(x) {
  if (!x || typeof x !== 'object') return null;
  const rawO = Array.isArray(x.o) ? x.o : Array.isArray(x.options) ? x.options : null;
  if (!rawO) return null;
  const o = rawO.map(s => String(s ?? '').trim());
  const a = Number(x.a ?? x.answer);
  const q = String(x.q ?? x.question ?? '').trim();
  if (!q || o.length !== 4 || o.some(s => !s) || new Set(o).size !== 4 || !Number.isInteger(a) || a < 0 || a > 3) return null;
  return { q: q.slice(0, 400), o: o.map(s => s.slice(0, 160)), a, e: String(x.e ?? x.explanation ?? '').trim().slice(0, 600), t: String(x.t ?? '').trim().slice(0, 40) };
}

// ───────────────────────────── content store ─────────────────────────────
const C = {
  base: { q: [], news: [], days: [] },
  pub: { q: [], news: [], days: [] },
  drafts: [], reports: [],
  baseState: 'loading', liveState: 'idle', cmsState: 'idle',
  ver: 0,
};
function bump() { C.ver++; scheduleRender(); }
const validQ = x => !!x && typeof x.id === 'string' && (x.hidden === true || (typeof x.q === 'string' && x.q.trim() !== '' && Array.isArray(x.o) && x.o.length === 4 && x.o.every(o => typeof o === 'string' && o.trim() !== '') && Number.isInteger(x.a) && x.a >= 0 && x.a <= 3 && typeof x.s === 'string'));
const validNews = x => !!x && typeof x.id === 'string' && (x.hidden === true || (typeof x.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date || '')));
const validDay = x => !!x && typeof x.id === 'string' && (x.hidden === true || (typeof x.t === 'string' && /^\d{2}-\d{2}$/.test(x.md || '')));

async function loadBase() {
  const get = p => fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.json(); });
  try {
    const [q, news, days] = await Promise.all([get('data/questions.json'), get('data/news.json'), get('data/days.json')]);
    C.base = { q: q.filter(validQ), news: news.filter(validNews), days: days.filter(validDay) };
    C.baseState = 'ok';
  } catch { C.baseState = 'error'; }
  bump();
}
function loadLocalCms() {
  const pub = LS.get('cms.pub', null) || {};
  C.pub = { q: (pub.q || []).filter(validQ), news: (pub.news || []).filter(validNews), days: (pub.days || []).filter(validDay) };
  C.drafts = (LS.get('cms.drafts', []) || []).filter(d => d && d.id && d.data);
  C.reports = LS.get('cms.reports', []) || [];
  C.liveState = 'ok'; C.cmsState = 'ok';
}
function subscribeLive() {
  if (!P.db) { C.liveState = 'off'; return; }
  C.liveState = 'loading';
  const timer = setTimeout(() => { if (C.liveState === 'loading') { C.liveState = 'slow'; bump(); } }, 10000);
  const check = { q: validQ, news: validNews, days: validDay };
  for (const k of Object.keys(check)) {
    try {
      P.db.collection(`pub/${k}/items`).onSnapshot(snap => {
        C.pub[k] = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(check[k]);
        if (!snap.metadata.fromCache) { clearTimeout(timer); C.liveState = 'ok'; }
        bump();
      }, () => { clearTimeout(timer); C.liveState = 'error'; bump(); });
    } catch { C.liveState = 'error'; }
  }
}
function subscribeCms() {
  if (!P.db || !P.isAdmin) return;
  C.cmsState = 'loading';
  const timer = setTimeout(() => { if (C.cmsState === 'loading') { C.cmsState = 'slow'; bump(); } }, 10000);
  try {
    P.db.collection('cms/drafts/items').onSnapshot(snap => {
      C.drafts = snap.docs.map(d => ({ ...clone(d.data()), id: d.id })).filter(d => d.data);
      if (!snap.metadata.fromCache) { clearTimeout(timer); C.cmsState = 'ok'; }
      bump();
    }, () => { clearTimeout(timer); C.cmsState = 'error'; bump(); });
    P.db.collection('reports').onSnapshot(snap => {
      C.reports = snap.docs.flatMap(d => { const items = (d.data() || {}).items; return Array.isArray(items) ? items.map(r => ({ ...r, uid: d.id })) : []; });
      bump();
    }, () => { /* reports are optional */ });
  } catch { C.cmsState = 'error'; }
}

// Derived, memoised views over base + live content.
let memo = null;
function M() {
  const today = todayISO();
  if (memo && memo.ver === C.ver && memo.day === today) return memo;
  const isLive = x => !x.publishAt || x.publishAt <= today;
  const merge = (base, live) => {
    const map = new Map();
    for (const x of base) map.set(x.id, { ...x, src: 'base' });
    for (const x of live) {
      if (!isLive(x)) continue;
      if (x.hidden) { map.delete(x.id); continue; }
      map.set(x.id, { ...x, src: map.has(x.id) || C.base.q.some(b => b.id === x.id) ? 'edited' : 'live' });
    }
    return [...map.values()];
  };
  const qs = merge(C.base.q, C.pub.q);
  const news = merge(C.base.news, C.pub.news).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const days = merge(C.base.days, C.pub.days).sort((a, b) => a.md.localeCompare(b.md) || a.id.localeCompare(b.id));
  const dayQs = genDayQs(days);
  const all = [...qs, ...dayQs];
  const byId = new Map(all.map(q => [q.id, q]));
  const bySubj = {};
  for (const q of all) (bySubj[q.s] = bySubj[q.s] || []).push(q);
  const newsById = new Map(news.map(n => [n.id, n]));
  const daysByMd = {};
  for (const d of days) (daysByMd[d.md] = daysByMd[d.md] || []).push(d);
  memo = { ver: C.ver, day: today, qs, news, days, dayQs, all, byId, bySubj, newsById, daysByMd };
  return memo;
}
// Questions generated from the important-days calendar (deterministic per entry).
function genDayQs(days) {
  const out = [];
  const mds = uniq(days.map(d => d.md));
  for (const d of days) {
    const r = rng('dq:' + d.id);
    const otherMds = shuffle(mds.filter(m => m !== d.md), r).slice(0, 3);
    if (otherMds.length === 3) {
      const opts = shuffle([d.md, ...otherMds], r);
      out.push({ id: `dq-${d.id}-a`, s: 'days', t: 'महत्वपूर्ण दिवस', d: 1, day: d.md, gen: true, q: `'${d.t}' कब मनाया जाता है?`, o: opts.map(fmtMD), a: opts.indexOf(d.md), e: d.h });
    }
    const others = shuffle(uniq(days.filter(x => x.md !== d.md).map(x => x.t)), r).slice(0, 3);
    if (others.length === 3) {
      const opts = shuffle([d.t, ...others], r);
      out.push({ id: `dq-${d.id}-b`, s: 'days', t: 'महत्वपूर्ण दिवस', d: 2, day: d.md, gen: true, q: `${fmtMD(d.md)} को इनमें से कौन-सा दिवस मनाया जाता है?`, o: opts, a: opts.indexOf(d.t), e: d.h });
    }
  }
  return out;
}
const newsDate = q => (q.n && M().newsById.get(q.n) ? M().newsById.get(q.n).date : '0000-00-00');
// Option order is shuffled per sitting so the answer position can't be memorised;
// purely numeric options are sorted instead, which reads more naturally.
function presentQ(q, seed) {
  const idx = [0, 1, 2, 3];
  const numeric = q.o.every(o => /^[\d\s.,]+$/.test(String(o).trim()));
  const order = numeric
    ? idx.slice().sort((i, j) => parseFloat(String(q.o[i]).replace(/,/g, '')) - parseFloat(String(q.o[j]).replace(/,/g, '')))
    : shuffle(idx, rng(seed + ':' + q.id));
  return { ...q, o: order.map(i => q.o[i]), a: order.indexOf(q.a) };
}

// ───────────────────────────── CMS operations ─────────────────────────────
const CMS = {
  saveLocal() { LS.set('cms.pub', C.pub); LS.set('cms.drafts', C.drafts); LS.set('cms.reports', C.reports); },
  async putDraft(d) {
    const now = Date.now();
    const doc = clone({ ...d, id: d.id || rid(), createdAt: d.createdAt || now, updatedAt: now });
    if (P.db) await P.db.doc(`cms/drafts/items/${doc.id}`).set(doc);
    else { const i = C.drafts.findIndex(x => x.id === doc.id); if (i >= 0) C.drafts[i] = doc; else C.drafts.push(doc); this.saveLocal(); bump(); }
    return doc;
  },
  async delDraft(id) {
    if (P.db) await P.db.doc(`cms/drafts/items/${id}`).delete();
    else { C.drafts = C.drafts.filter(x => x.id !== id); this.saveLocal(); bump(); }
  },
  async putPub(coll, item) {
    const doc = clone(item);
    if (P.db) await P.db.doc(`pub/${coll}/items/${doc.id}`).set(doc);
    else { const arr = C.pub[coll]; const i = arr.findIndex(x => x.id === doc.id); if (i >= 0) arr[i] = doc; else arr.push(doc); this.saveLocal(); bump(); }
  },
  async publish(d, publishAt) {
    const coll = COLL[d.type];
    await this.putPub(coll, { ...d.data, id: d.data.id || 'x' + d.id, publishAt, publishedAt: Date.now() });
    await this.delDraft(d.id);
  },
  async unpublish(coll, id) {
    if (P.db) await P.db.doc(`pub/${coll}/items/${id}`).delete();
    else { C.pub[coll] = C.pub[coll].filter(x => x.id !== id); this.saveLocal(); bump(); }
  },
  async hide(coll, id) { await this.putPub(coll, { id, hidden: true, publishAt: todayISO(), publishedAt: Date.now() }); },
  async report(q, reason, note) {
    const r = { id: rid(), qid: q.id, qtext: String(q.q).slice(0, 240), reason, note: String(note || '').slice(0, 500), at: Date.now() };
    if (P.db && P.uid) {
      const ref = P.db.doc(`reports/${P.uid}`);
      const snap = await ref.get();
      const prev = snap.exists && Array.isArray((snap.data() || {}).items) ? clone(snap.data().items).slice(-49) : [];
      prev.push(r);
      await ref.set({ items: prev });
    } else if (P.mode === 'standalone') { C.reports.push({ ...r, uid: 'local' }); this.saveLocal(); bump(); }
    else throw { code: 'not_granted' };
  },
  async resolveReport(r) {
    if (P.db) {
      const ref = P.db.doc(`reports/${r.uid}`);
      const snap = await ref.get();
      if (!snap.exists) return;
      const items = ((snap.data() || {}).items || []).filter(x => x.id !== r.id);
      await ref.set({ items: clone(items) });
    } else { C.reports = C.reports.filter(x => x.id !== r.id); this.saveLocal(); bump(); }
  },
};

// ───────────────────────────── learner progress ─────────────────────────────
const DEF = () => ({ v: 1, name: '', exam: '', goal: 10, xp: 0, best: 0, days: {}, ans: {}, bm: { q: [], n: [] }, mocks: [], daily: {}, dailySet: null, set: { scale: 1, theme: 'system', mode: 'practice', count: 10 }, updatedAt: 0 });
const U = {
  s: DEF(),
  norm(x) {
    const d = DEF();
    const s = { ...d, ...(x && typeof x === 'object' ? x : {}) };
    s.bm = { q: Array.isArray(s.bm && s.bm.q) ? s.bm.q : [], n: Array.isArray(s.bm && s.bm.n) ? s.bm.n : [] };
    s.set = { ...d.set, ...(s.set || {}) };
    for (const k of ['days', 'ans', 'daily']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
    if (!Array.isArray(s.mocks)) s.mocks = [];
    s.name = String(s.name || '').slice(0, 40);
    s.goal = [10, 20, 30].includes(Number(s.goal)) ? Number(s.goal) : 10;
    return s;
  },
  load() { this.s = this.norm(LS.get('progress', null)); },
  async syncRemote() {
    if (!P.db || !P.uid) return;
    try {
      const snap = await P.db.doc(`data/users/${P.uid}/progress`).get();
      P.progressRemote = true;
      if (snap.exists) {
        const r = this.norm(clone(snap.data()));
        if ((r.updatedAt || 0) > (this.s.updatedAt || 0)) { this.s = r; LS.set('progress', this.s); applySettings(); scheduleRender(); }
        else if ((this.s.updatedAt || 0) > (r.updatedAt || 0)) this.queue();
      } else if (this.s.updatedAt) this.queue();
    } catch { P.progressRemote = false; }
  },
  touch() { this.s.updatedAt = Date.now(); LS.set('progress', this.s); this.queue(); },
  queue() { if (!P.progressRemote) return; clearTimeout(this.t); this.t = setTimeout(() => this.flush(), 1500); },
  async flush() {
    if (!P.progressRemote) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try { await P.db.doc(`data/users/${P.uid}/progress`).set(clone(this.s)); }
    catch (e) { if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'quota_exceeded'].includes(e.code)) P.progressRemote = false; }
    finally { this.busy = false; if (this.again) { this.again = false; this.flush(); } }
  },
  prune() {
    const cutoff = addDays(todayISO(), -120);
    for (const k of Object.keys(this.s.days)) if (k < cutoff) delete this.s.days[k];
    for (const k of Object.keys(this.s.daily)) if (k < cutoff) delete this.s.daily[k];
  },
  record(q, ok) {
    const t = todayISO();
    const a = this.s.ans[q.id] || { c: 0, w: 0, b: 0 };
    if (ok) { a.c++; a.b = Math.min(SRS_GAPS.length - 1, (a.b || 0) + 1); } else { a.w++; a.b = 0; }
    a.l = ok ? 1 : 0; a.t = Date.now(); a.due = addDays(t, SRS_GAPS[a.b]);
    this.s.ans[q.id] = a;
    this.s.days[t] = (this.s.days[t] || 0) + 1;
    this.s.xp += ok ? 10 : 2;
    const st = this.streak();
    if (st > (this.s.best || 0)) this.s.best = st;
    this.prune();
    this.touch();
  },
  streak() {
    const days = this.s.days;
    let d = todayISO();
    if ((days[d] || 0) < STREAK_MIN) d = addDays(d, -1);
    let n = 0;
    while ((days[d] || 0) >= STREAK_MIN) { n++; d = addDays(d, -1); }
    return n;
  },
  todayCount() { return this.s.days[todayISO()] || 0; },
  due() {
    const t = todayISO(), m = M();
    return Object.entries(this.s.ans).filter(([id, a]) => a.w > 0 && (a.b || 0) < SRS_GAPS.length - 1 && (a.due || t) <= t && m.byId.has(id)).map(([id]) => id);
  },
  isBm(kind, id) { return this.s.bm[kind].includes(id); },
  toggleBm(kind, id) {
    const arr = this.s.bm[kind], i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.unshift(id);
    this.touch();
    return i < 0;
  },
  subjStats(k) {
    const qs = M().bySubj[k] || [];
    let seen = 0, right = 0, c = 0, w = 0;
    for (const q of qs) { const a = this.s.ans[q.id]; if (a) { seen++; if (a.l) right++; c += a.c; w += a.w; } }
    return { total: qs.length, seen, right, acc: pct(c, c + w) };
  },
  totals() {
    let c = 0, w = 0, n = 0;
    for (const a of Object.values(this.s.ans)) { c += a.c || 0; w += a.w || 0; n++; }
    return { attempts: c + w, correct: c, unique: n, acc: pct(c, c + w) };
  },
};
function applySettings() {
  const s = U.s.set;
  document.documentElement.style.setProperty('--scale', String(clamp(Number(s.scale) || 1, 0.85, 1.3)));
  if (P.mode === 'standalone') {
    if (s.theme === 'dark' || s.theme === 'light') document.documentElement.dataset.theme = s.theme;
    else delete document.documentElement.dataset.theme;
  }
}

// ───────────────────────────── quiz sessions ─────────────────────────────
let S = null; // active practice session
function pick(pool, n, seed) {
  const r = seed ? rng(seed) : Math.random;
  const unseen = [], wrong = [], rest = [];
  for (const q of shuffle(pool, r)) { const a = U.s.ans[q.id]; if (!a) unseen.push(q); else if (!a.l) wrong.push(q); else rest.push(q); }
  return [...unseen, ...wrong, ...rest].slice(0, n || pool.length);
}
function startSession(kind, title, questions, opts = {}) {
  const qs = (questions || []).filter(Boolean);
  if (!qs.length) { toast('इस सेट में अभी कोई प्रश्न नहीं है।', 'info'); return; }
  const seed = rid();
  S = { kind, title, back: opts.back || 'quiz', timed: !!opts.timed, qs: qs.map(q => presentQ(q, seed)), i: 0, ans: {}, startedAt: Date.now(), shownAt: Date.now(), ai: {}, done: false, xp: 0 };
  closeSheet();
  go('play');
}
function dailyQuestions() {
  const t = todayISO(), m = M();
  if (U.s.dailySet && U.s.dailySet.date === t) {
    const qs = U.s.dailySet.ids.map(id => m.byId.get(id)).filter(Boolean);
    if (qs.length >= 5) return qs;
  }
  const ca = (m.bySubj.ca || []).slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)));
  const caPick = pick(ca.slice(0, 8), 3, 'daily-ca:' + t);
  const dayPick = pick(m.all.filter(q => q.day === t.slice(5)), 2, 'daily-day:' + t);
  const used = new Set([...caPick, ...dayPick].map(q => q.id));
  const rest = pick(m.qs.filter(q => q.s !== 'ca' && !used.has(q.id)), 10 - caPick.length - dayPick.length, 'daily-bank:' + t);
  const qs = shuffle([...caPick, ...dayPick, ...rest], rng('daily:' + t));
  U.s.dailySet = { date: t, ids: qs.map(q => q.id) };
  U.touch();
  return qs;
}
function answer(sel) {
  if (!S) return;
  const q = S.qs[S.i];
  if (!q || S.ans[q.id]) return;
  const ok = sel === q.a;
  S.ans[q.id] = { sel, ok, ms: Date.now() - S.shownAt };
  S.xp += ok ? 10 : 2;
  U.record(q, ok);
  render();
  announce(sel === -1 ? 'समय समाप्त' : ok ? 'सही उत्तर' : `गलत उत्तर। सही उत्तर है ${q.o[q.a]}`);
  const ex = $('.explain');
  if (ex) ex.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
}
function nextQ() {
  if (!S) return;
  if (S.i < S.qs.length - 1) { S.i++; S.shownAt = Date.now(); render(); window.scrollTo(0, 0); }
  else finishSession();
}
function finishSession() {
  if (!S) return;
  S.done = true; S.endedAt = Date.now();
  if (S.kind === 'daily') {
    const ok = S.qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
    U.s.daily[todayISO()] = { score: ok, total: S.qs.length };
    if (U.todayCount() >= U.s.goal) U.s.xp += 20;
    U.touch();
  }
  go('result');
}

// ───────────────────────────── mock exams ─────────────────────────────
let E = (() => { const e = LS.get('exam', null); return e && Array.isArray(e.qs) && e.st && !e.submitted ? e : null; })();
let lastExam = LS.get('lastExam', null);
const saveExam = () => { if (E) LS.set('exam', E); };
function mockQuestionIds(mk) {
  const m = M(), ids = [];
  for (const [s, n] of Object.entries(mk.mix)) {
    let pool = m.bySubj[s] || [];
    pool = mk.latest ? pool.slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)) || a.id.localeCompare(b.id)).slice(0, n)
      : shuffle(pool.slice().sort((a, b) => a.id.localeCompare(b.id)), rng(mk.id + ':' + s)).slice(0, n);
    ids.push(...pool.map(q => q.id));
  }
  return ids;
}
function examQ(id, ex = E) { const q = M().byId.get(id); return q ? presentQ(q, ex.seed) : null; }
function startExam(id) {
  const mk = MOCKS.find(x => x.id === id);
  if (!mk) return;
  const ids = mockQuestionIds(mk);
  if (ids.length < 5) { toast('इस परीक्षा के लिए पर्याप्त प्रश्न नहीं हैं।', 'err'); return; }
  const now = Date.now();
  E = { id: mk.id, title: mk.title, pos: mk.pos, neg: mk.neg, qs: ids, i: 0, st: { [ids[0]]: { v: true } }, startedAt: now, endsAt: now + mk.mins * 60000, seed: 'exam:' + now, submitted: false };
  saveExam();
  closeSheet();
  go('exam');
}
function examMove(i) {
  if (!E) return;
  E.i = clamp(i, 0, E.qs.length - 1);
  const id = E.qs[E.i];
  E.st[id] = { ...(E.st[id] || {}), v: true };
  saveExam();
  render();
  window.scrollTo(0, 0);
}
function examCounts(ex = E) {
  let ans = 0, na = 0, mk = 0, nv = 0;
  for (const id of ex.qs) { const s = ex.st[id] || {}; if (s.mk) mk++; if (s.sel != null) ans++; else if (s.v) na++; else nv++; }
  return { ans, na, mk, nv };
}
function examResult(ex) {
  let c = 0, w = 0, u = 0;
  const bySubj = {};
  for (const id of ex.qs) {
    const q = examQ(id, ex);
    if (!q) continue;
    const s = ex.st[id] || {};
    const b = bySubj[q.s] = bySubj[q.s] || { c: 0, w: 0, u: 0, n: 0 };
    b.n++;
    if (s.sel == null) { u++; b.u++; } else if (s.sel === q.a) { c++; b.c++; } else { w++; b.w++; }
  }
  const score = Math.round((c * ex.pos - w * ex.neg) * 100) / 100;
  return { c, w, u, n: ex.qs.length, score, max: ex.qs.length * ex.pos, bySubj, timeSec: Math.round(((ex.submittedAt || Date.now()) - ex.startedAt) / 1000) };
}
function submitExam(auto = false) {
  if (!E || E.submitted) return;
  E.submitted = true;
  E.submittedAt = Math.min(Date.now(), E.endsAt);
  const R = examResult(E);
  for (const id of E.qs) { const s = E.st[id]; if (s && s.sel != null) { const q = examQ(id); if (q) U.record(q, s.sel === q.a); } }
  U.s.mocks.unshift({ id: E.id, title: E.title, date: todayISO(), score: R.score, max: R.max, c: R.c, w: R.w, u: R.u, timeSec: R.timeSec });
  U.s.mocks = U.s.mocks.slice(0, 30);
  U.s.xp += Math.max(0, Math.round(R.score));
  U.touch();
  lastExam = { ...R, ex: clone(E) };
  LS.set('lastExam', lastExam);
  LS.del('exam');
  E = null;
  closeSheet();
  go('exam-result');
  if (auto) toast('समय समाप्त — परीक्षा अपने-आप सबमिट हो गई', 'info');
}

// ───────────────────────────── UI helpers ─────────────────────────────
function appbar(title, { back = '', right = '' } = {}) {
  return `<header class="appbar"><div class="appbar-in gutter">${back ? `<button class="iconbtn" data-act="back" data-to="${back}" aria-label="वापस जाएँ">${ic('arrow-left')}</button>` : ''}<h1>${title}</h1>${right}</div></header>`;
}
function adminBar(title, back = 'admin') {
  return appbar(title, { back, right: `<a class="iconbtn" href="#home" aria-label="ऐप पर लौटें" title="ऐप पर लौटें">${ic('home')}</a>` });
}
const NAV = [['home', 'होम', 'home'], ['quiz', 'क्विज', 'book-open'], ['bookmarks', 'बुकमार्क', 'bookmark'], ['profile', 'प्रोफ़ाइल', 'user']];
const bottomNav = active => `<nav class="bnav" aria-label="मुख्य मेनू"><div class="bnav-in">${NAV.map(([r, l, i]) => `<a href="#${r}"${r === active ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`).join('')}</div></nav>`;
function ring(p, size, stroke, color = 'var(--ring)') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(p, 0, 1)), h = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${h}" cy="${h}" r="${r}" fill="none" style="stroke:var(--ring-track)" stroke-width="${stroke}"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" style="stroke:${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}
const emptyState = (icon, title, text) => `<div class="empty">${ic(icon)}<b>${title}</b>${text}</div>`;
const skeletonRows = n => Array.from({ length: n }, () => '<div class="row"><div class="skeleton" style="width:50px;height:50px"></div><div class="row-main"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:12px;width:40%;margin-top:8px"></div></div></div>').join('');
const skeletonCards = n => Array.from({ length: n }, () => '<div class="skeleton" style="height:128px;border-radius:16px"></div>').join('');
const catOf = c => CATS.find(x => x.k === c) || { k: c, icon: 'newspaper', c1: '#3B5BDB', c2: '#1C2F8F' };
const kindOf = k => KINDS[k] || { c: '#1D4ED8', icon: 'calendar', y: 'प्रारंभ' };
function qPreview(q) {
  return `<div class="qprev"><b>${esc(q.q)}</b><ol type="A">${q.o.map((o, i) => `<li class="${i === q.a ? 'c' : ''}">${esc(o)}${i === q.a ? ' ✓' : ''}</li>`).join('')}</ol>${q.e ? `<span class="small muted">व्याख्या: ${esc(q.e)}</span>` : ''}</div>`;
}
function dataErrorNote() {
  return `<div class="note note-warn">${ic('alert')}<div><b>सामग्री लोड नहीं हुई।</b> ऐप को किसी वेब सर्वर से खोलें (जैसे <code>npx serve</code>)। सीधे फ़ाइल खोलने पर ब्राउज़र डेटा फ़ाइलें नहीं पढ़ पाता।</div></div>`;
}

// Bottom sheet (modal) and toast.
let sheetCb = null;
function openSheet(html, { label = '', onClose = null } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet gutter" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="sheet-grip"></div>${html}</div></div>`;
  sheetCb = onClose;
  document.body.style.overflow = 'hidden';
  const f = root.querySelector('[autofocus]') || root.querySelector('.sheet input:not([type=checkbox]):not([type=radio]), .sheet textarea');
  if (f) f.focus({ preventScroll: true }); else { const d = root.querySelector('.sheet'); d.tabIndex = -1; d.focus({ preventScroll: true }); }
}
function closeSheet() {
  const root = $('#sheet-root');
  if (!root || !root.innerHTML) return;
  root.innerHTML = '';
  document.body.style.overflow = '';
  const cb = sheetCb; sheetCb = null;
  if (cb) cb();
}
const sheetOpen = () => !!($('#sheet-root') && $('#sheet-root').innerHTML);
const sheetHead = title => `<div class="sheet-head"><h2>${title}</h2><button class="iconbtn" data-act="sheet-close" aria-label="बंद करें">${ic('x')}</button></div>`;
let toastT = 0;
function toast(msg, kind = 'ok') {
  const root = $('#toast-root');
  root.innerHTML = `<div class="toast">${ic(kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : 'info')}<span>${esc(msg)}</span></div>`;
  clearTimeout(toastT);
  toastT = setTimeout(() => { root.innerHTML = ''; }, 2800);
}
function announce(msg) { const el = $('#sr-live'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } }
async function copyText(text, okMsg = 'कॉपी हो गया — अब WhatsApp या कहीं भी पेस्ट करें') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch {
    openSheet(`${sheetHead('टेक्स्ट कॉपी करें')}<textarea class="textarea" id="copy-area" readonly rows="6">${esc(text)}</textarea><p class="small muted" style="margin:0">टेक्स्ट चुनकर कॉपी करें।</p>`, { label: 'टेक्स्ट कॉपी करें' });
    const ta = $('#copy-area'); if (ta) { ta.focus(); ta.select(); }
  }
}
function shareText(text) {
  if (P.mode === 'standalone' && navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  copyText(text);
}

// ───────────────────────────── views: learner ─────────────────────────────
function notifications() {
  const m = M(), t = todayISO(), out = [];
  const todays = m.daysByMd[t.slice(5)] || [];
  if (todays.length) out.push({ icon: 'calendar', text: `आज का दिन: ${todays.map(d => d.t).join(', ')}`, to: 'today' });
  const recent = m.news.filter(n => diffDays(n.date, t) <= 3 && diffDays(n.date, t) >= 0).length;
  if (recent) out.push({ icon: 'newspaper', text: `पिछले 3 दिनों की ${recent} नई करेंट अफेयर्स`, to: 'ca' });
  const due = U.due().length;
  if (due) out.push({ icon: 'rotate', text: `${due} प्रश्न दोहराव के लिए तैयार`, act: 'start-revision' });
  if (!U.s.daily[t] && C.baseState === 'ok') out.push({ icon: 'zap', text: 'आज का दैनिक क्विज अभी बाकी है', act: 'start-daily' });
  return out;
}
function topicChips() {
  const m = M(), out = [];
  for (const d of (m.daysByMd[todayISO().slice(5)] || [])) out.push(`<a class="chip" href="#today">${ic('calendar')}${esc(d.t)}</a>`);
  for (const c of uniq(m.news.slice(0, 8).map(n => n.cat)).slice(0, 4)) out.push(`<button class="chip" data-act="ca-cat" data-cat="${esc(c)}">${esc(c)}</button>`);
  return out.join('') || '<span class="small muted">आज के विषय जल्द आएँगे।</span>';
}
function newsCard(n) {
  const c = catOf(n.cat);
  return `<button class="news" data-act="open-news" data-id="${esc(n.id)}" style="--c1:${c.c1};--c2:${c.c2}"><span class="thumb">${ic(c.icon)}</span><span class="news-main"><span><span class="badge">${esc(n.cat)}</span></span><span class="nt">${esc(n.title)}</span><span class="ns">${esc(n.summary)}</span><span class="more">विस्तार से पढ़ें ${ic('arrow-right')}</span></span></button>`;
}
const onb = { name: '', exam: '', goal: 10 };
function onboardCard() {
  return `<section class="card onb" aria-label="प्रोफ़ाइल बनाएँ"><form data-form="onb" style="display:flex;flex-direction:column;gap:12px">
  <h2 style="font-size:1.1rem;font-weight:800">अपनी तैयारी को निजी बनाएँ</h2>
  <div class="field"><label for="onb-name">आपका नाम</label><input class="input" id="onb-name" data-bind="onb.name" value="${esc(onb.name)}" maxlength="40" placeholder="जैसे: राहुल" autocomplete="given-name"></div>
  <div class="field"><span class="lbl">लक्ष्य परीक्षा</span><div class="chips wrap">${EXAMS.map(x => `<button type="button" class="chip" data-act="onb-exam" data-v="${esc(x)}" aria-pressed="${onb.exam === x}">${esc(x)}</button>`).join('')}</div></div>
  <div class="field"><span class="lbl">रोज़ का लक्ष्य</span><div class="chips">${[10, 20, 30].map(n => `<button type="button" class="chip" data-act="onb-goal" data-v="${n}" aria-pressed="${onb.goal === n}">${n} प्रश्न</button>`).join('')}</div></div>
  <div class="btnrow"><button class="btn btn-cta" type="submit">${ic('check')} सहेजें</button><button class="btn btn-grey" type="button" data-act="onb-skip">बाद में</button></div>
  </form></section>`;
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
      <button class="iconbtn" data-act="notifs" aria-label="सूचनाएँ${notif ? ` (${notif})` : ''}">${ic('bell')}${notif ? `<span class="dot">${notif}</span>` : ''}</button>
      <a class="avatar" href="#profile" aria-label="प्रोफ़ाइल">${name ? esc(initial(name)) : ic('user')}</a>
    </div>
  </div>
  <p class="greet">नमस्कार${name ? `, ${esc(name)}` : ''}! आपका स्वागत है।</p>
  <p class="greet-sub">आज कुछ नया सीखिए और अपना ज्ञान बढ़ाइए।</p>
</div></header>
<main class="home-body gutter">
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <section class="daily" aria-label="आज की तैयारी">
    <div class="ringbox" aria-label="आज ${cnt} में से ${goal} प्रश्न">${ring(cnt / goal, 68, 7)}<b class="tnum">${Math.min(cnt, 999)}<small>/ ${goal} प्रश्न</small></b></div>
    <div><h2>आज की तैयारी कैसी चल रही है?</h2><p>${daily ? `दैनिक क्विज पूरा — ${daily.score}/${daily.total} सही। बढ़िया!` : 'आज का दैनिक क्विज पूरा करें।'}</p></div>
    <div class="daily-foot"><span class="streak" title="लगातार दिनों की तैयारी (रोज़ कम से कम ${STREAK_MIN} प्रश्न)">${ic('flame')} ${st} दिन की स्ट्रीक</span>
      <button class="btn btn-cta btn-sm" data-act="start-daily" ${C.baseState !== 'ok' ? 'disabled' : ''}>${daily ? 'फिर से खेलें' : 'शुरू करें'} ${ic('arrow-right')}</button></div>
  </section>
  <section class="tiles" aria-label="मुख्य विभाग">
    <a class="tile t-blue" href="#quiz">${ic('help')}<b>क्विज</b><span>विषयवार सामान्य ज्ञान</span></a>
    <a class="tile t-green" href="#today">${ic('calendar')}<b>आज का दिन</b><span>महत्वपूर्ण दिवस</span></a>
    <a class="tile t-orange" href="#ca">${ic('newspaper')}<b class="latin">Current Affairs</b><span>दैनिक समसामयिकी</span></a>
    <a class="tile t-purple" href="#mock">${ic('clipboard')}<b>अभ्यास परीक्षा</b><span>मॉक टेस्ट</span></a>
  </section>
  ${!name && !LS.get('onb-skip', false) ? onboardCard() : ''}
  ${due ? `<button class="revise" data-act="start-revision"><span class="ico">${ic('rotate')}</span><span class="row-main"><b>${due} प्रश्न दोहराव के लिए तैयार</b><span class="row-sub">पहले गलत हुए प्रश्न फिर से हल करें — याद पक्की होगी</span></span>${ic('chev-right', 'chev')}</button>` : ''}
  <section aria-label="आज के महत्वपूर्ण विषय"><h2 class="sec-title">${ic('star', 'star')} आज के महत्वपूर्ण विषय</h2><div class="chips" style="margin-top:10px">${C.baseState === 'loading' ? '<div class="skeleton" style="height:34px;width:100%"></div>' : topicChips()}</div></section>
  ${latest.length ? `<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2 class="sec-title">${ic('newspaper')} ताज़ा करेंट अफेयर्स</h2><a class="link" href="#ca">सभी देखें ${ic('chev-right')}</a></div>${latest.map(newsCard).join('')}</section>` : ''}
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>एडमिन पैनल<span class="row-sub">${P.mode === 'standalone' ? 'डेमो: समाचार, AI प्रश्न, समीक्षा और प्रकाशन' : 'समाचार, AI प्रश्न, समीक्षा और प्रकाशन'}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
</main>
${bottomNav('home')}`;
}

function vQuiz() {
  const s = U.s.set;
  const rows = SUBJECTS.map(sj => {
    const st = U.subjStats(sj.k);
    return `<button class="row" data-act="start-subject" data-s="${sj.k}" style="--c:${sj.c}"><span class="row-ic">${ic(sj.icon)}</span><span class="row-main"><span class="row-title">${sj.name}</span><span class="row-sub">${st.seen ? `${st.seen}/${st.total} हल किए · सटीकता ${st.acc}%` : 'अभी शुरू नहीं किया'}</span><span class="minibar"><i style="width:${pct(st.seen, st.total)}%"></i></span></span><span class="count tnum">${st.total} प्रश्न</span>${ic('chev-right', 'chev')}</button>`;
  }).join('');
  return `${appbar('क्विज – विषय चुनें', { back: 'home', right: `<button class="iconbtn" data-act="search-open" aria-label="प्रश्न खोजें">${ic('search')}</button>` })}
<main class="page gutter">
  <div class="seg" role="group" aria-label="क्विज मोड">
    <button data-act="set-mode" data-v="practice" aria-pressed="${s.mode !== 'timed'}">अभ्यास मोड<small>तुरंत उत्तर और व्याख्या</small></button>
    <button data-act="set-mode" data-v="timed" aria-pressed="${s.mode === 'timed'}">समयबद्ध<small>${TIMED_SECONDS} सेकंड प्रति प्रश्न</small></button>
  </div>
  <div class="sec-head"><span class="small muted">एक बार में प्रश्न</span><div class="chips">${[10, 20, 0].map(n => `<button class="chip" data-act="set-count" data-v="${n}" aria-pressed="${(s.count ?? 10) === n}">${n || 'सभी'}</button>`).join('')}</div></div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <div class="list">${C.baseState === 'loading' ? skeletonRows(6) : rows}</div>
  <div class="tip">${ic('bulb')}<p>अपनी पसंद का विषय चुनें और ज्ञान की परीक्षा दें।</p></div>
  <div class="grid2"><button class="btn btn-outline" data-act="start-bookmarked">${ic('bookmark')} बुकमार्क प्रश्न</button><button class="btn btn-outline" data-act="start-revision">${ic('rotate')} दोहराव</button></div>
</main>
${bottomNav('quiz')}`;
}

function explainBox(q, a) {
  const head = a.sel === -1 ? '<span class="ans-bad">समय समाप्त!</span>' : a.ok ? '<span class="ans-ok">सही उत्तर!</span>' : '<span class="ans-bad">गलत उत्तर।</span>';
  const st = S.ai[q.id];
  const aiBtn = AI.available() && !st ? `<button class="link" data-act="ai-explain" data-id="${esc(q.id)}">${ic('sparkles')} AI से और समझें</button>` : '';
  return `<div class="explain">${ic('bulb', 'bulb')}<div style="min-width:0"><h3>${head} व्याख्या:</h3><p>${esc(q.e || 'व्याख्या जल्द जोड़ी जाएगी।')}</p>${st ? `<div class="ai-box" id="ai-${esc(q.id)}">${esc(st.text || 'सोच रहा है…')}</div>${st.err ? `<p class="small" style="color:var(--bad);margin-top:6px">${esc(st.err)}</p>` : ''}` : ''}${aiBtn ? `<div style="margin-top:8px">${aiBtn}</div>` : ''}</div></div>`;
}
function vPlay() {
  if (!S || !S.qs.length) return redirect('quiz');
  const q = S.qs[S.i], n = S.qs.length, a = S.ans[q.id];
  const opts = q.o.map((o, i) => {
    let cls = '', mark = '';
    if (a) {
      if (i === q.a) { cls = 'ok'; mark = `<span class="mark">${ic('check')}</span>`; }
      else if (i === a.sel) { cls = 'bad'; mark = `<span class="mark">${ic('x')}</span>`; }
    }
    return `<button class="opt ${cls}" data-act="answer" data-i="${i}" ${a ? 'disabled' : ''}><span class="key">${LETTERS[i]}.</span><span class="txt">${esc(o)}</span>${mark}</button>`;
  }).join('');
  const bm = U.isBm('q', q.id);
  const last = S.i === n - 1;
  const timer = S.timed && !a ? `<span class="timer" id="qtimer">${ic('clock')} <span id="qtimer-v">${TIMED_SECONDS}</span> से.</span>` : '';
  const subj = SUBJ[q.s] ? SUBJ[q.s].name : '';
  return `${appbar(esc(S.title), { back: S.back, right: `<span class="pill pill-q tnum">प्रश्न ${S.i + 1} / ${n}</span>` })}
<main class="page gutter">
  <div class="qtop">
    <div class="progress" role="progressbar" aria-label="प्रगति" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${S.i + 1}"><i style="width:${((S.i + (a ? 1 : 0)) / n) * 100}%"></i></div>
    <div class="qmeta"><span class="tag">${esc(subj)}${q.t ? ' · ' + esc(q.t) : ''}</span>${timer}</div>
  </div>
  <h2 class="qtext">${esc(q.q)}</h2>
  <div class="opts" role="group" aria-label="विकल्प">${opts}</div>
  ${a ? explainBox(q, a) : ''}
  <div class="qtools">
    <button class="btn btn-sm btn-outline" data-act="bm-q" data-id="${esc(q.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? 'सहेजा गया' : 'बुकमार्क'}</button>
    <button class="btn btn-sm btn-outline" data-act="share-q">${ic('share')} शेयर</button>
    <button class="btn btn-sm btn-outline" data-act="report-q" data-id="${esc(q.id)}">${ic('flag')} त्रुटि बताएँ</button>
  </div>
  <div class="qfoot">
    <button class="btn btn-grey" data-act="prev-q" ${S.i === 0 ? 'disabled' : ''}>${ic('arrow-left')} पिछला प्रश्न</button>
    <button class="btn btn-cta" data-act="next-q">${last ? 'परिणाम देखें' : 'अगला प्रश्न'} ${ic('arrow-right')}</button>
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
  const msg = p >= 0.8 ? 'शानदार! आपकी तैयारी बहुत अच्छी है।' : p >= 0.5 ? 'अच्छा प्रयास! थोड़ा और अभ्यास करें।' : 'कोई बात नहीं — गलत प्रश्न दोहराएँ, सुधार ज़रूर होगा।';
  const review = S.qs.map((q, i) => {
    const a = S.ans[q.id];
    const yours = a ? (a.sel === -1 ? 'समय समाप्त' : q.o[a.sel]) : 'छोड़ा गया';
    return `<div class="review-item"><b>${i + 1}. ${esc(q.q)}</b><span class="ans">सही उत्तर: <span class="ans-ok">${esc(q.o[q.a])}</span></span>${a && a.ok ? '' : `<span class="ans">आपका उत्तर: <span class="ans-bad">${esc(yours)}</span></span>`}<span class="small muted">${esc(q.e || '')}</span></div>`;
  }).join('');
  return `${appbar('परिणाम', { back: S.back })}
<main class="page gutter">
  <section class="card result-hero">
    <div class="big-ring">${ring(p, 150, 12, p >= 0.5 ? 'var(--ring)' : 'var(--bad-solid)')}<b class="tnum">${c}/${n}<small>सही उत्तर</small></b></div>
    <h2 style="font-family:var(--font-display);font-size:1.35rem;margin:6px 0 0">${esc(S.title)}</h2>
    <p class="muted" style="margin:0">${msg}</p>
    <span class="pill pill-gold">+${S.xp} XP</span>
  </section>
  <div class="stats">
    <div class="stat s-ok"><b>${c}</b><span>सही</span></div><div class="stat s-bad"><b>${w}</b><span>गलत</span></div><div class="stat"><b>${sk}</b><span>छोड़े</span></div>
    <div class="stat"><b>${pct(c, n)}%</b><span>सटीकता</span></div><div class="stat"><b class="tnum">${fmtSecs(secs)}</b><span>समय</span></div><div class="stat"><b>${U.streak()}</b><span>दिन की स्ट्रीक</span></div>
  </div>
  <div class="btnrow">${w + sk ? `<button class="btn btn-cta" data-act="retry-wrong">${ic('rotate')} गलत/छोड़े प्रश्न दोबारा</button>` : ''}<button class="btn btn-outline" data-act="share-result">${ic('share')} स्कोर शेयर करें</button></div>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} उत्तरों की समीक्षा</h2><div class="list">${review}</div></section>
  <div class="grid2"><a class="btn btn-grey" href="#quiz">विषय सूची</a><a class="btn btn-navy" href="#home">होम</a></div>
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
  return `${appbar(`${ic('newspaper')} Current Affairs`, { back: 'home', right: '<span class="pill pill-green">दैनिक अपडेट</span>' })}
<main class="page gutter">
  <div class="datebar">${ic('calendar')} <span class="tnum">${fmtDate(t)}</span></div>
  <p class="small muted" style="margin:-10px 0 0;text-align:center">${todayN ? `आज की ${todayN} नई ख़बरें` : `आज की ख़बरें अभी प्रकाशित नहीं हुईं${latest ? ` · नवीनतम: ${fmtDate(latest, false)}` : ''}`}</p>
  ${caQs ? `<button class="ca-cta" data-act="start-ca">${ic('zap')}<span class="row-main"><b>करेंट अफेयर्स क्विज</b><span>${Math.min(caQs, 10)} प्रश्न · नवीनतम ख़बरों से</span></span>${ic('arrow-right')}</button>` : ''}
  <div class="chips" role="group" aria-label="श्रेणी चुनें"><button class="chip" data-act="ca-cat" data-cat="" aria-pressed="${!caCat}">सभी</button>${uniq(m.news.map(n => n.cat)).map(c => `<button class="chip" data-act="ca-cat" data-cat="${esc(c)}" aria-pressed="${caCat === c}">${esc(c)}</button>`).join('')}</div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${C.baseState === 'loading' ? skeletonCards(3) : feed || emptyState('newspaper', 'इस श्रेणी में अभी कोई ख़बर नहीं', '')}
</main>
${bottomNav('')}`;
}
function openNews(id) {
  const m = M(), n = m.newsById.get(id);
  if (!n) return;
  const c = catOf(n.cat);
  const qs = (m.bySubj.ca || []).filter(q => q.n === n.id);
  const bm = U.isBm('n', n.id);
  const src = n.source || {}, url = safeUrl(src.url);
  openSheet(`${sheetHead(esc(n.title))}
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge" style="--c2:${c.c2}">${esc(n.cat)}</span><span class="small muted">${fmtDate(n.date)} · ${weekday(n.date)}</span></div>
  <p style="margin:0;font-size:1.05rem">${esc(n.summary)}</p>
  ${Array.isArray(n.facts) && n.facts.length ? `<div class="card" style="box-shadow:none;background:var(--surface-2)"><h3 class="sec-title" style="font-size:1rem;margin-bottom:10px">${ic('target')} परीक्षा के लिए मुख्य तथ्य</h3><ul class="facts">${n.facts.map(f => `<li>${ic('check')}<span>${esc(f)}</span></li>`).join('')}</ul></div>` : ''}
  ${src.name ? `<p class="small muted" style="margin:0">स्रोत: ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(src.name)} ${ic('external')}</a>` : esc(src.name)}</p>` : ''}
  <div class="btnrow">${qs.length ? `<button class="btn btn-cta" data-act="news-quiz" data-id="${esc(n.id)}">${ic('help')} इस ख़बर से ${qs.length} प्रश्न</button>` : ''}<button class="btn btn-outline" data-act="bm-n" data-id="${esc(n.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? 'सहेजा गया' : 'सहेजें'}</button><button class="btn btn-outline" data-act="share-news" data-id="${esc(n.id)}">${ic('share')} शेयर</button></div>`, { label: n.title });
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
    card = `<div class="card">${emptyState('calendar', 'इस तारीख़ के लिए कोई प्रमुख दिवस दर्ज नहीं है', nx ? `अगला महत्वपूर्ण दिवस: <b>${esc(nx.t)}</b> (${fmtMD(nx.md)})` : '')}${nx ? `<button class="btn btn-navy btn-block" data-act="day-goto" data-iso="${nx.iso}">${esc(nx.t)} देखें ${ic('arrow-right')}</button>` : ''}</div>`;
  } else {
    const k = kindOf(d.k);
    card = `${entries.length > 1 ? `<div class="chips" role="group" aria-label="इस दिन के दिवस">${entries.map((e, i) => `<button class="chip" data-act="day-pick" data-i="${i}" aria-pressed="${e === d}">${esc(e.t)}</button>`).join('')}</div>` : ''}
    <article class="daycard">
      <div class="day-top">
        <div class="day-art"><span class="dn tnum">${dd.getDate()}</span><span class="dm">${HI_MONTHS[dd.getMonth()]}</span>${ic(k.icon)}</div>
        <div class="day-title"><span><span class="badge" style="--c2:${k.c}">${esc(d.k)}</span></span><h2>${esc(d.t)}</h2><span class="small" style="color:var(--muted)">(${fmtMD(d.md)}${d.y ? ` · ${k.y}: ${d.y}` : ''})</span></div>
      </div>
      <div class="day-sec">${ic('book-open')}<div><h3>शुरुआत का इतिहास</h3><p>${esc(d.h)}</p></div></div>
      ${d.o ? `<div class="day-sec">${ic('target')}<div><h3>उद्देश्य</h3><p>${esc(d.o)}</p></div></div>` : ''}
      ${Array.isArray(d.f) && d.f.length ? `<div class="day-sec">${ic('star')}<div><h3>महत्वपूर्ण तथ्य</h3><ul>${d.f.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>` : ''}
    </article>
    ${rel ? `<button class="btn btn-navy btn-block" data-act="day-quiz" data-md="${md}">इस दिन से जुड़े ${rel} प्रश्न देखें ${ic('arrow-right')}</button>` : ''}`;
  }
  return `${appbar(`${ic('calendar')} आज का दिन`, { back: 'home', right: `<button class="iconbtn" data-act="day-calendar" aria-label="कैलेंडर से तारीख़ चुनें">${ic('list')}</button>` })}
<main class="page gutter">
  <div class="daynav">
    <button class="iconbtn" data-act="day-step" data-v="-1" aria-label="पिछला दिन">${ic('chev-left')}</button>
    <div class="when tnum">${isToday ? 'आज, ' : ''}${fmtDate(iso, false)}<small>${HI_DAYS[dd.getDay()]}${isToday ? '' : ' · <button class="link" data-act="day-today">आज पर लौटें</button>'}</small></div>
    <button class="iconbtn" data-act="day-step" data-v="1" aria-label="अगला दिन">${ic('chev-right')}</button>
  </div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${card}
  ${up.length ? `<section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1.05rem">${ic('calendar')} आने वाले महत्वपूर्ण दिवस</h2>${up.map(e => `<button class="upc link" style="color:inherit;font-weight:600;text-align:left" data-act="day-goto" data-iso="${e.iso}"><span class="d"><b class="tnum">${parseISO(e.iso).getDate()}</b><span>${HI_MONTHS[parseISO(e.iso).getMonth()].slice(0, 4)}</span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(e.t)}</span><span class="row-sub">${esc(e.k)} · ${diffDays(t, e.iso) === 1 ? 'कल' : diffDays(t, e.iso) > 0 ? `${diffDays(t, e.iso)} दिन बाद` : fmtDate(e.iso, false)}</span></span></button>`).join('')}</section>` : ''}
</main>
${bottomNav('')}`;
}
function openDayCalendar(month) {
  const m = M();
  const cur = month ?? parseISO(dayCursor || todayISO()).getMonth();
  const year = parseISO(todayISO()).getFullYear();
  const items = m.days.filter(d => Number(d.md.slice(0, 2)) === cur + 1);
  openSheet(`${sheetHead('महत्वपूर्ण दिवस कैलेंडर')}
  <div class="chips">${HI_MONTHS.map((mn, i) => `<button class="chip" data-act="cal-month" data-v="${i}" aria-pressed="${i === cur}">${mn}</button>`).join('')}</div>
  <div class="list">${items.length ? items.map(d => `<button class="row" data-act="day-goto" data-iso="${year}-${d.md}"><span class="upc"><span class="d"><b class="tnum">${Number(d.md.slice(3))}</b><span>${HI_MONTHS[cur].slice(0, 4)}</span></span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(d.t)}</span><span class="row-sub">${esc(d.k)}</span></span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('calendar', 'इस महीने में कोई दिवस दर्ज नहीं', '')}</div>`, { label: 'कैलेंडर' });
  const el = $(`[data-act="cal-month"][aria-pressed="true"]`); if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function vMock() {
  if (E && !E.submitted && Date.now() > E.endsAt) { setTimeout(() => submitExam(true), 0); }
  const cards = MOCKS.map(mk => {
    const hist = U.s.mocks.filter(h => h.id === mk.id);
    const n = C.baseState === 'ok' ? mockQuestionIds(mk).length : 0;
    const best = hist.length ? Math.max(...hist.map(h => h.score)) : null;
    return `<article class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-head"><h2 style="font-size:1.12rem;font-weight:800;line-height:1.35">${esc(mk.title)}</h2>${hist.length ? `<span class="tag">${hist.length} बार दिया</span>` : '<span class="tag tag-live">नया</span>'}</div>
      <p class="small muted" style="margin:0">${esc(mk.desc)}</p>
      <div class="chips wrap"><span class="chip">${ic('help')} ${n} प्रश्न</span><span class="chip">${ic('clock')} ${mk.mins} मिनट</span><span class="chip">${ic('target')} +${mk.pos} / −${mk.neg}</span></div>
      ${best != null ? `<p class="small" style="margin:0">सर्वश्रेष्ठ स्कोर: <b>${fmtScore(best)}</b> / ${n * mk.pos}</p>` : ''}
      <button class="btn btn-cta" data-act="mock-intro" data-id="${mk.id}" ${n < 5 ? 'disabled' : ''}>${ic('play')} परीक्षा शुरू करें</button>
    </article>`;
  }).join('');
  const resume = E && !E.submitted ? `<div class="note note-warn">${ic('clock')}<div><b>एक परीक्षा जारी है: ${esc(E.title)}</b><br><button class="link" data-act="exam-resume">जारी रखें ${ic('arrow-right')}</button></div></div>` : '';
  const hist = U.s.mocks.slice(0, 5).map(h => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(h.title)}</span><span class="row-sub">${fmtDate(h.date)} · सही ${h.c}, गलत ${h.w}, छोड़े ${h.u}</span></span><b class="tnum">${fmtScore(h.score)}/${h.max}</b></div>`).join('');
  return `${appbar(`${ic('clipboard')} अभ्यास परीक्षा`, { back: 'home' })}
<main class="page gutter">
  <div class="note">${ic('info')}<div>परीक्षा जैसा अनुभव: समय-सीमा, नेगेटिव मार्किंग, प्रश्न पैलेट और "समीक्षा हेतु चिह्नित" विकल्प।</div></div>
  ${resume}
  ${C.baseState === 'loading' ? skeletonCards(2) : cards}
  ${hist ? `<section><h2 class="sec-title" style="margin-bottom:10px">${ic('chart')} पिछले प्रयास</h2><div class="list">${hist}</div></section>` : ''}
</main>
${bottomNav('')}`;
}
function openMockIntro(id) {
  const mk = MOCKS.find(x => x.id === id);
  if (!mk) return;
  const n = mockQuestionIds(mk).length;
  openSheet(`${sheetHead(esc(mk.title))}
  <ul class="facts">
    <li>${ic('check')}<span>कुल ${n} प्रश्न, समय ${mk.mins} मिनट। समय पूरा होते ही परीक्षा अपने-आप सबमिट होगी।</span></li>
    <li>${ic('check')}<span>सही उत्तर पर +${mk.pos} अंक, गलत उत्तर पर −${mk.neg} अंक। छोड़े गए प्रश्न पर 0।</span></li>
    <li>${ic('check')}<span>"समीक्षा हेतु चिह्नित" से प्रश्न बाद में देखने के लिए निशान लगाएँ। चिह्नित प्रश्न का चुना हुआ उत्तर भी गिना जाएगा।</span></li>
    <li>${ic('check')}<span>ऊपर ${ic('grid')} पैलेट से किसी भी प्रश्न पर सीधे जाएँ।</span></li>
  </ul>
  <label class="check"><input type="checkbox" id="mock-agree"> मैंने सभी निर्देश पढ़ लिए हैं।</label>
  <button class="btn btn-cta btn-block" id="mock-start" data-act="mock-start" data-id="${mk.id}" disabled>${ic('play')} परीक्षा शुरू करें</button>`, { label: mk.title });
}

function vExam() {
  if (!E || E.submitted) return redirect('mock');
  const id = E.qs[E.i], q = examQ(id);
  if (!q) { setTimeout(() => examMove(E.i + 1 < E.qs.length ? E.i + 1 : 0), 0); return ''; }
  const st = E.st[id] || {}, n = E.qs.length;
  const remaining = Math.max(0, E.endsAt - Date.now());
  const opts = q.o.map((o, i) => `<button class="opt ${st.sel === i ? 'sel' : ''}" data-act="exam-sel" data-i="${i}" aria-pressed="${st.sel === i}"><span class="key">${LETTERS[i]}.</span><span class="txt">${esc(o)}</span></button>`).join('');
  return `<header class="exambar"><div class="exambar-in gutter">
    <button class="iconbtn" data-act="exam-exit" aria-label="परीक्षा से बाहर जाएँ">${ic('x')}</button>
    <span class="t">${esc(E.title)}</span>
    <span class="timer tnum ${remaining < 60000 ? 'low' : ''}" id="etimer">${ic('clock')} <span id="etimer-v">${fmtSecs(Math.ceil(remaining / 1000))}</span></span>
    <button class="iconbtn" data-act="exam-palette" aria-label="प्रश्न पैलेट">${ic('grid')}</button>
  </div></header>
<main class="page gutter">
  <div class="qmeta"><b class="tnum">प्रश्न ${E.i + 1} / ${n}</b><span class="tag">${esc(SUBJ[q.s] ? SUBJ[q.s].name : '')}</span><span class="small muted tnum">+${E.pos} / −${E.neg}</span></div>
  <div class="progress" aria-hidden="true"><i style="width:${(examCounts().ans / n) * 100}%"></i></div>
  <h2 class="qtext">${esc(q.q)}</h2>
  <div class="opts" role="group" aria-label="विकल्प">${opts}</div>
  ${st.mk ? `<p class="small" style="margin:0;color:var(--violet);font-weight:700">${ic('flag')} यह प्रश्न समीक्षा हेतु चिह्नित है</p>` : ''}
</main>
<div class="exam-actions gutter">
  <button class="btn btn-sm btn-outline" data-act="exam-mark">${ic('flag')} ${st.mk ? 'चिह्न हटाएँ' : 'समीक्षा हेतु चिह्नित'}</button>
  <button class="btn btn-sm btn-outline" data-act="exam-clear" ${st.sel == null ? 'disabled' : ''}>${ic('rotate')} उत्तर हटाएँ</button>
  <button class="btn btn-grey" data-act="exam-prev" ${E.i === 0 ? 'disabled' : ''}>${ic('arrow-left')} पिछला</button>
  <button class="btn btn-cta" data-act="exam-next">${E.i === n - 1 ? 'सबमिट करें' : 'सेव करें और आगे'} ${ic('arrow-right')}</button>
</div>`;
}
function paletteHtml() {
  const k = examCounts();
  return `${sheetHead('प्रश्न पैलेट')}
  <div class="legend">
    <span><i style="background:var(--ok-solid);border-color:var(--ok-solid)"></i>उत्तर दिया (${k.ans})</span>
    <span><i style="background:var(--bad-solid);border-color:var(--bad-solid)"></i>उत्तर नहीं दिया (${k.na})</span>
    <span><i style="background:var(--violet);border-color:var(--violet);border-radius:50%"></i>समीक्षा हेतु (${k.mk})</span>
    <span><i></i>नहीं देखा (${k.nv})</span>
  </div>
  <div class="pal">${E.qs.map((id, i) => { const s = E.st[id] || {}; const cls = s.mk ? (s.sel != null ? 'p-mka' : 'p-mk') : s.sel != null ? 'p-ans' : s.v ? 'p-na' : ''; return `<button class="${cls} ${i === E.i ? 'p-cur' : ''}" data-act="exam-go" data-i="${i}" aria-label="प्रश्न ${i + 1}">${i + 1}</button>`; }).join('')}</div>
  <button class="btn btn-cta btn-block" data-act="exam-submit-ask">${ic('send')} परीक्षा सबमिट करें</button>`;
}
function submitAskHtml() {
  const k = examCounts();
  return `${sheetHead('परीक्षा सबमिट करें?')}
  <div class="stats"><div class="stat s-ok"><b>${k.ans}</b><span>उत्तर दिए</span></div><div class="stat s-bad"><b>${E.qs.length - k.ans}</b><span>बाकी</span></div><div class="stat"><b>${k.mk}</b><span>चिह्नित</span></div></div>
  <p class="muted" style="margin:0">सबमिट करने के बाद उत्तर नहीं बदले जा सकेंगे।</p>
  <div class="grid2"><button class="btn btn-grey" data-act="sheet-close">वापस जाएँ</button><button class="btn btn-cta" data-act="exam-submit">हाँ, सबमिट करें</button></div>`;
}
function vExamResult() {
  const R = lastExam;
  if (!R || !R.ex) return redirect('mock');
  const ex = R.ex, p = R.max ? Math.max(0, R.score) / R.max : 0;
  const bars = Object.entries(R.bySubj).map(([s, b]) => `<div class="bar-row" style="--c:${SUBJ[s] ? SUBJ[s].c : 'var(--brand)'}"><span>${esc(SUBJ[s] ? SUBJ[s].name : s)}</span><span class="track"><i style="width:${pct(b.c, b.n)}%"></i></span><b>${b.c}/${b.n}</b></div>`).join('');
  const sol = ex.qs.map((id, i) => {
    const q = examQ(id, ex);
    if (!q) return '';
    const s = ex.st[id] || {};
    const yours = s.sel == null ? 'छोड़ा गया' : q.o[s.sel];
    const ok = s.sel === q.a;
    return `<div class="review-item"><b>${i + 1}. ${esc(q.q)}</b><span class="ans">सही उत्तर: <span class="ans-ok">${esc(q.o[q.a])}</span></span>${ok ? `<span class="ans ans-ok">+${ex.pos}</span>` : `<span class="ans">आपका उत्तर: <span class="ans-bad">${esc(yours)}</span>${s.sel == null ? '' : ` <span class="ans-bad">(−${ex.neg})</span>`}</span>`}<span class="small muted">${esc(q.e || '')}</span></div>`;
  }).join('');
  return `${appbar('परीक्षा परिणाम', { back: 'mock' })}
<main class="page gutter">
  <section class="card result-hero">
    <div class="big-ring">${ring(p, 150, 12, p >= 0.5 ? 'var(--ring)' : 'var(--bad-solid)')}<b class="tnum">${fmtScore(R.score)}<small>/ ${R.max} अंक</small></b></div>
    <h2 style="font-family:var(--font-display);font-size:1.3rem;margin:6px 0 0">${esc(ex.title)}</h2>
    <p class="muted" style="margin:0">नेगेटिव मार्किंग सहित स्कोर</p>
  </section>
  <div class="stats">
    <div class="stat s-ok"><b>${R.c}</b><span>सही</span></div><div class="stat s-bad"><b>${R.w}</b><span>गलत</span></div><div class="stat"><b>${R.u}</b><span>छोड़े</span></div>
    <div class="stat"><b>${pct(R.c, R.c + R.w)}%</b><span>सटीकता</span></div><div class="stat"><b>${R.c + R.w}/${R.n}</b><span>प्रयास</span></div><div class="stat"><b class="tnum">${fmtSecs(R.timeSec)}</b><span>समय</span></div>
  </div>
  <section class="card"><h2 class="sec-title" style="font-size:1.05rem;margin-bottom:12px">${ic('chart')} विषयवार प्रदर्शन</h2><div class="bars">${bars}</div></section>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} समाधान</h2><div class="list">${sol}</div></section>
  <div class="grid2"><button class="btn btn-cta" data-act="mock-intro" data-id="${esc(ex.id)}">${ic('rotate')} फिर से दें</button><a class="btn btn-grey" href="#mock">सभी परीक्षाएँ</a></div>
</main>`;
}

let bmTab = 'q';
function vBookmarks() {
  const m = M();
  const qs = U.s.bm.q.map(id => m.byId.get(id)).filter(Boolean);
  const ns = U.s.bm.n.map(id => m.newsById.get(id)).filter(Boolean);
  const qList = qs.length
    ? `<button class="btn btn-cta" data-act="start-bookmarked">${ic('play')} इन ${qs.length} प्रश्नों का अभ्यास करें</button><div class="list">${qs.map(q => `<div class="review-item"><b>${esc(q.q)}</b><span class="ans">उत्तर: <span class="ans-ok">${esc(q.o[q.a])}</span></span><span class="small muted">${esc(SUBJ[q.s] ? SUBJ[q.s].name : '')}</span><div><button class="link" data-act="bm-q" data-id="${esc(q.id)}" style="color:var(--bad)">${ic('trash')} हटाएँ</button></div></div>`).join('')}</div>`
    : `<div class="card">${emptyState('bookmark', 'अभी कोई प्रश्न सहेजा नहीं गया', 'क्विज खेलते समय "बुकमार्क" दबाकर कठिन प्रश्न यहाँ सहेजें।')}</div>`;
  const nList = ns.length ? ns.map(newsCard).join('') : `<div class="card">${emptyState('newspaper', 'कोई ख़बर सहेजी नहीं गई', 'करेंट अफेयर्स में किसी ख़बर को खोलकर "सहेजें" दबाएँ।')}</div>`;
  return `${appbar(`${ic('bookmark')} बुकमार्क`)}
<main class="page gutter">
  <div class="seg" role="group" aria-label="बुकमार्क प्रकार"><button data-act="bm-tab" data-v="q" aria-pressed="${bmTab === 'q'}">प्रश्न (${qs.length})</button><button data-act="bm-tab" data-v="n" aria-pressed="${bmTab === 'n'}">समाचार (${ns.length})</button></div>
  ${bmTab === 'q' ? qList : nList}
</main>
${bottomNav('bookmarks')}`;
}

function weekBars() {
  const t = todayISO(), goal = U.s.goal || 10;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const counts = days.map(d => U.s.days[d] || 0);
  const max = Math.max(goal, ...counts);
  return `<div class="week" role="img" aria-label="पिछले 7 दिनों में हल किए प्रश्न: ${counts.join(', ')}"><span class="goal-line" style="bottom:${(goal / max) * 100 * 0.72 + 14}%"></span>${days.map((d, i) => `<div class="col"><em>${counts[i] || ''}</em><span class="b ${counts[i] >= goal ? 'met' : ''}" style="height:${Math.max(3, (counts[i] / max) * 72)}%"></span><span>${d === t ? 'आज' : HI_DAYS_SHORT[parseISO(d).getDay()]}</span></div>`).join('')}</div>`;
}
function vProfile() {
  const tot = U.totals(), st = U.streak(), s = U.s;
  const name = s.name.trim();
  const subj = SUBJECTS.map(sj => { const x = U.subjStats(sj.k); return `<div class="bar-row" style="--c:${sj.c}"><span>${sj.name}</span><span class="track"><i style="width:${pct(x.right, x.total)}%"></i></span><b>${pct(x.right, x.total)}%</b></div>`; }).join('');
  const where = P.mode === 'standalone' ? 'इसी डिवाइस के ब्राउज़र में' : P.progressRemote ? 'आपके खाते में (हर डिवाइस पर)' : 'इसी ब्राउज़र में';
  const scales = [[0.9, 'छोटा'], [1, 'सामान्य'], [1.12, 'बड़ा'], [1.25, 'बहुत बड़ा']];
  return `${appbar(`${ic('user')} प्रोफ़ाइल`)}
<main class="page gutter">
  <section class="card admin-hero" style="display:flex;align-items:center;gap:14px">
    <span class="avatar" style="width:58px;height:58px;font-size:1.5rem">${name ? esc(initial(name)) : ic('user')}</span>
    <span class="row-main"><span class="row-title" style="font-size:1.2rem">${name ? esc(name) : 'विद्यार्थी'}</span><span class="row-sub" style="color:rgba(255,255,255,.85)">${s.exam ? `लक्ष्य: ${esc(s.exam)}` : 'लक्ष्य परीक्षा चुनें'} · रोज़ ${s.goal} प्रश्न</span></span>
    <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff" data-act="profile-edit">${ic('pencil')} बदलें</button>
  </section>
  <div class="stats">
    <div class="stat"><b>${tot.attempts}</b><span>कुल उत्तर</span></div><div class="stat s-ok"><b>${tot.acc}%</b><span>सटीकता</span></div><div class="stat"><b>${s.xp}</b><span>XP</span></div>
    <div class="stat"><b>${st}</b><span>स्ट्रीक (दिन)</span></div><div class="stat"><b>${s.best || 0}</b><span>सर्वश्रेष्ठ स्ट्रीक</span></div><div class="stat"><b>${s.mocks.length}</b><span>मॉक टेस्ट</span></div>
  </div>
  <section class="card"><div class="sec-head" style="margin-bottom:6px"><h2 class="sec-title" style="font-size:1.05rem">${ic('chart')} पिछले 7 दिन</h2><span class="small muted">लक्ष्य: ${s.goal}/दिन</span></div>${weekBars()}<p class="small muted" style="margin:8px 0 0">रोज़ कम से कम ${STREAK_MIN} प्रश्न हल करने पर स्ट्रीक बढ़ती है।</p></section>
  <section class="card"><h2 class="sec-title" style="font-size:1.05rem;margin-bottom:12px">${ic('target')} विषयवार महारत</h2><div class="bars">${subj}</div><p class="small muted" style="margin:10px 0 0">हर विषय में पिछली बार सही हल किए प्रश्नों का प्रतिशत।</p></section>
  <section class="card" style="display:flex;flex-direction:column;gap:14px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('sliders')} सेटिंग्स</h2>
    <div class="field"><span class="lbl">रोज़ का लक्ष्य</span><div class="chips">${[10, 20, 30].map(n => `<button class="chip" data-act="set-goal" data-v="${n}" aria-pressed="${s.goal === n}">${n} प्रश्न</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">${ic('type')} अक्षरों का आकार</span><div class="chips">${scales.map(([v, l]) => `<button class="chip" data-act="set-scale" data-v="${v}" aria-pressed="${Number(s.set.scale) === v}">${l}</button>`).join('')}</div></div>
    ${P.mode === 'standalone' ? `<div class="field"><span class="lbl">${ic('moon')} थीम</span><div class="chips">${[['system', 'सिस्टम'], ['light', 'लाइट'], ['dark', 'डार्क']].map(([v, l]) => `<button class="chip" data-act="set-theme" data-v="${v}" aria-pressed="${s.set.theme === v}">${l}</button>`).join('')}</div></div>` : ''}
    <p class="small muted" style="margin:0">${ic('lock')} आपकी प्रगति ${where} सहेजी जाती है।</p>
  </section>
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>एडमिन पैनल<span class="row-sub">${P.mode === 'standalone' ? 'डेमो: बदलाव इसी ब्राउज़र में' : 'सामग्री, AI प्रश्न, समीक्षा और प्रकाशन'}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
  <button class="btn btn-danger" data-act="reset-ask">${ic('trash')} प्रगति रीसेट करें</button>
  <p class="small muted" style="text-align:center;margin:0">MY QUIZ · संस्करण 1.0</p>
</main>
${bottomNav('profile')}`;
}
function profileSheet() {
  onb.exam = U.s.exam; onb.goal = U.s.goal;
  openSheet(`${sheetHead('प्रोफ़ाइल बदलें')}<form data-form="profile" style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><label for="pf-name">आपका नाम</label><input class="input" id="pf-name" maxlength="40" value="${esc(U.s.name)}" autocomplete="given-name"></div>
  <div class="field"><span class="lbl">लक्ष्य परीक्षा</span><div class="chips wrap" id="pf-exam">${EXAMS.map(x => `<button type="button" class="chip" data-act="onb-exam" data-v="${esc(x)}" aria-pressed="${onb.exam === x}">${esc(x)}</button>`).join('')}</div></div>
  <button class="btn btn-cta btn-block" type="submit">${ic('check')} सहेजें</button></form>`, { label: 'प्रोफ़ाइल बदलें' });
}

// ───────────────────────────── views: admin ─────────────────────────────
function vNoAdmin() {
  return `${appbar('एडमिन पैनल', { back: 'profile' })}<main class="page gutter"><div class="card">${emptyState('lock', 'यह भाग केवल संपादकों के लिए है', P.ready ? 'सामग्री जोड़ने या प्रकाशित करने के लिए इस ऐप के संपादक से पहुँच माँगें।' : 'आपकी पहुँच जाँची जा रही है…')}</div></main>`;
}
const ADMIN_ROUTES = new Set(['admin', 'admin-ai', 'admin-review', 'admin-publish', 'admin-bank', 'admin-news', 'admin-days']);
function cmsNote() {
  if (P.mode === 'standalone') return `<div class="note">${ic('info')}<div><b>डेमो मोड:</b> यहाँ किए बदलाव केवल इसी ब्राउज़र में सहेजे जाते हैं। असली ऐप में यही पैनल सर्वर से जुड़ेगा।</div></div>`;
  if (C.cmsState === 'loading') return `<div class="note">${ic('clock')}<div>ड्राफ़्ट लोड हो रहे हैं…</div></div>`;
  if (C.cmsState === 'slow' || C.cmsState === 'error') return `<div class="note note-warn">${ic('alert')}<div>सर्वर से ड्राफ़्ट अभी नहीं मिल पाए। दिख रही जानकारी पुरानी हो सकती है।</div></div>`;
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
  const act = (href, icon, label, cnt = 0) => `<a class="act" href="#${href}"><span class="ai">${ic(icon)}</span><span>${label}</span>${ic('chev-right', 'chev')}${cnt ? `<span class="cnt">${cnt}</span>` : ''}</a>`;
  return `<header class="appbar admin-hero"><div class="appbar-in gutter">
    <div class="logo" style="flex:1;font-size:1.45rem">${capLogo()}<span>MY <span class="q">QUIZ</span><small>ADMIN PANEL</small></span></div>
    <a class="iconbtn" href="#home" aria-label="ऐप पर लौटें" title="ऐप पर लौटें">${ic('settings')}</a>
  </div></header>
<main class="page gutter">
  <h2 style="margin:0;text-align:center;font-size:1.2rem;font-weight:800">नमस्कार! आज का कार्य</h2>
  ${cmsNote()}
  <div class="stat3">
    <a class="astat a-blue" href="#admin-news" style="text-decoration:none">${ic('newspaper')}<span>इस सप्ताह के समाचार</span><b>${newsWeek}</b></a>
    <a class="astat a-green" href="#admin-review" style="text-decoration:none">${ic('sparkles')}<span>AI प्रश्न (समीक्षा हेतु)</span><b>${aiPending}</b></a>
    <a class="astat a-violet" href="#admin-publish" style="text-decoration:none">${ic('rocket')}<span>लाइव सामग्री</span><b>${live}</b></a>
  </div>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h3 class="sec-title" style="font-size:1rem">${ic('shield')} सामग्री पाइपलाइन</h3>
    <div class="pipeline"><div class="pipe"><b>${newsWeek}</b>स्रोत समाचार</div><div class="pipe"><b>${aiPending}</b>AI ड्राफ़्ट</div><div class="pipe"><b>${pending.length}</b>समीक्षा बाकी</div><div class="pipe"><b>${approved}</b>प्रकाशन हेतु</div></div>
    <p class="small muted" style="margin:0">हर AI प्रश्न मानव समीक्षा के बाद ही विद्यार्थियों तक पहुँचता है।</p></section>
  <h3 class="sec-title">${ic('sliders')} आपके कार्य के विकल्प</h3>
  <div class="actions2">
    ${act('admin-news', 'newspaper', 'आज के समाचार देखें')}
    ${act('admin-days', 'calendar', 'आज का दिन')}
    ${act('admin-ai', 'sparkles', 'AI से प्रश्न बनवाएँ')}
    ${act('admin-review', 'shield', 'सामग्री की जाँच करें', pending.length + reports)}
    ${act('admin-bank', 'book', 'GK प्रश्न बैंक')}
    ${act('admin-publish', 'send', 'प्रकाशित करें', approved)}
  </div>
</main>`;
}

const aiForm = { src: 'ca', newsId: '', dayId: '', text: '', subj: 'ca', n: 5, level: 2 };
let aiGen = { status: 'idle', items: [], err: '', sel: new Set() };
const newsToText = n => `${n.title}\nतारीख़: ${fmtDate(n.date)}\n${n.summary}\n${(n.facts || []).map(f => '• ' + f).join('\n')}`;
const dayToText = d => `${d.t} (${fmtMD(d.md)})\n${d.h}\n${d.o ? 'उद्देश्य: ' + d.o + '\n' : ''}${(d.f || []).map(f => '• ' + f).join('\n')}`;
function vAdminAI() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M();
  if (aiForm.src === 'ca' && !aiForm.newsId && m.news[0]) { aiForm.newsId = m.news[0].id; aiForm.text = newsToText(m.news[0]); }
  const t = todayISO();
  const daysSorted = m.days.slice().sort((a, b) => { const da = (a.md >= t.slice(5) ? 0 : 1) + a.md, db = (b.md >= t.slice(5) ? 0 : 1) + b.md; return da.localeCompare(db); });
  if (aiForm.src === 'day' && !aiForm.dayId && daysSorted[0]) { aiForm.dayId = daysSorted[0].id; aiForm.text = dayToText(daysSorted[0]); }
  const avail = AI.available();
  return `${adminBar('AI से प्रश्न बनवाएँ')}
<main class="page gutter">
  ${avail ? '' : `<div class="note note-warn">${ic('alert')}<div><b>AI अभी जुड़ा नहीं है।</b> ${P.mode === 'standalone' ? 'स्टैंडअलोन संस्करण में <code>window.MYQUIZ_CONFIG = { aiEndpoint: "…" }</code> सेट करें (README देखें)। तब तक "GK प्रश्न बैंक" से प्रश्न हाथ से जोड़ें।' : 'इस दृश्य में Claude उपलब्ध नहीं है।'}</div></div>`}
  <div class="note">${ic('shield')}<div>AI केवल नीचे दिए स्रोत पाठ से प्रश्न बनाता है। हर प्रश्न प्रकाशन से पहले "सामग्री की जाँच" में मानव समीक्षा से गुज़रता है।</div></div>
  <section class="card" style="display:flex;flex-direction:column;gap:14px">
    <div class="field"><span class="lbl">स्रोत चुनें</span><div class="chips">${[['ca', 'करेंट अफेयर्स'], ['day', 'आज का दिन'], ['text', 'अपना पाठ']].map(([v, l]) => `<button class="chip" data-act="ai-src" data-v="${v}" aria-pressed="${aiForm.src === v}">${l}</button>`).join('')}</div></div>
    ${aiForm.src === 'ca' ? `<div class="field"><label for="ai-news">समाचार</label><select class="select" id="ai-news" data-change="ai-news">${m.news.map(n => `<option value="${esc(n.id)}" ${n.id === aiForm.newsId ? 'selected' : ''}>${fmtDate(n.date, false)} — ${esc(n.title)}</option>`).join('')}</select></div>` : ''}
    ${aiForm.src === 'day' ? `<div class="field"><label for="ai-day">दिवस</label><select class="select" id="ai-day" data-change="ai-day">${daysSorted.map(d => `<option value="${esc(d.id)}" ${d.id === aiForm.dayId ? 'selected' : ''}>${fmtMD(d.md)} — ${esc(d.t)}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="ai-text">स्रोत पाठ <span class="muted small">(आप इसे बदल सकते हैं)</span></label><textarea class="textarea" id="ai-text" data-bind="aiForm.text" rows="7" placeholder="यहाँ समाचार, लेख या नोट्स पेस्ट करें…">${esc(aiForm.text)}</textarea></div>
    <div class="grid2">
      <div class="field"><label for="ai-subj">विषय</label><select class="select" id="ai-subj" data-bind="aiForm.subj">${SUBJECTS.filter(s => s.k !== 'days').map(s => `<option value="${s.k}" ${s.k === aiForm.subj ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
      <div class="field"><label for="ai-n">प्रश्नों की संख्या</label><select class="select" id="ai-n" data-bind="aiForm.n">${[3, 5, 8].map(n => `<option value="${n}" ${Number(aiForm.n) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="field"><span class="lbl">कठिनाई</span><div class="chips">${[[1, 'आसान'], [2, 'मध्यम'], [3, 'कठिन']].map(([v, l]) => `<button class="chip" data-act="ai-level" data-v="${v}" aria-pressed="${Number(aiForm.level) === v}">${l}</button>`).join('')}</div></div>
    ${aiGen.status === 'loading'
      ? `<div class="btnrow"><button class="btn btn-brand" disabled>${ic('sparkles')} प्रश्न बन रहे हैं…</button><button class="btn btn-outline" data-act="ai-stop">रोकें</button></div><p class="small muted" style="margin:0">इसमें 10–60 सेकंड लग सकते हैं। पहली बार Claude के उपयोग की अनुमति माँगी जाएगी।</p>`
      : `<button class="btn btn-brand" data-act="ai-generate" ${avail ? '' : 'disabled'}>${ic('sparkles')} प्रश्न बनाएँ</button>`}
  </section>
  ${aiResults()}
</main>`;
}
function aiResults() {
  if (aiGen.status === 'error') return `<div class="note note-warn">${ic('alert')}<div>${esc(aiGen.err)}</div></div>`;
  if (aiGen.status !== 'done') return '';
  if (!aiGen.items.length) return `<div class="note note-warn">${ic('alert')}<div>AI से कोई मान्य प्रश्न नहीं मिला। स्रोत पाठ बढ़ाकर फिर कोशिश करें।</div></div>`;
  return `<section style="display:flex;flex-direction:column;gap:12px">
    <div class="sec-head"><h2 class="sec-title">${ic('sparkles')} ${aiGen.items.length} प्रश्न तैयार</h2>${aiGen.dropped ? `<span class="small muted">${aiGen.dropped} अमान्य हटाए गए</span>` : ''}</div>
    ${aiGen.items.map((q, i) => `<article class="card draft"><label class="check"><input type="checkbox" data-change="ai-pick" data-i="${i}" ${aiGen.sel.has(i) ? 'checked' : ''}> <b>प्रश्न ${i + 1} चुनें</b></label>${qPreview(q)}<div><button class="link" data-act="ai-edit" data-i="${i}">${ic('pencil')} संपादित करें</button></div></article>`).join('')}
    <button class="btn btn-cta" data-act="ai-queue" ${aiGen.sel.size ? '' : 'disabled'}>${ic('send')} चुने हुए ${aiGen.sel.size} प्रश्न समीक्षा में भेजें</button>
    <button class="btn btn-outline" data-act="ai-generate">${ic('rotate')} फिर से बनाएँ</button>
  </section>`;
}
async function generateAI() {
  const text = String(aiForm.text || '').trim();
  if (text.length < 40) { toast('स्रोत पाठ कम से कम 40 अक्षरों का होना चाहिए।', 'err'); return; }
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
  q: ['तथ्य स्रोत से मिलाए गए हैं', 'केवल एक विकल्प सही है और भाषा शुद्ध है', 'व्याख्या सही और पूरी है'],
  news: ['तथ्य और तारीख़ स्रोत से मिलाए गए हैं', 'शीर्षक और सारांश स्पष्ट हैं', 'स्रोत का नाम/लिंक सही है'],
  day: ['तारीख़ और इतिहास सही है', 'तथ्य किसी विश्वसनीय स्रोत से मिलाए गए हैं', 'भाषा शुद्ध और स्पष्ट है'],
};
function draftPreview(d) {
  const x = d.data || {};
  if (d.type === 'q') return `${qPreview(x)}<span class="small muted">${esc(SUBJ[x.s] ? SUBJ[x.s].name : x.s)}${x.t ? ' · ' + esc(x.t) : ''}${x.n && M().newsById.get(x.n) ? ' · ख़बर: ' + esc(M().newsById.get(x.n).title) : ''}</span>`;
  if (d.type === 'news') return `<div class="qprev"><span><span class="badge" style="--c2:${catOf(x.cat).c2}">${esc(x.cat)}</span> <span class="small muted">${x.date ? fmtDate(x.date) : ''}</span></span><b>${esc(x.title)}</b><span>${esc(x.summary)}</span>${Array.isArray(x.facts) && x.facts.length ? `<ul class="small" style="margin:0;padding-left:1.2em">${x.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}${x.source && x.source.name ? `<span class="small muted">स्रोत: ${esc(x.source.name)}${safeUrl(x.source.url) ? ` · <a href="${esc(safeUrl(x.source.url))}" target="_blank" rel="noopener noreferrer">लिंक ${ic('external')}</a>` : ''}</span>` : ''}</div>`;
  if (d.type === 'day') return `<div class="qprev"><span><span class="badge" style="--c2:${kindOf(x.k).c}">${esc(x.k)}</span> <span class="small muted">${x.md ? fmtMD(x.md) : ''}</span></span><b>${esc(x.t)}</b><span>${esc(x.h)}</span>${x.o ? `<span class="small">उद्देश्य: ${esc(x.o)}</span>` : ''}${Array.isArray(x.f) && x.f.length ? `<ul class="small" style="margin:0;padding-left:1.2em">${x.f.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</div>`;
  return '';
}
function vAdminReview() {
  if (!P.isAdmin) return vNoAdmin();
  const drafts = C.drafts.filter(d => d.status !== 'approved').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const reports = C.reports.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const dl = drafts.map(d => {
    const base = d.type === 'q' && C.base.q.some(b => b.id === (d.data || {}).id);
    return `<article class="card draft">
    <div class="draft-head"><span class="tag ${d.origin === 'ai' ? 'tag-ai' : ''}">${d.origin === 'ai' ? 'AI' : 'मैनुअल'}</span><span class="tag">${TYPE_LABEL[d.type] || d.type}</span>${base ? '<span class="tag">मूल प्रश्न में संपादन</span>' : ''}${d.note && !base ? `<span class="tag">${esc(d.note)}</span>` : ''}<span class="small muted">${relTime(d.createdAt)}</span></div>
    ${draftPreview(d)}
    ${d.source ? `<details><summary class="small" style="cursor:pointer;font-weight:700;color:var(--brand)">स्रोत पाठ देखें</summary><p class="small" style="white-space:pre-wrap;margin:6px 0 0">${esc(d.source)}</p></details>` : ''}
    <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:8px"><legend class="small muted" style="padding:0;margin-bottom:6px">समीक्षा सूची — सभी पर निशान लगाने के बाद ही स्वीकृति</legend>${(CHECKS[d.type] || CHECKS.q).map((c, i) => `<label class="check"><input type="checkbox" data-chk="${esc(d.id)}" data-ci="${i}" ${(reviewChecks[d.id] || [])[i] ? 'checked' : ''}> ${c}</label>`).join('')}</fieldset>
    <div class="btnrow"><button class="btn btn-sm btn-cta" id="ap-${esc(d.id)}" data-act="draft-approve" data-id="${esc(d.id)}" ${(CHECKS[d.type] || CHECKS.q).every((_, i) => (reviewChecks[d.id] || [])[i]) ? '' : 'disabled'}>${ic('check')} स्वीकृत करें</button><button class="btn btn-sm btn-outline" data-act="draft-edit" data-id="${esc(d.id)}">${ic('pencil')} संपादित करें</button><button class="btn btn-sm btn-danger" data-act="draft-reject" data-id="${esc(d.id)}">${ic('trash')} अस्वीकार</button></div>
  </article>`;
  }).join('');
  const rl = reports.map(r => {
    const q = M().byId.get(r.qid);
    return `<article class="card draft"><div class="draft-head"><span class="tag" style="background:var(--bad-soft);color:var(--bad)">${esc(r.reason)}</span><span class="small muted">${relTime(r.at)}</span></div><b>${esc(q ? q.q : r.qtext)}</b>${q ? `<span class="small">उत्तर: <span class="ans-ok">${esc(q.o[q.a])}</span></span>` : '<span class="small muted">यह प्रश्न अब उपलब्ध नहीं है।</span>'}${r.note ? `<p class="small" style="margin:0">विद्यार्थी की टिप्पणी: ${esc(r.note)}</p>` : ''}<div class="btnrow">${q && !q.gen ? `<button class="btn btn-sm btn-outline" data-act="bank-edit" data-id="${esc(q.id)}">${ic('pencil')} प्रश्न सुधारें</button>` : ''}<button class="btn btn-sm btn-cta" data-act="report-resolve" data-id="${esc(r.id)}" data-uid="${esc(r.uid)}">${ic('check')} हल हो गया</button></div></article>`;
  }).join('');
  return `${adminBar('सामग्री की जाँच करें')}
<main class="page gutter">
  ${cmsNote()}
  <div class="seg" role="group" aria-label="जाँच प्रकार"><button data-act="review-tab" data-v="drafts" aria-pressed="${reviewTab === 'drafts'}">ड्राफ़्ट (${drafts.length})</button><button data-act="review-tab" data-v="reports" aria-pressed="${reviewTab === 'reports'}">त्रुटि रिपोर्ट (${reports.length})</button></div>
  ${reviewTab === 'drafts'
    ? (dl || `<div class="card">${emptyState('shield', 'समीक्षा के लिए कुछ बाकी नहीं', 'नए प्रश्न "AI से प्रश्न बनवाएँ" या "GK प्रश्न बैंक" से जोड़ें।')}<a class="btn btn-brand btn-block" href="#admin-ai">${ic('sparkles')} AI से प्रश्न बनवाएँ</a></div>`)
    : (rl || `<div class="card">${emptyState('flag', 'कोई त्रुटि रिपोर्ट नहीं', 'विद्यार्थी "त्रुटि बताएँ" से जो रिपोर्ट भेजेंगे, वे यहाँ दिखेंगी।')}</div>`)}
</main>`;
}
function vAdminPublish() {
  if (!P.isAdmin) return vNoAdmin();
  const approved = C.drafts.filter(d => d.status === 'approved').sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
  const live = [...C.pub.q.map(x => ({ ...x, _c: 'q' })), ...C.pub.news.map(x => ({ ...x, _c: 'news' })), ...C.pub.days.map(x => ({ ...x, _c: 'days' }))].sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)).slice(0, 25);
  const label = x => x.hidden ? `छिपाया गया: ${esc(x.id)}` : x._c === 'q' ? esc(x.q) : x._c === 'news' ? esc(x.title) : esc(x.t);
  const t = todayISO();
  return `${adminBar('प्रकाशित करें')}
<main class="page gutter">
  ${cmsNote()}
  ${approved.length ? `<form class="card" data-form="publish" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('send')} प्रकाशन हेतु स्वीकृत (${approved.length})</h2>
    ${approved.map(d => `<label class="check"><input type="checkbox" name="pub" value="${esc(d.id)}" data-change="pub-pick" ${pubForm.skip.has(d.id) ? '' : 'checked'}> <span><span class="tag">${TYPE_LABEL[d.type]}</span> ${esc(d.type === 'q' ? d.data.q : d.type === 'news' ? d.data.title : d.data.t)}</span></label>`).join('')}
    <div class="field"><label for="pub-date">कब से दिखाएँ</label><input class="input" type="date" id="pub-date" data-bind="pubForm.date" value="${pubForm.date && pubForm.date >= t ? pubForm.date : t}" min="${t}"></div>
    <button class="btn btn-cta" type="submit">${ic('rocket')} चुनी हुई सामग्री प्रकाशित करें</button>
  </form>` : `<div class="card">${emptyState('send', 'प्रकाशन के लिए कुछ स्वीकृत नहीं है', 'पहले "सामग्री की जाँच करें" में ड्राफ़्ट स्वीकृत करें।')}<a class="btn btn-outline btn-block" href="#admin-review">${ic('shield')} सामग्री की जाँच करें</a></div>`}
  <section style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title">${ic('rocket')} हाल में प्रकाशित (लाइव)</h2>
  ${live.length ? `<div class="list">${live.map(x => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:.98rem">${label(x)}</span><span class="row-sub">${TYPE_LABEL[x._c === 'days' ? 'day' : x._c]} · ${x.publishAt && x.publishAt > t ? `${fmtDate(x.publishAt, false)} से दिखेगा` : relTime(x.publishedAt)}</span></span><button class="iconbtn" style="color:var(--bad)" data-act="unpublish-ask" data-c="${x._c}" data-id="${esc(x.id)}" aria-label="हटाएँ">${ic('trash')}</button></div>`).join('')}</div>` : `<div class="card">${emptyState('rocket', 'अभी तक कुछ प्रकाशित नहीं किया गया', 'ऐप की मूल सामग्री हमेशा उपलब्ध रहती है; यहाँ केवल नई प्रकाशित सामग्री दिखती है।')}</div>`}
  </section>
</main>`;
}
const bankState = { subj: '', term: '', limit: 40 };
const pubForm = { date: '', skip: new Set() }; // unticked approved items + chosen date
function bankListHtml() {
  const m = M(), t = bankState.term.trim().toLowerCase();
  const all = m.qs.filter(q => (!bankState.subj || q.s === bankState.subj) && (!t || (q.q + ' ' + q.o.join(' ')).toLowerCase().includes(t)));
  const list = all.slice(0, bankState.limit);
  const tag = q => q.src === 'base' ? '<span class="tag">मूल</span>' : q.src === 'edited' ? '<span class="tag tag-live">संपादित</span>' : '<span class="tag tag-live">लाइव</span>';
  const del = q => q.src === 'base' ? 'छिपाएँ' : q.src === 'edited' ? 'मूल पर लौटाएँ' : 'हटाएँ';
  return `<p class="small muted" style="margin:0">${all.length} प्रश्न${bankState.subj ? '' : ` · इनके अलावा ${m.dayQs.length} प्रश्न "महत्वपूर्ण दिवस" कैलेंडर से अपने-आप बनते हैं`}</p>
  <div class="list">${list.map(q => `<div class="review-item"><div class="draft-head">${tag(q)}<span class="small muted">${esc(SUBJ[q.s] ? SUBJ[q.s].name : q.s)}${q.t ? ' · ' + esc(q.t) : ''}</span></div><b>${esc(q.q)}</b><span class="ans">उत्तर: <span class="ans-ok">${esc(q.o[q.a])}</span></span><div class="btnrow" style="gap:14px"><button class="link" data-act="bank-edit" data-id="${esc(q.id)}">${ic('pencil')} संपादित करें</button><button class="link" style="color:var(--bad)" data-act="bank-remove" data-id="${esc(q.id)}">${ic('trash')} ${del(q)}</button></div></div>`).join('') || emptyState('search', 'कोई प्रश्न नहीं मिला', '')}</div>
  ${all.length > list.length ? `<button class="btn btn-outline" data-act="bank-more">और दिखाएँ (${all.length - list.length})</button>` : ''}`;
}
function vAdminBank() {
  if (!P.isAdmin) return vNoAdmin();
  return `${adminBar('GK प्रश्न बैंक')}
<main class="page gutter">
  ${cmsNote()}
  <button class="btn btn-brand" data-act="bank-new">${ic('plus')} नया प्रश्न जोड़ें</button>
  <div class="search">${ic('search')}<input id="bank-search" type="search" placeholder="प्रश्न या विकल्प खोजें" value="${esc(bankState.term)}" autocomplete="off" aria-label="प्रश्न बैंक में खोजें"></div>
  <div class="chips" role="group" aria-label="विषय"><button class="chip" data-act="bank-subj" data-v="" aria-pressed="${!bankState.subj}">सभी</button>${SUBJECTS.filter(s => s.k !== 'days').map(s => `<button class="chip" data-act="bank-subj" data-v="${s.k}" aria-pressed="${bankState.subj === s.k}">${s.name}</button>`).join('')}</div>
  <div id="bank-list" style="display:flex;flex-direction:column;gap:12px">${bankListHtml()}</div>
</main>`;
}
const newsForm = { title: '', cat: CATS[0].k, date: '', summary: '', facts: '', srcName: '', srcUrl: '', raw: '' };
let newsAI = { status: 'idle', err: '' };
function newsFields(p, v) {
  const b = k => (p === 'nf' ? `data-bind="newsForm.${k}"` : '');
  return `<div class="field"><label for="${p}-title">शीर्षक</label><input class="input" id="${p}-title" ${b('title')} value="${esc(v.title || '')}" maxlength="120"></div>
  <div class="grid2"><div class="field"><label for="${p}-cat">श्रेणी</label><select class="select" id="${p}-cat" ${b('cat')}>${CATS.map(c => `<option ${c.k === v.cat ? 'selected' : ''}>${c.k}</option>`).join('')}</select></div>
  <div class="field"><label for="${p}-date">तारीख़</label><input class="input" type="date" id="${p}-date" ${b('date')} value="${esc(v.date || todayISO())}"></div></div>
  <div class="field"><label for="${p}-summary">सारांश (2–3 वाक्य)</label><textarea class="textarea" id="${p}-summary" ${b('summary')} rows="4">${esc(v.summary || '')}</textarea></div>
  <div class="field"><label for="${p}-facts">परीक्षा के लिए मुख्य तथ्य <span class="muted small">(हर पंक्ति में एक)</span></label><textarea class="textarea" id="${p}-facts" ${b('facts')} rows="4">${esc(Array.isArray(v.facts) ? v.facts.join('\n') : v.facts || '')}</textarea></div>
  <div class="grid2"><div class="field"><label for="${p}-srcname">स्रोत का नाम</label><input class="input" id="${p}-srcname" ${b('srcName')} value="${esc(v.srcName ?? (v.source && v.source.name) ?? '')}" placeholder="जैसे: PIB"></div>
  <div class="field"><label for="${p}-srcurl">स्रोत लिंक</label><input class="input" type="url" id="${p}-srcurl" ${b('srcUrl')} value="${esc(v.srcUrl ?? (v.source && v.source.url) ?? '')}" placeholder="https://"></div></div>`;
}
function readNews(f, p) {
  const g = k => ((f.querySelector(`#${p}-${k}`) || {}).value || '').trim();
  return { title: g('title'), cat: g('cat'), date: g('date'), summary: g('summary'), facts: g('facts').split('\n').map(s => s.trim()).filter(Boolean), source: { name: g('srcname'), url: g('srcurl') } };
}
function newsError(n) {
  if (n.title.length < 8) return 'शीर्षक कम से कम 8 अक्षरों का लिखें।';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) return 'सही तारीख़ चुनें।';
  if (n.summary.length < 20) return 'सारांश थोड़ा विस्तार से लिखें।';
  if (n.source.url && !safeUrl(n.source.url)) return 'स्रोत लिंक https:// से शुरू होना चाहिए।';
  return '';
}
function vAdminNews() {
  if (!P.isAdmin) return vNoAdmin();
  const m = M();
  return `${adminBar('समाचार प्रबंधन')}
<main class="page gutter">
  ${cmsNote()}
  <form class="card" data-form="news-new" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('plus')} नया समाचार जोड़ें</h2>
    ${AI.available() ? `<details ${newsForm.raw ? 'open' : ''}><summary style="cursor:pointer;font-weight:700;color:var(--brand)">${ic('sparkles')} मूल लेख से AI द्वारा भरें</summary><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><textarea class="textarea" id="nf-raw" data-bind="newsForm.raw" rows="5" placeholder="PIB/अख़बार का मूल समाचार यहाँ पेस्ट करें">${esc(newsForm.raw)}</textarea><button type="button" class="btn btn-sm btn-brand" data-act="news-ai" ${newsAI.status === 'loading' ? 'disabled' : ''}>${ic('sparkles')} ${newsAI.status === 'loading' ? 'भर रहा है…' : 'AI से भरें'}</button>${newsAI.err ? `<p class="small" style="margin:0;color:var(--bad)">${esc(newsAI.err)}</p>` : ''}</div></details>` : ''}
    ${newsFields('nf', newsForm)}
    <button class="btn btn-cta" type="submit">${ic('send')} समीक्षा के लिए भेजें</button>
  </form>
  <section style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title">${ic('newspaper')} सभी समाचार (${m.news.length})</h2>
  <div class="list">${m.news.slice(0, 30).map(n => `<div class="review-item"><div class="draft-head"><span class="badge" style="--c2:${catOf(n.cat).c2}">${esc(n.cat)}</span><span class="small muted">${fmtDate(n.date)}</span>${n.src === 'base' ? '<span class="tag">मूल</span>' : '<span class="tag tag-live">लाइव</span>'}</div><b>${esc(n.title)}</b><div class="btnrow" style="gap:14px"><button class="link" data-act="news-to-ai" data-id="${esc(n.id)}">${ic('sparkles')} इससे AI प्रश्न</button>${n.src === 'base' ? '' : `<button class="link" style="color:var(--bad)" data-act="unpublish-ask" data-c="news" data-id="${esc(n.id)}">${ic('trash')} हटाएँ</button>`}</div></div>`).join('')}</div></section>
</main>`;
}
const dayForm = { date: todayISO(), t: '', k: 'राष्ट्रीय', y: '', h: '', o: '', f: '' };
function dayFields(p, v) {
  const b = k => (p === 'df' ? `data-bind="dayForm.${k}"` : '');
  const dateVal = v.date || (v.md ? `${parseISO(todayISO()).getFullYear()}-${v.md}` : todayISO());
  return `<div class="grid2"><div class="field"><label for="${p}-date">तारीख़</label><input class="input" type="date" id="${p}-date" ${b('date')} value="${esc(dateVal)}"></div>
  <div class="field"><label for="${p}-k">प्रकार</label><select class="select" id="${p}-k" ${b('k')}>${Object.keys(KINDS).map(k => `<option ${k === v.k ? 'selected' : ''}>${k}</option>`).join('')}</select></div></div>
  <div class="field"><label for="${p}-t">दिवस का नाम</label><input class="input" id="${p}-t" ${b('t')} value="${esc(v.t || '')}" maxlength="90"></div>
  <div class="field"><label for="${p}-y">शुरुआत / घटना का वर्ष <span class="muted small">(वैकल्पिक)</span></label><input class="input" id="${p}-y" ${b('y')} inputmode="numeric" value="${esc(v.y || '')}" maxlength="4"></div>
  <div class="field"><label for="${p}-h">शुरुआत का इतिहास</label><textarea class="textarea" id="${p}-h" ${b('h')} rows="3">${esc(v.h || '')}</textarea></div>
  <div class="field"><label for="${p}-o">उद्देश्य <span class="muted small">(वैकल्पिक)</span></label><textarea class="textarea" id="${p}-o" ${b('o')} rows="2" style="min-height:70px">${esc(v.o || '')}</textarea></div>
  <div class="field"><label for="${p}-f">महत्वपूर्ण तथ्य <span class="muted small">(हर पंक्ति में एक)</span></label><textarea class="textarea" id="${p}-f" ${b('f')} rows="3">${esc(Array.isArray(v.f) ? v.f.join('\n') : v.f || '')}</textarea></div>`;
}
function readDay(f, p) {
  const g = k => ((f.querySelector(`#${p}-${k}`) || {}).value || '').trim();
  const date = g('date');
  const y = parseInt(g('y'), 10);
  return { md: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5) : '', t: g('t'), k: g('k'), y: Number.isFinite(y) ? y : undefined, h: g('h'), o: g('o') || undefined, f: g('f').split('\n').map(s => s.trim()).filter(Boolean) };
}
function dayError(d) {
  if (!d.md) return 'सही तारीख़ चुनें।';
  if (d.t.length < 4) return 'दिवस का नाम लिखें।';
  if (d.h.length < 20) return 'शुरुआत का इतिहास थोड़ा विस्तार से लिखें।';
  return '';
}
function vAdminDays() {
  if (!P.isAdmin) return vNoAdmin();
  const t = todayISO();
  const todays = (M().daysByMd[t.slice(5)] || []).map(e => ({ ...e, iso: t }));
  const up = [...todays, ...upcomingDays(t, 14)];
  return `${adminBar('आज का दिन – प्रबंधन')}
<main class="page gutter">
  ${cmsNote()}
  <section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1.05rem">${ic('calendar')} आज और आने वाले दिवस</h2>
  ${up.map(e => `<div class="upc"><span class="d"><b class="tnum">${parseISO(e.iso).getDate()}</b><span>${HI_MONTHS[parseISO(e.iso).getMonth()].slice(0, 4)}</span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(e.t)}</span><span class="row-sub">${esc(e.k)} · ${e.src === 'base' ? 'मूल' : 'लाइव'}</span></span><button class="link" data-act="day-to-ai" data-id="${esc(e.id)}">${ic('sparkles')} AI प्रश्न</button></div>`).join('')}</section>
  <form class="card" data-form="day-new" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('plus')} नया दिवस जोड़ें</h2>
    ${dayFields('df', dayForm)}
    <button class="btn btn-cta" type="submit">${ic('send')} समीक्षा के लिए भेजें</button>
  </form>
</main>`;
}

// Question editor (sheet) — used by AI results, review, bank and new questions.
let qEditCb = null;
function openQEditor(init, onSave, title = 'प्रश्न संपादित करें') {
  const q = { s: 'misc', t: '', q: '', o: ['', '', '', ''], a: 0, e: '', d: 1, ...clone(init || {}) };
  qEditCb = onSave;
  openSheet(`${sheetHead(title)}<form data-form="qedit" style="display:flex;flex-direction:column;gap:12px">
  <div class="grid2"><div class="field"><label for="qe-s">विषय</label><select class="select" id="qe-s">${SUBJECTS.filter(s => s.k !== 'days').map(s => `<option value="${s.k}" ${s.k === q.s ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
  <div class="field"><label for="qe-d">कठिनाई</label><select class="select" id="qe-d">${[[1, 'आसान'], [2, 'मध्यम'], [3, 'कठिन']].map(([v, l]) => `<option value="${v}" ${Number(q.d) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  <div class="field"><label for="qe-t">उप-विषय</label><input class="input" id="qe-t" value="${esc(q.t || '')}" maxlength="40"></div>
  <div class="field"><label for="qe-q">प्रश्न</label><textarea class="textarea" id="qe-q" rows="3" style="min-height:80px">${esc(q.q)}</textarea></div>
  <div class="field"><span class="lbl">विकल्प <span class="muted small">(सही विकल्प चुनें)</span></span>${[0, 1, 2, 3].map(i => `<div class="optedit"><input type="radio" name="qe-a" value="${i}" ${q.a === i ? 'checked' : ''} aria-label="विकल्प ${LETTERS[i]} सही है"><input class="input" id="qe-o${i}" value="${esc(q.o[i] || '')}" placeholder="विकल्प ${LETTERS[i]}"></div>`).join('')}</div>
  <div class="field"><label for="qe-e">व्याख्या</label><textarea class="textarea" id="qe-e" rows="3" style="min-height:80px">${esc(q.e || '')}</textarea></div>
  <p class="small" id="qe-err" style="margin:0;color:var(--bad)" role="alert"></p>
  <button class="btn btn-cta btn-block" type="submit">${ic('check')} सहेजें</button></form>`, { label: title });
}
function newsEditorSheet(d) {
  openSheet(`${sheetHead('समाचार संपादित करें')}<form data-form="news-edit" data-id="${esc(d.id)}" style="display:flex;flex-direction:column;gap:12px">${newsFields('ne', d.data)}<p class="small" id="ne-err" style="margin:0;color:var(--bad)" role="alert"></p><button class="btn btn-cta btn-block" type="submit">${ic('check')} सहेजें</button></form>`, { label: 'समाचार संपादित करें' });
}
function dayEditorSheet(d) {
  openSheet(`${sheetHead('दिवस संपादित करें')}<form data-form="day-edit" data-id="${esc(d.id)}" style="display:flex;flex-direction:column;gap:12px">${dayFields('de', d.data)}<p class="small" id="de-err" style="margin:0;color:var(--bad)" role="alert"></p><button class="btn btn-cta btn-block" type="submit">${ic('check')} सहेजें</button></form>`, { label: 'दिवस संपादित करें' });
}
function confirmSheet(title, text, okLabel, onOk, danger = true) {
  confirmCb = onOk;
  openSheet(`${sheetHead(title)}<p style="margin:0">${text}</p><div class="grid2"><button class="btn btn-grey" data-act="sheet-close">रद्द करें</button><button class="btn ${danger ? 'btn-danger' : 'btn-cta'}" data-act="confirm-ok">${okLabel}</button></div>`, { label: title });
}
let confirmCb = null;

// ───────────────────────────── actions ─────────────────────────────
const nav = to => go(to);
const ACTIONS = {
  'sheet-bg': (el, e) => { if (e.target === el) closeSheet(); },
  'sheet-close': () => closeSheet(),
  'confirm-ok': async el => { const cb = confirmCb; confirmCb = null; el.disabled = true; closeSheet(); if (cb) await cb(); },
  back: el => {
    const to = el.dataset.to || 'home';
    if (route === 'play' && S && !S.done && Object.keys(S.ans).length) {
      openSheet(`${sheetHead('क्विज बीच में छोड़ें?')}<p style="margin:0">आपके दिए उत्तर प्रगति में सहेज लिए गए हैं।</p><div class="btnrow"><button class="btn btn-cta" data-act="finish-now">परिणाम देखें</button><button class="btn btn-grey" data-act="quit-now" data-to="${esc(to)}">छोड़ें</button><button class="btn btn-outline" data-act="sheet-close">जारी रखें</button></div>`, { label: 'क्विज छोड़ें' });
      return;
    }
    nav(to);
  },
  'finish-now': () => { closeSheet(); finishSession(); },
  'quit-now': el => { closeSheet(); const to = el.dataset.to; S = null; nav(to); },
  notifs: () => {
    const list = notifications();
    openSheet(`${sheetHead('सूचनाएँ')}<div class="list">${list.length ? list.map(n => n.to ? `<a class="row" href="#${n.to}" data-act="sheet-nav">${ic(n.icon)}<span class="row-main">${esc(n.text)}</span>${ic('chev-right', 'chev')}</a>` : `<button class="row" data-act="${n.act}">${ic(n.icon)}<span class="row-main">${esc(n.text)}</span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('bell', 'कोई नई सूचना नहीं', '')}</div>`, { label: 'सूचनाएँ' });
  },
  'sheet-nav': (el, e) => { e.preventDefault(); const to = el.getAttribute('href').slice(1); closeSheet(); nav(to); },
  'onb-exam': el => { onb.exam = onb.exam === el.dataset.v ? '' : el.dataset.v; $$('[data-act="onb-exam"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === onb.exam))); },
  'onb-goal': el => { onb.goal = Number(el.dataset.v); $$('[data-act="onb-goal"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === onb.goal))); },
  'onb-skip': () => { LS.set('onb-skip', true); render(); },
  'profile-edit': () => profileSheet(),
  'start-daily': () => startSession('daily', `दैनिक क्विज · ${fmtDate(todayISO(), false)}`, dailyQuestions(), { back: 'home' }),
  'start-subject': el => {
    const k = el.dataset.s, sj = SUBJ[k];
    const pool = M().bySubj[k] || [];
    startSession('subject', sj.name, pick(pool, U.s.set.count || pool.length), { back: 'quiz', timed: U.s.set.mode === 'timed' });
  },
  'start-revision': () => {
    const qs = U.due().map(id => M().byId.get(id)).filter(Boolean).slice(0, 20);
    if (!qs.length) { closeSheet(); toast('अभी दोहराव के लिए कोई प्रश्न नहीं है — बढ़िया!', 'info'); return; }
    startSession('revision', 'गलत प्रश्नों का दोहराव', shuffle(qs), { back: route === 'quiz' ? 'quiz' : 'home' });
  },
  'start-bookmarked': () => {
    const qs = U.s.bm.q.map(id => M().byId.get(id)).filter(Boolean);
    if (!qs.length) { toast('पहले क्विज में कुछ प्रश्न बुकमार्क करें।', 'info'); return; }
    startSession('bookmarks', 'बुकमार्क प्रश्न', shuffle(qs), { back: route === 'bookmarks' ? 'bookmarks' : 'quiz' });
  },
  'start-ca': () => {
    const pool = (M().bySubj.ca || []).slice().sort((a, b) => newsDate(b).localeCompare(newsDate(a)));
    startSession('ca', 'करेंट अफेयर्स क्विज', pick(pool.slice(0, 20), 10), { back: 'ca' });
  },
  'news-quiz': el => startSession('news', 'ख़बर से प्रश्न', (M().bySubj.ca || []).filter(q => q.n === el.dataset.id), { back: 'ca' }),
  'day-quiz': el => { const md = el.dataset.md; startSession('day', `आज का दिन · ${fmtMD(md)}`, shuffle(M().all.filter(q => q.day === md)), { back: 'today' }); },
  'set-mode': el => { U.s.set.mode = el.dataset.v; U.touch(); render(); },
  'set-count': el => { U.s.set.count = Number(el.dataset.v); U.touch(); render(); },
  'search-open': () => {
    openSheet(`${sheetHead('प्रश्न खोजें')}<div class="search">${ic('search')}<input id="q-search" type="search" placeholder="जैसे: संविधान, 1857, ISRO" autocomplete="off" aria-label="प्रश्न खोजें"></div><div id="search-results" class="list"></div>`, { label: 'प्रश्न खोजें' });
    renderSearch('');
  },
  'open-q': el => { const q = M().byId.get(el.dataset.id); if (q) startSession('single', 'प्रश्न अभ्यास', [q], { back: 'quiz' }); },
  answer: el => answer(Number(el.dataset.i)),
  'prev-q': () => { if (S && S.i > 0) { S.i--; S.shownAt = Date.now(); render(); window.scrollTo(0, 0); } },
  'next-q': () => nextQ(),
  'bm-q': el => { const added = U.toggleBm('q', el.dataset.id); toast(added ? 'प्रश्न बुकमार्क में सहेजा गया' : 'बुकमार्क से हटाया गया'); render(); },
  'bm-n': el => { const added = U.toggleBm('n', el.dataset.id); toast(added ? 'ख़बर सहेजी गई' : 'सहेजी ख़बरों से हटाई गई'); openNews(el.dataset.id); render(); },
  'share-q': () => {
    if (!S) return;
    const q = S.qs[S.i];
    shareText(`MY QUIZ प्रश्न 🧠\n${q.q}\n${q.o.map((o, i) => `${LETTERS[i]}. ${o}`).join('\n')}\n\nउत्तर ऐप में देखें!`);
  },
  'share-result': () => {
    if (!S) return;
    const c = S.qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
    shareText(`मैंने MY QUIZ पर "${S.title}" में ${S.qs.length} में से ${c} प्रश्न सही किए! 🎯 ${U.streak()} दिन की स्ट्रीक जारी है। क्या आप मुझसे बेहतर कर सकते हैं?`);
  },
  'share-news': el => {
    const n = M().newsById.get(el.dataset.id);
    if (n) shareText(`📰 ${n.title}\n${n.summary}\n\n${(n.facts || []).map(f => '• ' + f).join('\n')}\n— MY QUIZ करेंट अफेयर्स`);
  },
  'report-q': el => {
    const id = el.dataset.id;
    openSheet(`${sheetHead('प्रश्न में त्रुटि बताएँ')}<form data-form="report" data-id="${esc(id)}" style="display:flex;flex-direction:column;gap:12px">
      <fieldset style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:10px"><legend class="lbl" style="font-weight:700;margin-bottom:6px">क्या समस्या है?</legend>${['उत्तर गलत लगता है', 'प्रश्न या विकल्प में त्रुटि', 'व्याख्या अधूरी या गलत', 'अन्य'].map((r, i) => `<label class="check"><input type="radio" name="reason" value="${r}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}</fieldset>
      <div class="field"><label for="rp-note">विवरण (वैकल्पिक)</label><textarea class="textarea" id="rp-note" rows="3" maxlength="500" placeholder="जैसे: सही उत्तर 1885 होना चाहिए — स्रोत: NCERT"></textarea></div>
      <button class="btn btn-cta btn-block" type="submit">${ic('send')} रिपोर्ट भेजें</button></form>`, { label: 'त्रुटि बताएँ' });
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
    startSession(S.kind === 'daily' ? 'practice' : S.kind, S.title.replace(/ · दोबारा$/, '') + ' · दोबारा', qs, { back: S.back, timed: S.timed });
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
  'exam-next': () => { if (!E) return; if (E.i < E.qs.length - 1) examMove(E.i + 1); else openSheet(submitAskHtml(), { label: 'सबमिट करें' }); },
  'exam-go': el => { closeSheet(); examMove(Number(el.dataset.i)); },
  'exam-palette': () => openSheet(paletteHtml(), { label: 'प्रश्न पैलेट' }),
  'exam-submit-ask': () => openSheet(submitAskHtml(), { label: 'सबमिट करें' }),
  'exam-submit': () => submitExam(false),
  'exam-exit': () => openSheet(`${sheetHead('परीक्षा से बाहर जाएँ?')}<p style="margin:0">परीक्षा जारी रहेगी और समय चलता रहेगा। आप "अभ्यास परीक्षा" से इसे फिर खोल सकते हैं।</p><div class="btnrow"><button class="btn btn-grey" data-act="exam-leave">बाहर जाएँ</button><button class="btn btn-cta" data-act="exam-submit-ask">सबमिट करें</button><button class="btn btn-outline" data-act="sheet-close">जारी रखें</button></div>`, { label: 'परीक्षा से बाहर' }),
  'exam-leave': () => { closeSheet(); nav('mock'); },
  'bm-tab': el => { bmTab = el.dataset.v; render(); },
  'set-goal': el => { U.s.goal = Number(el.dataset.v); U.touch(); render(); },
  'set-scale': el => { U.s.set.scale = Number(el.dataset.v); U.touch(); applySettings(); render(); },
  'set-theme': el => { U.s.set.theme = el.dataset.v; U.touch(); applySettings(); render(); },
  'reset-ask': () => confirmSheet('प्रगति रीसेट करें?', 'आपके सभी उत्तर, स्ट्रीक, XP, बुकमार्क और मॉक टेस्ट इतिहास हट जाएँगे। यह वापस नहीं होगा।', 'हाँ, रीसेट करें', () => {
    const keep = { name: U.s.name, exam: U.s.exam, goal: U.s.goal, set: U.s.set };
    U.s = { ...DEF(), ...keep }; U.touch(); toast('प्रगति रीसेट हो गई'); render();
  }),
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
        await CMS.putDraft({ type: 'q', status: 'draft', origin: 'ai', source: String(aiForm.text).slice(0, 2000), data: { id: 'q' + rid(), s: q.s || aiForm.subj, t: q.t || '', q: q.q, o: q.o, a: q.a, e: q.e, d: Number(q.d || aiForm.level) || 2, ...extra } });
      }
      toast(`${picked.length} प्रश्न समीक्षा कतार में भेजे गए`);
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
    try { await CMS.putDraft({ ...clone(d), status: 'approved', reviewedAt: Date.now() }); reviewChecks[d.id] = []; toast('स्वीकृत — अब "प्रकाशित करें" में उपलब्ध'); }
    catch (e) { el.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'draft-reject': el => {
    const id = el.dataset.id;
    confirmSheet('ड्राफ़्ट अस्वीकार करें?', 'यह ड्राफ़्ट हमेशा के लिए हट जाएगा।', 'अस्वीकार करें', async () => { try { await CMS.delDraft(id); toast('ड्राफ़्ट हटाया गया'); } catch (e) { toast(dbMsg(e), 'err'); } });
  },
  'draft-edit': el => {
    const d = C.drafts.find(x => x.id === el.dataset.id);
    if (!d) return;
    if (d.type === 'q') openQEditor(d.data, async q => { try { await CMS.putDraft({ ...clone(d), data: { ...d.data, ...q } }); toast('ड्राफ़्ट अपडेट हुआ'); } catch (e) { toast(dbMsg(e), 'err'); } });
    else if (d.type === 'news') newsEditorSheet(d);
    else dayEditorSheet(d);
  },
  'report-resolve': async el => {
    const r = C.reports.find(x => x.id === el.dataset.id && String(x.uid) === el.dataset.uid);
    if (!r) return;
    el.disabled = true;
    try { await CMS.resolveReport(r); toast('रिपोर्ट हल की गई'); } catch (e) { el.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'unpublish-ask': el => {
    const c = el.dataset.c, id = el.dataset.id;
    confirmSheet('प्रकाशित सामग्री हटाएँ?', 'यह सामग्री विद्यार्थियों को तुरंत दिखना बंद हो जाएगी। ऐप की मूल सामग्री पर इसका असर नहीं होगा।', 'हटाएँ', async () => { try { await CMS.unpublish(c, id); toast('हटाया गया'); } catch (e) { toast(dbMsg(e), 'err'); } });
  },
  'bank-new': () => openQEditor({ s: bankState.subj || 'misc' }, async q => {
    try { await CMS.putDraft({ type: 'q', status: 'draft', origin: 'manual', data: { ...q, id: 'q' + rid() } }); toast('नया प्रश्न समीक्षा कतार में भेजा गया'); } catch (e) { toast(dbMsg(e), 'err'); }
  }, 'नया प्रश्न'),
  'bank-edit': el => {
    const q = M().byId.get(el.dataset.id);
    if (!q || q.gen) return;
    const orig = { id: q.id, s: q.s, t: q.t, q: q.q, o: q.o, a: q.a, e: q.e, d: q.d, ...(q.n ? { n: q.n } : {}), ...(q.day ? { day: q.day } : {}) };
    openQEditor(orig, async edited => {
      try { await CMS.putDraft({ type: 'q', status: 'draft', origin: 'manual', note: 'संपादन', data: { ...orig, ...edited, id: q.id } }); toast('संपादन समीक्षा कतार में भेजा गया'); } catch (e) { toast(dbMsg(e), 'err'); }
    });
  },
  'bank-remove': el => {
    const q = M().byId.get(el.dataset.id);
    if (!q) return;
    if (q.src === 'base') confirmSheet('मूल प्रश्न छिपाएँ?', 'यह प्रश्न विद्यार्थियों को दिखना बंद हो जाएगा। बाद में "प्रकाशित करें" सूची से इसे फिर दिखा सकते हैं।', 'छिपाएँ', async () => { try { await CMS.hide('q', q.id); toast('प्रश्न छिपाया गया'); } catch (e) { toast(dbMsg(e), 'err'); } });
    else confirmSheet(q.src === 'edited' ? 'संपादन हटाएँ?' : 'प्रश्न हटाएँ?', q.src === 'edited' ? 'प्रश्न अपने मूल रूप में लौट आएगा।' : 'यह प्रश्न विद्यार्थियों को दिखना बंद हो जाएगा।', 'हाँ', async () => { try { await CMS.unpublish('q', q.id); toast('हो गया'); } catch (e) { toast(dbMsg(e), 'err'); } });
  },
  'bank-subj': el => { bankState.subj = el.dataset.v; bankState.limit = 40; render(); },
  'bank-more': () => { bankState.limit += 40; const box = $('#bank-list'); if (box) box.innerHTML = bankListHtml(); },
  'news-to-ai': el => { const n = M().newsById.get(el.dataset.id); if (!n) return; aiForm.src = 'ca'; aiForm.newsId = n.id; aiForm.text = newsToText(n); aiForm.subj = 'ca'; aiGen = { status: 'idle', items: [], err: '', sel: new Set() }; nav('admin-ai'); },
  'day-to-ai': el => { const d = M().days.find(x => x.id === el.dataset.id); if (!d) return; aiForm.src = 'day'; aiForm.dayId = d.id; aiForm.text = dayToText(d); aiForm.subj = 'misc'; aiGen = { status: 'idle', items: [], err: '', sel: new Set() }; nav('admin-ai'); },
  'news-ai': async () => {
    const raw = String(newsForm.raw || '').trim();
    if (raw.length < 60) { toast('मूल लेख कम से कम 60 अक्षरों का पेस्ट करें।', 'err'); return; }
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
      newsAI = { status: 'idle', err: '' };
      toast('AI ने फ़ॉर्म भर दिया — जाँचकर भेजें');
    } catch (e) { newsAI = { status: 'idle', err: AI.msg(e) }; }
    if (route === 'admin-news') render();
  },
};
const CHANGES = {
  'ai-news': el => { const n = M().newsById.get(el.value); if (n) { aiForm.newsId = n.id; aiForm.text = newsToText(n); render(); } },
  'ai-day': el => { const d = M().days.find(x => x.id === el.value); if (d) { aiForm.dayId = d.id; aiForm.text = dayToText(d); render(); } },
  'pub-pick': el => { if (el.checked) pubForm.skip.delete(el.value); else pubForm.skip.add(el.value); },
  'ai-pick': el => { const i = Number(el.dataset.i); if (el.checked) aiGen.sel.add(i); else aiGen.sel.delete(i); render(); },
};
const FORMS = {
  onb: f => {
    const name = ($('#onb-name', f).value || '').trim().slice(0, 40);
    if (!name) { toast('अपना नाम लिखें', 'err'); $('#onb-name', f).focus(); return; }
    U.s.name = name; U.s.exam = onb.exam; U.s.goal = onb.goal; U.touch();
    toast(`स्वागत है, ${name}!`); render();
  },
  profile: f => {
    U.s.name = ($('#pf-name', f).value || '').trim().slice(0, 40);
    U.s.exam = onb.exam; U.touch(); closeSheet(); toast('प्रोफ़ाइल सहेजी गई'); render();
  },
  report: async f => {
    const q = (S && S.qs.find(x => x.id === f.dataset.id)) || M().byId.get(f.dataset.id);
    if (!q) return;
    const reason = (f.querySelector('input[name="reason"]:checked') || {}).value || 'अन्य';
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    try { await CMS.report(q, reason, $('#rp-note', f).value); closeSheet(); toast('धन्यवाद! रिपोर्ट हमारी टीम को भेज दी गई'); }
    catch (e) { btn.disabled = false; toast(e && e.code === 'not_granted' ? 'रिपोर्ट भेजने के लिए साइन इन करें' : dbMsg(e), 'err'); }
  },
  qedit: f => {
    const g = id => ($('#' + id, f).value || '').trim();
    const q = { s: g('qe-s'), d: Number(g('qe-d')) || 1, t: g('qe-t'), q: g('qe-q'), o: [0, 1, 2, 3].map(i => g('qe-o' + i)), a: Number((f.querySelector('input[name="qe-a"]:checked') || {}).value ?? -1), e: g('qe-e') };
    const err = q.q.length < 8 ? 'प्रश्न पूरा लिखें।' : q.o.some(o => !o) ? 'चारों विकल्प भरें।' : new Set(q.o).size !== 4 ? 'विकल्प अलग-अलग होने चाहिए।' : !(q.a >= 0 && q.a <= 3) ? 'सही विकल्प चुनें।' : q.e.length < 10 ? 'व्याख्या लिखें — इससे विद्यार्थी सीखते हैं।' : '';
    if (err) { $('#qe-err', f).textContent = err; return; }
    const cb = qEditCb; qEditCb = null; closeSheet(); if (cb) cb(q);
  },
  publish: async f => {
    const ids = $$('input[name="pub"]:checked', f).map(i => i.value);
    const date = $('#pub-date', f).value || todayISO();
    if (!ids.length) { toast('कम से कम एक सामग्री चुनें', 'err'); return; }
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    let done = 0;
    try { for (const id of ids) { const d = C.drafts.find(x => x.id === id); if (d) { await CMS.publish(d, date < todayISO() ? todayISO() : date); done++; } } toast(`${done} सामग्री प्रकाशित — ${date > todayISO() ? fmtDate(date, false) + ' से दिखेगी' : 'विद्यार्थियों को अभी दिखेगी'}`); }
    catch (e) { btn.disabled = false; toast(dbMsg(e), 'err'); }
  },
  'news-new': async f => {
    const n = readNews(f, 'nf'), err = newsError(n);
    if (err) { toast(err, 'err'); return; }
    try {
      await CMS.putDraft({ type: 'news', status: 'draft', origin: 'manual', source: newsForm.raw ? String(newsForm.raw).slice(0, 2000) : undefined, data: { id: 'n' + rid(), date: n.date, cat: n.cat, title: n.title, summary: n.summary, facts: n.facts, source: n.source } });
      Object.assign(newsForm, { title: '', summary: '', facts: '', srcName: '', srcUrl: '', raw: '', date: '' });
      toast('समाचार समीक्षा कतार में भेजा गया'); render();
    } catch (e) { toast(dbMsg(e), 'err'); }
  },
  'news-edit': async f => {
    const d = C.drafts.find(x => x.id === f.dataset.id); if (!d) return;
    const n = readNews(f, 'ne'), err = newsError(n);
    if (err) { $('#ne-err', f).textContent = err; return; }
    try { await CMS.putDraft({ ...clone(d), data: { ...d.data, ...n } }); closeSheet(); toast('ड्राफ़्ट अपडेट हुआ'); } catch (e) { toast(dbMsg(e), 'err'); }
  },
  'day-new': async f => {
    const d = readDay(f, 'df'), err = dayError(d);
    if (err) { toast(err, 'err'); return; }
    try {
      await CMS.putDraft({ type: 'day', status: 'draft', origin: 'manual', data: { id: 'd' + rid(), ...d } });
      Object.assign(dayForm, { t: '', y: '', h: '', o: '', f: '' });
      toast('दिवस समीक्षा कतार में भेजा गया'); render();
    } catch (e) { toast(dbMsg(e), 'err'); }
  },
  'day-edit': async f => {
    const d = C.drafts.find(x => x.id === f.dataset.id); if (!d) return;
    const v = readDay(f, 'de'), err = dayError(v);
    if (err) { $('#de-err', f).textContent = err; return; }
    try { await CMS.putDraft({ ...clone(d), data: { ...d.data, ...v } }); closeSheet(); toast('ड्राफ़्ट अपडेट हुआ'); } catch (e) { toast(dbMsg(e), 'err'); }
  },
};
const BINDS = { aiForm, newsForm, dayForm, onb, pubForm };
function setBind(path, el) { const [o, k] = path.split('.'); if (BINDS[o]) BINDS[o][k] = el.value; }
function renderSearch(term) {
  const box = $('#search-results');
  if (!box) return;
  const t = term.trim().toLowerCase();
  if (t.length < 2) { box.innerHTML = emptyState('search', 'कम से कम 2 अक्षर लिखें', 'प्रश्न, विकल्प और व्याख्या में खोज होगी।'); return; }
  const res = M().all.filter(q => (q.q + ' ' + q.o.join(' ') + ' ' + (q.e || '')).toLowerCase().includes(t)).slice(0, 30);
  box.innerHTML = res.length ? res.map(q => `<button class="row" data-act="open-q" data-id="${esc(q.id)}"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(q.q)}</span><span class="row-sub">${esc(SUBJ[q.s] ? SUBJ[q.s].name : '')}</span></span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('search', 'कोई प्रश्न नहीं मिला', 'दूसरा शब्द आज़माएँ।');
}
function updateApproveBtn(id, el) {
  if (el) { (reviewChecks[id] = reviewChecks[id] || [])[Number(el.dataset.ci)] = el.checked; }
  const boxes = $$(`input[data-chk="${CSS.escape(id)}"]`);
  const btn = document.getElementById('ap-' + id);
  if (btn) btn.disabled = !boxes.every(b => b.checked);
}

// ───────────────────────────── router & render ─────────────────────────────
const ROUTES = { home: vHome, quiz: vQuiz, play: vPlay, result: vResult, ca: vCA, today: vToday, mock: vMock, exam: vExam, 'exam-result': vExamResult, bookmarks: vBookmarks, profile: vProfile, admin: vAdmin, 'admin-ai': vAdminAI, 'admin-review': vAdminReview, 'admin-publish': vAdminPublish, 'admin-bank': vAdminBank, 'admin-news': vAdminNews, 'admin-days': vAdminDays };
const NO_NAV = new Set(['play', 'result', 'exam', 'exam-result', ...ADMIN_ROUTES]);
let route = 'home';
const routeFromHash = () => { const h = decodeURIComponent(location.hash.replace(/^#/, '')); return ROUTES[h] ? h : 'home'; };
function go(r) {
  if (!ROUTES[r]) r = 'home';
  if (location.hash.replace(/^#/, '') === r) { route = r; render(true); return; }
  location.hash = r;
}
function redirect(r) {
  setTimeout(() => { try { history.replaceState(null, '', '#' + r); } catch { /* ignore */ } route = r; render(true); }, 0);
  return '<main class="page gutter"></main>';
}
window.addEventListener('hashchange', () => { route = routeFromHash(); closeSheet(); render(true); });

let renderQueued = false, deferred = false, tickId = 0;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const a = document.activeElement;
    if (a && $('#app').contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { deferred = true; return; }
    render(false);
  });
}
function render(routeChanged = false) {
  clearInterval(tickId); tickId = 0;
  const app = $('#app');
  app.innerHTML = (ROUTES[route] || vHome)();
  app.classList.toggle('no-nav', NO_NAV.has(route));
  app.classList.toggle('exam-pad', route === 'exam');
  if (routeChanged) window.scrollTo(0, 0);
  afterRender();
}
function afterRender() {
  if (route === 'play' && S && S.timed) {
    const q = S.qs[S.i];
    if (q && !S.ans[q.id]) {
      const tick = () => {
        const left = Math.ceil(TIMED_SECONDS - (Date.now() - S.shownAt) / 1000);
        const v = $('#qtimer-v');
        if (v) v.textContent = String(Math.max(0, left));
        const t = $('#qtimer');
        if (t) t.classList.toggle('low', left <= 10);
        if (left <= 0) { clearInterval(tickId); tickId = 0; answer(-1); }
      };
      tick(); tickId = setInterval(tick, 250);
    }
  }
  if (route === 'exam' && E) {
    const tick = () => {
      if (!E) return;
      const left = E.endsAt - Date.now();
      const v = $('#etimer-v');
      if (v) v.textContent = fmtSecs(Math.max(0, Math.ceil(left / 1000)));
      const t = $('#etimer');
      if (t) t.classList.toggle('low', left < 60000);
      if (left <= 0) { clearInterval(tickId); tickId = 0; submitExam(true); }
    };
    tick(); tickId = setInterval(tick, 500);
  }
}

// ───────────────────────────── events ─────────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act !== 'sheet-nav') e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form];
  if (fn) fn(f);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q-search') renderSearch(t.value);
  else if (t.id === 'bank-search') { bankState.term = t.value; bankState.limit = 40; const box = $('#bank-list'); if (box) box.innerHTML = bankListHtml(); }
  if (t.dataset.bind) setBind(t.dataset.bind, t);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.chk) updateApproveBtn(t.dataset.chk, t);
  if (t.id === 'mock-agree') { const b = $('#mock-start'); if (b) b.disabled = !t.checked; }
  if (t.dataset.bind) setBind(t.dataset.bind, t);
  if (t.dataset.change && CHANGES[t.dataset.change]) CHANGES[t.dataset.change](t);
});
document.addEventListener('focusout', () => { if (deferred) { deferred = false; setTimeout(scheduleRender, 0); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) { closeSheet(); return; }
  if (sheetOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  if (route === 'play' && S) {
    const k = e.key.toLowerCase();
    const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
    if (k in map && !S.ans[S.qs[S.i].id]) { e.preventDefault(); answer(map[k]); }
    else if (k === 'arrowright') { e.preventDefault(); nextQ(); }
    else if (k === 'arrowleft') { e.preventDefault(); ACTIONS['prev-q'](); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { clearTimeout(U.t); U.flush(); } });

// ───────────────────────────── boot ─────────────────────────────
function boot() {
  U.load();
  applySettings();
  const live = document.createElement('div');
  live.id = 'sr-live'; live.className = 'sr'; live.setAttribute('aria-live', 'assertive');
  document.body.appendChild(live);
  route = routeFromHash();
  if (P.mode === 'standalone') loadLocalCms();
  render(true);
  loadBase();
  initPlatform().then(() => {
    if (P.mode === 'artifact') { subscribeLive(); subscribeCms(); U.syncRemote(); }
    scheduleRender();
  });
  if (P.mode === 'standalone' && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
}
boot();
})();
