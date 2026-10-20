import { useState } from "react";
import { Link } from "react-router-dom";
import TeeMockup from "../components/TeeMockup.jsx";
import { TrashIcon, WhatsAppIcon } from "../components/Icons.jsx";
import { formatINR } from "../lib/api.js";
import { useStore } from "../lib/store.jsx";
import usePageTitle from "../lib/usePageTitle.js";
import { cartMessage, openWhatsApp } from "../lib/whatsapp.js";

export default function Bag() {
  const { cart, cartTotal, updateQty, removeItem, clearCart, settings, setToast } = useStore();
  const [customer, setCustomer] = useState({ name: "", city: "Jodhpur", address: "", note: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setCustomer((c) => ({ ...c, [k]: e.target.value }));
  usePageTitle("Your bag");

  if (!cart.length)
    return (
      <section className="wrap empty page">
        <h1 className="display-sm">Your bag is empty</h1>
        <p className="muted">Pick a tee you like. You'll finish the order on WhatsApp.</p>
        <Link to="/shop" className="btn btn-primary">Shop tees</Link>
      </section>
    );

  const send = (e) => {
    e.preventDefault();
    if (!customer.name.trim()) return setError("Please add your name so we know who's ordering.");
    setError("");
    openWhatsApp(settings.whatsapp, cartMessage(cart, customer));
    setToast("Order sent to WhatsApp. Hit send in the chat!");
  };

  return (
    <section className="wrap page">
      <div className="page-head">
        <span className="eyebrow">Your bag</span>
        <h1 className="display-sm">Almost yours.</h1>
      </div>

      <div className="bag">
        <ul className="bag-list">
          {cart.map((i) => (
            <li key={i.key} className="bag-item">
              <Link to={`/product/${i.id}`} className="bag-thumb">
                {i.image ? <img src={i.image} alt={i.name} /> : <TeeMockup color={i.colorHex} graphic={i.graphic} />}
              </Link>
              <div className="bag-info">
                <Link to={`/product/${i.id}`}>
                  <h3>{i.name}</h3>
                </Link>
                <p className="muted small">
                  {i.color} · Size {i.size} · {formatINR(i.price)} each
                </p>
                <div className="qty qty-sm">
                  <button onClick={() => updateQty(i.key, i.qty - 1)} aria-label="Less">−</button>
                  <input
                    value={i.qty}
                    inputMode="numeric"
                    onChange={(e) => updateQty(i.key, parseInt(e.target.value, 10) || 1)}
                    aria-label="Quantity"
                  />
                  <button onClick={() => updateQty(i.key, i.qty + 1)} aria-label="More">+</button>
                </div>
              </div>
              <div className="bag-right">
                <strong>{formatINR(i.price * i.qty)}</strong>
                <button className="icon-btn" onClick={() => removeItem(i.key)} aria-label={`Remove ${i.name}`}>
                  <TrashIcon width={18} height={18} />
                </button>
              </div>
            </li>
          ))}
          <li>
            <button className="link-btn" onClick={clearCart}>Clear bag</button>
          </li>
        </ul>

        <form className="summary" onSubmit={send}>
          <h2>Order summary</h2>
          <div className="sum-row">
            <span>Items</span>
            <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
          </div>
          <div className="sum-row total">
            <span>Total</span>
            <span>{formatINR(cartTotal)}</span>
          </div>
          <p className="muted small">Delivery charges and payment are confirmed on WhatsApp.</p>

          <label className="field">
            <span>Your name *</span>
            <input value={customer.name} onChange={set("name")} placeholder="e.g. Aditya Singh" />
          </label>
          <label className="field">
            <span>City</span>
            <input value={customer.city} onChange={set("city")} />
          </label>
          <label className="field">
            <span>Delivery address (optional)</span>
            <textarea rows={2} value={customer.address} onChange={set("address")} />
          </label>
          <label className="field">
            <span>Note (custom text, name to print…)</span>
            <textarea rows={2} value={customer.note} onChange={set("note")} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-wa btn-lg btn-block" type="submit">
            <WhatsAppIcon /> Send order on WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}
