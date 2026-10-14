// Local, dependency-free HTTP preview. No world data is read or changed.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const foundryIcons = "C:/Program Files/Foundry Virtual Tabletop/resources/app/public/icons";
const types = {".html":"text/html; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".css":"text/css", ".json":"application/json", ".hbs":"text/plain; charset=utf-8", ".svg":"image/svg+xml"};
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let base = root, relative = pathname.slice(1);
  if (pathname === "/") relative = "tests/preview.html";
  if (pathname.startsWith("/modules/frontline-unit-cards/")) relative = pathname.slice("/modules/frontline-unit-cards/".length);
  if (pathname.startsWith("/icons/")) {base = foundryIcons; relative = pathname.slice(7);}
  if (pathname === "/handlebars.js") {
    base = "C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules/handlebars/dist";
    relative = "handlebars.js";
  }
  const file = path.resolve(base, relative);
  if (!file.startsWith(path.resolve(base) + path.sep)) {response.writeHead(403).end(); return;}
  try {
    const content = fs.readFileSync(file);
    response.writeHead(200, {"Content-Type": types[path.extname(file)] ?? "text/javascript", "Cache-Control":"no-store"}).end(content);
  } catch {response.writeHead(404).end("Not found");}
}).listen(4174, "127.0.0.1", () => console.log("Unit card preview: http://127.0.0.1:4174"));
