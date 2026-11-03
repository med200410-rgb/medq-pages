export const ANSWER_LETTERS = ["A", "B", "C", "D", "E"] as const;
export type AnswerLetter = (typeof ANSWER_LETTERS)[number];
export type QuestionInput = { stem: string; options: Record<AnswerLetter, string>; correct_answer: AnswerLetter; rationale: string };
export type QuestionView = { number: number; total: number; stem: string; options: Record<AnswerLetter, string> };
export type ExamSession = { version: 1; index: number; score: number; expires_at: number; questions: QuestionInput[] };
export type AnswerResult = {
  correct: boolean; feedback: "Correct / صحيح" | "Incorrect / خطأ";
  correct_answer?: AnswerLetter; correct_option?: string; rationale?: string;
  next_question?: QuestionView; next_session_token?: string;
  completed: boolean; score?: number; total_questions: number; percentage?: number;
};
const MAX_SESSION_TOKEN_LENGTH = 350_000;
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
function normalizeOption(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}
export function validateQuestions(questions: QuestionInput[]): void {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) throw new Error("A MedQ exam must contain between 1 and 20 questions per session.");
  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q || typeof q.stem !== "string" || q.stem.trim().length < 8 || q.stem.length > 8000) throw new Error(`Question ${n}: invalid question stem.`);
    if (!q.options || typeof q.options !== "object" || Object.keys(q.options).sort().join(",") !== "A,B,C,D,E") throw new Error(`Question ${n}: exactly five options A-E are required.`);
    const values = ANSWER_LETTERS.map((l) => q.options[l]);
    if (values.some((v) => typeof v !== "string" || !v.trim() || v.length > 1000)) throw new Error(`Question ${n}: five options A-E are required, and each must be non-empty and at most 1,000 characters.`);
    if (new Set(values.map(normalizeOption)).size !== 5) throw new Error(`Question ${n}: duplicate answer options detected.`);
    if (!ANSWER_LETTERS.includes(q.correct_answer)) throw new Error(`Question ${n}: correct_answer must be A-E.`);
    if (typeof q.rationale !== "string" || q.rationale.trim().length < 8 || q.rationale.length > 3000) throw new Error(`Question ${n}: invalid rationale.`);
    if (!/[\u0600-\u06FF]/.test(q.rationale) || !/[A-Za-z]/.test(q.rationale)) throw new Error(`Question ${n}: rationale must mix Arabic and English medical terminology.`);
  });
}
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""; for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function base64UrlToBytes(value: string): Uint8Array {
  const b=value.replace(/-/g,"+").replace(/_/g,"/"); const raw=atob(b+"=".repeat((4-b.length%4)%4));
  return Uint8Array.from(raw, c=>c.charCodeAt(0));
}
async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const data = new Uint8Array(bytes).buffer as ArrayBuffer;
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
}
async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const data = new Uint8Array(bytes).buffer as ArrayBuffer;
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}
async function importSessionKey(encoded: string, usage: KeyUsage[]): Promise<CryptoKey> {
  let raw: Uint8Array; try { raw=base64UrlToBytes(encoded); } catch { throw new Error("MEDQ_SESSION_KEY is invalid or not configured."); }
  if(raw.length!==32) throw new Error("MEDQ_SESSION_KEY must decode to exactly 32 random bytes.");
  return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,usage);
}
export async function encodeSession(session: ExamSession, secret: string): Promise<string> {
  const key=await importSessionKey(secret,["encrypt"]); const packed=await gzip(new TextEncoder().encode(JSON.stringify(session)));
  const iv=crypto.getRandomValues(new Uint8Array(12)); const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,packed));
  const token=bytesToBase64Url(new Uint8Array([...iv,...cipher]));
  if(token.length>MAX_SESSION_TOKEN_LENGTH) throw new Error("Exam is too large for a single session; split it into batches.");
  return token;
}
export async function decodeSession(token: string, secret: string, now=Date.now()): Promise<ExamSession> {
  if(typeof token!=="string"||token.length<40||token.length>MAX_SESSION_TOKEN_LENGTH) throw new Error("Invalid or oversized session token.");
  try {
    const bytes=base64UrlToBytes(token), iv=bytes.slice(0,12), cipher=bytes.slice(12), key=await importSessionKey(secret,["decrypt"]);
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher);
    const session=JSON.parse(new TextDecoder().decode(await gunzip(new Uint8Array(plain)))) as ExamSession;
    if(session.version!==1||!Number.isInteger(session.index)||!Number.isInteger(session.score)||!Array.isArray(session.questions)) throw new Error("Invalid session.");
    if(session.expires_at<=now) throw new Error("Session expired. Start a new exam.");
    if(session.index<0||session.index>=session.questions.length) throw new Error("Session is complete. Start a new exam.");
    return session;
  } catch(e) {
    if(e instanceof Error && /expired|complete|MEDQ_SESSION_KEY|oversized|Invalid or/.test(e.message)) throw e;
    throw new Error("Session verification failed. It may be invalid or the session key changed.");
  }
}
export function toQuestionView(s: ExamSession): QuestionView {
  const q=s.questions[s.index]; return {number:s.index+1,total:s.questions.length,stem:q.stem,options:q.options};
}
export async function startSession(questions: QuestionInput[], secret: string, now=Date.now()) {
  validateQuestions(questions); const s:ExamSession={version:1,index:0,score:0,expires_at:now+SESSION_TTL_MS,questions};
  return {session_token:await encodeSession(s,secret),question:toQuestionView(s),total_questions:questions.length};
}
export async function answerSession(token:string, answer:AnswerLetter, secret:string, now=Date.now()):Promise<AnswerResult>{
  if(!ANSWER_LETTERS.includes(answer)) throw new Error("Choose exactly one answer: A, B, C, D, or E.");
  const s=await decodeSession(token,secret,now), q=s.questions[s.index], correct=answer===q.correct_answer, score=s.score+(correct?1:0), next=s.index+1, completed=next>=s.questions.length;
  const feedback=correct?"Correct / صحيح":"Incorrect / خطأ";
  const explanation=correct?{}:{correct_answer:q.correct_answer,correct_option:q.options[q.correct_answer],rationale:q.rationale};
  if(completed) return {correct,feedback,...explanation,completed:true,score,total_questions:s.questions.length,percentage:Math.round(score/s.questions.length*10000)/100};
  const updated={...s,index:next,score};
  return {correct,feedback,...explanation,next_question:toQuestionView(updated),next_session_token:await encodeSession(updated,secret),completed:false,total_questions:s.questions.length};
}