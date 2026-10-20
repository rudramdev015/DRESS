import { useEffect, useRef, useState } from "react";
import { InstagramIcon, WhatsAppIcon } from "./Icons.jsx";
import { openWhatsApp, quickMessage } from "../lib/whatsapp.js";

/* ───────── Trust strip ───────── */

const TrustIcon = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export function TrustStrip({ settings }) {
  const items = [
    { t: "See a mockup first", d: "Approve your design before we print a single tee.", i: "M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", c: "c1" },
    { t: "Pay after confirming", d: "Final price and payment are agreed with you on WhatsApp.", i: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-3 10 2 2 4-4", c: "c2" },
    { t: "Real shop in Jodhpur", d: settings.address || "Jodhpur, Rajasthan", i: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", c: "c3", href: settings.mapsUrl },
    { t: "Talk to the printer", d: "Real people on WhatsApp, not a bot.", i: "M21 12a8 8 0 0 1-11.8 7L3 21l2-6A8 8 0 1 1 21 12Z", c: "c4" },
  ];
  return (
    <div className="trust wrap">
      {items.map((x) => {
        const body = (
          <>
            <span className={`trust-ic ${x.c}`}>
              <TrustIcon d={x.i} />
            </span>
            <span>
              <b>{x.t}</b>
              <small>{x.d}</small>
            </span>
          </>
        );
        return x.href ? (
          <a key={x.t} className="trust-item" href={x.href} target="_blank" rel="noreferrer">
            {body}
          </a>
        ) : (
          <div key={x.t} className="trust-item">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Reels ───────── */

function VideoReel({ reel }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="reel" onClick={() => setMuted((m) => !m)}>
      <video ref={ref} src={reel.url} muted={muted} loop playsInline preload="metadata" />
      <span className="reel-sound">{muted ? "🔇 Tap for sound" : "🔊 Sound on"}</span>
      {reel.caption && <figcaption>{reel.caption}</figcaption>}
    </figure>
  );
}

function InstagramReel({ reel }) {
  useEffect(() => {
    const process = () => window.instgrm?.Embeds?.process();
    if (window.instgrm) {
      process();
      return undefined;
    }
    if (!document.getElementById("ig-embed")) {
      const s = document.createElement("script");
      s.id = "ig-embed";
      s.async = true;
      s.src = "https://www.instagram.com/embed.js";
      s.onload = process;
      document.body.appendChild(s);
    }
    return undefined;
  }, [reel.url]);

  return (
    <div className="reel reel-ig">
      <blockquote className="instagram-media" data-instgrm-permalink={reel.url} data-instgrm-version="14">
        <a href={reel.url} target="_blank" rel="noreferrer">
          View this reel on Instagram
        </a>
      </blockquote>
    </div>
  );
}

export function Reels({ settings }) {
  const reels = settings.reels || [];
  if (!reels.length && !settings.instagram) return null;
  return (
    <section className="section reels-section">
      <div className="wrap section-head">
        <div>
          <span className="eyebrow">Straight from the press</span>
          <h2 className="display-sm">
            Watch us <span className="grad-text">print</span>
          </h2>
        </div>
        {settings.instagram && (
          <a className="btn btn-ig" href={settings.instagram} target="_blank" rel="noreferrer">
            <InstagramIcon /> Follow on Instagram
          </a>
        )}
      </div>
      {reels.length > 0 ? (
        <div className="reels-row">
          {reels.map((r, i) =>
            r.type === "instagram" ? <InstagramReel key={r.url + i} reel={r} /> : <VideoReel key={r.url + i} reel={r} />
          )}
        </div>
      ) : (
        <div className="wrap">
          <a className="ig-cta" href={settings.instagram} target="_blank" rel="noreferrer">
            <InstagramIcon width={36} height={36} />
            <span>
              <b>See our latest prints on Instagram</b>
              <small>New drops, behind-the-scenes and customer orders.</small>
            </span>
          </a>
        </div>
      )}
    </section>
  );
}

/* ───────── Reviews (added by the owner in Admin — real customers only) ───────── */

export function Reviews({ settings }) {
  const reviews = settings.reviews || [];
  if (!reviews.length) return null;
  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">Customer love</span>
          <h2 className="display-sm">
            What <span className="grad-text">Jodhpur</span> says
          </h2>
        </div>
        <button className="btn btn-wa" onClick={() => openWhatsApp(settings.whatsapp, quickMessage("I'd like to share a review."))}>
          <WhatsAppIcon width={18} height={18} /> Share yours
        </button>
      </div>
      <div className="reviews">
        {reviews.map((r, i) => (
          <figure key={i} className="review reveal">
            <div className="stars" aria-label={`${r.rating} out of 5 stars`}>
              {"★".repeat(r.rating)}
              <span>{"★".repeat(5 - r.rating)}</span>
            </div>
            <blockquote>“{r.text}”</blockquote>
            <figcaption>
              <span className="avatar">{(r.name || "?").slice(0, 1).toUpperCase()}</span>
              <span>
                <b>{r.name}</b>
                {r.city && <small>{r.city}</small>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
