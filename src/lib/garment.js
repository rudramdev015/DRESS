import * as THREE from "three";

/*
  Realistic hanging T-shirt + wooden hanger, shared by the 3D rack and the product "studio" shots.

  The tee is two cloth surfaces (front + back) cut to a T-shirt outline and "inflated" so it has
  real volume, with drape folds, sleeves that fall under gravity, a knit texture and a neck opening
  you can see into. Units: 1 = 52 SVG units of the TeeMockup outline.
*/

export const U = 52;
const SVG_X = 18;
const SVG_Y = 8;
const SVG_W = 264;
const SVG_H = 304;
export const TEE_W = SVG_W / U;
export const TEE_H = SVG_H / U;
export const TEX_W = 1024;
export const TEX_H = Math.round((TEX_W * SVG_H) / SVG_W);
export const RAIL_TO_TEE = 3.62; // rail centre → tee centre

const frontPath = (collar) =>
  `M98 18 L122 8 Q150 ${collar} 178 8 L202 18 L282 62 L252 126 L224 112 L226 304 Q150 314 74 304 L76 112 L48 126 L18 62 Z`;
export const FRONT_PATH = frontPath(40); // deep front neckline
export const BACK_PATH = frontPath(20); // back neckline sits higher

function outline(collar) {
  const quad = (a, c, b, n = 16) =>
    Array.from({ length: n }, (_, k) => {
      const t = (k + 1) / n;
      const u = 1 - t;
      return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
    });
  return [
    [98, 18],
    [122, 8],
    ...quad([122, 8], [150, collar], [178, 8]),
    [202, 18],
    [282, 62],
    [252, 126],
    [224, 112],
    [226, 304],
    ...quad([226, 304], [150, 314], [74, 304]),
    [76, 112],
    [48, 126],
    [18, 62],
  ];
}
const FRONT_POLY = outline(40);
const BACK_POLY = outline(20);

// Signed distance (SVG units) to the outline: positive inside.
function signedDistance(poly, x, y) {
  let inside = false;
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    const dx = xj - xi;
    const dy = yj - yi;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / len)) : 0;
    const ex = xi + t * dx - x;
    const ey = yi + t * dy - y;
    min = Math.min(min, ex * ex + ey * ey);
  }
  return (inside ? 1 : -1) * Math.sqrt(min);
}

/** One cloth surface. side = "front" | "back". */
export function garmentGeometry(side = "front", { segX = 64, segY = 72, depth = 0.26 } = {}) {
  const poly = side === "front" ? FRONT_POLY : BACK_POLY;
  const sign = side === "front" ? 1 : -1;
  const geo = new THREE.PlaneGeometry(TEE_W, TEE_H, segX, segY);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let X = p.getX(i);
    let Y = p.getY(i);
    const d = signedDistance(poly, 150 + X * U, 160 - Y * U) / U;
    let z = 0;
    if (d > 0) {
      // volume: puffs up away from the edges, flat-ish in the middle
      const h = depth * (1 - Math.exp(-d / 0.32));
      const ax = Math.abs(X);
      const lower = Math.min(1, Math.max(0, (0.6 - Y) / 3));
      let f = 0.05 * Math.sin(X * 5.0 + 0.7) * lower; // long drape folds
      f += 0.025 * Math.sin(X * 9.0 - 1.3) * lower * lower;
      if (Y > 0.4 && ax < 1.7) f += 0.028 * Math.sin((ax * 1.15 + Y) * 4.2) * Math.min(1, (Y - 0.4) / 1.2); // neck → armpit pulls
      if (ax > 1.5) f += 0.035 * Math.sin(Y * 7.5 + ax * 3.2); // sleeve creases
      f += 0.012 * Math.sin(X * 13 + Y * 7) * Math.sin(Y * 11 - X * 5); // small wrinkles
      z = sign * (h + f * Math.min(1, d / 0.3) * (side === "front" ? 1 : 0.6));
    }
    // sleeves fall a little under gravity
    const ax = Math.abs(X);
    if (ax > 1.45) {
      const s = Math.sign(X);
      const ang = -0.17 * Math.min(1, (ax - 1.45) / 1.1) * s;
      const px = 1.45 * s;
      const py = 1.75;
      const rx = X - px;
      const ry = Y - py;
      X = px + rx * Math.cos(ang) - ry * Math.sin(ang);
      Y = py + rx * Math.sin(ang) + ry * Math.cos(ang);
    }
    p.setXYZ(i, X, Y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function isLight(hex = "#111111") {
  const h = String(hex).replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function svgCanvas() {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d");
  const s = TEX_W / SVG_W;
  g.scale(s, s);
  g.translate(-SVG_X, -SVG_Y);
  return [c, g, s];
}

/** Front of the tee: fabric colour + product photo or printed graphic. */
export function frontTexture({ color = "#111111", image = null, graphic = "" }) {
  const [c, g, s] = svgCanvas();
  const path = new Path2D(FRONT_PATH);
  const light = isLight(color);
  g.save();
  g.clip(path);
  g.fillStyle = color;
  g.fillRect(0, 0, 400, 400);

  if (image) {
    // product photo, "cover" fit over the whole tee
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const k = Math.max(TEX_W / image.width, TEX_H / image.height);
    g.drawImage(image, (TEX_W - image.width * k) / 2, (TEX_H - image.height * k) / 2, image.width * k, image.height * k);
    g.restore();
  } else {
    const ink = light ? "#161616" : "#f4f1ea";
    const accent = light ? "#5a5a5a" : "#cfc6b8";
    const text = (graphic || "TRADE WORLD").slice(0, 18);
    g.fillStyle = accent;
    g.beginPath();
    g.moveTo(128, 104);
    [[134, 94], [138, 97], [142, 89], [147, 93], [150, 86], [155, 92], [159, 87], [164, 95], [168, 92], [174, 104]].forEach(([x, y]) =>
      g.lineTo(x, y)
    );
    g.closePath();
    g.fill();
    g.fillStyle = ink;
    g.textAlign = "center";
    g.font = `${Math.min(30, 132 / (text.length * 0.5))}px Anton, Impact, sans-serif`;
    g.fillText(text, 150, 132, 136);
    g.fillStyle = accent;
    g.fillRect(132, 141, 36, 1.4);
    g.font = '600 8.5px "Space Grotesk", sans-serif';
    g.fillText("J O D H P U R", 150, 156);
    // printed ink sits slightly on top of the cotton: faint texture break-up
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "rgba(0,0,0,.06)";
    for (let i = 0; i < 260; i++) g.fillRect(118 + Math.random() * 64, 84 + Math.random() * 76, 0.6, 0.6);
    g.globalCompositeOperation = "source-over";
  }

  // subtle baked shading (real folds come from the geometry)
  const side = g.createLinearGradient(18, 0, 282, 0);
  side.addColorStop(0, "rgba(0,0,0,.22)");
  side.addColorStop(0.2, "rgba(0,0,0,0)");
  side.addColorStop(0.8, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,.22)");
  g.fillStyle = side;
  g.fillRect(0, 0, 400, 400);
  // collar rib
  g.strokeStyle = light ? "rgba(0,0,0,.16)" : "rgba(255,255,255,.07)";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(121, 10);
  g.quadraticCurveTo(150, 46, 179, 10);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,.3)";
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(118, 13);
  g.quadraticCurveTo(150, 52, 182, 13);
  g.stroke();
  // twin-needle stitching at hem and sleeve ends
  g.setLineDash([2.2, 1.6]);
  g.lineWidth = 0.6;
  g.strokeStyle = light ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.2)";
  [[78, 297, 222, 297], [77, 300, 223, 300]].forEach(([x1, y1, x2, y2]) => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo(150, y1 + 8, x2, y2);
    g.stroke();
  });
  [[252, 118, 276, 66], [48, 118, 24, 66]].forEach(([x1, y1, x2, y2]) => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  });
  g.setLineDash([]);
  g.restore();
  g.lineWidth = 2 / s;
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.stroke(path);
  return texture(c);
}

/** Back panel. Its front face is the inside of the tee (seen through the neck), with a neck label. */
export function backTexture({ color = "#111111" }) {
  const [c, g] = svgCanvas();
  const path = new Path2D(BACK_PATH);
  g.save();
  g.clip(path);
  g.fillStyle = color;
  g.fillRect(0, 0, 400, 400);
  g.fillStyle = "rgba(0,0,0,.28)"; // inside is in shadow
  g.fillRect(0, 0, 400, 400);
  // woven neck label
  g.fillStyle = "#f2efe8";
  g.fillRect(140, 24, 20, 9);
  g.fillStyle = "#151515";
  g.font = '700 3.2px "Space Grotesk", sans-serif';
  g.textAlign = "center";
  g.fillText("TRADE WORLD", 150, 29);
  g.font = "600 2.4px sans-serif";
  g.fillText("JODHPUR · M", 150, 32);
  g.restore();
  return texture(c);
}

let knit = null;
/** Fine cotton knit used as a bump map (shared, never disposed). */
export function knitTexture() {
  if (knit) return knit;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const img = g.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const rib = (x % 4 < 2 ? 18 : -10) + (y % 3 === 0 ? -8 : 0);
      const v = 128 + rib + (Math.random() - 0.5) * 34;
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  knit = new THREE.CanvasTexture(c);
  knit.wrapS = knit.wrapT = THREE.RepeatWrapping;
  knit.repeat.set(26, 30);
  return knit;
}

export function fabricMaterials({ color, image, graphic }) {
  const bump = knitTexture();
  const light = isLight(color);
  const common = {
    roughness: light ? 0.88 : 0.82,
    sheen: light ? 0.25 : 0.42,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(light ? "#ffffff" : "#3c3c3c"),
    bumpMap: bump,
    bumpScale: 0.6,
    alphaTest: 0.5,
  };
  const front = new THREE.MeshPhysicalMaterial({ ...common, map: frontTexture({ color, image, graphic }), side: THREE.FrontSide });
  const back = new THREE.MeshPhysicalMaterial({ ...common, map: backTexture({ color }), side: THREE.DoubleSide });
  return { front, back };
}

/* ───────── Hanger: walnut body + brass swivel hook ───────── */

function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#6a4325";
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * 64;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? "40,22,10" : "150,100,60"},${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 0.6 + Math.random() * 1.6;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 2.5);
    g.stroke();
  }
  const t = texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Shared hanger parts. kit.make() returns a new hanger (origin = rail centre). */
export function createHangerKit({ low = false } = {}) {
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.42, metalness: 0.05 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xcaa064, metalness: 1, roughness: 0.26 });

  const top = 0.86; // rail → top of the hanger (visible through the neckline)
  const bar = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.0, -top - 1.02, 0),
    new THREE.Vector3(-1.08, -top - 0.42, 0),
    new THREE.Vector3(0, -top + 0.04, 0),
    new THREE.Vector3(1.08, -top - 0.42, 0),
    new THREE.Vector3(2.0, -top - 1.02, 0),
  ]);
  const barGeo = new THREE.TubeGeometry(bar, low ? 40 : 72, 0.1, low ? 10 : 16, false);
  const capGeo = new THREE.SphereGeometry(0.1, 16, 12);

  // hook: rises from the hanger, loops over the rail (rail runs along X), ends in a small ball
  const r = 0.115;
  const pts = [new THREE.Vector3(0, -top + 0.1, 0), new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, -0.27, 0.03)];
  for (let a = -70; a <= 215; a += 15) {
    const t = THREE.MathUtils.degToRad(a);
    pts.push(new THREE.Vector3(0, r * Math.sin(t), r * Math.cos(t)));
  }
  const hookCurve = new THREE.CatmullRomCurve3(pts);
  const hookGeo = new THREE.TubeGeometry(hookCurve, low ? 48 : 90, 0.026, 10, false);
  const ballGeo = new THREE.SphereGeometry(0.04, 12, 10);
  const swivelGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.14, 18);
  const end = pts[pts.length - 1];

  return {
    make() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(barGeo, wood);
      body.scale.z = 1.15; // hangers are a little thicker front-to-back
      g.add(body);
      [-1, 1].forEach((sx) => {
        const cap = new THREE.Mesh(capGeo, wood);
        cap.position.set(sx * 2.0, -top - 1.02, 0);
        cap.scale.z = 1.15;
        g.add(cap);
      });
      const swivel = new THREE.Mesh(swivelGeo, brass);
      swivel.position.y = -top + 0.1;
      g.add(swivel);
      g.add(new THREE.Mesh(hookGeo, brass));
      const ball = new THREE.Mesh(ballGeo, brass);
      ball.position.copy(end);
      g.add(ball);
      return g;
    },
    dispose() {
      [barGeo, capGeo, hookGeo, ballGeo, swivelGeo].forEach((x) => x.dispose());
      wood.map.dispose();
      wood.dispose();
      brass.dispose();
    },
  };
}

export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
