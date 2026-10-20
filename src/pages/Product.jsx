import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProductVisual } from "../components/ProductCard.jsx";
import { BagIcon, WhatsAppIcon } from "../components/Icons.jsx";
import { api, formatINR } from "../lib/api.js";
import { useStore } from "../lib/store.jsx";
import { openWhatsApp, productMessage } from "../lib/whatsapp.js";

const SIZE_CHART = [
  ["S", "38", "27"],
  ["M", "40", "28"],
  ["L", "42", "29"],
  ["XL", "44", "30"],
  ["XXL", "46", "31"],
];

export default function Product() {
  const { id } = useParams();
  const { settings, addToCart } = useStore();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [imgIndex, setImgIndex] = useState(0);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [warn, setWarn] = useState("");

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
      })
      .catch((e) => setError(e.message));
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
            <ProductVisual product={product} colorHex={color?.hex} image={images[imgIndex] ?? null} />
            {product.tag && <span className="chip chip-tag">{product.tag}</span>}
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
    </section>
  );
}
