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

