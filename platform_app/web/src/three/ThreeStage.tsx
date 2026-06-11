// ============================================================
// ThreeStage — переиспользуемый WebGL-вьюпорт (three.js + OrbitControls).
// Принимает Object3D (строит родитель через useMemo); подменяет содержимое
// и освобождает старую геометрию. Рендер-цикл паузится, когда вкладка скрыта
// (Workspace keep-alive держит модуль смонтированным с display:none).
// ============================================================
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}

export function ThreeStage({ object, height = 420, background = 0x0a0e0a }: {
  object: THREE.Object3D | null; height?: number; background?: number;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer; controls: OrbitControls; content: THREE.Object3D | null;
  } | null>(null);

  // init once
  useEffect(() => {
    const el = mount.current!;
    const w = el.clientWidth || 600, h = height;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 5000);
    camera.position.set(220, 240, 320);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(150, 300, 200);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x88aaff, 0.4);
    dir2.position.set(-200, 120, -150);
    scene.add(dir2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    api.current = { scene, camera, renderer, controls, content: null };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!el.offsetParent) return; // вкладка скрыта (display:none) — не рендерим
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth || w;
      camera.aspect = nw / h; camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (api.current?.content) disposeObject(api.current.content);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [height, background]);

  // swap content + frame camera to fit
  useEffect(() => {
    const a = api.current; if (!a) return;
    if (a.content) { a.scene.remove(a.content); disposeObject(a.content); a.content = null; }
    if (object) {
      a.scene.add(object);
      a.content = object;
      const box = new THREE.Box3().setFromObject(object);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      if (sphere.radius > 0) {
        const r = sphere.radius;
        a.controls.target.copy(sphere.center);
        a.camera.position.copy(sphere.center).add(new THREE.Vector3(r * 1.1, r * 1.2, r * 1.6));
        a.camera.near = r / 50; a.camera.far = r * 50;
        a.camera.updateProjectionMatrix();
        a.controls.update();
      }
    }
  }, [object]);

  return <div ref={mount} style={{ width: "100%", height, borderRadius: 6, overflow: "hidden" }} />;
}
