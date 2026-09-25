import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const out = resolve(root, "dist");
mkdirSync(out, { recursive: true });
cpSync(resolve(root, "index.html"), resolve(out, "index.html"));
cpSync(resolve(root, "src"), resolve(out, "src"), { recursive: true });
cpSync(resolve(root, "public/assets"), resolve(out, "assets"), { recursive: true });
cpSync(resolve(root, ".nojekyll"), resolve(out, ".nojekyll"));

const config = {
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
};
writeFileSync(resolve(out, "config.js"), `window.LYVOR_CONFIG = ${JSON.stringify(config)};\n`, "utf8");
const html = readFileSync(resolve(out, "index.html"), "utf8");
if (!html.includes("./src/app.js") || !html.includes("./config.js")) throw new Error("The static entry page is missing its app or public config script.");
console.log(`Lyvor production files written to ${out}`);
