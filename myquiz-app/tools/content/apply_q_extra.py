#!/usr/bin/env python3
"""Merge chapter tags and rich explanations (q_extra_*.py) into data/questions.json.
Run from myquiz-app/: python3 tools/content/apply_q_extra.py"""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here))
from q_extra_1 import X as X1
from q_extra_2 import X as X2
from q_extra_3 import X as X3
X = {**X1, **X2, **X3}
# topic (Hindi `t`) -> chapter id; chapter names live in src/01-constants.js (CHAPTERS)
CH = {
  'history': {'प्राचीन भारत': 'h-anc', 'मध्यकालीन भारत': 'h-med', 'आधुनिक भारत': 'h-mod', 'स्वतंत्रता आंदोलन': 'h-free'},
  'geography': {'नदियाँ': 'g-water', 'झीलें': 'g-water', 'पर्वत': 'g-relief', 'दर्रे': 'g-relief', 'सीमाएँ': 'g-relief',
                'भारत का भूगोल': 'g-india', 'जलवायु': 'g-india', 'मिट्टी': 'g-india', 'विश्व भूगोल': 'g-world'},
  'polity': {'संविधान निर्माण': 'p-making', 'संविधान के स्रोत': 'p-making', 'संविधान की संरचना': 'p-making', 'मौलिक अधिकार': 'p-rights',
             'राष्ट्रपति': 'p-union', 'संसद': 'p-union', 'आपातकालीन प्रावधान': 'p-union', 'संविधान संशोधन': 'p-amend', 'स्थानीय शासन': 'p-amend'},
  'science': {'जीव विज्ञान': 'sc-bio', 'भौतिकी': 'sc-phy', 'रसायन विज्ञान': 'sc-chem'},
  'sports': {'खेल प्रतियोगिताएँ': 'sp-events', 'ओलंपिक': 'sp-events', 'एशियाई खेल': 'sp-events', 'खेल नियम': 'sp-rules', 'खेल स्थल': 'sp-rules',
             'खेल पुरस्कार': 'sp-awards', 'खेल दिवस': 'sp-awards'},
  'misc': {'अर्थव्यवस्था': 'm-econ', 'कृषि': 'm-econ', 'कंप्यूटर': 'm-tech', 'मीडिया': 'm-media', 'राष्ट्रीय प्रतीक': 'm-symbols',
           'पुरस्कार': 'm-symbols', 'पुस्तकें और लेखक': 'm-symbols', 'अंतरराष्ट्रीय संगठन': 'm-symbols'},
  'ca': {'विज्ञान एवं तकनीक': 'ca-sci', 'खेल': 'ca-sports', 'कला एवं संस्कृति': 'ca-culture', 'पर्यावरण': 'ca-env', 'अंतरराष्ट्रीय': 'ca-intl', 'अर्थव्यवस्था': 'ca-econ'},
}
p = pathlib.Path('data/questions.json')
qs = json.loads(p.read_text(encoding='utf-8'))
missing, problems = [], []
for q in qs:
    ch = CH.get(q['s'], {}).get(q.get('t', ''))
    if not ch: problems.append(f"{q['id']}: no chapter for topic {q.get('t')!r}")
    else: q['ch'] = ch
    x = X.get(q['id'])
    if not x: missing.append(q['id']); continue
    for k in ('why', 'why_en'):
        w = x[k]
        if len(w) != 4 or w[q['a']] is not None or any(not s for i, s in enumerate(w) if i != q['a']):
            problems.append(f"{q['id']}: bad {k} (len {len(w)}, correct index {q['a']})")
    q['why'] = [s or '' for s in x['why']]
    q['ctx'] = x['ctx']
    q['en']['why'] = [s or '' for s in x['why_en']]
    q['en']['ctx'] = x['ctx_en']
    if 'ref' in x:
        q['ref'], q['en']['ref'] = x['ref']
p.write_text('[\n' + ',\n'.join(json.dumps(q, ensure_ascii=False, separators=(',', ':')) for q in qs) + '\n]\n', encoding='utf-8')
print(f'{len(qs)} questions · enriched {len(qs) - len(missing)} · missing {missing} · problems {problems}')
