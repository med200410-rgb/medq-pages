# MedQ Hybrid demo recording checklist

Record the real deployed version after the MCP endpoint is connected, scanned, and tested. Use a clean test conversation and sample lecture fixtures. Do not show passwords, API keys, session tokens, patient data, private lecture files, or unrelated account content.

1. Show the MedQ Hybrid plugin name and the sample lecture fixture.
2. Start a 10-question exam. Show the count-only setup and Question 1 with exactly five distinct A-E options, displayed once.
3. Answer one question correctly. Show Correct / صحيح and the next question without an unsolicited explanation.
4. Answer another question incorrectly. Show the correct letter and concise rationale in Iraqi Arabic mixed with English medical terms, followed by the next question.
5. Show one boundary case: ask for only four options and demonstrate that MedQ explains the fixed five-option requirement without starting an exam.
6. Show the final score after completing a short round.
7. Play back the recording and confirm that the prompts and results are readable and no secrets are exposed.

Upload the actual recording to a reviewer-accessible HTTPS location. Verify playback in a private browser window before setting `review.demo_recording_url`. A script, mockup, or local recording without an accessible URL does not satisfy the demo requirement.