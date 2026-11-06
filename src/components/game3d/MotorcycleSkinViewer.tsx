import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { loadFbxSkin, MotoboySkinConfig } from './MotoboyModel';

interface MotorcycleSkinViewerProps {
  skin: MotoboySkinConfig;
  className?: string;
}

function createShowroomBackdropTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm golden-amber & caramel workshop backdrop (zero grey)
  const bgGrad = ctx.createRadialGradient(256, 210, 20, 256, 256, 360);
  bgGrad.addColorStop(0.0, '#c25e1a');
  bgGrad.addColorStop(0.38, '#8a3912');
  bgGrad.addColorStop(0.75, '#592209');
  bgGrad.addColorStop(1.0, '#361304');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle horizontal carved wood plank lines in the background
  for (let y = 0; y < 512; y += 36) {
    ctx.fillStyle = 'rgba(253, 186, 116, 0.06)';
    ctx.fillRect(0, y, 512, 2);
    ctx.fillStyle = 'rgba(28, 8, 2, 0.22)';
    ctx.fillRect(0, y + 34, 512, 2);
  }

  // Warm golden spotlight halo behind the motorcycle
  const spotGrad = ctx.createRadialGradient(256, 220, 10, 256, 220, 210);
  spotGrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.38)');
  spotGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.14)');
  spotGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createWoodStageTopTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  // Rich varnished wood base
  const rad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 256);
  rad.addColorStop(0.0, '#d97706');
  rad.addColorStop(0.55, '#9a3412');
  rad.addColorStop(0.85, '#6c270b');
  rad.addColorStop(1.0, '#451a03');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 512, 512);

  // Wood plank grain lines across the stage
  ctx.strokeStyle = 'rgba(45, 14, 4, 0.35)';
  ctx.lineWidth = 4;
  for (let i = 32; i < 512; i += 48) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Concentric golden inlay rings
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 210, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 145, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const MotorcycleSkinViewer: React.FC<MotorcycleSkinViewerProps> = ({ skin, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const skinGroupRef = useRef<THREE.Group | null>(null);
  const podiumGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const autoRotateSpeedRef = useRef(0.014);

  const ringMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // 1. Inicializa o ambiente 3D de Oficina/Showroom Brasileiro em Madeira & Ouro
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || container.parentElement?.clientWidth || 480;
    const height = container.clientHeight || container.parentElement?.clientHeight || 300;

    const scene = new THREE.Scene();
    const bgTex = createShowroomBackdropTexture();
    scene.background = bgTex;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.52, 4.15);
    camera.lookAt(0, 0.65, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Iluminação Quente de Estúdio Brasileiro (Sem azul/cinza frio)
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfef08a, 0x7c2d12, 1.15);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.6);
    keyLight.position.set(4, 5.5, 4);
    scene.add(keyLight);

    const warmRimLight = new THREE.DirectionalLight(0xf59e0b, 1.9);
    warmRimLight.position.set(-4, 3.5, -3);
    scene.add(warmRimLight);

    // Pódio Giratório 3D em Madeira Entalhada, Bronze e Ouro
    const podiumGroup = new THREE.Group();
    scene.add(podiumGroup);
    podiumGroupRef.current = podiumGroup;

    const stageTopTex = createWoodStageTopTexture();

    // Base inferior de madeira maciça
    const baseGeo = new THREE.CylinderGeometry(1.72, 1.84, 0.14, 36);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x5c240a,
      roughness: 0.55,
      metalness: 0.15,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.11;
    podiumGroup.add(baseMesh);

    // Disco superior envernizado com textura de madeira e medalhão dourado
    const topDiskGeo = new THREE.CylinderGeometry(1.58, 1.66, 0.08, 36);
    const topDiskMat = new THREE.MeshStandardMaterial({
      map: stageTopTex,
      roughness: 0.38,
      metalness: 0.22,
    });
    const topDisk = new THREE.Mesh(topDiskGeo, topDiskMat);
    topDisk.position.y = -0.02;
    podiumGroup.add(topDisk);

    // Aro Dourado / Cor da Moto luminoso ao redor do palco
    const ringGeo = new THREE.TorusGeometry(1.61, 0.045, 12, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(skin.color || '#f59e0b'),
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    podiumGroup.add(ring);
    ringMatRef.current = ringMat;

    // 12 Pregos / Rebites Dourados 3D cravados na borda de madeira do palco
    const rivetGeo = new THREE.SphereGeometry(0.055, 10, 10);
    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      metalness: 0.75,
      roughness: 0.25,
    });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const rivet = new THREE.Mesh(rivetGeo, rivetMat);
      rivet.position.set(Math.cos(angle) * 1.72, -0.04, Math.sin(angle) * 1.72);
      podiumGroup.add(rivet);
    }

    // Group for the rotating motorcycle (angled 3/4 view centered at origin)
    const rotGroup = new THREE.Group();
    rotGroup.rotation.y = -0.65;
    scene.add(rotGroup);
    skinGroupRef.current = rotGroup;

    // Load initial skin model into spinning group
    loadFbxSkin(skin.id, (model) => {
      rotGroup.clear();
      rotGroup.add(model);
    });

    // Interaction Handlers (Drag to inspect 360°)
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !skinGroupRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      skinGroupRef.current.rotation.y += deltaX * 0.012;
      if (podiumGroupRef.current) podiumGroupRef.current.rotation.y += deltaX * 0.012;
      autoRotateSpeedRef.current = 0;
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      autoRotateSpeedRef.current = 0.014;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !skinGroupRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.touches[0].clientX;
      skinGroupRef.current.rotation.y += deltaX * 0.012;
      if (podiumGroupRef.current) podiumGroupRef.current.rotation.y += deltaX * 0.012;
      autoRotateSpeedRef.current = 0;
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      autoRotateSpeedRef.current = 0.014;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        if (skinGroupRef.current && !isDraggingRef.current) {
          skinGroupRef.current.rotation.y += autoRotateSpeedRef.current;
          if (podiumGroupRef.current) {
            podiumGroupRef.current.rotation.y += autoRotateSpeedRef.current;
          }
        }
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || container.parentElement?.clientWidth || 480;
      const h = container.clientHeight || container.parentElement?.clientHeight || 300;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, true);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }
    requestAnimationFrame(handleResize);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('touchstart', handleTouchStart);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchend', handleTouchEnd);
      renderer.dispose();
      bgTex.dispose();
      stageTopTex.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      topDiskGeo.dispose();
      topDiskMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      rivetGeo.dispose();
      rivetMat.dispose();
    };
  }, []);

  // 2. Troca instantânea da skin sem recriar o renderer
  useEffect(() => {
    if (ringMatRef.current) {
      ringMatRef.current.color.set(skin.color || '#f59e0b');
    }
    if (skinGroupRef.current) {
      loadFbxSkin(skin.id, (model) => {
        if (skinGroupRef.current) {
          skinGroupRef.current.clear();
          skinGroupRef.current.add(model);
        }
      });
    }
  }, [skin.id, skin.color]);

  return (
    <div className={`relative w-full h-full min-h-[260px] sm:min-h-[300px] overflow-hidden bg-[#451a03] flex items-center justify-center ${className || ''}`}>
      <div ref={mountRef} className="w-full h-full min-h-[260px] sm:min-h-[300px] flex items-center justify-center cursor-grab active:cursor-grabbing" />
    </div>
  );
};

