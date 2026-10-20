import { useState } from "react";
import { InstagramIcon, PlusIcon, TrashIcon } from "../components/Icons.jsx";
import { api } from "../lib/api.js";

/** Admin tab: Instagram reels / uploaded videos + real customer reviews. */
export default function MediaTab({ settings, onSave, onAuthError }) {
  const reels = settings.reels || [];
  const reviews = settings.reviews || [];
  const [igUrl, setIgUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(reviews);

  const saveReels = (next, note) => onSave({ ...settings, reels: next }, note);

  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 80 * 1024 * 1024) return setError("Video is too big. Keep it under 80 MB (a 15–60 second reel is perfect).");
    const form = new FormData();
    form.append("video", file);
    setUploading(true);
    setError("");
    try {
      const { url } = await api("/upload-video", { method: "POST", form, auth: true });
      await saveReels([...reels, { type: "video", url, caption: caption.trim() }], "Video added ✔");
      setCaption("");
    } catch (err) {
      if (err.status === 401) onAuthError(err);
      else setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const addInstagram = async () => {
    const url = igUrl.trim().split("?")[0];
    if (!/^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\//.test(url)) {
      return setError("Paste a link like https://www.instagram.com/reel/XXXXXXXX/");
    }
    setError("");
    await saveReels([...reels, { type: "instagram", url, caption: caption.trim() }], "Instagram reel added ✔");
    setIgUrl("");
    setCaption("");
  };

  const move = (i, dir) => {
    const next = [...reels];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    saveReels(next, "Order saved ✔");
  };

  const setReview = (i, k, v) => setDraft((d) => d.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div>
      <section className="admin-section">
        <h1>Reels & Reviews</h1>
        <h2>Instagram reels / videos</h2>
        <p className="muted small">
          These play on your home page in a "Watch us print" section. Upload a short vertical video (MP4, 15–60 sec) or paste
          a public Instagram reel link.
        </p>

        <label className="field">
          <span>Caption (optional)</span>
          <input value={caption} maxLength={120} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. 50 tees for JNVU fest 🔥" />
        </label>
        <div className="media-add">
          <label className="btn btn-primary">
            <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={uploadVideo} />
            <PlusIcon /> {uploading ? "Uploading video…" : "Upload video"}
          </label>
          <label className="field">
            <span>…or Instagram reel link</span>
            <input value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" />
          </label>
          <button type="button" className="btn btn-ig" onClick={addInstagram}>
            <InstagramIcon /> Add reel
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <div className="media-list">
          {reels.length === 0 && <p className="muted small">No reels yet. The home page shows an Instagram button instead (if you set your Instagram link in Settings).</p>}
          {reels.map((r, i) => (
            <div key={r.url + i} className="media-row">
              {r.type === "video" ? (
                <video src={r.url} muted preload="metadata" />
              ) : (
                <span className="ig-thumb">
                  <InstagramIcon />
                </span>
              )}
              <div>
                <b>{r.caption || (r.type === "video" ? "Uploaded video" : "Instagram reel")}</b>
                <div className="muted small">{r.type === "video" ? "Video file" : r.url}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <button type="button" className="link-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑ Move up</button>
                  <button type="button" className="link-btn" onClick={() => move(i, 1)} disabled={i === reels.length - 1}>↓ Move down</button>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Remove reel"
                onClick={() => saveReels(reels.filter((_, j) => j !== i), "Reel removed")}
              >
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2>Customer reviews</h2>
        <p className="muted small">
          Add <b>real</b> reviews from your customers (e.g. copied from WhatsApp or Google with their permission). Real reviews
          build trust. Fake ones destroy it. The section stays hidden until you add one.
        </p>
        {draft.map((r, i) => (
          <div key={i} className="review-edit">
            <div className="review-edit-top">
              <label className="field">
                <span>Name</span>
                <input value={r.name} onChange={(e) => setReview(i, "name", e.target.value)} />
              </label>
              <label className="field">
                <span>City</span>
                <input value={r.city} onChange={(e) => setReview(i, "city", e.target.value)} />
              </label>
              <label className="field">
                <span>Stars</span>
                <select value={r.rating} onChange={(e) => setReview(i, "rating", Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{"★".repeat(n)}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Remove review"
                onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              >
                <TrashIcon width={16} height={16} />
              </button>
            </div>
            <label className="field">
              <span>Review</span>
              <textarea rows={2} value={r.text} onChange={(e) => setReview(i, "text", e.target.value)} />
            </label>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDraft((d) => [...d, { name: "", city: "Jodhpur", text: "", rating: 5 }])}
          >
            <PlusIcon /> Add review
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave({ ...settings, reviews: draft }, "Reviews saved ✔")}>
            Save reviews
          </button>
        </div>
      </section>
    </div>
  );
}
