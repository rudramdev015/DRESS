import { useCallback, useEffect, useState } from "react";
import { ArrowIcon, CloseIcon } from "./Icons.jsx";

/** Photo gallery of printed tees (Admin → Home page → Gallery) with a full-screen viewer. */
export default function Lookbook({ items }) {
  const [open, setOpen] = useState(-1);
  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((d) => setOpen((i) => (i + d + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  if (!items?.length) return null;
  const cur = items[open];

  return (
    <section className="section wrap" aria-label="Lookbook">
      <div className="section-head">
        <div>
          <span className="eyebrow">Real prints · real people</span>
          <h2 className="display-sm">
            The <span className="grad-text">lookbook</span>
          </h2>
        </div>
        <span className="muted small">{items.length} photos</span>
      </div>
      <div className="gallery">
        {items.map((g, i) => (
          <button key={g.image + i} className="gallery-item reveal" onClick={() => setOpen(i)} aria-label={g.caption || `Photo ${i + 1}`}>
            <img src={g.image} alt={g.caption || "Printed T-shirt by Trade World"} loading="lazy" decoding="async" />
            {g.caption && <figcaption>{g.caption}</figcaption>}
          </button>
        ))}
      </div>

      {cur && (
        <div className="lightbox" role="dialog" aria-label="Photo viewer" onClick={(e) => e.target === e.currentTarget && close()}>
          <div>
            <img src={cur.image} alt={cur.caption || ""} />
            {cur.caption && <p>{cur.caption}</p>}
          </div>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
          {items.length > 1 && (
            <>
              <button className="icon-btn lb-nav prev" onClick={() => step(-1)} aria-label="Previous photo">
                <ArrowIcon />
              </button>
              <button className="icon-btn lb-nav next" onClick={() => step(1)} aria-label="Next photo">
                <ArrowIcon />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
