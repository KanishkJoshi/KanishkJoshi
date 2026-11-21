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
const EXAMS = [['SSC', 'SSC'], ['रेलवे', 'Railway'], ['बैंकिंग', 'Banking'], ['राज्य PSC', 'State PSC'], ['पुलिस', 'Police'], ['शिक्षक भर्ती', 'Teaching'], ['अन्य', 'Other']];
const MOCKS = [
  { id: 'gk-1', title: 'सामान्य ज्ञान मिनी मॉक – 1', titleEn: 'General Knowledge Mini Mock – 1', desc: 'इतिहास, भूगोल, संविधान, विज्ञान, खेल और विविध — SSC जैसी अंकन योजना।', descEn: 'History, geography, polity, science, sports and more, with SSC-style marking.', mix: { history: 4, geography: 3, polity: 4, science: 4, sports: 2, misc: 3 }, mins: 12, pos: 2, neg: 0.5 },
  { id: 'ca-latest', title: 'करेंट अफेयर्स मॉक', titleEn: 'Current Affairs Mock', desc: 'हाल की प्रमुख ख़बरों से 12 प्रश्न।', descEn: '12 questions from recent major news.', mix: { ca: 12 }, latest: true, mins: 8, pos: 2, neg: 0.5 },
  { id: 'days-1', title: 'महत्वपूर्ण दिवस मॉक', titleEn: 'Important Days Mock', desc: 'राष्ट्रीय और अंतरराष्ट्रीय दिवस, जयंती और स्थापना दिवस।', descEn: 'National and international days, birth anniversaries and foundation days.', mix: { days: 15 }, mins: 8, pos: 1, neg: 0.25 },
];
const TYPE_LABEL = { q: ['प्रश्न', 'Question'], news: ['समाचार', 'News'], day: ['दिवस', 'Day'] };
const COLL = { q: 'q', news: 'news', day: 'days' };

// Reward points. A question earns points only on its first attempt each day; daily cap stops farming.
const PTS = { correct: 10, wrong: 1, timed: 2, daily: 20, perfect: 20, goal: 20, streakStep: 5, streakMax: 50, mockX: 3, cap: 600 };
const PTS_REASON = {
  correct: ['सही उत्तर', 'Correct answers'], wrong: ['प्रयास', 'Attempts'], goal: ['रोज़ का लक्ष्य पूरा', 'Daily goal reached'],
  streak: ['स्ट्रीक बोनस', 'Streak bonus'], daily: ['दैनिक क्विज पूरा', 'Daily quiz completed'], perfect: ['दैनिक क्विज में सभी सही', 'Perfect daily quiz'],
  mock: ['मॉक टेस्ट', 'Mock test'],
};
const BADGES = [
  { id: 'first', icon: 'zap', hi: 'पहला क़दम', en: 'First step', dhi: 'पहला प्रश्न हल किया', den: 'Answered your first question', test: s => s.answers >= 1 },
  { id: 'streak3', icon: 'flame', hi: '3 दिन की स्ट्रीक', en: '3-day streak', dhi: 'लगातार 3 दिन तैयारी', den: 'Practised 3 days in a row', test: s => s.best >= 3 },
  { id: 'streak7', icon: 'flame', hi: '7 दिन की स्ट्रीक', en: '7-day streak', dhi: 'लगातार 7 दिन तैयारी', den: 'Practised 7 days in a row', test: s => s.best >= 7 },
  { id: 'q100', icon: 'target', hi: '100 उत्तर', en: '100 answers', dhi: '100 प्रश्नों के उत्तर दिए', den: 'Answered 100 questions', test: s => s.answers >= 100 },
  { id: 'acc80', icon: 'check', hi: 'सटीक निशाना', en: 'Sharp shooter', dhi: '50+ उत्तरों में 80% सटीकता', den: '80% accuracy over 50+ answers', test: s => s.answers >= 50 && s.acc >= 80 },
  { id: 'mock', icon: 'clipboard', hi: 'मॉक योद्धा', en: 'Mock warrior', dhi: 'पहला मॉक टेस्ट दिया', den: 'Took your first mock test', test: s => s.mocks >= 1 },
  { id: 'pts1k', icon: 'coins', hi: '1,000 पॉइंट्स', en: '1,000 points', dhi: 'कुल 1,000 पॉइंट्स जुटाए', den: 'Collected 1,000 points in total', test: s => s.total >= 1000 },
  { id: 'top3', icon: 'crown', hi: 'टॉप 3 विजेता', en: 'Top 3 winner', dhi: 'किसी सप्ताह या महीने के टॉप 3 में', den: 'Finished in a week or month top 3', test: s => s.won },
];

