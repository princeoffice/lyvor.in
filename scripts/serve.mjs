import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const relative = normalize(pathname.replace(/^\/+/, ""));
    if (relative.startsWith("..")) throw new Error("Invalid path");
    let file = join(root, relative || "index.html");
    try { const body = await readFile(file); res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" }); res.end(body); }
    catch { const body = await readFile(join(root, "index.html")); res.writeHead(200, { "Content-Type": mime[".html"] }); res.end(body); }
  } catch { res.writeHead(400); res.end("Bad request"); }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => console.log(`Lyvor preview: http://127.0.0.1:${port}`));
