import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Box,
  RotateCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Eye,
  Sliders,
  Play,
  Pause,
  Layers,
  ShieldAlert,
  Server,
  Network,
  RefreshCw,
  Info,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Cpu,
  Sparkles,
  Compass,
  Video,
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

  // Main Three.js Scene Setup & Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene & Deep Atmosphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Theme color palettes
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

    // 3. Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

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

    // Key Light (Crisp Cool White with warm specular)
    const keyLight = new THREE.DirectionalLight(0xf0fdf4, 2.4);
    keyLight.position.set(22, 32, 22);
    scene.add(keyLight);

    // Fill Light (Electric Indigo / Violet)
    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.5);
    fillLight.position.set(-22, -12, -20);
    scene.add(fillLight);

    // Rim Light (Cyan Highlight from behind)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(0, -25, -28);
    scene.add(rimLight);

    // Dynamic Central Point Glow
    const centerPointLight = new THREE.PointLight(0x38bdf8, 1.8, 45);
    centerPointLight.position.set(0, 2, 0);
    scene.add(centerPointLight);

    // Alert Beacon Point Light
    const alertPointLight = new THREE.PointLight(0xef4444, 2.0, 35);
    alertPointLight.position.set(0, 0, 0);
    scene.add(alertPointLight);

    // Animated Dynamic Objects Store
    const dynamicObjects: {
      anomalies: THREE.Mesh[];
      anomalyRings: THREE.Mesh[];
      beacons: THREE.Mesh[];
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
      beacons: [],
      radarRings: [],
      fans: [],
      radioWaves: [],
      sentinel: null,
      packets: [],
      rotators: [],
    };

    // A. Cosmic Starfield / Cyber Dust Particles
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

    // B. Holographic Target Reticle for Hovered/Selected Point
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

    // 4 Corner Brackets for Reticle
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

    // -----------------------------------------------------------------
    // BUILD SCENE ACCORDING TO ACTIVE MODEL MODE
    // -----------------------------------------------------------------
    if (modelMode === "cluster_space") {
      // -------------------------------------------------------------
      // MODE 1: CLUSTER SPACE 3D MODEL (PCA 3D Feature Space)
      // -------------------------------------------------------------

      // 1. Dual Holographic Cyber Ground Grid
      if (showGrid) {
        // Inner Fine Grid
        const gridFine = new THREE.GridHelper(26, 26, 0x0284c7, 0x1e293b);
        gridFine.position.y = -8;
        scene.add(gridFine);

        // Outer Hex/Radial Radar Sweep Ring
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

      // 2. 3D Coordinate Reference Axes with Glowing Arrow Heads
      const axisLen = 10;
      // PC1 (X - Red)
      const arrowX = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        axisLen,
        0xef4444,
        1.0,
        0.5
      );
      scene.add(arrowX);

      // PC2 (Y - Green)
      const arrowY = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        axisLen,
        0x10b981,
        1.0,
        0.5
      );
      scene.add(arrowY);

      // PC3 (Z - Blue)
      const arrowZ = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        axisLen,
        0x38bdf8,
        1.0,
        0.5
      );
      scene.add(arrowZ);

      // 3. Coordinate Box Cage
      if (showWireframeBox) {
        const boxGeo = new THREE.BoxGeometry(16, 16, 16);
        const boxEdges = new THREE.EdgesGeometry(boxGeo);
        const boxMat = new THREE.LineBasicMaterial({
          color: 0x334155,
          transparent: true,
          opacity: 0.5,
        });
        const wireframeBox = new THREE.LineSegments(boxEdges, boxMat);
        scene.add(wireframeBox);
      }

      // 4. Cluster Hulls, Centroids & Holographic Beacons
      clusterCentroids.forEach((c) => {
        if (filterMode !== "all" && filterMode !== c.label) return;

        // A. Translucent Forcefield Bubble Shell
        if (showClusterHulls) {
          const hullGeo = new THREE.IcosahedronGeometry(c.radius, 2);
          // Wireframe outer cage
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

          // Inner soft glowing forcefield volume
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

        // B. Holographic Vertical Light Beam Pillar from Floor to Centroid
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

        // C. Centroid Core Floating Diamond Beacon
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
        dynamicObjects.rotators.push({ obj: centerMesh, speed: 0.015, axis: "x" });

        // Outer Beacon Ring
        const ringGeo = new THREE.TorusGeometry(0.75, 0.04, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(c.color),
          transparent: true,
          opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(c.x, c.y, c.z);
        ring.rotation.x = Math.PI / 3;
        scene.add(ring);
        dynamicObjects.rotators.push({ obj: ring, speed: 0.025, axis: "z" });
      });

      // 5. Data Points: Glassy Crystal Spheres & Pulsing Anomaly Rubies
      const sphereGeo = new THREE.SphereGeometry(0.18 * pointScale, 20, 20);
      const octaGeo = new THREE.OctahedronGeometry(0.28 * pointScale, 0);

      normalizedPoints.forEach((p) => {
        if (filterMode === "anomalies_only" && !p.isNoise) return;
        if (typeof filterMode === "number" && p.label !== filterMode) return;

        if (p.isNoise) {
          // Anomaly Point: Glowing Red Ruby Crystal + Dual Hazard Halos
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

          // Outer Spinning Hazard Wireframe Cage
          const cageGeo = new THREE.IcosahedronGeometry(0.42 * pointScale, 0);
          const cageMat = new THREE.MeshBasicMaterial({
            color: 0xff3b30,
            wireframe: true,
            transparent: true,
            opacity: 0.85,
          });
          const cageMesh = new THREE.Mesh(cageGeo, cageMat);
          cageMesh.position.set(p.x, p.y, p.z);
          scene.add(cageMesh);
          dynamicObjects.rotators.push({ obj: cageMesh, speed: 0.03, axis: "y" });

          // Pulsing Anomaly Halo Ring
          const haloGeo = new THREE.RingGeometry(0.5 * pointScale, 0.62 * pointScale, 24);
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
          // Standard Cluster Point: Glossy Physical Sphere
          const colorHex = CLUSTER_COLORS[p.label % CLUSTER_COLORS.length];
          const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(colorHex),
            emissive: new THREE.Color(colorHex),
            emissiveIntensity: 0.35,
            roughness: 0.2,
            metalness: 0.15,
            clearcoat: 0.85,
            clearcoatRoughness: 0.05,
          });
          const mesh = new THREE.Mesh(sphereGeo, mat);
          mesh.position.set(p.x, p.y, p.z);
          mesh.userData = { pointIdx: p.idx, isNoise: false, label: p.label };
          scene.add(mesh);
        }
      });
    } else {
      // -------------------------------------------------------------
      // MODE 2: 3D CYBER DEFENSE & NETWORK TOPOLOGY MODEL
      // -------------------------------------------------------------

      // 1. High-Tech Cyber Grid Platform
      const grid = new THREE.GridHelper(32, 32, 0x0284c7, 0x0f172a);
      grid.position.y = -4;
      scene.add(grid);

      // Radar Concentric Circles on Ground Floor
      const radarFloorGeo = new THREE.RingGeometry(14, 14.3, 64);
      const radarFloorMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const radarFloor = new THREE.Mesh(radarFloorGeo, radarFloorMat);
      radarFloor.rotation.x = Math.PI / 2;
      radarFloor.position.y = -3.95;
      scene.add(radarFloor);
      dynamicObjects.radarRings.push(radarFloor);

      // Node Coordinates for Enterprise Topology
      const topologyNodes: Record<string, { pos: [number, number, number]; label: string; type: string; color: number }> = {
        gw_edge: { pos: [-11, 0, 0], label: "Edge Gateway Router", type: "router", color: 0x38bdf8 },
        fw_dmz: { pos: [-5, 1, 0], label: "Perimeter NextGen Firewall", type: "firewall", color: 0xf59e0b },
        srv_app: { pos: [2, 2, -5], label: "API Cluster Rack", type: "server", color: 0x34d399 },
        srv_compute: { pos: [2, 2, 5], label: "Compute Node Rack", type: "server", color: 0x60a5fa },
        db_core: { pos: [9, 0, 0], label: "Core Enterprise Database", type: "database", color: 0xa78bfa },
        sec_siem: { pos: [3, 4.5, 0], label: "AI Sentinel Drone", type: "sentinel", color: 0xef4444 },
      };

      // 2. Build Physical Hardware Cabinets & Devices
      Object.entries(topologyNodes).forEach(([id, node]) => {
        const group = new THREE.Group();
        group.position.set(...node.pos);
        group.userData = { deviceId: id, label: node.label, type: node.type };

        if (node.type === "server") {
          // A. 3D Server Rack Cabinet with Chamfered Corners
          const rackGeo = new THREE.BoxGeometry(2.6, 5.0, 2.2);
          const rackMat = new THREE.MeshStandardMaterial({
            color: 0x111827,
            metalness: 0.85,
            roughness: 0.25,
          });
          const rackMesh = new THREE.Mesh(rackGeo, rackMat);
          rackMesh.position.y = 1.5;
          group.add(rackMesh);

          // Front Beveled Glass Door with Clearcoat Reflection
          const doorGeo = new THREE.BoxGeometry(2.4, 4.7, 0.08);
          const doorMat = new THREE.MeshPhysicalMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.25,
            roughness: 0.1,
            metalness: 0.2,
            clearcoat: 1.0,
          });
          const door = new THREE.Mesh(doorGeo, doorMat);
          door.position.set(0, 1.5, 1.14);
          group.add(door);

          // 8 Server Blades with Status LEDs
          for (let slot = 0; slot < 8; slot++) {
            const bladeGeo = new THREE.BoxGeometry(2.3, 0.45, 0.05);
            const isAlert = results && results.numAnomalies > 0 && (slot === 3 || slot === 5);
            const bladeMat = new THREE.MeshStandardMaterial({
              color: 0x1f2937,
              metalness: 0.9,
              roughness: 0.2,
            });
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.set(0, slot * 0.58 - 0.55, 1.11);
            group.add(blade);

            // Dual Blade Status LEDs
            const led1Geo = new THREE.SphereGeometry(0.06, 8, 8);
            const led1Mat = new THREE.MeshBasicMaterial({
              color: isAlert ? 0xef4444 : 0x10b981,
            });
            const led1 = new THREE.Mesh(led1Geo, led1Mat);
            led1.position.set(-0.95, slot * 0.58 - 0.55, 1.15);
            group.add(led1);

            const led2Geo = new THREE.SphereGeometry(0.06, 8, 8);
            const led2Mat = new THREE.MeshBasicMaterial({
              color: isAlert ? 0xf59e0b : 0x38bdf8,
            });
            const led2 = new THREE.Mesh(led2Geo, led2Mat);
            led2.position.set(-0.75, slot * 0.58 - 0.55, 1.15);
            group.add(led2);
          }

          // Rear Exhaust Fan Blades
          const fanGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 6);
          const fanMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 });
          const fan = new THREE.Mesh(fanGeo, fanMat);
          fan.rotation.x = Math.PI / 2;
          fan.position.set(0, 2.8, -1.14);
          group.add(fan);
          dynamicObjects.fans.push(fan);

          // Top Holographic Beacon
          const beaconGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.45, 16);
          const beaconMat = new THREE.MeshStandardMaterial({
            color: node.color,
            emissive: node.color,
            emissiveIntensity: 1.6,
          });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.y = 4.2;
          group.add(beacon);
          dynamicObjects.rotators.push({ obj: beacon, speed: 0.02, axis: "y" });
        } else if (node.type === "router") {
          // B. 3D High-Gain Gateway Router
          const routerGeo = new THREE.CylinderGeometry(1.8, 2.0, 1.3, 32);
          const routerMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.85,
            roughness: 0.25,
          });
          const routerMesh = new THREE.Mesh(routerGeo, routerMat);
          group.add(routerMesh);

          // Spinning Signal Ring
          const ringGeo = new THREE.TorusGeometry(1.9, 0.09, 16, 40);
          const ringMat = new THREE.MeshStandardMaterial({
            color: node.color,
            emissive: node.color,
            emissiveIntensity: 2.0,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
          dynamicObjects.rotators.push({ obj: ring, speed: 0.03, axis: "z" });

          // 4 High-Gain Antennas
          for (let a = 0; a < 4; a++) {
            const angle = (a * Math.PI) / 2;
            const antGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);
            const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
            const ant = new THREE.Mesh(antGeo, antMat);
            ant.position.set(Math.cos(angle) * 1.1, 1.4, Math.sin(angle) * 1.1);
            ant.rotation.z = Math.cos(angle) * 0.2;
            ant.rotation.x = Math.sin(angle) * 0.2;
            group.add(ant);

            // Glowing Antenna Tip
            const tipGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const tipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.position.set(Math.cos(angle) * 1.35, 2.6, Math.sin(angle) * 1.35);
            group.add(tip);
          }

          // Expanding Radio Pulse Wave Ring
          const waveGeo = new THREE.RingGeometry(2.0, 2.15, 32);
          const waveMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          });
          const wave = new THREE.Mesh(waveGeo, waveMat);
          wave.rotation.x = Math.PI / 2;
          wave.position.y = 1.0;
          group.add(wave);
          dynamicObjects.radioWaves.push(wave);
        } else if (node.type === "firewall") {
          // C. 3D Perimeter Hexagonal Shield
          const fwGeo = new THREE.CylinderGeometry(2.0, 2.0, 2.6, 6);
          const fwMat = new THREE.MeshPhysicalMaterial({
            color: 0xf59e0b,
            wireframe: true,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.9,
          });
          const fwMesh = new THREE.Mesh(fwGeo, fwMat);
          group.add(fwMesh);
          dynamicObjects.rotators.push({ obj: fwMesh, speed: 0.015, axis: "y" });

          // Inner Glowing Security Core Gem
          const gemGeo = new THREE.OctahedronGeometry(0.95, 0);
          const gemMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xf59e0b,
            emissiveIntensity: 1.8,
            roughness: 0.1,
          });
          const gem = new THREE.Mesh(gemGeo, gemMat);
          group.add(gem);
          dynamicObjects.rotators.push({ obj: gem, speed: -0.02, axis: "x" });
        } else if (node.type === "database") {
          // D. Multi-Tiered Holographic Storage Drums
          const dbGeo = new THREE.CylinderGeometry(1.6, 1.6, 3.0, 32);
          const dbMat = new THREE.MeshStandardMaterial({
            color: 0x1e1b4b,
            metalness: 0.85,
            roughness: 0.2,
          });
          const dbMesh = new THREE.Mesh(dbGeo, dbMat);
          group.add(dbMesh);

          // Counter-Rotating Magnetic Flux Bands
          for (let d = 0; d < 3; d++) {
            const diskGeo = new THREE.TorusGeometry(1.68, 0.07, 12, 32);
            const diskMat = new THREE.MeshStandardMaterial({
              color: node.color,
              emissive: node.color,
              emissiveIntensity: 1.8,
            });
            const disk = new THREE.Mesh(diskGeo, diskMat);
            disk.rotation.x = Math.PI / 2;
            disk.position.y = d * 0.9 - 0.9;
            group.add(disk);
            dynamicObjects.rotators.push({ obj: disk, speed: 0.03 * (d % 2 === 0 ? 1 : -1), axis: "z" });
          }
        } else {
          // E. Floating Sentinel Quad-Drone (SIEM)
          const sentinelGroup = new THREE.Group();
          const droneGeo = new THREE.IcosahedronGeometry(1.2, 1);
          const droneMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xef4444,
            emissiveIntensity: 1.8,
            wireframe: true,
          });
          const drone = new THREE.Mesh(droneGeo, droneMat);
          sentinelGroup.add(drone);

          // Scanning Cone Laser
          const coneGeo = new THREE.ConeGeometry(2.5, 4.5, 16, 1, true);
          const coneMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
          });
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.rotation.x = Math.PI;
          cone.position.y = -2.25;
          sentinelGroup.add(cone);

          group.add(sentinelGroup);
          dynamicObjects.sentinel = sentinelGroup;
          dynamicObjects.rotators.push({ obj: drone, speed: 0.02, axis: "y" });
        }

        scene.add(group);
      });

      // 3. 3D Fiber-Optic Bus Cables with Glowing Light Conduit Tubes
      const links: [string, string][] = [
        ["gw_edge", "fw_dmz"],
        ["fw_dmz", "srv_app"],
        ["fw_dmz", "srv_compute"],
        ["srv_app", "db_core"],
        ["srv_compute", "db_core"],
        ["srv_app", "sec_siem"],
        ["srv_compute", "sec_siem"],
        ["fw_dmz", "sec_siem"],
      ];

      links.forEach(([srcKey, dstKey]) => {
        const srcPos = new THREE.Vector3(...topologyNodes[srcKey].pos);
        const dstPos = new THREE.Vector3(...topologyNodes[dstKey].pos);

        // Elegant curved path with midpoint arch
        const midPos = new THREE.Vector3()
          .addVectors(srcPos, dstPos)
          .multiplyScalar(0.5);
        midPos.y += 1.5;

        const curve = new THREE.CatmullRomCurve3([srcPos, midPos, dstPos]);

        // Glowing 3D Glass Conduit Tube
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.08, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.45,
          roughness: 0.2,
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        scene.add(tube);

        // Animated 3D Data Packets travelling on each curve
        const numPackets = 4;
        for (let k = 0; k < numPackets; k++) {
          const isAnomalyPacket = (srcKey === "gw_edge" || srcKey === "fw_dmz") && (k % 2 === 0);
          const pGeo = new THREE.SphereGeometry(isAnomalyPacket ? 0.26 : 0.16, 12, 12);
          const pMat = new THREE.MeshStandardMaterial({
            color: isAnomalyPacket ? 0xff2222 : 0x38bdf8,
            emissive: isAnomalyPacket ? 0xff1111 : 0x38bdf8,
            emissiveIntensity: 2.2,
          });
          const packetMesh = new THREE.Mesh(pGeo, pMat);
          scene.add(packetMesh);

          dynamicObjects.packets.push({
            mesh: packetMesh,
            curve,
            progress: k / numPackets,
            speed: 0.007 + Math.random() * 0.005,
            isAnomaly: isAnomalyPacket,
          });
        }
      });
    }

    // -----------------------------------------------------------------
    // RAYCASTING & INTERACTIVE HOVER/CLICK
    // -----------------------------------------------------------------
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
            // Snap reticle to point position
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

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData.pointIdx && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData.pointIdx !== undefined) {
          setHoveredPointIdx(hitObj.userData.pointIdx);
          if (targetReticleRef.current) {
            targetReticleRef.current.position.copy(hitObj.position);
            targetReticleRef.current.visible = true;
          }
        } else {
          setHoveredPointIdx(null);
          if (selectedPointIdx === null && targetReticleRef.current) {
            targetReticleRef.current.visible = false;
          }
        }
      } else {
        setHoveredPointIdx(null);
        if (selectedPointIdx === null && targetReticleRef.current) {
          targetReticleRef.current.visible = false;
        }
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);
    renderer.domElement.addEventListener("mousemove", handlePointerMove);

    // -----------------------------------------------------------------
    // ANIMATION & RENDER LOOP
    // -----------------------------------------------------------------
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Controls update
      controls.autoRotate = autoRotate && !isCinematicOrbit;
      controls.autoRotateSpeed = rotationSpeed * 1.5;
      controls.update();

      // Cinematic Orbit Glide
      if (isCinematicOrbit) {
        const radius = 26;
        const camX = Math.sin(elapsedTime * 0.25) * radius;
        const camZ = Math.cos(elapsedTime * 0.25) * radius;
        const camY = 14 + Math.sin(elapsedTime * 0.5) * 4;
        camera.position.set(camX, camY, camZ);
        camera.lookAt(0, 0, 0);
      }

      // Reticle Billboard orientation to face camera
      if (targetReticleRef.current && targetReticleRef.current.visible) {
        targetReticleRef.current.lookAt(camera.position);
        targetReticleRef.current.rotation.z += 0.02;
      }

      // Pulse Anomaly points & hazard cages
      dynamicObjects.anomalies.forEach((mesh) => {
        const s = 1 + Math.sin(elapsedTime * 6) * 0.28;
        mesh.scale.set(s, s, s);
      });

      // Animate Anomaly Halo Rings
      dynamicObjects.anomalyRings.forEach((ring) => {
        const s = 1 + Math.cos(elapsedTime * 4) * 0.35;
        ring.scale.set(s, s, 1);
        ring.lookAt(camera.position);
      });

      // Pulse Radar Rings on Floor
      dynamicObjects.radarRings.forEach((r, idx) => {
        const s = 1 + Math.sin(elapsedTime * 2 + idx) * 0.05;
        r.scale.set(s, s, 1);
      });

      // Spin Rear Server Cooling Fans
      dynamicObjects.fans.forEach((fan) => {
        fan.rotation.z += 0.15;
      });

      // Expand Radio Pulse Waves from Router
      dynamicObjects.radioWaves.forEach((w) => {
        const progress = (elapsedTime * 0.8) % 1;
        const s = 1 + progress * 2.5;
        w.scale.set(s, s, 1);
        (w.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 * (1 - progress));
      });

      // Hover Sentinel Drone with gentle bobbing
      if (dynamicObjects.sentinel) {
        dynamicObjects.sentinel.position.y = Math.sin(elapsedTime * 2) * 0.4;
      }

      // Generic Rotators
      dynamicObjects.rotators.forEach((item) => {
        if (item.axis === "y") item.obj.rotation.y += item.speed;
        if (item.axis === "x") item.obj.rotation.x += item.speed;
        if (item.axis === "z") item.obj.rotation.z += item.speed;
      });

      // Animate 3D Data Packets along Spline Curves
      dynamicObjects.packets.forEach((p) => {
        p.progress += p.speed * (isSimulatingBurst ? 2.8 : 1);
        if (p.progress > 1) p.progress = 0;
        const pointOnCurve = p.curve.getPointAt(p.progress);
        p.mesh.position.copy(pointOnCurve);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
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
      renderer.domElement.removeEventListener("click", handlePointerDown);
      renderer.domElement.removeEventListener("mousemove", handlePointerMove);
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
  ]);

  // Camera Presets
  const setCameraView = (type: "iso" | "top" | "front" | "side") => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    setIsCinematicOrbit(false);

    if (type === "iso") {
      camera.position.set(19, 15, 23);
    } else if (type === "top") {
      camera.position.set(0, 34, 0.001);
    } else if (type === "front") {
      camera.position.set(0, 0, 34);
    } else if (type === "side") {
      camera.position.set(34, 0, 0);
    }
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const resetCamera = () => {
    setCameraView("iso");
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

  // Inspect hovered/selected point
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto" : ""}`}>
      {/* Top Header & Architectural Segmented Switcher */}
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
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  WebGL 60 FPS
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                High-fidelity Three.js viewport for multi-dimensional PCA cluster geometry and enterprise cyber defense infrastructure.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
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

        {/* Unboxed Metadata & Visual Telemetry Bar (Zero-Pill Discipline) */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-3">
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Damping OrbitControls Active</span>
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

          {/* Theme Palette Switcher */}
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

      {/* Main 3D Viewport & Inspector Layout */}
      <div ref={viewportWrapperRef} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3/4: High-Fidelity Three.js Viewport */}
        <div className="lg:col-span-3 flex flex-col space-y-3">
          <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-xl group">
            {/* Three.js Canvas Container */}
            <div
              ref={containerRef}
              className={`w-full ${isFullscreen ? "h-[750px]" : "h-[580px]"} cursor-grab active:cursor-grabbing select-none`}
            />

            {/* Floating Top Control HUD */}
            <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-1.5 rounded shadow-lg text-xs z-10">
              {/* Auto Spin Toggle */}
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

              {/* Cinematic Flythrough Camera Button */}
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

              {/* Camera Perspective Presets */}
              <button
                onClick={() => setCameraView("iso")}
                className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]"
                title="Isometric Perspective"
              >
                ISO
              </button>
              <button
                onClick={() => setCameraView("top")}
                className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]"
                title="Top-Down View (PC1 vs PC2)"
              >
                TOP
              </button>
              <button
                onClick={() => setCameraView("front")}
                className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]"
                title="Front View (PC1 vs PC3)"
              >
                FRONT
              </button>
              <button
                onClick={() => setCameraView("side")}
                className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded font-mono text-[11px]"
                title="Side View (PC2 vs PC3)"
              >
                SIDE
              </button>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5"></div>

              {modelMode === "cluster_space" && (
                <button
                  onClick={focusOnAnomalies}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-950/70 text-red-300 border border-red-800 hover:bg-red-900/70 rounded text-[11px] font-medium"
                  title="Align camera directly onto Anomaly outliers"
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
                  <span>{isSimulatingBurst ? "Packet Burst Active..." : "Simulate Anomaly Burst"}</span>
                </button>
              )}

              <button
                onClick={resetCamera}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                title="Reset Camera Position"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                title={isFullscreen ? "Exit Fullscreen" : "Immersive Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bottom Cyber Legend HUD */}
            <div className="absolute bottom-3.5 left-3.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded shadow-lg text-[11px] font-mono text-slate-300 flex items-center space-x-4 z-10">
              {modelMode === "cluster_space" ? (
                <>
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
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>Cluster 2+</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
                    <span>Server Cabinet</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                    <span>Edge Router</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
                    <span>Perimeter Shield</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-red-400">Attack Surge</span>
                  </div>
                </>
              )}
            </div>

            {/* Empty State Banner with Immediate Action */}
            {(!results || !pca3D) && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <Box className="w-12 h-12 text-sky-400 animate-pulse mb-3" />
                <h2 className="text-base font-semibold text-slate-100">3D Clustering Space Standby</h2>
                <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                  Run DBSCAN anomaly detection or launch the synthetic network benchmark to visualize multi-dimensional coordinate projections in true 3D space.
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

          {/* Quick Visual Configuration Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-6">
              {/* Rotation speed */}
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

              {/* Point scale slider */}
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

            {/* Architectural Toggles */}
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

        {/* Right 1/4: Interactive 3D Spatial Inspector HUD */}
        <div className="space-y-4">
          {modelMode === "cluster_space" ? (
            /* 3D Point Inspector */
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
                  {/* Status Banner */}
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

                  {/* 3D Projected Coordinates */}
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

                  {/* Multi-Dimensional Feature Metrics */}
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
            /* 3D Cyber Device Inspector */
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
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">Firewall Shield Mode</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">Heuristic Isolation</span>
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

          {/* 3D WebGL Pipeline Metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              Viewport Telemetry
            </h2>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Shading Engine:</span>
                <span className="text-slate-900 dark:text-slate-100">Physical Clearcoat</span>
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
