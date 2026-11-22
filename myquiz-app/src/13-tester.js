// ───────────────────────────── tester build (demo) ─────────────────────────────
// Each case: g = group [hi, en]; t/do/exp in Hindi with tEn/doEn/expEn in English.
const G = {
  start: ['होम और शुरुआत', 'Home and getting started'], quiz: ['क्विज', 'Quiz'], ca: ['करेंट अफेयर्स और आज का दिन', 'Current affairs and Today in History'],
  mock: ['अभ्यास परीक्षा (मॉक टेस्ट)', 'Mock tests'], prof: ['प्रोफ़ाइल और सेटिंग्स', 'Profile and settings'], admin: ['एडमिन पैनल', 'Admin panel'],
  gen: ['सामान्य', 'General'], v2: ['भाषा, पॉइंट्स और लीडरबोर्ड', 'Language, points and leaderboard'], v3: ['नया (v3): सीखने का पूरा अनुभव', 'New (v3): the full learning experience'],
};
const TESTS = [
  { g: G.start, id: 'T01', to: 'welcome', t: "पहली बार: भाषा, परीक्षा और लक्ष्य", tEn: "First run: language, exam and goal", do: "ऐप पहली बार खोलें (या टेस्टर केंद्र से \"ऐप डेटा रीसेट करें\")। भाषा और नाम चुनें, लक्ष्य परीक्षा और रोज़ का लक्ष्य चुनें, फिर 5 प्रश्नों की स्तर जाँच दें या \"अभी छोड़ें\" दबाएँ।", doEn: "Open the app for the first time (or use \"Reset app data\" in the tester hub). Choose a language and name, a target exam and a daily goal, then take the 5-question level check or tap \"Skip for now\".", exp: "हर क़दम साफ़ समझ आए; स्तर जाँच के बाद \"आपका स्तर\" दिखे; होम पर नाम, परीक्षा और रोज़ का लक्ष्य दिखे।", expEn: "Every step is clear; after the level check \"Your level\" appears; Home shows your name, exam and daily goal." },
  { g: G.start, id: 'T02', to: 'home', t: 'दैनिक क्विज पूरा करें', tEn: 'Finish the daily quiz', do: 'होम पर “शुरू करें” दबाएँ और सभी 10 प्रश्न हल करें।', doEn: 'Tap “Start” on Home and answer all 10 questions.', exp: 'हर उत्तर पर सही/गलत रंग और व्याख्या दिखे; अंत में परिणाम आए; होम की रिंग में गिनती बढ़े और “दैनिक क्विज पूरा” लिखा आए।', expEn: 'Each answer shows right/wrong colours and an explanation; a result appears at the end; the ring on Home counts up and says the daily quiz is done.' },
  { g: G.start, id: 'T03', to: 'home', t: 'स्ट्रीक और सूचनाएँ', tEn: 'Streak and notifications', do: 'आज कम से कम 5 प्रश्न हल करें, फिर होम पर घंटी (सूचनाएँ) दबाकर हर सूचना खोलें।', doEn: 'Answer at least 5 questions today, then tap the bell (notifications) on Home and open each notification.', exp: '“1 दिन की स्ट्रीक” दिखे; हर सूचना सही स्क्रीन खोले।', expEn: '“1-day streak” shows; every notification opens the right screen.' },
  { g: G.quiz, id: 'T04', to: 'learn', t: "विषय → अध्याय → अभ्यास", tEn: "Subject → chapter → practice", do: "नीचे \"सीखें\" → कोई विषय → कोई अध्याय खोलें; \"अभ्यास\" से 10 प्रश्न हल करें; बीच में \"पिछला प्रश्न\" भी दबाएँ।", doEn: "Open \"Learn\" at the bottom → a subject → a chapter; practise 10 questions; also tap \"Previous\" along the way.", exp: "उसी अध्याय के प्रश्न आएँ; दिया गया उत्तर बदला न जा सके; अध्याय और विषय में पूरा % और महारत अपडेट हो।", expEn: "Questions are from that chapter; a given answer cannot be changed; the chapter and subject completion % and mastery update." },
  { g: G.quiz, id: 'T05', to: 'subject/history', t: "समयबद्ध अभ्यास", tEn: "Timed practice", do: "किसी विषय/अध्याय में \"समयबद्ध · 30 से.\" चुनें, अभ्यास शुरू करें और एक प्रश्न पर 30 सेकंड पूरे होने दें।", doEn: "On a subject or chapter page choose \"Timed · 30s\", start practice and let 30 seconds run out on one question.", exp: "टाइमर घटता दिखे और आख़िरी 10 सेकंड में लाल हो; समय ख़त्म होने पर \"समय समाप्त!\" और सही उत्तर दिखे।", expEn: "The timer counts down and turns red in the last 10 seconds; when time runs out \"Time is up!\" and the right answer show." },
  { g: G.quiz, id: 'T06', to: 'revise', t: "बुकमार्क", tEn: "Saved questions", do: "अभ्यास में 2 प्रश्न \"बुकमार्क\" करें, फिर \"सीखें\" → \"दोहराव\" → \"सहेजे गए\" खोलें और \"इन प्रश्नों का अभ्यास करें\" दबाएँ।", doEn: "Save 2 questions during practice, then open \"Learn\" → \"Revision\" → \"Saved\" and tap \"Practise these questions\".", exp: "दोनों प्रश्न सूची में दिखें, \"हटाएँ\" काम करे और अभ्यास में वही प्रश्न आएँ।", expEn: "Both questions are listed, \"Remove\" works and the practice uses those questions." },
  { g: G.quiz, id: 'T07', to: 'home', t: 'गलत प्रश्नों का दोहराव', tEn: 'Revise wrong answers', do: 'क्विज में जान-बूझकर 2–3 गलत उत्तर दें, फिर होम पर “प्रश्न दोहराव के लिए तैयार” कार्ड दबाएँ।', doEn: 'Answer 2–3 questions wrongly on purpose, then tap the “questions ready for revision” card on Home.', exp: 'वही गलत हुए प्रश्न दोबारा आएँ; सही करने पर कार्ड की गिनती घटे।', expEn: 'The same wrong questions come back; answering them right lowers the count.' },
  { g: G.quiz, id: 'T08', to: 'learn', t: "प्रश्न खोज", tEn: "Question search", do: "\"सीखें\" में ऊपर खोज बॉक्स दबाकर \"संविधान\" या \"1857\" लिखें और कोई परिणाम खोलें।", doEn: "In \"Learn\" tap the search box at the top, type \"constitution\" or \"1857\" and open a result.", exp: "मिलते-जुलते प्रश्न दिखें और चुना गया प्रश्न खुल जाए।", expEn: "Matching questions appear and the chosen one opens." },
  { g: G.quiz, id: 'T09', to: 'quiz', t: 'त्रुटि बताएँ और शेयर', tEn: 'Report error and share', do: 'किसी प्रश्न पर “त्रुटि बताएँ” से रिपोर्ट भेजें, फिर “शेयर” दबाएँ।', doEn: 'Send a report with “Report error” on a question, then tap “Share”.', exp: '“धन्यवाद” संदेश आए; रिपोर्ट एडमिन → “सामग्री की जाँच करें” → “त्रुटि रिपोर्ट” में दिखे; शेयर पर टेक्स्ट कॉपी या शेयर हो।', expEn: 'A thank-you message appears; the report shows in Admin → “Review content” → “Error reports”; Share copies or shares the text.' },
  { g: G.ca, id: 'T10', to: 'ca', t: "करेंट अफेयर्स लेख", tEn: "Current affairs article", do: "\"करेंट अफेयर्स\" खोलें; आज/सप्ताह/महीना/संग्रह टैब और खोज आज़माएँ; एक ख़बर खोलें, \"सुनें\", \"सहेजें\", \"PDF\" और \"इस ख़बर से प्रश्न\" आज़माएँ।", doEn: "Open \"Current affairs\"; try the Today/Week/Month/Archive tabs and search; open a story and try \"Listen\", \"Save\", \"PDF\" and its practice questions.", exp: "लेख में सारांश, विस्तार, क्यों महत्वपूर्ण, पृष्ठभूमि, परीक्षा तथ्य, योजनाएँ, संस्थाएँ और स्रोत लिंक हों; सुनने पर सही भाषा में आवाज़ आए; PDF पेज प्रिंट हो सके।", expEn: "The article has a summary, details, why it matters, background, exam facts, schemes, organisations and a source link; Listen reads it in the right language; the PDF page can be printed." },
  { g: G.ca, id: 'T11', to: 'ca', t: 'करेंट अफेयर्स क्विज', tEn: 'Current affairs quiz', do: 'Current Affairs में ऊपर “करेंट अफेयर्स क्विज” दबाकर पूरा करें।', doEn: 'In Current Affairs tap “Current affairs quiz” at the top and finish it.', exp: 'हाल की ख़बरों से प्रश्न आएँ और परिणाम में सही गिनती दिखे।', expEn: 'Questions come from recent news and the result shows the right count.' },
  { g: G.ca, id: 'T12', to: 'today', t: 'आज का दिन', tEn: 'Today in History', do: '“आज का दिन” खोलें; तीर से तारीख़ बदलें, ऊपर दाएँ सूची आइकन से कोई महीना चुनें, फिर “इस दिन से जुड़े प्रश्न देखें” दबाएँ।', doEn: 'Open “Today in History”; change the date with the arrows, pick a month from the list icon (top right), then tap “See questions about this day”.', exp: 'हर तारीख़ पर सही दिवस (या “कोई दिवस दर्ज नहीं”) दिखे; एक दिन में दो दिवस हों तो दोनों के बटन हों; प्रश्न उसी दिवस से जुड़े हों।', expEn: 'Each date shows the right day (or “no important day”); a date with two days shows a button for each; questions match that day.' },
  { g: G.mock, id: 'T13', to: 'mock', t: 'मॉक टेस्ट शुरू करें', tEn: 'Start a mock test', do: '“सामान्य ज्ञान मिनी मॉक – 1” शुरू करें; कुछ उत्तर दें, 2 प्रश्न “समीक्षा हेतु चिह्नित” करें और ऊपर दाएँ पैलेट से किसी प्रश्न पर जाएँ।', doEn: 'Start “General Knowledge Mini Mock – 1”; answer some questions, mark 2 for review and jump to a question from the palette (top right).', exp: 'टाइमर चले; पैलेट के रंग सही हों (हरा = उत्तर दिया, लाल = छोड़ा, बैंगनी = चिह्नित)।', expEn: 'The timer runs; palette colours are right (green = answered, red = not answered, purple = marked).' },
  { g: G.mock, id: 'T14', to: 'mock', t: 'परीक्षा छोड़कर लौटना', tEn: 'Leave and resume a test', do: 'परीक्षा के बीच ऊपर बाएँ ✕ से “बाहर जाएँ”, फिर “अभ्यास परीक्षा” में “जारी रखें” दबाएँ।', doEn: 'During a test tap ✕ (top left) → “Leave”, then tap “Continue” in “Mock Tests”.', exp: 'वहीं से परीक्षा खुले, पिछले उत्तर बने रहें और समय चलता रहे।', expEn: 'The test reopens where you left it, answers are kept and the timer kept running.' },
  { g: G.mock, id: 'T15', to: 'mock', t: 'सबमिट और परिणाम', tEn: 'Submit and result', do: 'परीक्षा सबमिट करें और परिणाम देखें।', doEn: 'Submit the test and look at the result.', exp: 'सही उत्तर पर +2 और गलत पर −0.5 सही गिने जाएँ; विषयवार प्रदर्शन, समाधान और कमाए पॉइंट्स दिखें; “पिछले प्रयास” में यह प्रयास जुड़े।', expEn: '+2 per right and −0.5 per wrong answer are counted correctly; subject-wise performance, solutions and points earned show; the attempt is added to “Previous attempts”.' },
  { g: G.prof, id: 'T16', to: 'profile', t: 'अक्षरों का आकार और रोज़ का लक्ष्य', tEn: 'Text size and daily goal', do: 'प्रोफ़ाइल में अक्षरों का आकार “बड़ा” और रोज़ का लक्ष्य 20 करें; फिर होम और क्विज देखें।', doEn: 'In Profile set text size to “Large” and the daily goal to 20; then look at Home and Quiz.', exp: 'हर स्क्रीन पर अक्षर बड़े हों पर कुछ कटे या एक-दूसरे पर न चढ़ें; होम की रिंग में “/ 20 प्रश्न” दिखे।', expEn: 'Text is larger everywhere without anything cut off or overlapping; the ring on Home shows “/ 20”.' },
  { g: G.prof, id: 'T17', to: 'home', t: 'डार्क मोड', tEn: 'Dark mode', do: 'फ़ोन की सेटिंग में डार्क मोड चालू करके ऐप की मुख्य स्क्रीनें देखें।', doEn: 'Turn on dark mode in your phone settings and look at the main screens.', exp: 'सभी स्क्रीनें पढ़ने योग्य हों; कहीं अदृश्य टेक्स्ट या चुभने वाली सफ़ेद पट्टी न हो।', expEn: 'Every screen is readable; no invisible text or glaring white strips.' },
  { g: G.admin, id: 'T18', to: 'admin-news', t: 'समाचार जोड़कर प्रकाशित करें', tEn: 'Add and publish news', do: 'एडमिन → “आज के समाचार देखें” में नया समाचार भरकर भेजें; “सामग्री की जाँच करें” में तीनों बिंदु चुनकर स्वीकृत करें; “प्रकाशित करें” से प्रकाशित करें।', doEn: 'Admin → “Today\'s news”: fill in and send a story; in “Review content” tick all three items and approve; publish it from “Publish”.', exp: 'तीनों बिंदु चुने बिना “स्वीकृत करें” बंद रहे; प्रकाशन के बाद समाचार Current Affairs में सबसे ऊपर दिखे।', expEn: '“Approve” stays disabled until all three items are ticked; after publishing, the story is at the top of Current Affairs.' },
  { g: G.admin, id: 'T19', to: 'admin-bank', t: 'नया प्रश्न जोड़ें या संपादित करें', tEn: 'Add or edit a question', do: 'एडमिन → “GK प्रश्न बैंक” में “नया प्रश्न जोड़ें” या किसी प्रश्न को “संपादित करें” (चाहें तो “English” भाग भी भरें); फिर समीक्षा और प्रकाशन करें।', doEn: 'Admin → “GK question bank”: “Add a new question” or “Edit” one (optionally fill the “English” part too); then review and publish it.', exp: 'अधूरा फ़ॉर्म सहेजा न जाए; प्रकाशन के बाद बदलाव क्विज में दिखे — English भरा हो तो English भाषा में वही दिखे।', expEn: 'An incomplete form cannot be saved; after publishing the change shows in the quiz, and in English if the English part was filled.' },
  { g: G.admin, id: 'T20', to: 'admin-bank', t: 'प्रश्न छिपाएँ', tEn: 'Hide a question', do: 'प्रश्न बैंक में किसी मूल प्रश्न पर “छिपाएँ” दबाएँ।', doEn: 'In the question bank tap “Hide” on a built-in question.', exp: 'वह प्रश्न क्विज और खोज में न आए; “प्रकाशित करें” की सूची से हटाने पर वापस दिखे।', expEn: 'The question disappears from quizzes and search; removing it from the “Publish” list brings it back.' },
  { g: G.admin, id: 'T21', to: 'admin-ai', t: 'AI से प्रश्न बनवाएँ', tEn: 'Generate questions with AI', do: 'एडमिन → “AI से प्रश्न बनवाएँ” में कोई ख़बर चुनकर “प्रश्न बनाएँ” दबाएँ (अनुमति माँगी जाए तो दें)।', doEn: 'Admin → “Generate questions with AI”: choose a story and tap “Generate questions” (allow it if asked).', exp: 'कुछ सेकंड में हिंदी और English प्रश्न बनें, संपादित किए जा सकें और “समीक्षा में भेजें” से जाँच सूची में पहुँचें। AI उपलब्ध न हो तो इसे “छोड़ें”।', expEn: 'Within seconds Hindi + English questions appear, can be edited and reach the review list via “Send to review”. Skip this if AI is not available.' },
  { g: G.gen, id: 'T22', to: 'home', t: 'नेविगेशन और बैक बटन', tEn: 'Navigation and back button', do: 'अलग-अलग स्क्रीनों पर जाएँ; फ़ोन/ब्राउज़र का बैक बटन और ऐप का ← बटन दबाएँ।', doEn: 'Move between screens; use the phone/browser back button and the app\'s ← button.', exp: 'हर बार सही पिछली स्क्रीन खुले; कोई ख़ाली या अटकी स्क्रीन न दिखे।', expEn: 'The right previous screen opens every time; no blank or stuck screens.' },
  { g: G.gen, id: 'T23', to: 'home', t: 'भाषा और पढ़ने में आसानी', tEn: 'Language quality and readability', do: 'पूरे ऐप में हिंदी और English पाठ, मात्राएँ और वर्तनी ध्यान से देखें।', doEn: 'Read the Hindi and English text across the app carefully.', exp: 'कहीं टूटे अक्षर, गलत वर्तनी, गलत अनुवाद या तथ्य की गलती न हो। मिले तो “सामग्री में गलती” प्रकार से बग बताएँ।', expEn: 'No broken characters, spelling mistakes, wrong translations or factual errors. If you find one, report a bug of type “Content error”.' },
  { g: G.v2, id: 'T24', to: 'profile', t: "भाषा बदलें (हिंदी ⇄ English)", tEn: "Switch language (Hindi ⇄ English)", do: "ऊपर दाएँ अपनी प्रोफ़ाइल (गोल अक्षर) → सेटिंग्स में \"English\" चुनें; होम, सीखें, मुक़ाबला और प्रगति देखें; फिर किसी प्रश्न पर ऊपर \"हिं\" से हिंदी करें; ऐप बंद करके दोबारा खोलें।", doEn: "Tap your profile (the round letter, top right) → Settings → \"English\"; look at Home, Learn, Compete and Progress; then on a question switch back with \"हिं\" at the top; close and reopen the app.", exp: "पूरा ऐप चुनी भाषा में दिखे; बीच क्विज में भाषा बदलने पर उत्तर और पॉइंट्स बने रहें; दोबारा खोलने पर वही भाषा रहे।", expEn: "The whole app appears in the chosen language; switching mid-quiz keeps answers and points; the language is remembered after reopening." },
  { g: G.v2, id: 'T25', to: 'quiz', t: 'रिवॉर्ड पॉइंट्स', tEn: 'Reward points', do: 'एक क्विज खेलें और हर सही उत्तर पर “+10 पॉइंट्स” देखें; परिणाम में “इस राउंड के पॉइंट्स” देखें; फिर वही प्रश्न आज दोबारा हल करें; प्रोफ़ाइल में “रिवॉर्ड पॉइंट्स” और “इतिहास” खोलें।', doEn: 'Play a quiz and watch for “+10 points” on each right answer; check “Points this round” on the result; answer the same questions again today; open “Reward points” and “History” in Profile.', exp: 'पहली बार सही उत्तर पर +10 (समयबद्ध में +12), गलत पर +1, दैनिक क्विज पूरा करने पर +20 बोनस; उसी दिन दोबारा वही प्रश्न हल करने पर पॉइंट्स न मिलें; प्रोफ़ाइल का जोड़ और इतिहास सही हो।', expEn: '+10 for a first right answer (+12 in timed mode), +1 for a wrong one, +20 bonus for finishing the daily quiz; no points for repeating the same question the same day; Profile totals and history add up.' },
  { g: G.v2, id: 'T26', to: 'leaders', t: "लीडरबोर्ड", tEn: "Leaderboard", do: "\"मुक़ाबला\" → \"लीडरबोर्ड\" खोलें; \"इस सप्ताह\", \"पिछला सप्ताह\", \"इस महीने\" और \"विजेता\" देखें; किसी नाम पर टैप करें; प्रोफ़ाइल में \"दिखने वाला नाम\" बदलें और \"लीडरबोर्ड पर मेरा नाम दिखाएँ\" बंद/चालू करें।", doEn: "Open \"Compete\" → \"Leaderboard\"; look at \"This week\", \"Last week\", \"This month\" and \"Winners\"; tap a name; in Profile change the display name and turn \"Show my name on the leaderboard\" off and on.", exp: "आपकी पंक्ति हाइलाइट हो; किसी नाम पर टैप करने से कोई प्रोफ़ाइल न खुले; नया नाम लीडरबोर्ड पर दिखे; बंद करने पर आप सूची से हट जाएँ।", expEn: "Your row is highlighted; tapping a name opens no profile; the new name shows on the board; turning it off removes you from the list." },
  { g: G.v2, id: 'T27', to: 'admin-rewards', t: 'इनाम और विजेता (एडमिन)', tEn: 'Prizes and winners (admin)', do: 'एडमिन → “पुरस्कार और लीडरबोर्ड” में साप्ताहिक इनाम लिखकर सहेजें; “विजेता घोषित करें” दबाएँ; किसी नमूना नाम को “छिपाएँ” और फिर “फिर दिखाएँ”।', doEn: 'Admin → “Rewards & leaderboard”: write a weekly prize and save it; tap “Announce winners”; “Hide” a sample name, then “Show again”.', exp: 'इनाम लीडरबोर्ड पर दिखे; “विजेता” टैब में पिछले सप्ताह के टॉप नाम और पॉइंट्स आएँ; छिपाया नाम लीडरबोर्ड से हटे और “फिर दिखाएँ” से लौटे।', expEn: 'The prize shows on the leaderboard; the “Winners” tab lists last week\'s top names and points; a hidden name leaves the board and returns with “Show again”.' },
  { g: G.v3, id: 'T28', to: 'home', t: "होम डैशबोर्ड", tEn: "Home dashboard", do: "होम पर \"आपका अगला क़दम\" कार्ड, \"यह सप्ताह\", \"पढ़ाई जारी रखें\", \"आपके लिए सुझाव\" और \"कमज़ोर विषय\" देखें; अगला क़दम वाला बटन दबाएँ।", doEn: "On Home look at \"Your next step\", \"This week\", \"Continue learning\", \"Recommended for you\" and \"Weak topics\"; tap the next-step button.", exp: "सबसे ज़रूरी काम सबसे ऊपर दिखे (जैसे दैनिक चुनौती, दोहराव या कमज़ोर विषय) और बटन सही जगह ले जाए; कोई बेकार या ख़ाली बटन न हो।", expEn: "The most useful action is at the top (daily challenge, revision or a weak topic) and the button goes to the right place; no dead or empty buttons." },
  { g: G.v3, id: 'T29', to: 'chapter/h-free', t: "कठिनाई और परीक्षा फ़िल्टर", tEn: "Difficulty and exam filters", do: "\"सीखें\" में ऊपर परीक्षा चुनें (जैसे बैंकिंग) और देखें कि विषय बदलते हैं; किसी अध्याय में \"शुरुआती/मध्यम/उन्नत\" चुनें।", doEn: "In \"Learn\" pick an exam at the top (for example Banking) and see the subjects change; on a chapter choose Beginner/Intermediate/Advanced.", exp: "परीक्षा बदलने पर सूची बदले; कठिनाई चुनने पर प्रश्न बैंक और अभ्यास उसी स्तर के हों।", expEn: "The list changes with the exam; the question bank and practice follow the chosen level." },
  { g: G.v3, id: 'T30', to: 'learn', t: "विस्तृत व्याख्या", tEn: "Detailed explanation", do: "किसी प्रश्न का उत्तर देकर व्याख्या पढ़ें; \"जुड़े प्रश्न\" दबाएँ।", doEn: "Answer a question and read the explanation; tap \"Related practice\".", exp: "सही उत्तर, बाकी विकल्प क्यों गलत हैं, पृष्ठभूमि, परीक्षा में उपयोगिता और स्रोत दिखें; तथ्य सही हों; जुड़े प्रश्न उसी विषय के हों।", expEn: "The correct answer, why each other option is wrong, background, exam relevance and source appear; facts are right; related questions are on the same topic." },
  { g: G.v3, id: 'T31', to: 'revise', t: "दोहराव और फ़्लैशकार्ड", tEn: "Revision and flashcards", do: "\"सीखें\" → \"दोहराव\" खोलें; \"फ़्लैशकार्ड\" में \"उत्तर देखें\" और \"याद था/भूल गया\" दबाएँ; \"गलतियाँ\" से अभ्यास करें।", doEn: "Open \"Learn\" → \"Revision\"; in Flashcards tap \"Show answer\" and \"Knew it / Forgot\"; practise from \"Mistakes\".", exp: "कार्ड एक-एक करके आएँ और अंत में सारांश दिखे; गलत हुए प्रश्न \"गलतियाँ\" में मिलें।", expEn: "Cards come one by one with a summary at the end; wrongly answered questions appear under \"Mistakes\"." },
  { g: G.v3, id: 'T32', to: 'builder', t: "अपना टेस्ट (परीक्षा मोड)", tEn: "Build your own test (exam mode)", do: "\"मुक़ाबला\" → \"अपना टेस्ट बनाएँ\": विषय, कठिनाई, 5 प्रश्न, समय और \"+2 / −0.5\" चुनकर टेस्ट दें; कुछ प्रश्न छोड़ें और सबमिट करें।", doEn: "\"Compete\" → \"Build your own test\": choose a subject, level, 5 questions, a time and \"+2 / −0.5\", take the test, skip some and submit.", exp: "टेस्ट के दौरान उत्तर न दिखें; परिणाम में अंक योजना के अनुसार स्कोर, विषयवार प्रदर्शन, समय विश्लेषण और समाधान हों।", expEn: "No answers are shown during the test; the result has the score with that marking, subject-wise performance, time analysis and solutions." },
  { g: G.v3, id: 'T33', to: 'compete', t: "साप्ताहिक और दोस्त की चुनौती", tEn: "Weekly and friend challenges", do: "\"मुक़ाबला\" में साप्ताहिक चुनौती दें; फिर \"दोस्त को चुनौती दें\" → टेस्ट पूरा करके \"चुनौती भेजें\"; भेजा गया संदेश किसी दूसरे फ़ोन पर \"चुनौती कोड डालें\" में पेस्ट करें।", doEn: "In \"Compete\" take the weekly challenge; then \"Challenge a friend\" → finish the test → \"Send the challenge\"; paste the message on another phone under \"Enter a challenge code\".", exp: "साप्ताहिक का पहला स्कोर दर्ज हो और दोबारा देने पर \"अभ्यास\" लिखा आए; दोस्त को वही प्रश्न मिलें और अंत में दोनों स्कोर की तुलना दिखे।", expEn: "The first weekly score is recorded and a retake says \"practice\"; the friend gets the same questions and both scores are compared at the end." },
  { g: G.v3, id: 'T34', to: 'today', t: "आज का दिन — दैनिक सत्र", tEn: "Today in History — daily session", do: "\"आज का दिन\" में कहानी और तथ्य पढ़ें, \"5 प्रश्न\" दें, दिवस \"सहेजें\" और \"शेयर\" करें; तीरों और कैलेंडर से दूसरी तारीख़ें देखें।", doEn: "In \"Today in History\" read the story and facts, take \"5 questions\", \"Save\" and \"Share\" the day; use the arrows and calendar to explore other dates.", exp: "सत्र पूरा होने पर \"आज का सत्र पूरा\" दिखे; सहेजा दिवस बुकमार्क के \"दिवस\" टैब में मिले; समय-रेखा और जयंतियाँ सही तारीख़ों पर हों।", expEn: "After the session it says the session is done; the saved day appears under the \"Days\" tab in Saved; the timeline and anniversaries match their dates." },
  { g: G.v3, id: 'T35', to: 'progress', t: "प्रगति और उपलब्धियाँ", tEn: "Progress and achievements", do: "नीचे \"प्रगति\" खोलें: स्तर, सटीकता, प्रति प्रश्न समय, सप्ताह की तुलना, विषयवार महारत, कमज़ोर विषय, बैज और हाल के उत्तर देखें; \"उपलब्धि शेयर करें\" आज़माएँ।", doEn: "Open \"Progress\" at the bottom: check the level, accuracy, time per question, week comparison, subject mastery, weak topics, badges and recent answers; try \"Share achievements\".", exp: "आँकड़े आपके अभ्यास से मेल खाएँ (जैसे गलत उत्तर वाले विषय कमज़ोर विषयों में दिखें); बैज की शर्तें साफ़ लिखी हों।", expEn: "The numbers match your practice (for example, topics you got wrong show up as weak); badge conditions are clearly written." },
  { g: G.v3, id: 'T36', to: 'admin-io', t: "एडमिन: जाँच, आयात/निर्यात, अनुवाद, इतिहास", tEn: "Admin: checks, import/export, translations, history", do: "एडमिन → \"आयात / निर्यात\" से CSV निर्यात करें और एक प्रश्न आयात करें; \"सामग्री की जाँच\" में \"स्वचालित जाँच\" देखें; \"अनुवाद प्रबंधन\" और \"विश्लेषण\" खोलें; प्रश्न बैंक में किसी प्रश्न का \"इतिहास\" देखें।", doEn: "Admin → \"Import / export\": export a CSV and import one question; in \"Review content\" look at \"Automated checks\"; open \"Translations\" and \"Analytics\"; in the question bank open a question's \"History\".", exp: "आयातित प्रश्न समीक्षा में आए और कमियाँ (जैसे अंग्रेज़ी नहीं) \"स्वचालित जाँच\" में दिखें; गंभीर गलती होने पर \"स्वीकृत करें\" बंद रहे; निर्यात फ़ाइल डाउनलोड हो।", expEn: "The imported question arrives in review with gaps (for example no English) flagged in \"Automated checks\"; \"Approve\" stays disabled on a blocking error; the export file downloads." },
  { g: G.v3, id: 'T37', to: 'home', t: "ऑफ़लाइन और गलती की स्थिति", tEn: "Offline and error states", do: "ऐप खुला रहते फ़ोन का इंटरनेट बंद करें, कुछ प्रश्न हल करें और स्क्रीनें बदलें; फिर इंटरनेट चालू करें।", doEn: "With the app open, turn off mobile data/Wi-Fi, answer a few questions and move between screens; then turn the internet back on.", exp: "ऊपर \"आप ऑफ़लाइन हैं\" पट्टी दिखे पर अभ्यास चलता रहे; इंटरनेट लौटने पर \"आप फिर ऑनलाइन हैं\" दिखे और कुछ भी न खोए।", expEn: "An \"You are offline\" bar appears but practice keeps working; when the internet returns \"You are back online\" shows and nothing is lost." },
  { g: G.v3, id: 'T38', to: 'learn', t: "AI ट्यूटर (यदि उपलब्ध)", tEn: "AI tutor (if available)", do: "किसी प्रश्न की व्याख्या में \"AI ट्यूटर से पूछें\" दबाएँ, एक त्वरित प्रश्न चुनें और अपना प्रश्न भी लिखें। (AI उपलब्ध न हो तो छोड़ें।)", doEn: "In a question's explanation tap \"Ask the AI tutor\", pick a quick prompt and type your own question. (Skip if AI is not available.)", exp: "उत्तर चुनी भाषा में, सरल और उसी प्रश्न से जुड़ा हो; गलत तथ्य न गढ़े; \"AI के उत्तर गलत भी हो सकते हैं\" सूचना दिखे।", expEn: "Answers are in the chosen language, simple and about that question; no invented facts; the \"AI answers can be wrong\" notice is shown." },
];
const tcT = t => L(t.t, t.tEn), tcDo = t => L(t.do, t.doEn), tcExp = t => L(t.exp, t.expEn);
const SEVS = [['critical', 'गंभीर', 'Critical', 'ऐप रुक गया, डेटा गया या आगे नहीं बढ़ सकते', 'App froze, data was lost or you cannot continue'], ['major', 'बड़ी', 'Major', 'कोई फ़ीचर काम नहीं करता', 'A feature does not work'], ['minor', 'छोटी', 'Minor', 'दिखावट या छोटी गड़बड़', 'Looks or a small glitch'], ['idea', 'सुझाव', 'Suggestion', 'सुधार का विचार', 'An idea for improvement']];
const BTYPES = [['bug', 'बग', 'Bug'], ['ui', 'डिज़ाइन / UI', 'Design / UI'], ['content', 'सामग्री में गलती', 'Content error'], ['idea', 'सुझाव', 'Idea']];
const SEV_EN = { critical: 'Critical', major: 'Major', minor: 'Minor', idea: 'Suggestion' };
const TYPE_EN = { bug: 'Bug', ui: 'UI/Design', content: 'Content error', idea: 'Idea' };
const SEV_CLS = { critical: 'sev-c', major: 'sev-ma', minor: 'sev-mi', idea: 'sev-s' };
const ROUTE_LABEL = { home: ['होम', 'Home'], quiz: ['क्विज – विषय चुनें', 'Quiz: subjects'], play: ['प्रश्न स्क्रीन', 'Question screen'], result: ['परिणाम', 'Result'], ca: ['Current Affairs', 'Current Affairs'], today: ['आज का दिन', 'Today in History'], mock: ['अभ्यास परीक्षा', 'Mock Tests'], exam: ['मॉक परीक्षा', 'Mock exam'], 'exam-result': ['परीक्षा परिणाम', 'Test result'], bookmarks: ['बुकमार्क', 'Saved'], leaders: ['लीडरबोर्ड', 'Leaderboard'], profile: ['प्रोफ़ाइल', 'Profile'], admin: ['एडमिन डैशबोर्ड', 'Admin dashboard'], 'admin-ai': ['एडमिन · AI प्रश्न', 'Admin · AI questions'], 'admin-review': ['एडमिन · सामग्री की जाँच', 'Admin · Review'], 'admin-publish': ['एडमिन · प्रकाशन', 'Admin · Publish'], 'admin-bank': ['एडमिन · प्रश्न बैंक', 'Admin · Question bank'], 'admin-news': ['एडमिन · समाचार', 'Admin · News'], 'admin-days': ['एडमिन · आज का दिन', 'Admin · Important days'], 'admin-rewards': ['एडमिन · पुरस्कार', 'Admin · Rewards'], welcome: ['पहली बार', 'First run'], learn: ['सीखें', 'Learn'], subject: ['विषय', 'Subject'], chapter: ['अध्याय', 'Chapter'], revise: ['दोहराव', 'Revision'], cards: ['फ़्लैशकार्ड', 'Flashcards'], compete: ['मुक़ाबला', 'Compete'], builder: ['टेस्ट बिल्डर', 'Test builder'], challenge: ['दोस्त की चुनौती', 'Friend challenge'], progress: ['प्रगति', 'Progress'], news: ['ख़बर', 'Article'], notes: ['नोट्स', 'Notes'], 'ca-notes': ['ख़बरों के नोट्स', 'News notes'], 'admin-translate': ['एडमिन · अनुवाद', 'Admin · Translations'], 'admin-analytics': ['एडमिन · विश्लेषण', 'Admin · Analytics'], 'admin-io': ['एडमिन · आयात/निर्यात', 'Admin · Import/export'], test: ['टेस्टर केंद्र', 'Tester hub'], 'test-inbox': ['टेस्टर इनबॉक्स', 'Tester inbox'] };
const routeLabel = r => { const x = ROUTE_LABEL[r]; return x ? L(x[0], x[1]) : r; };
const fmtStamp = ts => { const d = new Date(ts); return `${fmtDate(isoOf(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const waLink = text => 'https://wa.me/?text=' + encodeURIComponent(text);
const T = {
  name: String(LS.get('test.name', '') || '').slice(0, 40),
  res: (() => { const r = LS.get('test.results', {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; })(),
  bugs: (() => { const b = LS.get('test.bugs', []); return Array.isArray(b) ? b.filter(x => x && x.id) : []; })(),
  log: [], errors: [], inbox: [], inboxState: 'idle', open: '', shared: false, denied: false, timer: 0,
  save() { LS.set('test.name', this.name); LS.set('test.results', this.res); LS.set('test.bugs', this.bugs); this.push(); },
  note(d) { this.log.push(String(d).slice(0, 40)); if (this.log.length > 30) this.log.shift(); },
  // Testers with write access (the owner, or someone invited as an editor) also send results and
  // reports to the shared inbox; everyone else shares them by WhatsApp or copy.
  push() {
    if (!P.demo || !P.db || !P.uid || this.denied) return;
    if (!this.bugs.length && !Object.keys(this.res).length) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      try {
        await P.db.doc('feedback/' + P.uid).set(clone({ name: this.name, build: BUILD, device: deviceInfo(), results: this.res, items: this.bugs.slice(-80).map(slimBug), updatedAt: Date.now() }));
        this.shared = true;
        let changed = false;
        for (const b of this.bugs) if (!b.inbox) { b.inbox = true; changed = true; }
        if (changed) { LS.set('test.bugs', this.bugs); if (route === 'test') scheduleRender(); }
      } catch (e) {
        this.shared = false;
        if (e && ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'permission-denied', 'unauthenticated'].includes(e.code)) this.denied = true;
      }
    }, 1200);
  },
};
BINDS.T = T;
const bugForm = { sev: 'major', type: 'bug', caseId: '', ctx: '', route: '' };
const slimBug = b => ({ id: b.id, n: b.n, title: b.title, what: b.what, exp: b.exp, sev: b.sev, type: b.type, caseId: b.caseId, screen: b.screen, at: b.at, device: b.device, steps: b.steps, errors: b.errors, tester: b.tester, build: b.build });
function deviceInfo() {
  const ua = navigator.userAgent || '';
  const m = re => { const x = re.exec(ua); return x ? x[1] : ''; };
  const os = m(/Android ([\d.]+)/) ? 'Android ' + m(/Android ([\d.]+)/)
    : m(/(?:iPhone|CPU) OS ([\d_]+)/) ? 'iOS ' + m(/(?:iPhone|CPU) OS ([\d_]+)/).replace(/_/g, '.')
      : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'OS?';
  const br = m(/EdgA?\/(\d+)/) ? 'Edge ' + m(/EdgA?\/(\d+)/)
    : m(/SamsungBrowser\/(\d+)/) ? 'Samsung Internet ' + m(/SamsungBrowser\/(\d+)/)
      : m(/(?:Chrome|CriOS)\/(\d+)/) ? 'Chrome ' + m(/(?:Chrome|CriOS)\/(\d+)/)
        : m(/(?:Firefox|FxiOS)\/(\d+)/) ? 'Firefox ' + m(/(?:Firefox|FxiOS)\/(\d+)/)
          : m(/Version\/([\d.]+).*Safari/) ? 'Safari ' + m(/Version\/([\d.]+).*Safari/) : 'Browser?';
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return `${os} · ${br} · ${window.innerWidth}×${window.innerHeight} @${Math.round((window.devicePixelRatio || 1) * 10) / 10}x · ${dark ? 'Dark' : 'Light'} · Text ${Math.round((Number(U.s.set.scale) || 1) * 100)}% · ${LANG === 'en' ? 'English' : 'Hindi'}`;
}
function bugContext() {
  let ctx = `${routeLabel(route)} (#${route})`;
  if (route === 'play' && S && S.qs[S.i]) { const q = S.qs[S.i]; ctx += ` · ${L('प्रश्न', 'Q')} ${S.i + 1}/${S.qs.length} [${q.id}] ${qT(q).slice(0, 90)}`; }
  if (route === 'exam' && E) { const q = M().byId.get(E.qs[E.i]); ctx += ` · ${L('प्रश्न', 'Q')} ${E.i + 1}/${E.qs.length}${q ? ` [${q.id}] ${qT(q).slice(0, 90)}` : ''}`; }
  if (route === 'today') ctx += ` · ${L('तारीख़', 'date')} ${dayCursor || todayISO()}`;
  if (route === 'ca' && caCat) ctx += ` · ${L('श्रेणी', 'category')}: ${catLabel(caCat)}`;
  if (route === 'leaders') ctx += ` · ${L('टैब', 'tab')}: ${lbTab}`;
  return ctx;
}
function bugText(b) {
  const tc = b.caseId ? TESTS.find(x => x.id === b.caseId) : null;
  return [
    `🐞 MY QUIZ ${L('बग', 'bug')} #${b.n} — ${SEV_EN[b.sev] || b.sev} · ${TYPE_EN[b.type] || b.type}`,
    `${L('शीर्षक', 'Title')}: ${b.title}`,
    b.tester ? `${L('टेस्टर', 'Tester')}: ${b.tester}` : null,
    `${L('स्क्रीन', 'Screen')}: ${b.screen}`,
    tc ? `${L('टेस्ट केस', 'Test case')}: ${tc.id} ${tcT(tc)}` : null,
    '',
    `${L('क्या हुआ', 'What happened')}: ${b.what}`,
    b.exp ? `${L('क्या होना चाहिए था', 'Expected')}: ${b.exp}` : null,
    '',
    `${L('डिवाइस', 'Device')}: ${b.device}`,
    `${L('समय', 'Time')}: ${fmtStamp(b.at)} · ${b.build}`,
    b.steps ? `${L('आख़िरी क़दम', 'Last steps')}: ${b.steps}` : null,
    b.errors && b.errors.length ? `${L('तकनीकी त्रुटियाँ', 'Technical errors')}: ${b.errors.join(' | ')}` : null,
  ].filter(x => x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}
function fullReportText() {
  const by = st => TESTS.filter(t => T.res[t.id] === st);
  const pass = by('pass'), fail = by('fail'), skip = by('skip'), left = TESTS.filter(t => !T.res[t.id]);
  return [
    `🧪 MY QUIZ ${L('टेस्ट रिपोर्ट', 'test report')} (${BUILD})`,
    `${L('टेस्टर', 'Tester')}: ${T.name || '—'} · ${fmtStamp(Date.now())}`,
    `${L('डिवाइस', 'Device')}: ${deviceInfo()}`,
    '',
    L(`टेस्ट केस: ${TESTS.length - left.length}/${TESTS.length} — ✅ ${pass.length} ठीक · ❌ ${fail.length} गड़बड़ · ⏭ ${skip.length} छोड़े`, `Test cases: ${TESTS.length - left.length}/${TESTS.length} — ✅ ${pass.length} passed · ❌ ${fail.length} failed · ⏭ ${skip.length} skipped`),
    ...fail.map(t => `❌ ${t.id} ${tcT(t)}`),
    ...skip.map(t => `⏭ ${t.id} ${tcT(t)}`),
    left.length ? `${L('बाकी', 'Not done')}: ${left.map(t => t.id).join(', ')}` : null,
    '',
    `${L('बग रिपोर्ट', 'Bug reports')} (${T.bugs.length}):`,
    ...T.bugs.map(b => `#${b.n} [${SEV_EN[b.sev] || b.sev} · ${TYPE_EN[b.type] || b.type}] ${b.title}\n   ${L('स्क्रीन', 'Screen')}: ${b.screen}\n   ${L('क्या हुआ', 'What happened')}: ${b.what}${b.exp ? `\n   ${L('अपेक्षित', 'Expected')}: ${b.exp}` : ''}`),
    T.bugs.length ? null : '—',
  ].filter(x => x !== null).join('\n');
}
function openBug(caseId = '') {
  bugForm.caseId = caseId; bugForm.ctx = bugContext(); bugForm.route = route;
  const tc = TESTS.find(x => x.id === caseId);
  const sevHelp = s => { const x = SEVS.find(y => y[0] === s); return x ? L(x[3], x[4]) : ''; };
  openSheet(`${sheetHead(`${ic('bug')} ${L('बग रिपोर्ट करें', 'Report a bug')}`)}
  <form data-form="bug" style="display:flex;flex-direction:column;gap:12px">
    ${tc ? `<div class="note">${ic('clipboard')}<div><b>${tc.id}:</b> ${esc(tcT(tc))}<br><span class="small muted">${L('अपेक्षित', 'Expected')}: ${esc(tcExp(tc))}</span></div></div>` : ''}
    <div class="field"><label for="bg-title">${L('छोटा शीर्षक', 'Short title')}</label><input class="input" id="bg-title" maxlength="120" value="${tc ? esc(tcT(tc) + L(' — ठीक से काम नहीं किया', ': did not work properly')) : ''}" placeholder="${L('जैसे: टाइमर ख़त्म होने पर अगला प्रश्न नहीं खुला', 'e.g. The next question did not open when the timer ended')}"></div>
    <div class="field"><span class="lbl">${L('कितनी गंभीर?', 'How serious?')}</span><div class="chips wrap">${SEVS.map(([k, hi, en]) => `<button type="button" class="chip" data-act="bug-sev" data-v="${k}" aria-pressed="${bugForm.sev === k}">${L(hi, en)}</button>`).join('')}</div><span class="small muted" id="bg-sev-help">${esc(sevHelp(bugForm.sev))}</span></div>
    <div class="field"><span class="lbl">${L('प्रकार', 'Type')}</span><div class="chips wrap">${BTYPES.map(([k, hi, en]) => `<button type="button" class="chip" data-act="bug-type" data-v="${k}" aria-pressed="${bugForm.type === k}">${L(hi, en)}</button>`).join('')}</div></div>
    <div class="field"><label for="bg-what">${L('क्या हुआ?', 'What happened?')}</label><textarea class="textarea" id="bg-what" rows="3" maxlength="1500" placeholder="${L('आपने क्या किया और स्क्रीन पर क्या दिखा', 'What you did and what the screen showed')}"></textarea></div>
    <div class="field"><label for="bg-exp">${L('क्या होना चाहिए था?', 'What should have happened?')}</label><textarea class="textarea" id="bg-exp" rows="2" maxlength="800" style="min-height:70px" placeholder="${L('आपके हिसाब से सही व्यवहार', 'What you expected')}"></textarea></div>
    <div class="note">${ic('info')}<div class="small">${L('अपने-आप जुड़ेगा', 'Added automatically')}: ${L('स्क्रीन', 'screen')} (<b>${esc(bugForm.ctx)}</b>), ${L('डिवाइस की जानकारी और आपके आख़िरी क़दम', 'device details and your last steps')}${T.errors.length ? L(`, साथ में ${T.errors.length} तकनीकी त्रुटि`, `, plus ${T.errors.length} technical error(s)`) : ''}। ${L('स्क्रीनशॉट हो तो रिपोर्ट के साथ भेज दें।', 'If you have a screenshot, send it along with the report.')}</div></div>
    <p class="small" id="bg-err" style="margin:0;color:var(--bad)" role="alert"></p>
    <button class="btn btn-cta btn-block" type="submit">${ic('check')} ${L('रिपोर्ट सहेजें', 'Save report')}</button>
  </form>`, { label: L('बग रिपोर्ट करें', 'Report a bug') });
}
function openBugSent(b) {
  openSheet(`${sheetHead(L('रिपोर्ट सहेजी गई', 'Report saved'))}
  <p style="margin:0">${L(`बग #${b.n} आपके फ़ोन में सहेज ली गई है। अब इसे ऐप टीम को भेजें:`, `Bug #${b.n} is saved on your phone. Now send it to the app team:`)}</p>
  <div class="btnrow"><a class="btn btn-cta" href="${esc(waLink(bugText(b)))}" target="_blank" rel="noopener noreferrer" data-act="bug-wa" data-id="${esc(b.id)}">${ic('send')} ${L('WhatsApp पर भेजें', 'Send on WhatsApp')}</a><button class="btn btn-outline" data-act="bug-copy" data-id="${esc(b.id)}">${ic('copy')} ${L('टेक्स्ट कॉपी करें', 'Copy text')}</button></div>
  <p class="small muted" style="margin:0">${P.db && P.uid && !T.denied ? L('यह रिपोर्ट ऐप के टेस्टर इनबॉक्स में भी भेजी जा रही है।', 'This report is also being sent to the app\'s tester inbox.') : L('चाहें तो सभी रिपोर्ट अंत में एक साथ भेजें: टेस्ट सूची → “पूरी रिपोर्ट भेजें”।', 'You can also send everything together at the end: test list → “full report”.')}</p>
  <button class="btn btn-grey btn-block" data-act="sheet-close">${L('ठीक है', 'OK')}</button>`, { label: L('रिपोर्ट सहेजी गई', 'Report saved') });
}
function markCase(id, st) {
  T.res[id] = st;
  T.save();
  const next = TESTS.find(t => !T.res[t.id]);
  T.open = next ? next.id : '';
  toast(st === 'pass' ? L(`${id} ठीक चला`, `${id} passed`) : L(`${id} छोड़ा गया`, `${id} skipped`));
  render();
}
function renderDemoStrip() {
  if (!DEMO) return;
  const root = $('#demo-root');
  if (!root) return;
  const done = TESTS.filter(t => T.res[t.id]).length;
  root.innerHTML = `<div class="demo-strip"><div class="demo-in gutter"><span class="demo-tag">${ic('flask')}<span>${L('टेस्ट संस्करण', 'Test build')}</span></span><span class="demo-sp"></span><button class="demo-btn" data-act="bug-open" aria-label="${L('बग बताएँ', 'Report a bug')}">${ic('bug')} ${L('बग बताएँ', 'Report bug')}${T.errors.length ? '<span class="demo-dot" aria-hidden="true"></span>' : ''}</button><a class="demo-btn" href="#test" aria-label="${L(`टेस्ट सूची: ${TESTS.length} में से ${done} टेस्ट हुए`, `Test list: ${done} of ${TESTS.length} done`)}">${ic('clipboard')} ${L('टेस्ट', 'Tests')} <b class="tnum">${done}/${TESTS.length}</b></a></div></div>`;
}
function tcHtml(t) {
  const st = T.res[t.id];
  const label = st === 'pass' ? L('ठीक', 'Passed') : st === 'fail' ? L('गड़बड़', 'Failed') : st === 'skip' ? L('छोड़ा', 'Skipped') : L('बाकी', 'To do');
  return `<details class="tcase" data-tc="${t.id}" ${T.open === t.id ? 'open' : ''}><summary><span class="tc-id">${t.id}</span><span class="tc-title">${esc(tcT(t))}</span><span class="tc-st ${st ? 'tc-' + st : ''}">${label}</span></summary>
  <div class="tc-body"><p><b>${L('क्या करें', 'Steps')}:</b> ${esc(tcDo(t))}</p><p><b>${L('अपेक्षित परिणाम', 'Expected result')}:</b> ${esc(tcExp(t))}</p>
  <div class="btnrow"><a class="btn btn-sm btn-outline" href="#${t.to}">${ic('arrow-right')} ${L('स्क्रीन खोलें', 'Open screen')}</a><button class="btn btn-sm btn-cta" data-act="tc-pass" data-id="${t.id}">${ic('check')} ${L('ठीक चला', 'Works')}</button><button class="btn btn-sm btn-danger" data-act="tc-fail" data-id="${t.id}">${ic('x')} ${L('गड़बड़ है', 'Problem')}</button><button class="btn btn-sm btn-grey" data-act="tc-skip" data-id="${t.id}">${L('छोड़ें', 'Skip')}</button></div></div></details>`;
}
function bugRow(b, own = true) {
  const sv = SEVS.find(x => x[0] === b.sev), ty = BTYPES.find(x => x[0] === b.type);
  const sev = sv ? L(sv[1], sv[2]) : b.sev, typ = ty ? L(ty[1], ty[2]) : b.type;
  return `<div class="review-item"><div class="draft-head"><span class="tag ${SEV_CLS[b.sev] || ''}">${esc(sev)}</span><span class="tag">${esc(typ)}</span><span class="small muted">#${esc(b.n)} · ${relTime(b.at)}${own && b.inbox ? ' · ' + L('इनबॉक्स में भेजी गई', 'sent to inbox') : ''}${!own && b.tester ? ' · ' + esc(b.tester) : ''}</span></div>
  <b>${esc(b.title)}</b><span class="small muted">${esc(b.screen)}</span><span class="small">${esc(b.what)}</span>${b.exp ? `<span class="small">${L('अपेक्षित', 'Expected')}: ${esc(b.exp)}</span>` : ''}${!own && b.steps ? `<span class="small muted">${L('आख़िरी क़दम', 'Last steps')}: ${esc(b.steps)}</span>` : ''}${!own && b.device ? `<span class="small muted">${esc(b.device)}</span>` : ''}
  ${own ? `<div class="btnrow" style="gap:14px"><a class="link" href="${esc(waLink(bugText(b)))}" target="_blank" rel="noopener noreferrer" data-act="bug-wa" data-id="${esc(b.id)}">${ic('send')} WhatsApp</a><button class="link" data-act="bug-copy" data-id="${esc(b.id)}">${ic('copy')} ${L('कॉपी', 'Copy')}</button><button class="link" style="color:var(--bad)" data-act="bug-del" data-id="${esc(b.id)}">${ic('trash')} ${L('हटाएँ', 'Delete')}</button></div>` : ''}</div>`;
}
function vTest() {
  if (!DEMO) return redirect('home');
  const total = TESTS.length, done = TESTS.filter(t => T.res[t.id]).length;
  const n = st => TESTS.filter(t => T.res[t.id] === st).length;
  const groups = uniq(TESTS.map(t => t.g));
  const long = fullReportText().length > 6000;
  return `${appbar(`${ic('clipboard')} ${L('टेस्टर केंद्र', 'Tester hub')}`, { back: 'home', right: langBtn() })}
<main class="page gutter">
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <h2 style="font-size:1.15rem;font-weight:800;line-height:1.35">${L('धन्यवाद! आप MY QUIZ का टेस्ट संस्करण चला रहे हैं।', 'Thank you! You are running the MY QUIZ test build.')}</h2>
    <p class="small muted" style="margin:0">${L('हर फ़ीचर बेझिझक आज़माएँ, एडमिन पैनल भी। आपके सारे बदलाव केवल आपके ब्राउज़र में रहते हैं; असली ऐप पर कोई असर नहीं होता।', 'Try every feature freely, the admin panel too. All your changes stay in your browser; the real app is not affected.')}</p>
    <ol class="small" style="margin:0;padding-left:1.25em;display:flex;flex-direction:column;gap:4px">
      <li>${L('नीचे अपना नाम लिखें।', 'Write your name below.')}</li>
      <li>${L('हर टेस्ट खोलें और बताए गए क़दम करें (“स्क्रीन खोलें” से सीधे वहाँ जाएँ)।', 'Open each test and follow the steps (“Open screen” takes you there).')}</li>
      <li>${L('ठीक चले तो “ठीक चला” दबाएँ; गड़बड़ हो तो “गड़बड़ है” दबाकर बग लिखें। किसी भी स्क्रीन से ऊपर पीली पट्टी में “बग बताएँ” भी दबा सकते हैं।', 'If it works tap “Works”; if not, tap “Problem” and describe the bug. You can also tap “Report bug” in the yellow bar on any screen.')}</li>
      <li>${L('अंत में “पूरी रिपोर्ट भेजें” से सब एक साथ भेजें।', 'At the end, send everything at once with the full report.')}</li>
    </ol>
    <div class="field"><label for="t-name">${L('आपका नाम (टेस्टर)', 'Your name (tester)')}</label><input class="input" id="t-name" data-bind="T.name" value="${esc(T.name)}" maxlength="40" placeholder="${L('जैसे: प्रिया', 'e.g. Priya')}" autocomplete="name"></div>
  </section>
  <div class="stats tstats"><div class="stat"><b class="tnum">${done}/${total}</b><span>${L('टेस्ट हुए', 'Tests done')}</span></div><div class="stat s-ok"><b>${n('pass')}</b><span>${L('ठीक', 'Passed')}</span></div><div class="stat s-bad"><b>${n('fail')}</b><span>${L('गड़बड़', 'Failed')}</span></div><div class="stat"><b>${T.bugs.length}</b><span>${L('बग', 'Bugs')}</span></div></div>
  <div class="btnrow"><a class="btn btn-cta" href="${esc(waLink(fullReportText()))}" target="_blank" rel="noopener noreferrer" data-act="report-wa">${ic('send')} ${L('पूरी रिपोर्ट WhatsApp पर', 'Full report on WhatsApp')}</a><button class="btn btn-outline" data-act="report-copy">${ic('copy')} ${L('पूरी रिपोर्ट कॉपी करें', 'Copy full report')}</button></div>
  ${long ? `<p class="small muted" style="margin:-6px 0 0">${L('रिपोर्ट लंबी है। WhatsApp में कट जाए तो “कॉपी करें” से भेजें।', 'The report is long. If WhatsApp cuts it off, send it with “Copy”.')}</p>` : ''}
  ${groups.map(g => `<h3 class="tgroup">${esc(L(g[0], g[1]))}</h3>${TESTS.filter(t => t.g === g).map(tcHtml).join('')}`).join('')}
  <section style="display:flex;flex-direction:column;gap:10px">
    <div class="sec-head"><h2 class="sec-title">${ic('bug')} ${L('मेरी बग रिपोर्ट', 'My bug reports')} (${T.bugs.length})</h2><button class="btn btn-sm btn-outline" data-act="bug-open">${ic('plus')} ${L('नई रिपोर्ट', 'New report')}</button></div>
    ${T.bugs.length ? `<div class="list">${T.bugs.slice().reverse().map(b => bugRow(b)).join('')}</div>` : `<div class="card">${emptyState('bug', L('अभी कोई बग रिपोर्ट नहीं', 'No bug reports yet'), L('गड़बड़ दिखे तो ऊपर पीली पट्टी में “बग बताएँ” दबाएँ।', 'If something goes wrong, tap “Report bug” in the yellow bar.'))}</div>`}
  </section>
  ${P.editor ? `<a class="act" href="#test-inbox"><span class="ai">${ic('inbox')}</span><span>${L('टेस्टर इनबॉक्स', 'Tester inbox')}<span class="row-sub">${L('सभी टेस्टरों की सीधे आई रिपोर्ट — केवल मालिक/संपादक देख सकते हैं', 'Reports sent directly by all testers; only the owner/editors can see them')}</span></span>${ic('chev-right', 'chev')}</a>` : ''}
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 class="sec-title" style="font-size:1.05rem">${ic('rotate')} ${L('नए सिरे से टेस्ट करें', 'Start testing afresh')}</h2><p class="small muted" style="margin:0">${L('प्रगति, पॉइंट्स, बुकमार्क, मॉक इतिहास और एडमिन बदलाव हटाकर ऐप को पहली बार जैसा बनाएँ। आपकी टेस्ट सूची और बग रिपोर्ट बनी रहेंगी।', 'Clear progress, points, saved items, mock history and admin changes so the app is like new. Your test list and bug reports are kept.')}</p><button class="btn btn-danger" data-act="demo-reset-ask">${ic('trash')} ${L('ऐप डेटा रीसेट करें', 'Reset app data')}</button></section>
  <p class="small muted" style="text-align:center;margin:0">MY QUIZ · ${esc(BUILD)}</p>
</main>
${bottomNav('')}`;
}
function vTestInbox() {
  if (!DEMO) return redirect('home');
  if (!P.editor) return `${appbar(L('टेस्टर इनबॉक्स', 'Tester inbox'), { back: 'test' })}<main class="page gutter"><div class="card">${emptyState('lock', L('यह इनबॉक्स केवल ऐप के मालिक या संपादक के लिए है', 'This inbox is only for the app\'s owner or editors'), P.ready ? '' : L('पहुँच जाँची जा रही है…', 'Checking access…'))}</div></main>`;
  const testers = T.inbox.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const cards = testers.map(x => {
    const vals = Object.values(x.results);
    const cnt = st => vals.filter(v => v === st).length;
    const failed = TESTS.filter(t => x.results[t.id] === 'fail').map(t => t.id);
    return `<section class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="inbox-head"><span class="avatar" style="width:40px;height:40px;background:var(--navy);border:0">${esc(initial(x.name || 'T'))}</span><span class="row-main"><span class="row-title">${esc(x.name || L('बिना नाम का टेस्टर', 'Unnamed tester'))}</span><span class="row-sub">${relTime(x.updatedAt)} · ${esc(x.build || '')}</span></span></div>
      ${x.device ? `<span class="small muted">${esc(x.device)}</span>` : ''}
      <div class="chips wrap"><span class="chip">${cnt('pass') + cnt('fail') + cnt('skip')}/${TESTS.length} ${L('टेस्ट', 'tests')}</span><span class="chip">${cnt('pass')} ${L('ठीक', 'passed')}</span><span class="chip">${cnt('fail')} ${L('गड़बड़', 'failed')}${failed.length ? ': ' + esc(failed.join(', ')) : ''}</span><span class="chip">${x.items.length} ${L('बग', 'bugs')}</span></div>
      ${x.items.length ? `<div class="list">${x.items.slice().reverse().map(b => bugRow(b, false)).join('')}</div>` : ''}
    </section>`;
  }).join('');
  return `${appbar(`${ic('inbox')} ${L('टेस्टर इनबॉक्स', 'Tester inbox')}`, { back: 'test' })}
<main class="page gutter">
  <div class="note">${ic('info')}<div>${L('यहाँ उन टेस्टरों की रिपोर्ट और टेस्ट नतीजे दिखते हैं जिन्हें आपने इस डेमो पर <b>संपादक (Editor)</b> की पहुँच दी है। WhatsApp या कॉपी से भेजी रिपोर्ट यहाँ नहीं आतीं।', 'This shows reports and results from testers you gave <b>Editor</b> access to this demo. Reports sent by WhatsApp or copy do not arrive here.')}</div></div>
  ${testers.length ? `<button class="btn btn-outline" data-act="inbox-copy">${ic('copy')} ${L('सारी रिपोर्ट कॉपी करें', 'Copy all reports')}</button>` : ''}
  ${T.inboxState === 'loading' ? skeletonCards(2) : T.inboxState === 'error' ? `<div class="note note-warn">${ic('alert')}<div>${L('इनबॉक्स अभी लोड नहीं हो सका।', 'The inbox could not be loaded right now.')}</div></div>` : cards || `<div class="card">${emptyState('inbox', L('अभी कोई रिपोर्ट नहीं आई', 'No reports yet'), '')}</div>`}
</main>`;
}
function subscribeInbox() {
  if (!P.demo || !P.db || !P.editor) return;
  T.inboxState = 'loading';
  try {
    P.db.collection('feedback').onSnapshot(snap => {
      T.inbox = snap.docs.map(d => {
        const x = d.data() || {};
        return { uid: d.id, name: String(x.name || ''), build: String(x.build || ''), device: String(x.device || ''), results: x.results && typeof x.results === 'object' && !Array.isArray(x.results) ? x.results : {}, items: Array.isArray(x.items) ? x.items.filter(i => i && typeof i === 'object') : [], updatedAt: Number(x.updatedAt) || 0 };
      });
      T.inboxState = 'ok';
      if (route === 'test-inbox' || route === 'test') scheduleRender();
    }, () => { T.inboxState = 'error'; if (route === 'test-inbox') scheduleRender(); });
  } catch { T.inboxState = 'error'; }
}
// Two example AI drafts so the review → approve → publish flow can be tried right away.
function seedDemo() {
  if (!P.demo || LS.get('demo.seeded', false)) return;
  LS.set('demo.seeded', true);
  if (C.drafts.length) return;
  const now = Date.now();
  const src = 'गोवा में 57वाँ अंतरराष्ट्रीय फ़िल्म महोत्सव (IFFI) शुरू\nतारीख़: 20 नवंबर 2026\nभारत का 57वाँ अंतरराष्ट्रीय फ़िल्म महोत्सव 20 से 28 नवंबर 2026 तक गोवा में आयोजित हो रहा है। इस बार की थीम Stories Without Borders है और उद्घाटन फ़िल्म पोलिश निर्देशक पावेल पावलिकोव्स्की की Fatherland है।\n• कंट्री ऑफ़ ऑनर: स्पेन';
  C.drafts.push(
    { id: 'ex1', type: 'q', status: 'draft', origin: 'ai', note: 'उदाहरण ड्राफ़्ट', source: src, createdAt: now, updatedAt: now, data: { id: 'qex1iffi', s: 'ca', t: 'कला एवं संस्कृति', d: 1, n: 'n2611-iffi', q: '57वें भारतीय अंतरराष्ट्रीय फ़िल्म महोत्सव (IFFI) 2026 में कंट्री ऑफ़ ऑनर कौन-सा देश है?', o: ['फ़्रांस', 'स्पेन', 'जापान', 'इटली'], a: 1, e: '57वें IFFI (20–28 नवंबर 2026, गोवा) में स्पेन को कंट्री ऑफ़ ऑनर बनाया गया है।', en: { q: 'Which country is the Country of Honour at the 57th International Film Festival of India (IFFI) 2026?', o: ['France', 'Spain', 'Japan', 'Italy'], e: 'Spain is the Country of Honour at the 57th IFFI (20–28 November 2026, Goa).', t: 'Art & Culture' } } },
    { id: 'ex2', type: 'q', status: 'draft', origin: 'ai', note: 'उदाहरण ड्राफ़्ट', source: src, createdAt: now + 1, updatedAt: now + 1, data: { id: 'qex2iffi', s: 'ca', t: 'कला एवं संस्कृति', d: 2, n: 'n2611-iffi', q: 'IFFI 2026 की उद्घाटन फ़िल्म Fatherland के निर्देशक पावेल पावलिकोव्स्की किस देश से हैं?', o: ['पोलैंड', 'स्पेन', 'फ़्रांस', 'जर्मनी'], a: 0, e: 'उद्घाटन फ़िल्म Fatherland पोलिश निर्देशक पावेल पावलिकोव्स्की की है।', en: { q: 'The IFFI 2026 opening film Fatherland is directed by Paweł Pawlikowski. Which country is he from?', o: ['Poland', 'Spain', 'France', 'Germany'], e: 'The opening film Fatherland is by Polish director Paweł Pawlikowski.', t: 'Art & Culture' } } });
  CMS.saveLocal();
}
Object.assign(ACTIONS, {
  'bug-open': () => openBug(''),
  'bug-sev': el => { bugForm.sev = el.dataset.v; $$('[data-act="bug-sev"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === bugForm.sev))); const h = $('#bg-sev-help'); const x = SEVS.find(y => y[0] === bugForm.sev); if (h) h.textContent = x ? L(x[3], x[4]) : ''; },
  'bug-type': el => { bugForm.type = el.dataset.v; $$('[data-act="bug-type"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === bugForm.type))); },
  'bug-copy': el => { const b = T.bugs.find(x => x.id === el.dataset.id); if (b) copyText(bugText(b), L('रिपोर्ट कॉपी हुई — WhatsApp, ईमेल या कहीं भी पेस्ट करें', 'Report copied. Paste it into WhatsApp, email or anywhere.')); },
  'bug-wa': el => { const b = T.bugs.find(x => x.id === el.dataset.id); if (b) el.setAttribute('href', waLink(bugText(b))); },
  'bug-del': el => { const id = el.dataset.id; confirmSheet(L('यह बग रिपोर्ट हटाएँ?', 'Delete this bug report?'), L('रिपोर्ट आपके फ़ोन से हट जाएगी।', 'The report will be removed from your phone.'), L('हटाएँ', 'Delete'), () => { T.bugs = T.bugs.filter(x => x.id !== id); T.save(); render(); }); },
  'report-wa': el => { el.setAttribute('href', waLink(fullReportText())); },
  'report-copy': () => copyText(fullReportText(), L('पूरी टेस्ट रिपोर्ट कॉपी हुई — अब WhatsApp या ईमेल में पेस्ट करें', 'Full test report copied. Paste it into WhatsApp or email.')),
  'tc-pass': el => markCase(el.dataset.id, 'pass'),
  'tc-skip': el => markCase(el.dataset.id, 'skip'),
  'tc-fail': el => openBug(el.dataset.id),
  'inbox-copy': () => {
    const text = T.inbox.map(x => [`👤 ${x.name || L('टेस्टर', 'Tester')} · ${x.device}`, `${L('टेस्ट', 'Tests')}: ${Object.keys(x.results).length}/${TESTS.length} · ${L('गड़बड़', 'Failed')}: ${TESTS.filter(t => x.results[t.id] === 'fail').map(t => t.id).join(', ') || '—'}`, ...x.items.map(b => bugText({ ...b, n: b.n, at: b.at || Date.now(), build: b.build || '' }))].join('\n')).join('\n\n———\n\n');
    copyText(text, L('सभी टेस्टरों की रिपोर्ट कॉपी हुई', 'All testers\' reports copied'));
  },
  'demo-reset-ask': () => confirmSheet(L('ऐप डेटा रीसेट करें?', 'Reset app data?'), L('आपकी प्रगति, पॉइंट्स, बुकमार्क, मॉक इतिहास और एडमिन में किए बदलाव हट जाएँगे। टेस्ट सूची और बग रिपोर्ट बनी रहेंगी।', 'Your progress, points, saved items, mock history and admin changes will be cleared. The test list and bug reports are kept.'), L('रीसेट करें', 'Reset'), () => {
    const lang = U.s.set.lang;
    for (const k of ['progress', 'cms.pub', 'cms.drafts', 'cms.reports', 'exam', 'lastExam', 'onb-skip', 'demo.seeded', 'lb.settings', 'lb.winners', 'lb.hidden']) LS.del(k);
    U.s = DEF(); U.s.set.lang = lang; applySettings(); S = null; E = null; lastExam = null;
    Object.assign(onb, { name: '', exam: '', goal: 10 });
    LB.settings = { weekPrize: '', weekPrizeEn: '', monthPrize: '', monthPrizeEn: '' };
    loadLocalCms(); LB.loadLocal(); seedDemo(); bump();
    toast(L('ऐप नए सिरे से शुरू — अब टेस्ट करें', 'The app is fresh again. Happy testing!'));
    nav('home');
  }),
});
FORMS.bug = async f => {
  const g = id => ($('#' + id, f).value || '').trim();
  const title = g('bg-title'), what = g('bg-what'), exp = g('bg-exp');
  if (title.length < 4) { $('#bg-err', f).textContent = L('छोटा-सा शीर्षक लिखें।', 'Write a short title.'); return; }
  if (what.length < 6) { $('#bg-err', f).textContent = L('बताएँ कि क्या हुआ — इसी से डेवलपर गड़बड़ ढूँढ पाएँगे।', 'Describe what happened: that is how developers find the problem.'); return; }
  const b = { id: rid(), n: T.bugs.reduce((mx, x) => Math.max(mx, Number(x.n) || 0), 0) + 1, title, what, exp, sev: bugForm.sev, type: bugForm.type, caseId: bugForm.caseId, screen: bugForm.ctx, route: bugForm.route, at: Date.now(), device: deviceInfo(), steps: T.log.slice(-15).join(' → '), errors: T.errors.slice(-5).map(e => `${e.m} (@${e.at})`), tester: T.name, build: BUILD, inbox: false };
  T.bugs.push(b);
  if (b.caseId) T.res[b.caseId] = 'fail';
  T.save();
  closeSheet();
  openBugSent(b);
  render();
};

