# Turn on Google sign-in (Firebase) — one-time setup, about 20 minutes

**सार (Hindi):** Google लॉगिन और सभी विद्यार्थियों के लिए ऑनलाइन डेटा (प्रगति, लीडरबोर्ड, एडमिन की अपलोड की गई सामग्री) के लिए एक मुफ़्त Firebase प्रोजेक्ट चाहिए। नीचे के 8 चरण एक बार करें: प्रोजेक्ट बनाएँ → Google साइन-इन चालू करें → Firestore बनाएँ और नियम लगाएँ → ख़ुद को मालिक (owner) बनाएँ → `config.js` में कॉन्फ़िग चिपकाएँ → साइट डिप्लॉय करें।

What you get after this: the app opens on a **"Continue with Google"** screen. Each student's progress is saved
to their Google account (every device), the leaderboard covers all students, and everything admins upload is
shown to every student immediately.

> The claude.ai links keep working as before (claude.ai has its own sign-in). This setup is for your own website
> or Play Store app.

## 1. Create the project
1. Open https://console.firebase.google.com and sign in with your company Google account.
2. **Add project** → name it (for example `myquiz`) → Google Analytics is optional → **Create**.

## 2. Register the web app and copy its config
1. Project **Settings** (gear icon) → **General** → *Your apps* → **Web** (`</>`) → give a nickname → **Register app**.
2. Copy the `firebaseConfig` values into **`config.js`** in this folder:
   ```js
   window.MYQUIZ_CONFIG = Object.assign({
     firebase: {
       apiKey: 'AIza…',
       authDomain: 'myquiz-xxxx.firebaseapp.com',   // change to your own domain in step 5
       projectId: 'myquiz-xxxx',
       appId: '1:1234…:web:abcd…',
     },
   }, window.MYQUIZ_CONFIG || {});
   ```
   These values are public identifiers, not secrets. Access is controlled by the security rules in step 4.

## 3. Turn on Google sign-in
**Build → Authentication → Get started → Sign-in method → Google → Enable**, choose the support email, **Save**.

## 4. Create the database and its rules
1. **Build → Firestore Database → Create database** → *Production mode* → location **asia-south1 (Mumbai)** → **Enable**.
2. Open the **Rules** tab, replace everything with the contents of [`firestore.rules`](../firestore.rules), **Publish**.
   The rules make sure:
   - students can read and write only their own progress;
   - the leaderboard holds only names and point totals;
   - only admins can publish content or see drafts and reports.

## 5. Allow your website's domain (and make login work inside the Play Store app)
1. **Authentication → Settings → Authorized domains → Add domain** → your site, for example `quiz.yourcompany.in`.
   (`*.web.app` and `*.firebaseapp.com` from Firebase Hosting are already allowed.)
2. In `config.js`, set `authDomain` to **the domain the app is served from** (for example `quiz.yourcompany.in`),
   not `…firebaseapp.com`. Browsers that block third-party storage, and the Play Store app (a Trusted Web Activity,
   which signs in with a full-page redirect), need the sign-in helper on the app's own domain. Firebase Hosting
   serves that helper at `/__/auth/handler` automatically.
3. Google Cloud console (same project) → **APIs & Services → Credentials** → *Web client (auto created by Google
   Service)* → **Authorized redirect URIs** → add `https://quiz.yourcompany.in/__/auth/handler` → **Save**.

See Firebase's [redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## 6. Make yourself the owner (first admin)
1. **Firestore Database → Data → Start collection** → Collection ID: `admins`.
2. **Document ID:** your Google email in lowercase, for example `owner@gmail.com`.
3. Add a field `owner` of type *boolean* set to `true`, and **Save**.

After you sign in to the app with that account, open **Profile → Admin panel → Admin team** to add more admins by
email. Only the owner can add or remove admins.

## 7. Put the app online
**Option A — Firebase Hosting (recommended, free):**
```bash
npm install -g firebase-tools        # needs Node.js
firebase login
cd myquiz-app
firebase use --add                   # pick your project
firebase deploy                      # uploads the app and the Firestore rules
```
Your app is live at `https://<project-id>.web.app`. To use your own domain: Hosting → *Add custom domain*.

**Option B — any static host:** upload the folder (without `src/`, `tools/`, `tests/`, `docs/`) and add the domain in step 5.

**Policy pages and the Play Store files** (deployed with the app):
- `privacy.html` and `delete-account.html`: replace every `[PLACEHOLDER]` (company name, contact email, region,
  date), then set `privacyUrl: 'https://quiz.yourcompany.in/privacy.html'` in `config.js`. Google Play asks for both
  addresses (privacy policy, and the account-deletion link in the Data safety form).
- `.well-known/assetlinks.json`: the file PWABuilder generates for the Play Store package. `firebase.json` deploys
  the `.well-known` folder (it is no longer ignored as a dotfile). Add the SHA-256 of the Play app-signing key from
  Play Console → App integrity next to the one PWABuilder wrote, or the Play app shows a browser address bar.
- Students can delete their account in the app (**Profile → Delete my account**): it removes their progress,
  leaderboard entry, error reports and login. `firestore.rules` lets each student delete their own documents.

## 8. Check it
1. Open the site → **Continue with Google** → choose your account → onboarding → Home.
2. Open **Profile**: you should see your Google account and role *Owner (admin)*.
3. **Admin panel → GK question bank → Add a new question → Review → Publish**, then open the app as a student
   (another Google account or a private window): the question is there.

## Costs and limits
- The free **Spark** plan allows 50,000 document reads and 20,000 writes per day and 1 GiB of storage. With the
  app as it is today, that covers a pilot of up to about 100 active students a day.
- Why not more: every time the app opens it reads **every student's leaderboard entry**, and each answered
  question saves the student's progress and leaderboard total (2 writes). Reads therefore grow with
  students × app opens. Example: 300 students opening the app twice a day ≈ 180,000 reads a day, well over the
  free limit. On the pay-as-you-go **Blaze** plan the bill would grow faster than the number of students.
- Before a bigger launch: load only the top 100 of the leaderboard plus each student's own entry, save totals at
  the end of each quiz instead of after every answer, and move points and leaderboard totals to Cloud Functions
  (Blaze plan). Server-side scoring also makes prizes cheat-proof (see README → Path to production).

## Optional settings (`config.js`)
| Key | Meaning |
|---|---|
| `allowGuest: true` | Also shows "Continue without signing in" (progress stays on that phone, no leaderboard). |
| `privacyUrl: 'https://…'` | Adds a privacy-policy link on the sign-in screen (needed for the Play Store). |
| `aiEndpoint: 'https://…'` | Your server endpoint for the AI features (see README). |
