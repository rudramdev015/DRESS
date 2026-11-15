import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RAIL_TO_TEE, createHangerKit, fabricMaterials, frontTexture, garmentGeometry, loadImage } from "../lib/garment.js";

/*
  3D clothes rail: every tee hangs on a walnut hanger with a brass hook and swings like real fabric.
  Tees use the product photo when there is one, otherwise their print.
*/

const SPACING = 6.0;

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
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.touchAction = "pan-y";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.4;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

    // Boutique lighting: key from upper-left shows the folds, soft fill, warm/cool rims, spot on the focused tee
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(-5, 7, 9);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(6, -1, 6);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(0, 4, -8);
    const warm = new THREE.PointLight(0xffe6cc, 10, 30);
    warm.position.set(-9, 1, 5);
    const cool = new THREE.PointLight(0xe8eeff, 8, 30);
    cool.position.set(9, -2, 5);
    const spot = new THREE.SpotLight(0xffffff, 45, 40, 0.4, 0.75, 1.2);
    spot.position.set(0, 9, 9);
    spot.target.position.set(0, -0.6, 0);
    scene.add(key, fill, rim, warm, cool, spot, spot.target);

    const rack = new THREE.Group();
    rack.position.y = 3.2; // centre the hanging tees in view
    scene.add(rack);

    const n = items.length;
    const owned = []; // geometries/materials to dispose

    // Chrome rail with matte black ceiling brackets
    const railLen = (n - 1) * SPACING + 8;
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.18 });
    const matte = new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.4, roughness: 0.5 });
    const railGeo = new THREE.CylinderGeometry(0.075, 0.075, railLen, 28);
    const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.16, 24);
    const dropGeo = new THREE.CylinderGeometry(0.06, 0.06, 9, 16);
    const collarGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.22, 20);
    owned.push(chrome, matte, railGeo, capGeo, dropGeo, collarGeo);
    const rail = new THREE.Mesh(railGeo, chrome);
    rail.rotation.z = Math.PI / 2;
    rail.position.x = ((n - 1) * SPACING) / 2;
    rack.add(rail);
    [-1, 1].forEach((side) => {
      const x = rail.position.x + (side * railLen) / 2;
      const cap = new THREE.Mesh(capGeo, matte);
      cap.rotation.z = Math.PI / 2;
      cap.position.x = x;
      const drop = new THREE.Mesh(dropGeo, matte);
      drop.position.set(x - side * 0.5, 4.5, 0);
      const collar = new THREE.Mesh(collarGeo, matte);
      collar.position.set(x - side * 0.5, 0.05, 0);
      rack.add(cap, drop, collar);
    });

    // Shared tee + hanger geometry
    const seg = low ? { segX: 40, segY: 46 } : { segX: 64, segY: 72 };
    const frontGeo = garmentGeometry("front", seg);
    const backGeo = garmentGeometry("back", seg);
    owned.push(frontGeo, backGeo);
    const kit = createHangerKit({ low });

    const hangers = [];
    const mats = [];
    let disposed = false;
    items.forEach((item, i) => {
      const pivot = new THREE.Group(); // swings around the rail
      pivot.position.set(i * SPACING, 0, 0);
      rack.add(pivot);
      pivot.add(kit.make());

      const { front, back } = fabricMaterials({ color: item.color, graphic: item.graphic });
      mats.push(front, back);
      const teeF = new THREE.Mesh(frontGeo, front);
      const teeB = new THREE.Mesh(backGeo, back);
      teeF.userData.index = teeB.userData.index = i;
      const tee = new THREE.Group();
      tee.position.y = -RAIL_TO_TEE;
      tee.add(teeF, teeB);
      pivot.add(tee);
      hangers.push({ pivot, hit: [teeF, teeB], sway: 0, swayV: 0, twist: 0, focus: 0, front, item });

      if (item.image) {
        loadImage(item.image).then((img) => {
          if (disposed || !img) return;
          try {
            const tex = frontTexture({ color: item.color, image: img });
            front.map.dispose();
            front.map = tex;
            front.needsUpdate = true;
          } catch {
            /* photo from a site that blocks canvas use: keep the printed version */
          }
        });
      }
    });

    // Redraw printed tees once web fonts are ready
    document.fonts?.ready.then(() => {
      if (disposed) return;
      hangers.forEach((h) => {
        if (h.item.image) return;
        h.front.map.dispose();
        h.front.map = frontTexture({ color: h.item.color, graphic: h.item.graphic });
        h.front.needsUpdate = true;
      });
    });

    // ── Camera fit (phone, tablet, desktop) ──
    let viewW = 10;
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max(3.8 / t, 3.35 / (t * camera.aspect));
      camera.position.set(0, -0.1, dist);
      camera.lookAt(0, -0.1, 0);
      camera.updateProjectionMatrix();
      viewW = 2 * dist * t * camera.aspect;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ── Interaction: drag / swipe, tap, hover, trackpad ──
    const st = stateRef.current;
    const clamp = (v) => Math.min(Math.max(v, 0), n - 1);
    let pos = clamp(st.target);
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
        const raw = startPos - dx * unitsPerPx;
        pos = clamp(raw) + (raw - clamp(raw)) * 0.25; // rubber-band past the ends
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
          hangers[i].swayV += 0.035;
          if (i === Math.round(st.target)) cbRef.current.onOpen?.(i);
          else {
            st.target = i;
            cbRef.current.onIndexChange?.(i);
          }
        }
        return;
      }
      st.target = clamp(Math.round(pos + flick * 220));
      cbRef.current.onIndexChange?.(st.target);
    };
    const leave = () => {
      hovered = -1;
    };
    let wheelTimer = 0;
    const wheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scroll stays with the page
      e.preventDefault();
      pos = clamp(pos + e.deltaX * 0.004);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
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

      hangers.forEach((h, i) => {
        // inertia: when the rail moves the tees lag behind, then swing back (damped spring)
        const force = reduce ? 0 : -vel * 0.06;
        h.swayV += (force - h.sway) * 9 * dt - h.swayV * 3.2 * dt;
        h.sway += h.swayV;
        h.pivot.rotation.z = THREE.MathUtils.clamp(h.sway, -0.35, 0.35);
        h.pivot.rotation.x = (reduce ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.012) + (i === hovered ? -0.05 : 0);
        h.twist += ((i === hovered ? 0.2 : 0) + (i - pos) * -0.1 - h.twist) * Math.min(1, dt * 5);
        h.pivot.rotation.y = h.twist;
        h.focus += (Math.max(0, 1 - Math.abs(i - pos)) - h.focus) * Math.min(1, dt * 6);
        h.pivot.scale.setScalar(0.9 + h.focus * 0.1);
      });
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      clearTimeout(wheelTimer);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
      mats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      owned.forEach((o) => o.dispose());
      kit.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={mountRef} className="rack3d" role="img" aria-label="3D clothes rack with our printed T-shirts — drag to browse" />;
}
