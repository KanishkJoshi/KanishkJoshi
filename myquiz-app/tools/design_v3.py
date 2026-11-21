#!/usr/bin/env python3
"""One-off migration of index.html styles to design system v3 (tokens, radii, weights, no decorative gradients).
Kept for reference; re-running is a no-op once applied."""
import re, pathlib
p = pathlib.Path('index.html')
s = p.read_text(encoding='utf-8')
if '/* design-system-v3 */' in s:
    print('already applied'); raise SystemExit
a, b = s.index('<style>') + 7, s.index('</style>')
css = s[a:b]
root_start = css.index(':root{')
root_end = css.index('*,*::before,*::after{box-sizing:border-box}')
TOKENS = r'''/* design-system-v3 */
/* Tokens: deep-navy primary, sky-blue secondary, green/amber/red for status, cool-grey canvas,
   charcoal text. 8-pt spacing (4 for fine steps), three radii, one type family for Hindi and English. */
:root{
  --navy:#0B2A5B; --navy-2:#123B7A; --sky:#0284C7; --sky-soft:#E0F2FE; --sky-ink:#075985;
  --gold:#F59E0B; --gold-ink:#3B2200;
  --outer:#E6EAF1; --bg:#F4F6FA; --surface:#FFFFFF; --surface-2:#F7F9FC;
  --ink:#1F2937; --muted:#5B6473; --line:#E2E7EF; --grey:#EDF0F5;
  --soft:#E8F1FD; --soft-ink:#0B4A9E; --brand:#1565C0; --focus:#2563EB;
  --ok:#15803D; --ok-solid:#16A34A; --ok-soft:#E7F6EC; --ok-line:#3DBE6C;
  --bad:#B91C1C; --bad-solid:#DC2626; --bad-soft:#FDECEC; --bad-line:#EF6B6B;
  --warn:#92400E; --warn-soft:#FEF3C7; --violet:#6D28D9;
  --sun:#FFF8E6; --sun-line:#F6E2A8; --peach:#FDEBDD;
  --cta:#0B2A5B; --cta-ink:#FFFFFF; --ring:#0284C7; --ring-track:rgba(31,41,55,.1);
  --p-blue:#E8F1FD; --p-green:#E7F6EC; --p-violet:#F1EAFE; --p-amber:#FEF3C7;
  --t-blue-1:#1565C0; --t-blue-2:#1565C0; --t-green-1:#15803D; --t-green-2:#15803D;
  --t-orange-1:#C2410C; --t-orange-2:#C2410C; --t-purple-1:#6D28D9; --t-purple-2:#6D28D9;
  --shadow:0 1px 2px rgba(16,24,40,.05),0 1px 6px rgba(16,24,40,.06);
  --font-display:"Noto Sans","Noto Sans Devanagari","Nirmala UI",system-ui,-apple-system,"Segoe UI",sans-serif;
  --font-body:"Noto Sans","Noto Sans Devanagari","Nirmala UI",system-ui,-apple-system,"Segoe UI",sans-serif;
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
  --r-sm:8px; --r-md:12px; --r-lg:16px;
  --t-xs:.75rem; --t-sm:.875rem; --t-md:1rem; --t-lg:1.125rem; --t-xl:1.25rem; --t-2xl:1.5rem;
  --tap:48px;
  --scale:1;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --navy:#0E2147; --navy-2:#14306A; --sky:#38BDF8; --sky-soft:#0C2A3F; --sky-ink:#BAE6FD; --gold:#FBBF24; --gold-ink:#2A1A00;
  --outer:#05080F; --bg:#0B1220; --surface:#121A2B; --surface-2:#172238;
  --ink:#E6EAF2; --muted:#9AA6BD; --line:#26324A; --grey:#1E293B; --soft:#12284A; --soft-ink:#9CC3FF; --brand:#8AB8FF; --focus:#60A5FA;
  --ok:#4ADE80; --ok-solid:#16A34A; --ok-soft:#0F2E1D; --ok-line:#2F9E5B; --bad:#F87171; --bad-solid:#DC2626; --bad-soft:#3A1518; --bad-line:#B94848;
  --warn:#FCD34D; --warn-soft:#33270B; --violet:#A78BFA; --sun:#2A240F; --sun-line:#4A3F17; --peach:#3A2519;
  --cta:#2563EB; --cta-ink:#FFFFFF; --ring:#38BDF8; --ring-track:rgba(255,255,255,.12);
  --p-blue:#13264A; --p-green:#102C1D; --p-violet:#221A44; --p-amber:#33270B;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 2px 10px rgba(0,0,0,.25); color-scheme:dark}}
:root[data-theme="dark"]{
  --navy:#0E2147; --navy-2:#14306A; --sky:#38BDF8; --sky-soft:#0C2A3F; --sky-ink:#BAE6FD; --gold:#FBBF24; --gold-ink:#2A1A00;
  --outer:#05080F; --bg:#0B1220; --surface:#121A2B; --surface-2:#172238;
  --ink:#E6EAF2; --muted:#9AA6BD; --line:#26324A; --grey:#1E293B; --soft:#12284A; --soft-ink:#9CC3FF; --brand:#8AB8FF; --focus:#60A5FA;
  --ok:#4ADE80; --ok-solid:#16A34A; --ok-soft:#0F2E1D; --ok-line:#2F9E5B; --bad:#F87171; --bad-solid:#DC2626; --bad-soft:#3A1518; --bad-line:#B94848;
  --warn:#FCD34D; --warn-soft:#33270B; --violet:#A78BFA; --sun:#2A240F; --sun-line:#4A3F17; --peach:#3A2519;
  --cta:#2563EB; --cta-ink:#FFFFFF; --ring:#38BDF8; --ring-track:rgba(255,255,255,.12);
  --p-blue:#13264A; --p-green:#102C1D; --p-violet:#221A44; --p-amber:#33270B;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 2px 10px rgba(0,0,0,.25); color-scheme:dark}

'''
css = css[:root_start] + TOKENS + css[root_end:]
# Radii: three sizes.
def rad(m):
    v = int(m.group(1))
    if v >= 999: return m.group(0)
    return 'border-radius:' + ('var(--r-lg)' if v >= 16 else 'var(--r-md)' if v >= 10 else 'var(--r-sm)')
css = re.sub(r'border-radius:(\d+)px', rad, css)
# Less bold: 800 -> 700 everywhere.
css = css.replace('font-weight:800', 'font-weight:700')
# Decorative gradients -> solid surfaces (keep skeleton shimmer and the tester tape).
for old, new in [
    ('background:linear-gradient(165deg,var(--navy) 0%,var(--navy-2) 120%)', 'background:var(--navy)'),
    ('background:linear-gradient(135deg,var(--navy),var(--navy-2))', 'background:var(--navy)'),
    ('background:linear-gradient(165deg,var(--navy),var(--navy-2))', 'background:var(--navy)'),
    ('background:linear-gradient(90deg,#2F8CFA,#1559D4)', 'background:var(--sky)'),
    ('background:linear-gradient(180deg,var(--p-amber),var(--surface))', 'background:var(--p-amber)'),
]:
    css = css.replace(old, new)
css = re.sub(r'(\.thumb\{[^}]*?)background:linear-gradient\([^;]*\)', r'\1background:var(--c2)', css)
css = re.sub(r'(\.tile\{[^}]*?)background:linear-gradient\([^;]*\)', r'\1background:var(--c2)', css)
# Controls: 48 px targets.
css = css.replace('.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;', '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;')
css = css.replace('.btn-sm{min-height:38px;', '.btn-sm{min-height:44px;')
css = css.replace('.iconbtn{position:relative;display:inline-grid;place-items:center;width:44px;height:44px;', '.iconbtn{position:relative;display:inline-grid;place-items:center;width:48px;height:48px;')
css = css.replace('.btn-cta{background:var(--cta);color:#fff}', '.btn-cta{background:var(--cta);color:var(--cta-ink)}')
css = css.replace('body{margin:0;background:var(--outer);color:var(--ink);font-family:var(--font-body);font-size:1rem;line-height:1.55;',
                  'body{margin:0;background:var(--outer);color:var(--ink);font-family:var(--font-body);font-size:1rem;line-height:1.6;')
s = s[:a] + css + s[b:]
s = s.replace('family=Baloo+2:wght@600;700;800&family=Mukta:wght@400;500;600;700;800&display=swap',
              'family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap')
p.write_text(s, encoding='utf-8')
print('applied; css lines', css.count('\n'))
