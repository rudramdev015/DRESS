import { useId } from "react";

const TEE =
  "M98 18 L122 8 Q150 40 178 8 L202 18 L282 62 L252 126 L224 112 L226 304 Q150 314 74 304 L76 112 L48 126 L18 62 Z";

function isLight(hex = "#000000") {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

/** SVG T-shirt mockup used whenever a product has no uploaded photo. */
export default function TeeMockup({ color = "#111111", graphic = "TRADE WORLD", sub = "JODHPUR", className = "" }) {
  const uid = useId().replace(/:/g, "");
  const ink = isLight(color) ? "#16130f" : "#f3ece2";
  const text = (graphic || "TRADE WORLD").slice(0, 24);
  const fontSize = Math.min(34, 132 / (text.length * 0.5));
  const long = text.length > 11;

  return (
    <svg viewBox="0 0 300 320" className={`tee ${className}`} role="img" aria-label={`${text} T-shirt`}>
      <defs>
        <linearGradient id={`s${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".32" />
          <stop offset=".28" stopColor="#000" stopOpacity="0" />
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".32" />
        </linearGradient>
        <linearGradient id={`v${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".10" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
      </defs>
      <path d={TEE} fill={color} />
      <path d={TEE} fill={`url(#s${uid})`} />
      <path d={TEE} fill={`url(#v${uid})`} />
      <path d="M118 13 Q150 46 182 13" fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="6" />
      <path d="M76 112 L74 300 M224 112 L226 300" stroke="#000" strokeOpacity=".08" strokeWidth="2" />
      <path d={TEE} fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="1.5" />
      <g fill={ink} textAnchor="middle">
        <path
          d="M128 104 l6 -10 l4 3 l4 -8 l5 4 l3 -7 l5 6 l4 -5 l5 8 l4 -3 l6 12 Z"
          opacity=".55"
          transform="translate(0 -6)"
        />
        <text
          x="150"
          y="132"
          fontFamily="Anton, Impact, sans-serif"
          fontSize={long ? 22 : fontSize}
          letterSpacing="1"
          {...(long ? { textLength: 136, lengthAdjust: "spacingAndGlyphs" } : {})}
        >
          {text}
        </text>
        <rect x="132" y="142" width="36" height="1.4" opacity=".6" />
        <text x="150" y="157" fontFamily="'Space Grotesk', sans-serif" fontSize="8.5" letterSpacing="4" opacity=".75">
          {sub}
        </text>
      </g>
    </svg>
  );
}
