import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { uploadImages } from "../lib/compressImage.js";
import { ArrowIcon, PlusIcon, TrashIcon } from "../components/Icons.jsx";
import { DEFAULT_HOME } from "../../shared/homeDefaults.js";

/** One photo slot: upload (auto-compressed), replace or remove. */
function ImageField({ label, hint, value, onChange, onError, ratio = "4 / 3" }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const [url] = await uploadImages(api, [file]);
      onChange(url);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="field">
      <span>{label}</span>
      <div className="img-field" style={{ "--ratio": ratio }}>
        {value ? <img src={value} alt="" /> : <div className="img-empty">{hint}</div>}
        <div className="img-actions">
          <label className="btn btn-primary btn-sm">
            {busy ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
          </label>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, children, onReset }) {
  return (
    <section className="admin-card">
      <header>
        <div>
          <h2>{title}</h2>
          {desc && <p className="muted small">{desc}</p>}
        </div>
        {onReset && (
          <button type="button" className="link-btn" onClick={onReset}>
            Reset
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

export default function HomeTab({ settings, onSave, onAuthError }) {
  const [h, setH] = useState(() => structuredClone(settings.home || DEFAULT_HOME));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const savedJson = JSON.stringify(settings.home || DEFAULT_HOME);
  const dirty = JSON.stringify(h) !== savedJson;
  // after a save the server returns the tidied version (empty lines removed etc.): show that
  useEffect(() => {
    setH(JSON.parse(savedJson));
  }, [savedJson]);

  const fail = (err) => (err.status === 401 ? onAuthError(err) : setError(err.message));
  const patch = (key, value) => setH((x) => ({ ...x, [key]: typeof value === "function" ? value(x[key]) : value }));
  const setIn = (key, i, field, value) => patch(key, (arr) => arr.map((it, j) => (j === i ? { ...it, [field]: value } : it)));
  const reset = (key) => patch(key, structuredClone(DEFAULT_HOME[key]));

  const save = async () => {
    setBusy(true);
    setError("");
    await onSave({ ...settings, home: h }, "Home page saved ✔");
    setBusy(false);
  };

  const addGallery = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    setGalleryBusy(true);
    setError("");
    try {
      const urls = await uploadImages(api, files.slice(0, 8));
      patch("gallery", (g) => [...g, ...urls.map((image) => ({ image, caption: "" }))].slice(0, 30));
    } catch (err) {
      fail(err);
    } finally {
      setGalleryBusy(false);
    }
  };
  const moveGallery = (i, d) =>
    patch("gallery", (g) => {
      const next = [...g];
      const j = i + d;
      if (j < 0 || j >= next.length) return g;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="home-admin">
      <div className="admin-head">
        <div>
          <h1>Home page</h1>
          <p className="muted small">Change every photo and text on the home page. Photos are shrunk automatically before upload.</p>
        </div>
        <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noreferrer">
          View home page ↗
        </a>
      </div>
      {error && <div className="alert">{error}</div>}

      <Card title="Hero (top of the page)" desc="Leave the photo empty to show the spinning 3D tee." onReset={() => reset("hero")}>
        <div className="row">
          <label className="field">
            <span>Small label</span>
            <input value={h.hero.eyebrow} maxLength={60} onChange={(e) => patch("hero", (x) => ({ ...x, eyebrow: e.target.value }))} />
          </label>
          <div className="row">
            <label className="field">
              <span>Headline</span>
              <input value={h.hero.title} maxLength={40} onChange={(e) => patch("hero", (x) => ({ ...x, title: e.target.value }))} />
            </label>
            <label className="field">
              <span>Highlighted word</span>
              <input value={h.hero.highlight} maxLength={30} onChange={(e) => patch("hero", (x) => ({ ...x, highlight: e.target.value }))} />
            </label>
          </div>
        </div>
        <label className="field">
          <span>Text under the headline</span>
          <textarea rows={2} maxLength={300} value={h.hero.subtitle} onChange={(e) => patch("hero", (x) => ({ ...x, subtitle: e.target.value }))} />
        </label>
        <ImageField
          label="Hero photo (optional)"
          hint="No photo: the 3D tee is shown"
          ratio="16 / 10"
          value={h.hero.image}
          onChange={(v) => patch("hero", (x) => ({ ...x, image: v }))}
          onError={fail}
        />
      </Card>

      <Card title="Numbers under the buttons" desc="Up to 3. Empty the list to hide them." onReset={() => reset("stats")}>
        {h.stats.map((st, i) => (
          <div key={i} className="inline-row">
            <input value={st.value} placeholder="e.g. 500+" maxLength={30} onChange={(e) => setIn("stats", i, "value", e.target.value)} />
            <input value={st.label} placeholder="e.g. happy customers" maxLength={40} onChange={(e) => setIn("stats", i, "label", e.target.value)} />
            <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => patch("stats", (a) => a.filter((_, j) => j !== i))}>
              <TrashIcon width={16} height={16} />
            </button>
          </div>
        ))}
        {h.stats.length < 3 && (
          <button type="button" className="link-btn" onClick={() => patch("stats", (a) => [...a, { value: "", label: "" }])}>
            + Add number
          </button>
        )}
      </Card>

      <Card title="Moving banner" desc="One phrase per line." onReset={() => reset("marquee")}>
        <textarea
          className="plain-area"
          rows={4}
          value={h.marquee.join("\n")}
          onChange={(e) => patch("marquee", e.target.value.split("\n").map((l) => l.slice(0, 30)).slice(0, 16))}
        />
      </Card>

      <Card title="Shop-by-style tiles" desc="A photo makes the tile full-bleed. Without one, a tee drawing is shown." onReset={() => reset("categories")}>
        <div className="tile-grid">
          {h.categories.map((c, i) => (
            <div key={c.id} className="tile-edit">
              <span className="chip-mini">{c.id}</span>
              <label className="field">
                <span>Title</span>
                <input value={c.title} maxLength={40} onChange={(e) => setIn("categories", i, "title", e.target.value)} />
              </label>
              <label className="field">
                <span>Short text</span>
                <input value={c.blurb} maxLength={90} onChange={(e) => setIn("categories", i, "blurb", e.target.value)} />
              </label>
              <ImageField
                label="Photo"
                hint="No photo: tee drawing"
                value={c.image}
                onChange={(v) => setIn("categories", i, "image", v)}
                onError={fail}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Lookbook gallery" desc="Photos of your printed tees and happy customers. Up to 30. Hidden when empty.">
        <label className="btn btn-primary btn-sm upload-many">
          <PlusIcon /> {galleryBusy ? "Uploading…" : "Add photos"}
          <input type="file" accept="image/*" multiple hidden onChange={addGallery} disabled={galleryBusy} />
        </label>
        {h.gallery.length > 0 && (
          <div className="gallery-admin">
            {h.gallery.map((g, i) => (
              <div key={g.image + i} className="gallery-admin-item">
                <img src={g.image} alt="" />
                <input value={g.caption} placeholder="Caption (optional)" maxLength={90} onChange={(e) => setIn("gallery", i, "caption", e.target.value)} />
                <div className="gallery-admin-actions">
                  <button type="button" className="icon-btn" aria-label="Move left" onClick={() => moveGallery(i, -1)} disabled={i === 0}>
                    <ArrowIcon width={14} height={14} style={{ transform: "rotate(180deg)" }} />
                  </button>
                  <button type="button" className="icon-btn" aria-label="Move right" onClick={() => moveGallery(i, 1)} disabled={i === h.gallery.length - 1}>
                    <ArrowIcon width={14} height={14} />
                  </button>
                  <button type="button" className="icon-btn danger" aria-label="Remove photo" onClick={() => patch("gallery", (a) => a.filter((_, j) => j !== i))}>
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Bulk orders block" onReset={() => reset("bulk")}>
        <label className="field">
          <span>Heading</span>
          <input value={h.bulk.title} maxLength={90} onChange={(e) => patch("bulk", (x) => ({ ...x, title: e.target.value }))} />
        </label>
        <label className="field">
          <span>Text</span>
          <textarea rows={2} maxLength={260} value={h.bulk.text} onChange={(e) => patch("bulk", (x) => ({ ...x, text: e.target.value }))} />
        </label>
        <div className="row row-3">
          {[0, 1, 2].map((i) => (
            <label key={i} className="field">
              <span>Point {i + 1}</span>
              <input
                value={h.bulk.points[i] || ""}
                maxLength={40}
                onChange={(e) =>
                  patch("bulk", (x) => {
                    const points = [...x.points];
                    points[i] = e.target.value;
                    return { ...x, points: points.filter((p, k) => p || k < i) };
                  })
                }
              />
            </label>
          ))}
        </div>
        <ImageField
          label="Photo (optional)"
          hint="No photo: stack of tee drawings"
          value={h.bulk.image}
          onChange={(v) => patch("bulk", (x) => ({ ...x, image: v }))}
          onError={fail}
        />
      </Card>

      <Card title="Questions (FAQ)" desc="Empty the list to hide the section." onReset={() => reset("faq")}>
        {h.faq.map((f, i) => (
          <div key={i} className="faq-edit">
            <div className="inline-row">
              <input value={f.q} placeholder="Question" maxLength={140} onChange={(e) => setIn("faq", i, "q", e.target.value)} />
              <button type="button" className="icon-btn danger" aria-label="Remove question" onClick={() => patch("faq", (a) => a.filter((_, j) => j !== i))}>
                <TrashIcon width={16} height={16} />
              </button>
            </div>
            <textarea rows={2} placeholder="Answer" maxLength={600} value={f.a} onChange={(e) => setIn("faq", i, "a", e.target.value)} />
          </div>
        ))}
        {h.faq.length < 12 && (
          <button type="button" className="link-btn" onClick={() => patch("faq", (a) => [...a, { q: "", a: "" }])}>
            + Add question
          </button>
        )}
      </Card>

      <div className={`save-bar ${dirty ? "show" : ""}`}>
        <span>You have unsaved changes</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setH(structuredClone(settings.home || DEFAULT_HOME))}>
          Discard
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save home page"}
        </button>
      </div>
    </div>
  );
}
