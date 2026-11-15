import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import multer from "multer";
import { seedProducts, defaultSettings } from "./seed.js";
import { createStorage, mode as storageMode } from "./storage.js";
import { DEFAULT_HOME } from "../shared/homeDefaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const ADMIN_ID = process.env.ADMIN_ID || "tradeworld";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
// Stable across server instances (needed on Vercel): derived from the password unless JWT_SECRET is set.
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (ADMIN_PASSWORD
    ? crypto.createHash("sha256").update(`trade-world:${ADMIN_ID}:${ADMIN_PASSWORD}`).digest("hex")
    : crypto.randomBytes(32).toString("hex"));

export const store = createStorage({
  dataDir: process.env.DATA_DIR || path.join(ROOT, "data"),
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT, "uploads"),
});

/* ───────── helpers ───────── */

const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};
const imageUrl = (u) => {
  const s = str(u, 400);
  return s.startsWith("/uploads/") || /^https:\/\//.test(s) ? s : "";
};
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : null);

// Serialise writes so two admin saves can't clobber each other.
let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
}

// Trade World prints on black and white tees only.
const BLACK = { name: "Black", hex: "#111111" };
const WHITE = { name: "White", hex: "#f4f1ea" };
function isLightHex(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}
function toBlackWhite(colors) {
  const out = [];
  for (const c of Array.isArray(colors) ? colors : []) {
    const name = String(c?.name || "").toLowerCase();
    const pick = name === "white" ? WHITE : name === "black" ? BLACK : isLightHex(c?.hex) ? WHITE : BLACK;
    if (!out.includes(pick)) out.push(pick);
  }
  return out.length ? out.map((c) => ({ ...c })) : [{ ...BLACK }, { ...WHITE }];
}

function cleanProduct(body) {
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
    colors: toBlackWhite(body.colors),
    sizes: Array.isArray(body.sizes) ? body.sizes.map((s) => str(s, 6)).filter(Boolean).slice(0, 10) : [],
    images: Array.isArray(body.images) ? body.images.map(imageUrl).filter(Boolean).slice(0, 8) : [],
    featured: Boolean(body.featured),
    onRack: body.onRack !== false, // shown on the home page 3D hanger rack
    inStock: body.inStock !== false,
  };
}

/** Home page content from Admin → Home page. Missing fields fall back to the defaults. */
function cleanHome(h) {
  const d = DEFAULT_HOME;
  if (!h || typeof h !== "object") return structuredClone(d);
  const hero = h.hero || {};
  const bulk = h.bulk || {};
  const stats = list(h.stats, 3);
  const marquee = list(h.marquee, 16);
  const gallery = list(h.gallery, 30);
  const faq = list(h.faq, 12);
  const points = list(bulk.points, 3);
  return {
    hero: {
      eyebrow: str(hero.eyebrow, 60) || d.hero.eyebrow,
      title: str(hero.title, 40) || d.hero.title,
      highlight: str(hero.highlight, 30) || d.hero.highlight,
      subtitle: str(hero.subtitle, 300) || d.hero.subtitle,
      image: imageUrl(hero.image),
    },
    stats: stats ? stats.map((s) => ({ value: str(s?.value, 30), label: str(s?.label, 40) })).filter((s) => s.value) : d.stats,
    marquee: marquee ? marquee.map((m) => str(m, 30)).filter(Boolean) : d.marquee,
    categories: d.categories.map((dc, i) => {
      const c = (Array.isArray(h.categories) && h.categories[i]) || {};
      return { id: dc.id, title: str(c.title, 40) || dc.title, blurb: str(c.blurb, 90) || dc.blurb, image: imageUrl(c.image) };
    }),
    gallery: gallery ? gallery.map((g) => ({ image: imageUrl(g?.image), caption: str(g?.caption, 90) })).filter((g) => g.image) : [],
    bulk: {
      title: str(bulk.title, 90) || d.bulk.title,
      text: str(bulk.text, 260) || d.bulk.text,
      points: points ? points.map((p) => str(p, 40)).filter(Boolean) : d.bulk.points,
      image: imageUrl(bulk.image),
    },
    faq: faq ? faq.map((f) => ({ q: str(f?.q, 140), a: str(f?.a, 600) })).filter((f) => f.q && f.a) : d.faq,
  };
}

let migrated = false;
async function getProducts() {
  const products = await store.readJson("products", seedProducts);
  if (!migrated) {
    // older products may have other colours: we only print black and white now
    migrated = true;
    let changed = false;
    for (const p of products) {
      const bw = toBlackWhite(p.colors);
      if (JSON.stringify(bw) !== JSON.stringify(p.colors)) {
        p.colors = bw;
        changed = true;
      }
    }
    if (changed && storageMode !== "readonly") await store.writeJson("products", products).catch(() => {});
  }
  return products;
}
async function getSettings() {
  const s = { ...defaultSettings, ...(await store.readJson("settings", defaultSettings)) };
  s.home = cleanHome(s.home);
  return s;
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
const WINDOW = 15 * 60 * 1000;
function loginLimiter(req, res, next) {
  const e = attempts.get(req.ip);
  if (e && Date.now() - e.first < WINDOW && e.count >= 10) {
    return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
  }
  next();
}
function recordFail(ip) {
  const e = attempts.get(ip);
  if (!e || Date.now() - e.first > WINDOW) attempts.set(ip, { first: Date.now(), count: 1 });
  else e.count++;
}

/* ───────── uploads (kept in memory, then saved by the storage layer) ───────── */

const IMAGE_EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif", "image/gif": ".gif" };
const VIDEO_EXT = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };
const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, f, cb) => (IMAGE_EXT[f.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG, WEBP, AVIF or GIF images are allowed."))),
});
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter: (_req, f, cb) => (VIDEO_EXT[f.mimetype] ? cb(null, true) : cb(new Error("Only MP4, WEBM or MOV videos are allowed."))),
});

/* ───────── app ───────── */

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "1mb" }));
if (store.uploadDir) app.use("/uploads", express.static(store.uploadDir, { maxAge: "30d", immutable: true }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// Public data can be cached briefly; admin changes show within ~15 seconds.
const shortCache = (res) => res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=60");

app.get("/api/health", (_req, res) => res.json({ ok: true, storage: storageMode }));

app.get(
  "/api/products",
  wrap(async (_req, res) => {
    shortCache(res);
    res.json(await getProducts());
  })
);

app.get(
  "/api/products/:id",
  wrap(async (req, res) => {
    const product = (await getProducts()).find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    shortCache(res);
    res.json(product);
  })
);

app.get(
  "/api/settings",
  wrap(async (_req, res) => {
    shortCache(res);
    res.json(await getSettings());
  })
);

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { id, password } = req.body || {};
  if (ADMIN_PASSWORD && safeEqual(id, ADMIN_ID) && safeEqual(password, ADMIN_PASSWORD)) {
    attempts.delete(req.ip);
    return res.json({ token: jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" }), storage: storageMode });
  }
  recordFail(req.ip);
  res.status(401).json({ message: "Wrong ID or password." });
});

app.get("/api/admin/me", requireAdmin, (_req, res) => res.json({ ok: true, storage: storageMode }));

app.post(
  "/api/products",
  requireAdmin,
  wrap(async (req, res) => {
    const data = cleanProduct(req.body);
    if (!data.name || !data.price) return res.status(400).json({ message: "Name and price are required." });
    const product = await withLock(async () => {
      const products = await getProducts();
      const created = { id: crypto.randomUUID().slice(0, 8), ...data, createdAt: Date.now() };
      products.unshift(created);
      await store.writeJson("products", products);
      return created;
    });
    res.status(201).json(product);
  })
);

app.put(
  "/api/products/:id",
  requireAdmin,
  wrap(async (req, res) => {
    const data = cleanProduct(req.body);
    if (!data.name || !data.price) return res.status(400).json({ message: "Name and price are required." });
    const product = await withLock(async () => {
      const products = await getProducts();
      const i = products.findIndex((p) => p.id === req.params.id);
      if (i === -1) return null;
      products[i] = { ...products[i], ...data };
      await store.writeJson("products", products);
      return products[i];
    });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  })
);

app.delete(
  "/api/products/:id",
  requireAdmin,
  wrap(async (req, res) => {
    const removed = await withLock(async () => {
      const products = await getProducts();
      const i = products.findIndex((p) => p.id === req.params.id);
      if (i === -1) return null;
      const [gone] = products.splice(i, 1);
      await store.writeJson("products", products);
      return gone;
    });
    if (!removed) return res.status(404).json({ message: "Product not found." });
    for (const url of removed.images || []) await store.removeUpload(url);
    res.json({ ok: true });
  })
);

app.post(
  "/api/upload",
  requireAdmin,
  uploadImages.array("images", 8),
  wrap(async (req, res) => {
    const urls = [];
    for (const f of req.files || []) urls.push(await store.saveUpload(f.buffer, IMAGE_EXT[f.mimetype], f.mimetype));
    res.json({ urls });
  })
);

app.post(
  "/api/upload-video",
  requireAdmin,
  uploadVideo.single("video"),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video received." });
    res.json({ url: await store.saveUpload(req.file.buffer, VIDEO_EXT[req.file.mimetype], req.file.mimetype) });
  })
);

app.put(
  "/api/settings",
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body || {};
    const settings = await withLock(async () => {
      const cur = await getSettings();
      const next = {
        ...cur,
        whatsapp: b.whatsapp !== undefined ? str(b.whatsapp, 20).replace(/\D/g, "") : cur.whatsapp,
        phone: b.phone !== undefined ? str(b.phone, 30) : cur.phone,
        email: b.email !== undefined ? str(b.email, 120) : cur.email,
        address: b.address !== undefined ? str(b.address, 200) : cur.address,
        instagram: b.instagram !== undefined ? str(b.instagram, 200) : cur.instagram,
        announcement: b.announcement !== undefined ? str(b.announcement, 160) : cur.announcement,
        mapsUrl: b.mapsUrl !== undefined ? (/^https:\/\//.test(str(b.mapsUrl, 400)) ? str(b.mapsUrl, 400) : "") : cur.mapsUrl,
        reels: Array.isArray(b.reels)
          ? b.reels
              .map((r) => ({ type: r?.type === "instagram" ? "instagram" : "video", url: str(r?.url, 400), caption: str(r?.caption, 120) }))
              .filter((r) =>
                r.type === "instagram"
                  ? /^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\//.test(r.url)
                  : r.url.startsWith("/uploads/") || /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(r.url)
              )
              .slice(0, 12)
          : cur.reels,
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
          : cur.reviews,
        home: b.home !== undefined ? cleanHome(b.home) : cur.home,
      };
      await store.writeJson("settings", next);
      return next;
    });
    res.json(settings);
  })
);

app.use("/api", (_req, res) => res.status(404).json({ message: "Not found." }));

// Errors (incl. upload + storage errors) → JSON
app.use((err, req, res, next) => {
  if (!req.path.startsWith("/api")) return next(err);
  if (!err.status) console.error(err);
  const status = err instanceof multer.MulterError ? 400 : err.status || 500;
  res.status(status).json({ message: err.message || "Server error." });
});

export default app;
