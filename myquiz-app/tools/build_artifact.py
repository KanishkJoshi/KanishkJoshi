"""Build an Artifact page from the repo's standalone index.html.

Keeps the marked head part (title, viewport-fit meta, fonts, styles) and the marked body,
drops PWA-only tags (manifest, icons, theme-color), and inlines app.js so the page has no
dependency on serving scripts from the artifact origin. Data JSON is published alongside.

Usage: build_artifact.py <src_dir> <out_file> [demo]
  demo  -> tester build: sets MYQUIZ_CONFIG.demo and titles the page "MY QUIZ Demo".
"""
import json
import re
import sys

src_dir, out_file = sys.argv[1], sys.argv[2]
demo = len(sys.argv) > 3 and sys.argv[3] == 'demo'
html = open(f'{src_dir}/index.html', encoding='utf-8').read()
js = open(f'{src_dir}/app.js', encoding='utf-8').read()
assert '</script' not in js.lower() and '<!--' not in js, 'app.js must be safe to inline'

head = re.search(r'<!--ARTIFACT-HEAD-START-->(.*?)<!--ARTIFACT-HEAD-END-->', html, re.S).group(1).strip()
body = re.search(r'<!--ARTIFACT-BODY-START-->(.*?)<!--ARTIFACT-BODY-END-->', html, re.S).group(1).strip()
assert '<script src="app.js"></script>' in body
cfg = ''
if demo:
    head = head.replace('<title>MY QUIZ</title>', '<title>MY QUIZ Demo</title>', 1)
    cfg = '<script>window.MYQUIZ_CONFIG = ' + json.dumps({'demo': True, 'build': 'Demo v3.0 · 22 Nov 2026'}, ensure_ascii=False) + ';</script>\n'
body = body.replace('<script src="app.js"></script>', cfg + '<script>\n' + js + '\n</script>')
page = head + '\n' + body + '\n'
open(out_file, 'w', encoding='utf-8').write(page)
print('built', out_file, '| bytes:', len(page.encode('utf-8')), '| demo:', demo, '| title:', re.search(r'<title>(.*?)</title>', page).group(1))
