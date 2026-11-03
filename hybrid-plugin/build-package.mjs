import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const endpoint = process.env.MEDQ_MCP_URL;
if (!endpoint || !/^https:\/\/[a-z0-9.-]+\/mcp$/i.test(endpoint)) {
  throw new Error("Set MEDQ_MCP_URL to the verified public HTTPS endpoint ending in /mcp. Do not use a placeholder or local URL.");
}
const root = resolve("hybrid-plugin");
const out = resolve("dist/medq-hybrid");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const path of ["plugin.json", "skills/medical-mcq/SKILL.md", "assets/medq-icon.png"]) {
  const dest = resolve(out, path);
  mkdirSync(resolve(dest, ".."), { recursive: true });
  copyFileSync(resolve(root, path), dest);
}
const mcp = JSON.parse(readFileSync(resolve(root, "mcp.json.template"), "utf8"));
mcp.mcpServers["medq-exam-engine"].url = endpoint;
writeFileSync(resolve(out, "mcp.json"), JSON.stringify(mcp, null, 2) + "\n");
const zip = resolve("dist/MedQ_Hybrid_Public_v0.6.0.zip");
execFileSync("zip", ["-qr", zip, "medq-hybrid"], { cwd: resolve(out, "..") });
console.log(zip);
