import * as THREE from 'three';
import { createBrickTexture, createRoofTexture, createWindowTexture } from './materials';
import { applyAtmosphericPerspective } from './atmosphericFogSystem';

export const HOUSE_PALETTES = [
  { main: 0xf59e0b, accent: 0xd97706, trim: 0xffffff },
  { main: 0x3b82f6, accent: 0x1d4ed8, trim: 0xf8fafc },
  { main: 0x10b981, accent: 0x047857, trim: 0xf0fdf4 },
  { main: 0xef4444, accent: 0xb91c1c, trim: 0xffedd5 },
  { main: 0xec4899, accent: 0xbe185d, trim: 0xfdf2f8 },
  { main: 0x8b5cf6, accent: 0x6d28d9, trim: 0xf5f3ff },
  { main: 0xe2e8f0, accent: 0x475569, trim: 0x1e293b },
  { main: 0xd97706, accent: 0x78350f, trim: 0xfef3c7 },
];

let sharedMaterials: Record<string, THREE.Material> | null = null;

export function getSharedMaterials(): Record<string, THREE.Material> {
  if (sharedMaterials) return sharedMaterials;

  const brickTex = createBrickTexture();
  const roofTex = createRoofTexture();

  sharedMaterials = {
    brick: new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85 }),
    roofTiles: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.7 }),
    curb: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.88 }),
    waterTank: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.1 }),
    metalGate: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 }),
    concretePole: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 }),
    wire: new THREE.MeshBasicMaterial({ color: 0x0f172a }),
    lampBulbDay: new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0x000000 }),
    lampBulbNight: new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 2.5 }),
    acUnit: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
    palmTrunk: new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 }),
    palmLeaves: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 }),
    ipeFlowersYellow: new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }), // Lush Emerald Green
    ipeFlowersPink: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }), // Rich Forest Green
    grass: new THREE.MeshStandardMaterial({ color: 0x2e5e1e, roughness: 0.92 }),
    stairs: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }),
    speedBumpYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 }),
    speedBumpBlack: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.08 }),
    carGlass: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.9 }),
    rubberTire: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }),
  };

  Object.entries(sharedMaterials).forEach(([key, mat]) => {
    mat.userData.isShared = true;
    let lod: 'small_prop' | 'foliage' | 'scenery' | 'road_terrain' = 'scenery';
    if (key.includes('palm') || key.includes('ipe') || key.includes('grass')) lod = 'foliage';
    else if (key.includes('speedBump') || key.includes('lamp') || key.includes('acUnit')) lod = 'small_prop';
    else if (key.includes('curb')) lod = 'road_terrain';
    applyAtmosphericPerspective(mat, { lod });
  });

  return sharedMaterials;
}

// 1. BRAZILIAN SPEED BUMP (Lombada com faixas amarelas e pretas)
const bumpWidth = 10.0;
const numStripes = 18;
const stripeW = bumpWidth / numStripes;
let sharedBumpStripeGeo: THREE.CylinderGeometry | null = null;

export function createSpeedBump(): THREE.Group {
  const mats = getSharedMaterials();
  const group = new THREE.Group();
  group.name = 'SpeedBump';
  group.userData = { isScenery: true, isSmallProp: true };

  if (!sharedBumpStripeGeo) {
    sharedBumpStripeGeo = new THREE.CylinderGeometry(0.55, 0.55, stripeW, 8, 1, false, 0, Math.PI);
    sharedBumpStripeGeo.rotateZ(Math.PI / 2);
  }

  for (let s = 0; s < numStripes; s++) {
    const isYellow = s % 2 === 0;
    const stripeMesh = new THREE.Mesh(sharedBumpStripeGeo, isYellow ? mats.speedBumpYellow : mats.speedBumpBlack);
    stripeMesh.position.set(-bumpWidth / 2 + (s + 0.5) * stripeW, 0.06, 0);
    stripeMesh.scale.set(1, 0.28, 1.2);
    stripeMesh.receiveShadow = true;
    group.add(stripeMesh);
  }

  return group;
}

// 2. STREET-SIDE HOUSES
export function createDetailedHouse(typeIndex: number, isNight: boolean): THREE.Group {
  const mats = getSharedMaterials();
  const group = new THREE.Group();
  const palette = HOUSE_PALETTES[Math.floor(Math.random() * HOUSE_PALETTES.length)];
  const houseType = typeIndex % 4;

  const wallMat = new THREE.MeshStandardMaterial({ color: palette.main, roughness: 0.75 });
  const accentMat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.6 });

  const winMat = new THREE.MeshStandardMaterial({
    map: createWindowTexture(isNight),
    roughness: 0.2,
    emissive: isNight ? new THREE.Color(0xfbbf24) : new THREE.Color(0x000000),
    emissiveIntensity: isNight ? 0.8 : 0,
  });

  if (houseType === 0) {
    const w = 4.8, h = 5.8, d = 4.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    body.castShadow = false;
    body.receiveShadow = true;
    group.add(body);

    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.2, 1.1), accentMat);
    balconyFloor.position.set(0, 3.0, d / 2 + 0.45);
    group.add(balconyFloor);

    const railing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.75, 0.05), mats.metalGate);
    railing.position.set(0, 3.45, d / 2 + 0.95);
    group.add(railing);

    const gate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 0.1), mats.metalGate);
    gate.position.set(-0.7, 1.1, d / 2 + 0.05);
    group.add(gate);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.1), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    door.position.set(1.4, 1.0, d / 2 + 0.05);
    group.add(door);

    const win1 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), winMat);
    win1.position.set(-1.1, 4.2, d / 2 + 0.02);
    group.add(win1);

    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), winMat);
    win2.position.set(1.1, 4.2, d / 2 + 0.02);
    group.add(win2);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 0.75, 10), mats.waterTank);
    tank.position.set(1.0, h + 0.45, -0.5);
    group.add(tank);

    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.28), mats.acUnit);
    ac.position.set(-1.5, 3.6, d / 2 + 0.18);
    group.add(ac);

  } else if (houseType === 1) {
    const w = 4.6, h = 3.4, d = 4.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.brick);
    body.position.y = h / 2;
    body.castShadow = false;
    body.receiveShadow = true;
    group.add(body);

    const roofGeo = new THREE.ConeGeometry(3.4, 1.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, mats.roofTiles);
    roof.position.set(0, h + 0.75, 0);
    roof.scale.set(1.2, 1, 1.1);
    group.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.1), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    door.position.set(-0.9, 0.95, d / 2 + 0.05);
    group.add(door);

    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), winMat);
    win.position.set(1.0, 1.7, d / 2 + 0.02);
    group.add(win);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), mats.metalGate);
    dish.position.set(-1.3, h + 1.2, -0.6);
    dish.rotation.x = -0.5;
    group.add(dish);

  } else if (houseType === 2) {
    const w = 5.0, h = 3.9, d = 4.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    group.add(body);

    const toldoGeo = new THREE.BoxGeometry(w * 0.88, 0.12, 1.2);
    toldoGeo.rotateX(0.25);
    const toldo = new THREE.Mesh(toldoGeo, new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    toldo.position.set(0, 2.6, d / 2 + 0.6);
    group.add(toldo);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.55, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: isNight ? new THREE.Color(0xf59e0b) : new THREE.Color(0x000000),
        emissiveIntensity: isNight ? 1.2 : 0,
      })
    );
    sign.position.set(0, 3.3, d / 2 + 0.08);
    group.add(sign);

    const rollGate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 0.08), mats.metalGate);
    rollGate.position.set(0, 1.1, d / 2 + 0.05);
    group.add(rollGate);

    for (let k = 0; k < 3; k++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.38), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
      crate.position.set(1.9, 0.14 + k * 0.28, d / 2 + 0.5);
      group.add(crate);
    }

  } else {
    const w = 4.8, d = 4.4;
    const lotFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), mats.grass);
    lotFloor.position.y = 0.05;
    group.add(lotFloor);

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, 0.2), mats.brick);
    wallBack.position.set(0, 0.9, -d / 2);
    group.add(wallBack);

    const pile = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.7), mats.brick);
    pile.position.set(0.4, 0.25, 0.1);
    group.add(pile);
  }

  return group;
}

// 3. GREEN GRASSY HILLS WITH STACKED FAVELA HOUSES (Otimizado para alto FPS)
export function createFavelaHill(chunkLength: number, side: number): THREE.Group {
  const mats = getSharedMaterials();
  const group = new THREE.Group();

  const grassHill1 = new THREE.Mesh(new THREE.BoxGeometry(14, 4, chunkLength), mats.grass);
  grassHill1.position.set(side * 22, 1.8, 0);
  group.add(grassHill1);

  const grassHill2 = new THREE.Mesh(new THREE.BoxGeometry(14, 6, chunkLength), mats.grass);
  grassHill2.position.set(side * 32, 4.5, 0);
  group.add(grassHill2);

  const grassHill3 = new THREE.Mesh(new THREE.BoxGeometry(14, 8, chunkLength), mats.grass);
  grassHill3.position.set(side * 42, 8.0, 0);
  group.add(grassHill3);

  // Clusters leves e limpos que não sobrecarregam a GPU mobile
  const numClusters = 2;
  for (let c = 0; c < numClusters; c++) {
    const cz = (c / numClusters) * chunkLength - chunkLength / 2 + 10;
    const hx1 = side * (18 + c * 4);
    const hy1 = 1.0;

    const house1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.0, 3.6), mats.brick);
    house1.position.set(hx1, hy1 + 1.5, cz);
    group.add(house1);

    const house2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.5, 3.0), mats.brick);
    house2.position.set(hx1, hy1 + 3.0 + 1.25, cz);
    group.add(house2);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.5, 8), mats.waterTank);
    tank.position.set(hx1, hy1 + 5.5 + 0.28, cz);
    group.add(tank);
  }

  return group;
}

// 4. UTILITY POLES
export function createStreetLightPole(isNight: boolean): THREE.Group {
  const mats = getSharedMaterials();
  const group = new THREE.Group();

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7.5, 8), mats.concretePole);
  pole.position.y = 3.75;
  pole.castShadow = false;
  group.add(pole);

  const crossarm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), mats.metalGate);
  crossarm.position.set(0, 6.8, 0);
  group.add(crossarm);

  const trans = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 8), mats.metalGate);
  trans.position.set(0.35, 5.8, 0);
  trans.castShadow = false;
  group.add(trans);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.8), mats.metalGate);
  arm.position.set(0, 6.2, 0.8);
  arm.rotation.x = -0.15;
  group.add(arm);

  const lampBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.6), mats.metalGate);
  lampBody.position.set(0, 6.0, 1.6);
  group.add(lampBody);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), isNight ? mats.lampBulbNight : mats.lampBulbDay);
  bulb.position.set(0, 5.9, 1.6);
  group.add(bulb);

  return group;
}

// 5. ULTRA-REALISTIC DETAILED BRAZILIAN TREES (IPÊ, PALMEIRA IMPERIAL & COPA VERDE COM CANTEIRO)
export function createTropicalTree(isIpe: boolean): THREE.Group {
  const mats = getSharedMaterials();
  const group = new THREE.Group();
  group.userData.isTree = true;

  // 1. Canteiro de Calçada em Concreto com Terra Escura
  const planterCurv = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.16, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
  );
  planterCurv.position.y = 0.08;
  group.add(planterCurv);

  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x271911, roughness: 0.95 })
  );
  soil.position.y = 0.14;
  group.add(soil);

  // Raízes aparentes na terra
  for (let r = 0; r < 4; r++) {
    const rootAngle = (r / 4) * Math.PI * 2 + Math.random() * 0.4;
    const rootGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.7, 6);
    rootGeo.rotateZ(Math.PI / 3);
    const root = new THREE.Mesh(rootGeo, mats.palmTrunk);
    root.position.set(Math.cos(rootAngle) * 0.35, 0.14, Math.sin(rootAngle) * 0.35);
    root.rotation.y = rootAngle;
    group.add(root);
  }

  const treeVariant = Math.random();

  if (isIpe || treeVariant < 0.65) {
    // 🌳 ÁRVORES DE COPA VERDE (SOMENTE TONS VERDES NATURAIS E EXUBERANTES)
    group.userData.treeType = 'green';
    const greenMats = [
      mats.ipeFlowersYellow, // 0x16a34a (Verde Esmeralda)
      mats.ipeFlowersPink,   // 0x15803d (Verde Floresta)
      mats.palmLeaves,       // 0x15803d
      mats.grass,            // 0x22c55e (Verde Tropical Vivo)
    ];
    const flowerMat = greenMats[Math.floor(Math.random() * greenMats.length)];

    // Tronco robusto e natural com curvatura
    const trunkHeight = 4.2 + Math.random() * 0.8;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.42, trunkHeight, 10),
      mats.palmTrunk
    );
    trunk.position.y = trunkHeight / 2 + 0.1;
    trunk.rotation.z = (Math.random() - 0.5) * 0.14;
    trunk.castShadow = false;
    group.add(trunk);

    // Galhos primários e secundários bifurcados
    const numBranches = 5;
    for (let b = 0; b < numBranches; b++) {
      const angle = (b / numBranches) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const bLen = 1.6 + Math.random() * 0.6;
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.18, bLen, 7),
        mats.palmTrunk
      );
      branch.position.set(0, trunkHeight * 0.82, 0);
      branch.rotation.y = angle;
      branch.rotation.z = 0.68 + Math.random() * 0.22;
      branch.castShadow = false;
      group.add(branch);
    }

    // Camadas de copa volumosa e orgânica
    const clusters = [
      { x: 0, y: trunkHeight + 1.6, z: 0, s: 2.4 },
      { x: 1.3, y: trunkHeight + 1.1, z: 0.7, s: 1.8 },
      { x: -1.2, y: trunkHeight + 1.0, z: -0.8, s: 1.7 },
      { x: 0.6, y: trunkHeight + 0.9, z: -1.2, s: 1.6 },
      { x: -0.7, y: trunkHeight + 1.2, z: 1.1, s: 1.7 },
      { x: 0.9, y: trunkHeight + 1.8, z: -0.4, s: 1.5 },
      { x: -0.8, y: trunkHeight + 1.7, z: 0.5, s: 1.5 },
    ];

    clusters.forEach((c) => {
      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(c.s, 1),
        flowerMat
      );
      foliage.position.set(c.x, c.y, c.z);
      foliage.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      foliage.castShadow = false;
      group.add(foliage);
    });

  } else {
    // 🌴 PALMEIRA IMPERIAL OU COPA VERDE FRONDOSA
    if (Math.random() > 0.45) {
      // Palmeira Imperial
      group.userData.treeType = 'green';
      const height = 7.0 + Math.random() * 1.5;
      
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.36, height, 10),
        mats.palmTrunk
      );
      trunk.position.y = height / 2 + 0.1;
      trunk.rotation.z = (Math.random() - 0.5) * 0.06;
      trunk.castShadow = false;
      group.add(trunk);

      const crownCore = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 1.1, 8), mats.palmLeaves);
      crownCore.position.set(0, height + 0.4, 0);
      group.add(crownCore);

      const numFronds = 11;
      for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const frondGeo = new THREE.BoxGeometry(0.46, 0.04, 3.2);
        frondGeo.rotateX(0.58);
        const frond = new THREE.Mesh(frondGeo, mats.palmLeaves);
        frond.position.set(0, height + 0.5, 0);
        frond.rotation.y = angle;
        frond.rotation.z = (Math.random() - 0.5) * 0.18;
        frond.castShadow = false;
        group.add(frond);
      }
    } else {
      // Árvore de Sombra Verde Tropical (Mangueira/Figueira)
      group.userData.treeType = 'green';
      const height = 4.5 + Math.random() * 0.7;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.45, height, 10),
        mats.palmTrunk
      );
      trunk.position.y = height / 2 + 0.1;
      group.add(trunk);

      const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const clusters = [
        { x: 0, y: height + 1.4, z: 0, s: 2.6 },
        { x: 1.4, y: height + 0.9, z: 0.5, s: 2.0 },
        { x: -1.3, y: height + 0.8, z: -0.6, s: 1.9 },
        { x: 0, y: height + 0.9, z: -1.4, s: 1.8 },
        { x: 0, y: height + 1.1, z: 1.3, s: 1.8 },
      ];

      clusters.forEach((c) => {
        const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(c.s, 1), greenMat);
        foliage.position.set(c.x, c.y, c.z);
        foliage.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        group.add(foliage);
      });
    }
  }

  return group;
}

// 6. DETAILED CARS
export function createDetailedRealisticCar(): THREE.Group {
  const mats = getSharedMaterials();
  const group = new THREE.Group();

  const isFusca = Math.random() > 0.5;
  const carColors = [0x2563eb, 0xdc2626, 0xfacc15, 0x16a34a, 0xf8fafc, 0x334155];
  const color = carColors[Math.floor(Math.random() * carColors.length)];
  const paintMat = new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.2 });

  if (isFusca) {
    const bodyGeo = new THREE.CapsuleGeometry(0.8, 2.2, 8, 14);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, paintMat);
    body.position.set(0, 0.7, 0);
    body.castShadow = false;
    group.add(body);

    const roofGeo = new THREE.SphereGeometry(0.75, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const roof = new THREE.Mesh(roofGeo, paintMat);
    roof.position.set(0, 1.1, -0.15);
    roof.scale.set(0.92, 0.75, 1.2);
    group.add(roof);

    const bumperFront = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 8), mats.chrome);
    bumperFront.rotation.z = Math.PI / 2;
    bumperFront.position.set(0, 0.35, 1.65);
    group.add(bumperFront);

    const lightL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mats.lampBulbDay);
    lightL.position.set(-0.5, 0.68, 1.45);
    group.add(lightL);

    const lightR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mats.lampBulbDay);
    lightR.position.set(0.5, 0.68, 1.45);
    group.add(lightR);

  } else {
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 3.6), paintMat);
    lowerBody.position.y = 0.55;
    lowerBody.castShadow = false;
    group.add(lowerBody);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.9), mats.carGlass);
    cabin.position.set(0, 1.1, -0.15);
    group.add(cabin);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.05), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    grille.position.set(0, 0.58, 1.81);
    group.add(grille);

    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), mats.lampBulbDay);
    headL.position.set(-0.6, 0.58, 1.81);
    group.add(headL);

    const headR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), mats.lampBulbDay);
    headR.position.set(0.6, 0.58, 1.81);
    group.add(headR);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.9, 0.3, 1.0],
    [0.9, 0.3, 1.0],
    [-0.9, 0.3, -1.0],
    [0.9, 0.3, -1.0],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, mats.rubberTire);
    wheel.position.set(x, y, z);
    wheel.castShadow = false;
    group.add(wheel);
  });

  return group;
}
