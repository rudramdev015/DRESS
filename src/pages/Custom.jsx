import { useState } from "react";
import TeeMockup from "../components/TeeMockup.jsx";
import { WhatsAppIcon } from "../components/Icons.jsx";
import { useStore } from "../lib/store.jsx";
import usePageTitle from "../lib/usePageTitle.js";
import { customMessage, openWhatsApp } from "../lib/whatsapp.js";

// We print on black and white tees only.
const COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#f4f1ea" },
];

export default function Custom() {
  const { settings } = useStore();
  usePageTitle("Custom T-shirt printing");
  const [f, setF] = useState({
    name: "",
    city: "Jodhpur",
    style: "Oversized",
    color: "Black",
    qty: 1,
    sizes: "",
    placement: "Front",
    method: "Not sure — suggest one",
    date: "",
    details: "",
    previewText: "YOUR TEXT",
  });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const hex = COLORS.find((c) => c.name === f.color)?.hex || "#111111";

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Please add your name.");
    setError("");
    openWhatsApp(settings.whatsapp, customMessage(f));
  };

  return (
    <section className="wrap page">
      <div className="page-head">
        <span className="eyebrow">Custom print studio</span>
        <h1 className="display-sm">Design your own tee.</h1>
        <p className="muted">
          Fill this in, tap send, and your request opens in WhatsApp with every detail ready. Then attach your logo or photo
          in the chat.
        </p>
      </div>

      <div className="studio">
        <div className="studio-preview">
          <TeeMockup color={hex} graphic={(f.previewText || "YOUR TEXT").toUpperCase()} sub="TRADE WORLD" />
          <label className="field">
            <span>Live preview text</span>
            <input value={f.previewText} maxLength={18} onChange={set("previewText")} />
          </label>
          <p className="muted small">This preview is only a guide. We'll send you a proper mockup before printing.</p>
        </div>

        <form className="studio-form" onSubmit={submit}>
          <div className="row">
            <label className="field">
              <span>Your name *</span>
              <input value={f.name} onChange={set("name")} />
            </label>
            <label className="field">
              <span>City</span>
              <input value={f.city} onChange={set("city")} />
            </label>
          </div>

          <div className="field">
            <span>Tee style</span>
            <div className="seg">
              {["Oversized", "Classic", "Polo"].map((s) => (
                <button type="button" key={s} className={f.style === s ? "active" : ""} onClick={() => setF((x) => ({ ...x, style: s }))}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Tee colour · {f.color}</span>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.name}
                  className={`swatch ${f.color === c.name ? "active" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setF((x) => ({ ...x, color: c.name }))}
                  aria-label={c.name}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="row">
            <label className="field">
              <span>Total quantity</span>
              <input type="number" min={1} value={f.qty} onChange={set("qty")} />
            </label>
            <label className="field">
              <span>Sizes needed</span>
              <input value={f.sizes} onChange={set("sizes")} placeholder="e.g. 4 M, 4 L, 2 XL" />
            </label>
          </div>

          <div className="row">
            <label className="field">
              <span>Print placement</span>
              <select value={f.placement} onChange={set("placement")}>
                <option>Front</option>
                <option>Back</option>
                <option>Front + Back</option>
                <option>Pocket / chest logo</option>
                <option>Sleeve</option>
              </select>
            </label>
            <label className="field">
              <span>Print method</span>
              <select value={f.method} onChange={set("method")}>
                <option>Not sure — suggest one</option>
                <option>DTF (full colour)</option>
                <option>Screen print (bulk)</option>
                <option>Vinyl (names / numbers)</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Needed by</span>
            <input type="date" value={f.date} onChange={set("date")} />
          </label>

          <label className="field">
            <span>Describe your design</span>
            <textarea
              rows={4}
              value={f.details}
              onChange={set("details")}
              placeholder="Text to print, font style, logo colours, event name…"
            />
          </label>

          {error && <p className="error">{error}</p>}
          <button className="btn btn-wa btn-lg btn-block" type="submit">
            <WhatsAppIcon /> Send request on WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}
