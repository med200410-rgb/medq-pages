# MedQ Exam Engine (MCP)

A stateless MCP service that complements the MedQ medical-MCQ Skill. ChatGPT reads the student's supplied lecture and generates source-grounded questions. This service validates the question structure, keeps the answer key private inside an encrypted session token, grades one answer letter at a time, and returns the next question and final score.

## Data boundary

The service receives only generated question stems, five options, correct-answer letters, and short rationales. It does not receive original lecture files, full chat transcripts, student names, or email addresses. Session state is AES-GCM encrypted into a four-hour token. No database, KV, D1, R2, Durable Object, AI API, or application-level request-body logging is used. The token is the session carrier and must be kept private by the ChatGPT Skill. Because this design is stateless, the server cannot maintain cross-session history or independently prevent a caller from replaying an earlier valid token; the Skill must always use the latest token returned by the tool. Cloudflare still processes HTTPS requests as hosting provider, and its platform-level processing is governed by its own policies. Do not put patient-identifiable information into exam questions.

## Local tests

Node.js 22+:
- `npm install`
- `npm test`
- `npm run typecheck`
- `npm run dev`

## Free-only deployment

This Worker targets Cloudflare Workers Free. Current published limits include 100,000 Worker requests per day and 10 ms CPU per invocation; provider limits can change. If a free limit is reached, requests should fail rather than trigger a paid upgrade. Do not add a payment method, enable a paid plan, or turn on automatic upgrades for MedQ.

1. Sign in to Cloudflare and keep the account on the Free plan.
2. Connect this GitHub repository and branch `medq-hybrid-mcp` to Workers Builds; set the root directory to `mcp-server`.
3. Set `MEDQ_SESSION_KEY` as a Worker Secret (32 random bytes, base64 encoded); never commit it.
4. Deploy with `npm run deploy`.
5. Test the endpoint `https://<worker>.<account>.workers.dev/mcp` with MCP Inspector.
6. Only after the OpenAI portal provides a domain challenge token, set `OPENAI_APP_CHALLENGE` as a Worker variable/secret. The Worker serves it at `/.well-known/openai-apps-challenge`.

No OpenAI API key is required or used. Do not enable any paid service without the publisher's explicit approval.
