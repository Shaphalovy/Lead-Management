# Lumora Digital: Lead Form Website

## Run on your PC
1. Unzip the folder.
2. Open a terminal inside the folder and run: `python -m http.server 8000`
   (or open the folder in VS Code and use the "Live Server" extension).
3. Open http://localhost:8000

Without a webhook URL the form runs in DEMO mode (it shows success but sends nothing).

## Connect to n8n
1. Open `config.js` and paste your n8n **production** webhook URL into `WEBHOOK_URL`.
2. In the n8n Webhook node: Method = POST, Options > Allowed Origins (CORS) = `*`.
3. The workflow must be **Active** and the URL must contain `/webhook/` (not `/webhook-test/`).

## Fields sent to the webhook (JSON body)
`name, email, company, service, message, source, page_url, submitted_at`

In n8n, read them as `{{ $json.body.name }}`, `{{ $json.body.email }}` and so on.

## Deploy (public Website URL)
Drag the whole folder onto https://app.netlify.com/drop, or push it to GitHub Pages.
