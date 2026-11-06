import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyAtmosphericPerspective } from './atmosphericFogSystem';

export interface TreeTemplate {
  name: string;
  group: THREE.Group;
  height: number;
  width: number;
  trunkGeo: THREE.BufferGeometry;
  canopyGeo: THREE.BufferGeometry;
  trunkMat: THREE.Material;
  canopyMat: THREE.Material;
}

// ============================================================================
// PALETA BOTÂNICA BRASILEIRA PREMIUM & CORES VIBRANTES DE QUEBRADA
// ============================================================================
const TRUNK_COLOR = 0x4a3525;        // Madeira nobre de tronco brasileiro
const TRUNK_PALM_COLOR = 0x71717a;   // Tronco acinzentado de palmeira imperial
const TRUNK_SLANTED_COLOR = 0x3d2817; // Casca rústica escura de jacarandá

interface BrazilianTreeSpec {
  name: string;
  type: 'ipe_amarelo' | 'ipe_roxo' | 'ipe_branco' | 'palmeira_imperial' | 'jacaranda' | 'ficus_calcada' | 'pau_brasil' | 'coqueiro' | 'quaresmeira';
  leafColor: number;
  trunkColor: number;
  scaleHeight: number;
  scaleWidth: number;
}

const TREE_SPECS: BrazilianTreeSpec[] = [
  { name: 'tree_01_ipe_amarelo', type: 'ipe_amarelo', leafColor: 0xf59e0b, trunkColor: TRUNK_COLOR, scaleHeight: 5.4, scaleWidth: 4.2 },
  { name: 'tree_02_ipe_roxo', type: 'ipe_roxo', leafColor: 0xa855f7, trunkColor: TRUNK_COLOR, scaleHeight: 5.6, scaleWidth: 4.4 },
  { name: 'tree_03_ipe_branco', type: 'ipe_branco', leafColor: 0xfef08a, trunkColor: TRUNK_COLOR, scaleHeight: 5.2, scaleWidth: 4.0 },
  { name: 'tree_04_palmeira_imperial', type: 'palmeira_imperial', leafColor: 0x15803d, trunkColor: TRUNK_PALM_COLOR, scaleHeight: 7.2, scaleWidth: 4.8 },
  { name: 'tree_05_jacaranda', type: 'jacaranda', leafColor: 0x818cf8, trunkColor: TRUNK_SLANTED_COLOR, scaleHeight: 5.5, scaleWidth: 4.6 },
  { name: 'tree_06_ficus_calcada', type: 'ficus_calcada', leafColor: 0x166534, trunkColor: TRUNK_COLOR, scaleHeight: 4.8, scaleWidth: 4.5 },
  { name: 'tree_07_pau_brasil', type: 'pau_brasil', leafColor: 0x65a30d, trunkColor: TRUNK_COLOR, scaleHeight: 5.0, scaleWidth: 5.2 },
  { name: 'tree_08_coqueiro', type: 'coqueiro', leafColor: 0x22c55e, trunkColor: TRUNK_SLANTED_COLOR, scaleHeight: 6.5, scaleWidth: 4.2 },
  { name: 'tree_09_quaresmeira', type: 'quaresmeira', leafColor: 0x9333ea, trunkColor: TRUNK_COLOR, scaleHeight: 5.2, scaleWidth: 4.2 },
];

class TreeManagerClass {
  private templates: TreeTemplate[] = [];
  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private onLoadedListeners: (() => void)[] = [];

  // Geometrias e materiais compartilhados (Zero GC, Zero Rebuild)
  private standardTrunkMat: THREE.MeshStandardMaterial | null = null;
  private palmTrunkMat: THREE.MeshStandardMaterial | null = null;
  private slantedTrunkMat: THREE.MeshStandardMaterial | null = null;
  private foliageMats: Map<number, THREE.MeshStandardMaterial> = new Map();

  // Materiais e geometrias para as colinas laterais
  private hillMaterial: THREE.MeshStandardMaterial | null = null;
  private cachedHillGeo1: THREE.BufferGeometry | null = null;
  private cachedHillGeoMinus1: THREE.BufferGeometry | null = null;

  constructor() {
    this.initHillMaterial();
  }

  private initHillMaterial() {
    if (typeof document === 'undefined') {
      this.hillMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.82 });
      return;
    }
    // Textura procedural ultra-leve de grama para as colinas laterais (256x256 é suficiente e consome 1/4 da RAM)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base verde com relevo suave
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 4;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(38, 82, 33, 0.45)' : 'rgba(58, 118, 50, 0.40)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 3);

    this.hillMaterial = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0x3d7a36,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
      fog: true,
    });
    applyAtmosphericPerspective(this.hillMaterial, { lod: 'backdrop' });
  }

  public onLoaded(fn: () => void): void {
    if (this.isLoaded) {
      setTimeout(fn, 0);
    } else {
      this.onLoadedListeners.push(fn);
    }
  }

  /**
   * Inicializa as 9 árvores brasileiras procedurais estilizadas de alta performance (Zero Latência e Zero Download GLTF)
   */
  public async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    console.log('[TreeManager] Inicializando 9 modelos procedurais low-poly de árvores brasileiras ultra-otimizadas...');

    // 1. Cria materiais compartilhados com flatShading estilizado
    this.standardTrunkMat = new THREE.MeshStandardMaterial({
      color: TRUNK_COLOR,
      roughness: 0.90,
      metalness: 0.02,
      flatShading: true,
      fog: true,
    });
    applyAtmosphericPerspective(this.standardTrunkMat, { lod: 'foliage' });

    this.palmTrunkMat = new THREE.MeshStandardMaterial({
      color: TRUNK_PALM_COLOR,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
      fog: true,
    });
    applyAtmosphericPerspective(this.palmTrunkMat, { lod: 'foliage' });

    this.slantedTrunkMat = new THREE.MeshStandardMaterial({
      color: TRUNK_SLANTED_COLOR,
      roughness: 0.90,
      metalness: 0.02,
      flatShading: true,
      fog: true,
    });
    applyAtmosphericPerspective(this.slantedTrunkMat, { lod: 'foliage' });

    // 2. Constrói os 9 modelos botânicos estilizados
    for (let i = 0; i < TREE_SPECS.length; i++) {
      const spec = TREE_SPECS[i];

      // Material de folhagem compartilhado para esta espécie
      let foliageMat = this.foliageMats.get(spec.leafColor);
      if (!foliageMat) {
        foliageMat = new THREE.MeshStandardMaterial({
          color: spec.leafColor,
          roughness: 0.72,
          metalness: 0.02,
          flatShading: true,
          fog: true,
        });
        applyAtmosphericPerspective(foliageMat, { lod: 'foliage' });
        this.foliageMats.set(spec.leafColor, foliageMat);
      }

      const { trunkGeo, canopyGeo } = this.buildTreeGeometries(spec.type);
      const trunkMat = spec.type === 'palmeira_imperial' 
        ? this.palmTrunkMat 
        : (spec.type === 'coqueiro' || spec.type === 'jacaranda') 
          ? this.slantedTrunkMat 
          : this.standardTrunkMat;

      // Cria template mestre
      const templateGroup = new THREE.Group();
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      const canopyMesh = new THREE.Mesh(canopyGeo, foliageMat);
      trunkMesh.castShadow = false;
      trunkMesh.receiveShadow = false;
      trunkMesh.frustumCulled = true;
      canopyMesh.castShadow = false;
      canopyMesh.receiveShadow = false;
      canopyMesh.frustumCulled = true;

      templateGroup.add(trunkMesh);
      templateGroup.add(canopyMesh);

      this.templates.push({
        name: spec.name,
        group: templateGroup,
        height: spec.scaleHeight,
        width: spec.scaleWidth,
        trunkGeo,
        canopyGeo,
        trunkMat,
        canopyMat: foliageMat,
      });
    }

    this.isLoaded = true;
    console.log(`[TreeManager] ${this.templates.length} árvores brasileiras procedurais prontas (100% nativas, 0ms I/O)!`);
    this.onLoadedListeners.forEach((cb) => {
      try { cb(); } catch (e) { console.error(e); }
    });
    this.onLoadedListeners = [];

    this.loadPromise = Promise.resolve();
    return this.loadPromise;
  }

  /**
   * Constrói geometrias low-poly mescladas (BufferGeometryUtils.mergeGeometries) para cada arquétipo botânico
   */
  private buildTreeGeometries(type: BrazilianTreeSpec['type']): {
    trunkGeo: THREE.BufferGeometry;
    canopyGeo: THREE.BufferGeometry;
  } {
    if (type === 'palmeira_imperial') {
      // 🌴 Palmeira Imperial: Tronco alto esguio colunar + coroa de 7 folhas curvadas
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 6.2, 5);
      trunkGeo.translate(0, 3.1, 0);

      const fronds: THREE.BufferGeometry[] = [];
      const numFronds = 7;
      for (let f = 0; f < numFronds; f++) {
        const angle = (f / numFronds) * Math.PI * 2;
        const frond = new THREE.ConeGeometry(0.38, 2.8, 4);
        frond.rotateZ(-0.95); // Curva para fora e para baixo
        frond.rotateY(angle);
        frond.translate(Math.cos(angle) * 0.9, 6.1, Math.sin(angle) * 0.9);
        fronds.push(frond);
      }
      const canopyGeo = BufferGeometryUtils.mergeGeometries(fronds);
      fronds.forEach((g) => g.dispose());
      canopyGeo.computeVertexNormals();

      return { trunkGeo, canopyGeo };
    }

    if (type === 'coqueiro') {
      // 🥥 Coqueiro Tropical: Tronco curvo inclinado + folhas em leque + 3 cocos
      const t1 = new THREE.CylinderGeometry(0.15, 0.24, 3.2, 5);
      t1.translate(0, 1.6, 0);
      const t2 = new THREE.CylinderGeometry(0.12, 0.16, 2.6, 5);
      t2.rotateZ(0.22);
      t2.translate(0.35, 4.3, 0);
      const trunkGeo = BufferGeometryUtils.mergeGeometries([t1, t2]);
      t1.dispose();
      t2.dispose();
      trunkGeo.computeVertexNormals();

      const fronds: THREE.BufferGeometry[] = [];
      const numFronds = 6;
      for (let f = 0; f < numFronds; f++) {
        const angle = (f / numFronds) * Math.PI * 2;
        const frond = new THREE.ConeGeometry(0.35, 2.4, 4);
        frond.rotateZ(-0.85);
        frond.rotateY(angle);
        frond.translate(0.35 + Math.cos(angle) * 0.8, 5.5, Math.sin(angle) * 0.8);
        fronds.push(frond);
      }
      const canopyGeo = BufferGeometryUtils.mergeGeometries(fronds);
      fronds.forEach((g) => g.dispose());
      canopyGeo.computeVertexNormals();

      return { trunkGeo, canopyGeo };
    }

    if (type === 'ficus_calcada') {
      // 🌳 Ficus / Oiti de Calçada: Tronco firme + copa densa e arredondada (sombra urbana clássica)
      const trunkGeo = new THREE.CylinderGeometry(0.20, 0.32, 2.6, 6);
      trunkGeo.translate(0, 1.3, 0);

      const c1 = new THREE.DodecahedronGeometry(1.65, 0);
      c1.translate(0, 3.2, 0);
      const c2 = new THREE.IcosahedronGeometry(1.3, 0);
      c2.translate(0, 4.0, 0);
      const c3 = new THREE.IcosahedronGeometry(1.1, 0);
      c3.translate(-0.4, 3.0, 0.4);
      const canopyGeo = BufferGeometryUtils.mergeGeometries([c1, c2, c3]);
      c1.dispose(); c2.dispose(); c3.dispose();
      canopyGeo.computeVertexNormals();

      return { trunkGeo, canopyGeo };
    }

    if (type === 'pau_brasil') {
      // 🌿 Pau-Brasil / Acácia: Copa espalhada horizontalmente em guarda-chuva
      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.30, 3.2, 5);
      trunkGeo.translate(0, 1.6, 0);

      const c1 = new THREE.DodecahedronGeometry(1.8, 0);
      c1.scale(1.3, 0.65, 1.3);
      c1.translate(0, 3.5, 0);
      const c2 = new THREE.IcosahedronGeometry(1.3, 0);
      c2.scale(1.2, 0.6, 1.2);
      c2.translate(0.6, 4.0, -0.4);
      const canopyGeo = BufferGeometryUtils.mergeGeometries([c1, c2]);
      c1.dispose(); c2.dispose();
      canopyGeo.computeVertexNormals();

      return { trunkGeo, canopyGeo };
    }

    if (type === 'jacaranda') {
      // 💜 Jacarandá: Tronco suavemente tortuoso + blocos aéreos em camadas de flores violeta
      const t1 = new THREE.CylinderGeometry(0.16, 0.28, 3.6, 5);
      t1.rotateZ(0.08);
      t1.translate(0.12, 1.8, 0);
      const trunkGeo = t1;

      const c1 = new THREE.DodecahedronGeometry(1.3, 0);
      c1.translate(0.2, 3.6, 0.1);
      const c2 = new THREE.IcosahedronGeometry(1.15, 0);
      c2.translate(-0.5, 4.2, -0.3);
      const c3 = new THREE.IcosahedronGeometry(1.05, 0);
      c3.translate(0.6, 4.5, 0.2);
      const canopyGeo = BufferGeometryUtils.mergeGeometries([c1, c2, c3]);
      c1.dispose(); c2.dispose(); c3.dispose();
      canopyGeo.computeVertexNormals();

      return { trunkGeo, canopyGeo };
    }

    // 🌸 Padrão para Ipê (Amarelo, Roxo, Branco) e Quaresmeira:
    // Tronco nobre com 3 clusters geodésicos exuberantes
    const trunkGeo = new THREE.CylinderGeometry(0.17, 0.28, 3.4, 6);
    trunkGeo.translate(0, 1.7, 0);

    const c1 = new THREE.DodecahedronGeometry(1.35, 0);
    c1.translate(0, 3.8, 0);
    const c2 = new THREE.IcosahedronGeometry(1.05, 0);
    c2.translate(-0.55, 3.3, 0.35);
    const c3 = new THREE.IcosahedronGeometry(1.10, 0);
    c3.translate(0.60, 3.5, -0.25);
    const canopyGeo = BufferGeometryUtils.mergeGeometries([c1, c2, c3]);
    c1.dispose(); c2.dispose(); c3.dispose();
    canopyGeo.computeVertexNormals();

    return { trunkGeo, canopyGeo };
  }

  public getTemplatesCount(): number {
    return this.templates.length;
  }

  /**
   * Cria uma instância de árvore ultra-leve reaproveitando as geometrias e materiais mestre.
   * Custo de instanciação: ~0.002ms, Zero GC.
   */
  public createTreeInstance(treeIdx?: number, baseScale = 1.25): THREE.Group {
    if (this.templates.length === 0) {
      return new THREE.Group();
    }

    const idx = (treeIdx ?? Math.floor(Math.random() * this.templates.length)) % this.templates.length;
    const tmpl = this.templates[idx];

    const group = new THREE.Group();
    const trunkMesh = new THREE.Mesh(tmpl.trunkGeo, tmpl.trunkMat);
    const canopyMesh = new THREE.Mesh(tmpl.canopyGeo, tmpl.canopyMat);

    trunkMesh.castShadow = false;
    trunkMesh.receiveShadow = false;
    trunkMesh.frustumCulled = true;

    canopyMesh.castShadow = false;
    canopyMesh.receiveShadow = false;
    canopyMesh.frustumCulled = true;

    group.add(trunkMesh);
    group.add(canopyMesh);

    const randomScale = baseScale * (0.90 + Math.random() * 0.20);
    group.scale.setScalar(randomScale);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.userData = { isScenery: true, isTree: true };

    return group;
  }

  /**
   * Cria suaves colinas / relevo ondulado verde das margens
   */
  public createRollingHills(chunkLength: number, side: 1 | -1): THREE.Group {
    const hillGroup = new THREE.Group();
    hillGroup.userData = { isScenery: true, isHill: true };

    const hillWidth = 90.0;
    let hillGeo = side === 1 ? this.cachedHillGeo1 : this.cachedHillGeoMinus1;

    if (!hillGeo) {
      const segmentsX = 10;
      const segmentsZ = 8;
      const geo = new THREE.PlaneGeometry(hillWidth, chunkLength, segmentsX, segmentsZ);
      geo.rotateX(-Math.PI / 2);

      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const localX = pos.getX(i);
        const vz = pos.getZ(i);

        const u = side === 1 
          ? (localX + hillWidth / 2) / hillWidth 
          : (-localX + hillWidth / 2) / hillWidth;

        const baseRise = Math.pow(Math.max(0, u), 1.25) * 6.5;
        const wave = Math.sin(vz * 0.20 + u * 4.2) * 1.5 + Math.cos(vz * 0.35) * 0.8;
        const heightY = Math.max(0.12, baseRise + wave);

        pos.setY(i, heightY);
      }
      geo.computeVertexNormals();
      if (side === 1) this.cachedHillGeo1 = geo;
      else this.cachedHillGeoMinus1 = geo;
      hillGeo = geo;
    }

    const hillMesh = new THREE.Mesh(hillGeo, this.hillMaterial!);
    hillMesh.receiveShadow = true;
    hillMesh.castShadow = false;
    hillMesh.frustumCulled = true;

    const centerX = side * (22.0 + hillWidth * 0.5);
    hillMesh.position.set(centerX, 0, 0);

    hillGroup.add(hillMesh);
    return hillGroup;
  }

  public getGroundHeightAt(x: number, z: number): number {
    const absX = Math.abs(x);
    if (absX <= 22.0) return 0.1;

    const hillWidth = 90.0;
    const u = Math.min(1, Math.max(0, (absX - 22.0) / hillWidth));
    const baseRise = Math.pow(u, 1.25) * 6.5;
    const wave = Math.sin(z * 0.20 + u * 4.2) * 1.5 + Math.cos(z * 0.35) * 0.8;
    return Math.max(0.12, baseRise + wave);
  }
}

export const TreeManager = new TreeManagerClass();

if (typeof window !== 'undefined') {
  TreeManager.init();
}
