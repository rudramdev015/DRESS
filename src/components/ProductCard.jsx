import { Link } from "react-router-dom";
import TeeMockup from "./TeeMockup.jsx";
import { WhatsAppIcon } from "./Icons.jsx";
import { formatINR } from "../lib/api.js";
import { useStore } from "../lib/store.jsx";
import { openWhatsApp, productMessage } from "../lib/whatsapp.js";

export function ProductVisual({ product, colorHex, image, className = "" }) {
  const src = image ?? product.images?.[0];
  if (src) return <img src={src} alt={product.name} className={`pv-img ${className}`} loading="lazy" />;
  return <TeeMockup color={colorHex || product.colors?.[0]?.hex} graphic={product.graphic} className={className} />;
}

export default function ProductCard({ product }) {
  const { settings } = useStore();
  const off = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  const quickOrder = (e) => {
    e.preventDefault();
    openWhatsApp(
      settings.whatsapp,
      productMessage(product, { size: "M", color: product.colors?.[0]?.name, qty: 1 })
    );
  };

  return (
    <Link to={`/product/${product.id}`} className="card reveal" style={{ "--tint": product.colors?.[0]?.hex || "#d8a57a" }}>
      <div className="card-media">
        <ProductVisual product={product} />
        {product.tag && <span className="chip chip-tag">{product.tag}</span>}
        {!product.inStock && <span className="chip chip-out">Sold out</span>}
        <button className="card-wa" onClick={quickOrder} aria-label={`Order ${product.name} on WhatsApp`}>
          <WhatsAppIcon width={18} height={18} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span>{product.category}</span>
          <span className="dots">
            {product.colors?.slice(0, 4).map((c) => (
              <i key={c.hex + c.name} style={{ background: c.hex }} title={c.name} />
            ))}
          </span>
        </div>
        <h3>{product.name}</h3>
        <div className="price">
          <strong>{formatINR(product.price)}</strong>
          {off > 0 && (
            <>
              <s>{formatINR(product.mrp)}</s>
              <em>{off}% off</em>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
