import { Component, Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import TeeMockup from "../components/TeeMockup.jsx";
import { Reels, Reviews, TrustStrip } from "../components/Showcase.jsx";
import { ArrowIcon, SparkIcon, WhatsAppIcon } from "../components/Icons.jsx";
import { CATEGORIES } from "../lib/api.js";
import { useProducts, useStore } from "../lib/store.jsx";
import usePageTitle from "../lib/usePageTitle.js";
import { openWhatsApp, quickMessage } from "../lib/whatsapp.js";

const Hero3D = lazy(() => import("../components/Hero3D.jsx"));

// We print on black and white tees only.
const HERO_COLORS = [
  { name: "Black", hex: "#070707" },
  { name: "White", hex: "#f4f1ea" },
];

const MARQUEE = ["Oversized Tees", "Custom Names", "College Fests", "Corporate Bulk", "Event Tees", "Couple Tees", "Gym Crews", "Brand Merch"];

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

const FAQ = [
  { q: "Is there a minimum order?", a: "No. We print a single custom tee too. Bulk pricing starts at 10 pieces." },
  { q: "How do I place an order?", a: "Add tees to your bag or tap 'Order on WhatsApp'. Your order arrives in our WhatsApp with all details filled in, and we confirm price, payment and delivery there." },
  { q: "How long does printing take?", a: "Usually 2–4 working days for small orders. For bulk orders, we confirm the timeline on WhatsApp before we start." },
  { q: "Can you design it for me?", a: "Yes. Tell us your idea on WhatsApp and we'll share a mockup before printing." },
];

const BENTO = [
  { color: "#111111", graphic: "OVERSIZED" },
  { color: "#f4f1ea", graphic: "CLASSIC" },
  { color: "#111111", graphic: "POLO" },
  { color: "#f4f1ea", graphic: "YOUR NAME" },
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
              <SparkIcon width={12} height={12} /> Custom T-shirt printing · Jodhpur
            </span>
            <h1 className="display">
              Print your
              <br />
              <span className="brush-word">story.</span>
            </h1>
            <p className="lead">
              Streetwear-grade tees printed in the Blue City: oversized drops, custom names, team and event orders. From one
              piece to a thousand.
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
            <ul className="hero-stats">
              <li><b>1 → 1000+</b><span>pieces per order</span></li>
              <li><b>DTF · Screen · Vinyl</b><span>print methods</span></li>
              <li><b>Jodhpur</b><span>printed in-house</span></li>
            </ul>
          </div>

          <div className="hero-stage">
            <div className="stage-glow" style={{ "--c": HERO_COLORS[ci].hex }} />
            {webglFailed ? (
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
            {!webglFailed && (
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
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i}>
              {m} <SparkIcon width={14} height={14} />
            </span>
          ))}
        </div>
      </div>

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
          {CATEGORIES.map((c, i) => (
            <Link key={c.id} to={`/shop?cat=${c.id}`} className={`bento-item reveal b${i}`}>
              <div className="bento-tee">
                <TeeMockup color={BENTO[i].color} graphic={BENTO[i].graphic} />
              </div>
              <div className="bento-copy">
                <h3>{c.label}</h3>
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
        <div className="cta-band reveal">
          <div>
            <span className="brush cta-brush">Bulk orders</span>
            <h2 className="display-sm">10+ tees for your team, college or brand?</h2>
            <p>Send us your quantity and design. We'll reply on WhatsApp with bulk pricing and a mockup.</p>
          </div>
          <div className="cta-actions">
            <button
              className="btn btn-light btn-lg"
              onClick={() => openWhatsApp(settings.whatsapp, quickMessage("I need a bulk T-shirt printing quote."))}
            >
              <WhatsAppIcon /> Get bulk quote
            </button>
            {settings.mapsUrl && (
              <a className="btn btn-outline-light btn-lg" href={settings.mapsUrl} target="_blank" rel="noreferrer">
                Visit our shop
              </a>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section wrap faq-wrap">
        <h2 className="display-sm">
          Got <span className="grad-text">questions?</span>
        </h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
