// ───────────────────────────── platform ─────────────────────────────
const CFG = window.MYQUIZ_CONFIG || {};
// Tester build (demo): content, progress and admin changes stay in this browser, and a bug reporter
// plus a guided test plan are added. Enable with MYQUIZ_CONFIG.demo or ?demo=1 on a static host.
const DEMO = !!CFG.demo || /[?&]demo(=1|=true)?(&|$)/.test(location.search);
const BUILD = String(CFG.build || 'v4.0');
const P = {
  mode: window.claude && typeof window.claude.use === 'function' ? 'artifact' : 'standalone',
  demo: DEMO,
  db: null,  // the artifact database, when this view has one
  cdb: null, // database for content, progress and leaderboard; null keeps them in this browser
  user: null, sample: null, tts: null, downloads: null, uid: null, owner: false,
  isAdmin: false, editor: false, ready: false, progressRemote: false,
  // Self-hosted app with Google sign-in: Firebase Auth + Firestore replace this browser's storage (see config.js).
  cloud: !!(CFG.firebase && CFG.firebase.apiKey) && !(window.claude && typeof window.claude.use === 'function') && !DEMO,
  authUser: null,
};
const LOCAL = () => (P.mode === 'standalone' && !P.cloud) || P.demo;
if (LOCAL()) P.isAdmin = true; // local demo: the admin panel edits this browser's copy only
const aiEndpoint = () => CFG.aiEndpoint || '';

async function initPlatform() {
  if (P.mode !== 'artifact') { if (P.cloud) { await initFirebase(); return; } P.ready = true; return; }
  const use = n => Promise.resolve().then(() => window.claude.use(n)).catch(() => null);
  const [db, user, sample, tts, downloads] = await Promise.all([use('db'), use('user'), use('sample'), use('tts'), use('downloads')]);
  P.db = db; P.cdb = P.demo ? null : db; P.user = user; P.sample = sample; P.tts = tts; P.downloads = downloads;
  if (user) {
    try { P.uid = await user.id(); } catch { P.uid = null; }
    try { P.editor = !!db && (await user.canEdit()); } catch { P.editor = false; }
    try { P.owner = !!(await user.isOwner()); } catch { P.owner = false; }
  }
  P.isAdmin = P.demo ? true : P.editor;
  P.ready = true;
}

function dbMsg(e) {
  const c0 = e && e.code;
  const c = { 'permission-denied': 'not_granted', unauthenticated: 'not_granted', 'resource-exhausted': 'resource_exhausted', 'invalid-argument': 'invalid_argument', 'failed-precondition': 'invalid_argument' }[c0] || c0;
  const m = {
    invalid_argument: ['यह बदलाव सहेजा नहीं जा सका — आपके पास अनुमति नहीं है या डेटा अमान्य है।', 'This change could not be saved: you don\'t have permission or the data is invalid.'],
    quota_exceeded: ['संग्रहण सीमा भर गई है — पुरानी सामग्री हटाकर फिर कोशिश करें।', 'Storage is full. Remove old content and try again.'],
    resource_exhausted: ['बहुत तेज़ी से बदलाव हो रहे हैं — कुछ सेकंड रुककर फिर कोशिश करें।', 'Too many changes at once. Wait a few seconds and try again.'],
    unavailable: ['सर्वर अभी उपलब्ध नहीं है — थोड़ी देर बाद फिर कोशिश करें।', 'The server is unavailable. Try again in a moment.'],
    revoked: ['आपकी पहुँच बदल गई है — पेज दोबारा खोलें।', 'Your access has changed. Reopen the page.'],
    not_granted: ['इस कार्य की अनुमति नहीं है।', 'You don\'t have permission to do this.'],
  }[c];
  return m ? L(m[0], m[1]) : L('सहेजा नहीं जा सका — फिर कोशिश करें।', 'Could not save. Please try again.');
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
    const m = {
      not_granted: ['AI की अनुमति नहीं दी गई। अनुमति देकर फिर कोशिश करें।', 'Permission to use AI was not given. Allow it and try again.'],
      sampling_disabled: ['इस खाते के लिए AI उपलब्ध नहीं है।', 'AI is not available for this account.'],
      rate_limited: ['अभी बहुत अनुरोध हो गए हैं — थोड़ी देर बाद फिर कोशिश करें।', 'Too many requests right now. Try again in a little while.'],
      invalid_json: ['AI का उत्तर सही प्रारूप में नहीं आया। "फिर से बनाएँ" दबाएँ।', 'The AI reply was not in the expected format. Tap "Generate again".'],
      refused: ['AI ने यह अनुरोध पूरा नहीं किया। स्रोत पाठ बदलकर देखें।', 'The AI declined this request. Try a different source text.'],
      prompt_too_large: ['स्रोत पाठ बहुत लंबा है — इसे छोटा करें।', 'The source text is too long. Shorten it.'],
      session_expired: ['दोबारा साइन इन करें।', 'Please sign in again.'],
      unavailable: ['AI इस संस्करण में जुड़ा नहीं है।', 'AI is not connected in this version.'],
      cancelled: ['रोक दिया गया।', 'Stopped.'],
    }[e && e.code];
    return m ? L(m[0], m[1]) : L('AI से उत्तर नहीं मिला। थोड़ी देर बाद फिर कोशिश करें।', 'No answer from the AI. Try again in a little while.');
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
  return `आप भारत की सरकारी प्रतियोगी परीक्षाओं (SSC, रेलवे, राज्य PSC आदि) के लिए सामान्य ज्ञान के बहुविकल्पीय प्रश्न (MCQ) बनाने वाले अनुभवी शिक्षक हैं।

नीचे दिए "स्रोत पाठ" के आधार पर ठीक ${f.n} प्रश्न बनाइए। हर प्रश्न हिंदी और अंग्रेज़ी दोनों में चाहिए।

नियम:
1. हर प्रश्न केवल स्रोत पाठ में लिखे तथ्यों पर आधारित हो। पाठ में न दिया गया कोई तथ्य, संख्या या नाम न जोड़ें।
2. हर प्रश्न के ठीक 4 विकल्प हों और केवल एक सही हो। विकल्प एक ही प्रकार के और लगभग समान लंबाई के हों। "उपरोक्त सभी" या "इनमें से कोई नहीं" जैसे विकल्प न दें।
3. सही विकल्प की स्थिति (0 से 3) प्रश्नों में बदलती रहे।
4. "e" में 1–2 वाक्यों की व्याख्या दें, जिसमें स्रोत पाठ का तथ्य हो।
5. हिंदी सरल और शुद्ध (देवनागरी) हो। संख्याएँ अंकों में लिखें। ISRO जैसे प्रचलित संक्षिप्त नाम चल सकते हैं।
6. कठिनाई स्तर: ${level}। विषय: ${(SUBJ[f.subj] || {}).name || 'सामान्य ज्ञान'}।
7. "t" में 2–4 शब्दों का उप-विषय लिखें।
8. "en" में उसी प्रश्न का सरल अंग्रेज़ी अनुवाद दें: "q", उसी क्रम में वही 4 विकल्प "o", "e" और "t"। सही उत्तर की स्थिति "a" दोनों भाषाओं में एक ही रहेगी।

केवल JSON array लौटाइए, कोई और पाठ नहीं। प्रारूप:
[{"q":"प्रश्न?","o":["विकल्प 1","विकल्प 2","विकल्प 3","विकल्प 4"],"a":2,"e":"व्याख्या","t":"उप-विषय","en":{"q":"Question?","o":["Option 1","Option 2","Option 3","Option 4"],"e":"Explanation","t":"Topic"}}]

स्रोत पाठ:
"""
${String(f.text).slice(0, 12000)}
"""`;
}
function explainPrompt(q, a) {
  const wrong = a && !a.ok && a.sel >= 0;
  const o = qO(q);
  if (LANG === 'en') {
    return `You are a patient teacher. Explain in simple English to a competitive-exam student why the correct answer to the question below is right${wrong ? ' and why the option the student chose is wrong' : ''}.
- At most 110 words, short sentences.
- Only state facts you are fully sure of.
- End with one line that starts with "Memory tip:".
- Do not use Markdown, bullets or asterisks.

Question: ${qT(q)}
Options: ${o.map((x, i) => `${LETTERS[i]}) ${x}`).join('   ')}
Correct answer: ${LETTERS[q.a]}) ${o[q.a]}
${wrong ? `Student's answer: ${LETTERS[a.sel]}) ${o[a.sel]}\n` : ''}Given explanation: ${qE(q) || '—'}`;
  }
  return `आप एक धैर्यवान शिक्षक हैं। प्रतियोगी परीक्षा की तैयारी कर रहे विद्यार्थी को सरल हिंदी में समझाइए कि नीचे दिए प्रश्न का सही उत्तर क्यों सही है${wrong ? ' और विद्यार्थी का चुना हुआ विकल्प क्यों गलत है' : ''}।
- अधिकतम 110 शब्द, छोटे वाक्य।
- केवल वही तथ्य लिखें जिनके बारे में आप पूरी तरह आश्वस्त हों।
- अंत में "याद रखने की ट्रिक:" से शुरू होने वाली एक पंक्ति दें।
- Markdown, बुलेट या तारांकन चिह्न का प्रयोग न करें।

प्रश्न: ${q.q}
विकल्प: ${q.o.map((x, i) => `${LETTERS[i]}) ${x}`).join('   ')}
सही उत्तर: ${LETTERS[q.a]}) ${q.o[q.a]}
${wrong ? `विद्यार्थी का उत्तर: ${LETTERS[a.sel]}) ${q.o[a.sel]}\n` : ''}दी गई व्याख्या: ${q.e || '—'}`;
}
function newsPrompt(raw) {
  return `नीचे दिए समाचार पाठ से प्रतियोगी परीक्षा के लिए करेंट अफेयर्स प्रविष्टि बनाइए, हिंदी और अंग्रेज़ी दोनों में। केवल पाठ में दिए तथ्यों का प्रयोग करें; कुछ भी अनुमान से न जोड़ें।
केवल एक JSON object लौटाइए:
{"title":"हिंदी शीर्षक, अधिकतम 80 अक्षर","cat":"इनमें से एक: ${CATS.map(c => c.k).join(' | ')}","summary":"2–3 वाक्यों का हिंदी सारांश","facts":["परीक्षा के लिए उपयोगी एक-पंक्ति तथ्य"],"date":"YYYY-MM-DD यदि पाठ में घटना की तारीख़ हो, वरना खाली","en":{"title":"English title","summary":"2–3 sentence English summary","facts":["One-line exam fact in English"]}}
facts में 3–5 बिंदु हों और en.facts उसी क्रम में उनका अनुवाद हो।

समाचार पाठ:
"""
${String(raw).slice(0, 12000)}
"""`;
}
function normalizeOpts(arr) {
  if (!Array.isArray(arr)) return null;
  const o = arr.map(s => String(s ?? '').trim());
  return o.length === 4 && o.every(Boolean) && new Set(o).size === 4 ? o.map(s => s.slice(0, 160)) : null;
}
function normalizeAIQ(x) {
  if (!x || typeof x !== 'object') return null;
  const o = normalizeOpts(Array.isArray(x.o) ? x.o : x.options);
  const a = Number(x.a ?? x.answer);
  const q = String(x.q ?? x.question ?? '').trim();
  if (!q || !o || !Number.isInteger(a) || a < 0 || a > 3) return null;
  const out = { q: q.slice(0, 400), o, a, e: String(x.e ?? x.explanation ?? '').trim().slice(0, 600), t: String(x.t ?? '').trim().slice(0, 40) };
  const en = x.en && typeof x.en === 'object' ? x.en : null;
  const eo = en && normalizeOpts(en.o);
  if (en && eo && String(en.q || '').trim()) out.en = { q: String(en.q).trim().slice(0, 400), o: eo, e: String(en.e || '').trim().slice(0, 600), t: String(en.t || '').trim().slice(0, 40) };
  return out;
}

