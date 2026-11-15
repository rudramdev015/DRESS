// Small front door to the tee studio: caches shots and only downloads the 3D engine
// after the page has settled, so first paint stays fast.

const cache = new Map();
const pending = new Map();
let studio = null;
let broken = false;

const key = (color, graphic) => `${color}|${graphic || ""}`;

const idle = () =>
  new Promise((resolve) =>
    "requestIdleCallback" in window ? window.requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 400)
  );

export const peekShot = (color, graphic) => cache.get(key(color, graphic)) || null;

export function requestShot(color, graphic) {
  const k = key(color, graphic);
  if (cache.has(k)) return Promise.resolve(cache.get(k));
  if (broken) return Promise.reject(new Error("3D not available"));
  if (pending.has(k)) return pending.get(k);
  const job = (async () => {
    if (!studio) {
      await idle();
      studio = await import("./teeStudio.js");
    }
    const url = await studio.renderTee({ color, graphic });
    cache.set(k, url);
    return url;
  })();
  job.catch(() => {
    broken = true; // no WebGL on this device: keep the flat drawings
  });
  job.finally(() => pending.delete(k)).catch(() => {});
  pending.set(k, job);
  return job;
}
