# CarDex Cloudflare Worker Proxy

Secure serverless proxy for Google Gemini 3.8 Flash vision identification.

## Architecture

```
CarDex Mobile Client (Expo)
  ↓  HTTPS POST (base64 image payload)
Cloudflare Worker (proxy/worker.ts)
  ↓  Gemini REST API with server-stored secret
Google Gemini 3.8 Flash (Structured JSON output)
  ↓  Validated CarDex JSON response
CarDex Mobile Client (Expo)
```

## Security & Secrets

The Gemini API key **NEVER** touches client source code, Expo config, or Git commits.

### Setting the Secret in Cloudflare

Run this command inside the `proxy` directory:
```bash
npx wrangler secret put GEMINI_API_KEY
```
When prompted, paste your Google AI Studio API key securely into the terminal.

## Local Development / Dry Run

To run the local worker development server:
```bash
npx wrangler dev
```

To deploy to Cloudflare:
```bash
npx wrangler deploy
```

Once deployed, set the worker URL in your Expo environment:
```bash
# In client .env or environment:
EXPO_PUBLIC_API_URL=https://cardex-proxy.<your-subdomain>.workers.dev/identify
```
