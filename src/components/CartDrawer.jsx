import { useEffect } from "react";
import { Link } from "react-router-dom";
import TeeMockup from "./TeeMockup.jsx";
import { CloseIcon, TrashIcon, WhatsAppIcon } from "./Icons.jsx";
import { formatINR } from "../lib/api.js";
import { useStore } from "../lib/store.jsx";

export default function CartDrawer() {
  const { cart, cartTotal, cartCount, updateQty, removeItem, drawerOpen, setDrawerOpen } = useStore();
  const close = () => setDrawerOpen(false);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <div className={`drawer-root ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" role="dialog" aria-label="Your bag">
        <div className="drawer-head">
          <h2>
            Your bag <span>{cartCount}</span>
          </h2>
          <button className="icon-btn" onClick={close} aria-label="Close bag">
            <CloseIcon />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="drawer-empty">
            <p className="muted">Your bag is empty.</p>
            <Link to="/shop" className="btn btn-primary" onClick={close}>
              Shop tees
            </Link>
          </div>
        ) : (
          <>
            <ul className="drawer-list">
              {cart.map((i) => (
                <li key={i.key} className="drawer-item">
                  <div className="drawer-thumb">
                    {i.image ? <img src={i.image} alt="" /> : <TeeMockup color={i.colorHex} graphic={i.graphic} />}
                  </div>
                  <div className="drawer-info">
                    <b>{i.name}</b>
                    <span className="muted small">
                      {i.color} · {i.size}
                    </span>
                    <div className="qty qty-sm">
                      <button onClick={() => updateQty(i.key, i.qty - 1)} aria-label="Less">−</button>
                      <input value={i.qty} readOnly aria-label="Quantity" />
                      <button onClick={() => updateQty(i.key, i.qty + 1)} aria-label="More">+</button>
                    </div>
                  </div>
                  <div className="drawer-right">
                    <strong>{formatINR(i.price * i.qty)}</strong>
                    <button className="icon-btn" onClick={() => removeItem(i.key)} aria-label={`Remove ${i.name}`}>
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="sum-row total">
                <span>Subtotal</span>
                <span>{formatINR(cartTotal)}</span>
              </div>
              <p className="muted small">Delivery and payment are confirmed with you on WhatsApp.</p>
              <Link to="/bag" className="btn btn-wa btn-lg btn-block" onClick={close}>
                <WhatsAppIcon /> Checkout on WhatsApp
              </Link>
              <button className="btn btn-ghost btn-block" onClick={close}>
                Keep shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
