import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createMotoInstance, type MotoInstance } from '../../services/motoModelLoader';
import { createMotoboyInstance, type MotoboyInstance } from '../../services/motoboyModelLoader';
import { RotateCcw } from 'lucide-react';

interface Garage3DShowroomProps {
  motoId: string;
  className?: string;
}

export const Garage3DShowroom: React.FC<Garage3DShowroomProps> = ({ motoId, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let animId: number;
    let motoInstance: MotoInstance | null = null;
    let motoboy1Instance: MotoboyInstance | null = null;
    let motoboy2Instance: MotoboyInstance | null = null;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // Cena
    const scene = new THREE.Scene();

    // Palco giratório (contém a moto no centro e os 2 motoboys ao lado)
    const showroomStage = new THREE.Group();
    showroomStage.name = 'ShowroomStage';
    scene.add(showroomStage);

    // Câmera Showroom enquadrando a moto e os dois motoboys
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(2.6, 1.5, 3.8);
    camera.lookAt(0, 0.8, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Iluminação de Estúdio Showroom
    const ambientLight = new THREE.AmbientLight(0xfff8ed, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 3.4);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 2.8);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Pódio / Chão de Madeira & Metal Ampliado (acomoda a moto e os motoboys)
    const podiumGeo = new THREE.CylinderGeometry(2.35, 2.5, 0.08, 48);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.35,
      metalness: 0.75,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.04;
    podium.receiveShadow = true;
    scene.add(podium);

    // Anel decorativo dourado
    const ringGeo = new THREE.RingGeometry(2.28, 2.38, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    // Suporte a Rotação Interativa com Mouse / Touch
    let isDragging = false;
    let prevMouseX = 0;
    let autoRotate = true;
    let turntableAngle = 0.35;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      autoRotate = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      turntableAngle += deltaX * 0.012;
      prevMouseX = e.clientX;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 1. Carrega o Modelo 3D da Moto Selecionada
    setLoading(true);
    createMotoInstance(motoId, { scale: 1.05, castShadow: true, receiveShadow: true })
      .then((instance) => {
        if (isDisposed) {
          instance.dispose();
          return;
        }
        motoInstance = instance;
        instance.root.position.set(0, 0, 0);
        showroomStage.add(instance.root);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Garage3DShowroom] Erro na moto:', err);
        setLoading(false);
      });

    // 2. Carrega os 2 Motoboys em pé ao lado da moto (Estilo Cartoon com Contorno Branco)
    createMotoboyInstance('motoboy_1', { targetHeight: 1.70 })
      .then((inst) => {
        if (isDisposed) {
          inst.dispose();
          return;
        }
        motoboy1Instance = inst;
        // Posição: em pé ao lado esquerdo da moto, virado levemente para o centro
        inst.root.position.set(-1.18, 0, 0.15);
        inst.root.rotation.y = 0.35;
        showroomStage.add(inst.root);
      })
      .catch((err) => {
        console.warn('[Garage3DShowroom] Aviso ao carregar Motoboy 1:', err);
      });

    createMotoboyInstance('motoboy_2', { targetHeight: 1.70 })
      .then((inst) => {
        if (isDisposed) {
          inst.dispose();
          return;
        }
        motoboy2Instance = inst;
        // Posição: em pé ao lado direito da moto, virado levemente para o centro
        inst.root.position.set(1.18, 0, 0.15);
        inst.root.rotation.y = -0.35;
        showroomStage.add(inst.root);
      })
      .catch((err) => {
        console.warn('[Garage3DShowroom] Aviso ao carregar Motoboy 2:', err);
      });

    // Loop de Renderização
    let lastTime = performance.now();
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (autoRotate && !isDragging) {
        turntableAngle += dt * 0.45;
      }

      // Gira o palco inteiro em 360 graus
      showroomStage.rotation.y = turntableAngle;

      if (motoInstance) {
        motoInstance.update(dt, 0, 0, 0);
      }
      if (motoboy1Instance) {
        motoboy1Instance.update(dt);
      }
      if (motoboy2Instance) {
        motoboy2Instance.update(dt);
      }

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    // Redimensionamento
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);

      if (motoInstance) {
        motoInstance.dispose();
      }
      if (motoboy1Instance) {
        motoboy1Instance.dispose();
      }
      if (motoboy2Instance) {
        motoboy2Instance.dispose();
      }
      podiumGeo.dispose();
      podiumMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    };
  }, [motoId]);

  return (
    <div className={`relative w-full h-full min-h-[260px] sm:min-h-[320px] select-none ${className}`}>
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Indicador de carregamento */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/80 backdrop-blur-sm z-10 text-center">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mb-2" />
          <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
            Carregando Showroom 3D...
          </span>
        </div>
      )}

      {/* Dica de interação 360° */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none bg-stone-950/70 border border-amber-400/30 px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-amber-200 cartoon-text-outline">
        <RotateCcw className="w-3 h-3 text-amber-400" />
        <span>Arraste para girar 360°</span>
      </div>
    </div>
  );
};
