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
// Self-hosted (Firestore) content sync: start from this phone's cached copy (free), then listen only to items
// changed since then. Every admin write stamps `ts` with the server's time and a removal leaves a tombstone
// (`gone: true`), so the incremental listener sees everything and reads stay flat as content grows.
const tsMs = v => (typeof v === 'number' ? v : v && typeof v.toMillis === 'function' ? v.toMillis() : 0);
const fsTs = ms => (window.firebase && firebase.firestore && firebase.firestore.Timestamp ? firebase.firestore.Timestamp.fromMillis(ms) : ms);
const serverTs = () => firebase.firestore.FieldValue.serverTimestamp();
async function syncPubCloud(k, check, timer) {
  const col = P.cdb.collection(`pub/${k}/items`), items = new Map();
  const take = docs => { for (const d of docs) items.set(d.id, { ...d.data(), id: d.id }); C.pub[k] = [...items.values()].filter(check); };
  let cached = [];
  try { cached = (await col.get({ source: 'cache' })).docs; } catch { /* no offline copy yet */ }
  if (cached.length) take(cached);
  else take((await col.get()).docs);
  bump();
  const mark = Math.max(0, ...[...items.values()].map(x => tsMs(x.ts))) - 10 * 60e3;   // 10 minutes of overlap
  col.where('ts', '>', fsTs(Math.max(0, mark))).onSnapshot(snap => {
    take(snap.docs);
    if (!snap.metadata.fromCache) { clearTimeout(timer); C.liveState = 'ok'; }
    bump();
  }, () => { clearTimeout(timer); C.liveState = 'error'; bump(); });
}
function subscribeLive() {
  if (!P.cdb) { C.liveState = 'off'; return; }
  if (P.cloud) {
    C.liveState = 'loading';
    const timer = setTimeout(() => { if (C.liveState === 'loading') { C.liveState = 'slow'; bump(); } }, 10000);
    const check = { q: validQ, news: validNews, days: validDay };
    for (const k of Object.keys(check)) syncPubCloud(k, check[k], timer).catch(() => { clearTimeout(timer); C.liveState = 'error'; bump(); });
    return;
  }
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

