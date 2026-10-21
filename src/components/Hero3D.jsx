import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Same silhouette as TeeMockup's SVG path, converted to 3D units (centred on the chest).
const P = (x, y) => [(x - 150) / 52, -(y - 165) / 52];

const INK = {
  light: { main: "#f4f1ea", accent: "#d8cfc2" }, // printed on a black tee
  dark: { main: "#141414", accent: "#4a4a4a" }, // printed on a white tee
};

function teeShape() {
  const s = new THREE.Shape();
  const m = (x, y) => s.moveTo(...P(x, y));
  const l = (x, y) => s.lineTo(...P(x, y));
  const q = (cx, cy, x, y) => s.quadraticCurveTo(...P(cx, cy), ...P(x, y));
  m(98, 18); l(122, 8); q(150, 40, 178, 8); l(202, 18); l(282, 62); l(252, 126); l(224, 112);
  l(226, 304); q(150, 314, 74, 304); l(76, 112); l(48, 126); l(18, 62); l(98, 18);
  return s;
}

function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function canvas1024() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  return [c, c.getContext("2d")];
}

// Logo → transparent print. Black background becomes see-through; ink is recoloured per tee.
function logoTextures(img) {
  const [c, g] = canvas1024();
  const sx = img.width * 0.17, sy = img.height * 0.085, sw = img.width * 0.66, sh = img.height * 0.68;
  const k = Math.min(1024 / sw, 1024 / sh);
  g.drawImage(img, sx, sy, sw, sh, (1024 - sw * k) / 2, (1024 - sh * k) / 2, sw * k, sh * k);
  const src = g.getImageData(0, 0, 1024, 1024);
  const out = {};
  for (const [name, rgb] of [["light", [244, 241, 234]], ["dark", [20, 20, 20]]]) {
    const d = new ImageData(new Uint8ClampedArray(src.data), 1024, 1024);
    const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const v = Math.max(a[i], a[i + 1], a[i + 2]);
      a[i + 3] = Math.max(0, Math.min(255, (v - 30) * 2.4));
      a[i] = rgb[0];
      a[i + 1] = rgb[1];
      a[i + 2] = rgb[2];
    }
    const [c2, g2] = canvas1024();
    g2.putImageData(d, 0, 0);
    out[name] = toTexture(c2);
  }
  c.width = 0; // free memory
  return out;
}

// Product print text (product pages).
function graphicTextures(text) {
  const out = {};
  for (const name of ["light", "dark"]) {
    const ink = INK[name];
    const [c, g] = canvas1024();
    g.textAlign = "center";
    const size = Math.min(230, 1500 / Math.max(4, text.length));
    g.fillStyle = ink.accent;
    // little fort skyline, like the flat mockup
    g.beginPath();
    g.moveTo(400, 420); g.lineTo(430, 370); g.lineTo(450, 385); g.lineTo(470, 345); g.lineTo(495, 365);
    g.lineTo(510, 330); g.lineTo(535, 360); g.lineTo(555, 340); g.lineTo(580, 380); g.lineTo(600, 365); g.lineTo(625, 420);
    g.closePath();
    g.fill();
    g.fillStyle = ink.main;
    g.font = `${size}px Anton, Impact, sans-serif`;
    g.fillText(text, 512, 560, 900);
    g.fillStyle = ink.accent;
    g.fillRect(432, 610, 160, 8);
    g.font = '600 44px "Space Grotesk", sans-serif';
    g.fillText("J O D H P U R", 512, 690);
    out[name] = toTexture(c);
  }
  return out;
}

function backTextures() {
  const out = {};
  for (const name of ["light", "dark"]) {
    const ink = INK[name];
    const [c, g] = canvas1024();
    g.textAlign = "center";
    g.fillStyle = ink.main;
    g.font = '230px "Permanent Marker", cursive';
    g.save();
    g.translate(512, 470);
    g.rotate(-0.08);
    g.fillText("TRADE", 0, 0);
    g.restore();
    g.font = "120px Anton, Impact, sans-serif";
    g.fillStyle = ink.accent;
    g.fillText("W O R L D", 512, 640);
    g.font = '600 40px "Space Grotesk", sans-serif';
    g.fillStyle = ink.main;
    g.fillText("— JODHPUR · RAJASTHAN —", 512, 730);
    out[name] = toTexture(c);
  }
  return out;
}

export default function Hero3D({ color = "#111111", graphic = "", onFail }) {
  const mountRef = useRef(null);
  const targetColor = useRef(new THREE.Color(color));

  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  useEffect(() => {
    const el = mountRef.current;
    // Lighter settings for phones and low-power devices.
    const low = window.matchMedia("(max-width: 860px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: low ? "low-power" : "high-performance" });
    } catch {
      onFail?.();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, -0.4, 14.5);

    // Studio lighting: neutral key + soft warm and cool rims, so black stays rich and white stays white.
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 6);
    const warm = new THREE.PointLight(0xffc9a0, 18, 20);
    warm.position.set(-5, 2, 3);
    const cool = new THREE.PointLight(0xbcd0ff, 18, 20);
    cool.position.set(5, -2, 3);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(0, 3, -6);
    scene.add(key, warm, cool, rim);

    const group = new THREE.Group();
    scene.add(group);

    const depth = 0.3;
    const bevel = 0.22;
    const geo = new THREE.ExtrudeGeometry(teeShape(), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: 0.16,
      bevelSegments: low ? 6 : 10,
      curveSegments: low ? 24 : 40,
    });
    geo.translate(0, 0, -depth / 2);
    const fabric = new THREE.MeshPhysicalMaterial({
      color: targetColor.current.clone(),
      roughness: 0.85,
      envMapIntensity: 0.5,
      sheen: 0.3,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#ffffff"),
    });
    group.add(new THREE.Mesh(geo, fabric));

    const faceZ = depth / 2 + bevel + 0.004;
    const printGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const frontMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.9, depthWrite: false, opacity: 0 });
    const front = new THREE.Mesh(printGeo, frontMat);
    front.position.set(0, 0.55, faceZ);
    group.add(front);
    const backMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.9, depthWrite: false, opacity: 0 });
    const back = new THREE.Mesh(printGeo, backMat);
    back.position.set(0, 0.45, -faceZ);
    back.rotation.y = Math.PI;
    group.add(back);

    // Each print has a light-ink and a dark-ink version; we swap them as the tee changes colour.
    let frontTex = null;
    let backTex = null;
    let inkNow = "";
    const applyInk = (force = false) => {
      const ink = targetColor.current.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? "dark" : "light";
      if (ink === inkNow && !force) return;
      inkNow = ink;
      if (frontTex) {
        frontMat.map = frontTex[ink];
        frontMat.opacity = 1;
        frontMat.needsUpdate = true;
      }
      if (backTex) {
        backMat.map = backTex[ink];
        backMat.opacity = 1;
        backMat.needsUpdate = true;
      }
    };

    let disposed = false;
    if (graphic) {
      document.fonts.load("230px Anton").catch(() => {}).then(() => {
        if (disposed) return;
        frontTex = graphicTextures(graphic);
        applyInk(true);
      });
    } else {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (disposed) return;
        frontTex = logoTextures(img);
        applyInk(true);
      };
      img.src = "/logo.jpg";
    }
    Promise.all([
      document.fonts.load('230px "Permanent Marker"'),
      document.fonts.load("120px Anton"),
      document.fonts.load('600 40px "Space Grotesk"'),
    ])
      .catch(() => {})
      .then(() => {
        if (disposed) return;
        backTex = backTextures();
        applyInk(true);
      });

    // Silver rings + soft sparkles
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.016, 12, low ? 120 : 200), ringMat);
    ring.rotation.x = Math.PI / 2.4;
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xe8b07f, transparent: true, opacity: 0.25 });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.01, 12, low ? 120 : 200), ring2Mat);
    ring2.rotation.set(Math.PI / 2.1, 0.4, 0);
    scene.add(ring, ring2);

    const COUNT = low ? 110 : 240;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const palette = [new THREE.Color("#ffffff"), new THREE.Color("#d8cfc2"), new THREE.Color("#e8b07f")];
    for (let i = 0; i < COUNT; i++) {
      const r = 3.6 + Math.random() * 2.6;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th)], i * 3);
      palette[i % 3].toArray(col, i * 3);
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const sparkMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // Interaction: drag to spin, hover to tilt
    let spin = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let tiltX = 0;
    let tiltTarget = 0;
    const canvas = renderer.domElement;
    canvas.style.touchAction = "pan-y";
    const down = (e) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      const rect = canvas.getBoundingClientRect();
      tiltTarget = ((e.clientY - rect.top) / rect.height - 0.5) * 0.5;
      if (!dragging) return;
      velocity = (e.clientX - lastX) * 0.006;
      spin += velocity;
      lastX = e.clientX;
    };
    const up = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 16.5 : 14.5;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Only render while on screen and the tab is visible.
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden) return;
      const t = clock.getElapsedTime();
      if (!dragging) {
        velocity *= 0.95;
        spin += velocity + (reduce ? 0 : 0.006);
      }
      tiltX += (tiltTarget - tiltX) * 0.06;
      group.rotation.y = spin + Math.sin(t * 0.5) * 0.15;
      group.rotation.x = tiltX;
      group.position.y = reduce ? 0 : Math.sin(t * 1.2) * 0.12;
      fabric.color.lerp(targetColor.current, 0.08);
      applyInk();
      ring.rotation.z = t * 0.25;
      ring2.rotation.z = -t * 0.18;
      sparks.rotation.y = t * 0.05;
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      [geo, printGeo, sparkGeo, ring.geometry, ring2.geometry].forEach((g) => g.dispose());
      [frontTex, backTex].forEach((pair) => pair && Object.values(pair).forEach((t) => t.dispose()));
      [fabric, frontMat, backMat, ringMat, ring2Mat, sparkMat].forEach((m) => m.dispose());
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="hero3d" aria-label="3D Trade World T-shirt — drag to spin" role="img" />;
}
