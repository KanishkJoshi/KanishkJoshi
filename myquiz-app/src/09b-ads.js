// ───────────────────────────── AdSense (self-hosted app only) ─────────────────────────────
// Off until config.js has `adsense: { client: 'ca-pub-…', slot: '…' }`. One responsive ad unit sits BELOW a
// page's content (outside #app, so re-renders never reload it), on reading and dashboard screens only —
// never on quiz, exam, flashcard, sign-in, onboarding, profile or admin screens. A new ad is requested only
// when the learner moves to another screen (a new page view), never on a timer.
const AD_ROUTES = new Set(['home', 'learn', 'subject', 'chapter', 'ca', 'news', 'today', 'compete', 'leaders', 'progress', 'result', 'exam-result', 'bookmarks']);
const Ads = {
  cfg: CFG.adsense && /^ca-pub-\d{6,}$/.test(String(CFG.adsense.client || '')) && /^\d{4,}$/.test(String(CFG.adsense.slot || '')) ? CFG.adsense : null,
  root: null, loaded: false,
  on() { return !!this.cfg && P.mode === 'standalone' && !DEMO; },
  load() {
    if (this.loaded) return;
    this.loaded = true;
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(this.cfg.client);
    document.head.appendChild(s);
  },
  // Called by render(): show, replace or remove the unit for the current screen.
  onRoute(routeChanged) {
    if (!this.on()) return;
    const app = $('#app');
    const allowed = AD_ROUTES.has(route) && !authGate();
    if (!this.root) { this.root = document.createElement('aside'); this.root.id = 'ad-root'; this.root.hidden = true; this.root.setAttribute('aria-label', L('विज्ञापन', 'Advertisement')); app.after(this.root); }
    if (!allowed) { this.root.hidden = true; this.root.textContent = ''; app.classList.remove('has-ad'); return; }
    app.classList.add('has-ad');
    this.root.hidden = false;
    if (!routeChanged && this.root.querySelector('ins')) return;   // same screen re-rendered: keep the ad as it is
    this.load();
    this.root.innerHTML = `<p class="ad-label">${L('विज्ञापन', 'Advertisement')}</p><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(this.cfg.client)}" data-ad-slot="${esc(this.cfg.slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* an ad blocker: the page works without ads */ }
  },
};
