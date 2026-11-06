import * as THREE from 'three';
// @ts-ignore
import { getSharedMaterials } from './sceneryModels';

let cachedStreetLightPoolTex: THREE.CanvasTexture | null = null;
function getStreetLightPoolTexture(): THREE.Texture {
  if (cachedStreetLightPoolTex) return cachedStreetLightPoolTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.clearRect(0, 0, 512, 512);

    // Multi-stop ultra-soft radial gradient tapering smoothly to transparent well before canvas edge
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 220);
    grad.addColorStop(0.0, 'rgba(255, 248, 220, 0.70)');
    grad.addColorStop(0.18, 'rgba(254, 225, 120, 0.52)');
    grad.addColorStop(0.38, 'rgba(251, 191, 36, 0.32)');
    grad.addColorStop(0.60, 'rgba(245, 158, 11, 0.16)');
    grad.addColorStop(0.80, 'rgba(217, 119, 6, 0.05)');
    grad.addColorStop(0.94, 'rgba(180, 83, 9, 0.01)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(256, 256, 220, 0, Math.PI * 2);
    ctx.fill();

    cachedStreetLightPoolTex = new THREE.CanvasTexture(canvas);
    cachedStreetLightPoolTex.wrapS = THREE.ClampToEdgeWrapping;
    cachedStreetLightPoolTex.wrapT = THREE.ClampToEdgeWrapping;
    return cachedStreetLightPoolTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

// ⚡ Static Material Cache for Street Light Poles (Zero runtime allocations)
let cachedPoleMaterials: {
  concrete: THREE.Material;
  darkMetal: THREE.Material;
  galvSteel: THREE.Material;
  woodCrossarmMat: THREE.Material;
  porcelainMat: THREE.Material;
  blackFiberMat: THREE.Material;
  yellowWarningMat: THREE.Material;
  sharedMaterials: any;
} | null = null;

function getCachedPoleMaterials() {
  if (cachedPoleMaterials) return cachedPoleMaterials;
  const shared = getSharedMaterials ? getSharedMaterials() : {};
  cachedPoleMaterials = {
    concrete: shared.concretePole || new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 }),
    darkMetal: shared.metalGate || new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.38 }),
    galvSteel: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.32 }),
    woodCrossarmMat: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }),
    porcelainMat: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.20, metalness: 0.1 }),
    blackFiberMat: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }),
    yellowWarningMat: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
    sharedMaterials: shared,
  };
  return cachedPoleMaterials;
}

export function createStreetLightPoleVariant(variant: number, isNight: boolean): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StreetLightPole';
    group.userData = { isScenery: true, isSmallProp: true };
    const {
      concrete,
      darkMetal,
      galvSteel,
      woodCrossarmMat,
      porcelainMat,
      blackFiberMat,
      yellowWarningMat,
      sharedMaterials,
    } = getCachedPoleMaterials();

    // 1. Base de concreto reforçado + Poste cônico de concreto armado brasileiro (7.6m)
    const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.26, 0.55, 8), concrete);
    baseCollar.position.y = 0.275;
    group.add(baseCollar);

    const poleGeom = new THREE.CylinderGeometry(0.11, 0.21, 7.6, 8);
    const poleMesh = new THREE.Mesh(poleGeom, concrete);
    poleMesh.position.y = 3.8;
    poleMesh.castShadow = false;
    group.add(poleMesh);

    // Placa amarela de identificação numérica do poste da concessionária
    const idTag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.02), yellowWarningMat);
    idTag.position.set(0, 2.4, 0.19);
    group.add(idTag);

    // 2. Cruzeta Superior de Média Tensão (Y = 7.25m) + 3 Isoladores de Porcelana
    const topCrossarm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 1.85), woodCrossarmMat);
    topCrossarm.position.set(0.06, 7.25, 0);
    group.add(topCrossarm);

    const insGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.18, 6);
    for (const iz of [-0.78, 0, 0.78]) {
        const ins = new THREE.Mesh(insGeo, porcelainMat);
        ins.position.set(0.06, 7.40, iz);
        group.add(ins);
    }

    // Mão francesa metálica segurando a cruzeta
    for (const dir of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), galvSteel);
        brace.position.set(0.06, 7.02, dir * 0.32);
        brace.rotation.x = dir * 0.65;
        group.add(brace);
    }

    // 3. Cruzeta Secundária de Baixa Tensão / Telecom (Y = 5.85m) + Caixa de Emenda Óptica + Rolo de Fibra ("Gato / Internet da Quebrada")
    const lowRack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.14), galvSteel);
    lowRack.position.set(-0.14, 5.95, 0);
    group.add(lowRack);

    const spliceBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.24), blackFiberMat);
    spliceBox.position.set(0.15, 5.45, 0.22);
    group.add(spliceBox);

    // Rolo de reserva de cabo de fibra óptica pendurado no poste (típico do Brasil!)
    const fiberCoil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.032, 6, 12), blackFiberMat);
    fiberCoil.rotation.y = Math.PI / 2;
    fiberCoil.position.set(0.02, 5.35, -0.32);
    group.add(fiberCoil);

    // 4. Transformador Trifásico Cilíndrico Cinza com Buchas de Alta Tensão (variant === 1)
    if (variant === 1) {
        const transBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 1.05, 10), darkMetal);
        transBody.position.set(-0.34, 6.25, 0);
        transBody.castShadow = false;
        group.add(transBody);

        // Aletas de refrigeração laterais do transformador
        const finBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.58), darkMetal);
        finBox.position.set(-0.34, 6.22, 0);
        group.add(finBox);

        // 3 Buchas cerâmicas de alta tensão no topo do transformador
        for (const bz of [-0.18, 0, 0.18]) {
            const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.26, 6), porcelainMat);
            bushing.position.set(-0.34, 6.88, bz);
            group.add(bushing);
        }

        // Quadro de comando metálico abaixo
        const meterBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.32), galvSteel);
        meterBox.position.set(-0.20, 3.6, 0);
        group.add(meterBox);
    }

    // 5. Braço Curvo Galvanizado de Iluminação Pública + Luminária LED/Vapor de Sódio
    const armGeom = new THREE.CylinderGeometry(0.038, 0.045, 2.25, 8);
    const armMesh = new THREE.Mesh(armGeom, galvSteel);
    armMesh.rotation.z = Math.PI / 2 - 0.16;
    armMesh.position.set(1.05, 6.72, 0);
    group.add(armMesh);

    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.28), darkMetal);
    lampHead.position.set(2.05, 6.90, 0);
    group.add(lampHead);

    const bulbMat = isNight
        ? (sharedMaterials.lampBulbNight || new THREE.MeshBasicMaterial({ color: 0xfffbeb }))
        : (sharedMaterials.lampBulbDay || new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0xfef08a, emissiveIntensity: 0.25 }));

    const bulbGeom = new THREE.BoxGeometry(0.42, 0.06, 0.20);
    const bulbMesh = new THREE.Mesh(bulbGeom, bulbMat);
    bulbMesh.position.set(2.05, 6.83, 0);
    group.add(bulbMesh);

    if (isNight) {
        const poolTex = getStreetLightPoolTexture();
        const poolMat = new THREE.MeshBasicMaterial({
            map: poolTex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const groundPool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 32), poolMat);
        groundPool.rotation.x = -Math.PI / 2;
        groundPool.position.set(2.05, 0.035, 0);
        group.add(groundPool);

        const flareMat = new THREE.MeshBasicMaterial({
            color: 0xfffbeb,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const bulbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), flareMat);
        bulbGlow.position.set(2.05, 6.82, 0);
        group.add(bulbGlow);
    }

    return group;
}

export function createTrashCan(variant: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TrashCan';
    group.userData = { isScenery: true, isSmallProp: true };
    const isMetal = variant === 0;
    const geom = new THREE.CylinderGeometry(0.3, 0.25, 0.8, 8);
    const mat = new THREE.MeshStandardMaterial({color: isMetal ? 0x888888 : 0x228822});
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.4;
    group.add(mesh);
    return group;
}

export function createTrafficSign(variant: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TrafficSign';
    group.userData = { isScenery: true, isSmallProp: true };
    const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({color: 0x666666});
    const poleMesh = new THREE.Mesh(poleGeom, poleMat);
    poleMesh.position.y = 1.25;
    group.add(poleMesh);
    
    let signGeom, signColor;
    if (variant === 0) { // PARE
        signGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.02, 8);
        signColor = 0xcc0000;
    } else {
        signGeom = new THREE.BoxGeometry(0.6, 0.6, 0.02);
        signColor = 0xffffff;
    }
    const signMat = new THREE.MeshStandardMaterial({color: signColor});
    const signMesh = new THREE.Mesh(signGeom, signMat);
    signMesh.rotation.x = Math.PI / 2;
    signMesh.position.set(0, 2.3, 0.05);
    group.add(signMesh);
    return group;
}

export function createBench(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Bench';
    group.userData = { isScenery: true, isSmallProp: true };
    const concreteMat = new THREE.MeshStandardMaterial({color: 0xaaaaaa});
    const woodMat = new THREE.MeshStandardMaterial({color: 0x8b5a2b});
    
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), concreteMat);
    leg1.position.set(-0.8, 0.25, 0);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), concreteMat);
    leg2.position.set(0.8, 0.25, 0);
    
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 0.5), woodMat);
    seat.position.set(0, 0.5, 0);
    
    group.add(leg1, leg2, seat);
    return group;
}

export function createHydrant(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Hydrant';
    group.userData = { isScenery: true, isSmallProp: true };
    const mat = new THREE.MeshStandardMaterial({color: 0xdd0000, roughness: 0.3});
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8), mat);
    base.position.y = 0.3;
    group.add(base);
    return group;
}

export function createParkedMotorcycle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParkedMotorcycle';
    group.userData = { isScenery: true, isSmallProp: true };
    const mat = new THREE.MeshStandardMaterial({color: 0x111111});
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 1.5), mat);
    body.position.y = 0.4;
    group.add(body);
    group.rotation.z = 0.1; // kickstand lean
    return group;
}

export function createParkedBicycle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParkedBicycle';
    group.userData = { isScenery: true, isSmallProp: true };
    const mat = new THREE.MeshStandardMaterial({color: 0x225588});
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1.2), mat);
    body.position.y = 0.5;
    group.add(body);
    return group;
}

export function createDebris(variant: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Debris';
    group.userData = { isScenery: true, isSmallProp: true };
    const mat = new THREE.MeshStandardMaterial({color: variant === 0 ? 0xddccaa : 0x888888, roughness: 1});
    const geom = new THREE.ConeGeometry(0.8, 0.5, 8);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.25;
    group.add(mesh);
    return group;
}

export function createParkedCar(modelIndex: number, colorIndex: number): THREE.Group {
    const group = new THREE.Group();
    const colors = [0xffffff, 0xcccccc, 0x111111, 0xaa0000, 0x0044aa, 0x006622, 0xeeaa00, 0x663311];
    const carMat = new THREE.MeshStandardMaterial({color: colors[colorIndex % colors.length], roughness: 0.2});
    
    // Basic car body
    const bodyGeom = new THREE.BoxGeometry(1.6, 0.6, 3.5);
    const body = new THREE.Mesh(bodyGeom, carMat);
    body.position.y = 0.5;
    group.add(body);
    
    // Cabin
    const cabinGeom = new THREE.BoxGeometry(1.4, 0.5, 1.8);
    const windowMat = new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.1});
    const cabin = new THREE.Mesh(cabinGeom, windowMat);
    cabin.position.set(0, 1.05, -0.2);
    group.add(cabin);
    
    return group;
}
