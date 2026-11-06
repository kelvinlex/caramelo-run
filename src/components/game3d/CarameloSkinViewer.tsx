import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { loadGltfCarameloSkin, CarameloSkinConfig } from './CarameloModel';

interface CarameloSkinViewerProps {
  skin: CarameloSkinConfig;
  className?: string;
}

export const CarameloSkinViewer: React.FC<CarameloSkinViewerProps> = ({ skin, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const skinGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const autoRotateSpeedRef = useRef(0.012);
  const ringMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const currentMixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x592209);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(2.8, 1.45, 3.2);
    camera.lookAt(0, 0.65, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 2.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const pedestalGeo = new THREE.CylinderGeometry(1.75, 1.88, 0.12, 36);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x7c3512,
      metalness: 0.25,
      roughness: 0.45,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.06;
    scene.add(pedestal);

    const ringGeo = new THREE.TorusGeometry(1.78, 0.045, 12, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(skin.color || '#f59e0b'),
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);
    ringMatRef.current = ringMat;

    const rotGroup = new THREE.Group();
    scene.add(rotGroup);
    skinGroupRef.current = rotGroup;

    loadGltfCarameloSkin(
      skin.id,
      (model, mixer) => {
        if (!skinGroupRef.current) return;
        skinGroupRef.current.clear();
        currentMixerRef.current = mixer;
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        model.position.y -= bbox.min.y;
        skinGroupRef.current.add(model);
      },
      true
    );

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !skinGroupRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      skinGroupRef.current.rotation.y += deltaX * 0.012;
      autoRotateSpeedRef.current = 0;
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      autoRotateSpeedRef.current = 0.012;
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
      autoRotateSpeedRef.current = 0;
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      autoRotateSpeedRef.current = 0.012;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    dom.addEventListener('touchend', handleTouchEnd);

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        const dt = clock.getDelta();
        if (currentMixerRef.current) {
          currentMixerRef.current.update(dt * 0.75);
        }

        if (skinGroupRef.current && !isDraggingRef.current) {
          skinGroupRef.current.rotation.y += autoRotateSpeedRef.current;
        }

        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

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
      pedestalGeo.dispose();
      pedestalMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    };
  }, []);

  useEffect(() => {
    if (ringMatRef.current) {
      ringMatRef.current.color.set(skin.color || '#f59e0b');
    }
    if (skinGroupRef.current) {
      loadGltfCarameloSkin(
        skin.id,
        (model, mixer) => {
          if (!skinGroupRef.current) return;
          skinGroupRef.current.clear();
          currentMixerRef.current = mixer;
          model.updateMatrixWorld(true);
          const bbox = new THREE.Box3().setFromObject(model);
          model.position.y -= bbox.min.y;
          skinGroupRef.current.add(model);
        },
        true
      );
    }
  }, [skin.id, skin.color]);

  return (
    <div className={`relative w-full h-full min-h-[240px] rounded-2xl overflow-hidden border-[3px] border-[#d97706] bg-[#451a03] shadow-2xl flex items-center justify-center ${className || 'h-56 sm:h-64'}`}>
      <div ref={mountRef} className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing" />
    </div>
  );
};

