/* MY QUIZ configuration for the self-hosted app (this file is not used by the claude.ai versions).
 *
 * Google sign-in + shared online data (progress, leaderboard, admin uploads) need a free Firebase project.
 * Follow docs/FIREBASE-SETUP.md, then paste your project's web config below and redeploy.
 * While `firebase` is missing, the app runs offline-only: no sign-in, data stays in the browser.
 */
window.MYQUIZ_CONFIG = Object.assign({
  // firebase: {
  //   apiKey: 'AIza…',
  //   authDomain: 'your-project.firebaseapp.com',
  //   projectId: 'your-project',
  //   appId: '1:123…:web:abc…',
  // },
  // allowGuest: false,          // true = also show "Continue without signing in" (progress stays on the device)
  // aiEndpoint: 'https://…',    // optional: your server endpoint for AI features (see README)
}, window.MYQUIZ_CONFIG || {});
