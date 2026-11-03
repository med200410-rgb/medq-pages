# MedQ | Medical MCQ Builder

MedQ is an independent educational project that helps medical students turn lecture materials into difficult, source-grounded multiple-choice practice exams inside ChatGPT.

## Current project tracks

- **Private Skills-only plugin:** maintained separately in the ChatGPT workspace. Its current private release is v0.4.6.
- **Public Skills-only draft:** v0.5.2 remains a separate Developer Platform draft. OpenAI currently reports that it is not accepting more Skills-only submissions.
- **Hybrid development:** the `medq-hybrid-mcp` branch contains a new MCP exam engine and a separate Hybrid package source. It is not deployed or published yet.

## Hybrid MCP exam engine

The Worker validates exactly five distinct A-E choices, starts a short-lived encrypted session, grades one answer at a time, returns bilingual Arabic-English rationales only after incorrect answers, and calculates the final score.

The service receives generated question content only; it does not receive original lecture files. It does not call an AI API or use a database. Encrypted sessions expire after four hours. This is a study-practice service, not a proctored or high-stakes exam platform.

## Zero-dollar operating constraint

The Hybrid service is designed for Cloudflare Workers Free only. No OpenAI API key, paid hosting, paid database, payment method, or automatic upgrade is part of the implementation. Do not enable paid services without the publisher's explicit approval. Cloudflare Free quotas can limit availability; the service must fail rather than upgrade when limits are reached.

## Development status

The Hybrid branch is in preparation. Before a public submission:
1. Install dependencies and pass CI tests/type checking.
2. Deploy the Worker on Cloudflare Free and verify the real HTTPS MCP endpoint.
3. Configure the OpenAI domain challenge when supplied by the Developer Platform.
4. Test all MCP tools with MCP Inspector and the OpenAI portal.
5. Record and verify a real demo video, then add its reviewer-accessible URL.
6. Build a final public ZIP with the verified MCP endpoint and the approved MedQ icon.
7. Update and merge the public privacy/terms pages, then submit the Hybrid package for review.

See `mcp-server/README.md` for deployment and `hybrid-plugin/` for the separate package source.