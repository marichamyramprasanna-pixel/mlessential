import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Box,
  RotateCw,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Layers,
  ShieldAlert,
  Server,
  Network,
  RefreshCw,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Compass,
  Video,
  Eye,
  AlertCircle,
} from "lucide-react";
import { DBSCANResults } from "../../ml/dbscan";
import { PCA3DResult } from "../../ml/pca";
import { CleanedDataset } from "../../ml/preprocessing";

interface ThreeDModelViewProps {
  results: DBSCANResults | null;
  pca3D: PCA3DResult | null;
  dataset: CleanedDataset | null;
  onRunSampleDemo?: () => void;
  onNavigateToSettings?: () => void;
}

type VisualTheme = "cyber_neon" | "quantum_holo" | "obsidian_matrix";

const CLUSTER_COLORS = [
  "#38bdf8", // Sky blue
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#a78bfa", // Violet
  "#f472b6", // Pink
  "#2dd4bf", // Teal
  "#fb923c", // Orange
  "#60a5fa", // Blue
  "#e879f9", // Fuchsia
];

export const ThreeDModelView: React.FC<ThreeDModelViewProps> = ({
  results,
  pca3D,
  dataset,
  onRunSampleDemo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportWrapperRef = useRef<HTMLDivElement>(null);

  // View & Simulation States
  const [modelMode, setModelMode] = useState<"cluster_space" | "cyber_infrastructure">("cluster_space");
  const [visualTheme, setVisualTheme] = useState<VisualTheme>("cyber_neon");
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.0);
  const [pointScale, setPointScale] = useState<number>(2.4);
  const [showWireframeBox, setShowWireframeBox] = useState<boolean>(true);
  const [showClusterHulls, setShowClusterHulls] = useState<boolean>(true);
  const [showBeaconBeams, setShowBeaconBeams] = useState<boolean>(true);
  const [showStarfield, setShowStarfield] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isCinematicOrbit, setIsCinematicOrbit] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<number | "all" | "anomalies_only">("all");

  // WebGL Context Error / Fallback State
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  // Interaction States
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>("srv_app");
  const [isSimulatingBurst, setIsSimulatingBurst] = useState<boolean>(false);
  const [burstCount, setBurstCount] = useState<number>(0);

  // References for Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const targetReticleRef = useRef<THREE.Group | null>(null);

  // Normalized PCA 3D coordinates scaled to fit [-8, 8] box
  const normalizedPoints = useMemo(() => {
    if (!pca3D || !pca3D.coords || pca3D.coords.length === 0) return [];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const [x, y, z] of pca3D.coords) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const rangeZ = maxZ - minZ || 1;
    const maxRange = Math.max(rangeX, rangeY, rangeZ) || 1;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const scale = 14 / maxRange;

    return pca3D.coords.map(([x, y, z], idx) => {
      const px = (x - centerX) * scale;
      const py = (y - centerY) * scale;
      const pz = (z - centerZ) * scale;
      const label = results ? results.labels[idx] : 0;
      const isNoise = label === -1;
      return {
        idx,
        x: px,
        y: py,
        z: pz,
        origX: x,
        origY: y,
        origZ: z,
        label,
        isNoise,
      };
    });
  }, [pca3D, results]);

  // Compute cluster centroids and bounds in 3D
  const clusterCentroids = useMemo(() => {
    if (!normalizedPoints.length || !results) return [];
    const clustersMap: Record<number, { sumX: number; sumY: number; sumZ: number; count: number; maxDist: number }> = {};

    normalizedPoints.forEach((p) => {
      if (p.isNoise) return;
      if (!clustersMap[p.label]) {
        clustersMap[p.label] = { sumX: 0, sumY: 0, sumZ: 0, count: 0, maxDist: 0 };
      }
      clustersMap[p.label].sumX += p.x;
      clustersMap[p.label].sumY += p.y;
      clustersMap[p.label].sumZ += p.z;
      clustersMap[p.label].count += 1;
    });

    return Object.entries(clustersMap).map(([lbl, data]) => {
      const labelNum = Number(lbl);
      const cx = data.sumX / data.count;
      const cy = data.sumY / data.count;
      const cz = data.sumZ / data.count;

      let maxDist = 0;
      normalizedPoints.forEach((p) => {
        if (p.label === labelNum) {
          const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2);
          if (d > maxDist) maxDist = d;
        }
      });

      return {
        label: labelNum,
        x: cx,
        y: cy,
        z: cz,
        radius: Math.max(1.3, maxDist + 0.35),
        count: data.count,
        color: CLUSTER_COLORS[labelNum % CLUSTER_COLORS.length],
      };
    });
  }, [normalizedPoints, results]);

  // Main Three.js Scene Setup & Loop (Wrapped in WebGL safety & error isolation)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset previous error state for retry
    setWebglError(null);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene & Deep Atmosphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const bgColor = visualTheme === "obsidian_matrix"
      ? 0x040d0a
      : visualTheme === "quantum_holo"
      ? 0x050814
      : 0x070b16;

    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.016);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(19, 15, 23);
    cameraRef.current = camera;

    // 3. Renderer with WebGL Context Safety (Prevents unhandled runtime crashes)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      rendererRef.current = renderer;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);
    } catch (err: any) {
      console.warn("[ThreeDModelView] WebGL creation failed:", err?.message);
      setWebglError(err?.message || "WebGL context disabled or unsupported in browser sandbox.");
      return;
    }

    // Attach Context Loss/Restore Listeners
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("[ThreeDModelView] WebGL context lost.");
      setWebglError("WebGL context was interrupted. Click below to retry.");
    };

    const handleContextRestored = () => {
      console.log("[ThreeDModelView] WebGL context restored.");
      setWebglError(null);
    };

    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 85;
    controls.minDistance = 3;
    controls.autoRotate = autoRotate && !isCinematicOrbit;
    controls.autoRotateSpeed = rotationSpeed * 1.5;
    controlsRef.current = controls;

    // 5. Studio Three-Point Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0fdf4, 2.4);
    keyLight.position.set(22, 32, 22);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.5);
    fillLight.position.set(-22, -12, -20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(0, -25, -28);
    scene.add(rimLight);

    const dynamicObjects: {
      anomalies: THREE.Mesh[];
      anomalyRings: THREE.Mesh[];
      radarRings: THREE.Mesh[];
      fans: THREE.Mesh[];
      radioWaves: THREE.Mesh[];
      sentinel: THREE.Group | null;
      packets: {
        mesh: THREE.Mesh;
        curve: THREE.CatmullRomCurve3;
        progress: number;
        speed: number;
        isAnomaly: boolean;
      }[];
      rotators: { obj: THREE.Object3D; speed: number; axis: "x" | "y" | "z" }[];
    } = {
      anomalies: [],
      anomalyRings: [],
      radarRings: [],
      fans: [],
      radioWaves: [],
      sentinel: null,
      packets: [],
      rotators: [],
    };

    // Cosmic Dust Starfield
    if (showStarfield) {
      const starCount = 1200;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 90;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 70;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 90;

        const isCyan = Math.random() > 0.4;
        starColors[i * 3] = isCyan ? 0.2 : 0.6;
        starColors[i * 3 + 1] = isCyan ? 0.7 : 0.4;
        starColors[i * 3 + 2] = 1.0;
      }

      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

      const starMat = new THREE.PointsMaterial({
        size: 0.25,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });

      const starField = new THREE.Points(starGeo, starMat);
      scene.add(starField);
      dynamicObjects.rotators.push({ obj: starField, speed: 0.0003, axis: "y" });
    }

    // Reticle
    const reticleGroup = new THREE.Group();
    reticleGroup.visible = false;
    const reticleRingGeo = new THREE.RingGeometry(0.55 * pointScale, 0.65 * pointScale, 32);
    const reticleRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const reticleRing = new THREE.Mesh(reticleRingGeo, reticleRingMat);
    reticleGroup.add(reticleRing);

    for (let b = 0; b < 4; b++) {
      const angle = (b * Math.PI) / 2 + Math.PI / 4;
      const bracketGeo = new THREE.BoxGeometry(0.3, 0.05, 0.05);
      const bracketMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(Math.cos(angle) * 0.8 * pointScale, Math.sin(angle) * 0.8 * pointScale, 0);
      bracket.rotation.z = angle;
      reticleGroup.add(bracket);
    }
    scene.add(reticleGroup);
    targetReticleRef.current = reticleGroup;

    // Build Scene Geometry
    if (modelMode === "cluster_space") {
      if (showGrid) {
        const gridFine = new THREE.GridHelper(26, 26, 0x0284c7, 0x1e293b);
        gridFine.position.y = -8;
        scene.add(gridFine);

        const radarGeo = new THREE.RingGeometry(11, 11.25, 48);
        const radarMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
        });
        const radarRing = new THREE.Mesh(radarGeo, radarMat);
        radarRing.rotation.x = Math.PI / 2;
        radarRing.position.y = -7.95;
        scene.add(radarRing);
        dynamicObjects.radarRings.push(radarRing);
      }

      // Coordinate axes
      const axisLen = 10;
      scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axisLen, 0xef4444, 1.0, 0.5));
      scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLen, 0x10b981, 1.0, 0.5));
      scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axisLen, 0x38bdf8, 1.0, 0.5));

      if (showWireframeBox) {
        const boxGeo = new THREE.BoxGeometry(16, 16, 16);
        const boxEdges = new THREE.EdgesGeometry(boxGeo);
        const boxMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 });
        scene.add(new THREE.LineSegments(boxEdges, boxMat));
      }

      clusterCentroids.forEach((c) => {
        if (filterMode !== "all" && filterMode !== c.label) return;

        if (showClusterHulls) {
          const hullGeo = new THREE.IcosahedronGeometry(c.radius, 2);
          const wireMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(c.color),
            wireframe: true,
            transparent: true,
            opacity: 0.22,
          });
          const wireMesh = new THREE.Mesh(hullGeo, wireMat);
          wireMesh.position.set(c.x, c.y, c.z);
          scene.add(wireMesh);
          dynamicObjects.rotators.push({ obj: wireMesh, speed: 0.002, axis: "y" });

          const fillMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(c.color),
            transparent: true,
            opacity: 0.07,
            roughness: 0.3,
            metalness: 0.2,
          });
          const fillMesh = new THREE.Mesh(hullGeo, fillMat);
          fillMesh.position.set(c.x, c.y, c.z);
          scene.add(fillMesh);
        }

        if (showBeaconBeams) {
          const beamHeight = c.y - (-8);
          if (beamHeight > 0) {
            const beamGeo = new THREE.CylinderGeometry(0.12, 0.4, beamHeight, 16, 1, true);
            const beamMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(c.color),
              transparent: true,
              opacity: 0.2,
              side: THREE.DoubleSide,
            });
            const beamMesh = new THREE.Mesh(beamGeo, beamMat);
            beamMesh.position.set(c.x, -8 + beamHeight / 2, c.z);
            scene.add(beamMesh);
          }
        }

        const centerGeo = new THREE.OctahedronGeometry(0.45, 0);
        const centerMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(c.color),
          emissive: new THREE.Color(c.color),
          emissiveIntensity: 0.8,
          roughness: 0.15,
          metalness: 0.3,
          clearcoat: 1.0,
        });
        const centerMesh = new THREE.Mesh(centerGeo, centerMat);
        centerMesh.position.set(c.x, c.y, c.z);
        scene.add(centerMesh);
        dynamicObjects.rotators.push({ obj: centerMesh, speed: 0.02, axis: "y" });
      });

      // Data Points
      const sphereGeo = new THREE.SphereGeometry(0.18 * pointScale, 16, 16);
      const octaGeo = new THREE.OctahedronGeometry(0.28 * pointScale, 0);

      normalizedPoints.forEach((p) => {
        if (filterMode === "anomalies_only" && !p.isNoise) return;
        if (typeof filterMode === "number" && p.label !== filterMode) return;

        if (p.isNoise) {
          const mat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xef4444,
            emissiveIntensity: 1.4,
            roughness: 0.25,
            metalness: 0.7,
          });
          const mesh = new THREE.Mesh(octaGeo, mat);
          mesh.position.set(p.x, p.y, p.z);
          mesh.userData = { pointIdx: p.idx, isNoise: true, label: -1 };
          scene.add(mesh);
          dynamicObjects.anomalies.push(mesh);

          const haloGeo = new THREE.RingGeometry(0.5 * pointScale, 0.62 * pointScale, 20);
          const haloMat = new THREE.MeshBasicMaterial({
            color: 0xff0044,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
          });
          const haloMesh = new THREE.Mesh(haloGeo, haloMat);
          haloMesh.position.set(p.x, p.y, p.z);
          scene.add(haloMesh);
          dynamicObjects.anomalyRings.push(haloMesh);
        } else {
          const colorHex = CLUSTER_COLORS[p.label % CLUSTER_COLORS.length];
          const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(colorHex),
            emissive: new THREE.Color(colorHex),
            emissiveIntensity: 0.35,
            roughness: 0.2,
            metalness: 0.15,
            clearcoat: 0.85,
          });
          const mesh = new THREE.Mesh(sphereGeo, mat);
          mesh.position.set(p.x, p.y, p.z);
          mesh.userData = { pointIdx: p.idx, isNoise: false, label: p.label };
          scene.add(mesh);
        }
      });
    } else {
      // MODE 2: Topology Model
      const grid = new THREE.GridHelper(32, 32, 0x0284c7, 0x0f172a);
      grid.position.y = -4;
      scene.add(grid);

      const topologyNodes: Record<string, { pos: [number, number, number]; label: string; type: string; color: number }> = {
        gw_edge: { pos: [-11, 0, 0], label: "Edge Gateway Router", type: "router", color: 0x38bdf8 },
        fw_dmz: { pos: [-5, 1, 0], label: "Perimeter NextGen Firewall", type: "firewall", color: 0xf59e0b },
        srv_app: { pos: [2, 2, -5], label: "API Cluster Rack", type: "server", color: 0x34d399 },
        srv_compute: { pos: [2, 2, 5], label: "Compute Node Rack", type: "server", color: 0x60a5fa },
        db_core: { pos: [9, 0, 0], label: "Core Enterprise Database", type: "database", color: 0xa78bfa },
        sec_siem: { pos: [3, 4.5, 0], label: "AI Sentinel Drone", type: "sentinel", color: 0xef4444 },
      };

      Object.entries(topologyNodes).forEach(([id, node]) => {
        const group = new THREE.Group();
        group.position.set(...node.pos);
        group.userData = { deviceId: id, label: node.label, type: node.type };

        if (node.type === "server") {
          const rackGeo = new THREE.BoxGeometry(2.6, 5.0, 2.2);
          const rackMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.25 });
          const rackMesh = new THREE.Mesh(rackGeo, rackMat);
          rackMesh.position.y = 1.5;
          group.add(rackMesh);

          for (let slot = 0; slot < 6; slot++) {
            const bladeGeo = new THREE.BoxGeometry(2.3, 0.45, 0.05);
            const isAlert = results && results.numAnomalies > 0 && (slot === 2 || slot === 4);
            const blade = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 }));
            blade.position.set(0, slot * 0.7 - 0.4, 1.11);
            group.add(blade);

            const led1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: isAlert ? 0xef4444 : 0x10b981 }));
            led1.position.set(-0.9, slot * 0.7 - 0.4, 1.15);
            group.add(led1);
          }
        } else if (node.type === "router") {
          const routerGeo = new THREE.CylinderGeometry(1.8, 2.0, 1.3, 24);
          const routerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
          group.add(new THREE.Mesh(routerGeo, routerMat));
        } else if (node.type === "firewall") {
          const fwGeo = new THREE.CylinderGeometry(2.0, 2.0, 2.6, 6);
          const fwMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, wireframe: true, emissive: 0xf59e0b, emissiveIntensity: 0.9 });
          const fwMesh = new THREE.Mesh(fwGeo, fwMat);
          group.add(fwMesh);
          dynamicObjects.rotators.push({ obj: fwMesh, speed: 0.015, axis: "y" });
        } else if (node.type === "database") {
          const dbGeo = new THREE.CylinderGeometry(1.6, 1.6, 3.0, 24);
          const dbMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.85, roughness: 0.2 });
          group.add(new THREE.Mesh(dbGeo, dbMat));
        } else {
          const drone = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true }));
          group.add(drone);
          dynamicObjects.sentinel = group;
        }

        scene.add(group);
      });
    }

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData.pointIdx && !hitObj.userData.deviceId && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj) {
          if (hitObj.userData.pointIdx !== undefined) {
            setSelectedPointIdx(hitObj.userData.pointIdx);
            if (targetReticleRef.current) {
              targetReticleRef.current.position.copy(hitObj.position);
              targetReticleRef.current.visible = true;
            }
          }
          if (hitObj.userData.deviceId) {
            setSelectedDevice(hitObj.userData.deviceId);
          }
        }
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);

    // Render loop
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      controls.autoRotate = autoRotate && !isCinematicOrbit;
      controls.autoRotateSpeed = rotationSpeed * 1.5;
      controls.update();

      if (isCinematicOrbit) {
        const radius = 26;
        camera.position.set(Math.sin(elapsedTime * 0.25) * radius, 14 + Math.sin(elapsedTime * 0.5) * 4, Math.cos(elapsedTime * 0.25) * radius);
        camera.lookAt(0, 0, 0);
      }

      dynamicObjects.anomalies.forEach((mesh) => {
        const s = 1 + Math.sin(elapsedTime * 6) * 0.28;
        mesh.scale.set(s, s, s);
      });

      dynamicObjects.rotators.forEach((item) => {
        if (item.axis === "y") item.obj.rotation.y += item.speed;
        if (item.axis === "x") item.obj.rotation.x += item.speed;
        if (item.axis === "z") item.obj.rotation.z += item.speed;
      });

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      renderer.domElement.removeEventListener("click", handlePointerDown);
      renderer.dispose();
      scene.clear();
    };
  }, [
    modelMode,
    visualTheme,
    normalizedPoints,
    clusterCentroids,
    autoRotate,
    rotationSpeed,
    pointScale,
    showWireframeBox,
    showClusterHulls,
    showBeaconBeams,
    showStarfield,
    showGrid,
    isCinematicOrbit,
    filterMode,
    isSimulatingBurst,
    retryKey,
  ]);

  // Camera presets
  const setCameraView = (type: "iso" | "top" | "front" | "side") => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    setIsCinematicOrbit(false);
    if (type === "iso") camera.position.set(19, 15, 23);
    else if (type === "top") camera.position.set(0, 34, 0.001);
    else if (type === "front") camera.position.set(0, 0, 34);
    else if (type === "side") camera.position.set(34, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const focusOnAnomalies = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !normalizedPoints.length) return;

    setIsCinematicOrbit(false);
    const noisePts = normalizedPoints.filter((p) => p.isNoise);
    if (noisePts.length === 0) return;

    let sx = 0, sy = 0, sz = 0;
    noisePts.forEach((p) => {
      sx += p.x;
      sy += p.y;
      sz += p.z;
    });
    const cx = sx / noisePts.length;
    const cy = sy / noisePts.length;
    const cz = sz / noisePts.length;

    controls.target.set(cx, cy, cz);
    camera.position.set(cx + 8, cy + 6, cz + 10);
    controls.update();
  };

  const inspectIdx = hoveredPointIdx !== null ? hoveredPointIdx : selectedPointIdx;
  const inspectedData = useMemo(() => {
    if (inspectIdx === null || !dataset || !results) return null;
    const point = normalizedPoints.find((p) => p.idx === inspectIdx);
    const rowFeatures = dataset.numericMatrix[inspectIdx] || [];
    const refVal = dataset.referenceLabels ? dataset.referenceLabels[inspectIdx] : undefined;

    return {
      idx: inspectIdx,
      label: results.labels[inspectIdx],
      isNoise: results.labels[inspectIdx] === -1,
      corePoint: results.isCorePoint ? results.isCorePoint[inspectIdx] : false,
      refVal,
      coords3D: point ? [point.origX.toFixed(3), point.origY.toFixed(3), point.origZ.toFixed(3)] : ["0", "0", "0"],
      features: dataset.featureNames.map((name, i) => ({
        name,
        val: rowFeatures[i] !== undefined ? rowFeatures[i].toFixed(2) : "N/A",
      })),
    };
  }, [inspectIdx, dataset, results, normalizedPoints]);

  const handleSimulateBurst = () => {
    setIsSimulatingBurst(true);
    setBurstCount((prev) => prev + 1);
    setTimeout(() => {
      setIsSimulatingBurst(false);
    }, 4500);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto" : ""}`}>
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Interactive 3D Spatial Model
                </h1>
                <span className={`text-[11px] font-mono ${webglError ? "text-amber-500" : "text-emerald-500"}`}>
                  {webglError ? "Canvas 2D Fallback" : "WebGL 60 FPS"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                High-fidelity 3D viewport for multi-dimensional PCA cluster geometry and enterprise cyber defense infrastructure.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setModelMode("cluster_space")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                modelMode === "cluster_space"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Cluster Space</span>
            </button>
            <button
              onClick={() => setModelMode("cyber_infrastructure")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                modelMode === "cyber_infrastructure"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>3D Cyber Topology</span>
            </button>
          </div>
        </div>

        {/* Unboxed Metadata (Zero-Pill Discipline) */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-3">
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${webglError ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`}></span>
              <span>{webglError ? "Interactive 2D Orthographic Mode" : "Damping OrbitControls Active"}</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            {pca3D ? (
              <span className="flex items-center space-x-2">
                <span className="text-red-500 font-semibold">PC1 {(pca3D.explainedVarianceRatio[0] * 100).toFixed(1)}%</span>
                <span>/</span>
                <span className="text-emerald-500 font-semibold">PC2 {(pca3D.explainedVarianceRatio[1] * 100).toFixed(1)}%</span>
                <span>/</span>
                <span className="text-blue-500 font-semibold">PC3 {(pca3D.explainedVarianceRatio[2] * 100).toFixed(1)}%</span>
              </span>
            ) : (
              <span>Synthetic Projection Ready</span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="text-slate-500">Visual Aesthetic:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setVisualTheme("cyber_neon")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  visualTheme === "cyber_neon" ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Cyber Neon
              </button>
              <button
                onClick={() => setVisualTheme("quantum_holo")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  visualTheme === "quantum_holo" ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Quantum Blue
              </button>
              <button
                onClick={() => setVisualTheme("obsidian_matrix")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  visualTheme === "obsidian_matrix" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Matrix Emerald
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Viewport & Inspector */}
      <div ref={viewportWrapperRef} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col space-y-3">
          <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-xl group">
            {/* If WebGL failed to initialize, render the robust Interactive Fallback Canvas */}
            {webglError ? (
              <InteractiveFallbackCanvas
                points={normalizedPoints}
                centroids={clusterCentroids}
                autoRotate={autoRotate}
                rotationSpeed={rotationSpeed}
                pointScale={pointScale}
                showGrid={showGrid}
                showHulls={showClusterHulls}
                filterMode={filterMode}
                selectedIdx={selectedPointIdx}
                hoveredIdx={hoveredPointIdx}
                onSelectPoint={(idx) => setSelectedPointIdx(idx)}
                onHoverPoint={(idx) => setHoveredPointIdx(idx)}
                onRetry={() => setRetryKey((k) => k + 1)}
                height={isFullscreen ? 750 : 580}
              />
            ) : (
              <div
                ref={containerRef}
                className={`w-full ${isFullscreen ? "h-[750px]" : "h-[580px]"} cursor-grab active:cursor-grabbing select-none`}
              />
            )}

            {/* Top Control HUD */}
            <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-1.5 rounded shadow-lg text-xs z-10">
              <button
                onClick={() => {
                  setAutoRotate(!autoRotate);
                  setIsCinematicOrbit(false);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                  autoRotate && !isCinematicOrbit
                    ? "bg-sky-500/25 text-sky-300 border border-sky-500/50"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                }`}
                title="Toggle Auto Rotation"
              >
                {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>Auto-Spin</span>
              </button>

              <button
                onClick={() => {
                  setIsCinematicOrbit(!isCinematicOrbit);
                  if (!isCinematicOrbit) setAutoRotate(false);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                  isCinematicOrbit
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/50"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                }`}
                title="Smooth Cinematic Orbital Flythrough"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Cinematic Tour</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5"></div>

              <button onClick={() => setCameraView("iso")} className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]">ISO</button>
              <button onClick={() => setCameraView("top")} className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]">TOP</button>
              <button onClick={() => setCameraView("front")} className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]">FRONT</button>
              <button onClick={() => setCameraView("side")} className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]">SIDE</button>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5"></div>

              {modelMode === "cluster_space" && (
                <button
                  onClick={focusOnAnomalies}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-950/70 text-red-300 border border-red-800 hover:bg-red-900/70 rounded text-[11px] font-medium"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Lock Anomalies</span>
                </button>
              )}

              {modelMode === "cyber_infrastructure" && (
                <button
                  onClick={handleSimulateBurst}
                  disabled={isSimulatingBurst}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-amber-950/70 text-amber-300 border border-amber-800 hover:bg-amber-900/70 rounded text-[11px] font-medium"
                >
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>{isSimulatingBurst ? "Burst Active..." : "Simulate Burst"}</span>
                </button>
              )}

              <button onClick={() => setCameraView("iso")} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bottom Legend */}
            <div className="absolute bottom-3.5 left-3.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded shadow-lg text-[11px] font-mono text-slate-300 flex items-center space-x-4 z-10">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 animate-pulse"></span>
                <span className="text-red-400 font-semibold">Anomaly Noise (-1)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                <span>Cluster 0</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Cluster 1</span>
              </div>
            </div>

            {/* Empty State Banner */}
            {(!results || !pca3D) && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <Box className="w-12 h-12 text-sky-400 animate-pulse mb-3" />
                <h2 className="text-base font-semibold text-slate-100">3D Clustering Space Standby</h2>
                <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                  Run DBSCAN anomaly detection or launch the synthetic network benchmark to visualize coordinate projections.
                </p>
                {onRunSampleDemo && (
                  <button
                    onClick={onRunSampleDemo}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Launch Synthetic Benchmark in 3D</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Spin Speed:</span>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.2"
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                  className="w-20 accent-sky-500 cursor-pointer"
                />
                <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">{rotationSpeed.toFixed(1)}x</span>
              </div>

              {modelMode === "cluster_space" && (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Particle Scale:</span>
                  <input
                    type="range"
                    min="1.2"
                    max="4.5"
                    step="0.3"
                    value={pointScale}
                    onChange={(e) => setPointScale(parseFloat(e.target.value))}
                    className="w-20 accent-sky-500 cursor-pointer"
                  />
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">{pointScale.toFixed(1)}x</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-700 dark:text-slate-300">
              {modelMode === "cluster_space" && (
                <>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showClusterHulls}
                      onChange={(e) => setShowClusterHulls(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Forcefield Hulls</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBeaconBeams}
                      onChange={(e) => setShowBeaconBeams(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Centroid Beacons</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showWireframeBox}
                      onChange={(e) => setShowWireframeBox(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>3D Cage</span>
                  </label>
                </>
              )}

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStarfield}
                  onChange={(e) => setShowStarfield(e.target.checked)}
                  className="rounded accent-sky-500"
                />
                <span>Cosmic Dust</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded accent-sky-500"
                />
                <span>Holo Grid</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Inspector HUD */}
        <div className="space-y-4">
          {modelMode === "cluster_space" ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-500" />
                  3D Spatial Inspector
                </h2>
                <span className="text-[11px] font-mono text-slate-500">
                  {inspectedData ? `Row #${inspectedData.idx}` : "Click 3D Point"}
                </span>
              </div>

              {inspectedData ? (
                <div className="space-y-3">
                  <div
                    className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                      inspectedData.isNoise
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                        : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      {inspectedData.isNoise ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      <span className="font-semibold">
                        {inspectedData.isNoise ? "Anomaly (Noise)" : `Cluster ${inspectedData.label}`}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase">
                      {inspectedData.corePoint ? "Core Point" : inspectedData.isNoise ? "Outlier" : "Border Point"}
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Projected Coordinates
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs text-center">
                      <div>
                        <div className="text-[10px] text-red-500 font-bold">PC1 (X)</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{inspectedData.coords3D[0]}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-500 font-bold">PC2 (Y)</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{inspectedData.coords3D[1]}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-blue-500 font-bold">PC3 (Z)</div>
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{inspectedData.coords3D[2]}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Network Metrics
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {inspectedData.features.map((feat) => (
                        <div
                          key={feat.name}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                        >
                          <span className="truncate max-w-[120px] text-slate-600 dark:text-slate-400">{feat.name}</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{feat.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <Compass className="w-8 h-8 text-sky-500 mx-auto opacity-60 animate-spin" style={{ animationDuration: "12s" }} />
                  <p>Hover or click any 3D node in the coordinate space to lock coordinates and inspect raw flow attributes.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-sky-500" />
                  3D Device Telemetry
                </h2>
                <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> Nominal
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {selectedDevice === "srv_app" && "API Cluster Rack (Active)"}
                    {selectedDevice === "srv_compute" && "Compute Node (ML Pipeline)"}
                    {selectedDevice === "gw_edge" && "Edge Gateway Router"}
                    {selectedDevice === "fw_dmz" && "NextGen Perimeter Firewall"}
                    {selectedDevice === "db_core" && "Enterprise Database Storage"}
                    {selectedDevice === "sec_siem" && "AI Sentinel Drone"}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Hardware ID: <span className="text-sky-600 dark:text-sky-400">{selectedDevice}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">Ingress Anomaly Ratio</span>
                    <span className="font-mono font-bold text-red-500">
                      {results ? `${results.anomalyPercentage.toFixed(1)}%` : "0.0%"}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">Chassis Thermal State</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {isSimulatingBurst ? "64°C (Surge)" : "42°C (Optimal)"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSimulateBurst}
                  disabled={isSimulatingBurst}
                  className="w-full py-2.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isSimulatingBurst ? "Simulating Ingress Surge..." : "Inject Test Packet Burst"}</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              Viewport Telemetry
            </h2>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Rendering Engine:</span>
                <span className={webglError ? "text-amber-500" : "text-emerald-500"}>
                  {webglError ? "Canvas 2D Orthographic" : "WebGL ACES Tonemapping"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rendered Points:</span>
                <span className="text-slate-900 dark:text-slate-100">{normalizedPoints.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Identified Clusters:</span>
                <span className="text-sky-500 font-bold">{results?.numClusters || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Outlier Noise Points:</span>
                <span className="text-red-500 font-bold">{results?.numAnomalies || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// INTERACTIVE FALLBACK 2D CANVAS COMPONENT
// Renders when WebGL context cannot be created in sandboxed browsers
// =====================================================================
interface FallbackCanvasProps {
  points: Array<{ idx: number; x: number; y: number; z: number; label: number; isNoise: boolean }>;
  centroids: Array<{ label: number; x: number; y: number; z: number; radius: number; color: string }>;
  autoRotate: boolean;
  rotationSpeed: number;
  pointScale: number;
  showGrid: boolean;
  showHulls: boolean;
  filterMode: number | "all" | "anomalies_only";
  selectedIdx: number | null;
  hoveredIdx: number | null;
  onSelectPoint: (idx: number) => void;
  onHoverPoint: (idx: number | null) => void;
  onRetry: () => void;
  height: number;
}

const InteractiveFallbackCanvas: React.FC<FallbackCanvasProps> = ({
  points,
  centroids,
  autoRotate,
  rotationSpeed,
  pointScale,
  showGrid,
  showHulls,
  filterMode,
  selectedIdx,
  hoveredIdx,
  onSelectPoint,
  onHoverPoint,
  onRetry,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yawRef = useRef<number>(0.4);
  const pitchRef = useRef<number>(0.3);
  const targetYawRef = useRef<number>(0.4);
  const targetPitchRef = useRef<number>(0.3);
  const zoomRef = useRef<number>(36);
  const targetZoomRef = useRef<number>(36);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    // Shared 3D to 2D projection function
    const projectPoint = (x: number, y: number, z: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const zoom = zoomRef.current;
      const yaw = yawRef.current;
      const pitch = pitchRef.current;

      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;
      const depth = 25 + z2;
      const scale = (zoom * 20) / Math.max(5, depth);
      return {
        sx: cx + x1 * scale,
        sy: cy - y2 * scale,
        depth: z2,
      };
    };

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (autoRotate && !isDraggingRef.current) {
        targetYawRef.current += dt * 0.35 * rotationSpeed;
      }

      // Smooth physics lerp interpolation (buttery smooth inertia)
      yawRef.current += (targetYawRef.current - yawRef.current) * 0.14;
      pitchRef.current += (targetPitchRef.current - pitchRef.current) * 0.14;
      zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.14;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep obsidian space background
      ctx.fillStyle = "#070b16";
      ctx.fillRect(0, 0, w, h);

      // 1. Draw Projected Ground Grid
      if (showGrid) {
        ctx.strokeStyle = "rgba(2, 132, 199, 0.18)";
        ctx.lineWidth = 1;
        const gridRange = 10;
        const step = 2.5;

        for (let i = -gridRange; i <= gridRange; i += step) {
          const p1 = projectPoint(i, -7, -gridRange);
          const p2 = projectPoint(i, -7, gridRange);
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();

          const p3 = projectPoint(-gridRange, -7, i);
          const p4 = projectPoint(gridRange, -7, i);
          ctx.beginPath();
          ctx.moveTo(p3.sx, p3.sy);
          ctx.lineTo(p4.sx, p4.sy);
          ctx.stroke();
        }
      }

      // 2. Draw Projected Centroid Beacons and Hulls
      centroids.forEach((c) => {
        if (filterMode !== "all" && filterMode !== c.label) return;
        const cp = projectPoint(c.x, c.y, c.z);

        if (showHulls) {
          ctx.beginPath();
          const rScreen = (c.radius * zoomRef.current * 18) / 25;
          ctx.arc(cp.sx, cp.sy, Math.max(12, rScreen), 0, Math.PI * 2);
          ctx.strokeStyle = `${c.color}40`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = `${c.color}10`;
          ctx.fill();
        }

        // Floating diamond centroid
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(cp.sx, cp.sy, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Project and Sort Data Points by Depth
      const projectedPoints = points
        .filter((p) => {
          if (filterMode === "anomalies_only" && !p.isNoise) return false;
          if (typeof filterMode === "number" && p.label !== filterMode) return false;
          return true;
        })
        .map((p) => {
          const pr = projectPoint(p.x, p.y, p.z);
          return { ...p, ...pr };
        })
        .sort((a, b) => a.depth - b.depth);

      // 4. Render Projected Data Points
      projectedPoints.forEach((p) => {
        const isHovered = hoveredIdx === p.idx;
        const isSelected = selectedIdx === p.idx;
        const radius = Math.max(3, (p.isNoise ? 5.5 : 4.0) * (pointScale / 2));

        if (p.isNoise) {
          // Anomaly Point: Glowing Red Diamond
          ctx.fillStyle = isHovered || isSelected ? "#ff4444" : "#ef4444";
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy - radius * 1.3);
          ctx.lineTo(p.sx + radius * 1.3, p.sy);
          ctx.lineTo(p.sx, p.sy + radius * 1.3);
          ctx.lineTo(p.sx - radius * 1.3, p.sy);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Hazard Ring
          ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius * 2.2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Normal Point
          const color = CLUSTER_COLORS[p.label % CLUSTER_COLORS.length];
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = isHovered || isSelected ? 10 : 3;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Selection / Hover Reticle
        if (isSelected || isHovered) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    };

    animId = requestAnimationFrame(render);

    // Mouse interaction for rotation and point selection
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        targetYawRef.current += dx * 0.007;
        targetPitchRef.current = Math.max(-1.3, Math.min(1.3, targetPitchRef.current + dy * 0.007));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Point hover detection
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let closestIdx: number | null = null;
        let minDist = 14;

        points.forEach((p) => {
          const pr = projectPoint(p.x, p.y, p.z);
          const dist = Math.hypot(pr.sx - mx, pr.sy - my);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = p.idx;
          }
        });
        onHoverPoint(closestIdx);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
      }
      // Click detection
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closestIdx: number | null = null;
      let minDist = 16;

      points.forEach((p) => {
        const pr = projectPoint(p.x, p.y, p.z);
        const dist = Math.hypot(pr.sx - mx, pr.sy - my);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = p.idx;
        }
      });

      if (closestIdx !== null) {
        onSelectPoint(closestIdx);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoomRef.current = Math.max(16, Math.min(64, targetZoomRef.current - e.deltaY * 0.025));
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [
    points,
    centroids,
    autoRotate,
    rotationSpeed,
    pointScale,
    showGrid,
    showHulls,
    filterMode,
    selectedIdx,
    hoveredIdx,
  ]);

  return (
    <div className="relative w-full h-full flex flex-col justify-between">
      {/* Notice Banner */}
      <div className="absolute top-14 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-amber-500/40 p-2.5 rounded text-xs flex items-center justify-between text-slate-200 z-10 shadow-lg">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            WebGL unavailable in current browser sandbox. Rendering with high-performance Canvas 2D Orthographic Engine. Drag to rotate, scroll to zoom.
          </span>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 text-[11px] font-semibold transition-colors shrink-0 ml-3"
        >
          <RotateCw className="w-3 h-3" />
          <span>Retry WebGL</span>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={960}
        height={height}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
};
