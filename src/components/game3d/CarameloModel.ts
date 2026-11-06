import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Skin } from '../../types';

export interface CarameloSkinConfig {
  id: string;
  name: string;
  subtitle: string;
  rarity: 'Lendária' | 'Especial' | 'Rara' | 'Mítica' | 'Ancestral';
  color: string;
  modelPath: string;
  icon: string;
  description: string;
  price: number;
}

export const CARAMELO_SKINS: CarameloSkinConfig[] = [
  {
    id: 'caramelo_default',
    name: 'Caramelo Clássico',
    subtitle: 'O autêntico vira-lata caramelo brasileiro',
    rarity: 'Lendária',
    color: '#d97706',
    modelPath: '/models/caramelo/caramelo_default.glb',
    icon: '🐕',
    description: 'Ágil, incansável e rei absoluto das calçadas do Brasil.',
    price: 0,
  },
  {
    id: 'caramelo_skin1',
    name: 'Caramelo Dourado',
    subtitle: 'Vira-lata dourado com pelagem reluzente',
    rarity: 'Especial',
    color: '#eab308',
    modelPath: '/models/caramelo/caramelo_skin1.glb',
    icon: '✨',
    description: 'Pelagem dourada brilhante, focado na corrida e nas manobras da quebrada.',
    price: 1000,
  },
  {
    id: 'caramelo_praia',
    name: 'Caramelo Praiano',
    subtitle: 'Direto de Copacabana com óculos e bermuda',
    rarity: 'Especial',
    color: '#06b6d4',
    modelPath: '/models/caramelo/caramelo_praia.glb',
    icon: '🏄',
    description: 'Estilo praiano carioca, sempre no pique do verão tropical.',
    price: 2000,
  },
  {
    id: 'caramelo_style',
    name: 'Caramelo Mandrake',
    subtitle: 'Visual de cria, kit reflexivo e postura',
    rarity: 'Rara',
    color: '#a855f7',
    modelPath: '/models/caramelo/caramelo_style.glb',
    icon: '🕶️',
    description: 'Postura de quebrada, mandrake puro que corre na elegância.',
    price: 4500,
  },
  {
    id: 'caramelo_skin2',
    name: 'Caramelo Pitbull',
    subtitle: 'Robusto, musculoso e imparável no asfalto',
    rarity: 'Mítica',
    color: '#f97316',
    modelPath: '/models/caramelo/caramelo_skin2.glb',
    icon: '🐕‍🦺',
    description: 'Porte forte e atlético, morde na velocidade máxima e nunca desiste.',
    price: 6000,
  },
  {
    id: 'caramelo_cyber',
    name: 'Cyber Caramelo 2077',
    subtitle: 'Cibernético com implantes de alta rotação',
    rarity: 'Mítica',
    color: '#10b981',
    modelPath: '/models/caramelo/caramelo_cyber.glb',
    icon: '⚡',
    description: 'Tecnologia canina do futuro com turbinas de propulsão e armadura de neon.',
    price: 8000,
  },
  {
    id: 'caramelo_samurai',
    name: 'Samurai Caramelo',
    subtitle: 'Guerreiro lendário com armadura e honra',
    rarity: 'Ancestral',
    color: '#ef4444',
    modelPath: '/models/caramelo/caramelo_samurai.glb',
    icon: '⚔️',
    description: 'Disciplina milenar, agilidade implacável e dentes de katana.',
    price: 10000,
  },
];

export interface CarameloInstance {
  group: THREE.Group;
  legs: THREE.Group[];
  ears: THREE.Mesh[];
  tailGroup: THREE.Group;
  headGroup: THREE.Group;
  jawGroup: THREE.Group;
  tongue: THREE.Mesh;
  updateAnimation: (
    runTime: number,
    speed: number,
    dt: number,
    isBiting: boolean,
    isJumping?: boolean,
    targetMotoX?: number,
    targetMotoY?: number,
    targetMotoZ?: number,
    dogX?: number,
    dogY?: number
  ) => void;
  setSkin: (skinId: string) => void;
  getSkin: () => string;
  dispose: () => void;
}

interface CachedGltfSkin {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

interface PendingSkinRequest {
  cb: (model: THREE.Group, mixer: THREE.AnimationMixer) => void;
  autoPlay: boolean;
}

const cachedTemplates = new Map<string, CachedGltfSkin>();
const pendingCallbacks = new Map<string, PendingSkinRequest[]>();
const loadingSkins = new Set<string>();

const gltfLoader = new GLTFLoader();

let sharedNeuralClip: THREE.AnimationClip | null = null;
let animLoadingCallbacks: ((clip: THREE.AnimationClip) => void)[] = [];
let isAnimLoading = false;

/**
 * Refina a animação neural de corrida do cão, estabilizando as patas dianteiras:
 * 1. Trava a translação dos membros na posição anatômica natural (evita que ossos saiam do soquete ou estiquem a malha).
 * 2. Suaviza as rotações anômalas dos pulsos/patas da frente (LeftHand, RightHand), mantendo as 4 patas voltadas para a frente e flexionando com naturalidade e elegância.
 */
function refineNeuralRunClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const refinedTracks: THREE.KeyframeTrack[] = [];

  for (const tr of clip.tracks) {
    if (tr.name.endsWith('.position')) {
      if (tr.name.startsWith('Hips') || tr.name.startsWith('Spine')) {
        refinedTracks.push(tr);
      } else {
        // Trava a posição da articulação na pose de descanso anatômica
        const restX = tr.values[0];
        const restY = tr.values[1];
        const restZ = tr.values[2];
        const fixedValues = new Float32Array(tr.values.length);
        for (let i = 0; i < tr.values.length; i += 3) {
          fixedValues[i] = restX;
          fixedValues[i + 1] = restY;
          fixedValues[i + 2] = restZ;
        }
        refinedTracks.push(new THREE.VectorKeyframeTrack(tr.name, tr.times as any, fixedValues as any));
      }
    } else if (tr.name.endsWith('.quaternion')) {
      if (tr.name.includes('Tail')) {
        // 🐕 CAUDA RELAXADA E APONTADA PARA BAIXO (elimina cauda bugada/esticada para cima)
        const fixedQuats = new Float32Array(tr.values.length);
        const q = new THREE.Quaternion();
        const e = new THREE.Euler(0, 0, 0, 'XYZ');

        const isBaseTail = tr.name.startsWith('Tail.') || tr.name.includes('.bones[Tail]') || (tr.name.includes('Tail') && !tr.name.includes('Tail1'));

        for (let i = 0; i < tr.values.length; i += 4) {
          const t = tr.times[i / 4];
          if (isBaseTail) {
            // Inclinada suavemente para baixo (~38 graus) com leve oscilação canina
            const sway = Math.sin(t * 12.0) * 0.06;
            e.set(0.02, sway, 0.65, 'XYZ'); // Z positivo (+37.2°) aponta a cauda para baixo
          } else {
            // Tail1 (ponta da cauda) acompanha em curvatura suave
            const sway = Math.sin(t * 12.0 - 0.4) * 0.08;
            e.set(0.01, sway, 0.26, 'XYZ');
          }
          q.setFromEuler(e);
          fixedQuats[i] = q.x;
          fixedQuats[i + 1] = q.y;
          fixedQuats[i + 2] = q.z;
          fixedQuats[i + 3] = q.w;
        }
        refinedTracks.push(new THREE.QuaternionKeyframeTrack(tr.name, tr.times as any, fixedQuats as any));
      } else if (tr.name.includes('Hand') || tr.name.includes('ForeArm')) {
        // Suaviza torções articulares excessivas nas patas dianteiras (Hand e ForeArm)
        const fixedQuats = new Float32Array(tr.values.length);
        const q = new THREE.Quaternion();
        const e = new THREE.Euler(0, 0, 0, 'XYZ');

        for (let i = 0; i < tr.values.length; i += 4) {
          q.set(tr.values[i], tr.values[i + 1], tr.values[i + 2], tr.values[i + 3]);
          e.setFromQuaternion(q, 'XYZ');

          if (tr.name.includes('Hand') && !tr.name.includes('Site')) {
            // Elimina torções laterais bruscas nos pulsos, mantendo as patas orientadas para a frente
            e.y *= 0.15;
            if (Math.abs(e.z) > 0.45) e.z = Math.sign(e.z) * 0.45;
            if (Math.abs(e.x) > 0.55) e.x = Math.sign(e.x) * 0.55;
          } else if (tr.name.includes('ForeArm')) {
            // Suaviza a rotação do cotovelo
            e.y *= 0.35;
          }

          q.setFromEuler(e);
          fixedQuats[i] = q.x;
          fixedQuats[i + 1] = q.y;
          fixedQuats[i + 2] = q.z;
          fixedQuats[i + 3] = q.w;
        }
        refinedTracks.push(new THREE.QuaternionKeyframeTrack(tr.name, tr.times as any, fixedQuats as any));
        refinedTracks.push(new THREE.QuaternionKeyframeTrack(tr.name, tr.times as any, fixedQuats as any));
      } else {
        refinedTracks.push(tr);
      }
    } else {
      refinedTracks.push(tr);
    }
  }

  return new THREE.AnimationClip(clip.name, clip.duration, refinedTracks);
}

export function getNeuralRunClip(onLoaded: (clip: THREE.AnimationClip) => void) {
  if (sharedNeuralClip) {
    onLoaded(sharedNeuralClip);
    return;
  }
  animLoadingCallbacks.push(onLoaded);
  if (isAnimLoading) return;
  isAnimLoading = true;

  gltfLoader.load(
    '/models/caramelo/caramelo_run_anim.glb',
    (gltf) => {
      if (gltf.animations && gltf.animations.length > 0) {
        sharedNeuralClip = refineNeuralRunClip(gltf.animations[0]);
        const cbs = animLoadingCallbacks;
        animLoadingCallbacks = [];
        cbs.forEach((cb) => cb(sharedNeuralClip!));
      }
    },
    undefined,
    (err) => {
      console.warn('[CarameloModel] Failed to load neural run animation:', err);
    }
  );
}

export function loadGltfCarameloSkin(
  skinId: string,
  onLoaded?: (model: THREE.Group, mixer: THREE.AnimationMixer) => void,
  autoPlayAnimation: boolean = true
) {
  const skin = CARAMELO_SKINS.find((s) => s.id === skinId) || CARAMELO_SKINS[0];
  const cached = cachedTemplates.get(skin.id);

  if (cached) {
    if (onLoaded) {
      const cloned = SkeletonUtils.clone(cached.scene) as THREE.Group;
      const mixer = new THREE.AnimationMixer(cloned);
      if (cached.animations.length > 0) {
        const action = mixer.clipAction(cached.animations[0]);
        if (autoPlayAnimation) {
          action.paused = false;
          action.play();
        } else {
          action.play();
          mixer.setTime(0);
          action.paused = true;
        }
      }
      onLoaded(cloned, mixer);
    }
    return;
  }

  if (onLoaded) {
    const list = pendingCallbacks.get(skin.id) || [];
    list.push({ cb: onLoaded, autoPlay: autoPlayAnimation });
    pendingCallbacks.set(skin.id, list);
  }

  if (loadingSkins.has(skin.id)) return;
  loadingSkins.add(skin.id);

  getNeuralRunClip((neuralClip) => {
    gltfLoader.load(
      skin.modelPath,
      (gltf) => {
        const root = gltf.scene;

        root.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = false;

            // Otimização visual do Caramelo: menos reflexo plástico, pelagem mais suave e agradável
            const tuneMat = (m: THREE.Material) => {
              if (m instanceof THREE.MeshStandardMaterial) {
                m.roughness = Math.max(0.78, m.roughness); // Reduz reflexos especulares fortes
                m.metalness = Math.min(0.04, m.metalness); // Elimina aspecto plástico/metálico na pelagem
                if (m.envMapIntensity !== undefined) {
                  m.envMapIntensity = 0.35; // Reduz reflexos externos intensos
                }
              }
              return m;
            };

            if (Array.isArray(mesh.material)) {
              mesh.material = mesh.material.map(tuneMat);
            } else if (mesh.material) {
              mesh.material = tuneMat(mesh.material);
            }
          }
        });

        // 1. Apply AI4Animation neural run pose at t = 0 to establish the authentic quadruped running posture
        const initMixer = new THREE.AnimationMixer(root);
        const initAction = initMixer.clipAction(neuralClip);
        initAction.play();
        initMixer.setTime(0);
        root.updateMatrixWorld(true);

        // 2. Standardize scaling so character is proportionate to motorcycle (~1.88m max dimension, slightly smaller than moto)
        const rawBbox = new THREE.Box3().setFromObject(root);
        const rawSize = new THREE.Vector3();
        rawBbox.getSize(rawSize);
        const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
        const targetSize = 1.88;
        const scale = targetSize / (maxDim || 1);
        root.scale.set(scale, scale, scale);
        root.updateMatrixWorld(true);

        // 3. Center X and Z of model
        const scaledBbox = new THREE.Box3().setFromObject(root);
        const scaledCenter = new THREE.Vector3();
        scaledBbox.getCenter(scaledCenter);
        root.position.x = -scaledCenter.x;
        root.position.z = -scaledCenter.z;

        // 4. Align lowest point of paws exactly to Y = 0 (the asphalt / ground)
        root.updateMatrixWorld(true);
        const groundBbox = new THREE.Box3().setFromObject(root);
        root.position.y -= groundBbox.min.y;
        root.updateMatrixWorld(true);

        const assembledGroup = new THREE.Group();
        assembledGroup.name = 'CarameloAssembled';
        assembledGroup.add(root);
        assembledGroup.updateMatrixWorld(true);

        cachedTemplates.set(skin.id, {
          scene: assembledGroup,
          animations: [neuralClip],
        });
        loadingSkins.delete(skin.id);

        const callbacks = pendingCallbacks.get(skin.id) || [];
        pendingCallbacks.delete(skin.id);
        callbacks.forEach(({ cb, autoPlay }) => {
          const cloned = SkeletonUtils.clone(assembledGroup) as THREE.Group;
          const mixer = new THREE.AnimationMixer(cloned);
          const action = mixer.clipAction(neuralClip);
          if (autoPlay) {
            action.paused = false;
            action.play();
          } else {
            action.play();
            mixer.setTime(0);
            action.paused = true;
          }
          cb(cloned, mixer);
        });
      },
      undefined,
      (err) => {
        console.warn(`[CarameloModel] Failed to load skin ${skin.id}:`, err);
        loadingSkins.delete(skin.id);
      }
    );
  });
}

export function preloadCarameloSkin(skinId: string): Promise<void> {
  return new Promise((resolve) => {
    loadGltfCarameloSkin(
      skinId,
      () => {
        resolve();
      },
      false
    );
  });
}

export function buildCaramelo(initialSkin?: string | Skin): CarameloInstance {
  const container = new THREE.Group();
  container.name = 'CarameloRoot';

  const modelHolder = new THREE.Group();
  modelHolder.name = 'CarameloModelHolder';
  container.add(modelHolder);

  const resolveSkinId = (input?: string | Skin | null): string => {
    if (!input) return 'caramelo_default';
    const id = typeof input === 'string' ? input : (input && 'id' in input ? input.id : '');
    // Map legacy 2D skin IDs if present
    if (id === 'skin-tradicional') return 'caramelo_default';
    if (id === 'skin-praia') return 'caramelo_praia';
    if (id === 'skin-mandrake') return 'caramelo_style';
    if (id === 'skin-cyber') return 'caramelo_cyber';
    if (id === 'skin-samurai') return 'caramelo_samurai';

    const match = CARAMELO_SKINS.find((s) => s.id === id);
    return match ? match.id : 'caramelo_default';
  };

  let currentSkinId = resolveSkinId(
    initialSkin || localStorage.getItem('caramelorun_equipped_dog_skin')
  );

  let currentMixer: THREE.AnimationMixer | null = null;
  let currentModel: THREE.Group | null = null;
  let currentAction: THREE.AnimationAction | null = null;
  let headBone: THREE.Object3D | null = null;
  let neckBone: THREE.Object3D | null = null;
  let currentHeadYaw = 0;
  let currentHeadPitch = 0;

  const findHeadBones = (root: THREE.Object3D) => {
    headBone = null;
    neckBone = null;
    root.traverse((child) => {
      const lower = child.name.toLowerCase();
      if (!headBone && (lower === 'head' || lower.includes('head'))) {
        headBone = child;
      }
      if (!neckBone && (lower === 'neck' || lower.includes('neck'))) {
        neckBone = child;
      }
    });
  };

  const setSkin = (skinInput: string) => {
    const validId = resolveSkinId(skinInput);
    currentSkinId = validId;
    loadGltfCarameloSkin(validId, (model, mixer) => {
      modelHolder.clear();
      modelHolder.add(model);
      currentModel = model;
      currentMixer = mixer;
      findHeadBones(model);
      // Garante que a animação da gameplay esteja ativa e despausada
      if (mixer) {
        const cached = cachedTemplates.get(validId);
        if (cached && cached.animations.length > 0) {
          currentAction = mixer.clipAction(cached.animations[0]);
          currentAction.paused = false;
          currentAction.play();
        } else {
          currentAction = null;
        }
      }
    }, true);
  };

  setSkin(currentSkinId);

  const dummyGroup = new THREE.Group();
  const dummyMesh = new THREE.Mesh();

  return {
    group: container,
    legs: [dummyGroup, dummyGroup, dummyGroup, dummyGroup],
    ears: [dummyMesh, dummyMesh],
    tailGroup: dummyGroup,
    headGroup: dummyGroup,
    jawGroup: dummyGroup,
    tongue: dummyMesh,
    setSkin,
    getSkin: () => currentSkinId,
    dispose: () => {
      if (currentMixer) {
        currentMixer.stopAllAction();
        currentMixer.uncacheRoot(modelHolder);
      }
      modelHolder.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      });
      modelHolder.clear();
    },
    updateAnimation(
      _runTime: number,
      speed: number,
      dt: number,
      isBiting: boolean,
      isJumping: boolean = false,
      targetMotoX?: number,
      targetMotoY?: number,
      targetMotoZ?: number,
      dogX?: number,
      dogY?: number
    ) {
      if (currentMixer) {
        if (isJumping) {
          // 🐕 ANIMAÇÃO REAL DE PULO: Congela o ciclo de corrida de patas e assume a pose do salto
          currentMixer.setTime(0.15); // Frame de salto com patas estendidas
        } else {
          // Transição de passo suave proporcional à velocidade (sem deslizar na pista)
          const baseRunSpeed = Math.max(0.65, (speed || 12) / 7.8);
          currentMixer.update(dt * baseRunSpeed);

          // Garante que o action esteja ativo e despausado durante a corrida no solo
          if (currentAction && currentAction.paused) {
            currentAction.paused = false;
            currentAction.play();
          }
        }
      }

      // 🐕 BALANÇO NATURAL DA CAUDA E COLUNA DURANTE A CORRIDA:
      // A cauda balança organicamente de um lado para o outro acompanhando a passada e velocidade
      if (currentModel && !isJumping) {
        const runCadence = _runTime * Math.max(6.0, (speed || 12) * 0.75);
        const tailSway = Math.sin(runCadence) * 0.18;
        const tailLift = Math.cos(runCadence * 0.5) * 0.08;

        currentModel.traverse((node) => {
          const lower = node.name.toLowerCase();
          if (lower.includes('tail') && !lower.includes('tail1')) {
            node.rotation.y = tailSway;
            node.rotation.z = 0.55 + tailLift;
          } else if (lower.includes('tail1')) {
            node.rotation.y = tailSway * 1.35;
            node.rotation.z = 0.25 + tailLift * 1.2;
          }
        });
      }

      modelHolder.rotation.y = 0;

      if (modelHolder) {
        if (isJumping) {
          // Pose alongada aerodinâmica de salto no ar
          modelHolder.position.z = 0.12;
          modelHolder.rotation.x = -0.14;
        } else if (isBiting) {
          modelHolder.position.z = 0.25;
          modelHolder.rotation.x = 0.14;
        } else {
          // Leve amortecimento do tronco na corrida
          const bodyBob = Math.sin(_runTime * 14.0) * 0.02;
          modelHolder.position.y = bodyBob;
          modelHolder.position.z = 0;
          modelHolder.rotation.x = 0;
        }
      }
    },
  };
}

export function preloadAllCarameloSkins() {
  if (typeof window === 'undefined') return;
  CARAMELO_SKINS.forEach((skin) => {
    loadGltfCarameloSkin(skin.id, undefined, false);
  });
}
