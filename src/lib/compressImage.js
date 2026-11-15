// Shrinks photos in the browser before upload (phone photos are often 5–10 MB).
// Keeps GIFs as they are. Falls back to the original file if anything goes wrong.

export async function compressImage(file, { max = 1800, quality = 0.84 } = {}) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    const out = blob && blob.type === "image/webp" ? blob : await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!out || out.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + (out.type === "image/webp" ? ".webp" : ".jpg");
    return new File([out], name, { type: out.type });
  } catch {
    return file;
  }
}

/** Uploads images (compressed) through the admin API and returns their URLs. */
export async function uploadImages(api, files) {
  const form = new FormData();
  for (const f of files) form.append("images", await compressImage(f));
  const { urls } = await api("/upload", { method: "POST", form, auth: true });
  return urls;
}
