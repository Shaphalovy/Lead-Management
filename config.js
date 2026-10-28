// ============================================================
//  ONLY FILE YOU NEED TO EDIT
//  Paste your n8n PRODUCTION webhook URL below, e.g.
//  "https://your-machine.your-tailnet.ts.net/webhook/lead-form"
//  (use the /webhook/ URL, NOT /webhook-test/, once the workflow is Active)
//  Leave it empty to run in DEMO mode (form works, nothing is sent).
// ============================================================
window.APP_CONFIG = {
  WEBHOOK_URL: "https://war-machine.tail2c1be4.ts.net/webhook/lead-form",
  TIMEOUT_MS: 15000,
  MIN_SECONDS_ON_PAGE: 3,   // bots submit faster than this
  COOLDOWN_SECONDS: 30      // blocks repeat submits from the same browser
};
