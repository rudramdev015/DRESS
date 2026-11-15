import { Component, Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import TeeMockup from "../components/TeeMockup.jsx";
import HangerRack from "../components/HangerRack.jsx";
import Lookbook from "../components/Lookbook.jsx";
import { DEFAULT_HOME } from "../../shared/homeDefaults.js";
import { Reels, Reviews, TrustStrip } from "../components/Showcase.jsx";
import { ArrowIcon, SparkIcon, WhatsAppIcon } from "../components/Icons.jsx";
import { useProducts, useStore } from "../lib/store.jsx";
import usePageTitle from "../lib/usePageTitle.js";
import { openWhatsApp, quickMessage } from "../lib/whatsapp.js";

const Hero3D = lazy(() => import("../components/Hero3D.jsx"));

// We print on black and white tees only.
const HERO_COLORS = [
  { name: "Black", hex: "#070707" },
  { name: "White", hex: "#f4f1ea" },
];

const STEPS = [
  { n: "01", t: "Pick your tee", d: "Choose a style, colour and sizes from the shop — or bring your own idea." },
  { n: "02", t: "Send your design", d: "Share your logo, photo or text on WhatsApp. No design? We'll make one for you." },
  { n: "03", t: "Approve the mockup", d: "We send a preview and final price. Nothing gets printed until you say yes." },
  { n: "04", t: "Printed & delivered", d: "Pick up in Jodhpur or get it shipped to your door." },
];

const METHODS = [
  { t: "DTF", d: "Full-colour, photo-quality prints that stay soft and stretch with the fabric. Best for 1–50 pcs.", c: "m1" },
  { t: "Screen print", d: "The classic. Bold, long-lasting ink with the best per-piece price on bulk orders.", c: "m2" },
  { t: "Vinyl (HTV)", d: "Crisp names, numbers and logos. Perfect for team tees and personalised gifts.", c: "m3" },
];

// Tee drawn on each category tile when no photo is set (dark tiles get white tees, cream tiles black).
const BENTO = [
  { color: "#f4f1ea", graphic: "OVERSIZED" },
  { color: "#111111", graphic: "CLASSIC" },
  { color: "#f4f1ea", graphic: "POLO" },
  { color: "#111111", graphic: "YOUR NAME" },
];

// If WebGL fails for any reason, show the logo card instead of a blank space.
class SafeStage extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LogoFallback() {
  return (
    <div className="hero-logo-card">
      <img src="/logo.jpg" alt="Trade World — Clothing & Streetwear, Jodhpur" />
    </div>
  );
}

export default function Home() {
  const { settings } = useStore();
  usePageTitle("");
  const home = settings.home || DEFAULT_HOME;
  const { hero } = home;
  const { products, loading } = useProducts();
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const list = featured.length ? featured : products.slice(0, 8);

  const [ci, setCi] = useState(0);
  const [auto, setAuto] = useState(true);
  const [webglFailed, setWebglFailed] = useState(false);
  // Start the 3D only after the page has painted, so text and buttons show instantly.
  const [show3d, setShow3d] = useState(false);
  useEffect(() => {
    const go = () => setShow3d(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(go, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(go, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => setCi((i) => (i + 1) % HERO_COLORS.length), 4000);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="blobs" aria-hidden="true">
          <i className="blob b-saffron" />
          <i className="blob b-pink" />
          <i className="blob b-blue" />
        </div>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow pill">
              <SparkIcon width={12} height={12} /> {hero.eyebrow}
            </span>
            <h1 className="display">
              {hero.title}
              <br />
              <span className="brush-word">{hero.highlight}</span>
            </h1>
            <p className="lead">
              {hero.subtitle}
            </p>
            <div className="hero-cta">
              <Link to="/shop" className="btn btn-primary btn-lg">
                Shop tees <ArrowIcon width={18} height={18} />
              </Link>
              <button
                className="btn btn-wa btn-lg"
                onClick={() => openWhatsApp(settings.whatsapp, quickMessage("I want to get custom T-shirts printed."))}
              >
                <WhatsAppIcon width={18} height={18} /> Order on WhatsApp
              </button>
            </div>
            {home.stats.length > 0 && (
              <ul className="hero-stats">
                {home.stats.map((st) => (
                  <li key={st.value + st.label}>
                    <b>{st.value}</b>
                    <span>{st.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="hero-stage">
            <div className="stage-glow" style={{ "--c": HERO_COLORS[ci].hex }} />
            {hero.image ? (
              <div className="hero-photo">
                <img src={hero.image} alt={`${hero.title} ${hero.highlight}`} fetchpriority="high" />
              </div>
            ) : webglFailed ? (
              <LogoFallback />
            ) : (
              <SafeStage fallback={<LogoFallback />}>
                {show3d ? (
                  <Suspense fallback={<div className="hero3d hero3d-loading"><TeeMockup color={HERO_COLORS[ci].hex} graphic="TRADE WORLD" /></div>}>
                    <Hero3D color={HERO_COLORS[ci].hex} onFail={() => setWebglFailed(true)} />
                  </Suspense>
                ) : (
                  <div className="hero3d hero3d-loading"><TeeMockup color={HERO_COLORS[ci].hex} graphic="TRADE WORLD" /></div>
                )}
              </SafeStage>
            )}
            {!webglFailed && !hero.image && (
              <div className="stage-ui">
                <div className="stage-swatches" role="group" aria-label="Try a colour">
                  {HERO_COLORS.map((c, i) => (
                    <button
                      key={c.name}
                      className={`swatch ${i === ci ? "active" : ""}`}
                      style={{ background: c.hex }}
                      onClick={() => {
                        setAuto(false);
                        setCi(i);
                      }}
                      aria-label={c.name}
                      title={c.name}
                    />
                  ))}
                </div>
                <span className="stage-hint">
                  <b>{HERO_COLORS[ci].name} tee</b> · drag to spin
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <TrustStrip settings={settings} />

      {/* MARQUEE */}
      {home.marquee.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...home.marquee, ...home.marquee].map((m, i) => (
              <span key={i}>
                {m} <SparkIcon width={14} height={14} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3D HANGER RACK — printed tees, added from Admin */}
      <HangerRack products={products} />

      {/* CATEGORIES */}
      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Find your fit</span>
            <h2 className="display-sm">
              Shop by <span className="grad-text">style</span>
            </h2>
          </div>
          <Link to="/shop" className="link-arrow">
            View all <ArrowIcon width={16} height={16} />
          </Link>
        </div>
        <div className="bento">
          {home.categories.map((c, i) => (
            <Link key={c.id} to={`/shop?cat=${c.id}`} className={`bento-item reveal b${i} ${c.image ? "has-photo" : ""}`}>
              {c.image ? (
                <img className="bento-photo" src={c.image} alt={c.title} loading="lazy" decoding="async" />
              ) : (
                <div className="bento-tee">
                  <TeeMockup color={BENTO[i].color} graphic={BENTO[i].graphic} />
                </div>
              )}
              <div className="bento-copy">
                <h3>{c.title}</h3>
                <p>{c.blurb}</p>
                <span className="link-arrow">
                  Explore <ArrowIcon width={16} height={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Fresh off the press</span>
            <h2 className="display-sm">
              Latest <span className="grad-text">drops</span>
            </h2>
          </div>
          <Link to="/shop" className="link-arrow">
            Full catalogue <ArrowIcon width={16} height={16} />
          </Link>
        </div>
        {loading ? (
          <div className="grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="card skeleton" />)}</div>
        ) : (
          <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </section>

      <Lookbook items={home.gallery} />

      <Reels settings={settings} />

      {/* HOW IT WORKS */}
      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">How it works</span>
            <h2 className="display-sm">
              Idea to tee in <span className="grad-text">4 steps</span>
            </h2>
          </div>
        </div>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n} className="step reveal">
              <span className="step-n">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* PRINT METHODS */}
      <section className="section wrap">
        <div className="methods">
          <div className="methods-intro">
            <span className="eyebrow">We only do T-shirts</span>
            <h2 className="display-sm">
              and we do them <span className="grad-text">properly.</span>
            </h2>
            <p className="muted">
              We focus on one thing: printing T-shirts. Every order is checked by hand before it leaves our Jodhpur workshop.
            </p>
            <Link to="/custom" className="btn btn-primary">
              Start a custom print <ArrowIcon width={18} height={18} />
            </Link>
          </div>
          <div className="methods-list">
            {METHODS.map((m) => (
              <div key={m.t} className={`method reveal ${m.c}`}>
                <h3>{m.t}</h3>
                <p>{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Reviews settings={settings} />

      {/* BULK CTA */}
      <section className="section wrap">
        <div className="cta-band bulk reveal">
          <div className="bulk-copy">
            <span className="brush cta-brush">Bulk orders</span>
            <h2 className="display-sm">{home.bulk.title}</h2>
            <p>{home.bulk.text}</p>
            {home.bulk.points.length > 0 && (
              <ul className="bulk-points">
                {home.bulk.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <div className="cta-actions">
              <button
                className="btn btn-light btn-lg"
                onClick={() => openWhatsApp(settings.whatsapp, quickMessage("I need a bulk T-shirt printing quote."))}
              >
                <WhatsAppIcon /> Get bulk quote
              </button>
              <Link to="/custom" className="btn btn-outline-light btn-lg">
                Fill the custom form
              </Link>
              {settings.mapsUrl && (
                <a className="btn btn-outline-light btn-lg" href={settings.mapsUrl} target="_blank" rel="noreferrer">
                  Visit our shop
                </a>
              )}
            </div>
          </div>
          <div className="bulk-art" aria-hidden={!home.bulk.image}>
            {home.bulk.image ? (
              <img className="bulk-photo" src={home.bulk.image} alt="Bulk T-shirt order by Trade World" loading="lazy" />
            ) : (
              <>
            <div className="bulk-tee t1"><TeeMockup color="#f4f1ea" graphic="YOUR BRAND" sub="TEAM 2026" /></div>
            <div className="bulk-tee t2"><TeeMockup color="#111111" graphic="YOUR TEAM" sub="JODHPUR" /></div>
            <div className="bulk-tee t3"><TeeMockup color="#111111" graphic="COLLEGE FEST" sub="CREW" /></div>
            <span className="bulk-tag">× 50 pcs</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {home.faq.length > 0 && (
      <section className="section wrap faq-wrap">
        <h2 className="display-sm">
          Got <span className="grad-text">questions?</span>
        </h2>
        <div className="faq">
          {home.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      )}
    </>
  );
}
