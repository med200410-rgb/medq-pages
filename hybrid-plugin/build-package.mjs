import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const endpoint = process.env.MEDQ_MCP_URL;
const demoUrl = process.env.MEDQ_DEMO_URL;
if (!endpoint || !/^https:\/\/[a-z0-9.-]+\/mcp$/i.test(endpoint)) {
  throw new Error("Set MEDQ_MCP_URL to the verified public HTTPS endpoint ending in /mcp.");
}
if (!demoUrl || !/^https:\/\//i.test(demoUrl)) {
  throw new Error("Set MEDQ_DEMO_URL to the verified, reviewer-accessible real demo recording.");
}

const root = resolve("hybrid-plugin");
const out = resolve("dist/medq-hybrid");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const path of ["plugin.json", "skills/medical-mcq/SKILL.md", "assets/medq-icon.png"]) {
  const source = resolve(root, path);
  const dest = resolve(out, path);
  mkdirSync(resolve(dest, ".."), { recursive: true });
  copyFileSync(source, dest);
}

const manifest = JSON.parse(readFileSync(resolve(out, "plugin.json"), "utf8"));
const openai = manifest.extensions?.["com.openai"];
const listing = openai?.interface;
const positive = openai?.review?.test_cases?.positive ?? [];
const negative = openai?.review?.test_cases?.negative ?? [];
if (!listing || listing.category !== "Education & Research") throw new Error("Invalid listing category.");
if (listing.shortDescription.length > 30) throw new Error("Listing subtitle exceeds 30 characters.");
if (positive.length !== 5 || negative.length !== 3) throw new Error("The MCP review set must contain exactly five positive and three negative cases.");
if (openai.apps || manifest.apps || manifest[".app.json"]) throw new Error("Public package must not declare app bindings.");
if (!Array.isArray(openai.publication?.countries) || openai.publication.countries.length !== 0) throw new Error("Worldwide country targeting must be explicit.");

const iconPath = resolve(out, "assets/medq-icon.png");
const icon = readFileSync(iconPath);
if (icon.length > 5 * 1024 * 1024 || icon.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("The icon must be a PNG no larger than 5 MiB.");
const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
if (width < 256 || height < 256 || width !== height) throw new Error("The listing icon must be square and at least 256x256 pixels.");

openai.review.demo_recording_url = demoUrl;
writeFileSync(resolve(out, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n");

const mcp = JSON.parse(readFileSync(resolve(root, "mcp.json.template"), "utf8"));
mcp.mcpServers["medq-exam-engine"].url = endpoint;
if (Object.values(mcp.mcpServers).some((server) => !/^https:\/\//i.test(server.url) || server.url.includes("__"))) {
  throw new Error("MCP package contains a missing or placeholder endpoint.");
}
writeFileSync(resolve(out, "mcp.json"), JSON.stringify(mcp, null, 2) + "\n");

const zip = resolve("dist/MedQ_Hybrid_Public_v0.6.0.zip");
execFileSync("zip", ["-qr", zip, "medq-hybrid"], { cwd: resolve(out, "..") });
console.log(zip);
