import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProductVisual } from "../components/ProductCard.jsx";
import { CloseIcon, EditIcon, PlusIcon, TrashIcon } from "../components/Icons.jsx";
import { ALL_SIZES, CATEGORIES, PRINT_TYPES, api, formatINR, getToken, setToken } from "../lib/api.js";
import { useStore } from "../lib/store.jsx";
import MediaTab from "./AdminMedia.jsx";

const TEE_COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#f4f1ea" },
];

const EMPTY = {
  name: "",
  category: "Oversized",
  price: "",
  mrp: "",
  description: "",
  printType: "DTF",
  fabric: "",
  graphic: "",
  tag: "",
  colors: [...TEE_COLORS],
  sizes: ["S", "M", "L", "XL", "XXL"],
  images: [],
  featured: false,
  inStock: true,
};

export default function Admin() {
  const navigate = useNavigate();
  const { setSettings } = useStore();
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [settings, setLocalSettings] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const logout = () => {
    setToken(null);
    navigate("/admin/login");
  };

  const handle = (err) => {
    if (err.status === 401) logout();
    else setMsg(err.message);
  };

  useEffect(() => {
    if (!getToken()) {
      navigate("/admin/login");
      return;
    }
    api("/admin/me", { auth: true })
      .then(() => Promise.all([api("/products"), api("/settings")]))
      .then(([p, s]) => {
        setProducts(p);
        setLocalSettings(s);
      })
      .catch(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const saveProduct = async (data) => {
    const isNew = !data.id;
    const saved = await api(isNew ? "/products" : `/products/${data.id}`, {
      method: isNew ? "POST" : "PUT",
      body: data,
      auth: true,
    });
    setProducts((list) => (isNew ? [saved, ...list] : list.map((p) => (p.id === saved.id ? saved : p))));
    setEditing(null);
    setMsg(isNew ? "Product added ✔" : "Product updated ✔");
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    try {
      await api(`/products/${p.id}`, { method: "DELETE", auth: true });
      setProducts((list) => list.filter((x) => x.id !== p.id));
      setMsg("Product deleted");
    } catch (e) {
      handle(e);
    }
  };

  const toggleStock = async (p) => {
    try {
      const saved = await api(`/products/${p.id}`, { method: "PUT", body: { ...p, inStock: !p.inStock }, auth: true });
      setProducts((list) => list.map((x) => (x.id === saved.id ? saved : x)));
    } catch (e) {
      handle(e);
    }
  };

  const persistSettings = async (next, note = "Settings saved ✔") => {
    try {
      const s = await api("/settings", { method: "PUT", body: next, auth: true });
      setLocalSettings(s);
      setSettings(s);
      setMsg(note);
    } catch (err) {
      handle(err);
    }
  };

  const saveSettings = (e) => {
    e.preventDefault();
    persistSettings(settings);
  };

  const setS = (k) => (e) => setLocalSettings((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="wrap admin-top-inner">
          <Link to="/" className="admin-brand">
            <img src="/logo.jpg" alt="" /> <span>Trade World · Admin</span>
          </Link>
          <div className="admin-tabs">
            <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
            <button className={tab === "media" ? "active" : ""} onClick={() => setTab("media")}>Reels & Reviews</button>
            <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Settings</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </div>
      </header>

      <div className="wrap admin-body">
        {settings && !settings.whatsapp && (
          <div className="alert">
            ⚠ Your WhatsApp number is not set. Orders can't reach you yet.{" "}
            <button className="link-btn" onClick={() => setTab("settings")}>Set it now →</button>
          </div>
        )}

        {tab === "products" && (
          <>
            <div className="admin-head">
              <div>
                <h1>Products</h1>
                <p className="muted small">{products.length} tees in your store</p>
              </div>
              <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>
                <PlusIcon /> Add product
              </button>
            </div>
            <div className="admin-list">
              {products.map((p) => (
                <div key={p.id} className="admin-row">
                  <div className="admin-thumb">
                    <ProductVisual product={p} />
                  </div>
                  <div className="admin-row-info">
                    <b>{p.name}</b>
                    <span className="muted small">
                      {p.category} · {formatINR(p.price)}
                      {p.featured ? " · ★ Featured" : ""}
                    </span>
                  </div>
                  <button className={`stock ${p.inStock ? "on" : ""}`} onClick={() => toggleStock(p)}>
                    {p.inStock ? "In stock" : "Sold out"}
                  </button>
                  <div className="admin-row-actions">
                    <button className="icon-btn" onClick={() => setEditing({ ...EMPTY, ...p })} aria-label="Edit">
                      <EditIcon width={18} height={18} />
                    </button>
                    <button className="icon-btn danger" onClick={() => remove(p)} aria-label="Delete">
                      <TrashIcon width={18} height={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "settings" && settings && (
          <form className="settings" onSubmit={saveSettings}>
            <h1>Store settings</h1>
            <label className="field">
              <span>WhatsApp number for orders *</span>
              <input value={settings.whatsapp} onChange={setS("whatsapp")} placeholder="91XXXXXXXXXX" inputMode="numeric" />
              <small className="muted">Country code + number, digits only. India example: 919876543210</small>
            </label>
            <div className="row">
              <label className="field">
                <span>Phone (shown in footer)</span>
                <input value={settings.phone} onChange={setS("phone")} />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={settings.email} onChange={setS("email")} />
              </label>
            </div>
            <label className="field">
              <span>Shop address</span>
              <input value={settings.address} onChange={setS("address")} />
            </label>
            <label className="field">
              <span>Google Maps link to your shop (builds trust)</span>
              <input value={settings.mapsUrl || ""} onChange={setS("mapsUrl")} placeholder="https://maps.app.goo.gl/..." />
            </label>
            <label className="field">
              <span>Instagram link</span>
              <input value={settings.instagram} onChange={setS("instagram")} placeholder="https://instagram.com/yourpage" />
            </label>
            <label className="field">
              <span>Top announcement bar</span>
              <input value={settings.announcement} onChange={setS("announcement")} />
            </label>
            <button className="btn btn-primary btn-lg">Save settings</button>
          </form>
        )}

        {tab === "media" && settings && <MediaTab settings={settings} onSave={persistSettings} onAuthError={handle} />}
      </div>

      {editing && <ProductEditor initial={editing} onClose={() => setEditing(null)} onSave={saveProduct} onAuthError={handle} />}
      <div className={`toast ${msg ? "show" : ""}`}>{msg}</div>
    </div>
  );
}

function ProductEditor({ initial, onClose, onSave, onAuthError }) {
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setP((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const toggleSize = (s) =>
    setP((x) => ({
      ...x,
      sizes: x.sizes.includes(s) ? x.sizes.filter((y) => y !== s) : ALL_SIZES.filter((y) => y === s || x.sizes.includes(y)),
    }));

  // Keep at least one colour selected; order follows TEE_COLORS.
  const toggleColor = (c) =>
    setP((x) => {
      const has = x.colors.some((y) => y.name === c.name);
      if (has && x.colors.length === 1) return x;
      const names = has ? x.colors.filter((y) => y.name !== c.name).map((y) => y.name) : [...x.colors.map((y) => y.name), c.name];
      return { ...x, colors: TEE_COLORS.filter((t) => names.includes(t.name)) };
    });

  const upload = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("images", f));
    setUploading(true);
    setError("");
    try {
      const { urls } = await api("/upload", { method: "POST", form, auth: true });
      setP((x) => ({ ...x, images: [...x.images, ...urls].slice(0, 8) }));
    } catch (err) {
      if (err.status === 401) onAuthError(err);
      else setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!p.name.trim() || !Number(p.price)) return setError("Name and price are required.");
    setBusy(true);
    setError("");
    try {
      await onSave({ ...p, price: Number(p.price), mrp: Number(p.mrp) || 0 });
    } catch (err) {
      if (err.status === 401) onAuthError(err);
      else setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-head">
          <h2>{p.id ? "Edit product" : "Add product"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <span>Photos (first photo is the cover)</span>
            <div className="uploads">
              {p.images.map((src, i) => (
                <div key={src} className="upload-thumb">
                  <img src={src} alt="" />
                  <button type="button" onClick={() => setP((x) => ({ ...x, images: x.images.filter((_, j) => j !== i) }))}>
                    <CloseIcon width={14} height={14} />
                  </button>
                </div>
              ))}
              <label className="upload-add">
                <input type="file" accept="image/*" multiple onChange={upload} hidden />
                {uploading ? "Uploading…" : <><PlusIcon /> Add</>}
              </label>
            </div>
            <small className="muted">No photo? A T-shirt mockup is drawn using the first colour and the print text below.</small>
          </div>

          <label className="field">
            <span>Product name *</span>
            <input value={p.name} onChange={set("name")} placeholder="e.g. Blue City Oversized Tee" />
          </label>

          <div className="row">
            <label className="field">
              <span>Category</span>
              <select value={p.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Print type</span>
              <select value={p.printType} onChange={set("printType")}>
                {PRINT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <div className="row">
            <label className="field">
              <span>Selling price (₹) *</span>
              <input type="number" min={0} value={p.price} onChange={set("price")} />
            </label>
            <label className="field">
              <span>MRP (₹, for strike-through)</span>
              <input type="number" min={0} value={p.mrp} onChange={set("mrp")} />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea rows={3} value={p.description} onChange={set("description")} />
          </label>

          <div className="row">
            <label className="field">
              <span>Fabric</span>
              <input value={p.fabric} onChange={set("fabric")} placeholder="240 GSM 100% cotton" />
            </label>
            <label className="field">
              <span>Mockup print text</span>
              <input value={p.graphic} maxLength={24} onChange={set("graphic")} placeholder="BLUE CITY" />
            </label>
          </div>

          <label className="field">
            <span>Badge (optional)</span>
            <input value={p.tag} onChange={set("tag")} placeholder="New / Bestseller / Bulk" maxLength={20} />
          </label>

          <div className="field">
            <span>Sizes</span>
            <div className="sizes">
              {ALL_SIZES.map((s) => (
                <button type="button" key={s} className={`size ${p.sizes.includes(s) ? "active" : ""}`} onClick={() => toggleSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Tee colours (black & white only)</span>
            <div className="bw-toggle">
              {TEE_COLORS.map((c) => {
                const on = p.colors.some((x) => x.name === c.name);
                return (
                  <button
                    type="button"
                    key={c.name}
                    className={`bw-opt ${on ? "active" : ""}`}
                    onClick={() => toggleColor(c)}
                    aria-pressed={on}
                  >
                    <i style={{ background: c.hex }} /> {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="checks">
            <label><input type="checkbox" checked={p.featured} onChange={set("featured")} /> Show on home page</label>
            <label><input type="checkbox" checked={p.inStock} onChange={set("inStock")} /> In stock</label>
          </div>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || uploading}>{busy ? "Saving…" : "Save product"}</button>
        </div>
      </form>
    </div>
  );
}
