import * as THREE from 'three';

export type FrenetFrames = {
  tangents: THREE.Vector3[];
  normals: THREE.Vector3[];
  binormals: THREE.Vector3[];
};
