# MY QUIZ v3 — analysis and improvement plan

Source: the owner's 20-section brief ("MY QUIZ – Complete App Improvement & UI/UX Redesign Brief", 22 Nov 2026).
Goal: evolve the bilingual GK quiz into a personalised learning app built around
**LEARN → PRACTISE → UNDERSTAND → REVISE → COMPETE → IMPROVE**, without rebuilding what already works.

## 1. What exists today (v2, analysed)

| Layer | State | Keep / change |
|---|---|---|
| Runtime | One vanilla-JS PWA (`app.js`, built from `src/*.js`), three modes: standalone, claude.ai artifact, tester build | Keep: no framework, fast on budget Android phones |
| Content | 95 questions (7 subjects, flat `t` topic, `d` 1–3 mostly 1), 8 news items, 95 important days, all Hindi + English | Add chapters, exam tags, rich explanations, more intermediate/advanced questions |
| Learning engine | Practice sessions, timed mode, Leitner spaced repetition (due dates), mock exams with palette + negative marking | Keep engine; add custom exams, flashcards, revision hub, time tracking |
| Gamification | Points (anti-farming), streaks, 8 badges, weekly/monthly leaderboards, winners | Add levels, mastery, weekly challenge, friend challenge, revision rewards |
| Admin | AI → review checklist → publish; news/days/bank editors; reports; rewards | Add automated quality checks, tagging, translation queue, version history, import/export, analytics |
| Navigation | 5 tabs (Home, Quiz, Leaders, Saved, Profile) + home tiles | Move to 4 tabs: Home, Learn, Compete, Progress (+ profile/settings/notifications in top bar) |

Design inconsistencies found: four multi-colour gradient tiles compete with the main action; heavy bold (800) everywhere;
two display fonts; mixed radii (12/14/16/18/20/22); some 38 px buttons; home shows many equal-weight blocks with no
single "next step"; explanations are one paragraph; current affairs are a bottom sheet, not an article.

## 2. Priorities (educational value × UX impact ÷ effort)

**P0 — do first (core learning loop)**
1. Design system v3: tokens per brief (navy primary, sky secondary, green/amber/red, cool-grey background, charcoal text),
   Noto Sans + Noto Sans Devanagari, 8-pt spacing, 3 radii, 48 px controls, one icon family, fewer gradients.
2. Navigation: Home · Learn · Compete · Progress; avatar (profile + settings) and bell in the top bar. Old links keep working.
3. Taxonomy: subject → chapter → topic, difficulty (beginner/intermediate/advanced), exam tags
   (UPSC, SSC CGL, Banking, Railway, State PSC, NDA/CDS, School & college, GK); completion %, counts, coverage.
4. Home dashboard: one primary "next action", daily goal + streak, weekly progress, continue learning,
   recently studied, recommendations, daily challenge, weak topics.
5. Rich explanations: correct answer, explanation, background, why each other option is wrong, exam relevance,
   reference, related practice — Hindi and English.
6. Revision hub: due today (spaced repetition), mistakes, saved, flashcards, weak-topic revision, mastered vs not.
7. Onboarding: language → exam → daily goal → optional 5-question level check → personal plan.
8. Progress: accuracy, time per question, subject/chapter mastery, weak topics, attempt history, week-vs-week, badges.

**P1 — next**
9. Exam mode builder: choose subject/chapter/difficulty, count, time, negative marking; no answers until submit;
   result with subject-wise, accuracy and time analysis.
10. Current affairs as articles: date/time, source, summary, details, why it matters, background, exam facts,
    schemes/organisations, practice questions, save, listen (text-to-speech), PDF notes (print), daily/weekly/monthly
    views, archive, search, filters.
11. Aaj ka Din: 3–5 minute daily session with a 5-question challenge, story, facts, timeline, save/share, calendar.
12. Gamification: levels, subject mastery levels, weekly challenge (same set for everyone, one scored attempt,
    own board), friend challenge links, milestones, shareable achievements; points for revision and accuracy.
13. AI tutor: ask follow-ups about a question/topic/article in simple Hindi or English, grounded in the verified text,
    clearly labelled; chapter revision notes; never publishes anything.
14. Admin CMS: automated checks (duplicates, answer present in source, option sanity, missing translation),
    chapter/exam/difficulty tagging, translation queue, version history + restore, bulk import/export (JSON/CSV),
    content analytics (reports, hardest questions), second-editor approval option.

**P2 — later / needs a real backend (documented, not faked in the UI)**
15. Friends lists, private live rooms, communities, push reminders, payments (freemium), cross-device analytics
    (DAU, D1/D7/D30) — need accounts and a server (Firebase plan in README). Until then: link-based friend challenges,
    in-app reminders, offline banner, local event log.

Rules kept throughout: no placeholder buttons, every interaction works in all three modes, AI content never reaches
students without human review, readability over decoration.

## 3. Milestones (commit + push after each)

- [x] M0 Repo setup: `src/` parts, `tools/build.py`, tests in `tests/`, this plan, restart scheduled for 05:40 IST
- [x] M1 Data: chapters, exam tags, difficulty labels; rich explanations (why-wrong, background, reference) for all questions
- [x] M2 Design system v3 + 4-tab navigation + Home dashboard + Learn (subject → chapter → topic) + onboarding
- [x] M3 Practice explanation panel, revision hub + flashcards, Progress analytics, Compete hub
- [x] M4 Exam builder + result analysis, weekly challenge, friend challenge, AI tutor
- [x] M5 Current affairs articles (+ TTS, PDF notes, daily/weekly/monthly), Aaj ka Din daily session
- [x] M6 Admin CMS upgrades (quality checks, tagging, translations, history, import/export, analytics)
- [x] M7 UX states (offline, retry), accessibility pass, tests, publish both artifacts, README, summary

## 4. How to continue (for a fresh session)

```bash
cd /home/user/KanishkJoshi && git fetch origin ccr-d662c065-wz1ua7 && git checkout ccr-d662c065-wz1ua7 && git pull
cd myquiz-app && python3 tools/build.py          # src/*.js -> app.js
bash tests/run-all.sh                             # serves on :8765 and runs every suite
python3 tools/build_artifact.py . dist/myquiz.html && python3 tools/build_artifact.py . dist/myquiz-demo.html demo
```
Publish `dist/myquiz.html` to https://claude.ai/artifact/7nKiG4QDwQbLCMCWm91XfR and `dist/myquiz-demo.html` to
https://claude.ai/artifact/TYUHLNaspNcibKAUdXz7DY with `files` = data/*.json (keep the main artifact's db rules).

## 5. Progress log
- 01:15 IST — M0 done.
- Overnight — M1 done and pushed; the session paused (usage limit) during M2.
- 05:41 IST — resumed after the reset; finished M2–M7.
- 06:10 IST — all suites pass (standalone, artifact runtime, tester build, v2, v3 flows, 360px smoke in hi/en × light/dark); main app published as Version 5, tester build as Version 3.
