import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export interface MotoboyInstance {
  id: 'motoboy_1' | 'motoboy_2';
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  update: (dt: number) => void;
  dispose: () => void;
}

// Cache de modelos FBX brutos para evitar recarregar da rede
const fbxCache = new Map<string, THREE.Group>();
const textureCache = new Map<string, THREE.Texture>();

function createWhiteOutlineMaterial(): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
  });

  mat.onBeforeCompile = (shader) => {
    const token = '#include <begin_vertex>';
    const customTransform = `
      #include <begin_vertex>
      transformed += normalize(normal) * 0.016;
    `;
    shader.vertexShader = shader.vertexShader.replace(token, customTransform);
  };

  return mat;
}

export async function createMotoboyInstance(
  id: 'motoboy_1' | 'motoboy_2',
  options?: { targetHeight?: number }
): Promise<MotoboyInstance> {
  const fbxPath =
    id === 'motoboy_1'
      ? '/assets/motoboys/motoboy_1_neutral_idle.fbx'
      : '/assets/motoboys/motoboy_2_neutral_idle.fbx';

  const texPath =
    id === 'motoboy_1'
      ? '/assets/motoboys/motoboy_1_texture.jpg'
      : '/assets/motoboys/motoboy_2_texture.jpg';

  // Carrega ou busca no cache a textura
  let texture = textureCache.get(texPath);
  if (!texture) {
    const texLoader = new THREE.TextureLoader();
    texture = await new Promise<THREE.Texture>((resolve, reject) => {
      texLoader.load(
        texPath,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          textureCache.set(texPath, t);
          resolve(t);
        },
        undefined,
        (err) => {
          console.warn(`[motoboyModelLoader] Falha ao carregar textura ${texPath}:`, err);
          resolve(new THREE.Texture());
        }
      );
    });
  }

  // Carrega ou busca no cache o FBX
  let baseFbx = fbxCache.get(fbxPath);
  if (!baseFbx) {
    const fbxLoader = new FBXLoader();
    baseFbx = await new Promise<THREE.Group>((resolve, reject) => {
      fbxLoader.load(
        fbxPath,
        (group: THREE.Group) => {
          fbxCache.set(fbxPath, group);
          resolve(group);
        },
        undefined,
        (err: unknown) => {
          console.error(`[motoboyModelLoader] Erro ao carregar FBX ${fbxPath}:`, err);
          reject(err);
        }
      );
    });
  }

  // Clona o grupo do motoboy
  const motoboyGroup = baseFbx.clone(true);
  motoboyGroup.name = `Motoboy_${id}`;

  // Configura os materiais estilo cartoon com textura e contorno branco
  const toonMat = new THREE.MeshToonMaterial({
    map: texture.image ? texture : null,
    color: 0xffffff,
  });

  const outlineMat = createWhiteOutlineMaterial();

  const meshesToOutline: THREE.SkinnedMesh[] = [];

  motoboyGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = toonMat;

      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        meshesToOutline.push(mesh as THREE.SkinnedMesh);
      } else {
        // Para malhas estáticas simples, cria uma malha filha com o material invertido
        const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
        outlineMesh.scale.setScalar(1.025);
        mesh.add(outlineMesh);
      }
    }
  });

  // Para SkinnedMesh com rigging/ossos, cria um SkinnedMesh correspondente ligado ao mesmo esqueleto
  meshesToOutline.forEach((skinnedMesh) => {
    try {
      const outlineSkinned = new THREE.SkinnedMesh(skinnedMesh.geometry, outlineMat);
      outlineSkinned.bind(skinnedMesh.skeleton, skinnedMesh.bindMatrix);
      skinnedMesh.add(outlineSkinned);
    } catch {
      // Fallback caso a vinculação do esqueleto falhe
    }
  });

  // Ajusta a escala para altura humana realista (~1.72m)
  const targetHeight = options?.targetHeight ?? 1.72;
  const initialBox = new THREE.Box3().setFromObject(motoboyGroup);
  const currentHeight = initialBox.max.y - initialBox.min.y;
  if (currentHeight > 0.1) {
    const scaleFactor = targetHeight / currentHeight;
    motoboyGroup.scale.multiplyScalar(scaleFactor);
  }

  // Alinha os pés para tocar o piso em y = 0
  const alignedBox = new THREE.Box3().setFromObject(motoboyGroup);
  motoboyGroup.position.y -= alignedBox.min.y;

  // Animação de respiração em pé (Neutral Idle)
  let mixer: THREE.AnimationMixer | null = null;
  if (baseFbx.animations && baseFbx.animations.length > 0) {
    mixer = new THREE.AnimationMixer(motoboyGroup);
    const action = mixer.clipAction(baseFbx.animations[0]);
    action.play();
  }

  const root = new THREE.Group();
  root.name = `MotoboyRoot_${id}`;
  root.add(motoboyGroup);

  const update = (dt: number) => {
    if (mixer) {
      mixer.update(dt);
    }
  };

  const dispose = () => {
    if (mixer) mixer.stopAllAction();
    motoboyGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
    root.clear();
  };

  return {
    id,
    root,
    mixer,
    update,
    dispose,
  };
}
