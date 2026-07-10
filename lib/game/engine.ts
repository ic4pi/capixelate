import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  waterVertexShader,
  waterFragmentShader,
  glowFragmentShader,
  glowVertexShader,
  skyVertexShader,
  skyFragmentShader,
} from "./shaders";
import type {
  GameState,
  InputState,
  EnemyState,
  IslandState,
  ProjectileState,
} from "./types";

export class GameEngine {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  clock!: THREE.Clock;
  gameState!: GameState;
  inputState!: InputState;
  playerShip!: THREE.Group;
  water!: THREE.Mesh;
  waterMaterial!: THREE.ShaderMaterial;
  skyMesh!: THREE.Mesh;
  canvas: HTMLCanvasElement;
  animationId: number = 0;
  onStateUpdate?: (state: Partial<GameState>) => void;
  onIslandProximity?: (island: IslandState) => void;
  enemies: Map<string, { group: THREE.Group; state: EnemyState }> = new Map();
  projectileMeshes: Map<string, THREE.Mesh> = new Map();
  stars!: THREE.Points;
  moonLight!: THREE.DirectionalLight;
  islands: Map<string, { group: THREE.Group; state: IslandState }> = new Map();
  campfires: Map<string, { particles: THREE.Points; time: number }> = new Map();
  cannonBalls: THREE.Mesh[] = [];
  explosionParticles: THREE.Points[] = [];
  foggyTiles: Set<string> = new Set();
  windIndicator?: THREE.ArrowHelper;
  private frameCount = 0;
  private gltfLoader = new GLTFLoader();

  // 0 = close deck view  |  1 = full crow's nest view
  // Controlled by scroll wheel, smoothly interpolated each frame
  private zoomTarget = 0;
  private zoomLevel = 0;
  private _onWheel?: (e: WheelEvent) => void;

  // Island proximity view state
  private _nearIsland = false;
  private _nearIslandPos: THREE.Vector3 | null = null;

  // 0 = deck/crow's-nest (scroll changes height)
  // 1 = hover/cinematic follow cam (scroll changes distance back, always level)
  private cameraMode = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  private loadGLB(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }

  async init(
    islandsData: IslandState[],
    enemiesData: EnemyState[],
    playerShipModelUrl?: string
  ) {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initSky();
    this.initStars();
    this.initWater();
    this.initPlayerShip(playerShipModelUrl);
    this.initGameState(islandsData, enemiesData);
    this.initInputHandlers();
    islandsData.forEach((isl) => this.spawnIsland(isl));
    enemiesData.forEach((en) => this.spawnEnemy(en));
    this.animate();
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.clock = new THREE.Clock();
  }

  // Moon world position — closer, higher, more prominent harvest moon
  private moonWorldPos = new THREE.Vector3(-120, 220, -450);

  private initScene() {
    this.scene = new THREE.Scene();
    // Low fog density — islands visible from 200+ units, harvest moon glows through
    this.scene.fog = new THREE.FogExp2(0x060e1a, 0.0008);
  }

  private initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      2000
    );
    // Deck view: mid-ship, above deck, looking toward the bow and sea ahead
    this.camera.position.set(0, 5, 5);
    this.camera.lookAt(0, 4, -30);
  }

  private initLights() {
    // Bright ambient for harvest-moon night — warm orange-tinted sky
    const ambientLight = new THREE.AmbientLight(0x3a4060, 1.8);
    this.scene.add(ambientLight);

    // Main moonlight — strong, warm harvest-moon directional light
    this.moonLight = new THREE.DirectionalLight(0xffd4a0, 5.0);
    this.moonLight.position.copy(this.moonWorldPos);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 1500;
    this.moonLight.shadow.camera.left = -400;
    this.moonLight.shadow.camera.right = 400;
    this.moonLight.shadow.camera.top = 400;
    this.moonLight.shadow.camera.bottom = -400;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.scene.add(this.moonLight);

    // Warm fill light from opposite horizon
    const fillLight = new THREE.PointLight(0x5566aa, 1.2, 1000);
    fillLight.position.set(200, 80, 200);
    this.scene.add(fillLight);

    // Hemisphere: warm sky above, deep ocean below — lifts all shadows
    const skyFill = new THREE.HemisphereLight(0x3355bb, 0x0a1a2a, 0.9);
    this.scene.add(skyFill);
  }

  private initSky() {
    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x010a1a) },
        uBottomColor: { value: new THREE.Color(0x061828) },
        uOffset: { value: 33 },
        uExponent: { value: 0.6 },
      },
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    // Large full harvest moon — warm orange/golden sphere
    const moonGeo = new THREE.SphereGeometry(38, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xff9944 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.copy(this.moonWorldPos);
    this.scene.add(moon);

    // Halo ring 1 — inner warm orange glow
    const halo1Mat = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new THREE.Color(0xff8833) },
        uIntensity: { value: 1.0 },
        uTime: { value: 0 },
      },
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo1 = new THREE.Mesh(new THREE.SphereGeometry(52, 20, 20), halo1Mat);
    halo1.position.copy(this.moonWorldPos);
    this.scene.add(halo1);

    // Halo ring 2 — wider amber atmospheric corona
    const halo2Mat = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new THREE.Color(0xcc6622) },
        uIntensity: { value: 0.55 },
        uTime: { value: 0 },
      },
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo2 = new THREE.Mesh(new THREE.SphereGeometry(78, 20, 20), halo2Mat);
    halo2.position.copy(this.moonWorldPos);
    this.scene.add(halo2);

    // Halo ring 3 — outermost faint warm scatter
    const halo3Mat = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new THREE.Color(0x994422) },
        uIntensity: { value: 0.28 },
        uTime: { value: 0 },
      },
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo3 = new THREE.Mesh(new THREE.SphereGeometry(110, 20, 20), halo3Mat);
    halo3.position.copy(this.moonWorldPos);
    this.scene.add(halo3);
  }

  private initStars() {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1) * 0.4;
      const r = 800 + Math.random() * 100;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 100;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() * 2 + 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private initWater() {
    const waterGeo = new THREE.PlaneGeometry(2000, 2000, 256, 256);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBigWavesElevation: { value: 0.22 },
        uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },
        uBigWavesSpeed: { value: 0.75 },
        uSmallWavesElevation: { value: 0.12 },
        uSmallWavesFrequency: { value: 3 },
        uSmallWavesSpeed: { value: 0.2 },
        uSmallWavesIterations: { value: 4 },
        uDepthColor: { value: new THREE.Color(0x020c1a) },
        uSurfaceColor: { value: new THREE.Color(0x0a3a5c) },
        uColorOffset: { value: 0.1 },
        uColorMultiplier: { value: 4 },
        uFoamColor: { value: new THREE.Color(0x7ab0d0) },
        uFoamThreshold: { value: 0.15 },
        uMoonPosition: { value: this.moonWorldPos.clone() },
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      transparent: true,
    });
    this.water = new THREE.Mesh(waterGeo, this.waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.receiveShadow = true;
    this.scene.add(this.water);
  }

  private initPlayerShip(modelUrl?: string) {
    this.playerShip = new THREE.Group();

    // Hull
    const hullGeo = new THREE.CylinderGeometry(2.5, 3.5, 4, 8, 1, false);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
    const hull = new THREE.Mesh(hullGeo, woodMat);
    hull.position.y = 0.5;
    hull.castShadow = true;
    this.playerShip.add(hull);

    // Bow
    const bowGeo = new THREE.ConeGeometry(2.5, 3.5, 8);
    const bow = new THREE.Mesh(bowGeo, woodMat);
    bow.rotation.z = Math.PI / 2;
    bow.position.set(5, 0.8, 0);
    this.playerShip.add(bow);

    // Stern
    const sternGeo = new THREE.BoxGeometry(3, 3, 5);
    const stern = new THREE.Mesh(sternGeo, woodMat);
    stern.position.set(-4, 1.2, 0);
    this.playerShip.add(stern);

    // Deck
    const deckGeo = new THREE.BoxGeometry(14, 0.5, 5);
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x7d5a3c });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 2.5;
    deck.castShadow = true;
    this.playerShip.add(deck);

    // Main mast
    const mastGeo = new THREE.CylinderGeometry(0.2, 0.25, 14, 8);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(1, 9.5, 0);
    this.playerShip.add(mast);

    // Fore mast
    const foreMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 10, 8),
      mastMat
    );
    foreMast.position.set(5, 7.5, 0);
    this.playerShip.add(foreMast);

    // Sails
    const sailMat = new THREE.MeshLambertMaterial({
      color: 0xe8dcc8,
      side: THREE.DoubleSide,
    });
    const mainSailGeo = new THREE.PlaneGeometry(5, 8);
    const mainSail = new THREE.Mesh(mainSailGeo, sailMat);
    mainSail.position.set(1, 10, 0.1);
    mainSail.name = "mainSail";
    this.playerShip.add(mainSail);

    const foreSailGeo = new THREE.PlaneGeometry(4, 6);
    const foreSail = new THREE.Mesh(foreSailGeo, sailMat);
    foreSail.position.set(5, 8.5, 0.1);
    foreSail.name = "foreSail";
    this.playerShip.add(foreSail);

    // Skull flag
    const flagGeo = new THREE.PlaneGeometry(1.5, 1);
    const flagMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1, 17, 0.1);
    flag.name = "flag";
    this.playerShip.add(flag);

    // Cannons on sides (left side = z positive)
    for (let i = -1; i <= 1; i += 2) {
      for (let j = 0; j < 3; j++) {
        const cannonGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.8, 8);
        const cannonMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const cannon = new THREE.Mesh(cannonGeo, cannonMat);
        cannon.rotation.z = Math.PI / 2;
        cannon.position.set(-2 + j * 2, 2.5, i * 2.8);
        this.playerShip.add(cannon);
      }
    }

    // Lantern
    const lanternGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffcc55 });
    const lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
    lanternMesh.position.set(-7, 4, 0);
    this.playerShip.add(lanternMesh);
    const lanternLight = new THREE.PointLight(0xffaa33, 2, 25);
    lanternLight.position.copy(lanternMesh.position);
    this.playerShip.add(lanternLight);

    this.playerShip.position.set(0, 0.5, 180); // start in open water, islands are at -Z
    this.playerShip.rotation.y = Math.PI; // face toward islands at start
    this.scene.add(this.playerShip);

    // Initial camera: mid-ship deck, looking forward over the bow toward islands
    this.camera.position.set(0, 5, 5);
    this.camera.lookAt(0, 4, -30);

    if (modelUrl) {
      this.loadGLB(modelUrl)
        .then((model) => {
          // Replace all procedural children with the loaded GLB
          while (this.playerShip.children.length > 0) {
            this.playerShip.remove(this.playerShip.children[0]);
          }
          model.name = "customPlayerShip";
          this.playerShip.add(model);
        })
        .catch(() => {
          // Keep procedural geometry on failure
        });
    }
  }

  private initGameState(islands: IslandState[], enemies: EnemyState[]) {
    this.gameState = {
      playerHealth: 100,
      playerMaxHealth: 100,
      playerCannonBalls: 40,
      playerGold: 0,
      playerSpeed: 0,
      playerRotation: Math.PI,   // start facing toward islands (negative Z)
      playerPosition: { x: 0, z: 0 },
      windDirection: Math.PI * 0.25,
      windSpeed: 0.8,
      discoveredTiles: new Set(),
      enemies: enemies.map((e) => ({ ...e })),
      islands: islands,
      projectiles: [],
      lootMessages: [],
      gamePhase: "sailing",
      fogOfWar: new Map(),
    };

    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      fire: false,
      fireCooldown: 0,
      sailToIsland: false,
    };
  }

  private initInputHandlers() {
    const keyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.inputState.forward = true;
          break;
        case "ArrowDown":
        case "KeyS":
          this.inputState.backward = true;
          break;
        case "ArrowLeft":
        case "KeyA":
          this.inputState.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          this.inputState.right = true;
          break;
        case "Space":
          this.inputState.fire = true;
          e.preventDefault();
          break;
        case "KeyC":
          this.toggleCameraMode();
          break;
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.inputState.forward = false;
          break;
        case "ArrowDown":
        case "KeyS":
          this.inputState.backward = false;
          break;
        case "ArrowLeft":
        case "KeyA":
          this.inputState.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          this.inputState.right = false;
          break;
        case "Space":
          this.inputState.fire = false;
          break;
      }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    this._keyDown = keyDown;
    this._keyUp = keyUp;

    // Scroll wheel: zoom in/out along a crow's-nest arc
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Positive deltaY = scroll down = zoom out (climb toward crow's nest)
      this.zoomTarget = Math.max(0, Math.min(1, this.zoomTarget + e.deltaY * 0.0008));
    };
    this.canvas.addEventListener("wheel", onWheel, { passive: false });
    this._onWheel = onWheel;
  }

  private _keyDown?: (e: KeyboardEvent) => void;
  private _keyUp?: (e: KeyboardEvent) => void;

  private buildProceduralIslandTerrain(island: IslandState): THREE.Group {
    const terrain = new THREE.Group();
    terrain.name = "terrain";

    // Island body — significantly larger so there's room to explore and
    // the campfire / portal icons feel appropriately monumental
    const islandGeo = new THREE.CylinderGeometry(
      island.scale * 30,   // top radius  (was 18)
      island.scale * 38,   // bottom radius (was 22)
      island.scale * 10,   // height (was 6)
      16,
      3
    );
    const islandMat = new THREE.MeshLambertMaterial({ color: 0x3d6b1a });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.y = -1;
    islandMesh.castShadow = true;
    islandMesh.receiveShadow = true;
    terrain.add(islandMesh);

    // Wide sandy beach ring
    const beachGeo = new THREE.CylinderGeometry(
      island.scale * 38,   // top radius (was 22)
      island.scale * 44,   // bottom radius (was 24)
      island.scale * 2,    // height (was 1.5)
      16
    );
    const beachMat = new THREE.MeshLambertMaterial({ color: 0xd4b483 });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.y = -5;
    terrain.add(beach);

    // More trees spread further from center
    const treeCount = 12;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const r = island.scale * (16 + Math.random() * 10);
      const treeGroup = new THREE.Group();

      // Larger trunks for bigger island scale
      const trunkH = 5 + Math.random() * 3;
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, trunkH, 6);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      treeGroup.add(trunk);

      const leavesGeo = new THREE.ConeGeometry(3.5, 7, 6);
      const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2d7a1c });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = trunkH + 3;
      treeGroup.add(leaves);

      treeGroup.position.set(Math.cos(angle) * r, 4, Math.sin(angle) * r);
      treeGroup.rotation.y = Math.random() * Math.PI;
      terrain.add(treeGroup);
    }

    return terrain;
  }

  spawnIsland(island: IslandState) {
    const group = new THREE.Group();

    // Terrain (procedural, may be replaced by GLB)
    group.add(this.buildProceduralIslandTerrain(island));

    // Campfire sits on top of the taller island (terrain top at ~y=4)
    const campfireGroup = this.createCampfire(island.scale);
    campfireGroup.name = "campfire";
    campfireGroup.position.set(0, 4.5, 0);
    group.add(campfireGroup);

    // Project portal icon — higher above the bigger island terrain
    if (island.projectUrl || island.id) {
      const portalGroup = this.createPortalIcon(island);
      portalGroup.position.set(0, 16, 0);
      portalGroup.name = `portal_${island.id}`;
      group.add(portalGroup);
    }

    // Extra fill light positioned above the island to ensure it's always visible
    const islandFill = new THREE.PointLight(0xffc080, 2.0, 120);
    islandFill.position.set(0, 25, 0);
    group.add(islandFill);

    group.position.set(island.position.x, 0, island.position.z);
    this.scene.add(group);
    this.islands.set(island.id, { group, state: island });

    if (island.modelUrl) {
      this.loadGLB(island.modelUrl)
        .then((model) => {
          const existing = group.getObjectByName("terrain");
          if (existing) group.remove(existing);
          model.name = "terrain";
          model.scale.setScalar(island.scale);
          group.add(model);
        })
        .catch(() => {
          // Procedural terrain stays on failure
        });
    }
  }

  private createCampfire(scale: number) {
    const group = new THREE.Group();

    // Fire stones ring
    const stoneGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2);
      group.add(stone);
    }

    // Logs
    const logGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.5, 6);
    const logMat = new THREE.MeshLambertMaterial({ color: 0x4a2a0e });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 4) * Math.PI;
      group.add(log);
    }

    // Fire glow particles using Points
    const fireCount = 80;
    const firePositions = new Float32Array(fireCount * 3);
    for (let i = 0; i < fireCount; i++) {
      firePositions[i * 3] = (Math.random() - 0.5) * 1.2;
      firePositions[i * 3 + 1] = Math.random() * 3;
      firePositions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }
    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute("position", new THREE.BufferAttribute(firePositions, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.3,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const firePoints = new THREE.Points(fireGeo, fireMat);
    firePoints.name = "fireParticles";
    group.add(firePoints);

    // Fire light — bright, wide range to illuminate the whole island
    const fireLight = new THREE.PointLight(0xff6600, 6, 70);
    fireLight.position.y = 2;
    fireLight.name = "fireLight";
    group.add(fireLight);

    return group;
  }

  private createPortalIcon(island: IslandState) {
    const group = new THREE.Group();
    group.name = "portalIcon";

    // Glowing torus ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.25, 16, 48), ringMat);
    group.add(ring);

    // Outer glow ring (animated opacity)
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.3,
    });
    outerGlowMat.name = "outerGlowMat";
    const outerGlow = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.4, 16, 48), outerGlowMat);
    outerGlow.name = "outerGlowRing";
    group.add(outerGlow);

    // Icon — show project favicon/logo if available, otherwise default sphere
    if (island.projectIconUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        island.projectIconUrl,
        (texture) => {
          // Glow border quad — slightly larger, behind icon
          const borderMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const border = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), borderMat);
          border.name = "iconGlow";
          border.position.z = -0.08;
          group.add(border);

          // Extra outer soft glow
          const softGlowMat = new THREE.MeshBasicMaterial({
            color: 0x44ffdd,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const softGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), softGlowMat);
          softGlow.name = "iconSoftGlow";
          softGlow.position.z = -0.12;
          group.add(softGlow);

          // Icon plane
          const iconMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.05,
          });
          const icon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), iconMat);
          icon.name = "iconPlane";
          group.add(icon);
        },
        undefined,
        () => {
          // Fallback to default sphere if favicon fails to load
          const sphereMat = new THREE.MeshBasicMaterial({ color: 0x004488, transparent: true, opacity: 0.8 });
          group.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), sphereMat));
        }
      );
    } else {
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0x004488, transparent: true, opacity: 0.8 });
      group.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), sphereMat));
    }

    // Orbiting particles
    const orbitCount = 40;
    const orbitPos = new Float32Array(orbitCount * 3);
    for (let i = 0; i < orbitCount; i++) {
      const angle = (i / orbitCount) * Math.PI * 2;
      orbitPos[i * 3] = Math.cos(angle) * 3.5;
      orbitPos[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
      orbitPos[i * 3 + 2] = Math.sin(angle) * 3.5;
    }
    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPos, 3));
    const orbitMat = new THREE.PointsMaterial({
      color: 0x00ffcc,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orbit = new THREE.Points(orbitGeo, orbitMat);
    group.add(orbit);

    return group;
  }

  spawnEnemy(enemy: EnemyState) {
    const group = new THREE.Group();

    // Procedural body (named so it can be swapped by a GLB)
    const bodyGroup = new THREE.Group();
    bodyGroup.name = "body";

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b2222 });
    const hullGeo = new THREE.CylinderGeometry(1.8, 2.5, 3, 8);
    const hull = new THREE.Mesh(hullGeo, bodyMat);
    hull.position.y = 0.5;
    bodyGroup.add(hull);

    const deckGeo = new THREE.BoxGeometry(10, 0.4, 4);
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x6b3a2a });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 2.2;
    bodyGroup.add(deck);

    const mastGeo = new THREE.CylinderGeometry(0.15, 0.2, 10, 6);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x7a5c14 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 7, 0);
    bodyGroup.add(mast);

    const sailGeo = new THREE.PlaneGeometry(4, 6);
    const sailMat = new THREE.MeshLambertMaterial({
      color: 0xcc2222,
      side: THREE.DoubleSide,
    });
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, 8, 0.1);
    bodyGroup.add(sail);

    group.add(bodyGroup);

    // Health bar always stays above the group
    const healthBarGeo = new THREE.PlaneGeometry(4, 0.4);
    const healthBarMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const healthBar = new THREE.Mesh(healthBarGeo, healthBarMat);
    healthBar.position.set(0, 13, 0);
    healthBar.name = "healthBar";
    group.add(healthBar);

    group.position.set(enemy.position.x, 0.5, enemy.position.z);
    group.rotation.y = enemy.rotation;
    this.scene.add(group);
    this.enemies.set(enemy.id, { group, state: enemy });

    if (enemy.modelUrl) {
      this.loadGLB(enemy.modelUrl)
        .then((model) => {
          const existing = group.getObjectByName("body");
          if (existing) group.remove(existing);
          model.name = "body";
          group.add(model);
        })
        .catch(() => {
          // Procedural geometry stays on failure
        });
    }
  }

  fireCannonBall(fromPosition: THREE.Vector3, direction: THREE.Vector3, isPlayer: boolean) {
    if (isPlayer && this.gameState.playerCannonBalls <= 0) return;

    const ballGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const ballMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.copy(fromPosition);
    ball.userData = {
      velocity: direction.clone().multiplyScalar(80),
      isPlayer,
      lifetime: 3,
    };
    this.scene.add(ball);
    this.cannonBalls.push(ball);

    // Muzzle flash
    const flashLight = new THREE.PointLight(0xffaa00, 5, 15);
    flashLight.position.copy(fromPosition);
    this.scene.add(flashLight);
    setTimeout(() => this.scene.remove(flashLight), 120);

    if (isPlayer) this.gameState.playerCannonBalls--;
  }

  fireSailToIsland() {
    if (this.islands.size === 0) return;
    // Find closest island
    let closest: IslandState | null = null;
    let minDist = Infinity;
    this.islands.forEach(({ state }) => {
      const dx = state.position.x - this.playerShip.position.x;
      const dz = state.position.z - this.playerShip.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) {
        minDist = d;
        closest = state;
      }
    });
    if (closest) {
      const target = closest as IslandState;
      const dx = target.position.x - this.playerShip.position.x;
      const dz = target.position.z - this.playerShip.position.z;
      this.gameState.playerRotation = Math.atan2(dx, dz);
      this.playerShip.rotation.y = this.gameState.playerRotation;
      this.inputState.sailToIsland = true;
      // Safety fallback — proximity check will stop sailToIsland sooner
      setTimeout(() => {
        this.inputState.sailToIsland = false;
      }, 8000);
    }
  }

  /** Stop all ship movement immediately (used by dock button / portal click). */
  stopMovement() {
    this.inputState.sailToIsland = false;
    this.inputState.forward = false;
    this.inputState.backward = false;
    this.gameState.playerSpeed = 0;
  }

  /**
   * Switch the camera to an island-view mode that aims at the portal icon so
   * both the campfire and the project links are in frame.
   */
  setIslandProximityView(near: boolean, pos?: { x: number; z: number }) {
    this._nearIsland = near;
    if (near && pos) {
      this._nearIslandPos = new THREE.Vector3(pos.x, 0, pos.z);
      // Gently zoom out so the whole island scene is visible
      this.zoomTarget = Math.max(this.zoomTarget, 0.38);
    } else {
      this._nearIslandPos = null;
      this.zoomTarget = 0;
    }
  }

  /**
   * Toggle between deck/crow's-nest mode (0) and hover/cinematic follow cam (1).
   */
  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 0 ? 1 : 0;
    this.zoomTarget = 0;
  }

  getCameraMode() {
    return this.cameraMode;
  }

  /**
   * Adjust zoom level by delta (-1 to 1 range). Used by mobile +/- buttons.
   */
  adjustZoom(delta: number) {
    this.zoomTarget = Math.max(0, Math.min(1, this.zoomTarget + delta));
  }

  private updatePlayerShip(delta: number) {
    const gs = this.gameState;
    const input = this.inputState;
    const maxSpeed = 12;
    const accel = 4;
    const decel = 3;
    const turnSpeed = 1.2;

    if (input.forward || input.sailToIsland) {
      gs.playerSpeed = Math.min(gs.playerSpeed + accel * delta, maxSpeed);
    } else if (input.backward) {
      gs.playerSpeed = Math.max(gs.playerSpeed - accel * delta * 0.5, -maxSpeed * 0.4);
    } else {
      gs.playerSpeed *= Math.pow(0.1, delta);
    }

    if (input.left) {
      gs.playerRotation += turnSpeed * delta * (gs.playerSpeed > 0 ? 1 : -1);
    }
    if (input.right) {
      gs.playerRotation -= turnSpeed * delta * (gs.playerSpeed > 0 ? 1 : -1);
    }

    this.playerShip.rotation.y = gs.playerRotation;
    const moveX = Math.sin(gs.playerRotation) * gs.playerSpeed * delta;
    const moveZ = Math.cos(gs.playerRotation) * gs.playerSpeed * delta;
    this.playerShip.position.x += moveX;
    this.playerShip.position.z += moveZ;

    gs.playerPosition = {
      x: this.playerShip.position.x,
      z: this.playerShip.position.z,
    };

    // Wave bob
    const time = this.clock.elapsedTime;
    this.playerShip.position.y =
      0.5 + Math.sin(time * 1.5) * 0.15 + Math.sin(time * 0.8) * 0.1;
    this.playerShip.rotation.z =
      Math.sin(time * 1.2) * 0.03 + Math.sin(time * 0.7) * 0.015;
    this.playerShip.rotation.x =
      Math.sin(time * 0.9 + 1) * 0.02 * (gs.playerSpeed / maxSpeed);

    // Sail billow
    const mainSail = this.playerShip.getObjectByName("mainSail");
    const foreSail = this.playerShip.getObjectByName("foreSail");
    if (mainSail) {
      mainSail.rotation.y =
        Math.sin(time * 0.5) * 0.1 + (gs.playerSpeed / maxSpeed) * 0.15;
    }
    if (foreSail) {
      foreSail.rotation.y =
        Math.sin(time * 0.5 + 0.3) * 0.1 + (gs.playerSpeed / maxSpeed) * 0.12;
    }

    // Flag wave
    const flag = this.playerShip.getObjectByName("flag");
    if (flag) {
      flag.rotation.y = Math.sin(time * 3) * 0.4;
    }

    // Camera follow
    // Smooth zoom level toward target each frame
    this.zoomLevel += (this.zoomTarget - this.zoomLevel) * Math.min(1, 3.5 * delta);

    const z = this.zoomLevel;

    // Forward unit vector in the ship's heading direction
    const fwdX = Math.sin(gs.playerRotation);
    const fwdZ = Math.cos(gs.playerRotation);

    let camPos: THREE.Vector3;
    let lookTarget: THREE.Vector3;

    if (this.cameraMode === 1) {
      // ── Mode 1: Hover / Cinematic follow cam ───────────────────────────────
      // Camera hovers above and behind the ship; zoom moves it further back
      // (and slightly higher). The look direction is always level with the
      // horizon so the view never tilts up or down.
      //   z=0 (close):  20 units back, 12 units up
      //   z=1 (far):    38 units back, 20 units up
      const camDist   = 20 + 18 * z;
      const camHeight = 12 + 8  * z;
      camPos = this.playerShip.position.clone().add(new THREE.Vector3(
        fwdX * -camDist, camHeight, fwdZ * -camDist
      ));
      this.camera.position.lerp(camPos, 0.05);

      // Look straight ahead at the same height as the camera so the horizon
      // stays perfectly level regardless of zoom level.
      lookTarget = this.playerShip.position.clone().add(new THREE.Vector3(
        fwdX * 80, camHeight - 1, fwdZ * 80
      ));
      this.camera.lookAt(lookTarget);

    } else {
      // ── Mode 0: Deck / Crow's-nest (default) ──────────────────────────────
      // Camera sits BEHIND ship center so the player sees the bow and sea ahead.
      //   z=0 deck:       5 units behind center, 5 units up
      //   z=1 crow's nest: 9 units behind,      20 units up
      const camFwd = -5 - 4 * z;
      const camUp  =  5 + 15 * (z * z);
      camPos = this.playerShip.position.clone().add(new THREE.Vector3(
        fwdX * camFwd, camUp, fwdZ * camFwd
      ));
      this.camera.position.lerp(camPos, 0.06);

      // Look target — when near island, aim at the portal icon height so both
      // the campfire and project links are in frame; otherwise look to horizon.
      let lookDist: number;
      let lookY: number;
      if (this._nearIsland && this._nearIslandPos) {
        const toIsland = this._nearIslandPos.clone().sub(this.playerShip.position);
        lookDist = Math.max(12, toIsland.length() * 0.9);
        lookY = 14;
      } else {
        //   z=0: look 30 units ahead (bow + near ocean)
        //   z=1: look 280 units ahead (full horizon)
        lookDist = 30 + 250 * (z * z);
        lookY = 3;
      }
      lookTarget = this.playerShip.position.clone().add(new THREE.Vector3(
        fwdX * lookDist, lookY, fwdZ * lookDist
      ));
      this.camera.lookAt(lookTarget);
    }

    // Fire cannon
    if (input.fire && input.fireCooldown <= 0 && gs.playerCannonBalls > 0) {
      const leftDir = new THREE.Vector3(
        -Math.cos(gs.playerRotation),
        0,
        Math.sin(gs.playerRotation)
      );
      const firePos = this.playerShip.position.clone().add(
        leftDir.clone().multiplyScalar(3).add(new THREE.Vector3(0, 3, 0))
      );
      this.fireCannonBall(firePos, leftDir, true);
      const rightDir = leftDir.clone().negate();
      const firePos2 = this.playerShip.position.clone().add(
        rightDir.clone().multiplyScalar(3).add(new THREE.Vector3(0, 3, 0))
      );
      this.fireCannonBall(firePos2, rightDir, true);
      input.fireCooldown = 1.2;
    }
    if (input.fireCooldown > 0) input.fireCooldown -= delta;
  }

  private updateEnemies(delta: number) {
    const playerPos = this.playerShip.position;

    this.enemies.forEach(({ group, state }, id) => {
      if (state.state === "dead") return;
      if (state.state === "sinking") {
        group.position.y -= delta * 2;
        group.rotation.z += delta * 0.5;
        if (group.position.y < -15) {
          state.state = "dead";
          this.scene.remove(group);
        }
        return;
      }

      const dx = playerPos.x - group.position.x;
      const dz = playerPos.z - group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // State transitions
      const healthRatio = state.health / state.maxHealth;
      if (healthRatio <= state.fleeThreshold && state.behavior !== "fight") {
        state.state = "flee";
      } else if (dist < 80) {
        state.state = "attack";
      } else if (dist < 150) {
        state.state = "chase";
      } else {
        state.state = "patrol";
      }

      const speed = state.speed * delta * 6;

      if (state.state === "patrol") {
        const centerDx = state.zoneX - group.position.x;
        const centerDz = state.zoneZ - group.position.z;
        const centerDist = Math.sqrt(centerDx * centerDx + centerDz * centerDz);
        if (centerDist > state.zoneRadius) {
          const angle = Math.atan2(centerDx, centerDz);
          group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, angle, 0.05);
        } else {
          group.rotation.y += delta * 0.3;
        }
        group.position.x += Math.sin(group.rotation.y) * speed * 0.4;
        group.position.z += Math.cos(group.rotation.y) * speed * 0.4;
      } else if (state.state === "chase" || state.state === "attack") {
        const angle = Math.atan2(dx, dz);
        group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, angle, 0.06);
        group.position.x += Math.sin(group.rotation.y) * speed;
        group.position.z += Math.cos(group.rotation.y) * speed;

        // Enemy cannon fire
        if (state.state === "attack" && dist < 60) {
          state.attackCooldown -= delta;
          if (state.attackCooldown <= 0) {
            const accuracy = state.cannonAccuracy;
            const spread = (1 - accuracy) * 0.3;
            const fireDir = new THREE.Vector3(
              dx / dist + (Math.random() - 0.5) * spread,
              0,
              dz / dist + (Math.random() - 0.5) * spread
            ).normalize();
            this.fireCannonBall(
              group.position.clone().add(new THREE.Vector3(0, 3, 0)),
              fireDir,
              false
            );
            state.attackCooldown = 2 + Math.random() * 2;
          }
        }
      } else if (state.state === "flee") {
        const angle = Math.atan2(-dx, -dz);
        group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, angle, 0.08);
        group.position.x += Math.sin(group.rotation.y) * speed * 1.5;
        group.position.z += Math.cos(group.rotation.y) * speed * 1.5;
      }

      // Wave bob
      const t = this.clock.elapsedTime;
      group.position.y =
        0.5 + Math.sin(t * 1.3 + group.position.x) * 0.1;

      // Update health bar
      const healthBar = group.getObjectByName("healthBar") as THREE.Mesh;
      if (healthBar) {
        const ratio = state.health / state.maxHealth;
        healthBar.scale.x = ratio;
        healthBar.position.x = (ratio - 1) * 2;
        const mat = healthBar.material as THREE.MeshBasicMaterial;
        mat.color.setHex(ratio > 0.5 ? 0x00ff44 : ratio > 0.25 ? 0xffaa00 : 0xff2200);
        healthBar.lookAt(this.camera.position);
      }
    });
  }

  private updateProjectiles(delta: number) {
    const toRemove: THREE.Mesh[] = [];

    for (const ball of this.cannonBalls) {
      const vel = ball.userData.velocity as THREE.Vector3;
      ball.position.add(vel.clone().multiplyScalar(delta));
      ball.userData.lifetime -= delta;

      // Add drag
      vel.multiplyScalar(0.995);
      vel.y -= 15 * delta;

      if (ball.userData.lifetime <= 0 || ball.position.y < -3) {
        toRemove.push(ball);
        continue;
      }

      // Check player hit
      if (!ball.userData.isPlayer) {
        const dist = ball.position.distanceTo(this.playerShip.position);
        if (dist < 5) {
          this.gameState.playerHealth -= 8 + Math.random() * 7;
          this.createExplosion(ball.position);
          toRemove.push(ball);
          if (this.gameState.playerHealth <= 0) {
            this.gameState.gamePhase = "dead";
          }
          continue;
        }
      }

      // Check enemy hits
      if (ball.userData.isPlayer) {
        let hitSomething = false;
        this.enemies.forEach(({ group, state }) => {
          if (state.state === "dead" || state.state === "sinking") return;
          const dist = ball.position.distanceTo(group.position);
          if (dist < 8) {
            state.health -= 25 + Math.random() * 15;
            this.createExplosion(ball.position);
            hitSomething = true;
            if (state.health <= 0) {
              state.state = "sinking";
              this.gameState.playerGold += state.lootValue;
              this.gameState.lootMessages.push({
                id: Math.random().toString(),
                message: `+${state.lootValue} gold! ${state.name} sunk!`,
                position: { x: group.position.x, z: group.position.z },
                opacity: 1,
                timestamp: Date.now(),
              });
            }
          }
        });
        if (hitSomething) toRemove.push(ball);
      }
    }

    toRemove.forEach((b) => {
      this.scene.remove(b);
      this.cannonBalls = this.cannonBalls.filter((c) => c !== b);
    });

    // Expire loot messages
    this.gameState.lootMessages = this.gameState.lootMessages.filter(
      (m) => Date.now() - m.timestamp < 3000
    );
    this.gameState.lootMessages.forEach((m) => {
      m.opacity = Math.max(0, 1 - (Date.now() - m.timestamp) / 3000);
    });
  }

  private createExplosion(position: THREE.Vector3) {
    const count = 40;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.5,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(position);
    this.scene.add(pts);

    // Flash
    const flashLight = new THREE.PointLight(0xff4400, 6, 30);
    flashLight.position.copy(position);
    this.scene.add(flashLight);

    let life = 0.6;
    const fade = () => {
      life -= 0.016;
      (pts.material as THREE.PointsMaterial).opacity = life / 0.6;
      flashLight.intensity = (life / 0.6) * 6;
      if (life > 0) requestAnimationFrame(fade);
      else {
        this.scene.remove(pts);
        this.scene.remove(flashLight);
      }
    };
    requestAnimationFrame(fade);
  }

  private updateIslands(time: number) {
    this.islands.forEach(({ group, state }) => {
      // Animate campfire light flicker
      const campfireGroup = group.children.find(
        (c) => c.children.some((ch) => ch.name === "fireLight")
      );
      if (campfireGroup) {
        const fireLight = campfireGroup.getObjectByName("fireLight") as THREE.PointLight;
        if (fireLight) {
          fireLight.intensity = 6 + Math.sin(time * 8 + state.position.x) * 2 + Math.sin(time * 13) * 1;
        }
        const fireParticles = campfireGroup.getObjectByName("fireParticles") as THREE.Points;
        if (fireParticles && fireParticles.geometry.attributes.position) {
          const pos = fireParticles.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            pos.setY(i, ((pos.getY(i) + this.delta * 4) % 3));
            pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.01);
          }
          pos.needsUpdate = true;
        }
      }

      // Animate portal icon
      const portal = group.getObjectByName(`portal_${state.id}`) as THREE.Group;
      if (portal) {
        portal.rotation.y = time * 0.7;
        portal.position.y = 16 + Math.sin(time * 1.4) * 1.8;

        // Pulse outer glow ring
        const outerRing = portal.getObjectByName("outerGlowRing") as THREE.Mesh | undefined;
        if (outerRing && outerRing.material instanceof THREE.MeshBasicMaterial) {
          outerRing.material.opacity = 0.15 + Math.sin(time * 2.2) * 0.12;
        }

        // Pulse icon glow border
        const iconGlow = portal.getObjectByName("iconGlow") as THREE.Mesh | undefined;
        if (iconGlow && iconGlow.material instanceof THREE.MeshBasicMaterial) {
          iconGlow.material.opacity = 0.4 + Math.sin(time * 2.8) * 0.18;
        }
        const iconSoftGlow = portal.getObjectByName("iconSoftGlow") as THREE.Mesh | undefined;
        if (iconSoftGlow && iconSoftGlow.material instanceof THREE.MeshBasicMaterial) {
          iconSoftGlow.material.opacity = 0.12 + Math.sin(time * 1.8) * 0.08;
        }

        // Keep icon facing camera (billboard)
        const iconPlane = portal.getObjectByName("iconPlane") as THREE.Mesh | undefined;
        if (iconPlane) {
          iconPlane.lookAt(this.camera.position);
          const iconGlowPlane = portal.getObjectByName("iconGlow") as THREE.Mesh | undefined;
          if (iconGlowPlane) iconGlowPlane.lookAt(this.camera.position);
          const softGlowPlane = portal.getObjectByName("iconSoftGlow") as THREE.Mesh | undefined;
          if (softGlowPlane) softGlowPlane.lookAt(this.camera.position);
        }
      }

      // Check proximity — wider radius to match the bigger island footprint
      const dx = state.position.x - this.playerShip.position.x;
      const dz = state.position.z - this.playerShip.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 60) {
        // Auto-stop the auto-sail when we've arrived — prevents drift past the island
        if (this.inputState.sailToIsland) {
          this.inputState.sailToIsland = false;
          this.gameState.playerSpeed *= 0.15;
        }
        if (this.onIslandProximity) {
          this.onIslandProximity(state);
        }
      }
    });
  }

  private delta = 0;

  private updateFogOfWar() {
    const px = Math.floor(this.playerShip.position.x / 100);
    const pz = Math.floor(this.playerShip.position.z / 100);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        this.gameState.fogOfWar.set(`${px + dx},${pz + dz}`, true);
      }
    }
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const rawDelta = this.clock.getDelta();
    this.delta = Math.min(rawDelta, 0.05);
    const time = this.clock.elapsedTime;

    this.waterMaterial.uniforms.uTime.value = time;
    this.updatePlayerShip(this.delta);
    this.updateEnemies(this.delta);
    this.updateProjectiles(this.delta);
    this.updateIslands(time);
    this.updateFogOfWar();

    // Sync state every few frames
    this.frameCount++;
    if (this.frameCount % 6 === 0 && this.onStateUpdate) {
      this.onStateUpdate({
        playerHealth: this.gameState.playerHealth,
        playerCannonBalls: this.gameState.playerCannonBalls,
        playerGold: this.gameState.playerGold,
        playerSpeed: this.gameState.playerSpeed,
        playerPosition: this.gameState.playerPosition,
        lootMessages: [...this.gameState.lootMessages],
        fogOfWar: new Map(this.gameState.fogOfWar),
        gamePhase: this.gameState.gamePhase,
        enemies: this.gameState.enemies,
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    // Slightly wider FOV on portrait mobile so more scene is visible
    this.camera.fov = w < h ? 80 : 70;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    if (this._keyDown) window.removeEventListener("keydown", this._keyDown);
    if (this._keyUp) window.removeEventListener("keyup", this._keyUp);
    if (this._onWheel) this.canvas.removeEventListener("wheel", this._onWheel);
    this.renderer.dispose();
  }
}
