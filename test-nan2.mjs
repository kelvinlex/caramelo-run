import * as THREE from 'three';

const c1 = new THREE.CylinderGeometry(0.018, 0.018, -0.05, 6);
c1.computeBoundingSphere();
console.log('c1:', c1.boundingSphere);

const c2 = new THREE.CylinderGeometry(0, 0, 0, 6);
c2.computeBoundingSphere();
console.log('c2:', c2.boundingSphere);
