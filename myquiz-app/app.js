/* MY QUIZ — app.js (v2.0)
 * हिंदी + English सामान्य ज्ञान ऐप: दैनिक क्विज, विषयवार क्विज, करेंट अफेयर्स, आज का दिन, अभ्यास परीक्षा,
 * रिवॉर्ड पॉइंट्स, साप्ताहिक/मासिक लीडरबोर्ड, बुकमार्क, प्रगति और एडमिन CMS (AI प्रश्न → मानव समीक्षा → प्रकाशन)।
 *
 * One codebase, three ways to run:
 *  • Standalone (any static host or installed PWA): built-in content from /data; progress, admin changes and
 *    the leaderboard stay in this browser. Optional AI: window.MYQUIZ_CONFIG = { aiEndpoint } (see README).
 *  • claude.ai Artifact: shared content in the `db` capability (pub/…), drafts (cms/…), error reports
 *    (reports/…), the leaderboard (lb/{user}) and each learner's private progress (data/users/{user}/progress).
 *    Claude is reached through the `sample` capability.
 *  • Tester build (MYQUIZ_CONFIG.demo or ?demo=1): everything local, plus a bug reporter and a test checklist.
 */
(() => {
'use strict';

// ───────────────────────────── constants ─────────────────────────────
const STREAK_MIN = 5;                    // answers in a day that keep the streak alive
const TIMED_SECONDS = 30;                // per question in timed practice
const SRS_GAPS = [0, 1, 3, 7, 14, 30];   // days until a question is due again, by Leitner box
const LETTERS = ['A', 'B', 'C', 'D'];
const MONTHS = {
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const WEEKDAYS = {
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const WEEKDAYS_SHORT = { hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

const SUBJECTS = [
  { k: 'history', name: 'भारतीय इतिहास', en: 'Indian History', icon: 'landmark', c: '#E0532A' },
  { k: 'geography', name: 'भूगोल', en: 'Geography', icon: 'globe', c: '#13915C' },
  { k: 'polity', name: 'भारतीय संविधान', en: 'Indian Constitution', icon: 'scale', c: '#C88A00' },
  { k: 'science', name: 'सामान्य विज्ञान', en: 'General Science', icon: 'flask', c: '#7A3FE0' },
  { k: 'sports', name: 'खेलकूद', en: 'Sports', icon: 'trophy', c: '#D97706' },
  { k: 'misc', name: 'अन्य विषय', en: 'Other Subjects', icon: 'book', c: '#1F63E0' },
  { k: 'ca', name: 'करेंट अफेयर्स', en: 'Current Affairs', icon: 'newspaper', c: '#C2410C' },
  { k: 'days', name: 'महत्वपूर्ण दिवस', en: 'Important Days', icon: 'calendar', c: '#11803B' },
];
const SUBJ = Object.fromEntries(SUBJECTS.map(s => [s.k, s]));
const CATS = [
  { k: 'राष्ट्रीय', en: 'National', icon: 'landmark', c1: '#3B5BDB', c2: '#1C2F8F' },
  { k: 'अंतरराष्ट्रीय', en: 'International', icon: 'globe', c1: '#2E9BD6', c2: '#155E8F' },
  { k: 'विज्ञान एवं तकनीक', en: 'Science & Tech', icon: 'rocket', c1: '#4C6EF5', c2: '#2B3FB8' },
  { k: 'खेल', en: 'Sports', icon: 'trophy', c1: '#F59F00', c2: '#A85400' },
  { k: 'अर्थव्यवस्था', en: 'Economy', icon: 'trend', c1: '#12B886', c2: '#08765A' },
  { k: 'पर्यावरण', en: 'Environment', icon: 'leaf', c1: '#40C057', c2: '#237A33' },
  { k: 'कला एवं संस्कृति', en: 'Art & Culture', icon: 'film', c1: '#BE4BDB', c2: '#7B2A99' },
];
const KINDS = {
  'राष्ट्रीय': { en: 'National', c: '#C2410C', icon: 'flag', y: 'प्रारंभ', yEn: 'Since' },
  'अंतरराष्ट्रीय': { en: 'International', c: '#1D4ED8', icon: 'globe', y: 'प्रारंभ', yEn: 'Since' },
  'जयंती': { en: 'Birth anniversary', c: '#7C3AED', icon: 'star', y: 'प्रारंभ', yEn: 'Since' },
  'स्थापना दिवस': { en: 'Foundation day', c: '#0F766E', icon: 'landmark', y: 'स्थापना', yEn: 'Formed' },
  'स्मृति दिवस': { en: 'Remembrance day', c: '#475569', icon: 'bulb', y: 'घटना वर्ष', yEn: 'Year' },
};
// Examination categories (a learner picks one in onboarding; content is tagged by relevance).
const EXAMS = [
  { id: 'upsc', hi: 'UPSC', en: 'UPSC', dhi: 'सिविल सेवा', den: 'Civil services' },
  { id: 'ssc', hi: 'SSC CGL', en: 'SSC CGL', dhi: 'SSC CGL, CHSL, MTS', den: 'SSC CGL, CHSL, MTS' },
  { id: 'bank', hi: 'बैंकिंग', en: 'Banking', dhi: 'IBPS, SBI, RBI', den: 'IBPS, SBI, RBI' },
  { id: 'rail', hi: 'रेलवे', en: 'Railway', dhi: 'RRB NTPC, ग्रुप D', den: 'RRB NTPC, Group D' },
  { id: 'psc', hi: 'राज्य PSC', en: 'State PSC', dhi: 'राज्य सिविल सेवा', den: 'State civil services' },
  { id: 'nda', hi: 'NDA/CDS', en: 'NDA/CDS', dhi: 'रक्षा सेवाएँ', den: 'Defence services' },
  { id: 'school', hi: 'स्कूल/कॉलेज', en: 'School & college', dhi: 'कक्षा 6–12 और कॉलेज', den: 'Classes 6–12 and college' },
  { id: 'gk', hi: 'सामान्य ज्ञान', en: 'General Knowledge', dhi: 'हर परीक्षा के लिए', den: 'For every exam' },
];
const EXAM_OLD = { 'SSC': 'ssc', 'रेलवे': 'rail', 'बैंकिंग': 'bank', 'राज्य PSC': 'psc', 'पुलिस': 'gk', 'शिक्षक भर्ती': 'school', 'अन्य': 'gk' };
const ALL_EX = ['upsc', 'ssc', 'rail', 'psc', 'nda', 'school', 'gk'];
// Subject → chapters. Questions carry `ch`; exam relevance (`ex`) comes from the chapter unless a question overrides it.
const CHAPTERS = [
  { id: 'h-anc', s: 'history', hi: 'प्राचीन भारत', en: 'Ancient India', ex: ALL_EX },
  { id: 'h-med', s: 'history', hi: 'मध्यकालीन भारत', en: 'Medieval India', ex: ALL_EX },
  { id: 'h-mod', s: 'history', hi: 'आधुनिक भारत', en: 'Modern India', ex: ALL_EX },
  { id: 'h-free', s: 'history', hi: 'स्वतंत्रता आंदोलन', en: 'Freedom Struggle', ex: ALL_EX },
  { id: 'g-water', s: 'geography', hi: 'नदियाँ और झीलें', en: 'Rivers and Lakes', ex: ALL_EX },
  { id: 'g-relief', s: 'geography', hi: 'पर्वत, दर्रे और सीमाएँ', en: 'Mountains, Passes and Borders', ex: ALL_EX },
  { id: 'g-india', s: 'geography', hi: 'भारत: राज्य, जलवायु और मिट्टी', en: 'India: States, Climate and Soils', ex: ALL_EX },
  { id: 'g-world', s: 'geography', hi: 'विश्व भूगोल', en: 'World Geography', ex: ['upsc', 'ssc', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'p-making', s: 'polity', hi: 'संविधान निर्माण और स्रोत', en: 'Making of the Constitution', ex: ALL_EX },
  { id: 'p-rights', s: 'polity', hi: 'मौलिक अधिकार', en: 'Fundamental Rights', ex: ALL_EX },
  { id: 'p-union', s: 'polity', hi: 'संघ सरकार और आपातकाल', en: 'Union Government and Emergency', ex: ['upsc', 'ssc', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'p-amend', s: 'polity', hi: 'संशोधन और स्थानीय शासन', en: 'Amendments and Local Government', ex: ['upsc', 'ssc', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'sc-bio', s: 'science', hi: 'जीव विज्ञान', en: 'Biology', ex: ['ssc', 'rail', 'psc', 'nda', 'school', 'gk'] },
  { id: 'sc-phy', s: 'science', hi: 'भौतिकी', en: 'Physics', ex: ['ssc', 'rail', 'psc', 'nda', 'school', 'gk'] },
  { id: 'sc-chem', s: 'science', hi: 'रसायन विज्ञान', en: 'Chemistry', ex: ['ssc', 'rail', 'psc', 'nda', 'school', 'gk'] },
  { id: 'sp-events', s: 'sports', hi: 'प्रतियोगिताएँ और ओलंपिक', en: 'Tournaments and Olympics', ex: ['ssc', 'rail', 'bank', 'gk'] },
  { id: 'sp-rules', s: 'sports', hi: 'खेल नियम और स्थल', en: 'Rules and Venues', ex: ['ssc', 'rail', 'bank', 'gk'] },
  { id: 'sp-awards', s: 'sports', hi: 'खेल पुरस्कार और दिवस', en: 'Sports Awards and Days', ex: ['ssc', 'rail', 'bank', 'gk'] },
  { id: 'm-econ', s: 'misc', hi: 'अर्थव्यवस्था और कृषि', en: 'Economy and Agriculture', ex: ['upsc', 'ssc', 'bank', 'rail', 'psc', 'gk'] },
  { id: 'm-tech', s: 'misc', hi: 'कंप्यूटर', en: 'Computers', ex: ['ssc', 'bank', 'rail', 'school', 'gk'] },
  { id: 'm-media', s: 'misc', hi: 'मीडिया और संचार', en: 'Media and Communication', ex: ['ssc', 'rail', 'gk'] },
  { id: 'm-symbols', s: 'misc', hi: 'प्रतीक, पुरस्कार और संगठन', en: 'Symbols, Awards and Organisations', ex: ['ssc', 'rail', 'bank', 'nda', 'school', 'gk'] },
  { id: 'ca-sci', s: 'ca', hi: 'विज्ञान एवं तकनीक', en: 'Science and Technology', ex: ['upsc', 'ssc', 'bank', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'ca-sports', s: 'ca', hi: 'खेल', en: 'Sports', ex: ['ssc', 'bank', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'ca-culture', s: 'ca', hi: 'कला एवं संस्कृति', en: 'Art and Culture', ex: ['upsc', 'ssc', 'bank', 'rail', 'psc', 'gk'] },
  { id: 'ca-env', s: 'ca', hi: 'पर्यावरण', en: 'Environment', ex: ['upsc', 'ssc', 'bank', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'ca-intl', s: 'ca', hi: 'अंतरराष्ट्रीय', en: 'International', ex: ['upsc', 'ssc', 'bank', 'rail', 'psc', 'nda', 'gk'] },
  { id: 'ca-econ', s: 'ca', hi: 'अर्थव्यवस्था', en: 'Economy', ex: ['upsc', 'ssc', 'bank', 'rail', 'psc', 'gk'] },
  { id: 'd-nat', s: 'days', hi: 'राष्ट्रीय दिवस', en: 'National Days', ex: ['ssc', 'rail', 'bank', 'school', 'gk'] },
  { id: 'd-intl', s: 'days', hi: 'अंतरराष्ट्रीय दिवस', en: 'International Days', ex: ['ssc', 'rail', 'bank', 'school', 'gk'] },
  { id: 'd-jay', s: 'days', hi: 'जयंती', en: 'Birth Anniversaries', ex: ['ssc', 'rail', 'bank', 'school', 'gk'] },
  { id: 'd-found', s: 'days', hi: 'स्थापना दिवस', en: 'Foundation Days', ex: ['ssc', 'rail', 'bank', 'school', 'gk'] },
  { id: 'd-smriti', s: 'days', hi: 'स्मृति दिवस', en: 'Remembrance Days', ex: ['ssc', 'rail', 'bank', 'school', 'gk'] },
];
const CHM = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
const KIND_CH = { 'राष्ट्रीय': 'd-nat', 'अंतरराष्ट्रीय': 'd-intl', 'जयंती': 'd-jay', 'स्थापना दिवस': 'd-found', 'स्मृति दिवस': 'd-smriti' };
const DIFF = { 1: ['शुरुआती', 'Beginner'], 2: ['मध्यम', 'Intermediate'], 3: ['उन्नत', 'Advanced'] };
// Mastery of a chapter or topic, from coverage and accuracy of the latest attempts.
const MASTERY = [['शुरू नहीं', 'Not started'], ['सीख रहे हैं', 'Learning'], ['अभ्यास में', 'Practising'], ['मज़बूत', 'Strong'], ['महारत', 'Mastered']];
const MOCKS = [
  { id: 'gk-1', title: 'सामान्य ज्ञान मिनी मॉक – 1', titleEn: 'General Knowledge Mini Mock – 1', desc: 'इतिहास, भूगोल, संविधान, विज्ञान, खेल और विविध — SSC जैसी अंकन योजना।', descEn: 'History, geography, polity, science, sports and more, with SSC-style marking.', mix: { history: 4, geography: 3, polity: 4, science: 4, sports: 2, misc: 3 }, mins: 12, pos: 2, neg: 0.5 },
  { id: 'ca-latest', title: 'करेंट अफेयर्स मॉक', titleEn: 'Current Affairs Mock', desc: 'हाल की प्रमुख ख़बरों से 12 प्रश्न।', descEn: '12 questions from recent major news.', mix: { ca: 12 }, latest: true, mins: 8, pos: 2, neg: 0.5 },
  { id: 'days-1', title: 'महत्वपूर्ण दिवस मॉक', titleEn: 'Important Days Mock', desc: 'राष्ट्रीय और अंतरराष्ट्रीय दिवस, जयंती और स्थापना दिवस।', descEn: 'National and international days, birth anniversaries and foundation days.', mix: { days: 15 }, mins: 8, pos: 1, neg: 0.25 },
];
const TYPE_LABEL = { q: ['प्रश्न', 'Question'], news: ['समाचार', 'News'], day: ['दिवस', 'Day'] };
const COLL = { q: 'q', news: 'news', day: 'days' };

// Reward points. A question earns points only on its first attempt each day; daily cap stops farming.
const PTS = { correct: 10, wrong: 1, timed: 2, daily: 20, perfect: 20, goal: 20, streakStep: 5, streakMax: 50, mockX: 3, revise: 5, wchal: 30, cap: 600 };
const PTS_REASON = {
  correct: ['सही उत्तर', 'Correct answers'], wrong: ['प्रयास', 'Attempts'], goal: ['रोज़ का लक्ष्य पूरा', 'Daily goal reached'],
  streak: ['स्ट्रीक बोनस', 'Streak bonus'], daily: ['दैनिक क्विज पूरा', 'Daily quiz completed'], perfect: ['दैनिक क्विज में सभी सही', 'Perfect daily quiz'],
  mock: ['मॉक टेस्ट', 'Mock test'], revise: ['दोहराव में सही', 'Correct on revision'], wchal: ['साप्ताहिक चुनौती', 'Weekly challenge'],
};
const BADGES = [
  { id: 'first', icon: 'zap', hi: 'पहला क़दम', en: 'First step', dhi: 'पहला प्रश्न हल किया', den: 'Answered your first question', test: s => s.answers >= 1 },
  { id: 'streak3', icon: 'flame', hi: '3 दिन की स्ट्रीक', en: '3-day streak', dhi: 'लगातार 3 दिन तैयारी', den: 'Practised 3 days in a row', test: s => s.best >= 3 },
  { id: 'streak7', icon: 'flame', hi: '7 दिन की स्ट्रीक', en: '7-day streak', dhi: 'लगातार 7 दिन तैयारी', den: 'Practised 7 days in a row', test: s => s.best >= 7 },
  { id: 'q100', icon: 'target', hi: '100 उत्तर', en: '100 answers', dhi: '100 प्रश्नों के उत्तर दिए', den: 'Answered 100 questions', test: s => s.answers >= 100 },
  { id: 'acc80', icon: 'check', hi: 'सटीक निशाना', en: 'Sharp shooter', dhi: '50+ उत्तरों में 80% सटीकता', den: '80% accuracy over 50+ answers', test: s => s.answers >= 50 && s.acc >= 80 },
  { id: 'mock', icon: 'clipboard', hi: 'मॉक योद्धा', en: 'Mock warrior', dhi: 'पहला मॉक टेस्ट दिया', den: 'Took your first mock test', test: s => s.mocks >= 1 },
  { id: 'pts1k', icon: 'coins', hi: '1,000 पॉइंट्स', en: '1,000 points', dhi: 'कुल 1,000 पॉइंट्स जुटाए', den: 'Collected 1,000 points in total', test: s => s.total >= 1000 },
  { id: 'reviser', icon: 'rotate', hi: 'दोहराव का धनी', en: 'Reviser', dhi: 'दोहराव में 25 सही उत्तर', den: '25 correct answers in revision', test: s => s.revised >= 25 },
  { id: 'master', icon: 'layers', hi: 'अध्याय में महारत', en: 'Chapter master', dhi: 'किसी अध्याय में महारत हासिल की', den: 'Mastered a chapter', test: s => s.mastered >= 1 },
  { id: 'weekly', icon: 'swords', hi: 'चुनौती स्वीकार', en: 'Challenger', dhi: 'पहली साप्ताहिक चुनौती पूरी की', den: 'Finished a weekly challenge', test: s => s.wcs >= 1 },
  { id: 'top3', icon: 'crown', hi: 'टॉप 3 विजेता', en: 'Top 3 winner', dhi: 'किसी सप्ताह या महीने के टॉप 3 में', den: 'Finished in a week or month top 3', test: s => s.won },
];

// ───────────────────────────── utilities & language ─────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const parseISO = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const clone = v => JSON.parse(JSON.stringify(v));
const uniq = a => [...new Set(a)];
const fmtSecs = s => `${Math.floor(s / 60)}:${pad(Math.max(0, s) % 60)}`;
const fmtScore = x => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
const fmtNum = n => Number(n || 0).toLocaleString('en-IN');
const initial = name => (Array.from(String(name).trim())[0] || '?').toUpperCase();
const safeUrl = u => (/^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '');
const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function hashSeed(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function rng(seed) { let a = hashSeed(String(seed)); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Language: every visible string is written as L(hindi, english). Content records carry an `en`
// object; tx() reads the English field when the app is in English and falls back to Hindi.
let LANG = 'hi';
const L = (hi, en) => (LANG === 'en' && en != null && en !== '' ? en : hi);
function setLang(l) { LANG = l === 'en' ? 'en' : 'hi'; document.documentElement.lang = LANG; }
const tx = (x, k) => {
  if (!x) return '';
  const e = LANG === 'en' && x.en ? x.en[k] : null;
  return e != null && e !== '' && !(Array.isArray(e) && !e.length) ? e : x[k];
};
const fmtMDin = (md, lang) => { const [m, d] = String(md).split('-').map(Number); return `${d} ${MONTHS[lang][(m || 1) - 1]}`; };
const fmtMD = md => fmtMDin(md, LANG);
const fmtDate = (iso, year = true) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS[LANG][d.getMonth()]}${year ? ' ' + d.getFullYear() : ''}`; };
const weekday = iso => WEEKDAYS[LANG][parseISO(iso).getDay()];
const monthShort = i => (LANG === 'en' ? MONTHS.en[i].slice(0, 3) : MONTHS.hi[i].slice(0, 4));
// Weeks run Monday–Sunday; a week is named by its Monday. Months are YYYY-MM.
const weekKey = iso => { const d = parseISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); };
const monthKey = iso => String(iso).slice(0, 7);
const prevMonthKey = mk => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 2, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const fmtWeek = wk => `${fmtDate(wk, false)} – ${fmtDate(addDays(wk, 6))}`;
const fmtMonth = mk => { const [y, m] = mk.split('-').map(Number); return `${MONTHS[LANG][m - 1]} ${y}`; };
function timeLeft(ms) {
  const h = Math.max(0, Math.floor(ms / 36e5)), d = Math.floor(h / 24), hh = h % 24;
  return d ? L(`${d} दिन ${hh} घंटे`, `${d}d ${hh}h`) : L(`${hh} घंटे ${Math.max(0, Math.floor((ms % 36e5) / 6e4))} मिनट`, `${hh}h ${Math.max(0, Math.floor((ms % 36e5) / 6e4))}m`);
}
function relTime(ts) {
  if (!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return L('अभी', 'just now');
  if (s < 3600) return L(`${Math.floor(s / 60)} मिनट पहले`, `${Math.floor(s / 60)} min ago`);
  if (s < 86400) return L(`${Math.floor(s / 3600)} घंटे पहले`, `${Math.floor(s / 3600)} h ago`);
  if (s < 7 * 86400) return L(`${Math.floor(s / 86400)} दिन पहले`, `${Math.floor(s / 86400)} d ago`);
  return fmtDate(isoOf(new Date(ts)));
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem('mq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mq.' + k, JSON.stringify(v)); } catch { /* storage may be unavailable */ } },
  del(k) { try { localStorage.removeItem('mq.' + k); } catch { /* ignore */ } },
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"></use></svg>`;
const capLogo = () => '<svg class="cap" aria-hidden="true" focusable="false"><use href="#i-cap"></use></svg>';

// ───────────────────────────── platform ─────────────────────────────
const CFG = window.MYQUIZ_CONFIG || {};
// Tester build (demo): content, progress and admin changes stay in this browser, and a bug reporter
// plus a guided test plan are added. Enable with MYQUIZ_CONFIG.demo or ?demo=1 on a static host.
const DEMO = !!CFG.demo || /[?&]demo(=1|=true)?(&|$)/.test(location.search);
const BUILD = String(CFG.build || 'v2.0');
const P = {
  mode: window.claude && typeof window.claude.use === 'function' ? 'artifact' : 'standalone',
  demo: DEMO,
  db: null,  // the artifact database, when this view has one
  cdb: null, // database for content, progress and leaderboard; null keeps them in this browser
  user: null, sample: null, uid: null,
  isAdmin: false, editor: false, ready: false, progressRemote: false,
};
const LOCAL = () => P.mode === 'standalone' || P.demo;
if (LOCAL()) P.isAdmin = true; // local demo: the admin panel edits this browser's copy only
const aiEndpoint = () => CFG.aiEndpoint || '';

async function initPlatform() {
  if (P.mode !== 'artifact') { P.ready = true; return; }
  const use = n => Promise.resolve().then(() => window.claude.use(n)).catch(() => null);
  const [db, user, sample] = await Promise.all([use('db'), use('user'), use('sample')]);
  P.db = db; P.cdb = P.demo ? null : db; P.user = user; P.sample = sample;
  if (user) {
    try { P.uid = await user.id(); } catch { P.uid = null; }
    try { P.editor = !!db && (await user.canEdit()); } catch { P.editor = false; }
  }
  P.isAdmin = P.demo ? true : P.editor;
  P.ready = true;
}

function dbMsg(e) {
  const c = e && e.code;
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
  if (!P.cdb) { C.liveState = 'off'; return; }
  C.liveState = 'loading';
  const timer = setTimeout(() => { if (C.liveState === 'loading') { C.liveState = 'slow'; bump(); } }, 10000);
  const check = { q: validQ, news: validNews, days: validDay };
  for (const k of Object.keys(check)) {
    try {
      P.cdb.collection(`pub/${k}/items`).onSnapshot(snap => {
        C.pub[k] = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(check[k]);
        if (!snap.metadata.fromCache) { clearTimeout(timer); C.liveState = 'ok'; }
        bump();
      }, () => { clearTimeout(timer); C.liveState = 'error'; bump(); });
    } catch { C.liveState = 'error'; }
  }
}
function subscribeCms() {
  if (!P.cdb || !P.isAdmin) return;
  C.cmsState = 'loading';
  const timer = setTimeout(() => { if (C.cmsState === 'loading') { C.cmsState = 'slow'; bump(); } }, 10000);
  try {
    P.cdb.collection('cms/drafts/items').onSnapshot(snap => {
      C.drafts = snap.docs.map(d => ({ ...clone(d.data()), id: d.id })).filter(d => d.data);
      if (!snap.metadata.fromCache) { clearTimeout(timer); C.cmsState = 'ok'; }
      bump();
    }, () => { clearTimeout(timer); C.cmsState = 'error'; bump(); });
    P.cdb.collection('reports').onSnapshot(snap => {
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
      map.set(x.id, { ...x, src: map.has(x.id) || base.some(b => b.id === x.id) ? 'edited' : 'live' });
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
  const byCh = {};
  for (const q of all) (byCh[chOf(q)] = byCh[chOf(q)] || []).push(q);
  memo = { ver: C.ver, day: today, qs, news, days, dayQs, all, byId, bySubj, byCh, newsById, daysByMd };
  return memo;
}
// Questions generated from the important-days calendar, in both languages (deterministic per entry).
function genDayQs(days) {
  const out = [];
  const mds = uniq(days.map(d => d.md));
  const enTitle = new Map(days.map(x => [x.t, (x.en && x.en.t) || x.t]));
  const mdOfTitle = new Map(days.map(x => [x.t, x.md]));
  const titlesOn = md => days.filter(x => x.md === md);
  for (const d of days) {
    const r = rng('dq:' + d.id);
    const dEn = d.en || {};
    const otherMds = shuffle(mds.filter(m => m !== d.md), r).slice(0, 3);
    if (otherMds.length === 3) {
      const opts = shuffle([d.md, ...otherMds], r);
      const on = m => titlesOn(m);
      out.push({ id: `dq-${d.id}-a`, s: 'days', ch: KIND_CH[d.k] || 'd-nat', t: 'महत्वपूर्ण दिवस', d: 1, day: d.md, gen: true, q: `'${d.t}' कब मनाया जाता है?`, o: opts.map(m => fmtMDin(m, 'hi')), a: opts.indexOf(d.md), e: d.h, ctx: d.o || '',
        why: opts.map(m => (m === d.md ? '' : `${fmtMDin(m, 'hi')} को ${on(m).map(x => x.t).join(' और ')} मनाया जाता है।`)),
        en: { t: 'Important Days', q: `When is '${dEn.t || d.t}' observed?`, o: opts.map(m => fmtMDin(m, 'en')), e: dEn.h || d.h, ctx: dEn.o || d.o || '',
          why: opts.map(m => (m === d.md ? '' : `${fmtMDin(m, 'en')} is ${on(m).map(x => (x.en && x.en.t) || x.t).join(' and ')}.`)) } });
    }
    const others = shuffle(uniq(days.filter(x => x.md !== d.md).map(x => x.t)), r).slice(0, 3);
    if (others.length === 3) {
      const opts = shuffle([d.t, ...others], r);
      out.push({ id: `dq-${d.id}-b`, s: 'days', ch: KIND_CH[d.k] || 'd-nat', t: 'महत्वपूर्ण दिवस', d: 2, day: d.md, gen: true, q: `${fmtMDin(d.md, 'hi')} को इनमें से कौन-सा दिवस मनाया जाता है?`, o: opts, a: opts.indexOf(d.t), e: d.h, ctx: d.o || '',
        why: opts.map(t => (t === d.t ? '' : `${t} ${fmtMDin(mdOfTitle.get(t), 'hi')} को मनाया जाता है।`)),
        en: { t: 'Important Days', q: `Which of these is observed on ${fmtMDin(d.md, 'en')}?`, o: opts.map(t => enTitle.get(t) || t), e: dEn.h || d.h, ctx: dEn.o || d.o || '',
          why: opts.map(t => (t === d.t ? '' : `${enTitle.get(t) || t} is observed on ${fmtMDin(mdOfTitle.get(t), 'en')}.`)) } });
    }
  }
  return out;
}
const newsDate = q => (q.n && M().newsById.get(q.n) ? M().newsById.get(q.n).date : '0000-00-00');
// Option order is shuffled per sitting so the answer position can't be memorised; purely numeric
// options are sorted instead. Hindi and English options are reordered together.
function presentQ(q, seed) {
  const idx = [0, 1, 2, 3];
  const numeric = q.o.every(o => /^[\d\s.,]+$/.test(String(o).trim()));
  const order = numeric
    ? idx.slice().sort((i, j) => parseFloat(String(q.o[i]).replace(/,/g, '')) - parseFloat(String(q.o[j]).replace(/,/g, '')))
    : shuffle(idx, rng(seed + ':' + q.id));
  const pick = arr => order.map(i => arr[i]);
  const w4 = a => Array.isArray(a) && a.length === 4;
  const en = q.en && w4(q.en.o) ? { ...q.en, o: pick(q.en.o), why: w4(q.en.why) ? pick(q.en.why) : q.en.why } : q.en;
  return { ...q, o: pick(q.o), why: w4(q.why) ? pick(q.why) : q.why, en, a: order.indexOf(q.a) };
}
// Text in the current language (falls back to Hindi when a translation is missing).
const qT = q => tx(q, 'q');
const qO = q => (LANG === 'en' && q.en && Array.isArray(q.en.o) && q.en.o.length === 4 ? q.en.o : q.o);
const qE = q => tx(q, 'e');
const qTopic = q => tx(q, 't');
const nT = n => tx(n, 'title');
const nS = n => tx(n, 'summary');
const nF = n => (LANG === 'en' && n.en && Array.isArray(n.en.facts) && n.en.facts.length ? n.en.facts : n.facts || []);
const nSrc = n => (LANG === 'en' && n.en && n.en.src) || (n.source && n.source.name) || '';
const dT = d => tx(d, 't');
const dH = d => tx(d, 'h');
const dO = d => tx(d, 'o');
const dF = d => (LANG === 'en' && d.en && Array.isArray(d.en.f) && d.en.f.length ? d.en.f : d.f || []);
const subjName = k => (SUBJ[k] ? L(SUBJ[k].name, SUBJ[k].en) : k);
const catLabel = c => { const x = CATS.find(y => y.k === c); return x ? L(x.k, x.en) : c; };
const kindLabel = k => (KINDS[k] ? L(k, KINDS[k].en) : k);
const examOf = v => EXAMS.find(e => e.id === v || e.hi === v);
const examLabel = v => { const x = examOf(v); return x ? L(x.hi, x.en) : v; };
// Rich explanation parts, in the current language with a Hindi fallback.
const qWhy = q => (LANG === 'en' && q.en && Array.isArray(q.en.why) && q.en.why.length === 4 ? q.en.why : Array.isArray(q.why) ? q.why : []);
const qCtx = q => tx(q, 'ctx');
const qRef = q => tx(q, 'ref');
const chOf = q => q.ch || (q.s === 'days' ? 'd-nat' : q.s + '-other');
const chName = id => (CHM[id] ? L(CHM[id].hi, CHM[id].en) : L('अन्य', 'Other'));
const examsOf = q => (Array.isArray(q.ex) && q.ex.length ? q.ex : CHM[chOf(q)] ? CHM[chOf(q)].ex : ['gk']);
const diffLabel = d => { const x = DIFF[d] || DIFF[1]; return L(x[0], x[1]); };
const diffBars = d => `<span class="diff" title="${esc(diffLabel(d))}">${[1, 2, 3].map(i => `<i class="${i <= (d || 1) ? 'on' : ''}"></i>`).join('')} ${esc(diffLabel(d))}</span>`;
// Chapters of a subject that have questions (plus any defined ones), in definition order.
const chaptersOf = s => {
  const m = M(), list = CHAPTERS.filter(c => c.s === s && (m.byCh[c.id] || []).length);
  if ((m.byCh[s + '-other'] || []).length) list.push({ id: s + '-other', s, hi: 'अन्य प्रश्न', en: 'Other questions', ex: ['gk'] });
  return list;
};
const mockTitle = mk => L(mk.title, mk.titleEn);

// ───────────────────────────── CMS operations ─────────────────────────────
const CMS = {
  saveLocal() { LS.set('cms.pub', C.pub); LS.set('cms.drafts', C.drafts); LS.set('cms.reports', C.reports); },
  async putDraft(d) {
    const now = Date.now();
    const doc = clone({ ...d, id: d.id || rid(), createdAt: d.createdAt || now, updatedAt: now });
    if (P.cdb) await P.cdb.doc(`cms/drafts/items/${doc.id}`).set(doc);
    else { const i = C.drafts.findIndex(x => x.id === doc.id); if (i >= 0) C.drafts[i] = doc; else C.drafts.push(doc); this.saveLocal(); bump(); }
    return doc;
  },
  async delDraft(id) {
    if (P.cdb) await P.cdb.doc(`cms/drafts/items/${id}`).delete();
    else { C.drafts = C.drafts.filter(x => x.id !== id); this.saveLocal(); bump(); }
  },
  async putPub(coll, item) {
    const doc = clone(item);
    if (P.cdb) await P.cdb.doc(`pub/${coll}/items/${doc.id}`).set(doc);
    else { const arr = C.pub[coll]; const i = arr.findIndex(x => x.id === doc.id); if (i >= 0) arr[i] = doc; else arr.push(doc); this.saveLocal(); bump(); }
  },
  async publish(d, publishAt) {
    const coll = COLL[d.type];
    await this.putPub(coll, { ...d.data, id: d.data.id || 'x' + d.id, publishAt, publishedAt: Date.now() });
    await this.delDraft(d.id);
  },
  async unpublish(coll, id) {
    if (P.cdb) await P.cdb.doc(`pub/${coll}/items/${id}`).delete();
    else { C.pub[coll] = C.pub[coll].filter(x => x.id !== id); this.saveLocal(); bump(); }
  },
  async hide(coll, id) { await this.putPub(coll, { id, hidden: true, publishAt: todayISO(), publishedAt: Date.now() }); },
  async report(q, reason, note) {
    const r = { id: rid(), qid: q.id, qtext: String(q.q).slice(0, 240), reason, note: String(note || '').slice(0, 500), at: Date.now() };
    if (P.cdb && P.uid) {
      const ref = P.cdb.doc(`reports/${P.uid}`);
      const snap = await ref.get();
      const prev = snap.exists && Array.isArray((snap.data() || {}).items) ? clone(snap.data().items).slice(-49) : [];
      prev.push(r);
      await ref.set({ items: prev });
    } else if (LOCAL()) { C.reports.push({ ...r, uid: 'local' }); this.saveLocal(); bump(); }
    else throw { code: 'not_granted' };
  },
  async resolveReport(r) {
    if (P.cdb) {
      const ref = P.cdb.doc(`reports/${r.uid}`);
      const snap = await ref.get();
      if (!snap.exists) return;
      const items = ((snap.data() || {}).items || []).filter(x => x.id !== r.id);
      await ref.set({ items: clone(items) });
    } else { C.reports = C.reports.filter(x => x.id !== r.id); this.saveLocal(); bump(); }
  },
};

// ───────────────────────────── learner progress & reward points ─────────────────────────────
const DEF = () => ({
  v: 2, name: '', exam: '', goal: 10, best: 0, won: false,
  days: {}, ans: {}, bm: { q: [], n: [] }, mocks: [], daily: {}, dailySet: null,
  pts: { total: 0, days: {}, log: [] }, // reward points: lifetime total, per-day totals, recent history
  pq: { d: '', ids: [] },               // questions that already earned points today
  fl: { d: '', k: [] },                 // once-per-day bonuses already given today
  lb: { name: '', hide: false },        // how this learner appears on the leaderboard
  badges: {},                           // badge id -> date earned
  onb: false, level: null,              // onboarding done; level-check score (0-100) or null
  dok: {},                              // correct answers per day (accuracy trends)
  hist: [],                             // latest answers [{id, ok, ms, t, m}] (m: p practice, e exam, r revision)
  recent: [],                           // recently studied chapters [{ch, t}]
  wc: {},                               // weekly challenge results by week key {score, max, sec, at}
  revised: 0,                           // correct answers on due revision questions
  set: { scale: 1, theme: 'system', mode: 'practice', count: 10, lang: 'hi', diff: 0 },
  updatedAt: 0,
});
const obj = (v, d) => (v && typeof v === 'object' && !Array.isArray(v) ? v : d);
const U = {
  s: DEF(),
  norm(x) {
    const d = DEF();
    const s = { ...d, ...obj(x, {}) };
    s.bm = { q: Array.isArray(s.bm && s.bm.q) ? s.bm.q : [], n: Array.isArray(s.bm && s.bm.n) ? s.bm.n : [] };
    s.set = { ...d.set, ...obj(s.set, {}) };
    for (const k of ['days', 'ans', 'daily', 'badges', 'dok', 'wc']) s[k] = obj(s[k], {});
    for (const k of ['mocks', 'hist', 'recent']) if (!Array.isArray(s[k])) s[k] = [];
    s.revised = Number(s.revised) || 0;
    if (s.exam && !EXAMS.some(e => e.id === s.exam)) s.exam = EXAM_OLD[s.exam] || (examOf(s.exam) || {}).id || '';
    if (!s.onb && (s.name || Object.keys(s.ans).length)) s.onb = true; // existing learners skip onboarding
    const p = obj(s.pts, {});
    s.pts = { total: Number(p.total) || 0, days: obj(p.days, {}), log: Array.isArray(p.log) ? p.log : [] };
    if (!s.pts.total && Number(x && x.xp) > 0) s.pts.total = Math.round(Number(x.xp)); // v1 XP carries over
    s.pq = obj(s.pq, d.pq); if (!Array.isArray(s.pq.ids)) s.pq.ids = [];
    s.fl = obj(s.fl, d.fl); if (!Array.isArray(s.fl.k)) s.fl.k = [];
    s.lb = { ...d.lb, ...obj(s.lb, {}) };
    s.name = String(s.name || '').slice(0, 40);
    s.goal = [10, 20, 30].includes(Number(s.goal)) ? Number(s.goal) : 10;
    s.set.lang = s.set.lang === 'en' ? 'en' : 'hi';
    delete s.xp;
    return s;
  },
  load() { this.s = this.norm(LS.get('progress', null)); },
  async syncRemote() {
    if (!P.cdb || !P.uid) return;
    try {
      const snap = await P.cdb.doc(`data/users/${P.uid}/progress`).get();
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
    try { await P.cdb.doc(`data/users/${P.uid}/progress`).set(clone(this.s)); }
    catch (e) { if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'quota_exceeded'].includes(e.code)) P.progressRemote = false; }
    finally { this.busy = false; if (this.again) { this.again = false; this.flush(); } }
  },
  prune() {
    const cutoff = addDays(todayISO(), -120);
    for (const k of Object.keys(this.s.days)) if (k < cutoff) delete this.s.days[k];
    for (const k of Object.keys(this.s.daily)) if (k < cutoff) delete this.s.daily[k];
    for (const k of Object.keys(this.s.pts.days)) if (k < cutoff) delete this.s.pts.days[k];
    for (const k of Object.keys(this.s.dok)) if (k < cutoff) delete this.s.dok[k];
    if (this.s.hist.length > 300) this.s.hist.length = 300;
  },
  // ── reward points ──
  award(reason, n) {
    const t = todayISO(), p = this.s.pts;
    const today = p.days[t] || 0;
    const add = Math.max(0, Math.min(Math.round(n), PTS.cap - today));
    if (!add) return 0;
    p.total += add;
    p.days[t] = today + add;
    const last = p.log[0];
    if (last && last.r === reason && Date.now() - last.t < 15 * 60000) { last.n += add; last.c = (last.c || 1) + 1; last.t = Date.now(); }
    else { p.log.unshift({ t: Date.now(), r: reason, n: add }); if (p.log.length > 60) p.log.length = 60; }
    return add;
  },
  once(key) {
    const t = todayISO();
    if (this.s.fl.d !== t) this.s.fl = { d: t, k: [] };
    if (this.s.fl.k.includes(key)) return false;
    this.s.fl.k.push(key);
    return true;
  },
  firstToday(id) {
    const t = todayISO();
    if (this.s.pq.d !== t) this.s.pq = { d: t, ids: [] };
    if (this.s.pq.ids.includes(id)) return false;
    this.s.pq.ids.push(id);
    return true;
  },
  ptsToday() { return this.s.pts.days[todayISO()] || 0; },
  ptsWeek(wk) { let s = 0; const end = addDays(wk, 6); for (const [d, n] of Object.entries(this.s.pts.days)) if (d >= wk && d <= end) s += n; return s; },
  ptsMonth(mk) { let s = 0; for (const [d, n] of Object.entries(this.s.pts.days)) if (d.startsWith(mk)) s += n; return s; },
  // Records an answer: spaced-repetition box, daily counts, points and once-a-day bonuses.
  // Returns the points earned by this answer.
  record(q, ok, opts = {}) {
    const t = todayISO();
    const a = this.s.ans[q.id] || { c: 0, w: 0, b: 0 };
    const wasDue = a.w > 0 && (a.b || 0) < SRS_GAPS.length - 1 && (a.due || t) <= t; // a revision question
    if (ok) { a.c++; a.b = Math.min(SRS_GAPS.length - 1, (a.b || 0) + 1); } else { a.w++; a.b = 0; }
    a.l = ok ? 1 : 0; a.t = Date.now(); a.due = addDays(t, SRS_GAPS[a.b]);
    const ms = clamp(Math.round(Number(opts.ms) || 0), 0, 600000);
    if (ms) a.tm = (a.tm || 0) + ms;
    this.s.ans[q.id] = a;
    this.s.days[t] = (this.s.days[t] || 0) + 1;
    if (ok) this.s.dok[t] = (this.s.dok[t] || 0) + 1;
    this.s.hist.unshift({ id: q.id, ok: ok ? 1 : 0, ms, t: Date.now(), m: opts.mode || 'p' });
    this.seen(chOf(q));
    let earned = 0;
    this.lastBonus = []; // once-a-day bonuses unlocked by this answer, as [reason, points]
    const bonus = (reason, n) => { const got = this.award(reason, n); if (got) { earned += got; this.lastBonus.push([reason, got]); } };
    if (this.firstToday(q.id)) earned += this.award(ok ? 'correct' : 'wrong', ok ? PTS.correct + (opts.timed ? PTS.timed : 0) : PTS.wrong);
    const cnt = this.s.days[t];
    if (cnt >= this.s.goal && this.once('goal')) bonus('goal', PTS.goal);
    const st = this.streak();
    if (st > (this.s.best || 0)) this.s.best = st;
    if (cnt >= STREAK_MIN && this.once('streak')) bonus('streak', Math.min(PTS.streakStep * Math.max(1, st), PTS.streakMax));
    if (ok && wasDue) { this.s.revised++; if (this.once('rev:' + q.id)) bonus('revise', PTS.revise); }
    this.prune();
    this.checkBadges();
    this.touch();
    LB.queue();
    return earned;
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
  // ── learning analytics ──
  seen(ch) { if (!ch) return; this.s.recent = [{ ch, t: Date.now() }, ...this.s.recent.filter(r => r.ch !== ch)].slice(0, 8); },
  // Coverage and accuracy of a set of questions; mastery 0-4 (see MASTERY).
  stats(list) {
    let seen = 0, right = 0, c = 0, w = 0;
    for (const q of list) { const a = this.s.ans[q.id]; if (a) { seen++; if (a.l) right++; c += a.c; w += a.w; } }
    const total = list.length, cov = pct(seen, total), acc = pct(c, c + w), score = pct(right, total);
    const level = !seen ? 0 : score >= 90 && cov === 100 ? 4 : score >= 70 ? 3 : score >= 40 ? 2 : 1;
    return { total, seen, right, attempts: c + w, cov, acc, score, level };
  },
  chStats(ch) { return this.stats(M().byCh[ch] || []); },
  // Topics (subject + topic) where the learner struggles: at least 2 attempts and under 70% accuracy.
  weakTopics(n = 5, subj = '') {
    const by = {};
    for (const q of M().all) {
      if (subj && q.s !== subj) continue;
      const a = this.s.ans[q.id]; if (!a) continue;
      const k = chOf(q) + '|' + (q.t || '');
      const x = by[k] = by[k] || { ch: chOf(q), t: q.t || '', tEn: (q.en && q.en.t) || q.t || '', s: q.s, c: 0, w: 0, n: 0 };
      x.c += a.c; x.w += a.w; x.n++;
    }
    return Object.values(by).filter(x => x.c + x.w >= 2 && pct(x.c, x.c + x.w) < 70).map(x => ({ ...x, acc: pct(x.c, x.c + x.w) })).sort((a, b) => a.acc - b.acc || b.w - a.w).slice(0, n);
  },
  masteredChapters() { return CHAPTERS.filter(c => (M().byCh[c.id] || []).length >= 3 && this.chStats(c.id).level === 4).length; },
  rangeStats(from, to) {
    let n = 0, ok = 0, pts = 0;
    for (const [d, v] of Object.entries(this.s.days)) if (d >= from && d <= to) n += v;
    for (const [d, v] of Object.entries(this.s.dok)) if (d >= from && d <= to) ok += v;
    for (const [d, v] of Object.entries(this.s.pts.days)) if (d >= from && d <= to) pts += v;
    return { n, ok, acc: pct(ok, n), pts };
  },
  avgSecs() {
    let ms = 0, n = 0;
    for (const a of Object.values(this.s.ans)) if (a.tm) { ms += a.tm; n += (a.c || 0) + (a.w || 0); }
    return n ? Math.round(ms / n / 100) / 10 : 0;
  },
  checkBadges() {
    const tot = this.totals();
    const st = { answers: tot.attempts, acc: tot.acc, best: this.s.best || 0, mocks: this.s.mocks.length, total: this.s.pts.total, won: !!this.s.won, revised: this.s.revised, mastered: this.masteredChapters(), wcs: Object.keys(this.s.wc).length };
    const fresh = BADGES.filter(b => !this.s.badges[b.id] && b.test(st));
    for (const b of fresh) this.s.badges[b.id] = todayISO();
    if (fresh.length) setTimeout(() => toast(L('नया बैज मिला: ', 'New badge: ') + L(fresh[0].hi, fresh[0].en)), 600);
    return fresh;
  },
};
function applySettings() {
  const s = U.s.set;
  setLang(s.lang);
  document.documentElement.style.setProperty('--scale', String(clamp(Number(s.scale) || 1, 0.85, 1.3)));
  if (P.mode === 'standalone') {
    if (s.theme === 'dark' || s.theme === 'light') document.documentElement.dataset.theme = s.theme;
    else delete document.documentElement.dataset.theme;
  }
}

// ───────────────────────────── leaderboard ─────────────────────────────
// Each learner publishes only a display name and point totals to lb/{their id}; progress stays private.
// Totals for the current and previous week/month are recomputed from the learner's own daily points,
// so "last week" boards keep working even for learners who have not opened the app this week.
const SAMPLE_NAMES = [['अनन्या', 'Ananya'], ['रोहित', 'Rohit'], ['सना', 'Sana'], ['विक्रम', 'Vikram'], ['मेघा', 'Megha'], ['आदित्य', 'Aditya'], ['पूजा', 'Pooja'], ['करण', 'Karan'], ['नेहा', 'Neha']];
const LB = {
  entries: [], winners: [], hidden: [],
  settings: { weekPrize: '', weekPrizeEn: '', monthPrize: '', monthPrizeEn: '' },
  state: 'idle', t: 0, busy: false, again: false, denied: false,
  canShare() { return !!(P.cdb && P.uid) && !this.denied; },
  myId() { return P.uid || 'me'; },
  // The published name is the learner's chosen display name (or first name). Learners without one are
  // stored with an empty name and shown as "Student 1234" in each viewer's own language.
  pubName() { return String(U.s.lb.name || U.s.name.split(/\s+/)[0] || '').trim().slice(0, 24); },
  display(e) { const n = String((e && e.n) || '').trim().slice(0, 30); return n || `${L('विद्यार्थी', 'Student')} ${1000 + (hashSeed(String((e && e.u) || 'local')) % 9000)}`; },
  myName() { return this.display({ n: this.pubName(), u: this.myId() }); },
  myEntry() {
    const t = todayISO(), wk = weekKey(t), pw = addDays(wk, -7), mo = monthKey(t), pm = prevMonthKey(mo);
    return { n: this.pubName(), wk, wp: U.ptsWeek(wk), pw, pwp: U.ptsWeek(pw), mo, mp: U.ptsMonth(mo), pm, pmp: U.ptsMonth(pm), tp: U.s.pts.total, at: Date.now() };
  },
  queue() { if (!this.canShare()) return; clearTimeout(this.t); this.t = setTimeout(() => this.push(), 2500); },
  async push() {
    if (!this.canShare()) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    const ref = P.cdb.doc('lb/' + P.uid);
    try {
      if (U.s.lb.hide || U.s.pts.total <= 0) await ref.delete();
      else await ref.set(clone(this.myEntry()));
    } catch (e) {
      if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed'].includes(e.code)) this.denied = true;
    } finally { this.busy = false; if (this.again) { this.again = false; this.push(); } }
  },
  subscribe() {
    if (!P.cdb) return;
    this.state = 'loading';
    const refresh = () => { if (['leaders', 'home', 'profile', 'admin-rewards'].includes(route)) scheduleRender(); };
    try {
      P.cdb.collection('lb').onSnapshot(snap => {
        this.entries = snap.docs.map(d => ({ ...d.data(), u: d.id })).filter(e => typeof e.n === 'string');
        this.state = 'ok'; refresh();
      }, () => { this.state = 'error'; refresh(); });
      P.cdb.collection('pub/winners/items').onSnapshot(snap => {
        this.winners = snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(w => Array.isArray(w.top) && (w.kind === 'week' || w.kind === 'month'));
        this.checkWon(); refresh();
      }, () => { /* winners are optional */ });
      P.cdb.doc('pub/settings/items/rewards').onSnapshot(s => { if (s.exists) this.settings = { ...this.settings, ...s.data() }; refresh(); }, () => { /* optional */ });
      P.cdb.doc('pub/settings/items/lbhide').onSnapshot(s => { const u = s.exists ? (s.data() || {}).uids : null; this.hidden = Array.isArray(u) ? u : []; refresh(); }, () => { /* optional */ });
    } catch { this.state = 'error'; }
  },
  loadLocal() {
    this.settings = { ...this.settings, ...obj(LS.get('lb.settings', {}), {}) };
    this.winners = (LS.get('lb.winners', []) || []).filter(w => w && Array.isArray(w.top));
    this.hidden = LS.get('lb.hidden', []) || [];
    this.state = 'ok';
  },
  // Tester build only: clearly labelled example students so the boards can be tried out.
  samples() {
    const t = todayISO(), wk = weekKey(t), lw = addDays(wk, -7), mo = monthKey(t), lm = prevMonthKey(mo);
    const daysIn = (parseISO(t).getDay() + 6) % 7 + 1;
    return SAMPLE_NAMES.map(([hi, en], i) => {
      const r = rng('sample:' + i + ':' + wk), r2 = rng('sample:' + i + ':' + lw);
      const wp = Math.round((40 + r() * 110) * daysIn * (0.5 + r()));
      const pwp = Math.round((40 + r2() * 110) * 7 * (0.5 + r2()));
      return { u: 'sample-' + i, sample: true, n: `${L(hi, en)} ${L('(उदाहरण)', '(sample)')}`, wk, wp, pw: lw, pwp, mo, mp: wp + Math.round(pwp * 0.8), pm: lm, pmp: Math.round(pwp * 3.4), tp: pwp * 6 };
    });
  },
  pool() { return P.demo ? this.samples() : P.cdb ? this.entries : []; },
  board(kind) {
    const t = todayISO(), wk = weekKey(t), lw = addDays(wk, -7), mo = monthKey(t), lm = prevMonthKey(mo);
    const val = e => (kind === 'week' ? (e.wk === wk ? e.wp : 0)
      : kind === 'lastweek' ? (e.wk === lw ? e.wp : e.pw === lw ? e.pwp : 0)
        : kind === 'month' ? (e.mo === mo ? e.mp : 0)
          : (e.mo === lm ? e.mp : e.pm === lm ? e.pmp : 0));
    const me = this.myId();
    const rows = this.pool().filter(e => e.u !== me && !this.hidden.includes(e.u))
      .map(e => ({ u: e.u, n: this.display(e), raw: String(e.n || '').slice(0, 30), p: Math.max(0, Number(val(e)) || 0), sample: !!e.sample }));
    if (!U.s.lb.hide) rows.push({ u: me, n: this.myName(), raw: this.pubName(), p: val(this.myEntry()), me: true });
    const list = rows.filter(r => r.p > 0 || r.me).sort((a, b) => b.p - a.p || (a.me ? -1 : b.me ? 1 : a.n.localeCompare(b.n)));
    let rank = 0, prev = null;
    list.forEach((r, i) => { if (r.p !== prev) { rank = i + 1; prev = r.p; } r.rank = r.p > 0 ? rank : null; });
    return list;
  },
  myRank(kind) { const r = this.board(kind).find(x => x.me); return r && r.rank ? r.rank : null; },
  winnersFor(kind) { return this.winners.filter(w => w.kind === kind).sort((a, b) => String(b.key).localeCompare(String(a.key))); },
  checkWon() {
    const me = this.myId();
    if (!U.s.won && this.winners.some(w => (w.top || []).slice(0, 3).some(x => x && x.u === me))) { U.s.won = true; U.checkBadges(); U.touch(); }
  },
  async saveSettings(s) {
    this.settings = { ...this.settings, ...s };
    if (P.cdb) await P.cdb.doc('pub/settings/items/rewards').set(clone(this.settings));
    else LS.set('lb.settings', this.settings);
    bump();
  },
  async setHidden(u, hide) {
    const set = new Set(this.hidden);
    if (hide) set.add(u); else set.delete(u);
    this.hidden = [...set];
    if (P.cdb) await P.cdb.doc('pub/settings/items/lbhide').set({ uids: this.hidden });
    else LS.set('lb.hidden', this.hidden);
    bump();
  },
  announceKey(kind) { const t = todayISO(); return kind === 'week' ? addDays(weekKey(t), -7) : prevMonthKey(monthKey(t)); },
  async announce(kind) {
    const key = this.announceKey(kind);
    const top = this.board(kind === 'week' ? 'lastweek' : 'lastmonth').filter(e => e.p > 0 && (P.demo || !e.sample)).slice(0, 10).map(e => ({ u: e.u, n: e.raw, p: e.p }));
    const s = this.settings;
    const doc = { kind, key, top, prize: kind === 'week' ? s.weekPrize : s.monthPrize, prizeEn: kind === 'week' ? s.weekPrizeEn : s.monthPrizeEn, at: Date.now() };
    const id = (kind === 'week' ? 'w-' : 'm-') + key;
    if (P.cdb) await P.cdb.doc('pub/winners/items/' + id).set(clone(doc));
    else { this.winners = [...this.winners.filter(w => w.id !== id), { ...doc, id }]; LS.set('lb.winners', this.winners); }
    this.checkWon();
    bump();
    return top;
  },
  msToWeekEnd() { return parseISO(addDays(weekKey(todayISO()), 7)) - Date.now(); },
  msToMonthEnd() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1) - n; },
};

// ───────────────────────────── quiz sessions ─────────────────────────────
let S = null; // active practice session; titles are [hindi, english] pairs
function pick(pool, n, seed) {
  const r = seed ? rng(seed) : Math.random;
  const unseen = [], wrong = [], rest = [];
  for (const q of shuffle(pool, r)) { const a = U.s.ans[q.id]; if (!a) unseen.push(q); else if (!a.l) wrong.push(q); else rest.push(q); }
  return [...unseen, ...wrong, ...rest].slice(0, n || pool.length);
}
function startSession(kind, title, questions, opts = {}) {
  const qs = (questions || []).filter(Boolean);
  if (!qs.length) { toast(L('इस सेट में अभी कोई प्रश्न नहीं है।', 'There are no questions in this set yet.'), 'info'); return; }
  const seed = rid();
  S = { kind, title: Array.isArray(title) ? title : [title, title], back: opts.back || 'quiz', timed: !!opts.timed, qs: qs.map(q => presentQ(q, seed)), i: 0, ans: {}, startedAt: Date.now(), shownAt: Date.now(), ai: {}, done: false, pts: 0, bonus: [] };
  closeSheet();
  go('play');
}
const sTitle = () => (S ? L(S.title[0], S.title[1]) : '');
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
  const earned = U.record(q, ok, { timed: S.timed });
  S.ans[q.id] = { sel, ok, ms: Date.now() - S.shownAt, pts: earned };
  S.pts += earned;
  S.bonus.push(...(U.lastBonus || []));
  render();
  const o = qO(q);
  announce(sel === -1 ? L('समय समाप्त', 'Time is up') : ok ? L('सही उत्तर', 'Correct') : L(`गलत उत्तर। सही उत्तर है ${o[q.a]}`, `Wrong. The correct answer is ${o[q.a]}`));
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
    if (U.once('daily')) { const n = U.award('daily', PTS.daily); if (n) { S.pts += n; S.bonus.push(['daily', n]); } }
    if (ok === S.qs.length && S.qs.length >= 5 && U.once('perfect')) { const n = U.award('perfect', PTS.perfect); if (n) { S.pts += n; S.bonus.push(['perfect', n]); } }
    U.checkBadges();
    U.touch();
    LB.queue();
  }
  go('result');
}

// ───────────────────────────── mock exams ─────────────────────────────
let E = (() => { const e = LS.get('exam', null); return e && Array.isArray(e.qs) && e.st && !e.submitted ? e : null; })();
let lastExam = LS.get('lastExam', null);
const saveExam = () => { if (E) LS.set('exam', E); };
const examTitle = ex => { const mk = MOCKS.find(m => m.id === (ex && ex.id)); return mk ? mockTitle(mk) : (ex && ex.title) || ''; };
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
  if (ids.length < 5) { toast(L('इस परीक्षा के लिए पर्याप्त प्रश्न नहीं हैं।', 'There are not enough questions for this test.'), 'err'); return; }
  const now = Date.now();
  E = { id: mk.id, pos: mk.pos, neg: mk.neg, qs: ids, i: 0, st: { [ids[0]]: { v: true } }, startedAt: now, endsAt: now + mk.mins * 60000, seed: 'exam:' + now, submitted: false };
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
  let pts = 0;
  for (const id of E.qs) { const s = E.st[id]; if (s && s.sel != null) { const q = examQ(id); if (q) pts += U.record(q, s.sel === q.a); } }
  const bonus = U.once('mock:' + E.id) ? U.award('mock', Math.max(0, Math.round(R.score)) * PTS.mockX) : 0;
  R.pts = pts + bonus; R.bonus = bonus;
  U.s.mocks.unshift({ id: E.id, title: E.title || '', date: todayISO(), score: R.score, max: R.max, c: R.c, w: R.w, u: R.u, timeSec: R.timeSec });
  U.s.mocks = U.s.mocks.slice(0, 30);
  U.checkBadges();
  U.touch();
  LB.queue();
  lastExam = { ...R, ex: clone(E) };
  LS.set('lastExam', lastExam);
  LS.del('exam');
  E = null;
  closeSheet();
  go('exam-result');
  if (auto) toast(L('समय समाप्त — परीक्षा अपने-आप सबमिट हो गई', 'Time is up: the test was submitted automatically'), 'info');
}

// ───────────────────────────── UI helpers ─────────────────────────────
function appbar(title, { back = '', right = '' } = {}) {
  return `<header class="appbar"><div class="appbar-in gutter">${back ? `<button class="iconbtn" data-act="back" data-to="${back}" aria-label="${L('वापस जाएँ', 'Go back')}">${ic('arrow-left')}</button>` : ''}<h1>${title}</h1>${right}</div></header>`;
}
function adminBar(title, back = 'admin') {
  return appbar(title, { back, right: `<a class="iconbtn" href="#home" aria-label="${L('ऐप पर लौटें', 'Back to the app')}" title="${L('ऐप पर लौटें', 'Back to the app')}">${ic('home')}</a>` });
}
const NAV = [['home', 'होम', 'Home', 'home'], ['quiz', 'क्विज', 'Quiz', 'book-open'], ['leaders', 'लीडरबोर्ड', 'Leaders', 'trophy'], ['bookmarks', 'बुकमार्क', 'Saved', 'bookmark'], ['profile', 'प्रोफ़ाइल', 'Profile', 'user']];
const bottomNav = active => `<nav class="bnav" aria-label="${L('मुख्य मेनू', 'Main menu')}"><div class="bnav-in">${NAV.map(([r, hi, en, i]) => `<a href="#${r}"${r === active ? ' aria-current="page"' : ''}>${ic(i)}<span>${L(hi, en)}</span></a>`).join('')}</div></nav>`;
function ring(p, size, stroke, color = 'var(--ring)') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(p, 0, 1)), h = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${h}" cy="${h}" r="${r}" fill="none" style="stroke:var(--ring-track)" stroke-width="${stroke}"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" style="stroke:${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}
const emptyState = (icon, title, text) => `<div class="empty">${ic(icon)}<b>${title}</b>${text}</div>`;
const skeletonRows = n => Array.from({ length: n }, () => '<div class="row"><div class="skeleton" style="width:50px;height:50px"></div><div class="row-main"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:12px;width:40%;margin-top:8px"></div></div></div>').join('');
const skeletonCards = n => Array.from({ length: n }, () => '<div class="skeleton" style="height:128px;border-radius:16px"></div>').join('');
const catOf = c => CATS.find(x => x.k === c) || { k: c, en: c, icon: 'newspaper', c1: '#3B5BDB', c2: '#1C2F8F' };
const kindOf = k => KINDS[k] || { en: k, c: '#1D4ED8', icon: 'calendar', y: 'प्रारंभ', yEn: 'Since' };
const ptsChip = n => `<span class="pts">${ic('coins')} ${fmtNum(n)}</span>`;
// Admin preview of a question: Hindi first, English underneath when present.
function qPreview(q) {
  const opts = o => o.map((x, i) => `<li class="${i === q.a ? 'c' : ''}">${esc(x)}${i === q.a ? ' ✓' : ''}</li>`).join('');
  const en = q.en && Array.isArray(q.en.o) && q.en.o.length === 4 ? q.en : null;
  return `<div class="qprev"><b>${esc(q.q)}</b><ol type="A">${opts(q.o)}</ol>${q.e ? `<span class="small muted">${L('व्याख्या', 'Explanation')}: ${esc(q.e)}</span>` : ''}
  ${en ? `<div class="qprev-en"><span class="tag">EN</span><b>${esc(en.q)}</b><ol type="A">${opts(en.o)}</ol>${en.e ? `<span class="small muted">${esc(en.e)}</span>` : ''}</div>` : `<span class="small muted">${L('अंग्रेज़ी संस्करण नहीं है — अंग्रेज़ी में हिंदी दिखेगी।', 'No English version: English users will see the Hindi text.')}</span>`}</div>`;
}
function dataErrorNote() {
  return `<div class="note note-warn">${ic('alert')}<div>${L('<b>सामग्री लोड नहीं हुई।</b> ऐप को किसी वेब सर्वर से खोलें (जैसे <code>npx serve</code>)। सीधे फ़ाइल खोलने पर ब्राउज़र डेटा फ़ाइलें नहीं पढ़ पाता।', '<b>Content did not load.</b> Open the app from a web server (for example <code>npx serve</code>). Browsers cannot read the data files when the page is opened directly from disk.')}</div></div>`;
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
const sheetHead = title => `<div class="sheet-head"><h2>${title}</h2><button class="iconbtn" data-act="sheet-close" aria-label="${L('बंद करें', 'Close')}">${ic('x')}</button></div>`;
let toastT = 0;
function toast(msg, kind = 'ok') {
  const root = $('#toast-root');
  if (!root) return;
  root.innerHTML = `<div class="toast">${ic(kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : 'info')}<span>${esc(msg)}</span></div>`;
  clearTimeout(toastT);
  toastT = setTimeout(() => { root.innerHTML = ''; }, 2800);
}
function announce(msg) { const el = $('#sr-live'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } }
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || L('कॉपी हो गया — अब WhatsApp या कहीं भी पेस्ट करें', 'Copied. Paste it into WhatsApp or anywhere.')); }
  catch {
    openSheet(`${sheetHead(L('टेक्स्ट कॉपी करें', 'Copy text'))}<textarea class="textarea" id="copy-area" readonly rows="6">${esc(text)}</textarea><p class="small muted" style="margin:0">${L('टेक्स्ट चुनकर कॉपी करें।', 'Select the text and copy it.')}</p>`, { label: L('टेक्स्ट कॉपी करें', 'Copy text') });
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
  if (todays.length) out.push({ icon: 'calendar', text: L('आज का दिन: ', 'Today: ') + todays.map(dT).join(', '), to: 'today' });
  const recent = m.news.filter(n => diffDays(n.date, t) <= 3 && diffDays(n.date, t) >= 0).length;
  if (recent) out.push({ icon: 'newspaper', text: L(`पिछले 3 दिनों की ${recent} नई करेंट अफेयर्स`, `${recent} new current-affairs items in the last 3 days`), to: 'ca' });
  const due = U.due().length;
  if (due) out.push({ icon: 'rotate', text: L(`${due} प्रश्न दोहराव के लिए तैयार`, `${due} questions ready for revision`), act: 'start-revision' });
  if (!U.s.daily[t] && C.baseState === 'ok') out.push({ icon: 'zap', text: L('आज का दैनिक क्विज अभी बाकी है', 'Today\'s daily quiz is still waiting'), act: 'start-daily' });
  const rank = LB.myRank('week');
  if (rank && rank <= 10) out.push({ icon: 'trophy', text: L(`आप इस सप्ताह लीडरबोर्ड पर #${rank} हैं`, `You are #${rank} on this week's leaderboard`), to: 'leaders' });
  return out;
}
function topicChips() {
  const m = M(), out = [];
  for (const d of (m.daysByMd[todayISO().slice(5)] || [])) out.push(`<a class="chip" href="#today">${ic('calendar')}${esc(dT(d))}</a>`);
  for (const c of uniq(m.news.slice(0, 8).map(n => n.cat)).slice(0, 4)) out.push(`<button class="chip" data-act="ca-cat" data-cat="${esc(c)}">${esc(catLabel(c))}</button>`);
  return out.join('') || `<span class="small muted">${L('आज के विषय जल्द आएँगे।', 'Today\'s topics are coming soon.')}</span>`;
}
function newsCard(n) {
  const c = catOf(n.cat);
  return `<button class="news" data-act="open-news" data-id="${esc(n.id)}" style="--c1:${c.c1};--c2:${c.c2}"><span class="thumb">${ic(c.icon)}</span><span class="news-main"><span><span class="badge">${esc(catLabel(n.cat))}</span></span><span class="nt">${esc(nT(n))}</span><span class="ns">${esc(nS(n))}</span><span class="more">${L('विस्तार से पढ़ें', 'Read more')} ${ic('arrow-right')}</span></span></button>`;
}
const langBtn = (cls = 'iconbtn') => `<button class="${cls} lang-btn" data-act="lang-toggle" aria-label="${L('Switch to English', 'हिंदी में बदलें')}" title="${L('Switch to English', 'हिंदी में बदलें')}"><span>${L('EN', 'हिं')}</span></button>`;
const onb = { name: '', exam: '', goal: 10 };
function onboardCard() {
  return `<section class="card onb" aria-label="${L('प्रोफ़ाइल बनाएँ', 'Create your profile')}"><form data-form="onb" style="display:flex;flex-direction:column;gap:12px">
  <h2 style="font-size:1.1rem;font-weight:800">${L('अपनी तैयारी को निजी बनाएँ', 'Make your preparation personal')}</h2>
  <div class="field"><span class="lbl">${L('भाषा', 'Language')}</span><div class="chips">${[['hi', 'हिंदी'], ['en', 'English']].map(([v, l]) => `<button type="button" class="chip" data-act="set-lang" data-v="${v}" aria-pressed="${LANG === v}">${l}</button>`).join('')}</div></div>
  <div class="field"><label for="onb-name">${L('आपका नाम', 'Your name')}</label><input class="input" id="onb-name" data-bind="onb.name" value="${esc(onb.name)}" maxlength="40" placeholder="${L('जैसे: राहुल', 'e.g. Rahul')}" autocomplete="given-name"></div>
  <div class="field"><span class="lbl">${L('लक्ष्य परीक्षा', 'Target exam')}</span><div class="chips wrap">${EXAMS.map(([v, en]) => `<button type="button" class="chip" data-act="onb-exam" data-v="${esc(v)}" aria-pressed="${onb.exam === v}">${esc(L(v, en))}</button>`).join('')}</div></div>
  <div class="field"><span class="lbl">${L('रोज़ का लक्ष्य', 'Daily goal')}</span><div class="chips">${[10, 20, 30].map(n => `<button type="button" class="chip" data-act="onb-goal" data-v="${n}" aria-pressed="${onb.goal === n}">${n} ${L('प्रश्न', 'questions')}</button>`).join('')}</div></div>
  <div class="btnrow"><button class="btn btn-cta" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button><button class="btn btn-grey" type="button" data-act="onb-skip">${L('बाद में', 'Later')}</button></div>
  </form></section>`;
}
function rewardCard() {
  const wk = weekKey(todayISO()), wp = U.ptsWeek(wk), rank = LB.myRank('week');
  const prize = L(LB.settings.weekPrize, LB.settings.weekPrizeEn);
  return `<a class="reward" href="#leaders">
    <span class="reward-ic">${ic('trophy')}</span>
    <span class="row-main"><span class="row-title">${L('इस सप्ताह', 'This week')}: ${fmtNum(wp)} ${L('पॉइंट्स', 'points')}${rank ? ` · ${L('रैंक', 'rank')} #${rank}` : ''}</span>
    <span class="row-sub">${prize ? `${L('इनाम', 'Prize')}: ${esc(prize)}` : L(`कुल ${fmtNum(U.s.pts.total)} पॉइंट्स · हर सही उत्तर पर +${PTS.correct}`, `${fmtNum(U.s.pts.total)} points in total · +${PTS.correct} for every correct answer`)}</span></span>
    ${ic('chev-right', 'chev')}</a>`;
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
      ${langBtn()}
      <button class="iconbtn" data-act="notifs" aria-label="${L('सूचनाएँ', 'Notifications')}${notif ? ` (${notif})` : ''}">${ic('bell')}${notif ? `<span class="dot">${notif}</span>` : ''}</button>
      <a class="avatar" href="#profile" aria-label="${L('प्रोफ़ाइल', 'Profile')}">${name ? esc(initial(name)) : ic('user')}</a>
    </div>
  </div>
  <p class="greet">${L('नमस्कार', 'Hello')}${name ? `, ${esc(name)}` : ''}! ${L('आपका स्वागत है।', 'Welcome.')}</p>
  <p class="greet-sub">${L('आज कुछ नया सीखिए और अपना ज्ञान बढ़ाइए।', 'Learn something new today and grow your knowledge.')}</p>
</div></header>
<main class="home-body gutter">
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <section class="daily" aria-label="${L('आज की तैयारी', 'Today\'s preparation')}">
    <div class="ringbox" aria-label="${L(`आज ${goal} में से ${cnt} प्रश्न`, `${cnt} of ${goal} questions today`)}">${ring(cnt / goal, 68, 7)}<b class="tnum">${Math.min(cnt, 999)}<small>/ ${goal} ${L('प्रश्न', 'Qs')}</small></b></div>
    <div><h2>${L('आज की तैयारी कैसी चल रही है?', 'How is today\'s preparation going?')}</h2><p>${daily ? L(`दैनिक क्विज पूरा — ${daily.score}/${daily.total} सही। बढ़िया!`, `Daily quiz done: ${daily.score}/${daily.total} correct. Great!`) : L('आज का दैनिक क्विज पूरा करें।', 'Complete today\'s daily quiz.')}</p></div>
    <div class="daily-foot"><span class="streak" title="${L(`रोज़ कम से कम ${STREAK_MIN} प्रश्न हल करें`, `Answer at least ${STREAK_MIN} questions a day`)}">${ic('flame')} ${L(`${st} दिन की स्ट्रीक`, `${st}-day streak`)}</span>
      <button class="btn btn-cta btn-sm" data-act="start-daily" ${C.baseState !== 'ok' ? 'disabled' : ''}>${daily ? L('फिर से खेलें', 'Play again') : L('शुरू करें', 'Start')} ${ic('arrow-right')}</button></div>
  </section>
  ${rewardCard()}
  <section class="tiles" aria-label="${L('मुख्य विभाग', 'Main sections')}">
    <a class="tile t-blue" href="#quiz">${ic('help')}<b>${L('क्विज', 'Quiz')}</b><span>${L('विषयवार सामान्य ज्ञान', 'Subject-wise GK')}</span></a>
    <a class="tile t-green" href="#today">${ic('calendar')}<b>${L('आज का दिन', 'Today in History')}</b><span>${L('महत्वपूर्ण दिवस', 'Important days')}</span></a>
    <a class="tile t-orange" href="#ca">${ic('newspaper')}<b class="latin">Current Affairs</b><span>${L('दैनिक समसामयिकी', 'Daily news for exams')}</span></a>
    <a class="tile t-purple" href="#mock">${ic('clipboard')}<b>${L('अभ्यास परीक्षा', 'Mock Tests')}</b><span>${L('मॉक टेस्ट', 'Exam practice')}</span></a>
  </section>
  ${!name && !LS.get('onb-skip', false) ? onboardCard() : ''}
  ${due ? `<button class="revise" data-act="start-revision"><span class="ico">${ic('rotate')}</span><span class="row-main"><b>${L(`${due} प्रश्न दोहराव के लिए तैयार`, `${due} questions ready for revision`)}</b><span class="row-sub">${L('पहले गलत हुए प्रश्न फिर से हल करें — याद पक्की होगी', 'Retry questions you got wrong to make them stick')}</span></span>${ic('chev-right', 'chev')}</button>` : ''}
  <section aria-label="${L('आज के महत्वपूर्ण विषय', 'Today\'s important topics')}"><h2 class="sec-title">${ic('star', 'star')} ${L('आज के महत्वपूर्ण विषय', 'Today\'s important topics')}</h2><div class="chips" style="margin-top:10px">${C.baseState === 'loading' ? '<div class="skeleton" style="height:34px;width:100%"></div>' : topicChips()}</div></section>
  ${latest.length ? `<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h2 class="sec-title">${ic('newspaper')} ${L('ताज़ा करेंट अफेयर्स', 'Latest current affairs')}</h2><a class="link" href="#ca">${L('सभी देखें', 'See all')} ${ic('chev-right')}</a></div>${latest.map(newsCard).join('')}</section>` : ''}
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>${L('एडमिन पैनल', 'Admin panel')}<span class="row-sub">${LOCAL() ? L('डेमो: समाचार, AI प्रश्न, समीक्षा और प्रकाशन', 'Demo: news, AI questions, review and publishing') : L('समाचार, AI प्रश्न, समीक्षा, प्रकाशन और पुरस्कार', 'News, AI questions, review, publishing and prizes')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
</main>
${bottomNav('home')}`;
}

function vQuiz() {
  const s = U.s.set;
  const rows = SUBJECTS.map(sj => {
    const st = U.subjStats(sj.k);
    return `<button class="row" data-act="start-subject" data-s="${sj.k}" style="--c:${sj.c}"><span class="row-ic">${ic(sj.icon)}</span><span class="row-main"><span class="row-title">${subjName(sj.k)}</span><span class="row-sub">${st.seen ? L(`${st.seen}/${st.total} हल किए · सटीकता ${st.acc}%`, `${st.seen}/${st.total} done · ${st.acc}% accuracy`) : L('अभी शुरू नहीं किया', 'Not started yet')}</span><span class="minibar"><i style="width:${pct(st.seen, st.total)}%"></i></span></span><span class="count tnum">${st.total} ${L('प्रश्न', 'Qs')}</span>${ic('chev-right', 'chev')}</button>`;
  }).join('');
  return `${appbar(L('क्विज – विषय चुनें', 'Quiz: choose a subject'), { back: 'home', right: `<button class="iconbtn" data-act="search-open" aria-label="${L('प्रश्न खोजें', 'Search questions')}">${ic('search')}</button>` })}
<main class="page gutter">
  <div class="seg" role="group" aria-label="${L('क्विज मोड', 'Quiz mode')}">
    <button data-act="set-mode" data-v="practice" aria-pressed="${s.mode !== 'timed'}">${L('अभ्यास मोड', 'Practice')}<small>${L('तुरंत उत्तर और व्याख्या', 'Instant answer and explanation')}</small></button>
    <button data-act="set-mode" data-v="timed" aria-pressed="${s.mode === 'timed'}">${L('समयबद्ध', 'Timed')}<small>${L(`${TIMED_SECONDS} सेकंड प्रति प्रश्न · +${PTS.timed} बोनस`, `${TIMED_SECONDS} s per question · +${PTS.timed} bonus`)}</small></button>
  </div>
  <div class="sec-head"><span class="small muted">${L('एक बार में प्रश्न', 'Questions per round')}</span><div class="chips">${[10, 20, 0].map(n => `<button class="chip" data-act="set-count" data-v="${n}" aria-pressed="${(s.count ?? 10) === n}">${n || L('सभी', 'All')}</button>`).join('')}</div></div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  <div class="list">${C.baseState === 'loading' ? skeletonRows(6) : rows}</div>
  <div class="tip">${ic('bulb')}<p>${L('अपनी पसंद का विषय चुनें और ज्ञान की परीक्षा दें। हर सही उत्तर पर पॉइंट्स मिलते हैं।', 'Pick a subject and test your knowledge. Every correct answer earns points.')}</p></div>
  <div class="grid2"><button class="btn btn-outline" data-act="start-bookmarked">${ic('bookmark')} ${L('बुकमार्क प्रश्न', 'Saved questions')}</button><button class="btn btn-outline" data-act="start-revision">${ic('rotate')} ${L('दोहराव', 'Revision')}</button></div>
</main>
${bottomNav('quiz')}`;
}

function explainBox(q, a) {
  const head = a.sel === -1 ? `<span class="ans-bad">${L('समय समाप्त!', 'Time is up!')}</span>` : a.ok ? `<span class="ans-ok">${L('सही उत्तर!', 'Correct!')}</span>` : `<span class="ans-bad">${L('गलत उत्तर।', 'Wrong answer.')}</span>`;
  const st = S.ai[q.id];
  const aiBtn = AI.available() && !st ? `<button class="link" data-act="ai-explain" data-id="${esc(q.id)}">${ic('sparkles')} ${L('AI से और समझें', 'Explain more with AI')}</button>` : '';
  const earned = a.pts ? `<span class="pts pts-pop">+${a.pts} ${L('पॉइंट्स', 'points')}</span>` : '';
  return `<div class="explain">${ic('bulb', 'bulb')}<div style="min-width:0"><h3>${head} ${L('व्याख्या:', 'Explanation:')} ${earned}</h3><p>${esc(qE(q) || L('व्याख्या जल्द जोड़ी जाएगी।', 'An explanation will be added soon.'))}</p>${st ? `<div class="ai-box" id="ai-${esc(q.id)}">${esc(st.text || L('सोच रहा है…', 'Thinking…'))}</div>${st.err ? `<p class="small" style="color:var(--bad);margin-top:6px">${esc(st.err)}</p>` : ''}` : ''}${aiBtn ? `<div style="margin-top:8px">${aiBtn}</div>` : ''}</div></div>`;
}
function vPlay() {
  if (!S || !S.qs.length) return redirect('quiz');
  const q = S.qs[S.i], n = S.qs.length, a = S.ans[q.id], o = qO(q);
  const opts = o.map((x, i) => {
    let cls = '', mark = '';
    if (a) {
      if (i === q.a) { cls = 'ok'; mark = `<span class="mark">${ic('check')}</span>`; }
      else if (i === a.sel) { cls = 'bad'; mark = `<span class="mark">${ic('x')}</span>`; }
    }
    return `<button class="opt ${cls}" data-act="answer" data-i="${i}" ${a ? 'disabled' : ''}><span class="key">${LETTERS[i]}.</span><span class="txt">${esc(x)}</span>${mark}</button>`;
  }).join('');
  const bm = U.isBm('q', q.id);
  const last = S.i === n - 1;
  const timer = S.timed && !a ? `<span class="timer" id="qtimer">${ic('clock')} <span id="qtimer-v">${TIMED_SECONDS}</span> ${L('से.', 's')}</span>` : '';
  return `${appbar(esc(sTitle()), { back: S.back, right: `${langBtn()}<span class="pill pill-q tnum">${L('प्रश्न', 'Q')} ${S.i + 1} / ${n}</span>` })}
<main class="page gutter">
  <div class="qtop">
    <div class="progress" role="progressbar" aria-label="${L('प्रगति', 'Progress')}" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${S.i + 1}"><i style="width:${((S.i + (a ? 1 : 0)) / n) * 100}%"></i></div>
    <div class="qmeta"><span class="tag">${esc(subjName(q.s))}${qTopic(q) ? ' · ' + esc(qTopic(q)) : ''}</span><span class="qmeta-r">${S.pts ? ptsChip(S.pts) : ''}${timer}</span></div>
  </div>
  <h2 class="qtext">${esc(qT(q))}</h2>
  <div class="opts" role="group" aria-label="${L('विकल्प', 'Options')}">${opts}</div>
  ${a ? explainBox(q, a) : ''}
  <div class="qtools">
    <button class="btn btn-sm btn-outline" data-act="bm-q" data-id="${esc(q.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? L('सहेजा गया', 'Saved') : L('बुकमार्क', 'Save')}</button>
    <button class="btn btn-sm btn-outline" data-act="share-q">${ic('share')} ${L('शेयर', 'Share')}</button>
    <button class="btn btn-sm btn-outline" data-act="report-q" data-id="${esc(q.id)}">${ic('flag')} ${L('त्रुटि बताएँ', 'Report error')}</button>
  </div>
  <div class="qfoot">
    <button class="btn btn-grey" data-act="prev-q" ${S.i === 0 ? 'disabled' : ''}>${ic('arrow-left')} ${L('पिछला प्रश्न', 'Previous')}</button>
    <button class="btn btn-cta" data-act="next-q">${last ? L('परिणाम देखें', 'See result') : L('अगला प्रश्न', 'Next question')} ${ic('arrow-right')}</button>
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
  const msg = p >= 0.8 ? L('शानदार! आपकी तैयारी बहुत अच्छी है।', 'Excellent! Your preparation is strong.') : p >= 0.5 ? L('अच्छा प्रयास! थोड़ा और अभ्यास करें।', 'Good effort! A little more practice.') : L('कोई बात नहीं — गलत प्रश्न दोहराएँ, सुधार ज़रूर होगा।', 'No problem: revise the wrong ones and you will improve.');
  const review = S.qs.map((q, i) => {
    const a = S.ans[q.id], o = qO(q);
    const yours = a ? (a.sel === -1 ? L('समय समाप्त', 'Time ran out') : o[a.sel]) : L('छोड़ा गया', 'Skipped');
    return `<div class="review-item"><b>${i + 1}. ${esc(qT(q))}</b><span class="ans">${L('सही उत्तर', 'Correct answer')}: <span class="ans-ok">${esc(o[q.a])}</span></span>${a && a.ok ? '' : `<span class="ans">${L('आपका उत्तर', 'Your answer')}: <span class="ans-bad">${esc(yours)}</span></span>`}<span class="small muted">${esc(qE(q) || '')}</span></div>`;
  }).join('');
  const qPts = S.pts - S.bonus.reduce((x, b) => x + b[1], 0);
  return `${appbar(L('परिणाम', 'Result'), { back: S.back })}
<main class="page gutter">
  <section class="card result-hero">
    <div class="big-ring">${ring(p, 150, 12, p >= 0.5 ? 'var(--ring)' : 'var(--bad-solid)')}<b class="tnum">${c}/${n}<small>${L('सही उत्तर', 'correct')}</small></b></div>
    <h2 style="font-family:var(--font-display);font-size:1.35rem;margin:6px 0 0">${esc(sTitle())}</h2>
    <p class="muted" style="margin:0">${msg}</p>
    <span class="pill pill-gold">${ic('coins')} +${fmtNum(S.pts)} ${L('पॉइंट्स', 'points')}</span>
  </section>
  <section class="card" style="display:flex;flex-direction:column;gap:8px"><h3 class="sec-title" style="font-size:1rem">${ic('coins')} ${L('इस राउंड के पॉइंट्स', 'Points this round')}</h3>
    <div class="ptsrow"><span>${L('प्रश्नों से', 'From questions')}</span><b>+${fmtNum(qPts)}</b></div>
    ${S.bonus.map(([r, v]) => `<div class="ptsrow"><span>${L(PTS_REASON[r][0], PTS_REASON[r][1])}</span><b>+${v}</b></div>`).join('')}
    ${!S.pts ? `<p class="small muted" style="margin:0">${L('इन प्रश्नों के पॉइंट्स आज पहले ही मिल चुके हैं। नए प्रश्न हल करें या कल फिर खेलें।', 'You already earned points for these questions today. Try new questions or play again tomorrow.')}</p>` : ''}
    <a class="link" href="#leaders">${L('लीडरबोर्ड देखें', 'See the leaderboard')} ${ic('chev-right')}</a></section>
  <div class="stats">
    <div class="stat s-ok"><b>${c}</b><span>${L('सही', 'Correct')}</span></div><div class="stat s-bad"><b>${w}</b><span>${L('गलत', 'Wrong')}</span></div><div class="stat"><b>${sk}</b><span>${L('छोड़े', 'Skipped')}</span></div>
    <div class="stat"><b>${pct(c, n)}%</b><span>${L('सटीकता', 'Accuracy')}</span></div><div class="stat"><b class="tnum">${fmtSecs(secs)}</b><span>${L('समय', 'Time')}</span></div><div class="stat"><b>${U.streak()}</b><span>${L('दिन की स्ट्रीक', 'Day streak')}</span></div>
  </div>
  <div class="btnrow">${w + sk ? `<button class="btn btn-cta" data-act="retry-wrong">${ic('rotate')} ${L('गलत/छोड़े प्रश्न दोबारा', 'Retry wrong / skipped')}</button>` : ''}<button class="btn btn-outline" data-act="share-result">${ic('share')} ${L('स्कोर शेयर करें', 'Share score')}</button></div>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} ${L('उत्तरों की समीक्षा', 'Answer review')}</h2><div class="list">${review}</div></section>
  <div class="grid2"><a class="btn btn-grey" href="#quiz">${L('विषय सूची', 'Subjects')}</a><a class="btn btn-navy" href="#home">${L('होम', 'Home')}</a></div>
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
  return `${appbar(`${ic('newspaper')} Current Affairs`, { back: 'home', right: `<span class="pill pill-green">${L('दैनिक अपडेट', 'Daily update')}</span>` })}
<main class="page gutter">
  <div class="datebar">${ic('calendar')} <span class="tnum">${fmtDate(t)}</span></div>
  <p class="small muted" style="margin:-10px 0 0;text-align:center">${todayN ? L(`आज की ${todayN} नई ख़बरें`, `${todayN} new items today`) : L('आज की ख़बरें अभी प्रकाशित नहीं हुईं', 'Today\'s news is not published yet') + (latest ? ` · ${L('नवीनतम', 'latest')}: ${fmtDate(latest, false)}` : '')}</p>
  ${caQs ? `<button class="ca-cta" data-act="start-ca">${ic('zap')}<span class="row-main"><b>${L('करेंट अफेयर्स क्विज', 'Current affairs quiz')}</b><span>${L(`${Math.min(caQs, 10)} प्रश्न · नवीनतम ख़बरों से`, `${Math.min(caQs, 10)} questions from the latest news`)}</span></span>${ic('arrow-right')}</button>` : ''}
  <div class="chips" role="group" aria-label="${L('श्रेणी चुनें', 'Choose a category')}"><button class="chip" data-act="ca-cat" data-cat="" aria-pressed="${!caCat}">${L('सभी', 'All')}</button>${uniq(m.news.map(n => n.cat)).map(c => `<button class="chip" data-act="ca-cat" data-cat="${esc(c)}" aria-pressed="${caCat === c}">${esc(catLabel(c))}</button>`).join('')}</div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${C.baseState === 'loading' ? skeletonCards(3) : feed || emptyState('newspaper', L('इस श्रेणी में अभी कोई ख़बर नहीं', 'No news in this category yet'), '')}
</main>
${bottomNav('')}`;
}
function openNews(id) {
  const m = M(), n = m.newsById.get(id);
  if (!n) return;
  const c = catOf(n.cat);
  const qs = (m.bySubj.ca || []).filter(q => q.n === n.id);
  const bm = U.isBm('n', n.id);
  const src = n.source || {}, url = safeUrl(src.url), facts = nF(n);
  openSheet(`${sheetHead(esc(nT(n)))}
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge" style="--c2:${c.c2}">${esc(catLabel(n.cat))}</span><span class="small muted">${fmtDate(n.date)} · ${weekday(n.date)}</span></div>
  <p style="margin:0;font-size:1.05rem">${esc(nS(n))}</p>
  ${facts.length ? `<div class="card" style="box-shadow:none;background:var(--surface-2)"><h3 class="sec-title" style="font-size:1rem;margin-bottom:10px">${ic('target')} ${L('परीक्षा के लिए मुख्य तथ्य', 'Key facts for exams')}</h3><ul class="facts">${facts.map(f => `<li>${ic('check')}<span>${esc(f)}</span></li>`).join('')}</ul></div>` : ''}
  ${nSrc(n) ? `<p class="small muted" style="margin:0">${L('स्रोत', 'Source')}: ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(nSrc(n))} ${ic('external')}</a>` : esc(nSrc(n))}</p>` : ''}
  <div class="btnrow">${qs.length ? `<button class="btn btn-cta" data-act="news-quiz" data-id="${esc(n.id)}">${ic('help')} ${L(`इस ख़बर से ${qs.length} प्रश्न`, `${qs.length} questions from this story`)}</button>` : ''}<button class="btn btn-outline" data-act="bm-n" data-id="${esc(n.id)}" aria-pressed="${bm}">${ic('bookmark', bm ? 'fill' : '')} ${bm ? L('सहेजा गया', 'Saved') : L('सहेजें', 'Save')}</button><button class="btn btn-outline" data-act="share-news" data-id="${esc(n.id)}">${ic('share')} ${L('शेयर', 'Share')}</button></div>`, { label: nT(n) });
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
    card = `<div class="card">${emptyState('calendar', L('इस तारीख़ के लिए कोई प्रमुख दिवस दर्ज नहीं है', 'No important day is listed for this date'), nx ? `${L('अगला महत्वपूर्ण दिवस', 'Next important day')}: <b>${esc(dT(nx))}</b> (${fmtMD(nx.md)})` : '')}${nx ? `<button class="btn btn-navy btn-block" data-act="day-goto" data-iso="${nx.iso}">${L('देखें', 'View')}: ${esc(dT(nx))} ${ic('arrow-right')}</button>` : ''}</div>`;
  } else {
    const k = kindOf(d.k), facts = dF(d);
    card = `${entries.length > 1 ? `<div class="chips" role="group" aria-label="${L('इस दिन के दिवस', 'Days on this date')}">${entries.map((e, i) => `<button class="chip" data-act="day-pick" data-i="${i}" aria-pressed="${e === d}">${esc(dT(e))}</button>`).join('')}</div>` : ''}
    <article class="daycard">
      <div class="day-top">
        <div class="day-art"><span class="dn tnum">${dd.getDate()}</span><span class="dm">${MONTHS[LANG][dd.getMonth()]}</span>${ic(k.icon)}</div>
        <div class="day-title"><span><span class="badge" style="--c2:${k.c}">${esc(kindLabel(d.k))}</span></span><h2>${esc(dT(d))}</h2><span class="small" style="color:var(--muted)">(${fmtMD(d.md)}${d.y ? ` · ${L(k.y, k.yEn)}: ${d.y}` : ''})</span></div>
      </div>
      <div class="day-sec">${ic('book-open')}<div><h3>${L('शुरुआत का इतिहास', 'History')}</h3><p>${esc(dH(d))}</p></div></div>
      ${dO(d) ? `<div class="day-sec">${ic('target')}<div><h3>${L('उद्देश्य', 'Purpose')}</h3><p>${esc(dO(d))}</p></div></div>` : ''}
      ${facts.length ? `<div class="day-sec">${ic('star')}<div><h3>${L('महत्वपूर्ण तथ्य', 'Key facts')}</h3><ul>${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>` : ''}
    </article>
    ${rel ? `<button class="btn btn-navy btn-block" data-act="day-quiz" data-md="${md}">${L(`इस दिन से जुड़े ${rel} प्रश्न देखें`, `See ${rel} questions about this day`)} ${ic('arrow-right')}</button>` : ''}`;
  }
  return `${appbar(`${ic('calendar')} ${L('आज का दिन', 'Today in History')}`, { back: 'home', right: `<button class="iconbtn" data-act="day-calendar" aria-label="${L('कैलेंडर से तारीख़ चुनें', 'Pick a date from the calendar')}">${ic('list')}</button>` })}
<main class="page gutter">
  <div class="daynav">
    <button class="iconbtn" data-act="day-step" data-v="-1" aria-label="${L('पिछला दिन', 'Previous day')}">${ic('chev-left')}</button>
    <div class="when tnum">${isToday ? L('आज, ', 'Today, ') : ''}${fmtDate(iso, false)}<small>${WEEKDAYS[LANG][dd.getDay()]}${isToday ? '' : ` · <button class="link" data-act="day-today">${L('आज पर लौटें', 'Back to today')}</button>`}</small></div>
    <button class="iconbtn" data-act="day-step" data-v="1" aria-label="${L('अगला दिन', 'Next day')}">${ic('chev-right')}</button>
  </div>
  ${C.baseState === 'error' ? dataErrorNote() : ''}
  ${card}
  ${up.length ? `<section class="card" style="display:flex;flex-direction:column;gap:12px"><h2 class="sec-title" style="font-size:1.05rem">${ic('calendar')} ${L('आने वाले महत्वपूर्ण दिवस', 'Coming up')}</h2>${up.map(e => { const dn = diffDays(t, e.iso); return `<button class="upc link" style="color:inherit;font-weight:600;text-align:left" data-act="day-goto" data-iso="${e.iso}"><span class="d"><b class="tnum">${parseISO(e.iso).getDate()}</b><span>${monthShort(parseISO(e.iso).getMonth())}</span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(dT(e))}</span><span class="row-sub">${esc(kindLabel(e.k))} · ${dn === 1 ? L('कल', 'tomorrow') : dn > 0 ? L(`${dn} दिन बाद`, `in ${dn} days`) : fmtDate(e.iso, false)}</span></span></button>`; }).join('')}</section>` : ''}
</main>
${bottomNav('')}`;
}
function openDayCalendar(month) {
  const m = M();
  const cur = month ?? parseISO(dayCursor || todayISO()).getMonth();
  const year = parseISO(todayISO()).getFullYear();
  const items = m.days.filter(d => Number(d.md.slice(0, 2)) === cur + 1);
  openSheet(`${sheetHead(L('महत्वपूर्ण दिवस कैलेंडर', 'Important days calendar'))}
  <div class="chips">${MONTHS[LANG].map((mn, i) => `<button class="chip" data-act="cal-month" data-v="${i}" aria-pressed="${i === cur}">${mn}</button>`).join('')}</div>
  <div class="list">${items.length ? items.map(d => `<button class="row" data-act="day-goto" data-iso="${year}-${d.md}"><span class="upc"><span class="d"><b class="tnum">${Number(d.md.slice(3))}</b><span>${monthShort(cur)}</span></span></span><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(dT(d))}</span><span class="row-sub">${esc(kindLabel(d.k))}</span></span>${ic('chev-right', 'chev')}</button>`).join('') : emptyState('calendar', L('इस महीने में कोई दिवस दर्ज नहीं', 'No days listed for this month'), '')}</div>`, { label: L('कैलेंडर', 'Calendar') });
  const el = $('[data-act="cal-month"][aria-pressed="true"]'); if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function vMock() {
  if (E && !E.submitted && Date.now() > E.endsAt) { setTimeout(() => submitExam(true), 0); }
  const cards = MOCKS.map(mk => {
    const hist = U.s.mocks.filter(h => h.id === mk.id);
    const n = C.baseState === 'ok' ? mockQuestionIds(mk).length : 0;
    const best = hist.length ? Math.max(...hist.map(h => h.score)) : null;
    return `<article class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-head"><h2 style="font-size:1.12rem;font-weight:800;line-height:1.35">${esc(mockTitle(mk))}</h2>${hist.length ? `<span class="tag">${L(`${hist.length} बार दिया`, `Taken ${hist.length}×`)}</span>` : `<span class="tag tag-live">${L('नया', 'New')}</span>`}</div>
      <p class="small muted" style="margin:0">${esc(L(mk.desc, mk.descEn))}</p>
      <div class="chips wrap"><span class="chip">${ic('help')} ${n} ${L('प्रश्न', 'questions')}</span><span class="chip">${ic('clock')} ${mk.mins} ${L('मिनट', 'min')}</span><span class="chip">${ic('target')} +${mk.pos} / −${mk.neg}</span><span class="chip">${ic('coins')} ${L(`अंक × ${PTS.mockX} पॉइंट्स`, `score × ${PTS.mockX} points`)}</span></div>
      ${best != null ? `<p class="small" style="margin:0">${L('सर्वश्रेष्ठ स्कोर', 'Best score')}: <b>${fmtScore(best)}</b> / ${n * mk.pos}</p>` : ''}
      <button class="btn btn-cta" data-act="mock-intro" data-id="${mk.id}" ${n < 5 ? 'disabled' : ''}>${ic('play')} ${L('परीक्षा शुरू करें', 'Start test')}</button>
    </article>`;
  }).join('');
  const resume = E && !E.submitted ? `<div class="note note-warn">${ic('clock')}<div><b>${L('एक परीक्षा जारी है', 'A test is in progress')}: ${esc(examTitle(E))}</b><br><button class="link" data-act="exam-resume">${L('जारी रखें', 'Continue')} ${ic('arrow-right')}</button></div></div>` : '';
  const hist = U.s.mocks.slice(0, 5).map(h => `<div class="row"><span class="row-main"><span class="row-title" style="font-size:1rem">${esc(examTitle(h) || h.title)}</span><span class="row-sub">${fmtDate(h.date)} · ${L(`सही ${h.c}, गलत ${h.w}, छोड़े ${h.u}`, `${h.c} right, ${h.w} wrong, ${h.u} skipped`)}</span></span><b class="tnum">${fmtScore(h.score)}/${h.max}</b></div>`).join('');
  return `${appbar(`${ic('clipboard')} ${L('अभ्यास परीक्षा', 'Mock Tests')}`, { back: 'home' })}
<main class="page gutter">
  <div class="note">${ic('info')}<div>${L('परीक्षा जैसा अनुभव: समय-सीमा, नेगेटिव मार्किंग, प्रश्न पैलेट और "समीक्षा हेतु चिह्नित" विकल्प।', 'A real exam feel: time limit, negative marking, question palette and "mark for review".')}</div></div>
  ${resume}
  ${C.baseState === 'loading' ? skeletonCards(2) : cards}
  ${hist ? `<section><h2 class="sec-title" style="margin-bottom:10px">${ic('chart')} ${L('पिछले प्रयास', 'Previous attempts')}</h2><div class="list">${hist}</div></section>` : ''}
</main>
${bottomNav('')}`;
}
function openMockIntro(id) {
  const mk = MOCKS.find(x => x.id === id);
  if (!mk) return;
  const n = mockQuestionIds(mk).length;
  openSheet(`${sheetHead(esc(mockTitle(mk)))}
  <ul class="facts">
    <li>${ic('check')}<span>${L(`कुल ${n} प्रश्न, समय ${mk.mins} मिनट। समय पूरा होते ही परीक्षा अपने-आप सबमिट होगी।`, `${n} questions in ${mk.mins} minutes. The test submits itself when time runs out.`)}</span></li>
    <li>${ic('check')}<span>${L(`सही उत्तर पर +${mk.pos} अंक, गलत उत्तर पर −${mk.neg} अंक। छोड़े गए प्रश्न पर 0।`, `+${mk.pos} marks for a right answer, −${mk.neg} for a wrong one, 0 for a skipped one.`)}</span></li>
    <li>${ic('check')}<span>${L('"समीक्षा हेतु चिह्नित" से प्रश्न बाद में देखने के लिए निशान लगाएँ। चिह्नित प्रश्न का चुना हुआ उत्तर भी गिना जाएगा।', 'Use "mark for review" to come back to a question later. A marked question\'s chosen answer still counts.')}</span></li>
    <li>${ic('check')}<span>${L(`ऊपर ${ic('grid')} पैलेट से किसी भी प्रश्न पर सीधे जाएँ।`, `Jump to any question from the ${ic('grid')} palette at the top.`)}</span></li>
    <li>${ic('coins')}<span>${L(`रिवॉर्ड: हर सही उत्तर के पॉइंट्स, और कुल अंक × ${PTS.mockX} बोनस पॉइंट्स (हर टेस्ट पर दिन में एक बार)।`, `Rewards: points for each right answer, plus your score × ${PTS.mockX} as bonus points (once per test per day).`)}</span></li>
  </ul>
  <label class="check"><input type="checkbox" id="mock-agree"> ${L('मैंने सभी निर्देश पढ़ लिए हैं।', 'I have read all the instructions.')}</label>
  <button class="btn btn-cta btn-block" id="mock-start" data-act="mock-start" data-id="${mk.id}" disabled>${ic('play')} ${L('परीक्षा शुरू करें', 'Start test')}</button>`, { label: mockTitle(mk) });
}

function vExam() {
  if (!E || E.submitted) return redirect('mock');
  const id = E.qs[E.i], q = examQ(id);
  if (!q) { setTimeout(() => examMove(E.i + 1 < E.qs.length ? E.i + 1 : 0), 0); return ''; }
  const st = E.st[id] || {}, n = E.qs.length;
  const remaining = Math.max(0, E.endsAt - Date.now());
  const opts = qO(q).map((o, i) => `<button class="opt ${st.sel === i ? 'sel' : ''}" data-act="exam-sel" data-i="${i}" aria-pressed="${st.sel === i}"><span class="key">${LETTERS[i]}.</span><span class="txt">${esc(o)}</span></button>`).join('');
  return `<header class="exambar"><div class="exambar-in gutter">
    <button class="iconbtn" data-act="exam-exit" aria-label="${L('परीक्षा से बाहर जाएँ', 'Leave the test')}">${ic('x')}</button>
    <span class="t">${esc(examTitle(E))}</span>
    <span class="timer tnum ${remaining < 60000 ? 'low' : ''}" id="etimer">${ic('clock')} <span id="etimer-v">${fmtSecs(Math.ceil(remaining / 1000))}</span></span>
    ${langBtn()}
    <button class="iconbtn" data-act="exam-palette" aria-label="${L('प्रश्न पैलेट', 'Question palette')}">${ic('grid')}</button>
  </div></header>
<main class="page gutter">
  <div class="qmeta"><b class="tnum">${L('प्रश्न', 'Question')} ${E.i + 1} / ${n}</b><span class="tag">${esc(subjName(q.s))}</span><span class="small muted tnum">+${E.pos} / −${E.neg}</span></div>
  <div class="progress" aria-hidden="true"><i style="width:${(examCounts().ans / n) * 100}%"></i></div>
  <h2 class="qtext">${esc(qT(q))}</h2>
  <div class="opts" role="group" aria-label="${L('विकल्प', 'Options')}">${opts}</div>
  ${st.mk ? `<p class="small" style="margin:0;color:var(--violet);font-weight:700">${ic('flag')} ${L('यह प्रश्न समीक्षा हेतु चिह्नित है', 'This question is marked for review')}</p>` : ''}
</main>
<div class="exam-actions gutter">
  <button class="btn btn-sm btn-outline" data-act="exam-mark">${ic('flag')} ${st.mk ? L('चिह्न हटाएँ', 'Unmark') : L('समीक्षा हेतु चिह्नित', 'Mark for review')}</button>
  <button class="btn btn-sm btn-outline" data-act="exam-clear" ${st.sel == null ? 'disabled' : ''}>${ic('rotate')} ${L('उत्तर हटाएँ', 'Clear answer')}</button>
  <button class="btn btn-grey" data-act="exam-prev" ${E.i === 0 ? 'disabled' : ''}>${ic('arrow-left')} ${L('पिछला', 'Previous')}</button>
  <button class="btn btn-cta" data-act="exam-next">${E.i === n - 1 ? L('सबमिट करें', 'Submit') : L('सेव करें और आगे', 'Save & next')} ${ic('arrow-right')}</button>
</div>`;
}
function paletteHtml() {
  const k = examCounts();
  return `${sheetHead(L('प्रश्न पैलेट', 'Question palette'))}
  <div class="legend">
    <span><i style="background:var(--ok-solid);border-color:var(--ok-solid)"></i>${L('उत्तर दिया', 'Answered')} (${k.ans})</span>
    <span><i style="background:var(--bad-solid);border-color:var(--bad-solid)"></i>${L('उत्तर नहीं दिया', 'Not answered')} (${k.na})</span>
    <span><i style="background:var(--violet);border-color:var(--violet);border-radius:50%"></i>${L('समीक्षा हेतु', 'For review')} (${k.mk})</span>
    <span><i></i>${L('नहीं देखा', 'Not seen')} (${k.nv})</span>
  </div>
  <div class="pal">${E.qs.map((id, i) => { const s = E.st[id] || {}; const cls = s.mk ? (s.sel != null ? 'p-mka' : 'p-mk') : s.sel != null ? 'p-ans' : s.v ? 'p-na' : ''; return `<button class="${cls} ${i === E.i ? 'p-cur' : ''}" data-act="exam-go" data-i="${i}" aria-label="${L('प्रश्न', 'Question')} ${i + 1}">${i + 1}</button>`; }).join('')}</div>
  <button class="btn btn-cta btn-block" data-act="exam-submit-ask">${ic('send')} ${L('परीक्षा सबमिट करें', 'Submit test')}</button>`;
}
function submitAskHtml() {
  const k = examCounts();
  return `${sheetHead(L('परीक्षा सबमिट करें?', 'Submit the test?'))}
  <div class="stats"><div class="stat s-ok"><b>${k.ans}</b><span>${L('उत्तर दिए', 'Answered')}</span></div><div class="stat s-bad"><b>${E.qs.length - k.ans}</b><span>${L('बाकी', 'Left')}</span></div><div class="stat"><b>${k.mk}</b><span>${L('चिह्नित', 'Marked')}</span></div></div>
  <p class="muted" style="margin:0">${L('सबमिट करने के बाद उत्तर नहीं बदले जा सकेंगे।', 'You cannot change answers after submitting.')}</p>
  <div class="grid2"><button class="btn btn-grey" data-act="sheet-close">${L('वापस जाएँ', 'Go back')}</button><button class="btn btn-cta" data-act="exam-submit">${L('हाँ, सबमिट करें', 'Yes, submit')}</button></div>`;
}
function vExamResult() {
  const R = lastExam;
  if (!R || !R.ex) return redirect('mock');
  const ex = R.ex, p = R.max ? Math.max(0, R.score) / R.max : 0;
  const bars = Object.entries(R.bySubj).map(([s, b]) => `<div class="bar-row" style="--c:${SUBJ[s] ? SUBJ[s].c : 'var(--brand)'}"><span>${esc(subjName(s))}</span><span class="track"><i style="width:${pct(b.c, b.n)}%"></i></span><b>${b.c}/${b.n}</b></div>`).join('');
  const sol = ex.qs.map((id, i) => {
    const q = examQ(id, ex);
    if (!q) return '';
    const s = ex.st[id] || {}, o = qO(q);
    const yours = s.sel == null ? L('छोड़ा गया', 'Skipped') : o[s.sel];
    const ok = s.sel === q.a;
    return `<div class="review-item"><b>${i + 1}. ${esc(qT(q))}</b><span class="ans">${L('सही उत्तर', 'Correct answer')}: <span class="ans-ok">${esc(o[q.a])}</span></span>${ok ? `<span class="ans ans-ok">+${ex.pos}</span>` : `<span class="ans">${L('आपका उत्तर', 'Your answer')}: <span class="ans-bad">${esc(yours)}</span>${s.sel == null ? '' : ` <span class="ans-bad">(−${ex.neg})</span>`}</span>`}<span class="small muted">${esc(qE(q) || '')}</span></div>`;
  }).join('');
  return `${appbar(L('परीक्षा परिणाम', 'Test result'), { back: 'mock' })}
<main class="page gutter">
  <section class="card result-hero">
    <div class="big-ring">${ring(p, 150, 12, p >= 0.5 ? 'var(--ring)' : 'var(--bad-solid)')}<b class="tnum">${fmtScore(R.score)}<small>/ ${R.max} ${L('अंक', 'marks')}</small></b></div>
    <h2 style="font-family:var(--font-display);font-size:1.3rem;margin:6px 0 0">${esc(examTitle(ex))}</h2>
    <p class="muted" style="margin:0">${L('नेगेटिव मार्किंग सहित स्कोर', 'Score after negative marking')}</p>
    ${R.pts != null ? `<span class="pill pill-gold">${ic('coins')} +${fmtNum(R.pts)} ${L('पॉइंट्स', 'points')}</span>${R.bonus ? `<span class="small muted">${L(`इसमें मॉक बोनस +${R.bonus} शामिल`, `Includes a mock bonus of +${R.bonus}`)}</span>` : ''}` : ''}
  </section>
  <div class="stats">
    <div class="stat s-ok"><b>${R.c}</b><span>${L('सही', 'Correct')}</span></div><div class="stat s-bad"><b>${R.w}</b><span>${L('गलत', 'Wrong')}</span></div><div class="stat"><b>${R.u}</b><span>${L('छोड़े', 'Skipped')}</span></div>
    <div class="stat"><b>${pct(R.c, R.c + R.w)}%</b><span>${L('सटीकता', 'Accuracy')}</span></div><div class="stat"><b>${R.c + R.w}/${R.n}</b><span>${L('प्रयास', 'Attempted')}</span></div><div class="stat"><b class="tnum">${fmtSecs(R.timeSec)}</b><span>${L('समय', 'Time')}</span></div>
  </div>
  <section class="card"><h2 class="sec-title" style="font-size:1.05rem;margin-bottom:12px">${ic('chart')} ${L('विषयवार प्रदर्शन', 'Subject-wise performance')}</h2><div class="bars">${bars}</div></section>
  <section><h2 class="sec-title" style="margin-bottom:10px">${ic('list')} ${L('समाधान', 'Solutions')}</h2><div class="list">${sol}</div></section>
  <div class="grid2"><button class="btn btn-cta" data-act="mock-intro" data-id="${esc(ex.id)}">${ic('rotate')} ${L('फिर से दें', 'Retake')}</button><a class="btn btn-grey" href="#mock">${L('सभी परीक्षाएँ', 'All tests')}</a></div>
</main>`;
}

let bmTab = 'q';
function vBookmarks() {
  const m = M();
  const qs = U.s.bm.q.map(id => m.byId.get(id)).filter(Boolean);
  const ns = U.s.bm.n.map(id => m.newsById.get(id)).filter(Boolean);
  const qList = qs.length
    ? `<button class="btn btn-cta" data-act="start-bookmarked">${ic('play')} ${L(`इन ${qs.length} प्रश्नों का अभ्यास करें`, `Practise these ${qs.length} questions`)}</button><div class="list">${qs.map(q => `<div class="review-item"><b>${esc(qT(q))}</b><span class="ans">${L('उत्तर', 'Answer')}: <span class="ans-ok">${esc(qO(q)[q.a])}</span></span><span class="small muted">${esc(subjName(q.s))}</span><div><button class="link" data-act="bm-q" data-id="${esc(q.id)}" style="color:var(--bad)">${ic('trash')} ${L('हटाएँ', 'Remove')}</button></div></div>`).join('')}</div>`
    : `<div class="card">${emptyState('bookmark', L('अभी कोई प्रश्न सहेजा नहीं गया', 'No saved questions yet'), L('क्विज खेलते समय "बुकमार्क" दबाकर कठिन प्रश्न यहाँ सहेजें।', 'Tap "Save" during a quiz to keep tricky questions here.'))}</div>`;
  const nList = ns.length ? ns.map(newsCard).join('') : `<div class="card">${emptyState('newspaper', L('कोई ख़बर सहेजी नहीं गई', 'No saved news'), L('करेंट अफेयर्स में किसी ख़बर को खोलकर "सहेजें" दबाएँ।', 'Open a current-affairs story and tap "Save".'))}</div>`;
  return `${appbar(`${ic('bookmark')} ${L('बुकमार्क', 'Saved')}`)}
<main class="page gutter">
  <div class="seg" role="group" aria-label="${L('बुकमार्क प्रकार', 'Saved items')}"><button data-act="bm-tab" data-v="q" aria-pressed="${bmTab === 'q'}">${L('प्रश्न', 'Questions')} (${qs.length})</button><button data-act="bm-tab" data-v="n" aria-pressed="${bmTab === 'n'}">${L('समाचार', 'News')} (${ns.length})</button></div>
  ${bmTab === 'q' ? qList : nList}
</main>
${bottomNav('bookmarks')}`;
}

// ── leaderboard: names and points only; rows are plain text (no profile links) ──
let lbTab = 'week';
const LB_TABS = [['week', 'इस सप्ताह', 'This week'], ['lastweek', 'पिछला सप्ताह', 'Last week'], ['month', 'इस महीने', 'This month'], ['winners', 'विजेता', 'Winners']];
const MEDALS = ['#E8A400', '#9AA4B2', '#C26B2E'];
function lbAvatar(r, i = -1) {
  const style = i >= 0 && i < 3 ? ` style="--medal:${MEDALS[i]}"` : '';
  return `<span class="lb-av${i >= 0 && i < 3 ? ' medal' : ''}"${style} aria-hidden="true">${esc(initial(r.n))}</span>`;
}
function lbRow(r) {
  return `<li class="lrow${r.me ? ' me' : ''}"${r.me ? ' aria-current="true"' : ''}><span class="lrank tnum">${r.rank ? r.rank : '–'}</span>${lbAvatar(r)}<span class="lname">${esc(r.n)}${r.me ? ` <span class="tag tag-live">${L('आप', 'You')}</span>` : ''}</span><span class="lpts tnum">${fmtNum(r.p)}</span></li>`;
}
function podium(top) {
  // Ranked order in the markup (1, 2, 3) for screen readers; CSS places #1 in the middle.
  return `<ol class="podium" aria-label="${L('टॉप 3', 'Top 3')}">${[0, 1, 2].filter(i => top[i]).map(i => { const r = top[i]; return `<li class="pod pod-${i + 1}${r.me ? ' me' : ''}"><span class="pod-medal" style="--medal:${MEDALS[i]}">${ic(i === 0 ? 'crown' : 'medal')}<b>${r.rank}</b></span>${lbAvatar(r, i)}<span class="pod-name">${esc(r.n)}</span><span class="pod-pts tnum">${fmtNum(r.p)} <small>${L('पॉइंट्स', 'pts')}</small></span><span class="pod-step"></span></li>`; }).join('')}</ol>`;
}
function lbPeriod(kind) {
  const t = todayISO(), wk = weekKey(t), s = LB.settings;
  if (kind === 'week') return { label: fmtWeek(wk), note: `${ic('clock')} ${L('समाप्त होने में', 'Ends in')} ${timeLeft(LB.msToWeekEnd())}`, prize: L(s.weekPrize, s.weekPrizeEn) };
  if (kind === 'lastweek') { const lw = addDays(wk, -7); const w = LB.winners.find(x => x.kind === 'week' && x.key === lw); return { label: fmtWeek(lw), note: `${ic('check')} ${L('अंतिम परिणाम', 'Final results')}${w ? ' · ' + L('विजेता घोषित', 'winners announced') : ''}`, prize: w ? L(w.prize, w.prizeEn) : L(s.weekPrize, s.weekPrizeEn) }; }
  return { label: fmtMonth(monthKey(t)), note: `${ic('clock')} ${L('समाप्त होने में', 'Ends in')} ${timeLeft(LB.msToMonthEnd())}`, prize: L(s.monthPrize, s.monthPrizeEn) };
}
function lbNotes() {
  const out = [];
  if (P.demo) out.push(`<div class="note">${ic('info')}<div>${L('टेस्ट संस्करण: "(उदाहरण)" वाले नाम नमूना विद्यार्थी हैं, ताकि आप लीडरबोर्ड आज़मा सकें।', 'Test build: names marked "(sample)" are example students so you can try the leaderboard.')}</div></div>`);
  else if (P.mode === 'standalone') out.push(`<div class="note">${ic('info')}<div>${L('यह ऑफ़लाइन संस्करण है — यहाँ सिर्फ़ आपके पॉइंट्स दिखते हैं। ऑनलाइन संस्करण में सभी विद्यार्थियों की रैंकिंग बनती है।', 'This is the offline copy, so only your own points appear here. The online version ranks every student.')}</div></div>`);
  else if (LB.denied || !P.uid) out.push(`<div class="note note-warn">${ic('alert')}<div>${L('आपके पॉइंट्स इस लीडरबोर्ड पर नहीं भेजे जा सके (अनुमति नहीं है)। आपके पॉइंट्स आपकी प्रोफ़ाइल में सुरक्षित हैं।', 'Your points could not be added to this leaderboard (no permission). They are still saved in your profile.')}</div></div>`);
  else if (LB.state === 'error') out.push(`<div class="note note-warn">${ic('alert')}<div>${L('लीडरबोर्ड लोड नहीं हुआ। थोड़ी देर बाद फिर देखें।', 'The leaderboard did not load. Check again in a little while.')}</div></div>`);
  if (U.s.lb.hide) out.push(`<div class="note">${ic('lock')}<div>${L('आपने ख़ुद को लीडरबोर्ड से छिपाया है। ', 'You have hidden yourself from the leaderboard. ')}<a class="link" href="#profile">${L('प्रोफ़ाइल में बदलें', 'Change in Profile')}</a></div></div>`);
  return out.join('');
}
function vWinners() {
  const list = LB.winners.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 12);
  if (!list.length) return `<div class="card">${emptyState('award', L('अभी कोई विजेता घोषित नहीं हुआ', 'No winners announced yet'), L('हर सोमवार पिछले सप्ताह के और हर महीने की 1 तारीख़ को पिछले महीने के टॉप विद्यार्थी यहाँ घोषित होते हैं।', 'Every Monday the top students of the past week, and on the 1st the top students of the past month, are announced here.'))}</div>`;
  const me = LB.myId();
  return list.map(w => {
    const mine = (w.top || []).findIndex(x => x && x.u === me);
    const prize = L(w.prize, w.prizeEn);
    return `<article class="card win-card">
      <div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic(w.kind === 'week' ? 'calendar' : 'award')} ${w.kind === 'week' ? `${L('सप्ताह', 'Week')}: ${fmtWeek(w.key)}` : `${L('महीना', 'Month')}: ${fmtMonth(w.key)}`}</h2></div>
      ${prize ? `<p class="prize-line">${ic('gift')} ${esc(prize)}</p>` : ''}
      ${mine >= 0 ? `<p class="win-me">${ic('crown')} ${L(`बधाई! आप #${mine + 1} पर रहे।`, `Congratulations! You finished #${mine + 1}.`)}</p>` : ''}
      <ol class="win-list">${(w.top || []).slice(0, 10).map((x, i) => `<li${x.u === me ? ' class="me"' : ''}><span class="lrank tnum">${i + 1}</span>${i < 3 ? `<span class="wmedal" style="--medal:${MEDALS[i]}">${ic('medal')}</span>` : ''}<span class="lname">${esc(LB.display(x))}</span><span class="lpts tnum">${fmtNum(x.p)}</span></li>`).join('')}</ol>
    </article>`;
  }).join('');
}
function vLeaders() {
  const tab = LB_TABS.some(t => t[0] === lbTab) ? lbTab : 'week';
  const tabs = `<div class="seg seg-4" role="group" aria-label="${L('लीडरबोर्ड अवधि', 'Leaderboard period')}">${LB_TABS.map(([v, hi, en]) => `<button data-act="lb-tab" data-v="${v}" aria-pressed="${tab === v}">${L(hi, en)}</button>`).join('')}</div>`;
  let body;
  if (tab === 'winners') body = vWinners();
  else if (P.cdb && LB.state === 'loading') body = `<div class="list">${skeletonRows(5)}</div>`;
  else {
    const rows = LB.board(tab), per = lbPeriod(tab);
    const ranked = rows.filter(r => r.p > 0);
    const mine = rows.find(r => r.me);
    const top = ranked.slice(0, 3), rest = ranked.slice(3, 50);
    const meOutside = mine && mine.rank && mine.rank > 50;
    const myPts = mine ? mine.p : 0;
    body = `<section class="lb-head">
      <div class="lb-period"><b>${esc(per.label)}</b><span>${per.note}</span></div>
      ${per.prize ? `<p class="prize-line">${ic('gift')} ${L('इनाम', 'Prize')}: ${esc(per.prize)}</p>` : ''}
      <div class="lb-mine">${U.s.lb.hide ? `<span>${ic('lock')} ${L('आप छिपे हुए हैं', 'You are hidden')}</span>` : `<span>${L('आपके पॉइंट्स', 'Your points')}: <b class="tnum">${fmtNum(myPts)}</b></span><span>${L('रैंक', 'Rank')}: <b class="tnum">${mine && mine.rank ? '#' + mine.rank : '–'}</b></span>`}</div>
    </section>
    ${top.length ? podium(top) : `<div class="card">${emptyState('trophy', tab === 'lastweek' ? L('पिछले सप्ताह कोई पॉइंट्स नहीं मिले', 'No points were earned last week') : L('अभी किसी के पॉइंट्स नहीं', 'Nobody has points yet'), tab === 'lastweek' ? '' : L('एक क्विज खेलें और लीडरबोर्ड पर सबसे पहले आएँ!', 'Play a quiz and be first on the board!'))}${tab !== 'lastweek' ? `<button class="btn btn-cta btn-block" data-act="start-daily" ${C.baseState !== 'ok' ? 'disabled' : ''}>${ic('zap')} ${L('दैनिक क्विज खेलें', 'Play the daily quiz')}</button>` : ''}</div>`}
    ${rest.length ? `<ol class="lb-list">${rest.map(lbRow).join('')}</ol>` : ''}
    ${meOutside ? `<ol class="lb-list lb-list-me">${lbRow(mine)}</ol>` : ''}
    ${mine && !mine.rank && !U.s.lb.hide && top.length ? `<p class="small muted" style="margin:0;text-align:center">${L('आप अभी रैंकिंग में नहीं हैं — एक प्रश्न का सही उत्तर दें और जुड़ जाएँ।', 'You are not ranked yet. Answer a question correctly to join.')}</p>` : ''}`;
  }
  return `${appbar(`${ic('trophy')} ${L('लीडरबोर्ड', 'Leaderboard')}`, { right: `<button class="iconbtn" data-act="pts-info" aria-label="${L('पॉइंट्स कैसे मिलते हैं', 'How points work')}" title="${L('पॉइंट्स कैसे मिलते हैं', 'How points work')}">${ic('info')}</button>` })}
<main class="page gutter">
  ${tabs}
  ${lbNotes()}
  ${body}
  <p class="privacy">${ic('lock')} ${L('लीडरबोर्ड पर सिर्फ़ नाम और पॉइंट्स दिखते हैं। कोई भी किसी दूसरे विद्यार्थी की प्रोफ़ाइल, उत्तर या प्रगति नहीं देख सकता।', 'The leaderboard shows only names and points. Nobody can open another student\'s profile, answers or progress.')}</p>
  <button class="btn btn-outline btn-block" data-act="pts-info">${ic('coins')} ${L('पॉइंट्स कैसे कमाएँ?', 'How do I earn points?')}</button>
</main>
${bottomNav('leaders')}`;
}
function openPointsInfo() {
  const rows = [
    ['check', L('सही उत्तर', 'Correct answer'), `+${PTS.correct}`, L('हर प्रश्न पर दिन में पहली बार', 'first attempt of each question per day')],
    ['clock', L('समयबद्ध मोड में सही उत्तर', 'Correct in timed mode'), `+${PTS.timed}`, L('अतिरिक्त बोनस', 'extra bonus')],
    ['help', L('गलत उत्तर (प्रयास)', 'Wrong answer (effort)'), `+${PTS.wrong}`, L('कोशिश के लिए', 'for trying')],
    ['zap', L('दैनिक क्विज पूरा', 'Daily quiz completed'), `+${PTS.daily}`, L('दिन में एक बार', 'once a day')],
    ['star', L('दैनिक क्विज में सभी सही', 'Perfect daily quiz'), `+${PTS.perfect}`, L('दिन में एक बार', 'once a day')],
    ['target', L('रोज़ का लक्ष्य पूरा', 'Daily goal reached'), `+${PTS.goal}`, L('दिन में एक बार', 'once a day')],
    ['flame', L('स्ट्रीक बोनस', 'Streak bonus'), `+${PTS.streakStep}×`, L(`स्ट्रीक के दिन (अधिकतम ${PTS.streakMax})`, `streak days (max ${PTS.streakMax})`)],
    ['clipboard', L('मॉक टेस्ट', 'Mock test'), `${L('अंक', 'score')}×${PTS.mockX}`, L('हर टेस्ट पर दिन में एक बार', 'once per test per day')],
  ];
  openSheet(`${sheetHead(L('पॉइंट्स कैसे कमाएँ', 'How to earn points'))}
  <ul class="earn">${rows.map(([i, a, b, c]) => `<li><span class="earn-ic">${ic(i)}</span><span class="row-main"><b>${a}</b><span class="row-sub">${c}</span></span><span class="pts">${b}</span></li>`).join('')}</ul>
  <div class="note">${ic('info')}<div>${L(`निष्पक्ष खेल: एक प्रश्न पर दिन में एक ही बार पॉइंट्स मिलते हैं और रोज़ अधिकतम ${PTS.cap} पॉइंट्स। साप्ताहिक लीडरबोर्ड हर सोमवार और मासिक लीडरबोर्ड हर महीने की 1 तारीख़ को नए सिरे से शुरू होता है।`, `Fair play: each question earns points once a day and you can earn at most ${PTS.cap} points a day. The weekly board restarts every Monday and the monthly board on the 1st of each month.`)}</div></div>`, { label: L('पॉइंट्स कैसे कमाएँ', 'How to earn points') });
}
function openPointsHistory() {
  const log = U.s.pts.log;
  openSheet(`${sheetHead(L('पॉइंट्स इतिहास', 'Points history'))}
  ${log.length ? `<ul class="earn">${log.slice(0, 40).map(e => { const r = PTS_REASON[e.r] || [e.r, e.r]; return `<li><span class="earn-ic">${ic('coins')}</span><span class="row-main"><b>${L(r[0], r[1])}${e.c > 1 ? ` <span class="small muted">×${e.c}</span>` : ''}</b><span class="row-sub">${relTime(e.t)}</span></span><span class="pts">+${fmtNum(e.n)}</span></li>`; }).join('')}</ul>` : emptyState('coins', L('अभी कोई पॉइंट्स नहीं', 'No points yet'), L('क्विज खेलकर पॉइंट्स कमाना शुरू करें।', 'Play a quiz to start earning points.'))}`, { label: L('पॉइंट्स इतिहास', 'Points history') });
}

function weekBars() {
  const t = todayISO(), goal = U.s.goal || 10;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const counts = days.map(d => U.s.days[d] || 0);
  const max = Math.max(goal, ...counts);
  return `<div class="week" role="img" aria-label="${L('पिछले 7 दिनों में हल किए प्रश्न', 'Questions answered in the last 7 days')}: ${counts.join(', ')}"><span class="goal-line" style="bottom:${(goal / max) * 100 * 0.72 + 14}%"></span>${days.map((d, i) => `<div class="col"><em>${counts[i] || ''}</em><span class="b ${counts[i] >= goal ? 'met' : ''}" style="height:${Math.max(3, (counts[i] / max) * 72)}%"></span><span>${d === t ? L('आज', 'Today') : WEEKDAYS_SHORT[LANG][parseISO(d).getDay()]}</span></div>`).join('')}</div>`;
}
const lbForm = { name: null };
function vProfile() {
  const tot = U.totals(), st = U.streak(), s = U.s;
  const name = s.name.trim();
  const t = todayISO();
  const subj = SUBJECTS.map(sj => { const x = U.subjStats(sj.k); return `<div class="bar-row" style="--c:${sj.c}"><span>${subjName(sj.k)}</span><span class="track"><i style="width:${pct(x.right, x.total)}%"></i></span><b>${pct(x.right, x.total)}%</b></div>`; }).join('');
  const where = LOCAL() ? L('इसी डिवाइस के ब्राउज़र में', 'in this device\'s browser') : P.progressRemote ? L('आपके खाते में (हर डिवाइस पर)', 'in your account (on every device)') : L('इसी ब्राउज़र में', 'in this browser');
  const scales = [[0.9, 'छोटा', 'Small'], [1, 'सामान्य', 'Normal'], [1.12, 'बड़ा', 'Large'], [1.25, 'बहुत बड़ा', 'Extra large']];
  const earned = BADGES.filter(b => s.badges[b.id]).length;
  const badges = BADGES.map(b => { const d = s.badges[b.id]; return `<li class="bdg${d ? ' got' : ''}" title="${esc(L(b.dhi, b.den))}"><span class="bdg-ic">${ic(d ? b.icon : 'lock')}</span><b>${esc(L(b.hi, b.en))}</b><span>${d ? fmtDate(d) : esc(L(b.dhi, b.den))}</span></li>`; }).join('');
  const rank = LB.myRank('week');
  const lbName = lbForm.name ?? s.lb.name;
  return `${appbar(`${ic('user')} ${L('प्रोफ़ाइल', 'Profile')}`)}
<main class="page gutter">
  <section class="card admin-hero" style="display:flex;align-items:center;gap:14px">
    <span class="avatar" style="width:58px;height:58px;font-size:1.5rem">${name ? esc(initial(name)) : ic('user')}</span>
    <span class="row-main"><span class="row-title" style="font-size:1.2rem">${name ? esc(name) : L('विद्यार्थी', 'Student')}</span><span class="row-sub" style="color:rgba(255,255,255,.85)">${s.exam ? `${L('लक्ष्य', 'Target')}: ${esc(examLabel(s.exam))}` : L('लक्ष्य परीक्षा चुनें', 'Choose a target exam')} · ${L(`रोज़ ${s.goal} प्रश्न`, `${s.goal} questions a day`)}</span></span>
    <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff" data-act="profile-edit">${ic('pencil')} ${L('बदलें', 'Edit')}</button>
  </section>
  <section class="card pts-card">
    <div class="sec-head"><h2 class="sec-title" style="font-size:1.05rem">${ic('coins')} ${L('रिवॉर्ड पॉइंट्स', 'Reward points')}</h2><button class="link" data-act="pts-history">${L('इतिहास', 'History')} ${ic('chev-right')}</button></div>
    <div class="pts-total tnum">${fmtNum(s.pts.total)}<small>${L('कुल पॉइंट्स', 'total points')}</small></div>
    <div class="stats stats-4"><div class="stat"><b>${fmtNum(U.ptsToday())}</b><span>${L('आज', 'Today')}</span></div><div class="stat"><b>${fmtNum(U.ptsWeek(weekKey(t)))}</b><span>${L('इस सप्ताह', 'This week')}</span></div><div class="stat"><b>${fmtNum(U.ptsMonth(monthKey(t)))}</b><span>${L('इस महीने', 'This month')}</span></div><div class="stat"><b>${rank ? '#' + rank : '–'}</b><span>${L('सप्ताह रैंक', 'Week rank')}</span></div></div>
    <div class="btnrow"><a class="btn btn-sm btn-outline" href="#leaders">${ic('trophy')} ${L('लीडरबोर्ड', 'Leaderboard')}</a><button class="btn btn-sm btn-outline" data-act="pts-info">${ic('info')} ${L('पॉइंट्स कैसे मिलते हैं', 'How points work')}</button></div>
  </section>
  <div class="stats">
    <div class="stat"><b>${tot.attempts}</b><span>${L('कुल उत्तर', 'Answers')}</span></div><div class="stat s-ok"><b>${tot.acc}%</b><span>${L('सटीकता', 'Accuracy')}</span></div><div class="stat"><b>${earned}/${BADGES.length}</b><span>${L('बैज', 'Badges')}</span></div>
    <div class="stat"><b>${st}</b><span>${L('स्ट्रीक (दिन)', 'Streak (days)')}</span></div><div class="stat"><b>${s.best || 0}</b><span>${L('सर्वश्रेष्ठ स्ट्रीक', 'Best streak')}</span></div><div class="stat"><b>${s.mocks.length}</b><span>${L('मॉक टेस्ट', 'Mock tests')}</span></div>
  </div>
  <section class="card"><h2 class="sec-title" style="font-size:1.05rem;margin-bottom:12px">${ic('award')} ${L('बैज', 'Badges')}</h2><ul class="bdgs">${badges}</ul></section>
  <section class="card"><div class="sec-head" style="margin-bottom:6px"><h2 class="sec-title" style="font-size:1.05rem">${ic('chart')} ${L('पिछले 7 दिन', 'Last 7 days')}</h2><span class="small muted">${L(`लक्ष्य: ${s.goal}/दिन`, `Goal: ${s.goal}/day`)}</span></div>${weekBars()}<p class="small muted" style="margin:8px 0 0">${L(`रोज़ कम से कम ${STREAK_MIN} प्रश्न हल करने पर स्ट्रीक बढ़ती है।`, `Answer at least ${STREAK_MIN} questions a day to grow your streak.`)}</p></section>
  <section class="card"><h2 class="sec-title" style="font-size:1.05rem;margin-bottom:12px">${ic('target')} ${L('विषयवार महारत', 'Subject mastery')}</h2><div class="bars">${subj}</div><p class="small muted" style="margin:10px 0 0">${L('हर विषय में पिछली बार सही हल किए प्रश्नों का प्रतिशत।', 'Share of questions in each subject you got right last time.')}</p></section>
  <section class="card" id="settings" style="display:flex;flex-direction:column;gap:14px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('sliders')} ${L('सेटिंग्स', 'Settings')}</h2>
    <div class="field"><span class="lbl">${ic('languages')} ${L('भाषा / Language', 'Language / भाषा')}</span><div class="chips">${[['hi', 'हिंदी'], ['en', 'English']].map(([v, l]) => `<button class="chip" data-act="set-lang" data-v="${v}" aria-pressed="${LANG === v}" lang="${v}">${l}</button>`).join('')}</div><span class="small muted">${L('प्रश्न, समाचार और पूरा ऐप चुनी गई भाषा में दिखेगा।', 'Questions, news and the whole app appear in the chosen language.')}</span></div>
    <div class="field"><span class="lbl">${L('रोज़ का लक्ष्य', 'Daily goal')}</span><div class="chips wrap">${[10, 20, 30].map(n => `<button class="chip" data-act="set-goal" data-v="${n}" aria-pressed="${s.goal === n}">${n} ${L('प्रश्न', 'questions')}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">${ic('type')} ${L('अक्षरों का आकार', 'Text size')}</span><div class="chips wrap">${scales.map(([v, hi, en]) => `<button class="chip" data-act="set-scale" data-v="${v}" aria-pressed="${Number(s.set.scale) === v}">${L(hi, en)}</button>`).join('')}</div></div>
    ${P.mode === 'standalone' ? `<div class="field"><span class="lbl">${ic('moon')} ${L('थीम', 'Theme')}</span><div class="chips">${[['system', 'सिस्टम', 'System'], ['light', 'लाइट', 'Light'], ['dark', 'डार्क', 'Dark']].map(([v, hi, en]) => `<button class="chip" data-act="set-theme" data-v="${v}" aria-pressed="${s.set.theme === v}">${L(hi, en)}</button>`).join('')}</div></div>` : ''}
    <p class="small muted" style="margin:0">${ic('lock')} ${L(`आपकी प्रगति ${where} सहेजी जाती है।`, `Your progress is saved ${where}.`)}</p>
  </section>
  <section class="card" style="display:flex;flex-direction:column;gap:12px">
    <h2 class="sec-title" style="font-size:1.05rem">${ic('trophy')} ${L('लीडरबोर्ड पर आप', 'You on the leaderboard')}</h2>
    <form data-form="lbname" class="lbname"><div class="field" style="flex:1;min-width:0"><label for="lb-name">${L('दिखने वाला नाम', 'Display name')}</label><input class="input" id="lb-name" data-bind="lbForm.name" maxlength="24" value="${esc(lbName)}" placeholder="${esc(LB.myName())}" autocomplete="off"></div><button class="btn btn-navy" type="submit">${L('सहेजें', 'Save')}</button></form>
    <button class="switch" data-act="lb-hide" role="switch" aria-checked="${!s.lb.hide}"><span class="row-main"><b>${L('लीडरबोर्ड पर मेरा नाम दिखाएँ', 'Show my name on the leaderboard')}</b><span class="row-sub">${L('बंद करने पर आपके पॉइंट्स बनते रहेंगे, पर नाम रैंकिंग में नहीं दिखेगा।', 'When off you keep earning points, but your name is left out of the rankings.')}</span></span><span class="knob" aria-hidden="true"></span></button>
    <p class="small muted" style="margin:0">${ic('lock')} ${L('दूसरे विद्यार्थी सिर्फ़ आपका दिखने वाला नाम और पॉइंट्स देखते हैं — आपकी प्रोफ़ाइल, उत्तर और प्रगति निजी रहती है।', 'Other students see only your display name and points. Your profile, answers and progress stay private.')}</p>
  </section>
  ${P.isAdmin ? `<a class="act" href="#admin"><span class="ai">${ic('settings')}</span><span>${L('एडमिन पैनल', 'Admin panel')}<span class="row-sub">${LOCAL() ? L('डेमो: बदलाव इसी ब्राउज़र में', 'Demo: changes stay in this browser') : L('सामग्री, AI प्रश्न, समीक्षा, प्रकाशन और पुरस्कार', 'Content, AI questions, review, publishing and prizes')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
  <button class="btn btn-danger" data-act="reset-ask">${ic('trash')} ${L('प्रगति रीसेट करें', 'Reset progress')}</button>
  <p class="small muted" style="text-align:center;margin:0">MY QUIZ · ${L('संस्करण', 'Version')} ${esc(BUILD)}</p>
</main>
${bottomNav('profile')}`;
}
function profileSheet() {
  onb.exam = U.s.exam; onb.goal = U.s.goal;
  openSheet(`${sheetHead(L('प्रोफ़ाइल बदलें', 'Edit profile'))}<form data-form="profile" style="display:flex;flex-direction:column;gap:14px">
  <div class="field"><label for="pf-name">${L('आपका नाम', 'Your name')}</label><input class="input" id="pf-name" maxlength="40" value="${esc(U.s.name)}" autocomplete="given-name"></div>
  <div class="field"><span class="lbl">${L('लक्ष्य परीक्षा', 'Target exam')}</span><div class="chips wrap" id="pf-exam">${EXAMS.map(([v, en]) => `<button type="button" class="chip" data-act="onb-exam" data-v="${esc(v)}" aria-pressed="${onb.exam === v}">${esc(L(v, en))}</button>`).join('')}</div></div>
  <button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('सहेजें', 'Save')}</button></form>`, { label: L('प्रोफ़ाइल बदलें', 'Edit profile') });
}

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

// ───────────────────────────── tester build (demo) ─────────────────────────────
// Each case: g = group [hi, en]; t/do/exp in Hindi with tEn/doEn/expEn in English.
const G = {
  start: ['होम और शुरुआत', 'Home and getting started'], quiz: ['क्विज', 'Quiz'], ca: ['करेंट अफेयर्स और आज का दिन', 'Current affairs and Today in History'],
  mock: ['अभ्यास परीक्षा (मॉक टेस्ट)', 'Mock tests'], prof: ['प्रोफ़ाइल और सेटिंग्स', 'Profile and settings'], admin: ['एडमिन पैनल', 'Admin panel'],
  gen: ['सामान्य', 'General'], v2: ['नया: भाषा, पॉइंट्स और लीडरबोर्ड', 'New: language, points and leaderboard'],
};
const TESTS = [
  { g: G.start, id: 'T01', to: 'home', t: 'नाम और लक्ष्य परीक्षा सहेजें', tEn: 'Save your name and target exam', do: 'होम पर “अपनी तैयारी को निजी बनाएँ” कार्ड में नाम लिखें, लक्ष्य परीक्षा और रोज़ का लक्ष्य चुनकर “सहेजें” दबाएँ।', doEn: 'On Home, in the “Make your preparation personal” card, type your name, pick a target exam and a daily goal, then tap “Save”.', exp: 'ऊपर “नमस्कार, आपका नाम!” दिखे, कार्ड हट जाए और प्रोफ़ाइल में नाम व परीक्षा दिखें।', expEn: '“Hello, your name!” shows at the top, the card goes away and Profile shows your name and exam.' },
  { g: G.start, id: 'T02', to: 'home', t: 'दैनिक क्विज पूरा करें', tEn: 'Finish the daily quiz', do: 'होम पर “शुरू करें” दबाएँ और सभी 10 प्रश्न हल करें।', doEn: 'Tap “Start” on Home and answer all 10 questions.', exp: 'हर उत्तर पर सही/गलत रंग और व्याख्या दिखे; अंत में परिणाम आए; होम की रिंग में गिनती बढ़े और “दैनिक क्विज पूरा” लिखा आए।', expEn: 'Each answer shows right/wrong colours and an explanation; a result appears at the end; the ring on Home counts up and says the daily quiz is done.' },
  { g: G.start, id: 'T03', to: 'home', t: 'स्ट्रीक और सूचनाएँ', tEn: 'Streak and notifications', do: 'आज कम से कम 5 प्रश्न हल करें, फिर होम पर घंटी (सूचनाएँ) दबाकर हर सूचना खोलें।', doEn: 'Answer at least 5 questions today, then tap the bell (notifications) on Home and open each notification.', exp: '“1 दिन की स्ट्रीक” दिखे; हर सूचना सही स्क्रीन खोले।', expEn: '“1-day streak” shows; every notification opens the right screen.' },
  { g: G.quiz, id: 'T04', to: 'quiz', t: 'विषय क्विज (अभ्यास मोड)', tEn: 'Subject quiz (practice mode)', do: '“क्विज” में कोई विषय चुनकर 10 प्रश्न हल करें; बीच में “पिछला प्रश्न” भी दबाएँ।', doEn: 'In “Quiz”, pick a subject and answer 10 questions; also tap “Previous” along the way.', exp: 'उसी विषय के प्रश्न आएँ; दिया गया उत्तर बदला न जा सके; विषय सूची में प्रगति और सटीकता अपडेट हो।', expEn: 'Questions are from that subject; a given answer cannot be changed; progress and accuracy update in the subject list.' },
  { g: G.quiz, id: 'T05', to: 'quiz', t: 'समयबद्ध मोड', tEn: 'Timed mode', do: '“समयबद्ध” चुनें, कोई विषय शुरू करें और एक प्रश्न पर 30 सेकंड पूरे होने दें।', doEn: 'Choose “Timed”, start a subject and let 30 seconds run out on one question.', exp: 'टाइमर घटता दिखे और आख़िरी 10 सेकंड में लाल हो; समय ख़त्म होने पर “समय समाप्त!” और सही उत्तर दिखे।', expEn: 'The timer counts down and turns red in the last 10 seconds; when time runs out “Time is up!” and the right answer show.' },
  { g: G.quiz, id: 'T06', to: 'bookmarks', t: 'बुकमार्क', tEn: 'Saved questions', do: 'क्विज में 2 प्रश्न “बुकमार्क” करें, फिर नीचे “बुकमार्क” टैब खोलें और “इन प्रश्नों का अभ्यास करें” दबाएँ।', doEn: 'Save 2 questions during a quiz, open the “Saved” tab at the bottom and tap “Practise these questions”.', exp: 'दोनों प्रश्न सूची में दिखें, “हटाएँ” काम करे और अभ्यास में वही प्रश्न आएँ।', expEn: 'Both questions are listed, “Remove” works and the practice uses those questions.' },
  { g: G.quiz, id: 'T07', to: 'home', t: 'गलत प्रश्नों का दोहराव', tEn: 'Revise wrong answers', do: 'क्विज में जान-बूझकर 2–3 गलत उत्तर दें, फिर होम पर “प्रश्न दोहराव के लिए तैयार” कार्ड दबाएँ।', doEn: 'Answer 2–3 questions wrongly on purpose, then tap the “questions ready for revision” card on Home.', exp: 'वही गलत हुए प्रश्न दोबारा आएँ; सही करने पर कार्ड की गिनती घटे।', expEn: 'The same wrong questions come back; answering them right lowers the count.' },
  { g: G.quiz, id: 'T08', to: 'quiz', t: 'प्रश्न खोज', tEn: 'Question search', do: 'क्विज स्क्रीन पर ऊपर दाएँ खोज आइकन दबाकर “संविधान” या “1857” लिखें और कोई परिणाम खोलें।', doEn: 'On the Quiz screen tap the search icon (top right), type “constitution” or “1857” and open a result.', exp: 'मिलते-जुलते प्रश्न दिखें और चुना गया प्रश्न खुल जाए।', expEn: 'Matching questions appear and the chosen one opens.' },
  { g: G.quiz, id: 'T09', to: 'quiz', t: 'त्रुटि बताएँ और शेयर', tEn: 'Report error and share', do: 'किसी प्रश्न पर “त्रुटि बताएँ” से रिपोर्ट भेजें, फिर “शेयर” दबाएँ।', doEn: 'Send a report with “Report error” on a question, then tap “Share”.', exp: '“धन्यवाद” संदेश आए; रिपोर्ट एडमिन → “सामग्री की जाँच करें” → “त्रुटि रिपोर्ट” में दिखे; शेयर पर टेक्स्ट कॉपी या शेयर हो।', expEn: 'A thank-you message appears; the report shows in Admin → “Review content” → “Error reports”; Share copies or shares the text.' },
  { g: G.ca, id: 'T10', to: 'ca', t: 'करेंट अफेयर्स', tEn: 'Current affairs', do: '“Current Affairs” खोलें, कोई श्रेणी चुनें, एक ख़बर खोलें, फिर “सहेजें” और “इस ख़बर से प्रश्न” आज़माएँ।', doEn: 'Open “Current Affairs”, choose a category, open a story, then try “Save” and “questions from this story”.', exp: 'फ़िल्टर सही ख़बरें दिखाए; ख़बर में मुख्य तथ्य और स्रोत लिंक हों; उसी ख़बर पर आधारित प्रश्न खुलें।', expEn: 'The filter shows the right stories; a story has key facts and a source link; its questions open.' },
  { g: G.ca, id: 'T11', to: 'ca', t: 'करेंट अफेयर्स क्विज', tEn: 'Current affairs quiz', do: 'Current Affairs में ऊपर “करेंट अफेयर्स क्विज” दबाकर पूरा करें।', doEn: 'In Current Affairs tap “Current affairs quiz” at the top and finish it.', exp: 'हाल की ख़बरों से प्रश्न आएँ और परिणाम में सही गिनती दिखे।', expEn: 'Questions come from recent news and the result shows the right count.' },
  { g: G.ca, id: 'T12', to: 'today', t: 'आज का दिन', tEn: 'Today in History', do: '“आज का दिन” खोलें; तीर से तारीख़ बदलें, ऊपर दाएँ सूची आइकन से कोई महीना चुनें, फिर “इस दिन से जुड़े प्रश्न देखें” दबाएँ।', doEn: 'Open “Today in History”; change the date with the arrows, pick a month from the list icon (top right), then tap “See questions about this day”.', exp: 'हर तारीख़ पर सही दिवस (या “कोई दिवस दर्ज नहीं”) दिखे; एक दिन में दो दिवस हों तो दोनों के बटन हों; प्रश्न उसी दिवस से जुड़े हों।', expEn: 'Each date shows the right day (or “no important day”); a date with two days shows a button for each; questions match that day.' },
  { g: G.mock, id: 'T13', to: 'mock', t: 'मॉक टेस्ट शुरू करें', tEn: 'Start a mock test', do: '“सामान्य ज्ञान मिनी मॉक – 1” शुरू करें; कुछ उत्तर दें, 2 प्रश्न “समीक्षा हेतु चिह्नित” करें और ऊपर दाएँ पैलेट से किसी प्रश्न पर जाएँ।', doEn: 'Start “General Knowledge Mini Mock – 1”; answer some questions, mark 2 for review and jump to a question from the palette (top right).', exp: 'टाइमर चले; पैलेट के रंग सही हों (हरा = उत्तर दिया, लाल = छोड़ा, बैंगनी = चिह्नित)।', expEn: 'The timer runs; palette colours are right (green = answered, red = not answered, purple = marked).' },
  { g: G.mock, id: 'T14', to: 'mock', t: 'परीक्षा छोड़कर लौटना', tEn: 'Leave and resume a test', do: 'परीक्षा के बीच ऊपर बाएँ ✕ से “बाहर जाएँ”, फिर “अभ्यास परीक्षा” में “जारी रखें” दबाएँ।', doEn: 'During a test tap ✕ (top left) → “Leave”, then tap “Continue” in “Mock Tests”.', exp: 'वहीं से परीक्षा खुले, पिछले उत्तर बने रहें और समय चलता रहे।', expEn: 'The test reopens where you left it, answers are kept and the timer kept running.' },
  { g: G.mock, id: 'T15', to: 'mock', t: 'सबमिट और परिणाम', tEn: 'Submit and result', do: 'परीक्षा सबमिट करें और परिणाम देखें।', doEn: 'Submit the test and look at the result.', exp: 'सही उत्तर पर +2 और गलत पर −0.5 सही गिने जाएँ; विषयवार प्रदर्शन, समाधान और कमाए पॉइंट्स दिखें; “पिछले प्रयास” में यह प्रयास जुड़े।', expEn: '+2 per right and −0.5 per wrong answer are counted correctly; subject-wise performance, solutions and points earned show; the attempt is added to “Previous attempts”.' },
  { g: G.prof, id: 'T16', to: 'profile', t: 'अक्षरों का आकार और रोज़ का लक्ष्य', tEn: 'Text size and daily goal', do: 'प्रोफ़ाइल में अक्षरों का आकार “बड़ा” और रोज़ का लक्ष्य 20 करें; फिर होम और क्विज देखें।', doEn: 'In Profile set text size to “Large” and the daily goal to 20; then look at Home and Quiz.', exp: 'हर स्क्रीन पर अक्षर बड़े हों पर कुछ कटे या एक-दूसरे पर न चढ़ें; होम की रिंग में “/ 20 प्रश्न” दिखे।', expEn: 'Text is larger everywhere without anything cut off or overlapping; the ring on Home shows “/ 20”.' },
  { g: G.prof, id: 'T17', to: 'home', t: 'डार्क मोड', tEn: 'Dark mode', do: 'फ़ोन की सेटिंग में डार्क मोड चालू करके ऐप की मुख्य स्क्रीनें देखें।', doEn: 'Turn on dark mode in your phone settings and look at the main screens.', exp: 'सभी स्क्रीनें पढ़ने योग्य हों; कहीं अदृश्य टेक्स्ट या चुभने वाली सफ़ेद पट्टी न हो।', expEn: 'Every screen is readable; no invisible text or glaring white strips.' },
  { g: G.admin, id: 'T18', to: 'admin-news', t: 'समाचार जोड़कर प्रकाशित करें', tEn: 'Add and publish news', do: 'एडमिन → “आज के समाचार देखें” में नया समाचार भरकर भेजें; “सामग्री की जाँच करें” में तीनों बिंदु चुनकर स्वीकृत करें; “प्रकाशित करें” से प्रकाशित करें।', doEn: 'Admin → “Today\'s news”: fill in and send a story; in “Review content” tick all three items and approve; publish it from “Publish”.', exp: 'तीनों बिंदु चुने बिना “स्वीकृत करें” बंद रहे; प्रकाशन के बाद समाचार Current Affairs में सबसे ऊपर दिखे।', expEn: '“Approve” stays disabled until all three items are ticked; after publishing, the story is at the top of Current Affairs.' },
  { g: G.admin, id: 'T19', to: 'admin-bank', t: 'नया प्रश्न जोड़ें या संपादित करें', tEn: 'Add or edit a question', do: 'एडमिन → “GK प्रश्न बैंक” में “नया प्रश्न जोड़ें” या किसी प्रश्न को “संपादित करें” (चाहें तो “English” भाग भी भरें); फिर समीक्षा और प्रकाशन करें।', doEn: 'Admin → “GK question bank”: “Add a new question” or “Edit” one (optionally fill the “English” part too); then review and publish it.', exp: 'अधूरा फ़ॉर्म सहेजा न जाए; प्रकाशन के बाद बदलाव क्विज में दिखे — English भरा हो तो English भाषा में वही दिखे।', expEn: 'An incomplete form cannot be saved; after publishing the change shows in the quiz, and in English if the English part was filled.' },
  { g: G.admin, id: 'T20', to: 'admin-bank', t: 'प्रश्न छिपाएँ', tEn: 'Hide a question', do: 'प्रश्न बैंक में किसी मूल प्रश्न पर “छिपाएँ” दबाएँ।', doEn: 'In the question bank tap “Hide” on a built-in question.', exp: 'वह प्रश्न क्विज और खोज में न आए; “प्रकाशित करें” की सूची से हटाने पर वापस दिखे।', expEn: 'The question disappears from quizzes and search; removing it from the “Publish” list brings it back.' },
  { g: G.admin, id: 'T21', to: 'admin-ai', t: 'AI से प्रश्न बनवाएँ', tEn: 'Generate questions with AI', do: 'एडमिन → “AI से प्रश्न बनवाएँ” में कोई ख़बर चुनकर “प्रश्न बनाएँ” दबाएँ (अनुमति माँगी जाए तो दें)।', doEn: 'Admin → “Generate questions with AI”: choose a story and tap “Generate questions” (allow it if asked).', exp: 'कुछ सेकंड में हिंदी और English प्रश्न बनें, संपादित किए जा सकें और “समीक्षा में भेजें” से जाँच सूची में पहुँचें। AI उपलब्ध न हो तो इसे “छोड़ें”।', expEn: 'Within seconds Hindi + English questions appear, can be edited and reach the review list via “Send to review”. Skip this if AI is not available.' },
  { g: G.gen, id: 'T22', to: 'home', t: 'नेविगेशन और बैक बटन', tEn: 'Navigation and back button', do: 'अलग-अलग स्क्रीनों पर जाएँ; फ़ोन/ब्राउज़र का बैक बटन और ऐप का ← बटन दबाएँ।', doEn: 'Move between screens; use the phone/browser back button and the app\'s ← button.', exp: 'हर बार सही पिछली स्क्रीन खुले; कोई ख़ाली या अटकी स्क्रीन न दिखे।', expEn: 'The right previous screen opens every time; no blank or stuck screens.' },
  { g: G.gen, id: 'T23', to: 'home', t: 'भाषा और पढ़ने में आसानी', tEn: 'Language quality and readability', do: 'पूरे ऐप में हिंदी और English पाठ, मात्राएँ और वर्तनी ध्यान से देखें।', doEn: 'Read the Hindi and English text across the app carefully.', exp: 'कहीं टूटे अक्षर, गलत वर्तनी, गलत अनुवाद या तथ्य की गलती न हो। मिले तो “सामग्री में गलती” प्रकार से बग बताएँ।', expEn: 'No broken characters, spelling mistakes, wrong translations or factual errors. If you find one, report a bug of type “Content error”.' },
  { g: G.v2, id: 'T24', to: 'profile', t: 'भाषा बदलें (हिंदी ⇄ English)', tEn: 'Switch language (Hindi ⇄ English)', do: 'प्रोफ़ाइल → सेटिंग्स में “English” चुनें; होम, क्विज, Current Affairs, आज का दिन, मॉक टेस्ट और लीडरबोर्ड देखें; फिर किसी प्रश्न पर ऊपर “हिं” बटन से वापस हिंदी करें; ऐप बंद करके दोबारा खोलें।', doEn: 'In Profile → Settings choose “English”; look at Home, Quiz, Current Affairs, Today in History, Mock Tests and the Leaderboard; then on a question switch back with the “हिं” button at the top; close and reopen the app.', exp: 'मेनू, बटन, प्रश्न, विकल्प, व्याख्या, ख़बरें और दिवस चुनी भाषा में दिखें; बीच क्विज में भाषा बदलने पर दिया गया उत्तर और पॉइंट्स बने रहें; दोबारा खोलने पर वही भाषा रहे।', expEn: 'Menus, buttons, questions, options, explanations, news and days appear in the chosen language; switching mid-quiz keeps your answers and points; the language is remembered after reopening.' },
  { g: G.v2, id: 'T25', to: 'quiz', t: 'रिवॉर्ड पॉइंट्स', tEn: 'Reward points', do: 'एक क्विज खेलें और हर सही उत्तर पर “+10 पॉइंट्स” देखें; परिणाम में “इस राउंड के पॉइंट्स” देखें; फिर वही प्रश्न आज दोबारा हल करें; प्रोफ़ाइल में “रिवॉर्ड पॉइंट्स” और “इतिहास” खोलें।', doEn: 'Play a quiz and watch for “+10 points” on each right answer; check “Points this round” on the result; answer the same questions again today; open “Reward points” and “History” in Profile.', exp: 'पहली बार सही उत्तर पर +10 (समयबद्ध में +12), गलत पर +1, दैनिक क्विज पूरा करने पर +20 बोनस; उसी दिन दोबारा वही प्रश्न हल करने पर पॉइंट्स न मिलें; प्रोफ़ाइल का जोड़ और इतिहास सही हो।', expEn: '+10 for a first right answer (+12 in timed mode), +1 for a wrong one, +20 bonus for finishing the daily quiz; no points for repeating the same question the same day; Profile totals and history add up.' },
  { g: G.v2, id: 'T26', to: 'leaders', t: 'लीडरबोर्ड', tEn: 'Leaderboard', do: 'नीचे “लीडरबोर्ड” टैब खोलें; “इस सप्ताह”, “पिछला सप्ताह”, “इस महीने” और “विजेता” देखें; किसी दूसरे नाम पर टैप करें; प्रोफ़ाइल में “दिखने वाला नाम” बदलें और “लीडरबोर्ड पर मेरा नाम दिखाएँ” बंद/चालू करें।', doEn: 'Open the “Leaderboard” tab at the bottom; look at “This week”, “Last week”, “This month” and “Winners”; tap another student\'s name; in Profile change the “Display name” and turn “Show my name on the leaderboard” off and on.', exp: 'आपकी पंक्ति हाइलाइट हो और पॉइंट्स प्रोफ़ाइल से मेल खाएँ; किसी नाम पर टैप करने से कोई प्रोफ़ाइल न खुले — सिर्फ़ नाम और पॉइंट्स दिखें; नया नाम लीडरबोर्ड पर दिखे; बंद करने पर आप सूची से हट जाएँ।', expEn: 'Your row is highlighted and matches your Profile points; tapping a name opens no profile (only names and points are shown); the new name shows on the board; turning it off removes you from the list.' },
  { g: G.v2, id: 'T27', to: 'admin-rewards', t: 'इनाम और विजेता (एडमिन)', tEn: 'Prizes and winners (admin)', do: 'एडमिन → “पुरस्कार और लीडरबोर्ड” में साप्ताहिक इनाम लिखकर सहेजें; “विजेता घोषित करें” दबाएँ; किसी नमूना नाम को “छिपाएँ” और फिर “फिर दिखाएँ”।', doEn: 'Admin → “Rewards & leaderboard”: write a weekly prize and save it; tap “Announce winners”; “Hide” a sample name, then “Show again”.', exp: 'इनाम लीडरबोर्ड पर दिखे; “विजेता” टैब में पिछले सप्ताह के टॉप नाम और पॉइंट्स आएँ; छिपाया नाम लीडरबोर्ड से हटे और “फिर दिखाएँ” से लौटे।', expEn: 'The prize shows on the leaderboard; the “Winners” tab lists last week\'s top names and points; a hidden name leaves the board and returns with “Show again”.' },
];
const tcT = t => L(t.t, t.tEn), tcDo = t => L(t.do, t.doEn), tcExp = t => L(t.exp, t.expEn);
const SEVS = [['critical', 'गंभीर', 'Critical', 'ऐप रुक गया, डेटा गया या आगे नहीं बढ़ सकते', 'App froze, data was lost or you cannot continue'], ['major', 'बड़ी', 'Major', 'कोई फ़ीचर काम नहीं करता', 'A feature does not work'], ['minor', 'छोटी', 'Minor', 'दिखावट या छोटी गड़बड़', 'Looks or a small glitch'], ['idea', 'सुझाव', 'Suggestion', 'सुधार का विचार', 'An idea for improvement']];
const BTYPES = [['bug', 'बग', 'Bug'], ['ui', 'डिज़ाइन / UI', 'Design / UI'], ['content', 'सामग्री में गलती', 'Content error'], ['idea', 'सुझाव', 'Idea']];
const SEV_EN = { critical: 'Critical', major: 'Major', minor: 'Minor', idea: 'Suggestion' };
const TYPE_EN = { bug: 'Bug', ui: 'UI/Design', content: 'Content error', idea: 'Idea' };
const SEV_CLS = { critical: 'sev-c', major: 'sev-ma', minor: 'sev-mi', idea: 'sev-s' };
const ROUTE_LABEL = { home: ['होम', 'Home'], quiz: ['क्विज – विषय चुनें', 'Quiz: subjects'], play: ['प्रश्न स्क्रीन', 'Question screen'], result: ['परिणाम', 'Result'], ca: ['Current Affairs', 'Current Affairs'], today: ['आज का दिन', 'Today in History'], mock: ['अभ्यास परीक्षा', 'Mock Tests'], exam: ['मॉक परीक्षा', 'Mock exam'], 'exam-result': ['परीक्षा परिणाम', 'Test result'], bookmarks: ['बुकमार्क', 'Saved'], leaders: ['लीडरबोर्ड', 'Leaderboard'], profile: ['प्रोफ़ाइल', 'Profile'], admin: ['एडमिन डैशबोर्ड', 'Admin dashboard'], 'admin-ai': ['एडमिन · AI प्रश्न', 'Admin · AI questions'], 'admin-review': ['एडमिन · सामग्री की जाँच', 'Admin · Review'], 'admin-publish': ['एडमिन · प्रकाशन', 'Admin · Publish'], 'admin-bank': ['एडमिन · प्रश्न बैंक', 'Admin · Question bank'], 'admin-news': ['एडमिन · समाचार', 'Admin · News'], 'admin-days': ['एडमिन · आज का दिन', 'Admin · Important days'], 'admin-rewards': ['एडमिन · पुरस्कार', 'Admin · Rewards'], test: ['टेस्टर केंद्र', 'Tester hub'], 'test-inbox': ['टेस्टर इनबॉक्स', 'Tester inbox'] };
const routeLabel = r => { const x = ROUTE_LABEL[r]; return x ? L(x[0], x[1]) : r; };
const fmtStamp = ts => { const d = new Date(ts); return `${fmtDate(isoOf(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const waLink = text => 'https://wa.me/?text=' + encodeURIComponent(text);
const T = {
  name: String(LS.get('test.name', '') || '').slice(0, 40),
  res: (() => { const r = LS.get('test.results', {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; })(),
  bugs: (() => { const b = LS.get('test.bugs', []); return Array.isArray(b) ? b.filter(x => x && x.id) : []; })(),
  log: [], errors: [], inbox: [], inboxState: 'idle', open: '', shared: false, denied: false, timer: 0,
  save() { LS.set('test.name', this.name); LS.set('test.results', this.res); LS.set('test.bugs', this.bugs); this.push(); },
  note(d) { this.log.push(String(d).slice(0, 40)); if (this.log.length > 30) this.log.shift(); },
  // Testers with write access (the owner, or someone invited as an editor) also send results and
  // reports to the shared inbox; everyone else shares them by WhatsApp or copy.
  push() {
    if (!P.demo || !P.db || !P.uid || this.denied) return;
    if (!this.bugs.length && !Object.keys(this.res).length) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      try {
        await P.db.doc('feedback/' + P.uid).set(clone({ name: this.name, build: BUILD, device: deviceInfo(), results: this.res, items: this.bugs.slice(-80).map(slimBug), updatedAt: Date.now() }));
        this.shared = true;
        let changed = false;
        for (const b of this.bugs) if (!b.inbox) { b.inbox = true; changed = true; }
        if (changed) { LS.set('test.bugs', this.bugs); if (route === 'test') scheduleRender(); }
      } catch (e) {
        this.shared = false;
        if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed'].includes(e.code)) this.denied = true;
      }
    }, 1200);
  },
};
BINDS.T = T;
const bugForm = { sev: 'major', type: 'bug', caseId: '', ctx: '', route: '' };
const slimBug = b => ({ id: b.id, n: b.n, title: b.title, what: b.what, exp: b.exp, sev: b.sev, type: b.type, caseId: b.caseId, screen: b.screen, at: b.at, device: b.device, steps: b.steps, errors: b.errors, tester: b.tester, build: b.build });
function deviceInfo() {
  const ua = navigator.userAgent || '';
  const m = re => { const x = re.exec(ua); return x ? x[1] : ''; };
  const os = m(/Android ([\d.]+)/) ? 'Android ' + m(/Android ([\d.]+)/)
    : m(/(?:iPhone|CPU) OS ([\d_]+)/) ? 'iOS ' + m(/(?:iPhone|CPU) OS ([\d_]+)/).replace(/_/g, '.')
      : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'OS?';
  const br = m(/EdgA?\/(\d+)/) ? 'Edge ' + m(/EdgA?\/(\d+)/)
    : m(/SamsungBrowser\/(\d+)/) ? 'Samsung Internet ' + m(/SamsungBrowser\/(\d+)/)
      : m(/(?:Chrome|CriOS)\/(\d+)/) ? 'Chrome ' + m(/(?:Chrome|CriOS)\/(\d+)/)
        : m(/(?:Firefox|FxiOS)\/(\d+)/) ? 'Firefox ' + m(/(?:Firefox|FxiOS)\/(\d+)/)
          : m(/Version\/([\d.]+).*Safari/) ? 'Safari ' + m(/Version\/([\d.]+).*Safari/) : 'Browser?';
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return `${os} · ${br} · ${window.innerWidth}×${window.innerHeight} @${Math.round((window.devicePixelRatio || 1) * 10) / 10}x · ${dark ? 'Dark' : 'Light'} · Text ${Math.round((Number(U.s.set.scale) || 1) * 100)}% · ${LANG === 'en' ? 'English' : 'Hindi'}`;
}
function bugContext() {
  let ctx = `${routeLabel(route)} (#${route})`;
  if (route === 'play' && S && S.qs[S.i]) { const q = S.qs[S.i]; ctx += ` · ${L('प्रश्न', 'Q')} ${S.i + 1}/${S.qs.length} [${q.id}] ${qT(q).slice(0, 90)}`; }
  if (route === 'exam' && E) { const q = M().byId.get(E.qs[E.i]); ctx += ` · ${L('प्रश्न', 'Q')} ${E.i + 1}/${E.qs.length}${q ? ` [${q.id}] ${qT(q).slice(0, 90)}` : ''}`; }
  if (route === 'today') ctx += ` · ${L('तारीख़', 'date')} ${dayCursor || todayISO()}`;
  if (route === 'ca' && caCat) ctx += ` · ${L('श्रेणी', 'category')}: ${catLabel(caCat)}`;
  if (route === 'leaders') ctx += ` · ${L('टैब', 'tab')}: ${lbTab}`;
  return ctx;
}
function bugText(b) {
  const tc = b.caseId ? TESTS.find(x => x.id === b.caseId) : null;
  return [
    `🐞 MY QUIZ ${L('बग', 'bug')} #${b.n} — ${SEV_EN[b.sev] || b.sev} · ${TYPE_EN[b.type] || b.type}`,
    `${L('शीर्षक', 'Title')}: ${b.title}`,
    b.tester ? `${L('टेस्टर', 'Tester')}: ${b.tester}` : null,
    `${L('स्क्रीन', 'Screen')}: ${b.screen}`,
    tc ? `${L('टेस्ट केस', 'Test case')}: ${tc.id} ${tcT(tc)}` : null,
    '',
    `${L('क्या हुआ', 'What happened')}: ${b.what}`,
    b.exp ? `${L('क्या होना चाहिए था', 'Expected')}: ${b.exp}` : null,
    '',
    `${L('डिवाइस', 'Device')}: ${b.device}`,
    `${L('समय', 'Time')}: ${fmtStamp(b.at)} · ${b.build}`,
    b.steps ? `${L('आख़िरी क़दम', 'Last steps')}: ${b.steps}` : null,
    b.errors && b.errors.length ? `${L('तकनीकी त्रुटियाँ', 'Technical errors')}: ${b.errors.join(' | ')}` : null,
  ].filter(x => x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}
function fullReportText() {
  const by = st => TESTS.filter(t => T.res[t.id] === st);
  const pass = by('pass'), fail = by('fail'), skip = by('skip'), left = TESTS.filter(t => !T.res[t.id]);
  return [
    `🧪 MY QUIZ ${L('टेस्ट रिपोर्ट', 'test report')} (${BUILD})`,
    `${L('टेस्टर', 'Tester')}: ${T.name || '—'} · ${fmtStamp(Date.now())}`,
    `${L('डिवाइस', 'Device')}: ${deviceInfo()}`,
    '',
    L(`टेस्ट केस: ${TESTS.length - left.length}/${TESTS.length} — ✅ ${pass.length} ठीक · ❌ ${fail.length} गड़बड़ · ⏭ ${skip.length} छोड़े`, `Test cases: ${TESTS.length - left.length}/${TESTS.length} — ✅ ${pass.length} passed · ❌ ${fail.length} failed · ⏭ ${skip.length} skipped`),
    ...fail.map(t => `❌ ${t.id} ${tcT(t)}`),
    ...skip.map(t => `⏭ ${t.id} ${tcT(t)}`),
    left.length ? `${L('बाकी', 'Not done')}: ${left.map(t => t.id).join(', ')}` : null,
    '',
    `${L('बग रिपोर्ट', 'Bug reports')} (${T.bugs.length}):`,
    ...T.bugs.map(b => `#${b.n} [${SEV_EN[b.sev] || b.sev} · ${TYPE_EN[b.type] || b.type}] ${b.title}\n   ${L('स्क्रीन', 'Screen')}: ${b.screen}\n   ${L('क्या हुआ', 'What happened')}: ${b.what}${b.exp ? `\n   ${L('अपेक्षित', 'Expected')}: ${b.exp}` : ''}`),
    T.bugs.length ? null : '—',
  ].filter(x => x !== null).join('\n');
}
function openBug(caseId = '') {
  bugForm.caseId = caseId; bugForm.ctx = bugContext(); bugForm.route = route;
  const tc = TESTS.find(x => x.id === caseId);
  const sevHelp = s => { const x = SEVS.find(y => y[0] === s); return x ? L(x[3], x[4]) : ''; };
  openSheet(`${sheetHead(`${ic('bug')} ${L('बग रिपोर्ट करें', 'Report a bug')}`)}
  <form data-form="bug" style="display:flex;flex-direction:column;gap:12px">
    ${tc ? `<div class="note">${ic('clipboard')}<div><b>${tc.id}:</b> ${esc(tcT(tc))}<br><span class="small muted">${L('अपेक्षित', 'Expected')}: ${esc(tcExp(tc))}</span></div></div>` : ''}
    <div class="field"><label for="bg-title">${L('छोटा शीर्षक', 'Short title')}</label><input class="input" id="bg-title" maxlength="120" value="${tc ? esc(tcT(tc) + L(' — ठीक से काम नहीं किया', ': did not work properly')) : ''}" placeholder="${L('जैसे: टाइमर ख़त्म होने पर अगला प्रश्न नहीं खुला', 'e.g. The next question did not open when the timer ended')}"></div>
    <div class="field"><span class="lbl">${L('कितनी गंभीर?', 'How serious?')}</span><div class="chips wrap">${SEVS.map(([k, hi, en]) => `<button type="button" class="chip" data-act="bug-sev" data-v="${k}" aria-pressed="${bugForm.sev === k}">${L(hi, en)}</button>`).join('')}</div><span class="small muted" id="bg-sev-help">${esc(sevHelp(bugForm.sev))}</span></div>
    <div class="field"><span class="lbl">${L('प्रकार', 'Type')}</span><div class="chips wrap">${BTYPES.map(([k, hi, en]) => `<button type="button" class="chip" data-act="bug-type" data-v="${k}" aria-pressed="${bugForm.type === k}">${L(hi, en)}</button>`).join('')}</div></div>
    <div class="field"><label for="bg-what">${L('क्या हुआ?', 'What happened?')}</label><textarea class="textarea" id="bg-what" rows="3" maxlength="1500" placeholder="${L('आपने क्या किया और स्क्रीन पर क्या दिखा', 'What you did and what the screen showed')}"></textarea></div>
    <div class="field"><label for="bg-exp">${L('क्या होना चाहिए था?', 'What should have happened?')}</label><textarea class="textarea" id="bg-exp" rows="2" maxlength="800" style="min-height:70px" placeholder="${L('आपके हिसाब से सही व्यवहार', 'What you expected')}"></textarea></div>
    <div class="note">${ic('info')}<div class="small">${L('अपने-आप जुड़ेगा', 'Added automatically')}: ${L('स्क्रीन', 'screen')} (<b>${esc(bugForm.ctx)}</b>), ${L('डिवाइस की जानकारी और आपके आख़िरी क़दम', 'device details and your last steps')}${T.errors.length ? L(`, साथ में ${T.errors.length} तकनीकी त्रुटि`, `, plus ${T.errors.length} technical error(s)`) : ''}। ${L('स्क्रीनशॉट हो तो रिपोर्ट के साथ भेज दें।', 'If you have a screenshot, send it along with the report.')}</div></div>
    <p class="small" id="bg-err" style="margin:0;color:var(--bad)" role="alert"></p>
    <button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('रिपोर्ट सहेजें', 'Save report')}</button>
  </form>`, { label: L('बग रिपोर्ट करें', 'Report a bug') });
}
function openBugSent(b) {
  openSheet(`${sheetHead(L('रिपोर्ट सहेजी गई', 'Report saved'))}
  <p style="margin:0">${L(`बग #${b.n} आपके फ़ोन में सहेज ली गई है। अब इसे ऐप टीम को भेजें:`, `Bug #${b.n} is saved on your phone. Now send it to the app team:`)}</p>
  <div class="btnrow"><a class="btn btn-cta" href="${esc(waLink(bugText(b)))}" target="_blank" rel="noopener noreferrer" data-act="bug-wa" data-id="${esc(b.id)}">${ic('send')} ${L('WhatsApp पर भेजें', 'Send on WhatsApp')}</a><button class="btn btn-outline" data-act="bug-copy" data-id="${esc(b.id)}">${ic('copy')} ${L('टेक्स्ट कॉपी करें', 'Copy text')}</button></div>
  <p class="small muted" style="margin:0">${P.db && P.uid && !T.denied ? L('यह रिपोर्ट ऐप के टेस्टर इनबॉक्स में भी भेजी जा रही है।', 'This report is also being sent to the app\'s tester inbox.') : L('चाहें तो सभी रिपोर्ट अंत में एक साथ भेजें: टेस्ट सूची → “पूरी रिपोर्ट भेजें”।', 'You can also send everything together at the end: test list → “full report”.')}</p>
  <button class="btn btn-grey btn-block" data-act="sheet-close">${L('ठीक है', 'OK')}</button>`, { label: L('रिपोर्ट सहेजी गई', 'Report saved') });
}
function markCase(id, st) {
  T.res[id] = st;
  T.save();
  const next = TESTS.find(t => !T.res[t.id]);
  T.open = next ? next.id : '';
  toast(st === 'pass' ? L(`${id} ठीक चला`, `${id} passed`) : L(`${id} छोड़ा गया`, `${id} skipped`));
  render();
}
function renderDemoStrip() {
  if (!DEMO) return;
  const root = $('#demo-root');
  if (!root) return;
  const done = TESTS.filter(t => T.res[t.id]).length;
  root.innerHTML = `<div class="demo-strip"><div class="demo-in gutter"><span class="demo-tag">${ic('flask')}<span>${L('टेस्ट संस्करण', 'Test build')}</span></span><span class="demo-sp"></span><button class="demo-btn" data-act="bug-open" aria-label="${L('बग बताएँ', 'Report a bug')}">${ic('bug')} ${L('बग बताएँ', 'Report bug')}${T.errors.length ? '<span class="demo-dot" aria-hidden="true"></span>' : ''}</button><a class="demo-btn" href="#test" aria-label="${L(`टेस्ट सूची: ${TESTS.length} में से ${done} टेस्ट हुए`, `Test list: ${done} of ${TESTS.length} done`)}">${ic('clipboard')} ${L('टेस्ट', 'Tests')} <b class="tnum">${done}/${TESTS.length}</b></a></div></div>`;
}
function tcHtml(t) {
  const st = T.res[t.id];
  const label = st === 'pass' ? L('ठीक', 'Passed') : st === 'fail' ? L('गड़बड़', 'Failed') : st === 'skip' ? L('छोड़ा', 'Skipped') : L('बाकी', 'To do');
  return `<details class="tcase" data-tc="${t.id}" ${T.open === t.id ? 'open' : ''}><summary><span class="tc-id">${t.id}</span><span class="tc-title">${esc(tcT(t))}</span><span class="tc-st ${st ? 'tc-' + st : ''}">${label}</span></summary>
  <div class="tc-body"><p><b>${L('क्या करें', 'Steps')}:</b> ${esc(tcDo(t))}</p><p><b>${L('अपेक्षित परिणाम', 'Expected result')}:</b> ${esc(tcExp(t))}</p>
  <div class="btnrow"><a class="btn btn-sm btn-outline" href="#${t.to}">${ic('arrow-right')} ${L('स्क्रीन खोलें', 'Open screen')}</a><button class="btn btn-sm btn-cta" data-act="tc-pass" data-id="${t.id}">${ic('check')} ${L('ठीक चला', 'Works')}</button><button class="btn btn-sm btn-danger" data-act="tc-fail" data-id="${t.id}">${ic('x')} ${L('गड़बड़ है', 'Problem')}</button><button class="btn btn-sm btn-grey" data-act="tc-skip" data-id="${t.id}">${L('छोड़ें', 'Skip')}</button></div></div></details>`;
}
function bugRow(b, own = true) {
  const sv = SEVS.find(x => x[0] === b.sev), ty = BTYPES.find(x => x[0] === b.type);
  const sev = sv ? L(sv[1], sv[2]) : b.sev, typ = ty ? L(ty[1], ty[2]) : b.type;
  return `<div class="review-item"><div class="draft-head"><span class="tag ${SEV_CLS[b.sev] || ''}">${esc(sev)}</span><span class="tag">${esc(typ)}</span><span class="small muted">#${esc(b.n)} · ${relTime(b.at)}${own && b.inbox ? ' · ' + L('इनबॉक्स में भेजी गई', 'sent to inbox') : ''}${!own && b.tester ? ' · ' + esc(b.tester) : ''}</span></div>
  <b>${esc(b.title)}</b><span class="small muted">${esc(b.screen)}</span><span class="small">${esc(b.what)}</span>${b.exp ? `<span class="small">${L('अपेक्षित', 'Expected')}: ${esc(b.exp)}</span>` : ''}${!own && b.steps ? `<span class="small muted">${L('आख़िरी क़दम', 'Last steps')}: ${esc(b.steps)}</span>` : ''}${!own && b.device ? `<span class="small muted">${esc(b.device)}</span>` : ''}
  ${own ? `<div class="btnrow" style="gap:14px"><a class="link" href="${esc(waLink(bugText(b)))}" target="_blank" rel="noopener noreferrer" data-act="bug-wa" data-id="${esc(b.id)}">${ic('send')} WhatsApp</a><button class="link" data-act="bug-copy" data-id="${esc(b.id)}">${ic('copy')} ${L('कॉपी', 'Copy')}</button><button class="link" style="color:var(--bad)" data-act="bug-del" data-id="${esc(b.id)}">${ic('trash')} ${L('हटाएँ', 'Delete')}</button></div>` : ''}</div>`;
}
function vTest() {
  if (!DEMO) return redirect('home');
  const total = TESTS.length, done = TESTS.filter(t => T.res[t.id]).length;
  const n = st => TESTS.filter(t => T.res[t.id] === st).length;
  const groups = uniq(TESTS.map(t => t.g));
  const long = fullReportText().length > 6000;
  return `${appbar(`${ic('clipboard')} ${L('टेस्टर केंद्र', 'Tester hub')}`, { back: 'home', right: langBtn() })}
<main class="page gutter">
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <h2 style="font-size:1.15rem;font-weight:800;line-height:1.35">${L('धन्यवाद! आप MY QUIZ का टेस्ट संस्करण चला रहे हैं।', 'Thank you! You are running the MY QUIZ test build.')}</h2>
    <p class="small muted" style="margin:0">${L('हर फ़ीचर बेझिझक आज़माएँ, एडमिन पैनल भी। आपके सारे बदलाव केवल आपके ब्राउज़र में रहते हैं; असली ऐप पर कोई असर नहीं होता।', 'Try every feature freely, the admin panel too. All your changes stay in your browser; the real app is not affected.')}</p>
    <ol class="small" style="margin:0;padding-left:1.25em;display:flex;flex-direction:column;gap:4px">
      <li>${L('नीचे अपना नाम लिखें।', 'Write your name below.')}</li>
      <li>${L('हर टेस्ट खोलें और बताए गए क़दम करें (“स्क्रीन खोलें” से सीधे वहाँ जाएँ)।', 'Open each test and follow the steps (“Open screen” takes you there).')}</li>
      <li>${L('ठीक चले तो “ठीक चला” दबाएँ; गड़बड़ हो तो “गड़बड़ है” दबाकर बग लिखें। किसी भी स्क्रीन से ऊपर पीली पट्टी में “बग बताएँ” भी दबा सकते हैं।', 'If it works tap “Works”; if not, tap “Problem” and describe the bug. You can also tap “Report bug” in the yellow bar on any screen.')}</li>
      <li>${L('अंत में “पूरी रिपोर्ट भेजें” से सब एक साथ भेजें।', 'At the end, send everything at once with the full report.')}</li>
    </ol>
    <div class="field"><label for="t-name">${L('आपका नाम (टेस्टर)', 'Your name (tester)')}</label><input class="input" id="t-name" data-bind="T.name" value="${esc(T.name)}" maxlength="40" placeholder="${L('जैसे: प्रिया', 'e.g. Priya')}" autocomplete="name"></div>
  </section>
  <div class="stats tstats"><div class="stat"><b class="tnum">${done}/${total}</b><span>${L('टेस्ट हुए', 'Tests done')}</span></div><div class="stat s-ok"><b>${n('pass')}</b><span>${L('ठीक', 'Passed')}</span></div><div class="stat s-bad"><b>${n('fail')}</b><span>${L('गड़बड़', 'Failed')}</span></div><div class="stat"><b>${T.bugs.length}</b><span>${L('बग', 'Bugs')}</span></div></div>
  <div class="btnrow"><a class="btn btn-cta" href="${esc(waLink(fullReportText()))}" target="_blank" rel="noopener noreferrer" data-act="report-wa">${ic('send')} ${L('पूरी रिपोर्ट WhatsApp पर', 'Full report on WhatsApp')}</a><button class="btn btn-outline" data-act="report-copy">${ic('copy')} ${L('पूरी रिपोर्ट कॉपी करें', 'Copy full report')}</button></div>
  ${long ? `<p class="small muted" style="margin:-6px 0 0">${L('रिपोर्ट लंबी है। WhatsApp में कट जाए तो “कॉपी करें” से भेजें।', 'The report is long. If WhatsApp cuts it off, send it with “Copy”.')}</p>` : ''}
  ${groups.map(g => `<h3 class="tgroup">${esc(L(g[0], g[1]))}</h3>${TESTS.filter(t => t.g === g).map(tcHtml).join('')}`).join('')}
  <section style="display:flex;flex-direction:column;gap:10px">
    <div class="sec-head"><h2 class="sec-title">${ic('bug')} ${L('मेरी बग रिपोर्ट', 'My bug reports')} (${T.bugs.length})</h2><button class="btn btn-sm btn-outline" data-act="bug-open">${ic('plus')} ${L('नई रिपोर्ट', 'New report')}</button></div>
    ${T.bugs.length ? `<div class="list">${T.bugs.slice().reverse().map(b => bugRow(b)).join('')}</div>` : `<div class="card">${emptyState('bug', L('अभी कोई बग रिपोर्ट नहीं', 'No bug reports yet'), L('गड़बड़ दिखे तो ऊपर पीली पट्टी में “बग बताएँ” दबाएँ।', 'If something goes wrong, tap “Report bug” in the yellow bar.'))}</div>`}
  </section>
  ${P.editor ? `<a class="act" href="#test-inbox"><span class="ai">${ic('inbox')}</span><span>${L('टेस्टर इनबॉक्स', 'Tester inbox')}<span class="row-sub">${L('सभी टेस्टरों की सीधे आई रिपोर्ट — केवल मालिक/संपादक देख सकते हैं', 'Reports sent directly by all testers; only the owner/editors can see them')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1.05rem">${ic('rotate')} ${L('नए सिरे से टेस्ट करें', 'Start testing afresh')}</h2><p class="small muted" style="margin:0">${L('प्रगति, पॉइंट्स, बुकमार्क, मॉक इतिहास और एडमिन बदलाव हटाकर ऐप को पहली बार जैसा बनाएँ। आपकी टेस्ट सूची और बग रिपोर्ट बनी रहेंगी।', 'Clear progress, points, saved items, mock history and admin changes so the app is like new. Your test list and bug reports are kept.')}</p><button class="btn btn-danger" data-act="demo-reset-ask">${ic('trash')} ${L('ऐप डेटा रीसेट करें', 'Reset app data')}</button></section>
  <p class="small muted" style="text-align:center;margin:0">MY QUIZ · ${esc(BUILD)}</p>
</main>
${bottomNav('')}`;
}
function vTestInbox() {
  if (!DEMO) return redirect('home');
  if (!P.editor) return `${appbar(L('टेस्टर इनबॉक्स', 'Tester inbox'), { back: 'test' })}<main class="page gutter"><div class="card">${emptyState('lock', L('यह इनबॉक्स केवल ऐप के मालिक या संपादक के लिए है', 'This inbox is only for the app\'s owner or editors'), P.ready ? '' : L('पहुँच जाँची जा रही है…', 'Checking access…'))}</div></main>`;
  const testers = T.inbox.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const cards = testers.map(x => {
    const vals = Object.values(x.results);
    const cnt = st => vals.filter(v => v === st).length;
    const failed = TESTS.filter(t => x.results[t.id] === 'fail').map(t => t.id);
    return `<section class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="inbox-head"><span class="avatar" style="width:40px;height:40px;background:var(--navy);border:0">${esc(initial(x.name || 'T'))}</span><span class="row-main"><span class="row-title">${esc(x.name || L('बिना नाम का टेस्टर', 'Unnamed tester'))}</span><span class="row-sub">${relTime(x.updatedAt)} · ${esc(x.build || '')}</span></span></div>
      ${x.device ? `<span class="small muted">${esc(x.device)}</span>` : ''}
      <div class="chips wrap"><span class="chip">${cnt('pass') + cnt('fail') + cnt('skip')}/${TESTS.length} ${L('टेस्ट', 'tests')}</span><span class="chip">${cnt('pass')} ${L('ठीक', 'passed')}</span><span class="chip">${cnt('fail')} ${L('गड़बड़', 'failed')}${failed.length ? ': ' + esc(failed.join(', ')) : ''}</span><span class="chip">${x.items.length} ${L('बग', 'bugs')}</span></div>
      ${x.items.length ? `<div class="list">${x.items.slice().reverse().map(b => bugRow(b, false)).join('')}</div>` : ''}
    </section>`;
  }).join('');
  return `${appbar(`${ic('inbox')} ${L('टेस्टर इनबॉक्स', 'Tester inbox')}`, { back: 'test' })}
<main class="page gutter">
  <div class="note">${ic('info')}<div>${L('यहाँ उन टेस्टरों की रिपोर्ट और टेस्ट नतीजे दिखते हैं जिन्हें आपने इस डेमो पर <b>संपादक (Editor)</b> की पहुँच दी है। WhatsApp या कॉपी से भेजी रिपोर्ट यहाँ नहीं आतीं।', 'This shows reports and results from testers you gave <b>Editor</b> access to this demo. Reports sent by WhatsApp or copy do not arrive here.')}</div></div>
  ${testers.length ? `<button class="btn btn-outline" data-act="inbox-copy">${ic('copy')} ${L('सारी रिपोर्ट कॉपी करें', 'Copy all reports')}</button>` : ''}
  ${T.inboxState === 'loading' ? skeletonCards(2) : T.inboxState === 'error' ? `<div class="note note-warn">${ic('alert')}<div>${L('इनबॉक्स अभी लोड नहीं हो सका।', 'The inbox could not be loaded right now.')}</div></div>` : cards || `<div class="card">${emptyState('inbox', L('अभी कोई रिपोर्ट नहीं आई', 'No reports yet'), '')}</div>`}
</main>`;
}
function subscribeInbox() {
  if (!P.demo || !P.db || !P.editor) return;
  T.inboxState = 'loading';
  try {
    P.db.collection('feedback').onSnapshot(snap => {
      T.inbox = snap.docs.map(d => {
        const x = d.data() || {};
        return { uid: d.id, name: String(x.name || ''), build: String(x.build || ''), device: String(x.device || ''), results: x.results && typeof x.results === 'object' && !Array.isArray(x.results) ? x.results : {}, items: Array.isArray(x.items) ? x.items.filter(i => i && typeof i === 'object') : [], updatedAt: Number(x.updatedAt) || 0 };
      });
      T.inboxState = 'ok';
      if (route === 'test-inbox' || route === 'test') scheduleRender();
    }, () => { T.inboxState = 'error'; if (route === 'test-inbox') scheduleRender(); });
  } catch { T.inboxState = 'error'; }
}
// Two example AI drafts so the review → approve → publish flow can be tried right away.
function seedDemo() {
  if (!P.demo || LS.get('demo.seeded', false)) return;
  LS.set('demo.seeded', true);
  if (C.drafts.length) return;
  const now = Date.now();
  const src = 'गोवा में 57वाँ अंतरराष्ट्रीय फ़िल्म महोत्सव (IFFI) शुरू\nतारीख़: 20 नवंबर 2026\nभारत का 57वाँ अंतरराष्ट्रीय फ़िल्म महोत्सव 20 से 28 नवंबर 2026 तक गोवा में आयोजित हो रहा है। इस बार की थीम Stories Without Borders है और उद्घाटन फ़िल्म पोलिश निर्देशक पावेल पावलिकोव्स्की की Fatherland है।\n• कंट्री ऑफ़ ऑनर: स्पेन';
  C.drafts.push(
    { id: 'ex1', type: 'q', status: 'draft', origin: 'ai', note: 'उदाहरण ड्राफ़्ट', source: src, createdAt: now, updatedAt: now, data: { id: 'qex1iffi', s: 'ca', t: 'कला एवं संस्कृति', d: 1, n: 'n2611-iffi', q: '57वें भारतीय अंतरराष्ट्रीय फ़िल्म महोत्सव (IFFI) 2026 में कंट्री ऑफ़ ऑनर कौन-सा देश है?', o: ['फ़्रांस', 'स्पेन', 'जापान', 'इटली'], a: 1, e: '57वें IFFI (20–28 नवंबर 2026, गोवा) में स्पेन को कंट्री ऑफ़ ऑनर बनाया गया है।', en: { q: 'Which country is the Country of Honour at the 57th International Film Festival of India (IFFI) 2026?', o: ['France', 'Spain', 'Japan', 'Italy'], e: 'Spain is the Country of Honour at the 57th IFFI (20–28 November 2026, Goa).', t: 'Art & Culture' } } },
    { id: 'ex2', type: 'q', status: 'draft', origin: 'ai', note: 'उदाहरण ड्राफ़्ट', source: src, createdAt: now + 1, updatedAt: now + 1, data: { id: 'qex2iffi', s: 'ca', t: 'कला एवं संस्कृति', d: 2, n: 'n2611-iffi', q: 'IFFI 2026 की उद्घाटन फ़िल्म Fatherland के निर्देशक पावेल पावलिकोव्स्की किस देश से हैं?', o: ['पोलैंड', 'स्पेन', 'फ़्रांस', 'जर्मनी'], a: 0, e: 'उद्घाटन फ़िल्म Fatherland पोलिश निर्देशक पावेल पावलिकोव्स्की की है।', en: { q: 'The IFFI 2026 opening film Fatherland is directed by Paweł Pawlikowski. Which country is he from?', o: ['Poland', 'Spain', 'France', 'Germany'], e: 'The opening film Fatherland is by Polish director Paweł Pawlikowski.', t: 'Art & Culture' } } });
  CMS.saveLocal();
}
Object.assign(ACTIONS, {
  'bug-open': () => openBug(''),
  'bug-sev': el => { bugForm.sev = el.dataset.v; $$('[data-act="bug-sev"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === bugForm.sev))); const h = $('#bg-sev-help'); const x = SEVS.find(y => y[0] === bugForm.sev); if (h) h.textContent = x ? L(x[3], x[4]) : ''; },
  'bug-type': el => { bugForm.type = el.dataset.v; $$('[data-act="bug-type"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === bugForm.type))); },
  'bug-copy': el => { const b = T.bugs.find(x => x.id === el.dataset.id); if (b) copyText(bugText(b), L('रिपोर्ट कॉपी हुई — WhatsApp, ईमेल या कहीं भी पेस्ट करें', 'Report copied. Paste it into WhatsApp, email or anywhere.')); },
  'bug-wa': el => { const b = T.bugs.find(x => x.id === el.dataset.id); if (b) el.setAttribute('href', waLink(bugText(b))); },
  'bug-del': el => { const id = el.dataset.id; confirmSheet(L('यह बग रिपोर्ट हटाएँ?', 'Delete this bug report?'), L('रिपोर्ट आपके फ़ोन से हट जाएगी।', 'The report will be removed from your phone.'), L('हटाएँ', 'Delete'), () => { T.bugs = T.bugs.filter(x => x.id !== id); T.save(); render(); }); },
  'report-wa': el => { el.setAttribute('href', waLink(fullReportText())); },
  'report-copy': () => copyText(fullReportText(), L('पूरी टेस्ट रिपोर्ट कॉपी हुई — अब WhatsApp या ईमेल में पेस्ट करें', 'Full test report copied. Paste it into WhatsApp or email.')),
  'tc-pass': el => markCase(el.dataset.id, 'pass'),
  'tc-skip': el => markCase(el.dataset.id, 'skip'),
  'tc-fail': el => openBug(el.dataset.id),
  'inbox-copy': () => {
    const text = T.inbox.map(x => [`👤 ${x.name || L('टेस्टर', 'Tester')} · ${x.device}`, `${L('टेस्ट', 'Tests')}: ${Object.keys(x.results).length}/${TESTS.length} · ${L('गड़बड़', 'Failed')}: ${TESTS.filter(t => x.results[t.id] === 'fail').map(t => t.id).join(', ') || '—'}`, ...x.items.map(b => bugText({ ...b, n: b.n, at: b.at || Date.now(), build: b.build || '' }))].join('\n')).join('\n\n———\n\n');
    copyText(text, L('सभी टेस्टरों की रिपोर्ट कॉपी हुई', 'All testers\' reports copied'));
  },
  'demo-reset-ask': () => confirmSheet(L('ऐप डेटा रीसेट करें?', 'Reset app data?'), L('आपकी प्रगति, पॉइंट्स, बुकमार्क, मॉक इतिहास और एडमिन में किए बदलाव हट जाएँगे। टेस्ट सूची और बग रिपोर्ट बनी रहेंगी।', 'Your progress, points, saved items, mock history and admin changes will be cleared. The test list and bug reports are kept.'), L('रीसेट करें', 'Reset'), () => {
    const lang = U.s.set.lang;
    for (const k of ['progress', 'cms.pub', 'cms.drafts', 'cms.reports', 'exam', 'lastExam', 'onb-skip', 'demo.seeded', 'lb.settings', 'lb.winners', 'lb.hidden']) LS.del(k);
    U.s = DEF(); U.s.set.lang = lang; applySettings(); S = null; E = null; lastExam = null;
    Object.assign(onb, { name: '', exam: '', goal: 10 });
    LB.settings = { weekPrize: '', weekPrizeEn: '', monthPrize: '', monthPrizeEn: '' };
    loadLocalCms(); LB.loadLocal(); seedDemo(); bump();
    toast(L('ऐप नए सिरे से शुरू — अब टेस्ट करें', 'The app is fresh again. Happy testing!'));
    nav('home');
  }),
});
FORMS.bug = async f => {
  const g = id => ($('#' + id, f).value || '').trim();
  const title = g('bg-title'), what = g('bg-what'), exp = g('bg-exp');
  if (title.length < 4) { $('#bg-err', f).textContent = L('छोटा-सा शीर्षक लिखें।', 'Write a short title.'); return; }
  if (what.length < 6) { $('#bg-err', f).textContent = L('बताएँ कि क्या हुआ — इसी से डेवलपर गड़बड़ ढूँढ पाएँगे।', 'Describe what happened: that is how developers find the problem.'); return; }
  const b = { id: rid(), n: T.bugs.reduce((mx, x) => Math.max(mx, Number(x.n) || 0), 0) + 1, title, what, exp, sev: bugForm.sev, type: bugForm.type, caseId: bugForm.caseId, screen: bugForm.ctx, route: bugForm.route, at: Date.now(), device: deviceInfo(), steps: T.log.slice(-15).join(' → '), errors: T.errors.slice(-5).map(e => `${e.m} (@${e.at})`), tester: T.name, build: BUILD, inbox: false };
  T.bugs.push(b);
  if (b.caseId) T.res[b.caseId] = 'fail';
  T.save();
  closeSheet();
  openBugSent(b);
  render();
};

// ───────────────────────────── router & render ─────────────────────────────
const ROUTES = { home: vHome, quiz: vQuiz, play: vPlay, result: vResult, ca: vCA, today: vToday, mock: vMock, exam: vExam, 'exam-result': vExamResult, bookmarks: vBookmarks, leaders: vLeaders, profile: vProfile, admin: vAdmin, 'admin-ai': vAdminAI, 'admin-review': vAdminReview, 'admin-publish': vAdminPublish, 'admin-bank': vAdminBank, 'admin-news': vAdminNews, 'admin-days': vAdminDays, 'admin-rewards': vAdminRewards, test: vTest, 'test-inbox': vTestInbox };
const NO_NAV = new Set(['play', 'result', 'exam', 'exam-result', 'test-inbox', ...ADMIN_ROUTES]);
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
window.addEventListener('hashchange', () => { route = routeFromHash(); if (DEMO) T.note('→' + route); closeSheet(); render(true); });

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
  if (DEMO) renderDemoStrip();
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
  if (el.tagName === 'A' && (el.getAttribute('href') || '#').startsWith('#')) e.preventDefault();
  if (DEMO) { const x = el.dataset.s || el.dataset.v || el.dataset.i || el.dataset.id || ''; T.note(el.dataset.act + (x ? ':' + String(x).slice(0, 14) : '')); }
  fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  if (DEMO) T.note('form:' + f.dataset.form);
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
document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.tc) { if (d.open) T.open = d.dataset.tc; else if (T.open === d.dataset.tc) T.open = ''; } }, true);
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
// Save right away when the app goes to the background, so the leaderboard never misses points.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  clearTimeout(U.t); U.flush();
  if (LB.canShare()) { clearTimeout(LB.t); LB.push(); }
});

// ───────────────────────────── boot ─────────────────────────────
function boot() {
  if (DEMO) {
    document.documentElement.classList.add('demo');
    const onErr = msg => { T.errors.push({ m: String(msg || 'error').slice(0, 180), at: route, t: Date.now() }); if (T.errors.length > 10) T.errors.shift(); renderDemoStrip(); };
    window.addEventListener('error', e => onErr(e.message || (e.error && e.error.message)));
    window.addEventListener('unhandledrejection', e => { const r = e.reason; onErr(r && (r.message || r.code) ? r.message || r.code : r); });
  }
  U.load();
  applySettings();
  const live = document.createElement('div');
  live.id = 'sr-live'; live.className = 'sr'; live.setAttribute('aria-live', 'assertive');
  document.body.appendChild(live);
  route = routeFromHash();
  if (LOCAL()) { loadLocalCms(); LB.loadLocal(); seedDemo(); }
  render(true);
  loadBase();
  initPlatform().then(() => {
    if (P.mode === 'artifact' && !P.demo) {
      subscribeLive(); subscribeCms(); LB.subscribe();
      U.syncRemote().then(() => LB.queue());
    }
    if (P.demo) { subscribeInbox(); T.push(); }
    scheduleRender();
  });
  if (P.mode === 'standalone' && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
}
boot();
})();
