import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Same silhouette as TeeMockup's SVG path, converted to 3D units (centred on the chest).
const P = (x, y) => [(x - 150) / 52, -(y - 165) / 52];

function teeShape() {
  const s = new THREE.Shape();
  const m = (x, y) => s.moveTo(...P(x, y));
  const l = (x, y) => s.lineTo(...P(x, y));
  const q = (cx, cy, x, y) => s.quadraticCurveTo(...P(cx, cy), ...P(x, y));
  m(98, 18); l(122, 8); q(150, 40, 178, 8); l(202, 18); l(282, 62); l(252, 126); l(224, 112);
  l(226, 304); q(150, 314, 74, 304); l(76, 112); l(48, 126); l(18, 62); l(98, 18);
  return s;
}

// Logo → transparent print: dark pixels become see-through, light ink stays.
function frontTexture(img) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  const sx = img.width * 0.17, sy = img.height * 0.085, sw = img.width * 0.66, sh = img.height * 0.68;
  const k = Math.min(1024 / sw, 1024 / sh);
  g.drawImage(img, sx, sy, sw, sh, (1024 - sw * k) / 2, (1024 - sh * k) / 2, sw * k, sh * k);
  const d = g.getImageData(0, 0, 1024, 1024);
  const a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const v = Math.max(a[i], a[i + 1], a[i + 2]);
    a[i + 3] = Math.max(0, Math.min(255, (v - 30) * 2.4));
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function backTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.textAlign = "center";
  g.fillStyle = "#f6ead9";
  g.font = '230px "Permanent Marker", cursive';
  g.save();
  g.translate(512, 470);
  g.rotate(-0.08);
  g.fillText("TRADE", 0, 0);
  g.restore();
  g.font = '120px Anton, Impact, sans-serif';
  g.fillStyle = "#e8b07f";
  g.fillText("W O R L D", 512, 640);
  g.font = '600 40px "Space Grotesk", sans-serif';
  g.fillStyle = "#f6ead9";
  g.fillText("— JODHPUR · RAJASTHAN —", 512, 730);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function Hero3D({ color = "#121212", onFail }) {
  const mountRef = useRef(null);
  const targetColor = useRef(new THREE.Color(color));

  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  useEffect(() => {
    const el = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onFail?.();
      return undefined;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, -0.4, 14.5);

    // Lights: warm key + colourful rims (saffron / pink / blue city)
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 6);
    const pink = new THREE.PointLight(0xff2d75, 40, 20);
    pink.position.set(-5, 2, 3);
    const blue = new THREE.PointLight(0x2f6bff, 40, 20);
    blue.position.set(5, -2, 3);
    const saffron = new THREE.PointLight(0xff8a1f, 30, 20);
    saffron.position.set(0, 4, -4);
    scene.add(key, pink, blue, saffron);

    const group = new THREE.Group();
    scene.add(group);

    // The tee
    const depth = 0.3;
    const bevel = 0.22;
    const geo = new THREE.ExtrudeGeometry(teeShape(), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: 0.16,
      bevelSegments: 10,
      curveSegments: 40,
    });
    geo.translate(0, 0, -depth / 2);
    const fabric = new THREE.MeshPhysicalMaterial({
      color: targetColor.current.clone(),
      roughness: 0.82,
      envMapIntensity: 0.55,
      sheen: 0.35,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#ffd9c2"),
    });
    const tee = new THREE.Mesh(geo, fabric);
    group.add(tee);

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

    const img = new Image();
    img.onload = () => {
      frontMat.map = frontTexture(img);
      frontMat.opacity = 1;
      frontMat.needsUpdate = true;
    };
    img.src = "/logo.jpg";
    Promise.all([
      document.fonts.load('230px "Permanent Marker"'),
      document.fonts.load("120px Anton"),
      document.fonts.load('600 40px "Space Grotesk"'),
    ])
      .catch(() => {})
      .then(() => {
        backMat.map = backTexture();
        backMat.opacity = 1;
        backMat.needsUpdate = true;
      });

    // Glow rings + sparkles around the tee
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2d75, transparent: true, opacity: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.018, 16, 200), ringMat);
    ring.rotation.x = Math.PI / 2.4;
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.3 });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.012, 16, 200), ring2Mat);
    ring2.rotation.set(Math.PI / 2.1, 0.4, 0);
    scene.add(ring, ring2);

    const COUNT = 260;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const palette = [new THREE.Color("#ff8a1f"), new THREE.Color("#ff2d75"), new THREE.Color("#2f6bff"), new THREE.Color("#e8b07f")];
    for (let i = 0; i < COUNT; i++) {
      const r = 3.6 + Math.random() * 2.6;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th)], i * 3);
      palette[i % 4].toArray(col, i * 3);
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const sparkMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
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

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const t = clock.getElapsedTime();
      if (!dragging) {
        velocity *= 0.95;
        spin += velocity + (reduce ? 0 : 0.006);
      }
      tiltX += (tiltTarget - tiltX) * 0.06;
      group.rotation.y = spin + Math.sin(t * 0.5) * 0.15;
      group.rotation.x = tiltX;
      group.position.y = reduce ? 0 : Math.sin(t * 1.2) * 0.12;
      fabric.color.lerp(targetColor.current, 0.06);
      ring.rotation.z = t * 0.25;
      ring2.rotation.z = -t * 0.18;
      sparks.rotation.y = t * 0.05;
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      [geo, printGeo, sparkGeo, ring.geometry, ring2.geometry].forEach((g) => g.dispose());
      [fabric, frontMat, backMat, ringMat, ring2Mat, sparkMat].forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="hero3d" aria-label="3D Trade World T-shirt — drag to spin" role="img" />;
}
