import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { openWhatsApp, quickMessage } from "../lib/whatsapp.js";
import { BagIcon, CloseIcon, InstagramIcon, MenuIcon, SparkIcon, WhatsAppIcon } from "./Icons.jsx";

const NAV = [
  { to: "/", label: "Home", isActive: (p) => p === "/" },
  { to: "/shop", label: "Shop", isActive: (p, s) => p === "/shop" && !s.includes("cat=Custom") },
  { to: "/custom", label: "Custom Print", isActive: (p) => p === "/custom" },
  { to: "/shop?cat=Custom", label: "Bulk Orders", isActive: (p, s) => p === "/shop" && s.includes("cat=Custom") },
];

export function Logo({ small = false }) {
  return (
    <Link to="/" className={`logo ${small ? "logo-sm" : ""}`} aria-label="Trade World home">
      <span className="logo-mark" />
      <span className="logo-text">
        <b>TRADE</b>
        <small>WORLD</small>
      </span>
    </Link>
  );
}

function Navbar() {
  const { cartCount, settings } = useStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {settings.announcement && (
        <div className="announce">
          <SparkIcon width={10} height={10} /> {settings.announcement}
        </div>
      )}
      <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
        <div className="nav-inner wrap">
          <Logo />
          <nav className="nav-links">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} className={n.isActive(pathname, search) ? "active" : ""}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="btn btn-wa btn-sm hide-sm" onClick={() => openWhatsApp(settings.whatsapp, quickMessage())}>
              <WhatsAppIcon width={16} height={16} /> Chat
            </button>
            <Link to="/bag" className="icon-btn" aria-label={`Bag, ${cartCount} items`}>
              <BagIcon />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </Link>
            <button className="icon-btn show-sm" onClick={() => setOpen((o) => !o)} aria-label="Menu">
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        <div className={`mobile-menu ${open ? "open" : ""}`}>
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} className={n.isActive(pathname, search) ? "active" : ""}>
              {n.label}
            </Link>
          ))}
          <button className="btn btn-wa" onClick={() => openWhatsApp(settings.whatsapp, quickMessage())}>
            <WhatsAppIcon /> Chat on WhatsApp
          </button>
        </div>
      </header>
    </>
  );
}

function Footer() {
  const { settings } = useStore();
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <img src="/logo.jpg" alt="Trade World — Clothing & Streetwear, Jodhpur" className="footer-logo" />
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop?cat=Oversized">Oversized Tees</Link>
          <Link to="/shop?cat=Classic">Classic Tees</Link>
          <Link to="/shop?cat=Polo">Polo Tees</Link>
          <Link to="/shop?cat=Custom">Custom & Bulk</Link>
        </div>
        <div>
          <h4>Printing</h4>
          <Link to="/custom">Start a custom order</Link>
          <span>DTF · Screen · Vinyl</span>
          <span>Single piece to bulk</span>
        </div>
        <div>
          <h4>Visit / Contact</h4>
          <span>{settings.address || "Jodhpur, Rajasthan"}</span>
          {settings.phone && <a href={`tel:${settings.phone}`}>{settings.phone}</a>}
          {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
          <div className="footer-social">
            <button className="icon-btn" onClick={() => openWhatsApp(settings.whatsapp, quickMessage())} aria-label="WhatsApp">
              <WhatsAppIcon />
            </button>
            {settings.instagram && (
              <a className="icon-btn" href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <InstagramIcon />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} Trade World, Jodhpur. All rights reserved.</span>
        <span className="brush">Printed with pride in the Blue City.</span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { settings, toast } = useStore();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <button className="wa-fab" onClick={() => openWhatsApp(settings.whatsapp, quickMessage())} aria-label="Chat on WhatsApp">
        <WhatsAppIcon width={28} height={28} />
      </button>
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}
