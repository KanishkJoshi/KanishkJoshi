# एडमिन गाइड: सामग्री कैसे अपलोड करें · Admin guide: how to upload content

## कौन अपलोड कर सकता है · Who can upload
| संस्करण · Version | एडमिन कौन है · Who is an admin |
|---|---|
| अपनी वेबसाइट (Google लॉगिन) · Your own website (Google sign-in) | एडमिन पैनल → **एडमिन टीम** में जोड़े गए Google ईमेल। मालिक जोड़ता/हटाता है। · Google emails added in Admin panel → **Admin team**. The owner adds and removes them. |
| claude.ai लिंक · claude.ai link | मालिक और पेज के **Share** मेनू से **Editor** बनाए गए लोग · The owner and people invited as **Editor** from the page's **Share** menu |
| टेस्ट संस्करण · Tester build | हर टेस्टर, पर बदलाव केवल उसी ब्राउज़र में · Every tester, but changes stay in their own browser |

एडमिन पैनल खोलें: **प्रोफ़ाइल (ऊपर दाएँ गोल अक्षर) → एडमिन पैनल**। पैनल में **"सामग्री कैसे अपलोड करें?"** बटन यही गाइड दिखाता है।
Open it from **Profile (round letter, top right) → Admin panel**. The **"How do I upload content?"** button in the panel shows this guide.

## हर अपलोड का रास्ता · Every upload follows the same path
**जोड़ें → स्वचालित जाँच → मानव समीक्षा (3 बिंदु) → स्वीकृत → प्रकाशित (आज या तय तारीख़ से)**
**Add → automated checks → human review (3 items) → approve → publish (now or from a date)**

कुछ भी सीधे विद्यार्थियों तक नहीं जाता — AI से बनी सामग्री भी नहीं। Nothing reaches students directly — not even AI-generated content.

## 1. एक प्रश्न · One question
एडमिन → **GK प्रश्न बैंक** → **नया प्रश्न जोड़ें** · Admin → **GK question bank** → **Add a new question**:
- विषय, अध्याय, कठिनाई, परीक्षा टैग · subject, chapter, difficulty, exam tags
- प्रश्न (हिंदी), चार विकल्प, सही उत्तर · question (Hindi), four options, the right answer
- व्याख्या, हर गलत विकल्प के लिए "क्यों गलत" नोट, पृष्ठभूमि, स्रोत · explanation, a "why it's wrong" note per wrong option, background, source
- **English** भाग वैकल्पिक — भरें तो अंग्रेज़ी में वही दिखेगा · the **English** part is optional — fill it and English users see it

## 2. Excel / CSV से एक साथ कई प्रश्न · Many questions from Excel / CSV
1. एडमिन → **आयात / निर्यात** → **खाली टेम्पलेट (उदाहरण सहित)** डाउनलोड करें (यहाँ भी है: [`question-template.csv`](question-template.csv)).
   Admin → **Import / export** → download the **Blank template (with examples)** (also here: [`question-template.csv`](question-template.csv)).
2. Excel या Google Sheets में खोलें, हर प्रश्न की एक पंक्ति भरें। Open it in Excel or Google Sheets and fill one row per question.

   | कॉलम · Column | क्या लिखें · What to write |
   |---|---|
   | `id` | खाली छोड़ें (ऐप बनाएगा) · leave empty (the app creates one) |
   | `subject` | `history`, `geography`, `polity`, `science`, `sports`, `misc`, `ca` |
   | `chapter` | जैसे `h-free`, `p-rights`, `sc-bio` (पूरी सूची README में) · e.g. `h-free`, `p-rights`, `sc-bio` (full list in README) |
   | `difficulty` | `1` शुरुआती · beginner, `2` मध्यम · intermediate, `3` उन्नत · advanced |
   | `question`, `A`–`D` | प्रश्न और चार विकल्प (हिंदी) · the question and four options (Hindi) |
   | `answer` | सही विकल्प का अक्षर: `A`/`B`/`C`/`D` · letter of the right option |
   | `explanation`, `reference` | व्याख्या और स्रोत · explanation and source |
   | `question_en`, `A_en`–`D_en`, `explanation_en` | अंग्रेज़ी (वैकल्पिक, विकल्प उसी क्रम में) · English (optional, options in the same order) |
3. **File → Save as → CSV UTF-8** से सहेजें (हिंदी सही रहे)। Save with **File → Save as → CSV UTF-8** (keeps Hindi intact).
4. **फ़ाइल चुनें** → **जाँचें** (गलत पंक्तियाँ बताई जाएँगी) → **समीक्षा में भेजें**। एक बार में 500 प्रश्न तक।
   **Choose file** → **Check** (bad rows are listed) → **Send to review**. Up to 500 questions at a time.

JSON भी चलता है (वही फ़ॉर्मैट जो **निर्यात → JSON** देता है)। JSON works too (the format **Export → JSON** produces).

## 3. AI से प्रश्न · Questions with AI
एडमिन → **AI से प्रश्न बनवाएँ** → स्रोत चुनें (करेंट अफेयर्स / आज का दिन / अपना पाठ) → **प्रश्न बनाएँ** → अच्छे चुनें, ज़रूरत हो तो संपादित करें → **समीक्षा में भेजें**।
Admin → **Generate questions with AI** → pick a source (current affairs / important day / your own text) → **Generate** → keep the good ones, edit if needed → **Send to review**.
(claude.ai संस्करण में चलता है; अपनी वेबसाइट पर इसके लिए AI एंडपॉइंट चाहिए — README देखें। Works in the claude.ai version; your own website needs an AI endpoint — see README.)

## 4. करेंट अफेयर्स · Current affairs
एडमिन → **आज के समाचार देखें** → शीर्षक, श्रेणी, तारीख़, सारांश, परीक्षा तथ्य, स्रोत का नाम और लिंक (अंग्रेज़ी वैकल्पिक) → **समीक्षा के लिए भेजें**।
Admin → **Today's news** → title, category, date, summary, exam facts, source name and link (English optional) → **Send for review**.
तेज़ तरीका: मूल लेख पेस्ट करके **AI से भरें**, फिर हर तथ्य स्रोत से मिलाएँ। Faster: paste the original article, use **Fill with AI**, then check every fact against the source.

## 5. आज का दिन · Important days
एडमिन → **आज का दिन** → **नया दिवस जोड़ें**: तारीख़, प्रकार, नाम, वर्ष, इतिहास, उद्देश्य, तथ्य। इससे "कब मनाया जाता है?" जैसे प्रश्न अपने-आप बनते हैं।
Admin → **Today in History** → **Add an important day**: date, type, name, year, history, purpose, facts. Questions like "When is it observed?" are created automatically.

## 6. जाँच और प्रकाशन · Review and publish
1. **सामग्री की जाँच करें** → हर ड्राफ़्ट में **स्वचालित जाँच** देखें। ये बातें पकड़ी जाती हैं:
   - दोहराव (मिलते-जुलते प्रश्न)
   - एक जैसे विकल्प
   - स्रोत में सही उत्तर न मिलना
   - अंग्रेज़ी न होना
   - अध्याय टैग न होना

   **Review content** → read the **Automated checks** on each draft. They catch:
   - duplicates (similar questions)
   - identical options
   - an answer not found in the source
   - missing English
   - missing chapter tags
2. तीनों बिंदु टिक करें → **स्वीकृत करें** (गंभीर गलती हो तो बटन बंद रहता है)। Tick all three items → **Approve** (the button stays off on a blocking error).
3. **प्रकाशित करें** → तारीख़ चुनें → **प्रकाशित करें**। विद्यार्थियों को तुरंत दिखेगा। **Publish** → choose the date → **Publish**. Students see it immediately.

गलती ठीक करनी हो? प्रश्न बैंक → **संपादित करें** (फिर समीक्षा → प्रकाशन) या **इतिहास** से पुराना संस्करण वापस लाएँ। विद्यार्थियों की "त्रुटि रिपोर्ट" भी जाँच वाले पेज पर आती हैं।
Need a fix? Question bank → **Edit** (then review → publish), or restore an older version from **History**. Students' error reports also arrive on the review page.
