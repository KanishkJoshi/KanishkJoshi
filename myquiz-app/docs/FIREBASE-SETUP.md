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
       authDomain: 'myquiz-xxxx.firebaseapp.com',
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

## 5. Allow your website's domain
**Authentication → Settings → Authorized domains → Add domain** → your site, for example `quiz.yourcompany.in`.
(`*.web.app` and `*.firebaseapp.com` from Firebase Hosting are already allowed.)

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

## 8. Check it
1. Open the site → **Continue with Google** → choose your account → onboarding → Home.
2. Open **Profile**: you should see your Google account and role *Owner (admin)*.
3. **Admin panel → GK question bank → Add a new question → Review → Publish**, then open the app as a student
   (another Google account or a private window): the question is there.

## Costs and limits
- The free **Spark** plan covers a pilot. Firestore allows 50,000 document reads and 20,000 writes per day and
  1 GiB of storage.
- Each app open reads published content and the leaderboard. For thousands of daily students, switch to the
  pay-as-you-go **Blaze** plan and move leaderboard totals and points to Cloud Functions (server-side scoring).
  That second step also makes prizes cheat-proof (see README → Path to production).

## Optional settings (`config.js`)
| Key | Meaning |
|---|---|
| `allowGuest: true` | Also shows "Continue without signing in" (progress stays on that phone, no leaderboard). |
| `privacyUrl: 'https://…'` | Adds a privacy-policy link on the sign-in screen (needed for the Play Store). |
| `aiEndpoint: 'https://…'` | Your server endpoint for the AI features (see README). |
