import { Component, Suspense, lazy, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ProductCard, { ProductVisual } from "../components/ProductCard.jsx";
import usePageTitle from "../lib/usePageTitle.js";
import { BagIcon, WhatsAppIcon } from "../components/Icons.jsx";
import { api, formatINR } from "../lib/api.js";
import { loadProducts, useStore } from "../lib/store.jsx";
import { openWhatsApp, productMessage } from "../lib/whatsapp.js";

const Hero3D = lazy(() => import("../components/Hero3D.jsx"));

class Safe3D extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const SIZE_CHART = [
  ["S", "38", "27"],
  ["M", "40", "28"],
  ["L", "42", "29"],
  ["XL", "44", "30"],
  ["XXL", "46", "31"],
];

export default function Product() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const start3d = params.get("view") === "3d";
  const { settings, addToCart } = useStore();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [imgIndex, setImgIndex] = useState(0);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [warn, setWarn] = useState("");
  const [view3d, setView3d] = useState(false);
  const [related, setRelated] = useState([]);
  usePageTitle(product?.name);

  useEffect(() => {
    setProduct(null);
    setError("");
    api(`/products/${id}`)
      .then((p) => {
        setProduct(p);
        setColor(p.colors?.[0] || null);
        setSize(p.sizes?.includes("M") ? "M" : p.sizes?.[0] || "");
        setQty(p.category === "Custom" && p.tag === "Bulk" ? 10 : 1);
        setImgIndex(0);
        setView3d(start3d);
      })
      .catch((e) => setError(e.message));
    loadProducts()
      .then((all) => {
        const self = all.find((p) => p.id === id);
        const same = all.filter((p) => p.id !== id && p.category === self?.category);
        const rest = all.filter((p) => p.id !== id && p.category !== self?.category);
        setRelated([...same, ...rest].slice(0, 4));
      })
      .catch(() => setRelated([]));
  }, [id]);

  if (error)
    return (
      <section className="wrap empty">
        <p>{error}</p>
        <Link to="/shop" className="btn btn-primary">Back to shop</Link>
      </section>
    );
  if (!product)
    return (
      <section className="wrap page">
        <div className="pdp">
          <div className="pdp-media skeleton" />
          <div />
        </div>
      </section>
    );

  const images = product.images || [];
  const off = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  const choice = { size, color: color?.name, colorHex: color?.hex, qty };

  const validate = () => {
    if (product.sizes?.length && !size) {
      setWarn("Please pick a size.");
      return false;
    }
    setWarn("");
    return true;
  };

  return (
    <section className="wrap page">
      <nav className="crumbs">
        <Link to="/shop">Shop</Link> / <Link to={`/shop?cat=${product.category}`}>{product.category}</Link> /{" "}
        <span>{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="pdp-gallery">
          <div className="pdp-media">
            {view3d ? (
              <Safe3D fallback={<ProductVisual product={product} colorHex={color?.hex} image={null} />}>
                <Suspense fallback={<div className="hero3d hero3d-loading" />}>
                  <Hero3D color={color?.hex || "#141414"} graphic={product.graphic || "TRADE WORLD"} onFail={() => setView3d(false)} />
                </Suspense>
              </Safe3D>
            ) : (
              <ProductVisual product={product} colorHex={color?.hex} image={images[imgIndex] ?? null} />
            )}
            {product.tag && <span className="chip chip-tag">{product.tag}</span>}
            <div className="view-toggle" role="group" aria-label="View">
              <button className={!view3d ? "active" : ""} onClick={() => setView3d(false)}>
                {images.length ? "Photos" : "Flat"}
              </button>
              <button className={view3d ? "active" : ""} onClick={() => setView3d(true)}>
                3D view
              </button>
            </div>
            {view3d && <span className="view-hint">Drag to spin · pick a colour</span>}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <button key={src} className={i === imgIndex ? "active" : ""} onClick={() => setImgIndex(i)}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pdp-info">
          <span className="eyebrow">{product.category} tee</span>
          <h1 className="pdp-title">{product.name}</h1>
          <div className="price price-lg">
            <strong>{formatINR(product.price)}</strong>
            {off > 0 && (
              <>
                <s>{formatINR(product.mrp)}</s>
                <em>{off}% off</em>
              </>
            )}
          </div>
          {product.tag === "Bulk" && <p className="note">Price per piece · minimum 10 pieces</p>}
          <p className="muted">{product.description}</p>

          {product.colors?.length > 0 && (
            <div className="opt">
              <div className="opt-label">
                Colour <b>{color?.name}</b>
              </div>
              <div className="swatches">
                {product.colors.map((c) => (
                  <button
                    key={c.name + c.hex}
                    className={`swatch ${color?.name === c.name ? "active" : ""}`}
                    style={{ background: c.hex }}
                    onClick={() => setColor(c)}
                    aria-label={c.name}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {product.sizes?.length > 0 && (
            <div className="opt">
              <div className="opt-label">
                Size <b>{size}</b>
              </div>
              <div className="sizes">
                {product.sizes.map((s) => (
                  <button key={s} className={`size ${size === s ? "active" : ""}`} onClick={() => setSize(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="opt">
            <div className="opt-label">Quantity</div>
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less">−</button>
              <input
                value={qty}
                inputMode="numeric"
                onChange={(e) => setQty(Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)))}
                aria-label="Quantity"
              />
              <button onClick={() => setQty((q) => Math.min(999, q + 1))} aria-label="More">+</button>
            </div>
          </div>

          {warn && <p className="error">{warn}</p>}

          <div className="pdp-cta">
            <button
              className="btn btn-wa btn-lg"
              disabled={!product.inStock}
              onClick={() => validate() && openWhatsApp(settings.whatsapp, productMessage(product, choice))}
            >
              <WhatsAppIcon /> {product.inStock ? `Buy on WhatsApp · ${formatINR(product.price * qty)}` : "Sold out"}
            </button>
            <button
              className="btn btn-ghost btn-lg"
              disabled={!product.inStock}
              onClick={() => validate() && addToCart(product, choice)}
            >
              <BagIcon /> Add to bag
            </button>
          </div>

          <ul className="specs">
            {product.printType && (
              <li>
                <span>Print</span>
                <b>{product.printType}</b>
              </li>
            )}
            {product.fabric && (
              <li>
                <span>Fabric</span>
                <b>{product.fabric}</b>
              </li>
            )}
            <li>
              <span>Customise</span>
              <b>Name / logo / text on request</b>
            </li>
            <li>
              <span>Printed in</span>
              <b>Jodhpur, Rajasthan</b>
            </li>
          </ul>

          <details className="size-guide">
            <summary>Size guide (inches)</summary>
            <table>
              <thead>
                <tr><th>Size</th><th>Chest</th><th>Length</th></tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((r) => (
                  <tr key={r[0]}>{r.map((c) => <td key={c}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">Oversized fits run about 2 inches wider. Ask us on WhatsApp if you're unsure.</p>
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <div className="related">
          <div className="section-head">
            <h2 className="display-sm">
              You may also <span className="grad-text">like</span>
            </h2>
            <Link to="/shop" className="link-arrow">View all</Link>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {product.inStock && (
        <div className="buy-bar">
          <div>
            <b>{formatINR(product.price * qty)}</b>
            <span className="muted small">
              {color?.name} · {size || "pick size"} · Qty {qty}
            </span>
          </div>
          <button className="icon-btn" onClick={() => validate() && addToCart(product, choice)} aria-label="Add to bag">
            <BagIcon />
          </button>
          <button
            className="btn btn-wa"
            onClick={() => validate() && openWhatsApp(settings.whatsapp, productMessage(product, choice))}
          >
            <WhatsAppIcon width={18} height={18} /> Buy now
          </button>
        </div>
      )}
    </section>
  );
}
