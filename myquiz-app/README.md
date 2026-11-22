# MY QUIZ — bilingual GK learning app (v3)

A mobile-first, installable web app (PWA) for Indian competitive-exam students, built from the MY QUIZ design and grown
into a personalised learning app around **Learn → Practise → Understand → Revise → Compete → Improve**.

**v3 (22 Nov 2026)** follows the owner's 20-section improvement brief. The analysis, priorities and status are in
[docs/PLAN-v3.md](docs/PLAN-v3.md).
- **Navigation:** four sections (Home · Learn · Compete · Progress), with profile, settings and notifications in the top bar.
- **Home:** a personalised dashboard that puts one "next step" first.
- **Learn:** subject → chapter → topic, difficulty levels and exam filters.
- **Explanations:** why each wrong option is wrong, background, exam relevance and source.
- **Revision:** spaced repetition with flashcards.
- **Compete:** custom tests with negative marking, weekly challenges and friend challenges.
- **Progress:** analytics for accuracy, time, mastery and weak topics.
- **Onboarding:** first-run setup with a level check.
- **Current affairs:** articles with listen-aloud and PDF notes.
- **Aaj ka Din:** a 3–5 minute daily session.
- **AI tutor:** answers grounded in the verified explanation.
- **Admin CMS:** quality checks, duplicate detection, tagging, translations, version history, import/export and analytics.

- **Live demo** (claude.ai artifact; private until you share it from its Share menu): https://claude.ai/artifact/7nKiG4QDwQbLCMCWm91XfR
- **Design review, competitor references and roadmap**: https://claude.ai/artifact/WAhSbCYv6oe3Le5PULqniZ
- **Tester build (demo)** to share with testers: https://claude.ai/artifact/TYUHLNaspNcibKAUdXz7DY (see [Tester build](#tester-build-demo))
- Everything in this folder runs as-is on any static host and no framework is needed. `app.js` is assembled from `src/*.js` by `python3 tools/build.py`; run that after editing anything in `src/`.

## Run it locally

```bash
cd myquiz-app
npx serve .                 # or: python3 -m http.server 8080
```

Open the printed URL on your phone or in a desktop browser at phone width. Opening `index.html` straight from disk won't load content: browsers block `fetch()` of the JSON data over `file://`.

Deploy by copying the folder to any static host (GitHub Pages, Netlify, Firebase Hosting, S3 + CloudFront). Over HTTPS it installs as an app and works offline after the first visit (`sw.js`).

## What's in the app

| Section | Routes | What works |
|---|---|---|
| First run | `#welcome` | Language → exam (UPSC, SSC CGL, Banking, Railway, State PSC, NDA/CDS, School & college, GK) → daily goal → optional 5-question level check → personal plan |
| **Home** | `#home` | Greeting, exam and goal; one **next step** (resume, daily challenge, due revision, weak topic or next chapter) with the goal ring and streak; this week's bars, accuracy, points and rank; continue learning; recommendations; weak topics; today's current affairs and Aaj ka Din |
| **Learn** | `#learn`, `#subject/<id>`, `#chapter/<id>` | 8 subjects → chapters → topics, each with completion %, accuracy and a mastery level. Filter by exam and by difficulty (beginner/intermediate/advanced). Practice mode (instant feedback) or exam mode (timed, answers at the end). Topic-wise question bank with attempt status, flashcards, AI notes and printable notes, search |
| Practice | `#play` | Instant right/wrong with icons and text (not colour alone). The explanation covers the correct answer, why every other option is wrong, background, exam relevance, difficulty and the source. Also: related practice, "Explain more with AI", the **AI tutor** chat, bookmark, report, share, Hindi/English switch, timed mode, keyboard shortcuts |
| Revision | `#revise`, `#cards`, `#bookmarks` | Spaced repetition (1/3/7/14/30 days) with due-today sessions, flashcards (self-graded, update the schedule), mistakes collection, saved questions/news/days, chapter mastery summary, weak-topic revision |
| Current affairs | `#ca`, `#news/<id>`, `#ca-notes/<scope>` | Today / Week / Month / Archive / Saved views, search and category filters. Articles have a summary, details, why it matters, background, exam facts, related schemes and organisations, the source link, practice questions, listen (text-to-speech), save, share and PDF notes. Weekly and monthly revision quizzes and notes |
| Aaj ka Din | `#today` | A 3–5 minute session: read the story → 5-question challenge → flashcards. Also purpose and facts, anniversaries around the date, the month's timeline, the coming days, a calendar, save and share |
| **Compete** | `#compete`, `#mock`, `#exam`, `#builder`, `#challenge/<code>`, `#leaders` | Daily challenge; **weekly challenge** (same 15 questions for everyone, first attempt counts); mock tests; **test builder** (subject, chapter, level, count, time, marking +1/0, +1/−¼, +1/−⅓, +2/−½); **friend challenges** by link or code; weekly/monthly leaderboards and winners. Exam mode has a palette, mark for review, skip, previous/next, submit confirmation, auto-submit, and subject-wise, accuracy and time analysis |
| **Progress** | `#progress` | Level and points, answers, accuracy, seconds per question, streaks, this week vs last week, subject mastery, weak topics, test trend, 11 achievements (shareable), recent answer history |
| Profile & settings | `#profile` | Name, exam, daily goal, language, text size, theme, leaderboard name and visibility, reset |
| Admin | `#admin…` | AI questions (Hindi + English) → **automated checks** (options, answer, duplicates, answer present in source, translation, tags, notes, reference) → human checklist → publish. Also: tagging (chapter, exam, difficulty), wrong-option notes, background and reference in the editor; **translation queue**; **version history** with restore; **import/export** (CSV/JSON → drafts); **analytics**; an option for a second editor's approval; news, days, rewards, reports |

## How the code is organised

```
myquiz-app/
├── index.html            styles (design system v3 tokens, light + dark), icon sprite, app shell
├── app.js                the built app (do not edit by hand) — assembled from src/
├── src/                  01-constants … 14-router-boot: content store, progress, engines, views, admin, tester
├── tools/                build.py, build_artifact.py, content/ (scripts that enriched the question and news data)
├── tests/                run-all.sh + Playwright suites (standalone, artifact mock, tester build, v2/v3 features, smoke)
├── docs/PLAN-v3.md       analysis, priorities and status of the v3 brief
├── data/questions.json   95 questions: chapter, difficulty, explanation, why each wrong option is wrong, background, reference (Hindi + `en`)
├── data/news.json        8 real current-affairs items (Sep–Nov 2026) with source, details, why it matters, background, schemes, organisations (Hindi + `en`)
├── data/days.json        95 important days across the year: history, purpose, exam facts (Hindi + `en`)
├── manifest.webmanifest  install metadata
├── sw.js                 offline cache (app shell, content, fonts)
└── icons/                app icons (SVG + PNG + maskable)
```

**Content model.** Learners see the built-in JSON plus a *live layer* of admin-published items. A live item with the same `id` replaces the built-in one (that's how editors fix a question). `hidden: true` removes it. `publishAt` schedules it for a future date.

**Two runtimes, one codebase.**

| | Standalone (this folder) | claude.ai Artifact (the live demo) |
|---|---|---|
| Published content | `localStorage` (`mq.cms.pub`) | shared database `pub/{q,news,days}/items/*` |
| Drafts & review queue | `localStorage` (`mq.cms.drafts`) | `cms/drafts/items/*`: editors only |
| Learner error reports | `localStorage` | `reports/{userId}`: learner writes own, editors read all |
| Learner progress & points | `localStorage` (`mq.progress`) | `data/users/{userId}/progress`: private per learner, synced across devices |
| Leaderboard entry | this device only | `lb/{userId}`: display name + point totals only; each learner writes their own, everyone reads |
| Prizes, winners, hidden names | `localStorage` | `pub/settings/items/rewards`, `pub/winners/items/*`, `pub/settings/items/lbhide`: editors write, everyone reads |
| Admin access | open (demo) | owner and editors only |
| AI | optional: your endpoint (below) | Claude, through the artifact runtime |

**Learner progress** stores, per question: correct and wrong counts, last result, and a Leitner box with a due date (0/1/3/7/14/30 days). It also keeps daily counts (goal ring and streak, which needs ≥ 5 answers/day), points per day, badges, bookmarks, mock history and settings (including language).

## Language (हिंदी / English)

- Every screen string is written as a Hindi/English pair; the choice is saved with the learner's progress (so it follows them across devices in the artifact version).
- Content records carry an `en` object: questions `{q, o, e, t}`, news `{title, summary, facts, src}`, days `{t, h, o, f}`. When a translation is missing the app shows the Hindi text, so English is optional for new content.
- Switching language in the middle of a quiz keeps the answers: Hindi and English options are shuffled together, so the correct option is the same in both.
- The AI generator and "fill news with AI" produce both languages; the editors' forms have optional English fields, and the review screen shows the English version under the Hindi one.

## Reward points and leaderboards

| Action | Points |
|---|---|
| Correct answer (first attempt of that question that day) | +10 (+2 more in timed mode) |
| Wrong answer (effort) | +1 |
| Daily quiz completed / all correct | +20 / +20 |
| Daily goal reached | +20 |
| Streak bonus (once a day) | +5 × streak days, max 50 |
| Mock test (once per test per day) | score × 3 |

- **Fair play:** a question earns points only once per day, bonuses once per day, and at most 600 points a day.
- **Boards:** weekly (Monday–Sunday) and monthly. *Last week* is built automatically from everyone's saved totals, so there is a ready "top students of the week" dashboard every Monday. Editors press **Announce winners** to freeze the top 10 into the *Winners* tab with the prize text; winners get a "Top 3" badge.
- **Privacy:** the leaderboard document holds only a display name and point totals. There are no profile pages for other students, no answers and no progress. Learners can set a display name or hide themselves; editors can hide inappropriate names.
- **Badges:** first step, 3- and 7-day streaks, 100 answers, 80% accuracy, first mock, 1,000 points, top-3 winner.

**Important (claude.ai version):** claude.ai only lets people with *Contributor* access or higher write to an artifact's database. Viewers can play, but their points stay on their device and don't reach the shared leaderboard (the app tells them so). That's fine for a pilot with your team or a small batch. For thousands of real students, use the production backend below.

## Admin workflow

1. **Source**: pick a current-affairs item or an important day, or paste any article.
2. **AI drafts** MCQs. The prompt forbids facts that aren't in the source text, and malformed output (wrong option count, duplicate options, bad answer index) is dropped automatically.
3. **Review**: each draft shows its source text. *Approve* stays disabled until the reviewer ticks every checklist item: facts verified, one correct option, explanation correct.
4. **Publish** now or from a chosen date. Published items reach every learner immediately.
5. **Feedback**: "त्रुटि बताएँ" (report an error) reports from learners land in the review screen, where editors fix or hide the question.

### Connect your own AI in the standalone build

Keep your LLM API key on a server, never in the app. Expose an endpoint that accepts `POST {"prompt": "…"}` and returns `{"text": "…"}`, then add this before `app.js` in `index.html`:

```html
<script>window.MYQUIZ_CONFIG = { aiEndpoint: "https://api.your-company.in/myquiz/generate" };</script>
```

The admin generator then expects JSON in `text` (questions in Hindi with an `en` translation), and learner explanations come back as plain text in the learner's language.

## Tester build (demo)

The same code has a tester mode for QA. It's switched on by `window.MYQUIZ_CONFIG = { demo: true }`, or by adding `?demo=1` to the URL on any static host, e.g. `https://your-host/myquiz-app/?demo=1`.

- **Isolated:** progress, points, bookmarks and every admin change stay in the tester's own browser. Testers can publish, hide, announce winners and edit freely without touching real content. The leaderboard shows clearly labelled sample students so it can be tried alone.
- **Test bar:** a striped yellow bar on every screen with **बग बताएँ** (report a bug) and **टेस्ट** (the checklist).
- **Test checklist (`#test`):** 27 cases covering home, quiz, current affairs, Aaj ka Din, mock tests, settings, admin, navigation and the v2 features (language switch, points, leaderboard, prizes/winners), in Hindi or English. Each case has steps and the expected result, plus **ठीक चला** (pass), **गड़बड़ है** (fail, which opens the bug form) and **छोड़ें** (skip).
- **Bug reports** automatically include the screen and, during a quiz or exam, the question ID and text. They also include the device and browser, the tester's last 15 steps, and any JavaScript errors caught. Reports are kept on the device and sent to you through a WhatsApp link (`wa.me`) or copied as text. **पूरी रिपोर्ट भेजें** sends the whole checklist result plus all bugs in one message.
- **Inbox:** in the claude.ai artifact, testers you invite as editors also send results straight to a private **टेस्टर इनबॉक्स** (`#test-inbox`, readable only by you and editors).
- **Reset:** "ऐप डेटा रीसेट करें" restarts the app from scratch and keeps the checklist and bug reports.

## Content notes

- The question bank, explanations and day entries were written and fact-checked for this prototype. Current-affairs items are real events from Sep–Nov 2026, each linked to its source (AIR/newsonair, ISRO, Down To Earth and others).
- In the source data, B was the correct answer for 60% of questions and D never was. The app therefore shuffles options per sitting (numeric options are sorted instead), so learners can't game answer positions. Keep doing this for new content too.
- No photos of real people are used; current-affairs thumbnails are category illustrations. Licence any photos before adding them.

## Path to production (suggested)

1. **Accounts and sync**: phone-OTP login (Firebase Auth or Supabase), with the same data model as the artifact version above.
2. **Leaderboard you can pay prizes on**: in this prototype points are counted on the learner's device, which is fine for engagement but can be faked by a determined user. Before giving real money or vouchers, move scoring to the server: the app sends each answer to a Cloud Function that checks it against the answer key and updates `lb/{uid}` (Firestore rules: learners read `lb`, nobody writes it directly). A scheduled function every Monday 00:00 IST (and on the 1st of each month) freezes the winners.
3. **Server-side AI**: a Cloud Function that calls your LLM with the same prompt and validation. Store source, prompt, output, reviewer and decision for audit.
4. **Notifications**: a daily reminder at a time the learner picks (web push / FCM), plus an evening "streak at risk" nudge and a Monday "winners announced" message. (Today the app shows due revision and challenges in-app on Home and in the bell.)
5. **Android**: ship this PWA as a Trusted Web Activity on Play Store now; move to Flutter/React Native only if you need deeper native features.
6. **Analytics**: track D1/D7/D30 retention, daily-quiz completion, streak length, and mock-to-paid conversion.

## Not built yet (needs accounts and a server)

These parts of the brief are deliberately not faked in the UI. They need the production backend above:
- **Social:** friend lists, live private quiz rooms, communities and moderated chat (with age-appropriate safety controls). Friend challenges already work today through a link or code.
- **Monetisation (freemium):**
  - Free: daily quiz, basic banks, Aaj ka Din, limited current affairs, basic progress.
  - Premium: full banks, advanced mocks, complete notes, advanced analytics, smart revision, AI tutor, downloads.
  - Payments and entitlement checks belong on the server (for example Razorpay with Firebase custom claims).
  - No ads during exams, questions or explanations.
- **Product analytics:** DAU, D1/D7/D30 retention, completion and revision rates, accuracy improvement, crash-free sessions and referrals. These need an event pipeline (for example Firebase Analytics or BigQuery). The admin Analytics screen shows content quality and leaderboard activity today.
- **Regional languages:** every string is a Hindi/English pair today. The next step is moving the pairs into per-language files (`hi`, `en`, then `mr`, `bn` …).

