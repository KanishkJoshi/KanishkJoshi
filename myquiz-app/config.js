/* MY QUIZ configuration for the self-hosted app (this file is not used by the claude.ai versions).
 *
 * Google sign-in + shared online data (progress, leaderboard, admin uploads) need a free Firebase project.
 * Follow docs/FIREBASE-SETUP.md, then paste your project's web config below and redeploy.
 * While `firebase` is missing, the app runs offline-only: no sign-in, data stays in the browser.
 */
window.MYQUIZ_CONFIG = Object.assign({
  // firebase: {
  //   apiKey: 'AIza…',
  //   authDomain: 'quiz.yourcompany.in',   // the domain the app is served from (FIREBASE-SETUP.md step 5)
  //   projectId: 'your-project',
  //   appId: '1:123…:web:abc…',
  // },
  // allowGuest: false,          // true = also show "Continue without signing in" (progress stays on the device)
  // privacyUrl: 'https://quiz.yourcompany.in/privacy.html',
  // adsense: { client: 'ca-pub-0000000000000000', slot: '0000000000' },   // AdSense: publisher ID + one display ad unit ID
  // aiEndpoint: 'https://…',    // optional: your server endpoint for AI features (see README)
}, window.MYQUIZ_CONFIG || {});
