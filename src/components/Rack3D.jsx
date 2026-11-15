import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/*
  3D clothes rail: every tee hangs on its own hanger and swings like real fabric.
  Tees are thin curved "cloth" planes cut to a T-shirt silhouette, textured with the
  product photo (or its print when there is no photo).
*/

// T-shirt outline in the same SVG units as TeeMockup (x 18–282, y 8–312).
const TEE_PATH = "M98 18 L122 8 Q150 40 178 8 L202 18 L282 62 L252 126 L224 112 L226 304 Q150 314 74 304 L76 112 L48 126 L18 62 Z";
const SVG_W = 264;
const SVG_H = 304;
const U = 52; // SVG units per world unit
const TEE_W = SVG_W / U; // ≈ 5.08
const TEE_H = SVG_H / U; // ≈ 5.85
const TEX_W = 1024;
const TEX_H = Math.round((TEX_W * SVG_H) / SVG_W);
const SPACING = 6.1;
const RAIL_TO_TEE = 3.65; // rail centre → tee centre
const HANGER_Z = -0.32; // hanger sits just behind the fabric

function isLight(hex = "#111111") {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

function teeCanvas({ color, image, graphic, back = false }) {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d");
  const s = TEX_W / SVG_W;
  if (back) {
    g.translate(TEX_W, 0);
    g.scale(-1, 1);
  }
  g.save();
  g.scale(s, s);
  g.translate(-18, -8);
  const path = new Path2D(TEE_PATH);
  g.save();
  g.clip(path);

  // fabric
  g.fillStyle = color;
  g.fillRect(0, 0, 400, 400);

  if (image && !back) {
    // product photo, "cover" fit over the whole tee
    g.restore();
    g.save();
    g.clip(path);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (back) {
      g.translate(TEX_W, 0);
      g.scale(-1, 1);
    }
    const k = Math.max(TEX_W / image.width, TEX_H / image.height);
    const w = image.width * k;
    const h = image.height * k;
    g.drawImage(image, (TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
    g.scale(s, s);
    g.translate(-18, -8);
  } else if (!back) {
    // printed graphic
    const light = isLight(color);
    const ink = light ? "#151515" : "#f4f1ea";
    const accent = light ? "#555" : "#cfc6b8";
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
    const size = Math.min(30, 132 / (text.length * 0.5));
    g.font = `${size}px Anton, Impact, sans-serif`;
    g.fillText(text, 150, 132, 136);
    g.fillStyle = accent;
    g.fillRect(132, 141, 36, 1.4);
    g.font = '600 8.5px "Space Grotesk", sans-serif';
    g.fillText("J O D H P U R", 150, 156);
  } else {
    // back neck label
    const light = isLight(color);
    g.fillStyle = light ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.6)";
    g.textAlign = "center";
    g.font = '600 6px "Space Grotesk", sans-serif';
    g.fillText("TRADE WORLD", 150, 34);
  }

  // shading: soft side shadows, top light, a few folds
  const side = g.createLinearGradient(18, 0, 282, 0);
  side.addColorStop(0, "rgba(0,0,0,.34)");
  side.addColorStop(0.22, "rgba(0,0,0,0)");
  side.addColorStop(0.78, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,.34)");
  g.fillStyle = side;
  g.fillRect(0, 0, 400, 400);
  const top = g.createLinearGradient(0, 8, 0, 312);
  top.addColorStop(0, "rgba(255,255,255,.08)");
  top.addColorStop(1, "rgba(0,0,0,.22)");
  g.fillStyle = top;
  g.fillRect(0, 0, 400, 400);
  g.strokeStyle = "rgba(0,0,0,.10)";
  g.lineWidth = 3;
  [[96, 140, 104, 300], [204, 140, 196, 300], [70, 70, 96, 128], [230, 70, 204, 128]].forEach(([x1, y1, x2, y2]) => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + x2) / 2 + 6, (y1 + y2) / 2, x2, y2);
    g.stroke();
  });
  // collar rib + hem stitching
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(120, 9);
  g.quadraticCurveTo(150, 46, 180, 9);
  g.stroke();
  g.setLineDash([3, 3]);
  g.lineWidth = 0.8;
  g.strokeStyle = isLight(color) ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.18)";
  g.beginPath();
  g.moveTo(78, 298);
  g.quadraticCurveTo(150, 307, 222, 298);
  g.stroke();
  g.setLineDash([]);
  g.restore();

  // crisp outline
  g.strokeStyle = "rgba(0,0,0,.45)";
  g.lineWidth = 1.2;
  g.stroke(path);
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Gentle drape: sides curve back, small ripples, sleeves fall away.
function clothGeometry(segX, segY) {
  const geo = new THREE.PlaneGeometry(TEE_W, TEE_H, segX, segY);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const nx = x / (TEE_W / 2);
    let z = -0.32 * nx * nx + 0.045 * Math.sin(y * 1.4 + x * 0.7) + 0.03 * Math.sin(x * 2.3);
    if (Math.abs(nx) > 0.62) z -= 0.35 * (Math.abs(nx) - 0.62);
    p.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function loadImage(src) {
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

export default function Rack3D({ items, index = 0, onIndexChange, onOpen, onFail }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ target: index });
  const cbRef = useRef({ onIndexChange, onOpen });
  cbRef.current = { onIndexChange, onOpen };

  useEffect(() => {
    stateRef.current.target = index;
  }, [index]);

  const signature = items.map((i) => `${i.id}:${i.image || ""}:${i.color}:${i.graphic}`).join("|");

  useEffect(() => {
    const el = mountRef.current;
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.touchAction = "pan-y";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.35;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

    // Lights: soft key, warm + cool rims and a spotlight that follows the focused tee
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(4, 8, 10);
    const warm = new THREE.PointLight(0xffb27a, 16, 30);
    warm.position.set(-8, 2, 5);
    const cool = new THREE.PointLight(0x9db8ff, 14, 30);
    cool.position.set(8, -2, 5);
    const spot = new THREE.SpotLight(0xffffff, 55, 40, 0.42, 0.7, 1.2);
    spot.position.set(0, 9, 9);
    scene.add(key, warm, cool, spot, spot.target);

    const rack = new THREE.Group();
    scene.add(rack);
    rack.position.y = RAIL_TO_TEE - 0.35; // tees centred slightly below the middle

    const disposables = [];
    const track = (o) => (disposables.push(o), o);

    // Rail + ceiling drops
    const n = items.length;
    const railLen = (n - 1) * SPACING + 9;
    const chrome = track(new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.22 }));
    const rail = new THREE.Mesh(track(new THREE.CylinderGeometry(0.075, 0.075, railLen, 24)), chrome);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(((n - 1) * SPACING) / 2, 0, HANGER_Z);
    rack.add(rail);
    const capGeo = track(new THREE.SphereGeometry(0.13, 20, 16));
    const dropGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 8, 16));
    [-1, 1].forEach((side) => {
      const x = rail.position.x + (side * railLen) / 2;
      const cap = new THREE.Mesh(capGeo, chrome);
      cap.position.set(x, 0, HANGER_Z);
      const drop = new THREE.Mesh(dropGeo, chrome);
      drop.position.set(x - side * 0.6, 4, HANGER_Z);
      rack.add(cap, drop);
    });

    // Shared hanger parts
    const hangerMat = track(new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.2, roughness: 0.45 }));
    const goldMat = track(new THREE.MeshStandardMaterial({ color: 0xd8b07f, metalness: 1, roughness: 0.3 }));
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.95, -1.98, 0),
      new THREE.Vector3(-1.05, -1.36, 0),
      new THREE.Vector3(0, -0.86, 0),
      new THREE.Vector3(1.05, -1.36, 0),
      new THREE.Vector3(1.95, -1.98, 0),
    ]);
    const armGeo = track(new THREE.TubeGeometry(armCurve, 48, 0.085, 10, false));
    const tipGeo = track(new THREE.SphereGeometry(0.1, 14, 12));
    const neckGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10));
    const hookGeo = track(new THREE.TorusGeometry(0.16, 0.03, 10, 32, Math.PI * 1.6));
    const clothGeo = track(clothGeometry(low ? 18 : 30, low ? 22 : 36));

    // Hangers + tees
    const hangers = [];
    const fabricMats = [];
    let disposed = false;
    items.forEach((item, i) => {
      const pivot = new THREE.Group(); // swings around the rail
      pivot.position.set(i * SPACING, 0, HANGER_Z);
      rack.add(pivot);

      const hookWrap = new THREE.Group();
      hookWrap.rotation.y = Math.PI / 2;
      const hook = new THREE.Mesh(hookGeo, goldMat);
      hook.rotation.z = -Math.PI / 2;
      hookWrap.add(hook);
      pivot.add(hookWrap);
      const neck = new THREE.Mesh(neckGeo, goldMat);
      neck.position.y = -0.5;
      pivot.add(neck);
      // arms sit just behind the fabric so only the neck part shows, like a real hanger
      const arm = new THREE.Mesh(armGeo, hangerMat);
      arm.position.z = -0.14;
      pivot.add(arm);
      [-1, 1].forEach((sx) => {
        const tip = new THREE.Mesh(tipGeo, hangerMat);
        tip.position.set(sx * 1.95, -1.98, -0.14);
        pivot.add(tip);
      });

      const front = new THREE.MeshStandardMaterial({ alphaTest: 0.5, roughness: 0.92, side: THREE.FrontSide, color: 0xffffff });
      const back = new THREE.MeshStandardMaterial({ alphaTest: 0.5, roughness: 0.92, side: THREE.BackSide, color: 0xffffff });
      front.map = teeCanvas({ color: item.color, graphic: item.graphic });
      back.map = teeCanvas({ color: item.color, back: true });
      fabricMats.push(front, back);
      const teeF = new THREE.Mesh(clothGeo, front);
      const teeB = new THREE.Mesh(clothGeo, back);
      const tee = new THREE.Group();
      tee.add(teeF, teeB);
      tee.position.set(0, -RAIL_TO_TEE, -HANGER_Z);
      pivot.add(tee);
      teeF.userData.index = i;
      teeB.userData.index = i;

      hangers.push({ pivot, tee, hit: [teeF, teeB], sway: 0, swayV: 0, twist: 0, depth: 0 });

      // Swap in the real photo when it arrives
      if (item.image) {
        loadImage(item.image).then((img) => {
          if (disposed || !img) return;
          try {
            const tex = teeCanvas({ color: item.color, image: img });
            front.map.dispose();
            front.map = tex;
            front.needsUpdate = true;
          } catch {
            /* a photo from another site that blocks canvas use: keep the printed version */
          }
        });
      }
    });

    // Redraw printed tees once fonts are ready
    document.fonts?.ready.then(() => {
      if (disposed) return;
      items.forEach((item, i) => {
        if (item.image) return;
        const m = fabricMats[i * 2];
        m.map.dispose();
        m.map = teeCanvas({ color: item.color, graphic: item.graphic });
        m.needsUpdate = true;
      });
    });

    // ── Camera fit ──
    let viewW = 10;
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(3.75 / t, 3.4 / (t * camera.aspect));
      camera.position.set(0, -0.15, dist);
      camera.lookAt(0, -0.15, 0);
      camera.updateProjectionMatrix();
      viewW = 2 * dist * t * camera.aspect;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ── Interaction ──
    const st = stateRef.current;
    let pos = Math.min(Math.max(st.target, 0), n - 1);
    let prevPos = pos;
    let dragging = false;
    let startX = 0;
    let startPos = 0;
    let moved = 0;
    let lastX = 0;
    let lastT = 0;
    let flick = 0;
    let hovered = -1;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitList = hangers.flatMap((h) => h.hit);

    const pick = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hitList, false)[0];
      return hit ? hit.object.userData.index : -1;
    };
    const clamp = (v) => Math.min(Math.max(v, 0), n - 1);

    const down = (e) => {
      dragging = true;
      moved = 0;
      startX = lastX = e.clientX;
      lastT = performance.now();
      startPos = pos;
      flick = 0;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (dragging) {
        const dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        const unitsPerPx = viewW / canvas.clientWidth / SPACING;
        pos = clamp(startPos - dx * unitsPerPx);
        // rubber-band past the ends
        const raw = startPos - dx * unitsPerPx;
        if (raw < 0 || raw > n - 1) pos += (raw - pos) * 0.25;
        const now = performance.now();
        flick = ((lastX - e.clientX) * unitsPerPx) / Math.max(1, now - lastT);
        lastX = e.clientX;
        lastT = now;
      } else if (e.pointerType === "mouse") {
        hovered = pick(e);
        canvas.style.cursor = hovered >= 0 ? "pointer" : "grab";
      }
    };
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {
        const i = pick(e);
        if (i >= 0) {
          if (i === Math.round(st.target)) cbRef.current.onOpen?.(i);
          else {
            st.target = i;
            cbRef.current.onIndexChange?.(i);
          }
          hangers[i].swayV += 0.03;
        }
        return;
      }
      const next = clamp(Math.round(pos + flick * 220));
      st.target = next;
      cbRef.current.onIndexChange?.(next);
    };
    const leave = () => {
      hovered = -1;
    };
    const wheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // let the page scroll
      e.preventDefault();
      pos = clamp(pos + e.deltaX * 0.004);
      clearTimeout(wheel.t);
      wheel.t = setTimeout(() => {
        st.target = clamp(Math.round(pos));
        cbRef.current.onIndexChange?.(st.target);
      }, 140);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });

    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    io.observe(el);

    // ── Animation ──
    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (!dragging) pos += (clamp(st.target) - pos) * Math.min(1, dt * 7);
      const vel = (pos - prevPos) / Math.max(dt, 0.001);
      prevPos = pos;

      rack.position.x = -pos * SPACING;
      spot.position.x = 0;
      spot.target.position.set(0, -0.4, 0);

      hangers.forEach((h, i) => {
        const dist = Math.abs(i - pos);
        const focus = Math.max(0, 1 - dist);
        // inertia: the rack moves, the tees lag behind and swing back (spring)
        const force = -vel * 0.06 * (reduce ? 0 : 1);
        h.swayV += (force - h.sway) * 9 * dt - h.swayV * 3.2 * dt;
        h.sway += h.swayV;
        const idle = reduce ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.012;
        h.pivot.rotation.z = THREE.MathUtils.clamp(h.sway, -0.35, 0.35);
        h.pivot.rotation.x = idle + (i === hovered ? -0.05 : 0);
        h.twist += ((i === hovered ? 0.22 : 0) + (i - pos) * -0.1 - h.twist) * Math.min(1, dt * 5);
        h.pivot.rotation.y = h.twist;
        // focused tee is full size; neighbours sit a touch smaller (hooks stay on the rail)
        h.depth += (focus - h.depth) * Math.min(1, dt * 6);
        h.pivot.scale.setScalar(0.9 + h.depth * 0.1);
      });
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
      canvas.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
      clearTimeout(wheel.t);
      fabricMats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      disposables.forEach((d) => d.dispose());
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={mountRef} className="rack3d" role="img" aria-label="3D clothes rack with our printed T-shirts — drag to browse" />;
}
