"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface IslandSceneProps {
  projectIcons?: string[]; // optional icon URLs to show on portal rings
}

export default function IslandScene({ projectIcons = [] }: IslandSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010608);
    scene.fog = new THREE.FogExp2(0x010608, 0.018);

    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 800);

    // ── Lights ────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a2a4a, 1.2));
    const moonLight = new THREE.DirectionalLight(0xb0ccee, 2.0);
    moonLight.position.set(-60, 120, -80);
    moonLight.castShadow = true;
    scene.add(moonLight);

    // ── Stars ─────────────────────────────────────────────────
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 350 + Math.random() * 50;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 })));

    // ── Moon ──────────────────────────────────────────────────
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(14, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xf0e8d0 })
    );
    moon.position.set(-80, 150, -200);
    scene.add(moon);

    // ── Island terrain ────────────────────────────────────────
    const islandBase = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 22, 6, 32),
      new THREE.MeshLambertMaterial({ color: 0xc8a96e })
    );
    islandBase.position.y = -3;
    islandBase.castShadow = true;
    islandBase.receiveShadow = true;
    scene.add(islandBase);

    const islandTop = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 18, 2.5, 32),
      new THREE.MeshLambertMaterial({ color: 0x4a7a3a })
    );
    islandTop.position.y = 1.25;
    islandTop.receiveShadow = true;
    scene.add(islandTop);

    // Trees
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3310 });
    const treePositions = [
      { x: 11, z: 5, h: 7 }, { x: -10, z: 8, h: 8 }, { x: 8, z: -10, h: 6 },
      { x: -13, z: -4, h: 9 }, { x: 5, z: 12, h: 7 }, { x: -6, z: -12, h: 8 },
    ];
    treePositions.forEach(({ x, z, h }) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 6), trunkMat);
      trunk.position.set(x, 2.5, z);
      scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.2, h * 0.8, 8), treeMat);
      leaves.position.set(x, 2.5 + 1 + h * 0.4, z);
      scene.add(leaves);
    });

    // ── Campfire ──────────────────────────────────────────────
    const campfire = new THREE.Group();
    campfire.position.set(0, 2.5, 0);

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), stoneMat);
      stone.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2);
      campfire.add(stone);
    }
    const logMat = new THREE.MeshLambertMaterial({ color: 0x4a2a0e });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.4, 6), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 4) * Math.PI;
      campfire.add(log);
    }

    const fireCount = 100;
    const firePos = new Float32Array(fireCount * 3);
    for (let i = 0; i < fireCount; i++) {
      firePos[i * 3]     = (Math.random() - 0.5) * 1.4;
      firePos[i * 3 + 1] = Math.random() * 3.5;
      firePos[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute("position", new THREE.BufferAttribute(firePos, 3));
    const firePts = new THREE.Points(fireGeo, new THREE.PointsMaterial({
      color: 0xff6600, size: 0.28, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    firePts.name = "fire";
    campfire.add(firePts);

    const fireLight = new THREE.PointLight(0xff6600, 4, 40);
    fireLight.position.y = 2.5;
    fireLight.name = "fireLight";
    campfire.add(fireLight);

    scene.add(campfire);

    // ── Portal rings (one per project icon) ───────────────────
    const rings: THREE.Group[] = [];
    const iconCount = Math.max(projectIcons.length, 3);
    const loader = new THREE.TextureLoader();

    for (let i = 0; i < iconCount; i++) {
      const angle = (i / iconCount) * Math.PI * 2;
      const radius = 6;
      const ringGroup = new THREE.Group();
      ringGroup.position.set(
        Math.cos(angle) * radius,
        8,
        Math.sin(angle) * radius
      );
      ringGroup.lookAt(0, 8, 0);

      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.18, 16, 48),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc })
      );
      ringGroup.add(ringMesh);

      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc, transparent: true, opacity: 0.25,
        side: THREE.DoubleSide,
      });
      glowMat.name = "glowMat";
      ringGroup.add(new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.3, 16, 48), glowMat));

      // Icon plane inside ring
      if (projectIcons[i]) {
        loader.load(projectIcons[i], (tex) => {
          const iconMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2.2, 2.2),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
          );
          ringGroup.add(iconMesh);
        });
      } else {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, opacity: 0.6, transparent: true })
        );
        ringGroup.add(sphere);
      }

      rings.push(ringGroup);
      scene.add(ringGroup);
    }

    // ── Camera orbit state ────────────────────────────────────
    const ORBIT_RADIUS = 18;
    const ORBIT_Y = 9;
    let azimuth = 0;      // horizontal angle
    let elevation = 0.45; // vertical angle (radians above equator)
    let autoRotate = true;
    let dragActive = false;
    let lastPointer = { x: 0, y: 0 };
    let autoResumeTimer: ReturnType<typeof setTimeout> | null = null;

    const updateCamera = () => {
      camera.position.set(
        Math.cos(azimuth) * ORBIT_RADIUS,
        ORBIT_Y + Math.sin(elevation) * 6,
        Math.sin(azimuth) * ORBIT_RADIUS
      );
      camera.lookAt(0, 3, 0);
    };
    updateCamera();

    // Pointer drag
    const onPointerDown = (e: PointerEvent) => {
      dragActive = true;
      autoRotate = false;
      lastPointer = { x: e.clientX, y: e.clientY };
      if (autoResumeTimer) clearTimeout(autoResumeTimer);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragActive) return;
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      azimuth  -= dx * 0.008;
      elevation = Math.max(-0.3, Math.min(1.0, elevation + dy * 0.006));
      lastPointer = { x: e.clientX, y: e.clientY };
      updateCamera();
    };
    const onPointerUp = () => {
      dragActive = false;
      if (autoResumeTimer) clearTimeout(autoResumeTimer);
      autoResumeTimer = setTimeout(() => { autoRotate = true; }, 3000);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Resize
    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ────────────────────────────────────────
    let frameId = 0;
    let t = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.016;

      // Auto-orbit
      if (autoRotate) {
        azimuth += 0.003;
        updateCamera();
      }

      // Animate fire particles
      const pos = (firePts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < fireCount; i++) {
        pos[i * 3 + 1] += 0.04 + Math.random() * 0.04;
        if (pos[i * 3 + 1] > 3.5) {
          pos[i * 3]     = (Math.random() - 0.5) * 1.4;
          pos[i * 3 + 1] = 0;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
        }
      }
      firePts.geometry.attributes.position.needsUpdate = true;

      // Flicker fire light
      fireLight.intensity = 3.5 + Math.sin(t * 7.3) * 0.8 + Math.sin(t * 13.1) * 0.4;

      // Animate rings — float + spin
      rings.forEach((ring, i) => {
        ring.position.y = 8 + Math.sin(t * 0.9 + i * 1.4) * 0.5;
        ring.rotation.y = t * 0.4 + (i / rings.length) * Math.PI * 2;
        const gm = ring.children[1] as THREE.Mesh;
        if (gm?.material) {
          (gm.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 1.2 + i) * 0.1;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (autoResumeTimer) clearTimeout(autoResumeTimer);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [projectIcons]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ touchAction: "none", cursor: "grab", zIndex: 0 }}
    />
  );
}
