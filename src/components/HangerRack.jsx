import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TeeMockup from "./TeeMockup.jsx";
import { ArrowIcon, WhatsAppIcon } from "./Icons.jsx";
import { formatINR } from "../lib/api.js";
import { useStore } from "../lib/store.jsx";
import { openWhatsApp, productMessage } from "../lib/whatsapp.js";

const Rack3D = lazy(() => import("./Rack3D.jsx"));

class Safe extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const Hanger = () => (
  <svg className="flat-hanger" viewBox="0 0 120 52" aria-hidden="true">
    <path d="M60 4a7 7 0 1 1 6 7c-3 1-6 3-6 7v4" fill="none" stroke="#d8b07f" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M60 22 8 46a3 3 0 0 0 1 5h102a3 3 0 0 0 1-5Z" fill="none" stroke="#2a2a2a" strokeWidth="5" strokeLinejoin="round" />
  </svg>
);

// 2D version: shown while 3D loads, or when a device can't do 3D.
function FlatRack({ items, index, setIndex }) {
  return (
    <div className="flat-rack">
      <div className="flat-rail" />
      <div className="flat-row" style={{ "--i": index }}>
        {items.map((p, i) => (
          <button
            key={p.id}
            className={`flat-tee ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={p.name}
          >
            <Hanger />
            {p.image ? <img src={p.image} alt="" loading="lazy" /> : <TeeMockup color={p.color} graphic={p.graphic} />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HangerRack({ products }) {
  const navigate = useNavigate();
  const { settings } = useStore();
  const items = products
    .filter((p) => p.onRack !== false && p.inStock !== false)
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      category: p.category,
      colors: p.colors || [],
      color: p.colors?.[0]?.hex || "#111111",
      graphic: p.graphic,
      image: p.images?.[0] || "",
      product: p,
    }));

  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);

  // Only download the 3D engine when the rack is about to scroll into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length > 0]);

  useEffect(() => {
    if (index > items.length - 1) setIndex(Math.max(0, items.length - 1));
  }, [items.length, index]);

  if (!items.length) return null;

  const cur = items[Math.min(index, items.length - 1)];
  const off = cur.mrp > cur.price ? Math.round((1 - cur.price / cur.mrp) * 100) : 0;
  const go = (d) => setIndex((i) => Math.min(items.length - 1, Math.max(0, i + d)));
  const flat = <FlatRack items={items} index={index} setIndex={setIndex} />;

  return (
    <section className="section rack-section" ref={ref} aria-label="On the rack">
      <div className="wrap section-head">
        <div>
          <span className="eyebrow">Printed &amp; ready · 3D</span>
          <h2 className="display-sm">
            On the <span className="grad-text">rack</span>
          </h2>
        </div>
        <Link to="/shop" className="link-arrow">
          Shop all tees <ArrowIcon width={16} height={16} />
        </Link>
      </div>

      <div
        className="rack-stage"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "Enter") navigate(`/product/${cur.id}`);
        }}
      >
        <div className="rack-backdrop" aria-hidden="true" />
        {near && !failed ? (
          <Safe fallback={flat}>
            <Suspense fallback={flat}>
              <Rack3D
                items={items}
                index={index}
                onIndexChange={setIndex}
                onOpen={(i) => navigate(`/product/${items[i].id}`)}
                onFail={() => setFailed(true)}
              />
            </Suspense>
          </Safe>
        ) : (
          flat
        )}
        <button className="rack-arrow prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous tee">
          <ArrowIcon width={20} height={20} />
        </button>
        <button className="rack-arrow next" onClick={() => go(1)} disabled={index === items.length - 1} aria-label="Next tee">
          <ArrowIcon width={20} height={20} />
        </button>
        <span className="rack-hint">Drag to browse · tap a tee to open</span>
      </div>

      <div className="wrap">
        <div className="rack-info" aria-live="polite">
          <div className="rack-meta">
            <div className="rack-tags">
              {off > 0 && <span className="sale-pill">Sale · {off}% off</span>}
              <span className="rack-cat">{cur.category}</span>
              <span className="dots">
                {cur.colors.map((c) => (
                  <i key={c.name} style={{ background: c.hex }} title={c.name} />
                ))}
              </span>
            </div>
            <h3>{cur.name}</h3>
            <div className="price">
              <strong>{formatINR(cur.price)}</strong>
              {off > 0 && <s>{formatINR(cur.mrp)}</s>}
            </div>
          </div>
          <div className="rack-actions">
            <Link to={`/product/${cur.id}`} className="btn btn-ghost">
              View tee
            </Link>
            <button
              className="btn btn-wa"
              onClick={() =>
                openWhatsApp(settings.whatsapp, productMessage(cur.product, { size: "M", color: cur.colors[0]?.name, qty: 1 }))
              }
            >
              <WhatsAppIcon width={18} height={18} /> Buy on WhatsApp
            </button>
          </div>
          <div className="rack-dots" role="tablist" aria-label="Tees on the rack">
            {items.map((p, i) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={i === index}
                aria-label={p.name}
                className={i === index ? "active" : ""}
                onClick={() => setIndex(i)}
              />
            ))}
            <span className="rack-count">
              {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
