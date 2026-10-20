import "dotenv/config";
import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import multer from "multer";
import { seedProducts, defaultSettings } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DIST_DIR = path.join(ROOT, "dist");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const isProd = process.argv.includes("--prod") || process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 5050;
const ADMIN_ID = process.env.ADMIN_ID || "tradeworld";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
if (!ADMIN_PASSWORD) console.warn("\n  ⚠ ADMIN_PASSWORD is not set in .env, so admin login is disabled.\n");
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ───────── JSON file storage ───────── */

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    await writeJson(file, fallback);
    return structuredClone(fallback);
  }
}

async function writeJson(file, data) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

// Serialise writes so two admin saves can't clobber each other.
let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
}

const getProducts = () => readJson(PRODUCTS_FILE, seedProducts);
const getSettings = async () => ({ ...defaultSettings, ...(await readJson(SETTINGS_FILE, defaultSettings)) });

/* ───────── helpers ───────── */

const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

function cleanProduct(body) {
  const colors = Array.isArray(body.colors)
    ? body.colors
        .map((c) => ({ name: str(c?.name, 40), hex: /^#[0-9a-f]{6}$/i.test(c?.hex) ? c.hex : "#111111" }))
        .filter((c) => c.name)
        .slice(0, 12)
    : [];
  return {
    name: str(body.name, 120),
    category: str(body.category, 40) || "Classic",
    price: num(body.price),
    mrp: num(body.mrp),
    description: str(body.description, 2000),
    printType: str(body.printType, 60),
    fabric: str(body.fabric, 80),
    graphic: str(body.graphic, 24).toUpperCase(),
    tag: str(body.tag, 20),
    colors: colors.length ? colors : [{ name: "Black", hex: "#111111" }],
    sizes: Array.isArray(body.sizes) ? body.sizes.map((s) => str(s, 6)).filter(Boolean).slice(0, 10) : [],
    images: Array.isArray(body.images)
      ? body.images.map((u) => str(u, 300)).filter((u) => u.startsWith("/uploads/") || /^https?:\/\//.test(u)).slice(0, 8)
      : [],
    featured: Boolean(body.featured),
    inStock: body.inStock !== false,
  };
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Please log in again." });
  }
}

// Basic brute-force protection for the login route.
const attempts = new Map();
function loginLimiter(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && now - entry.first < 15 * 60 * 1000 && entry.count >= 10) {
    return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
  }
  next();
}
function recordFail(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > 15 * 60 * 1000) attempts.set(ip, { first: now, count: 1 });
  else entry.count++;
}

/* ───────── uploads ───────── */

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif", "image/gif": ".gif" };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG, WEBP, AVIF or GIF images are allowed.")),
});

async function removeUploads(urls = []) {
  for (const url of urls) {
    if (!url.startsWith("/uploads/")) continue;
    const file = path.join(UPLOAD_DIR, path.basename(url));
    await fsp.unlink(file).catch(() => {});
  }
}

/* ───────── app ───────── */

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

// Public
app.get("/api/products", async (_req, res) => {
  res.json(await getProducts());
});

app.get("/api/products/:id", async (req, res) => {
  const product = (await getProducts()).find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json(product);
});

app.get("/api/settings", async (_req, res) => {
  res.json(await getSettings());
});

// Admin auth
app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { id, password } = req.body || {};
  if (ADMIN_PASSWORD && safeEqual(id, ADMIN_ID) && safeEqual(password, ADMIN_PASSWORD)) {
    attempts.delete(req.ip);
    return res.json({ token: jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" }) });
  }
  recordFail(req.ip);
  res.status(401).json({ message: "Wrong ID or password." });
});

app.get("/api/admin/me", requireAdmin, (_req, res) => res.json({ ok: true }));

// Admin — products
app.post("/api/products", requireAdmin, async (req, res) => {
  const data = cleanProduct(req.body);
  if (!data.name || !data.price) return res.status(400).json({ message: "Name and price are required." });
  const product = await withLock(async () => {
    const products = await getProducts();
    const created = { id: crypto.randomUUID().slice(0, 8), ...data, createdAt: Date.now() };
    products.unshift(created);
    await writeJson(PRODUCTS_FILE, products);
    return created;
  });
  res.status(201).json(product);
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  const data = cleanProduct(req.body);
  if (!data.name || !data.price) return res.status(400).json({ message: "Name and price are required." });
  const product = await withLock(async () => {
    const products = await getProducts();
    const i = products.findIndex((p) => p.id === req.params.id);
    if (i === -1) return null;
    products[i] = { ...products[i], ...data };
    await writeJson(PRODUCTS_FILE, products);
    return products[i];
  });
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json(product);
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const removed = await withLock(async () => {
    const products = await getProducts();
    const i = products.findIndex((p) => p.id === req.params.id);
    if (i === -1) return null;
    const [gone] = products.splice(i, 1);
    await writeJson(PRODUCTS_FILE, products);
    return gone;
  });
  if (!removed) return res.status(404).json({ message: "Product not found." });
  await removeUploads(removed.images);
  res.json({ ok: true });
});

const VIDEO_EXT = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };
const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${VIDEO_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    VIDEO_EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only MP4, WEBM or MOV videos are allowed.")),
});

app.post("/api/upload-video", requireAdmin, uploadVideo.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No video received." });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post("/api/upload", requireAdmin, upload.array("images", 8), (req, res) => {
  res.json({ urls: (req.files || []).map((f) => `/uploads/${f.filename}`) });
});

// Admin — settings
app.put("/api/settings", requireAdmin, async (req, res) => {
  const b = req.body || {};
  const settings = await withLock(async () => {
    const next = {
      ...(await getSettings()),
      whatsapp: str(b.whatsapp, 20).replace(/\D/g, ""),
      phone: str(b.phone, 30),
      email: str(b.email, 120),
      address: str(b.address, 200),
      instagram: str(b.instagram, 200),
      announcement: str(b.announcement, 160),
      mapsUrl: /^https:\/\//.test(str(b.mapsUrl, 400)) ? str(b.mapsUrl, 400) : "",
      reels: Array.isArray(b.reels)
        ? b.reels
            .map((r) => ({
              type: r?.type === "instagram" ? "instagram" : "video",
              url: str(r?.url, 400),
              caption: str(r?.caption, 120),
            }))
            .filter((r) =>
              r.type === "instagram"
                ? /^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\//.test(r.url)
                : r.url.startsWith("/uploads/")
            )
            .slice(0, 12)
        : [],
      reviews: Array.isArray(b.reviews)
        ? b.reviews
            .map((r) => ({
              name: str(r?.name, 60),
              city: str(r?.city, 60),
              text: str(r?.text, 600),
              rating: Math.min(5, Math.max(1, Math.round(Number(r?.rating) || 5))),
            }))
            .filter((r) => r.name && r.text)
            .slice(0, 30)
        : [],
    };
    await writeJson(SETTINGS_FILE, next);
    return next;
  });
  res.json(settings);
});

app.use("/api", (_req, res) => res.status(404).json({ message: "Not found." }));

// Errors (incl. upload errors) → JSON
app.use((err, req, res, next) => {
  if (!req.path.startsWith("/api")) return next(err);
  console.error(err);
  res.status(err instanceof multer.MulterError ? 400 : err.status || 500).json({ message: err.message || "Server error." });
});

/* ───────── frontend ───────── */

if (isProd) {
  app.use(express.static(DIST_DIR, { maxAge: "1d", index: false }));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

app
  .listen(PORT, () => {
    console.log(`\n  TRADE WORLD running → http://localhost:${PORT}`);
    console.log(`  Admin panel        → http://localhost:${PORT}/admin  (ID: ${ADMIN_ID})\n`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  Port ${PORT} is already used by another program. Change PORT in the .env file and run again.\n`);
      process.exit(1);
    }
    throw err;
  });
