// ───────────────────────────── UI helpers ─────────────────────────────
function appbar(title, { back = '', right = '' } = {}) {
  return `<header class="appbar"><div class="appbar-in gutter">${back ? `<button class="iconbtn" data-act="back" data-to="${back}" aria-label="${L('वापस जाएँ', 'Go back')}">${ic('arrow-left')}</button>` : ''}<h1>${title}</h1>${right}</div></header>`;
}
function adminBar(title, back = 'admin') {
  return appbar(title, { back, right: `<a class="iconbtn" href="#home" aria-label="${L('ऐप पर लौटें', 'Back to the app')}" title="${L('ऐप पर लौटें', 'Back to the app')}">${ic('home')}</a>` });
}
// Four sections: Home · Learn · Compete · Progress. Profile, settings and notifications live in the top bar.
const NAV = [['home', 'होम', 'Home', 'home'], ['learn', 'सीखें', 'Learn', 'book-open'], ['compete', 'मुक़ाबला', 'Compete', 'trophy'], ['progress', 'प्रगति', 'Progress', 'chart']];
const NAV_OF = { quiz: 'learn', subject: 'learn', chapter: 'learn', ca: 'learn', news: 'learn', today: 'learn', revise: 'learn', cards: 'learn', bookmarks: 'learn', 'ca-notes': 'learn', mock: 'compete', leaders: 'compete', builder: 'compete', challenge: 'compete', profile: 'progress' };
const bottomNav = active => { active = NAV_OF[active] || active; return `<nav class="bnav" aria-label="${L('मुख्य मेनू', 'Main menu')}"><div class="bnav-in">${NAV.map(([r, hi, en, i]) => `<a href="#${r}"${r === active ? ' aria-current="page"' : ''}>${ic(i)}<span>${L(hi, en)}</span></a>`).join('')}</div></nav>`; };
// Top bar for the four main sections: title, notifications and the profile/settings avatar.
function topbar(title) {
  const n = notifications().length, name = U.s.name.trim();
  return `<header class="appbar topbar"><div class="appbar-in gutter"><h1>${title}</h1>
    <button class="iconbtn" data-act="notifs" aria-label="${L('सूचनाएँ', 'Notifications')}${n ? ` (${n})` : ''}">${ic('bell')}${n ? `<span class="dot">${n}</span>` : ''}</button>
    <a class="iconbtn" href="#profile" aria-label="${L('प्रोफ़ाइल और सेटिंग्स', 'Profile and settings')}"><span class="avatar">${name ? esc(initial(name)) : ic('user')}</span></a>
  </div></header>`;
}
// A short burst of confetti for a strong result (skipped when the learner prefers less motion).
function celebrate() {
  if (reducedMotion()) return;
  const cols = ['#FFC727', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6', '#F97316'];
  const box = document.createElement('div');
  box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = Array.from({ length: 44 }, (_, i) => `<i style="--x:${(i * 37 + 7) % 100}%;--c:${cols[i % cols.length]};--r:${(i * 53) % 360}deg;--dx:${((i * 29) % 120) - 60}px;--d:${((i * 7) % 10) / 20}s;--t:${(2.2 + ((i * 13) % 10) / 10).toFixed(1)}s"></i>`).join('');
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4300);
}
// Gold trophy for the result screen.
const TROPHY = '<svg class="trophy" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="trg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs><path d="M18 12H10a2 2 0 0 0-2 2c0 7 5 12 12 12M46 12h8a2 2 0 0 1 2 2c0 7-5 12-12 12" fill="none" stroke="#F5B400" stroke-width="4" stroke-linecap="round"/><path d="M17 7h30v15a15 15 0 0 1-30 0z" fill="url(#trg)"/><path d="m32 12 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="#fff" opacity=".92"/><rect x="28" y="36" width="8" height="9" fill="#E39400"/><rect x="19" y="45" width="26" height="9" rx="3" fill="url(#trg)"/></svg>';
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
  const off = navigator.onLine === false;
  return `<div class="note note-warn">${ic(off ? 'wifi-off' : 'alert')}<div class="retry-row"><span>${off ? L('<b>इंटरनेट नहीं है।</b> सामग्री लोड नहीं हुई — कनेक्शन आने पर फिर कोशिश करें।', '<b>No internet.</b> Content did not load — try again when you are connected.') : L('<b>सामग्री लोड नहीं हुई।</b> नेटवर्क जाँचें और फिर कोशिश करें। (फ़ाइल सीधे खोलने पर ब्राउज़र डेटा नहीं पढ़ पाता — ऐप को वेब सर्वर से खोलें।)', '<b>Content did not load.</b> Check the network and try again. (Browsers cannot read the data when the page is opened directly from disk — open it from a web server.)')}</span><button class="btn btn-sm btn-outline" data-act="retry-load">${ic('rotate')} ${L('फिर कोशिश करें', 'Try again')}</button></div></div>`;
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

