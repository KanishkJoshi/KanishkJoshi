# MY QUIZ — Hindi + English GK quiz app (v2)

A mobile-first, installable web app (PWA) built from the MY QUIZ design. It covers the six designed screens, plus the screens the design implies but doesn't show: mock-test engine, results, bookmarks and profile.

**New in v2:** the whole app and all content in **हिंदी or English** (switch in Profile → Settings, or the हिं/EN button on any question), **reward points** for every quiz, **weekly and monthly leaderboards** with prizes, winner announcements and badges. Students see only names and points, never another student's profile.

The admin panel has a real pipeline. AI drafts questions from a source text, a human reviews them against a checklist, and only then are they published to learners.

- **Live demo** (claude.ai artifact; private until you share it from its Share menu): https://claude.ai/artifact/7nKiG4QDwQbLCMCWm91XfR
- **Design review, competitor references and roadmap**: https://claude.ai/artifact/WAhSbCYv6oe3Le5PULqniZ
- **Tester build (demo)** to share with testers: https://claude.ai/artifact/TYUHLNaspNcibKAUdXz7DY (see [Tester build](#tester-build-demo))
- Everything in this folder runs as-is on any static host, with no build step and no framework.

## Run it locally

```bash
cd myquiz-app
npx serve .                 # or: python3 -m http.server 8080
```

Open the printed URL on your phone or in a desktop browser at phone width. Opening `index.html` straight from disk won't load content: browsers block `fetch()` of the JSON data over `file://`.

Deploy by copying the folder to any static host (GitHub Pages, Netlify, Firebase Hosting, S3 + CloudFront). Over HTTPS it installs as an app and works offline after the first visit (`sw.js`).

## What's in the app

| Area | Route | What works |
|---|---|---|
| Home (होम) | `#home` | Greeting with the learner's name, daily goal ring, streak, daily quiz (10 Q: latest current affairs + today's day + unseen bank questions), 4 section tiles, "revise your mistakes" card, today's topic chips, latest news, notifications |
| Quiz – विषय चुनें | `#quiz` | 8 subjects with real counts, per-subject progress and accuracy, practice vs timed mode (30 s/Q), 10/20/all questions, search across the bank |
| Question player | `#play` | Instant right/wrong feedback, explanation, **"AI से और समझें"** (Claude explains, when available), bookmark, share, report an error, keyboard shortcuts (1–4 / A–D, ←/→), answer options shuffled per sitting |
| Results | `#result` | Score ring, accuracy, time, **points earned with a breakdown** (questions, daily quiz, goal, streak), retry wrong/skipped, full answer review, share score |
| Current Affairs | `#ca` | Date-grouped feed, category filter, detail sheet with exam one-liners and source link, quiz from a single news item, CA quiz, bookmark |
| आज का दिन | `#today` | Today's observance(s) with history, purpose and facts; previous/next day, month calendar, upcoming days; questions auto-generated from the calendar |
| अभ्यास परीक्षा (mock) | `#mock`, `#exam` | Exam-style UI: countdown, question palette, mark for review, clear response, negative marking, auto-submit at time-up, resume after leaving |
| Mock result | `#exam-result` | Score with negative marking, points earned, subject-wise bars, full solutions |
| Bookmarks | `#bookmarks` | Saved questions (practise them as a set) and saved news |
| Leaderboard | `#leaders` | This week / last week / this month / winners. Podium for the top 3, your rank and points, prize banner, countdown to the reset. Rows are plain text: no profile links |
| Profile | `#profile` | Name, target exam, daily goal, **reward points** (today, week, month, history), **badges**, stats, 7-day activity chart, subject mastery, **language**, font size, theme, **leaderboard display name and show/hide**, reset |
| Admin | `#admin…` | Dashboard, news manager (with AI fill from a pasted article), important-days manager, **AI question generator** (writes Hindi + English), review queue with mandatory checklist, learner error reports, question bank (edit/hide built-in questions, optional English fields), scheduled publishing |
| Admin: rewards | `#admin-rewards` | Weekly/monthly prize text (Hindi + English), **announce last week's / last month's winners** (top 10 frozen into the Winners tab), hide inappropriate names, points rules |

## How the code is organised

```
myquiz-app/
├── index.html            styles (design tokens, light + dark), icon sprite, app shell
├── app.js                the whole app: content store, progress, quiz/exam engines, views, admin CMS
├── data/questions.json   95 hand-written, fact-checked questions with explanations (Hindi + `en`)
├── data/news.json        8 real current-affairs items (Sep–Nov 2026), each with a source URL (Hindi + `en`)
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
4. **Notifications**: a daily reminder at a time the learner picks (web push / FCM), plus an evening "streak at risk" nudge and a Monday "winners announced" message.
5. **Android**: ship this PWA as a Trusted Web Activity on Play Store now; move to Flutter/React Native only if you need deeper native features.
6. **Analytics**: track D1/D7/D30 retention, daily-quiz completion, streak length, and mock-to-paid conversion.
