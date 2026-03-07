import React, { useMemo, useRef } from 'react';
import { Stars, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FrenetFrames } from './types';

export function CameraRig({
  curve,
  bannerTs,
  frames,
  steps,
  tStep,
  isMobile = false,
}: {
  curve: THREE.CatmullRomCurve3;
  bannerTs: number[];
  frames: FrenetFrames;
  steps: number;
  tStep: number;
  isMobile?: boolean;
}) {
  const scroll = useScroll();
  const { camera } = useThree();

  const smoothT = useRef(0);
  const lookTarget = useRef(new THREE.Vector3());
  const smoothForward = useRef(new THREE.Vector3(0, 0, -1));
  const smoothUp = useRef(new THREE.Vector3(0, 1, 0));
  const smoothRight = useRef(new THREE.Vector3(1, 0, 0));
  const initialized = useRef(false);
  const prevUp = useRef(new THREE.Vector3(0, 1, 0));

  useFrame((_, delta) => {
    const targetT = THREE.MathUtils.clamp(scroll.offset, 0, 0.9999);

    smoothT.current = THREE.MathUtils.lerp(
      smoothT.current,
      targetT,
      1 - Math.exp(-delta * 5)
    );

    const t = smoothT.current;
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);

    const exact = t * steps;
    const i = Math.floor(exact);
    const ni = Math.min(i + 1, steps);
    const a = exact - i;

    const frameUp = frames.binormals[i]
      .clone()
      .lerp(frames.binormals[ni], a)
      .normalize();

    if (frameUp.dot(worldUp) < 0) {
      frameUp.multiplyScalar(-1);
    }
    if (frameUp.dot(prevUp.current) < 0) {
      frameUp.multiplyScalar(-1);
    }
    prevUp.current.copy(frameUp);

    const rideUp = frameUp.clone();

    let right = new THREE.Vector3().crossVectors(tangent, rideUp);
    if (right.lengthSq() < 1e-6) {
      right = smoothRight.current.clone();
    }
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();

    const orientationLerp = 1 - Math.exp(-delta * 10);
    smoothForward.current.lerp(tangent, orientationLerp).normalize();
    smoothUp.current.lerp(up, orientationLerp).normalize();
    smoothRight.current.lerp(right, orientationLerp).normalize();

    const height = 3.3;
    const pullBack = isMobile ? 1.75 : 0.55;
    const lookAheadDistance = 10;
    const lookLift = 0.8;

    const desiredPos = position
      .clone()
      .add(smoothUp.current.clone().multiplyScalar(height))
      .add(smoothForward.current.clone().multiplyScalar(-pullBack));

    const desiredLookAt = desiredPos
      .clone()
      .add(smoothForward.current.clone().multiplyScalar(lookAheadDistance))
      .add(smoothUp.current.clone().multiplyScalar(lookLift));

    if (!initialized.current) {
      camera.position.copy(desiredPos);
      lookTarget.current.copy(desiredLookAt);
      initialized.current = true;
    } else {
      const positionLerp = 1 - Math.exp(-delta * 8);
      const lookLerp = 1 - Math.exp(-delta * 9);
      camera.position.lerp(desiredPos, positionLerp);
      lookTarget.current.lerp(desiredLookAt, lookLerp);
    }

    const minClearance = 0.85;
    const toCamera = camera.position.clone().sub(position);
    const clearance = toCamera.dot(smoothUp.current);
    if (clearance < minClearance) {
      camera.position.add(
        smoothUp.current.clone().multiplyScalar(minClearance - clearance)
      );
    }

    camera.up.copy(smoothUp.current);
    camera.lookAt(lookTarget.current);

    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = isMobile ? 82 : 72;
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 1 - Math.exp(-delta * 6));
    cam.updateProjectionMatrix();
  });

  return null;
}

export function SpeedLines() {
  const linesRef = useRef<THREE.Group>(null);
  const scroll = useScroll();
  const { camera } = useThree();
  const previousOffset = useRef(0);
  const speedStrength = useRef(0);

  const lines = useMemo(() => {
    return Array.from({ length: 200 }).map(() => ({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      z: -Math.random() * 200,
      speed: Math.random() * 2 + 1,
      length: Math.random() * 10 + 5,
    }));
  }, []);

  useFrame((_, delta) => {
    if (linesRef.current) {
      const offsetDelta = Math.abs(scroll.offset - previousOffset.current);
      previousOffset.current = scroll.offset;

      const velocity = offsetDelta / Math.max(delta, 0.0001);
      const targetStrength = THREE.MathUtils.clamp(velocity * 14, 0, 1);
      const fadeLerp = 1 - Math.exp(-delta * 10);
      speedStrength.current = THREE.MathUtils.lerp(
        speedStrength.current,
        targetStrength,
        fadeLerp
      );

      linesRef.current.position.copy(camera.position);
      linesRef.current.quaternion.copy(camera.quaternion);
      linesRef.current.visible = speedStrength.current > 0.02;

      linesRef.current.children.forEach((child, i) => {
        if (lines[i]) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.opacity = 0.15 * speedStrength.current;

          child.position.z += lines[i].speed * speedStrength.current * 6;
          if (child.position.z > 10) {
            child.position.z = -200;
          }
        }
      });
    }
  });

  return (
    <group ref={linesRef}>
      {
        lines.map((line, i) => (
          <mesh key={i} position={[line.x, line.y, line.z]}>
            <boxGeometry args={[0.05, 0.05, line.length]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} />
          </mesh>
        ))
      }
    </group>
  );
}

export function MovingStars() {
  const starsRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.position.copy(camera.position);
    }
  });

  return (
    <group ref={starsRef}>
      <Stars radius={100} depth={50} count={800} factor={4} saturation={0} fade speed={1} />
    </group>
  );
}
