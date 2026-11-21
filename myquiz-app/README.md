# MY QUIZ — Hindi GK quiz app (working prototype)

A mobile-first, installable web app (PWA) built from the MY QUIZ design. It covers the six designed screens, plus the screens the design implies but doesn't show: mock-test engine, results, bookmarks and profile.

The admin panel has a real pipeline. AI drafts questions from a source text, a human reviews them against a checklist, and only then are they published to learners.

- **Live demo** (claude.ai artifact; private until you share it from its Share menu): https://claude.ai/artifact/7nKiG4QDwQbLCMCWm91XfR
- **Design review, competitor references and roadmap**: https://claude.ai/artifact/WAhSbCYv6oe3Le5PULqniZ
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
| Results | `#result` | Score ring, accuracy, time, XP, retry wrong/skipped, full answer review, share score |
| Current Affairs | `#ca` | Date-grouped feed, category filter, detail sheet with exam one-liners and source link, quiz from a single news item, CA quiz, bookmark |
| आज का दिन | `#today` | Today's observance(s) with history, purpose and facts; previous/next day, month calendar, upcoming days; questions auto-generated from the calendar |
| अभ्यास परीक्षा (mock) | `#mock`, `#exam` | Exam-style UI: countdown, question palette, mark for review, clear response, negative marking, auto-submit at time-up, resume after leaving |
| Mock result | `#exam-result` | Score with negative marking, subject-wise bars, full solutions |
| Bookmarks | `#bookmarks` | Saved questions (practise them as a set) and saved news |
| Profile | `#profile` | Name, target exam, daily goal, stats, 7-day activity chart, subject mastery, font size, theme, reset |
| Admin | `#admin…` | Dashboard, news manager (with AI fill from a pasted article), important-days manager, **AI question generator**, review queue with mandatory checklist, learner error reports, question bank (edit/hide built-in questions), scheduled publishing |

## How the code is organised

```
myquiz-app/
├── index.html            styles (design tokens, light + dark), icon sprite, app shell
├── app.js                the whole app: content store, progress, quiz/exam engines, views, admin CMS
├── data/questions.json   95 hand-written, fact-checked questions with explanations
├── data/news.json        8 real current-affairs items (Sep–Nov 2026), each with a source URL
├── data/days.json        95 important days across the year (history, purpose, exam facts)
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
| Learner progress | `localStorage` (`mq.progress`) | `data/users/{userId}/progress`: private per learner, synced across devices |
| Admin access | open (demo) | owner and editors only |
| AI | optional: your endpoint (below) | Claude, through the artifact runtime |

**Learner progress** stores, per question: correct and wrong counts, last result, and a Leitner box with a due date (0/1/3/7/14/30 days). It also keeps daily counts (goal ring and streak, which needs ≥ 5 answers/day), bookmarks, mock history and settings.

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

The admin generator then expects JSON in `text`, and the learner explanations take plain Hindi text.

## Content notes

- The question bank, explanations and day entries were written and fact-checked for this prototype. Current-affairs items are real events from Sep–Nov 2026, each linked to its source (AIR/newsonair, ISRO, Down To Earth and others).
- In the source data, B was the correct answer for 60% of questions and D never was. The app therefore shuffles options per sitting (numeric options are sorted instead), so learners can't game answer positions. Keep doing this for new content too.
- No photos of real people are used; current-affairs thumbnails are category illustrations. Licence any photos before adding them.

## Path to production (suggested)

1. **Accounts and sync**: phone-OTP login (Firebase Auth or Supabase), with the same data model as the artifact version above.
2. **Server-side AI**: a Cloud Function that calls your LLM with the same prompt and validation. Store source, prompt, output, reviewer and decision for audit.
3. **Notifications**: a daily reminder at a time the learner picks (web push / FCM), plus an evening "streak at risk" nudge.
4. **Android**: ship this PWA as a Trusted Web Activity on Play Store now; move to Flutter/React Native only if you need deeper native features.
5. **Analytics**: track D1/D7/D30 retention, daily-quiz completion, streak length, and mock-to-paid conversion.
