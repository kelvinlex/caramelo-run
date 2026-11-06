import * as THREE from 'three';

/**
 * ============================================================================
 * FRONTAL FRUSTUM CULLING SYSTEM ("TECNOLOGIA DE RENDERIZAR APENAS A FRENTE")
 * ============================================================================
 * Sistema profissional de Frustum Culling frontal e descarte de geometria traseira.
 * Garante que a GPU processe e rasterize APENAS os quarteirões, árvores, casas,
 * obstáculos e props urbanos que estão estritamente à frente da câmera e dentro
 * da pirâmide de visão frontal (Camera Frustum).
 * 
 * Benefícios:
 * - Redução drástica de Draw Calls na GPU.
 * - Descarte imediato de chunks e objetos situados atrás da câmera (Z < camera.z).
 * - Otimização de taxa de quadros (FPS alto e estável).
 * - Zero desperdício de fillrate com elementos fora da tela frontal.
 */

export class FrontalFrustumCulling {
  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;
  private tempBox: THREE.Box3;
  private tempSphere: THREE.Sphere;
  private tempVec: THREE.Vector3;
  private frameCount: number = 0;

  constructor() {
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.tempBox = new THREE.Box3();
    this.tempSphere = new THREE.Sphere();
    this.tempVec = new THREE.Vector3();
  }

  /**
   * Atualiza a pirâmide de projeção visual da câmera para o frame atual
   */
  public updateCamera(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    this.frameCount++;
  }

  /**
   * Aplica o culling frontal nos Chunks do runner.
   * Chunks totalmente atrás da câmera ou fora da visão são ocultados (visible = false).
   * Suporta distância máxima de visibilidade baseada na qualidade gráfica (renderDistance).
   */
  public cullChunks(chunks: THREE.Group[], cameraPos: THREE.Vector3, chunkLength: number, maxVisibleDistance: number = 180.0): void {
    const camZ = cameraPos.z;
    const behindThreshold = camZ - 16.0; // Margem de segurança atrás da câmera

    // ⚡ DISTÂNCIA DE RENDER REDUZIDA PARA AS CASAS LÁ EM CIMA DA FAVELA:
    // Enquanto o asfalto e as casas térreas permanecem visíveis pela distância total,
    // as construções altas do topo do morro (Tier 2, Tier 3 e grandes complexos) usam
    // uma distância de render reduzida (~60m a 85m no máximo).
    // Isso poupa centenas de malhas e draw calls por frame nos navegadores!
    const upperFavelaMaxDist = Math.min(85.0, maxVisibleDistance * 0.46);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkZ = chunk.position.z;
      const chunkEnd = chunkZ + chunkLength;

      // 1. Descarte frontal estrito: se o chunk inteiro está atrás da câmera, oculta imediatamente!
      if (chunkEnd < behindThreshold) {
        chunk.visible = false;
        continue;
      }

      // 2. Se o chunk está além da distância de visão frontal máxima (oculto no fog), descarta da GPU e CPU
      if (chunkZ > camZ + maxVisibleDistance) {
        chunk.visible = false;
        continue;
      }

      // 3. Teste de Bounding Sphere do Chunk com o Frustum frontal da câmera
      const chunkCenterZ = chunkZ + chunkLength * 0.5;
      this.tempSphere.center.set(0, 5, chunkCenterZ);
      this.tempSphere.radius = chunkLength * 0.75 + 35.0; // Raio abrangendo a largura das casas laterais

      if (this.frustum.intersectsSphere(this.tempSphere)) {
        chunk.visible = true;

        // 🏘️ RENDER DISTANCE ESPECÍFICO REDUZIDO PARA AS CASAS LÁ EM CIMA DO MORRO DA FAVELA:
        const favelaUpper = chunk.userData.favelaUpperGroup as THREE.Group | undefined;
        if (favelaUpper) {
          const distToChunk = chunkCenterZ - camZ;
          favelaUpper.visible = (distToChunk <= upperFavelaMaxDist && distToChunk >= -28.0);
        }
      } else {
        // Se estiver completamente fora do cone frontal lateral da câmera
        chunk.visible = false;
      }
    }
  }

  /**
   * Garante que todos os Meshes de uma hierarquia tenham frustumCulled = true
   * e Bounding Sphere computadas para aceleração nativa na GPU.
   */
  public static ensureFrustumCulledHierarchy(root: THREE.Object3D): void {
    if (!root) return;
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true;
        if (child.geometry && !child.geometry.boundingSphere) {
          child.geometry.computeBoundingSphere();
        }
      }
    });
  }
}

// Instância singleton global do sistema de Frustum Culling Frontal
export const frontalFrustumCulling = new FrontalFrustumCulling();
