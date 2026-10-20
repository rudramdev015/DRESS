import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { SearchIcon } from "../components/Icons.jsx";
import { CATEGORIES } from "../lib/api.js";
import { useProducts } from "../lib/store.jsx";
import usePageTitle from "../lib/usePageTitle.js";

export default function Shop() {
  const { products, loading, error } = useProducts();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const cat = params.get("cat") || "All";
  usePageTitle(cat === "All" ? "Shop all T-shirts" : CATEGORIES.find((c) => c.id === cat)?.label || "Shop");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = products.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (!term || `${p.name} ${p.category} ${p.description} ${p.printType}`.toLowerCase().includes(term))
    );
    if (sort === "low") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "high") out = [...out].sort((a, b) => b.price - a.price);
    return out;
  }, [products, cat, q, sort]);

  const pick = (id) => setParams(id === "All" ? {} : { cat: id });
  const current = CATEGORIES.find((c) => c.id === cat);

  return (
    <section className="wrap page">
      <div className="page-head">
        <span className="eyebrow">Shop</span>
        <h1 className="display-sm">{current ? current.label : "All T-shirts"}</h1>
        <p className="muted">{current ? current.blurb : "Every tee we print: pick one, then order it in a tap on WhatsApp."}</p>
      </div>

      <div className="toolbar">
        <div className="chips">
          {["All", ...CATEGORIES.map((c) => c.id)].map((id) => (
            <button key={id} className={`chip-btn ${cat === id ? "active" : ""}`} onClick={() => pick(id)}>
              {id === "All" ? "All" : CATEGORIES.find((c) => c.id === id).label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="search">
            <SearchIcon width={16} height={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tees…" aria-label="Search" />
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="new">Newest</option>
            <option value="low">Price: low → high</option>
            <option value="high">Price: high → low</option>
          </select>
        </div>
      </div>

      {error && <p className="error">Couldn't load products: {error}</p>}
      {loading ? (
        <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" />)}</div>
      ) : list.length ? (
        <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      ) : (
        <div className="empty">
          <p>No tees match that. Try another category or search.</p>
        </div>
      )}
    </section>
  );
}
