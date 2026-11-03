import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { ANSWER_LETTERS, answerSession, startSession, type AnswerLetter, type QuestionInput } from "./engine";
interface Env { MEDQ_SESSION_KEY: string; OPENAI_APP_CHALLENGE?: string; }
const letters=z.enum(ANSWER_LETTERS);
const optionsSchema=z.object({A:z.string().min(1).max(1000),B:z.string().min(1).max(1000),C:z.string().min(1).max(1000),D:z.string().min(1).max(1000),E:z.string().min(1).max(1000)}).strict();
const questionSchema=z.object({stem:z.string().min(8).max(8000),options:optionsSchema,correct_answer:letters,rationale:z.string().min(8).max(3000)}).strict();
const viewSchema=z.object({number:z.number().int().positive(),total:z.number().int().positive(),stem:z.string(),options:optionsSchema});
function createServer(env:Env){
 const server=new McpServer({name:"medq-exam-engine",version:"0.1.0"});
 server.registerTool("start_medq_exam",{title:"Start a MedQ exam session",description:"After ChatGPT generates the complete source-grounded exam batch, validate exactly five distinct options A-E and a bilingual Arabic-English rationale, then return only the first unanswered question and an encrypted four-hour session token. The original lecture is never sent to this service. No database or AI API. Maximum 20 questions per batch.",inputSchema:{questions:z.array(questionSchema).min(1).max(20),question_count:z.number().int().min(1).max(20).optional()},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async({questions,question_count}:{questions:QuestionInput[];question_count?:number})=>{if(question_count!==undefined&&question_count!==questions.length)throw new Error("Question count does not match the supplied batch.");const result=await startSession(questions as QuestionInput[],env.MEDQ_SESSION_KEY);return {structuredContent:result,content:[{type:"text",text:"Session created. Display only the first question. Never reveal the session token."}]};});
 server.registerTool("submit_medq_answer",{title:"Submit a MedQ answer",description:"Grade one letter A-E for the current question. Returns whether it is correct, the correct option and bilingual rationale only when wrong, and the next question or final score. The encrypted session token expires after four hours.",inputSchema:{session_token:z.string().min(40).max(350000),answer:letters},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async({session_token,answer}:{session_token:string;answer:AnswerLetter})=>{const result=await answerSession(session_token,answer as AnswerLetter,env.MEDQ_SESSION_KEY);return {structuredContent:result,content:[{type:"text",text:result.correct?"Correct / صحيح. Present next_question if present. Never show session tokens.":"Incorrect / خطأ. Show the correct answer and bilingual rationale before continuing. Never show session tokens."}]};});
 return server;
}
export default {async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname==="/"||url.pathname==="/health")return new Response("MedQ Exam Engine is online. MCP endpoint: /mcp",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
 if(url.pathname==="/.well-known/openai-apps-challenge"&&request.method==="GET"){if(!env.OPENAI_APP_CHALLENGE)return new Response("Challenge token not configured",{status:404});return new Response(env.OPENAI_APP_CHALLENGE,{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});}
 if(url.pathname!=="/mcp")return new Response("Not Found",{status:404});
 if(!env.MEDQ_SESSION_KEY)return new Response("MedQ session security is not configured",{status:503});
 return createMcpHandler(()=>createServer(env),{route:"/mcp",responseMode:"json"})(request,env,ctx);
}};