# MedQ Exam Engine (MCP)

A stateless MCP service that complements the MedQ medical-MCQ Skill. ChatGPT reads the student's uploaded lecture and generates source-grounded questions. This service validates question structure, hides the answer key, grades one letter at a time, and returns the next question and final score.

## Data boundary

The service receives only generated question stems, five options, correct-answer letters, and rationales. It does not receive original lecture files, chat transcripts, student names, or email addresses. Session state is AES-GCM encrypted into a four-hour token. No database, KV, D1, R2, Durable Object, AI API, or application-level request-body logging is used. Cloudflare still processes HTTPS requests as hosting provider; the public privacy policy must disclose this before launch. Do not put patient-identifiable information into exam questions.

## Local tests

Node.js 22+:
- `npm install`
- `npm test`
- `npm run typecheck`
- `npm run dev`

## Free-only deployment

This Worker is intended for Cloudflare Workers Free only. Published limits include 100,000 requests/day and 10 ms CPU per invocation; provider limits can change. On reaching free limits, the service should fail rather than upgrade. Do not add a payment method, enable a paid plan, or turn on automatic upgrades for MedQ.

1. Sign in to Cloudflare and remain on Free.
2. Connect this GitHub repository and branch `medq-hybrid-mcp` to Workers Builds; set root directory to `mcp-server`.
3. Use `npm run deploy` as the deploy command.
4. Set `MEDQ_SESSION_KEY` as a Worker Secret (32 random bytes, base64 encoded); never commit it.
5. After deployment, test `https://<worker>.<account>.workers.dev/mcp` with MCP Inspector.
6. Only after the OpenAI portal supplies a domain challenge token, set `OPENAI_APP_CHALLENGE` as a Worker variable. It is served at `/.well-known/openai-apps-challenge`.

No OpenAI API key is required or used.