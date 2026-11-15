import { useEffect, useState } from "react";
import TeeMockup from "./TeeMockup.jsx";
import { peekShot, requestShot } from "../lib/studioClient.js";

/** Realistic studio shot of a tee on a hanger; shows the flat drawing until the shot is ready. */
export default function StudioTee({ color = "#111111", graphic = "", className = "", alt = "" }) {
  const [src, setSrc] = useState(() => peekShot(color, graphic));

  useEffect(() => {
    let alive = true;
    const ready = peekShot(color, graphic);
    if (ready) {
      setSrc(ready);
      return undefined;
    }
    setSrc(null);
    requestShot(color, graphic)
      .then((url) => alive && setSrc(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [color, graphic]);

  if (!src) return <TeeMockup color={color} graphic={graphic} className={className} />;
  return <img src={src} alt={alt || `${graphic || "Trade World"} T-shirt`} className={`studio-shot ${className}`} decoding="async" />;
}
