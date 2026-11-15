// Runs the shop on your PC (npm run dev / npm start) and on Render.
// On Vercel, api/index.js uses the same app and Vercel serves the built site itself.
import path from "node:path";
import express from "express";
import app, { ADMIN_ID, ROOT } from "./app.js";
import { mode as storageMode } from "./storage.js";

const isProd = process.argv.includes("--prod") || process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 5050;
const DIST_DIR = path.join(ROOT, "dist");

if (!process.env.ADMIN_PASSWORD) console.warn("\n  ⚠ ADMIN_PASSWORD is not set in .env, so admin login is disabled.\n");

if (isProd) {
  // Built JS/CSS have a content hash in the name, so they can be cached for a year.
  app.use("/assets", express.static(path.join(DIST_DIR, "assets"), { maxAge: "1y", immutable: true }));
  app.use(express.static(DIST_DIR, { maxAge: "1d", index: false }));
  app.get("*", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

app
  .listen(PORT, () => {
    console.log(`\n  TRADE WORLD running → http://localhost:${PORT}`);
    console.log(`  Admin panel        → http://localhost:${PORT}/admin  (ID: ${ADMIN_ID})`);
    console.log(`  Storage            → ${storageMode}\n`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  Port ${PORT} is already used by another program. Change PORT in the .env file and run again.\n`);
      process.exit(1);
    }
    throw err;
  });
