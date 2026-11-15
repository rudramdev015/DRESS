import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RAIL_TO_TEE, createHangerKit, fabricMaterials, garmentGeometry } from "./garment.js";

/*
  Product "studio": renders a realistic hanging tee (same model as the 3D rack) to an image,
  so product cards show a real-looking garment instead of a flat drawing.
  One small hidden renderer is reused for every shot.
*/

let studio = null;

function setup() {
  const low = window.matchMedia("(max-width: 860px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const W = low ? 520 : 760;
  const H = Math.round(W * 1.25);
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-5, 7, 9);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(6, -1, 6);
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  rim.position.set(2, 4, -8);
  scene.add(key, fill, rim);

  const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 100);
  const t = Math.tan(THREE.MathUtils.degToRad(12));
  const dist = Math.max(3.55 / t, 2.85 / (t * (W / H)));
  camera.position.set(0, -3.2, dist);
  camera.lookAt(0, -3.2, 0);

  const group = new THREE.Group();
  group.rotation.y = -0.16;
  group.rotation.x = 0.02;
  scene.add(group);
  const kit = createHangerKit({ low });
  group.add(kit.make());
  // short piece of chrome rail the hanger hangs from
  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 4.2, 24),
    new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.18 })
  );
  rail.rotation.z = Math.PI / 2;
  scene.add(rail);
  const front = new THREE.Mesh(garmentGeometry("front"));
  const back = new THREE.Mesh(garmentGeometry("back"));
  const tee = new THREE.Group();
  tee.position.y = -RAIL_TO_TEE;
  tee.add(front, back);
  group.add(tee);

  // warm-up frame: compiles shaders so the first real shot is lit correctly
  const warm = fabricMaterials({ color: "#111111", graphic: "" });
  front.material = warm.front;
  back.material = warm.back;
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  [warm.front, warm.back].forEach((m) => {
    m.map?.dispose();
    m.dispose();
  });

  studio = { renderer, scene, camera, front, back };
}

let queue = Promise.resolve();

/** Renders one tee and returns an object URL (WebP or PNG). Shots are made one at a time. */
export function renderTee({ color, graphic }) {
  const job = queue.then(async () => {
    await document.fonts?.ready;
    if (!studio) setup();
    const { renderer, scene, camera, front, back } = studio;
    const mats = fabricMaterials({ color, graphic });
    front.material = mats.front;
    back.material = mats.back;
    renderer.render(scene, camera);
    const blob = await new Promise((resolve) =>
      renderer.domElement.toBlob((b) => (b ? resolve(b) : renderer.domElement.toBlob(resolve, "image/png")), "image/webp", 0.9)
    );
    [mats.front, mats.back].forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    if (!blob) throw new Error("Could not create the tee image");
    return URL.createObjectURL(blob);
  });
  queue = job.catch(() => {});
  return job;
}
