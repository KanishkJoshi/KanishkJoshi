#!/usr/bin/env python3
"""Update the tester checklist (src/13-tester.js) for the v3 navigation and add v3 test cases."""
import pathlib, json
p = pathlib.Path('src/13-tester.js')
lines = p.read_text(encoding='utf-8').split('\n')
def case(g, id, to, t, tEn, do, doEn, exp, expEn):
    j = lambda s: json.dumps(s, ensure_ascii=False)
    return f"  {{ g: {g}, id: '{id}', to: '{to}', t: {j(t)}, tEn: {j(tEn)}, do: {j(do)}, doEn: {j(doEn)}, exp: {j(exp)}, expEn: {j(expEn)} }},"
NEW = {
 'T01': case('G.start', 'T01', 'welcome', 'पहली बार: भाषा, परीक्षा और लक्ष्य', 'First run: language, exam and goal',
   'ऐप पहली बार खोलें (या टेस्टर केंद्र से "ऐप डेटा रीसेट करें")। भाषा और नाम चुनें, लक्ष्य परीक्षा और रोज़ का लक्ष्य चुनें, फिर 5 प्रश्नों की स्तर जाँच दें या "अभी छोड़ें" दबाएँ।',
   'Open the app for the first time (or use "Reset app data" in the tester hub). Choose a language and name, a target exam and a daily goal, then take the 5-question level check or tap "Skip for now".',
   'हर क़दम साफ़ समझ आए; स्तर जाँच के बाद "आपका स्तर" दिखे; होम पर नाम, परीक्षा और रोज़ का लक्ष्य दिखे।',
   'Every step is clear; after the level check "Your level" appears; Home shows your name, exam and daily goal.'),
 'T04': case('G.quiz', 'T04', 'learn', 'विषय → अध्याय → अभ्यास', 'Subject → chapter → practice',
   'नीचे "सीखें" → कोई विषय → कोई अध्याय खोलें; "अभ्यास" से 10 प्रश्न हल करें; बीच में "पिछला प्रश्न" भी दबाएँ।',
   'Open "Learn" at the bottom → a subject → a chapter; practise 10 questions; also tap "Previous" along the way.',
   'उसी अध्याय के प्रश्न आएँ; दिया गया उत्तर बदला न जा सके; अध्याय और विषय में पूरा % और महारत अपडेट हो।',
   'Questions are from that chapter; a given answer cannot be changed; the chapter and subject completion % and mastery update.'),
 'T05': case('G.quiz', 'T05', 'subject/history', 'समयबद्ध अभ्यास', 'Timed practice',
   'किसी विषय/अध्याय में "समयबद्ध · 30 से." चुनें, अभ्यास शुरू करें और एक प्रश्न पर 30 सेकंड पूरे होने दें।',
   'On a subject or chapter page choose "Timed · 30s", start practice and let 30 seconds run out on one question.',
   'टाइमर घटता दिखे और आख़िरी 10 सेकंड में लाल हो; समय ख़त्म होने पर "समय समाप्त!" और सही उत्तर दिखे।',
   'The timer counts down and turns red in the last 10 seconds; when time runs out "Time is up!" and the right answer show.'),
 'T06': case('G.quiz', 'T06', 'revise', 'बुकमार्क', 'Saved questions',
   'अभ्यास में 2 प्रश्न "बुकमार्क" करें, फिर "सीखें" → "दोहराव" → "सहेजे गए" खोलें और "इन प्रश्नों का अभ्यास करें" दबाएँ।',
   'Save 2 questions during practice, then open "Learn" → "Revision" → "Saved" and tap "Practise these questions".',
   'दोनों प्रश्न सूची में दिखें, "हटाएँ" काम करे और अभ्यास में वही प्रश्न आएँ।',
   'Both questions are listed, "Remove" works and the practice uses those questions.'),
 'T08': case('G.quiz', 'T08', 'learn', 'प्रश्न खोज', 'Question search',
   '"सीखें" में ऊपर खोज बॉक्स दबाकर "संविधान" या "1857" लिखें और कोई परिणाम खोलें।',
   'In "Learn" tap the search box at the top, type "constitution" or "1857" and open a result.',
   'मिलते-जुलते प्रश्न दिखें और चुना गया प्रश्न खुल जाए।', 'Matching questions appear and the chosen one opens.'),
 'T10': case('G.ca', 'T10', 'ca', 'करेंट अफेयर्स लेख', 'Current affairs article',
   '"करेंट अफेयर्स" खोलें; आज/सप्ताह/महीना/संग्रह टैब और खोज आज़माएँ; एक ख़बर खोलें, "सुनें", "सहेजें", "PDF" और "इस ख़बर से प्रश्न" आज़माएँ।',
   'Open "Current affairs"; try the Today/Week/Month/Archive tabs and search; open a story and try "Listen", "Save", "PDF" and its practice questions.',
   'लेख में सारांश, विस्तार, क्यों महत्वपूर्ण, पृष्ठभूमि, परीक्षा तथ्य, योजनाएँ, संस्थाएँ और स्रोत लिंक हों; सुनने पर सही भाषा में आवाज़ आए; PDF पेज प्रिंट हो सके।',
   'The article has a summary, details, why it matters, background, exam facts, schemes, organisations and a source link; Listen reads it in the right language; the PDF page can be printed.'),
 'T24': case('G.v2', 'T24', 'profile', 'भाषा बदलें (हिंदी ⇄ English)', 'Switch language (Hindi ⇄ English)',
   'ऊपर दाएँ अपनी प्रोफ़ाइल (गोल अक्षर) → सेटिंग्स में "English" चुनें; होम, सीखें, मुक़ाबला और प्रगति देखें; फिर किसी प्रश्न पर ऊपर "हिं" से हिंदी करें; ऐप बंद करके दोबारा खोलें।',
   'Tap your profile (the round letter, top right) → Settings → "English"; look at Home, Learn, Compete and Progress; then on a question switch back with "हिं" at the top; close and reopen the app.',
   'पूरा ऐप चुनी भाषा में दिखे; बीच क्विज में भाषा बदलने पर उत्तर और पॉइंट्स बने रहें; दोबारा खोलने पर वही भाषा रहे।',
   'The whole app appears in the chosen language; switching mid-quiz keeps answers and points; the language is remembered after reopening.'),
 'T26': case('G.v2', 'T26', 'leaders', 'लीडरबोर्ड', 'Leaderboard',
   '"मुक़ाबला" → "लीडरबोर्ड" खोलें; "इस सप्ताह", "पिछला सप्ताह", "इस महीने" और "विजेता" देखें; किसी नाम पर टैप करें; प्रोफ़ाइल में "दिखने वाला नाम" बदलें और "लीडरबोर्ड पर मेरा नाम दिखाएँ" बंद/चालू करें।',
   'Open "Compete" → "Leaderboard"; look at "This week", "Last week", "This month" and "Winners"; tap a name; in Profile change the display name and turn "Show my name on the leaderboard" off and on.',
   'आपकी पंक्ति हाइलाइट हो; किसी नाम पर टैप करने से कोई प्रोफ़ाइल न खुले; नया नाम लीडरबोर्ड पर दिखे; बंद करने पर आप सूची से हट जाएँ।',
   'Your row is highlighted; tapping a name opens no profile; the new name shows on the board; turning it off removes you from the list.'),
}
V3 = [
 case('G.v3', 'T28', 'home', 'होम डैशबोर्ड', 'Home dashboard',
   'होम पर "आपका अगला क़दम" कार्ड, "यह सप्ताह", "पढ़ाई जारी रखें", "आपके लिए सुझाव" और "कमज़ोर विषय" देखें; अगला क़दम वाला बटन दबाएँ।',
   'On Home look at "Your next step", "This week", "Continue learning", "Recommended for you" and "Weak topics"; tap the next-step button.',
   'सबसे ज़रूरी काम सबसे ऊपर दिखे (जैसे दैनिक चुनौती, दोहराव या कमज़ोर विषय) और बटन सही जगह ले जाए; कोई बेकार या ख़ाली बटन न हो।',
   'The most useful action is at the top (daily challenge, revision or a weak topic) and the button goes to the right place; no dead or empty buttons.'),
 case('G.v3', 'T29', 'chapter/h-free', 'कठिनाई और परीक्षा फ़िल्टर', 'Difficulty and exam filters',
   '"सीखें" में ऊपर परीक्षा चुनें (जैसे बैंकिंग) और देखें कि विषय बदलते हैं; किसी अध्याय में "शुरुआती/मध्यम/उन्नत" चुनें।',
   'In "Learn" pick an exam at the top (for example Banking) and see the subjects change; on a chapter choose Beginner/Intermediate/Advanced.',
   'परीक्षा बदलने पर सूची बदले; कठिनाई चुनने पर प्रश्न बैंक और अभ्यास उसी स्तर के हों।',
   'The list changes with the exam; the question bank and practice follow the chosen level.'),
 case('G.v3', 'T30', 'learn', 'विस्तृत व्याख्या', 'Detailed explanation',
   'किसी प्रश्न का उत्तर देकर व्याख्या पढ़ें; "जुड़े प्रश्न" दबाएँ।',
   'Answer a question and read the explanation; tap "Related practice".',
   'सही उत्तर, बाकी विकल्प क्यों गलत हैं, पृष्ठभूमि, परीक्षा में उपयोगिता और स्रोत दिखें; तथ्य सही हों; जुड़े प्रश्न उसी विषय के हों।',
   'The correct answer, why each other option is wrong, background, exam relevance and source appear; facts are right; related questions are on the same topic.'),
 case('G.v3', 'T31', 'revise', 'दोहराव और फ़्लैशकार्ड', 'Revision and flashcards',
   '"सीखें" → "दोहराव" खोलें; "फ़्लैशकार्ड" में "उत्तर देखें" और "याद था/भूल गया" दबाएँ; "गलतियाँ" से अभ्यास करें।',
   'Open "Learn" → "Revision"; in Flashcards tap "Show answer" and "Knew it / Forgot"; practise from "Mistakes".',
   'कार्ड एक-एक करके आएँ और अंत में सारांश दिखे; गलत हुए प्रश्न "गलतियाँ" में मिलें।',
   'Cards come one by one with a summary at the end; wrongly answered questions appear under "Mistakes".'),
 case('G.v3', 'T32', 'builder', 'अपना टेस्ट (परीक्षा मोड)', 'Build your own test (exam mode)',
   '"मुक़ाबला" → "अपना टेस्ट बनाएँ": विषय, कठिनाई, 5 प्रश्न, समय और "+2 / −0.5" चुनकर टेस्ट दें; कुछ प्रश्न छोड़ें और सबमिट करें।',
   '"Compete" → "Build your own test": choose a subject, level, 5 questions, a time and "+2 / −0.5", take the test, skip some and submit.',
   'टेस्ट के दौरान उत्तर न दिखें; परिणाम में अंक योजना के अनुसार स्कोर, विषयवार प्रदर्शन, समय विश्लेषण और समाधान हों।',
   'No answers are shown during the test; the result has the score with that marking, subject-wise performance, time analysis and solutions.'),
 case('G.v3', 'T33', 'compete', 'साप्ताहिक और दोस्त की चुनौती', 'Weekly and friend challenges',
   '"मुक़ाबला" में साप्ताहिक चुनौती दें; फिर "दोस्त को चुनौती दें" → टेस्ट पूरा करके "चुनौती भेजें"; भेजा गया संदेश किसी दूसरे फ़ोन पर "चुनौती कोड डालें" में पेस्ट करें।',
   'In "Compete" take the weekly challenge; then "Challenge a friend" → finish the test → "Send the challenge"; paste the message on another phone under "Enter a challenge code".',
   'साप्ताहिक का पहला स्कोर दर्ज हो और दोबारा देने पर "अभ्यास" लिखा आए; दोस्त को वही प्रश्न मिलें और अंत में दोनों स्कोर की तुलना दिखे।',
   'The first weekly score is recorded and a retake says "practice"; the friend gets the same questions and both scores are compared at the end.'),
 case('G.v3', 'T34', 'today', 'आज का दिन — दैनिक सत्र', 'Today in History — daily session',
   '"आज का दिन" में कहानी और तथ्य पढ़ें, "5 प्रश्न" दें, दिवस "सहेजें" और "शेयर" करें; तीरों और कैलेंडर से दूसरी तारीख़ें देखें।',
   'In "Today in History" read the story and facts, take "5 questions", "Save" and "Share" the day; use the arrows and calendar to explore other dates.',
   'सत्र पूरा होने पर "आज का सत्र पूरा" दिखे; सहेजा दिवस बुकमार्क के "दिवस" टैब में मिले; समय-रेखा और जयंतियाँ सही तारीख़ों पर हों।',
   'After the session it says the session is done; the saved day appears under the "Days" tab in Saved; the timeline and anniversaries match their dates.'),
 case('G.v3', 'T35', 'progress', 'प्रगति और उपलब्धियाँ', 'Progress and achievements',
   'नीचे "प्रगति" खोलें: स्तर, सटीकता, प्रति प्रश्न समय, सप्ताह की तुलना, विषयवार महारत, कमज़ोर विषय, बैज और हाल के उत्तर देखें; "उपलब्धि शेयर करें" आज़माएँ।',
   'Open "Progress" at the bottom: check the level, accuracy, time per question, week comparison, subject mastery, weak topics, badges and recent answers; try "Share achievements".',
   'आँकड़े आपके अभ्यास से मेल खाएँ (जैसे गलत उत्तर वाले विषय कमज़ोर विषयों में दिखें); बैज की शर्तें साफ़ लिखी हों।',
   'The numbers match your practice (for example, topics you got wrong show up as weak); badge conditions are clearly written.'),
 case('G.v3', 'T36', 'admin-io', 'एडमिन: जाँच, आयात/निर्यात, अनुवाद, इतिहास', 'Admin: checks, import/export, translations, history',
   'एडमिन → "आयात / निर्यात" से CSV निर्यात करें और एक प्रश्न आयात करें; "सामग्री की जाँच" में "स्वचालित जाँच" देखें; "अनुवाद प्रबंधन" और "विश्लेषण" खोलें; प्रश्न बैंक में किसी प्रश्न का "इतिहास" देखें।',
   'Admin → "Import / export": export a CSV and import one question; in "Review content" look at "Automated checks"; open "Translations" and "Analytics"; in the question bank open a question\'s "History".',
   'आयातित प्रश्न समीक्षा में आए और कमियाँ (जैसे अंग्रेज़ी नहीं) "स्वचालित जाँच" में दिखें; गंभीर गलती होने पर "स्वीकृत करें" बंद रहे; निर्यात फ़ाइल डाउनलोड हो।',
   'The imported question arrives in review with gaps (for example no English) flagged in "Automated checks"; "Approve" stays disabled on a blocking error; the export file downloads.'),
 case('G.v3', 'T37', 'home', 'ऑफ़लाइन और गलती की स्थिति', 'Offline and error states',
   'ऐप खुला रहते फ़ोन का इंटरनेट बंद करें, कुछ प्रश्न हल करें और स्क्रीनें बदलें; फिर इंटरनेट चालू करें।',
   'With the app open, turn off mobile data/Wi-Fi, answer a few questions and move between screens; then turn the internet back on.',
   'ऊपर "आप ऑफ़लाइन हैं" पट्टी दिखे पर अभ्यास चलता रहे; इंटरनेट लौटने पर "आप फिर ऑनलाइन हैं" दिखे और कुछ भी न खोए।',
   'An "You are offline" bar appears but practice keeps working; when the internet returns "You are back online" shows and nothing is lost.'),
 case('G.v3', 'T38', 'learn', 'AI ट्यूटर (यदि उपलब्ध)', 'AI tutor (if available)',
   'किसी प्रश्न की व्याख्या में "AI ट्यूटर से पूछें" दबाएँ, एक त्वरित प्रश्न चुनें और अपना प्रश्न भी लिखें। (AI उपलब्ध न हो तो छोड़ें।)',
   'In a question\'s explanation tap "Ask the AI tutor", pick a quick prompt and type your own question. (Skip if AI is not available.)',
   'उत्तर चुनी भाषा में, सरल और उसी प्रश्न से जुड़ा हो; गलत तथ्य न गढ़े; "AI के उत्तर गलत भी हो सकते हैं" सूचना दिखे।',
   'Answers are in the chosen language, simple and about that question; no invented facts; the "AI answers can be wrong" notice is shown.'),
]
out = []
for l in lines:
    hit = next((k for k in NEW if f"id: '{k}'," in l and l.lstrip().startswith('{ g:')), None)
    out.append(NEW[hit] if hit else l)
s = '\n'.join(out)
s = s.replace("gen: ['सामान्य', 'General'], v2: ['नया: भाषा, पॉइंट्स और लीडरबोर्ड', 'New: language, points and leaderboard'],",
              "gen: ['सामान्य', 'General'], v2: ['भाषा, पॉइंट्स और लीडरबोर्ड', 'Language, points and leaderboard'], v3: ['नया (v3): सीखने का पूरा अनुभव', 'New (v3): the full learning experience'],")
assert "v3: ['नया (v3)" in s
end = s.index('\n];', s.index('const TESTS = ['))
s = s[:end] + '\n' + '\n'.join(V3) + s[end:]
s = s.replace("'admin-rewards': ['एडमिन · पुरस्कार', 'Admin · Rewards'],", "'admin-rewards': ['एडमिन · पुरस्कार', 'Admin · Rewards'], welcome: ['पहली बार', 'First run'], learn: ['सीखें', 'Learn'], subject: ['विषय', 'Subject'], chapter: ['अध्याय', 'Chapter'], revise: ['दोहराव', 'Revision'], cards: ['फ़्लैशकार्ड', 'Flashcards'], compete: ['मुक़ाबला', 'Compete'], builder: ['टेस्ट बिल्डर', 'Test builder'], challenge: ['दोस्त की चुनौती', 'Friend challenge'], progress: ['प्रगति', 'Progress'], news: ['ख़बर', 'Article'], notes: ['नोट्स', 'Notes'], 'ca-notes': ['ख़बरों के नोट्स', 'News notes'], 'admin-translate': ['एडमिन · अनुवाद', 'Admin · Translations'], 'admin-analytics': ['एडमिन · विश्लेषण', 'Admin · Analytics'], 'admin-io': ['एडमिन · आयात/निर्यात', 'Admin · Import/export'],")
p.write_text(s, encoding='utf-8')
print('tester cases:', s.count("  { g: "))
