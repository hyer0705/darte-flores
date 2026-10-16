import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BouquetComponentSlot, CameraViewPreset, FlowerShapeType } from '../types';

export interface BouquetCanvas3DRef {
  captureSnapshot: () => string;
  setCameraView: (preset: CameraViewPreset) => void;
}

interface BouquetCanvas3DProps {
  components: BouquetComponentSlot[];
  wrappingColor: string;
  ribbonColor: string;
  selectedSlotId: string | null;
  hoveredSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onHoverSlot: (slotId: string | null) => void;
  cameraPreset: CameraViewPreset;
  onCameraPresetChange: (preset: CameraViewPreset) => void;
}

interface HoveredFlowerInfo {
  slotId: string;
  nameKo: string;
  flowerMeaning: string;
  colorHex: string;
  x: number;
  y: number;
}

// Reusable math vectors outside render loop to avoid GC
const _targetCamPos = new THREE.Vector3(0, 2.35, 5.4);
const _targetLookAt = new THREE.Vector3(0, 0.72, 0);
const GOLDEN_ANGLE = 2.399963229728653;

function createStudioBackdropTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(256, 210, 30, 256, 256, 360);
  grad.addColorStop(0, '#DFD6C7');
  grad.addColorStop(0.55, '#CFC3B0');
  grad.addColorStop(1, '#BEB09B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(35, 30, 25, 0.45)');
  grad.addColorStop(0.5, 'rgba(35, 30, 25, 0.16)');
  grad.addColorStop(1, 'rgba(35, 30, 25, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildProceduralFlowerHead(
  shapeType: FlowerShapeType,
  colorHex: string
): THREE.Group {
  const group = new THREE.Group();
  const baseColor = new THREE.Color(colorHex || '#BF6C8B');
  // Prevent pure white washout by adding warm botanical depth to inner/outer petals
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);
  const innerColor =
    hsl.l > 0.88
      ? new THREE.Color().setHSL(hsl.h || 0.09, Math.max(hsl.s, 0.22), 0.78)
      : baseColor.clone().offsetHSL(0.01, 0.12, -0.11);
  const outerColor =
    hsl.l > 0.88
      ? new THREE.Color().setHSL(hsl.h || 0.09, Math.max(hsl.s, 0.1), 0.94)
      : baseColor.clone().offsetHSL(-0.01, -0.02, 0.06);

  const petalMatInner = new THREE.MeshPhysicalMaterial({
    color: innerColor,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.65,
    sheen: 0.45,
    sheenColor: outerColor,
    emissive: new THREE.Color(0x000000),
    side: THREE.DoubleSide,
  });

  const petalMatOuter = new THREE.MeshPhysicalMaterial({
    color: outerColor,
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.08,
    sheen: 0.35,
    sheenColor: baseColor,
    emissive: new THREE.Color(0x000000),
    side: THREE.DoubleSide,
  });

  const stamenMat = new THREE.MeshStandardMaterial({
    color: 0xe69d35,
    roughness: 0.45,
    metalness: 0.08,
  });

  const calyxMat = new THREE.MeshStandardMaterial({
    color: 0x4a6940,
    roughness: 0.65,
  });

  const highlightableMaterials: THREE.MeshStandardMaterial[] = [petalMatInner, petalMatOuter];

  if (shapeType === 'peony') {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), stamenMat);
    core.scale.set(1, 0.6, 1);
    group.add(core);

    const ringCounts = [6, 9, 12, 15];
    ringCounts.forEach((count, rIdx) => {
      const radius = 0.09 + rIdx * 0.068;
      const petalGeo = new THREE.SphereGeometry(
        0.16 + rIdx * 0.025,
        14,
        12,
        0,
        Math.PI * 0.85,
        0,
        Math.PI * 0.72
      );
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rIdx * 0.45;
        const petal = new THREE.Mesh(petalGeo, rIdx < 2 ? petalMatInner : petalMatOuter);
        petal.position.set(
          Math.cos(angle) * radius * 0.45,
          0.02 + rIdx * 0.01,
          Math.sin(angle) * radius * 0.45
        );
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.x = 0.35 + rIdx * 0.22;
        petal.scale.set(1.05, 0.85, 0.65);
        petal.castShadow = true;
        petal.receiveShadow = true;
        group.add(petal);
      }
    });
  } else if (shapeType === 'rose') {
    const budGeo = new THREE.ConeGeometry(0.09, 0.22, 14, 1, true);
    const bud = new THREE.Mesh(budGeo, petalMatInner);
    bud.rotation.x = Math.PI;
    bud.position.y = 0.09;
    group.add(bud);

    const totalPetals = 18;
    const petalGeo = new THREE.SphereGeometry(0.17, 14, 12, 0, Math.PI * 0.75, 0, Math.PI * 0.65);
    for (let i = 0; i < totalPetals; i++) {
      const t = i / totalPetals;
      const goldenAngle = i * GOLDEN_ANGLE;
      const r = 0.05 + t * 0.16;
      const petal = new THREE.Mesh(petalGeo, t < 0.5 ? petalMatInner : petalMatOuter);
      petal.position.set(Math.cos(goldenAngle) * r, 0.06 - t * 0.04, Math.sin(goldenAngle) * r);
      petal.rotation.y = -goldenAngle + Math.PI / 2;
      petal.rotation.x = 0.25 + t * 0.85;
      petal.scale.set(0.85 + t * 0.45, 0.9, 0.6);
      petal.castShadow = true;
      petal.receiveShadow = true;
      group.add(petal);
    }
  } else if (shapeType === 'tulip') {
    const pistil = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8), stamenMat);
    pistil.position.y = 0.1;
    group.add(pistil);

    const cupPetalGeo = new THREE.SphereGeometry(0.18, 16, 14, 0, Math.PI * 0.58, 0, Math.PI * 0.82);
    for (let i = 0; i < 6; i++) {
      const isOuter = i % 2 === 1;
      const angle = (i / 6) * Math.PI * 2;
      const r = isOuter ? 0.075 : 0.06;
      const petal = new THREE.Mesh(cupPetalGeo, isOuter ? petalMatOuter : petalMatInner);
      petal.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r);
      petal.rotation.y = -angle - Math.PI / 2;
      petal.rotation.x = isOuter ? 0.18 : 0.1;
      petal.scale.set(0.85, 1.38, 0.65);
      petal.castShadow = true;
      petal.receiveShadow = true;
      group.add(petal);
    }
  } else if (shapeType === 'freesia') {
    for (let i = 0; i < 5; i++) {
      const subGroup = new THREE.Group();
      const progress = i / 4;
      const bellGeo = new THREE.ConeGeometry(0.11 * (1 - progress * 0.35), 0.2, 8, 1, false);
      const bell = new THREE.Mesh(bellGeo, i < 3 ? petalMatOuter : petalMatInner);
      bell.rotation.x = Math.PI;
      bell.position.y = 0.08;
      subGroup.add(bell);

      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.045 * (1 - progress * 0.3), 8, 8),
          petalMatInner
        );
        tip.scale.set(1, 0.35, 1.5);
        tip.position.set(
          Math.cos(a) * 0.07 * (1 - progress * 0.3),
          0.16,
          Math.sin(a) * 0.07 * (1 - progress * 0.3)
        );
        tip.rotation.y = -a;
        tip.rotation.x = 0.5;
        subGroup.add(tip);
      }

      const sideAngle = i * 1.1;
      subGroup.position.set(
        Math.cos(sideAngle) * (0.08 + i * 0.03),
        i * 0.09 - 0.1,
        Math.sin(sideAngle) * (0.08 + i * 0.03)
      );
      subGroup.rotation.z = -0.35 + i * 0.12;
      subGroup.rotation.y = sideAngle;
      group.add(subGroup);
    }
  } else if (shapeType === 'daisy') {
    const centerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.06, 20), stamenMat);
    centerDisc.position.y = 0.03;
    group.add(centerDisc);

    const rayCount = 20;
    const rayGeo = new THREE.CapsuleGeometry(0.036, 0.22, 6, 10);
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const isSecondRow = i % 2 === 1;
      const petal = new THREE.Mesh(rayGeo, isSecondRow ? petalMatInner : petalMatOuter);
      const dist = 0.21;
      petal.position.set(
        Math.cos(angle) * dist,
        isSecondRow ? 0.025 : 0.015,
        Math.sin(angle) * dist
      );
      petal.rotation.y = -angle;
      petal.rotation.z = Math.PI / 2 - (isSecondRow ? 0.14 : 0.06);
      petal.scale.set(0.42, 1, 1.15);
      petal.castShadow = true;
      petal.receiveShadow = true;
      group.add(petal);
    }
  } else if (shapeType === 'babysbreath') {
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x5d7c53, roughness: 0.7 });
    const count = 18;
    const floretGeo = new THREE.DodecahedronGeometry(0.055, 1);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = GOLDEN_ANGLE * i;
      const r = 0.22 + (i % 3) * 0.06;
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        Math.abs(r * Math.cos(phi)) * 0.85 + 0.06,
        r * Math.sin(phi) * Math.sin(theta)
      );

      const floret = new THREE.Mesh(floretGeo, i % 2 === 0 ? petalMatOuter : petalMatInner);
      floret.position.copy(pos);
      floret.castShadow = true;
      group.add(floret);

      const len = pos.length();
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, len, 5), branchMat);
      twig.position.copy(pos).multiplyScalar(0.5);
      twig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      group.add(twig);
    }
  } else if (shapeType === 'eucalyptus') {
    const leafMat = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: 0.55,
      metalness: 0.04,
      clearcoat: 0.1,
      sheen: 0.4,
      sheenColor: new THREE.Color('#DCE8D5'),
      emissive: new THREE.Color(0x000000),
      side: THREE.DoubleSide,
    });
    highlightableMaterials.push(leafMat);

    const branchSpine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.02, 0.68, 8),
      calyxMat
    );
    branchSpine.position.y = 0.22;
    group.add(branchSpine);

    const leafGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.014, 16);
    for (let i = 0; i < 7; i++) {
      const h = -0.02 + i * 0.085;
      const scale = 1 - i * 0.08;
      const side = i % 2 === 0 ? 1 : -1;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(scale * 0.95, 1, scale * 1.2);
      leaf.position.set(side * 0.085 * scale, h, ((i % 3) - 1) * 0.02);
      leaf.rotation.z = side * 0.65;
      leaf.rotation.y = i * 0.4;
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  if (shapeType !== 'eucalyptus' && shapeType !== 'babysbreath') {
    const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 7), calyxMat);
    calyx.rotation.x = Math.PI;
    calyx.position.y = -0.04;
    group.add(calyx);
  }

  group.userData.highlightableMaterials = highlightableMaterials;
  group.userData.baseColor = baseColor;
  return group;
}

export const BouquetCanvas3D = forwardRef<BouquetCanvas3DRef, BouquetCanvas3DProps>(
  (
    {
      components,
      wrappingColor,
      ribbonColor,
      selectedSlotId,
      hoveredSlotId,
      onSelectSlot,
      onHoverSlot,
      cameraPreset,
      onCameraPresetChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const bouquetGroupRef = useRef<THREE.Group | null>(null);
    const interactiveAnchorsRef = useRef<THREE.Group[]>([]);
    const isTransitioningCameraRef = useRef<boolean>(false);

    const onSelectSlotRef = useRef(onSelectSlot);
    onSelectSlotRef.current = onSelectSlot;
    const onHoverSlotRef = useRef(onHoverSlot);
    onHoverSlotRef.current = onHoverSlot;

    const activeHighlightSlotRef = useRef<string | null>(hoveredSlotId || selectedSlotId);
    useEffect(() => {
      activeHighlightSlotRef.current = hoveredSlotId || selectedSlotId;
    }, [hoveredSlotId, selectedSlotId]);

    const [hoveredInfo, setHoveredInfo] = useState<HoveredFlowerInfo | null>(null);

    const applyCameraPresetTarget = (preset: CameraViewPreset) => {
      if (preset === 'front') {
        // Elevated editorial front-angle so the entire flower dome and stems are clearly visible
        _targetCamPos.set(0, 2.35, 5.4);
        _targetLookAt.set(0, 0.72, 0);
      } else if (preset === 'top') {
        _targetCamPos.set(0, 6.0, 0.9);
        _targetLookAt.set(0, 0.85, 0);
      } else if (preset === 'side') {
        _targetCamPos.set(5.2, 2.1, 2.1);
        _targetLookAt.set(0, 0.72, 0);
      }
      isTransitioningCameraRef.current = true;
    };

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!renderer || !scene || !camera) return '';

        // Clear active highlight and hide all pink halo rings & highlight effects before snapshot
        activeHighlightSlotRef.current = null;
        for (let i = 0; i < interactiveAnchorsRef.current.length; i++) {
          const anchor = interactiveAnchorsRef.current[i];
          const baseScale = anchor.userData.baseScale || 1.0;
          const headGroup = anchor.children[0] as THREE.Group | undefined;
          if (headGroup) {
            headGroup.scale.setScalar(baseScale);
            const mats: THREE.MeshStandardMaterial[] =
              headGroup.userData.highlightableMaterials || [];
            mats.forEach((m) => {
              m.emissiveIntensity = 0.0;
            });
          }
          const haloRing = anchor.children[1];
          if (haloRing) {
            haloRing.visible = false;
          }
        }

        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      },
      setCameraView: (preset: CameraViewPreset) => {
        applyCameraPresetTarget(preset);
        onCameraPresetChange(preset);
      },
    }));

    useEffect(() => {
      applyCameraPresetTarget(cameraPreset);
    }, [cameraPreset]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      const scene = new THREE.Scene();
      scene.background = createStudioBackdropTexture();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
      camera.position.set(0, 2.35, 5.4);
      cameraRef.current = camera;

      const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.96;
      renderer.shadowMap.enabled = !isHeadless;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();

      const hemiLight = new THREE.HemisphereLight(0xfffaf0, 0x9b8e7e, 0.72);
      hemiLight.position.set(0, 10, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.45);
      keyLight.position.set(3.8, 7.2, 5.5);
      keyLight.castShadow = !isHeadless;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 20;
      const d = 3.5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xffeef8, 0.65);
      rimLight.position.set(-4.5, 4.5, -4.0);
      scene.add(rimLight);

      const shadowTex = createContactShadowTexture();
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 4.2),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.8,
        })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -1.62;
      scene.add(shadowPlane);

      const plinthGeo = new THREE.CylinderGeometry(1.55, 1.65, 0.14, 48);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0xb7a893,
        roughness: 0.7,
        metalness: 0.05,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = -1.7;
      plinth.receiveShadow = true;
      scene.add(plinth);

      const bouquetGroup = new THREE.Group();
      scene.add(bouquetGroup);
      bouquetGroupRef.current = bouquetGroup;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 0.72, 0);
      controls.minDistance = 2.8;
      controls.maxDistance = 10.5;
      controls.maxPolarAngle = Math.PI * 0.58;
      // Keep front showcase angle stable by default; gently sway instead of full 360 spin hiding the front
      controls.autoRotate = false;
      controlsRef.current = controls;

      const stopTransitionOnUserInteract = () => {
        isTransitioningCameraRef.current = false;
      };
      controls.addEventListener('start', stopTransitionOnUserInteract);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let lastHoverTime = 0;

      const findSlotData = (obj: THREE.Object3D | null): any => {
        let curr: THREE.Object3D | null = obj;
        while (curr) {
          if (curr.userData && curr.userData.slotId) {
            return curr.userData;
          }
          curr = curr.parent;
        }
        return null;
      };

      const handlePointerMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastHoverTime < 35) return;
        lastHoverTime = now;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactiveAnchorsRef.current, true);
        if (hits.length > 0) {
          const data = findSlotData(hits[0].object);
          if (data) {
            renderer.domElement.style.cursor = 'pointer';
            onHoverSlotRef.current(data.slotId);
            setHoveredInfo({
              slotId: data.slotId,
              nameKo: data.nameKo,
              flowerMeaning: data.flowerMeaning,
              colorHex: data.colorHex,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
            return;
          }
        }
        renderer.domElement.style.cursor = 'grab';
        onHoverSlotRef.current(null);
        setHoveredInfo(null);
      };

      let pointerDownPos = { x: 0, y: 0 };
      const handlePointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        if (Math.hypot(dx, dy) > 6) return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactiveAnchorsRef.current, true);
        if (hits.length > 0) {
          const data = findSlotData(hits[0].object);
          if (data && data.slotId) {
            onSelectSlotRef.current(data.slotId);
          }
        }
      };

      const handlePointerLeave = () => {
        onHoverSlotRef.current(null);
        setHoveredInfo(null);
      };

      const domElem = renderer.domElement;
      domElem.addEventListener('pointermove', handlePointerMove);
      domElem.addEventListener('pointerdown', handlePointerDown);
      domElem.addEventListener('pointerup', handlePointerUp);
      domElem.addEventListener('pointerleave', handlePointerLeave);

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          if (w > 0 && h > 0) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          }
        }
      });
      resizeObserver.observe(container);

      let lastTime = performance.now();
      let animId = 0;

      const animate = (now: number) => {
        animId = requestAnimationFrame(animate);
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        const elapsed = now / 1000;

        if (isTransitioningCameraRef.current) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5.5, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5.5, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5.5, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5.5, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5.5, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5.5, delta);

          if (camera.position.distanceTo(_targetCamPos) < 0.03) {
            isTransitioningCameraRef.current = false;
          }
        }

        const activeSlot = activeHighlightSlotRef.current;
        for (let i = 0; i < interactiveAnchorsRef.current.length; i++) {
          const anchor = interactiveAnchorsRef.current[i];
          const isHighlighted = anchor.userData.slotId === activeSlot;
          const baseScale = anchor.userData.baseScale || 1.0;
          const targetScale = isHighlighted ? baseScale * 1.16 : baseScale;

          const headGroup = anchor.children[0] as THREE.Group | undefined;
          if (headGroup) {
            const nextScale = THREE.MathUtils.damp(headGroup.scale.x, targetScale, 9.0, delta);
            headGroup.scale.setScalar(nextScale);

            const mats: THREE.MeshStandardMaterial[] =
              headGroup.userData.highlightableMaterials || [];
            const baseCol: THREE.Color | undefined = headGroup.userData.baseColor;
            if (baseCol) {
              const targetEmissiveIntensity = isHighlighted ? 0.28 : 0.0;
              mats.forEach((m) => {
                m.emissive.copy(baseCol);
                m.emissiveIntensity = THREE.MathUtils.damp(
                  m.emissiveIntensity,
                  targetEmissiveIntensity,
                  9.0,
                  delta
                );
              });
            }
          }

          const haloRing = anchor.children[1];
          if (haloRing) {
            haloRing.visible = isHighlighted;
          }
        }

        if (bouquetGroupRef.current) {
          bouquetGroupRef.current.position.y = Math.sin(elapsed * 1.4) * 0.02;
          // Subtle editorial breathing rotation so front flowers stay facing forward
          bouquetGroupRef.current.rotation.y = Math.sin(elapsed * 0.55) * 0.14;
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        domElem.removeEventListener('pointermove', handlePointerMove);
        domElem.removeEventListener('pointerdown', handlePointerDown);
        domElem.removeEventListener('pointerup', handlePointerUp);
        domElem.removeEventListener('pointerleave', handlePointerLeave);
        controls.dispose();
        renderer.dispose();
      };
    }, []);

    // Rebuild 3D Bouquet Geometry using Korean Florist Front-Facing Hand-tied Design
    useEffect(() => {
      const bouquetGroup = bouquetGroupRef.current;
      if (!bouquetGroup) return;

      while (bouquetGroup.children.length > 0) {
        const child = bouquetGroup.children[0];
        bouquetGroup.remove(child);
      }
      interactiveAnchorsRef.current = [];

      const stemMat = new THREE.MeshStandardMaterial({
        color: 0x45633d,
        roughness: 0.72,
      });

      const wrapGroup = new THREE.Group();

      const outerWrapMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(wrappingColor || '#E7DBC1'),
        roughness: 0.76,
        metalness: 0.02,
        clearcoat: 0.06,
        side: THREE.DoubleSide,
      });

      const innerTissueMat = new THREE.MeshStandardMaterial({
        color: 0xf7f4eb,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });

      // Sculpted Korean wrapping cone: high in the back (-Z) to frame the bouquet, scooped low in front (+Z) so all flowers show!
      const upperConeGeo = new THREE.CylinderGeometry(1.42, 0.34, 1.55, 48, 12, true);
      const posAttr = upperConeGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        const angle = Math.atan2(z, x); // +Z is front (angle ~ PI/2)
        const normalizedY = (y + 0.775) / 1.55; // 0 at bottom, 1 at top

        if (normalizedY > 0.15) {
          // Front factor: 1 at front (+Z), 0 at back (-Z)
          const frontFactor = Math.max(0, Math.sin(angle));
          const backFactor = Math.max(0, -Math.sin(angle));

          const pleat = Math.sin(angle * 7) * 0.06 + Math.cos(angle * 4) * 0.05;
          // Flare out slightly in front while dipping low so flowers aren't blocked
          const frontFlare = 1 + pleat + frontFactor * 0.12 * normalizedY;
          posAttr.setX(i, x * frontFlare);
          posAttr.setZ(i, z * frontFlare);

          // Lower the front collar by up to 0.72 units, raise the back backdrop by 0.28 units
          const yOffset =
            -frontFactor * 0.72 * Math.pow(normalizedY, 1.2) +
            backFactor * 0.28 * normalizedY +
            Math.sin(angle * 5) * 0.06 * normalizedY;
          posAttr.setY(i, y + yOffset);
        }
      }
      upperConeGeo.computeVertexNormals();
      const upperWrap = new THREE.Mesh(upperConeGeo, outerWrapMat);
      upperWrap.position.y = 0.22;
      upperWrap.castShadow = true;
      upperWrap.receiveShadow = true;
      wrapGroup.add(upperWrap);

      // Back layered paper wings (placed behind the flowers on the -Z side)
      for (let w = 0; w < 3; w++) {
        const wingGeo = new THREE.CylinderGeometry(
          1.35 + w * 0.06,
          0.32,
          1.78 + w * 0.1,
          28,
          1,
          true,
          Math.PI * 0.65 + (w - 1) * 0.35,
          Math.PI * 0.7
        );
        const wing = new THREE.Mesh(wingGeo, w === 1 ? innerTissueMat : outerWrapMat);
        wing.position.set(0, 0.38 + w * 0.05, -0.06 * w);
        wing.rotation.x = -0.08;
        wrapGroup.add(wing);
      }

      // Soft inner tissue paper (also scooped in front)
      const tissueGeo = new THREE.CylinderGeometry(1.22, 0.32, 1.35, 36, 8, true);
      const tPos = tissueGeo.attributes.position;
      for (let i = 0; i < tPos.count; i++) {
        const y = tPos.getY(i);
        const x = tPos.getX(i);
        const z = tPos.getZ(i);
        const angle = Math.atan2(z, x);
        const normY = (y + 0.675) / 1.35;
        if (normY > 0.2) {
          const frontFactor = Math.max(0, Math.sin(angle));
          tPos.setY(i, y - frontFactor * 0.58 * normY);
        }
      }
      tissueGeo.computeVertexNormals();
      const tissueMesh = new THREE.Mesh(tissueGeo, innerTissueMat);
      tissueMesh.position.y = 0.22;
      wrapGroup.add(tissueMesh);

      const lowerSkirtGeo = new THREE.CylinderGeometry(0.33, 0.56, 1.05, 24, 1, true);
      const lowerSkirt = new THREE.Mesh(lowerSkirtGeo, outerWrapMat);
      lowerSkirt.position.y = -1.02;
      lowerSkirt.castShadow = true;
      wrapGroup.add(lowerSkirt);

      const ribbonMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(ribbonColor || '#BF6C8B'),
        roughness: 0.32,
        metalness: 0.08,
        clearcoat: 0.35,
        sheen: 0.8,
        side: THREE.DoubleSide,
      });

      const waistBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.355, 0.355, 0.16, 28),
        ribbonMat
      );
      waistBand.position.y = -0.52;
      wrapGroup.add(waistBand);

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), ribbonMat);
      knot.scale.set(1.2, 0.9, 0.8);
      knot.position.set(0, -0.52, 0.35);
      wrapGroup.add(knot);

      [-1, 1].forEach((dir) => {
        const loopGeo = new THREE.TorusGeometry(0.16, 0.048, 12, 24);
        const loop = new THREE.Mesh(loopGeo, ribbonMat);
        loop.scale.set(1.35, 0.75, 0.6);
        loop.position.set(dir * 0.2, -0.5, 0.36);
        loop.rotation.z = dir * -0.22;
        loop.rotation.y = dir * 0.28;
        wrapGroup.add(loop);

        const tailGeo = new THREE.BoxGeometry(0.09, 0.68, 0.015);
        const tail = new THREE.Mesh(tailGeo, ribbonMat);
        tail.position.set(dir * 0.14, -0.84, 0.41);
        tail.rotation.z = dir * 0.24;
        tail.rotation.x = -0.15;
        wrapGroup.add(tail);
      });

      bouquetGroup.add(wrapGroup);

      const bindingPoint = new THREE.Vector3(0, -0.52, 0);

      // Collect all stems and distribute them in a front-facing tiered florist dome
      let mainIdx = 0;
      let subIdx = 0;
      let fillerIdx = 0;
      let greenIdx = 0;

      components.forEach((slot) => {
        const count = Math.max(1, Math.min(15, slot.stemCount || 3));
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0.5 : i / (count - 1);
          let x = 0;
          let y = 1.2;
          let z = 0;
          let forwardPitch = 0.42;
          let sideYaw = 0;

          if (slot.role === 'MAIN') {
            // Front-center focal zone: clearly visible in front view, tiered height
            const spreadAngle = count === 1 ? 0 : (t - 0.5) * Math.PI * 0.75;
            const ringR = count === 1 ? 0.08 : 0.22 + (i % 2) * 0.18;
            x = Math.sin(spreadAngle) * (ringR + 0.18);
            z = 0.22 + Math.cos(spreadAngle) * ringR * 0.85 - (i % 2) * 0.12;
            y = 1.22 + (1 - z) * 0.18 + (i % 2) * 0.08;
            forwardPitch = 0.48 + Math.max(0, z) * 0.25;
            sideYaw = x * 0.45;
            mainIdx++;
          } else if (slot.role === 'SUB') {
            // Middle arch framing the main flowers
            const angle = ((subIdx + 0.5) / Math.max(count, 1)) * Math.PI * 1.15 - Math.PI * 0.575;
            const r = 0.52 + (subIdx % 2) * 0.14;
            x = Math.sin(angle) * r;
            z = Math.cos(angle) * r * 0.75 + 0.05;
            y = 1.18 + (0.35 - z) * 0.28 + (subIdx % 2) * 0.07;
            forwardPitch = 0.45 + Math.max(0, z) * 0.22;
            sideYaw = x * 0.52;
            subIdx++;
          } else if (slot.role === 'FILLER') {
            // Airy filler popping up between and above main/sub flowers
            const angle = fillerIdx * GOLDEN_ANGLE;
            const r = 0.32 + (fillerIdx % 3) * 0.22;
            x = Math.sin(angle) * r;
            z = Math.cos(angle) * r * 0.7;
            y = 1.34 + (0.3 - z) * 0.22 + (fillerIdx % 2) * 0.09;
            forwardPitch = 0.35 + Math.max(0, z) * 0.2;
            sideYaw = x * 0.45;
            fillerIdx++;
          } else {
            // GREENERY: Back & side crown arch framing the silhouette
            const angle = ((greenIdx + 0.5) / Math.max(count, 1)) * Math.PI * 1.3 - Math.PI * 0.65;
            const r = 0.78 + (greenIdx % 2) * 0.12;
            x = Math.sin(angle) * r;
            z = -Math.abs(Math.cos(angle)) * 0.38 + 0.05;
            y = 1.38 + (greenIdx % 2) * 0.12 - Math.abs(x) * 0.12;
            forwardPitch = 0.28;
            sideYaw = x * 0.6;
            greenIdx++;
          }

          const flowerAnchor = new THREE.Group();
          flowerAnchor.position.set(x, y, z);

          // Orient flower face toward the front viewer (+Z and +Y) so petals & centers show clearly
          const headUpVec = new THREE.Vector3(
            Math.sin(sideYaw) * 0.55,
            Math.cos(forwardPitch),
            Math.sin(forwardPitch)
          ).normalize();

          flowerAnchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), headUpVec);

          const headMesh = buildProceduralFlowerHead(slot.shapeType, slot.colorHex);
          const roleScale =
            slot.role === 'MAIN'
              ? 1.24
              : slot.role === 'SUB'
              ? 1.02
              : slot.role === 'FILLER'
              ? 0.92
              : 1.08;
          headMesh.scale.setScalar(roleScale);
          flowerAnchor.add(headMesh);

          const ringGeo = new THREE.RingGeometry(0.26, 0.31, 24);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xbf6c8b,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.14;
          ring.visible = false;
          flowerAnchor.add(ring);

          const topPoint = new THREE.Vector3(x, y, z);
          const stemBindPos = bindingPoint
            .clone()
            .add(new THREE.Vector3(x * 0.08, 0, z * 0.08));
          const stemDir = topPoint.clone().sub(stemBindPos).normalize();
          const bottomPoint = stemBindPos.clone().sub(stemDir.clone().multiplyScalar(0.88));
          const fullStemVec = topPoint.clone().sub(bottomPoint);
          const stemLen = fullStemVec.length();

          const stemMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.026, stemLen, 8),
            stemMat
          );
          stemMesh.position.copy(bottomPoint).add(fullStemVec.multiplyScalar(0.5));
          stemMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemDir);
          stemMesh.castShadow = true;
          bouquetGroup.add(stemMesh);

          const meta = {
            slotId: slot.slotId,
            nameKo: slot.nameKo,
            flowerMeaning: slot.flowerMeaning,
            colorHex: slot.colorHex,
            baseScale: roleScale,
          };
          flowerAnchor.userData = meta;
          flowerAnchor.traverse((c) => {
            if (c !== headMesh) {
              c.userData = meta;
            }
          });
          headMesh.userData = {
            ...headMesh.userData,
            ...meta,
          };

          bouquetGroup.add(flowerAnchor);
          interactiveAnchorsRef.current.push(flowerAnchor);
        }
      });
    }, [components, wrappingColor, ribbonColor]);

    return (
      <div className="relative w-full h-full select-none overflow-hidden bg-[#CFC3B0]">
        <div ref={containerRef} className="w-full h-full" />

        {/* Minimal Camera Angle Switcher */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#F5F4ED]/95 border border-[#2D2A26]/15 rounded-full px-2 py-1 shadow-md">
          {(
            [
              { id: 'front', label: '정면 뷰' },
              { id: 'top', label: '항공샷' },
              { id: 'side', label: '측면 뷰' },
            ] as const
          ).map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => onCameraPresetChange(view.id)}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 ${
                cameraPreset === view.id
                  ? 'bg-[#2D2A26] text-white'
                  : 'text-[#2D2A26]/75 hover:text-[#2D2A26]'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* Minimal 1-Line Hover Tooltip */}
        {hoveredInfo && (
          <div
            className="pointer-events-none absolute z-20 bg-[#F5F4ED] border border-[#BF6C8B]/40 rounded-lg px-3 py-2 shadow-md flex items-center gap-2 whitespace-nowrap"
            style={{
              left: Math.min(Math.max(hoveredInfo.x + 12, 16), 500),
              top: Math.max(hoveredInfo.y - 48, 16),
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
              style={{ backgroundColor: hoveredInfo.colorHex }}
            />
            <span className="text-xs font-bold text-[#2D2A26]">{hoveredInfo.nameKo}</span>
            <span className="text-xs text-[#BF6C8B] font-medium">
              · “{hoveredInfo.flowerMeaning}”
            </span>
          </div>
        )}
      </div>
    );
  }
);

