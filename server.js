#!/usr/bin/env node
/*
 * server.js — serves the demo at http://localhost:5173 and opens your browser.
 *
 *   npm start                 (or: node server.js)
 *   PORT=8080 npm start       pick another port
 *   node server.js --no-open  don't open a browser tab
 *
 * No dependencies. Listens on 127.0.0.1 only, so nothing outside your
 * machine can reach it. Stop it with Ctrl+C.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const HOST = "127.0.0.1";
const START_PORT = Number(process.env.PORT) || 5173;
const OPEN = !process.argv.includes("--no-open");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "Bad request");
  }
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  // never serve anything outside the project folder
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return send(res, 403, "Forbidden");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found: " + urlPath);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": "no-store",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? `open "${url}"`
    : process.platform === "win32" ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function listen(port, triesLeft) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && triesLeft > 0) return listen(port + 1, triesLeft - 1);
    console.error(`Could not start the server: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, HOST, () => {
    const url = `http://localhost:${port}/`;
    console.log(`\n  SCA / SAA Explorer is running at ${url}`);
    console.log("  Press Ctrl+C to stop.\n");
    if (OPEN) openBrowser(url);
  });
}

listen(START_PORT, 10);
process.on("SIGINT", () => { console.log("\n  Stopped."); process.exit(0); });
