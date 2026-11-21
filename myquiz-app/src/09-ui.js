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

