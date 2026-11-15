import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/*
  Where products, settings and uploaded photos/videos are kept.

  • Local / Render  → JSON files in data/ and files in uploads/
  • Vercel + Blob   → Vercel Blob storage (set automatically when you connect a Blob store:
                      env BLOB_READ_WRITE_TOKEN)
  • Vercel, no Blob → read-only: the shop works with the default products, admin saving is
                      blocked with a clear message (Vercel can't keep files on its servers)
*/

const IS_VERCEL = Boolean(process.env.VERCEL);
const HAS_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const mode = HAS_BLOB ? "blob" : IS_VERCEL ? "readonly" : "local";

export class StorageError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
  }
}

const READONLY_MSG =
  "Saving is turned off on this server. In Vercel: Storage → Create → Blob → connect it to this project, then redeploy.";

/* ───────── local files ───────── */

function localStore({ dataDir, uploadDir }) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  const cache = new Map();
  return {
    uploadDir,
    async readJson(name, fallback) {
      if (!cache.has(name)) {
        try {
          cache.set(name, JSON.parse(await fsp.readFile(path.join(dataDir, `${name}.json`), "utf8")));
        } catch (err) {
          if (err.code !== "ENOENT") throw err;
          await this.writeJson(name, fallback);
        }
      }
      return structuredClone(cache.get(name));
    },
    async writeJson(name, data) {
      await fsp.writeFile(path.join(dataDir, `${name}.json`), JSON.stringify(data, null, 2), "utf8");
      cache.set(name, structuredClone(data));
    },
    async saveUpload(buffer, ext) {
      const file = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
      await fsp.writeFile(path.join(uploadDir, file), buffer);
      return `/uploads/${file}`;
    },
    async removeUpload(url) {
      if (!url.startsWith("/uploads/")) return;
      await fsp.unlink(path.join(uploadDir, path.basename(url))).catch(() => {});
    },
  };
}

/* ───────── Vercel Blob ───────── */

function blobStore() {
  let sdk = null;
  const blob = async () => (sdk ||= await import("@vercel/blob"));
  // Each save writes a new uniquely-named file (so no stale CDN copies); we read the newest one.
  const cache = new Map(); // name → { at, data }
  const TTL = 4000;

  async function newest(name) {
    const { list } = await blob();
    const { blobs } = await list({ prefix: `data/${name}-` });
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return blobs;
  }

  return {
    uploadDir: null,
    async readJson(name, fallback) {
      const hit = cache.get(name);
      if (hit && Date.now() - hit.at < TTL) return structuredClone(hit.data);
      const blobs = await newest(name);
      let data = structuredClone(fallback);
      if (blobs.length) {
        const res = await fetch(blobs[0].url, { cache: "no-store" });
        if (res.ok) data = await res.json();
      }
      cache.set(name, { at: Date.now(), data });
      return structuredClone(data);
    },
    async writeJson(name, data) {
      const { put, del } = await blob();
      await put(`data/${name}-${Date.now()}.json`, JSON.stringify(data), {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      cache.set(name, { at: Date.now(), data: structuredClone(data) });
      // keep the latest 3 versions as a small safety net
      const old = (await newest(name)).slice(3).map((b) => b.url);
      if (old.length) await del(old).catch(() => {});
    },
    async saveUpload(buffer, ext, contentType) {
      const { put } = await blob();
      const res = await put(`uploads/${Date.now()}${ext}`, buffer, { access: "public", addRandomSuffix: true, contentType });
      return res.url;
    },
    async removeUpload(url) {
      if (!/\.blob\.vercel-storage\.com\//.test(url)) return;
      const { del } = await blob();
      await del(url).catch(() => {});
    },
  };
}

/* ───────── read-only (Vercel without Blob) ───────── */

function readonlyStore() {
  return {
    uploadDir: null,
    async readJson(_name, fallback) {
      return structuredClone(fallback);
    },
    async writeJson() {
      throw new StorageError(READONLY_MSG);
    },
    async saveUpload() {
      throw new StorageError(READONLY_MSG);
    },
    async removeUpload() {},
  };
}

export function createStorage(dirs) {
  if (mode === "blob") return blobStore();
  if (mode === "readonly") return readonlyStore();
  return localStore(dirs);
}
