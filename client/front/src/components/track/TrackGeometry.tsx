import React, { Suspense, useEffect, useMemo } from 'react';
import { Text, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FrenetFrames } from './types';

const TRACK_SURFACE_OFFSET = 0.1;

class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function SignBoardImage({ url }: { url: string }) {
  const texture = useTexture(url);
  const { gl } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
  }, [texture, gl]);

  return (
    <meshBasicMaterial
      map={texture}
      toneMapped={false}
      polygonOffset
      polygonOffsetFactor={-2}
      polygonOffsetUnits={-2}
    />
  );
}

function getTrackAlignedTransform(
  curve: THREE.CatmullRomCurve3,
  frames: FrenetFrames,
  steps: number,
  t: number,
  upOffset = 0
) {
  const clampedT = THREE.MathUtils.clamp(t, 0, 1);
  const pos = curve.getPointAt(clampedT);
  const tangent = curve.getTangentAt(clampedT).normalize();

  const exact = clampedT * steps;
  const i = Math.floor(exact);
  const ni = Math.min(i + 1, steps);
  const a = exact - i;

  const binormal = frames.binormals[i]
    .clone()
    .lerp(frames.binormals[ni], a)
    .normalize();

  const liftedPos = pos.clone().add(binormal.clone().multiplyScalar(upOffset));
  const matrix = new THREE.Matrix4();
  matrix.lookAt(liftedPos, liftedPos.clone().add(tangent), binormal);

  return {
    position: liftedPos,
    quaternion: new THREE.Quaternion().setFromRotationMatrix(matrix),
  };
}

export function Track({ curve, steps }: { curve: THREE.CatmullRomCurve3, steps: number }) {
  const { trackGeo, stripeGeo } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2.5, 0);
    shape.lineTo(2.5, 0);
    shape.lineTo(2.5, 0.4);
    shape.lineTo(2.1, 0.4);
    shape.lineTo(2.1, 0.1);
    shape.lineTo(-2.1, 0.1);
    shape.lineTo(-2.1, 0.4);
    shape.lineTo(-2.5, 0.4);
    shape.lineTo(-2.5, 0);

    const trackGeo = new THREE.ExtrudeGeometry(shape, {
      steps: steps,
      extrudePath: curve,
      bevelEnabled: false,
    });

    const stripeShape = new THREE.Shape();
    stripeShape.moveTo(-0.2, 0.11);
    stripeShape.lineTo(0.2, 0.11);
    stripeShape.lineTo(0.2, 0.15);
    stripeShape.lineTo(-0.2, 0.15);
    stripeShape.lineTo(-0.2, 0.11);

    const stripeGeo = new THREE.ExtrudeGeometry(stripeShape, {
      steps: steps,
      extrudePath: curve,
      bevelEnabled: false,
    });

    return { trackGeo, stripeGeo };
  }, [curve, steps]);

  return (
    <group>
      <mesh geometry={trackGeo}>
        <meshStandardMaterial color="#FF6A00" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={stripeGeo}>
        <meshStandardMaterial color="#0D0D0F" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

type SignBoardProps = {
  curve: THREE.CatmullRomCurve3;
  frames: FrenetFrames;
  steps: number;
  t: number;
  imageUrl: string;
  productName: string;
  productPrice: number;
  isMobile?: boolean;
  onClick?: () => void;
};

export function SignBoard({ curve, frames, steps, t, imageUrl, productName, productPrice, isMobile = false, onClick }: SignBoardProps) {
  const { position, quaternion } = useMemo(() => {
    return getTrackAlignedTransform(curve, frames, steps, t, TRACK_SURFACE_OFFSET);
  }, [curve, frames, steps, t]);
  const signScale = isMobile ? 0.72 : 1;

  const metalMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.8, roughness: 0.2 }),
    []
  );
  const boardMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1A5D2E', roughness: 0.6 }),
    []
  );
  const whiteMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.8 }),
    []
  );

  return (
    <group position={position} quaternion={quaternion} scale={signScale}>
      <mesh position={[-4.5, 2.5, 0]} material={metalMaterial}>
        <cylinderGeometry args={[0.2, 0.2, 5, 16]} />
      </mesh>
      <mesh position={[4.5, 2.5, 0]} material={metalMaterial}>
        <cylinderGeometry args={[0.2, 0.2, 5, 16]} />
      </mesh>

      <mesh position={[-4.5, 0.1, 0]} material={metalMaterial}>
        <boxGeometry args={[0.6, 0.2, 0.6]} />
      </mesh>
      <mesh position={[4.5, 0.1, 0]} material={metalMaterial}>
        <boxGeometry args={[0.6, 0.2, 0.6]} />
      </mesh>

      <mesh position={[0, 4.5, 0]} material={metalMaterial} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 9, 8]} />
      </mesh>
      <mesh position={[0, 3.5, 0]} material={metalMaterial} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 9, 8]} />
      </mesh>

      {Array.from({ length: 9 }).map((_, i) => {
        const x = -4 + i * 1;
        return (
          <group key={i}>
            <mesh position={[x, 4, 0]} material={metalMaterial} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.05, 0.05, 1.414, 8]} />
            </mesh>
            <mesh position={[x, 4, 0]} material={metalMaterial} rotation={[0, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.05, 0.05, 1.414, 8]} />
            </mesh>
          </group>
        );
      })}

      <group
        position={[0, 4, 0.1]}
        onClick={onClick}
        onPointerOver={(e) => {
          if (onClick) {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e) => {
          if (onClick) {
            e.stopPropagation();
            document.body.style.cursor = 'auto';
          }
        }}
      >
        <mesh material={boardMaterial}>
          <boxGeometry args={[6.2, 3.2, 0.1]} />
        </mesh>
        <mesh position={[0, 0, -0.01]} material={whiteMaterial}>
          <boxGeometry args={[6.3, 3.3, 0.08]} />
        </mesh>
        <mesh position={[0, 0, 0.07]} renderOrder={2}>
          <planeGeometry args={[6.0, 3.0]} />
          <Suspense fallback={<meshBasicMaterial color="#222" />}>
            <ErrorBoundary fallback={<meshBasicMaterial color="#FF0000" />}>
              <SignBoardImage url={imageUrl} />
            </ErrorBoundary>
          </Suspense>
        </mesh>

        <Suspense fallback={null}>
          <Text
            position={[0, -2.2, 0.1]}
            fontSize={0.4}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.1}
          >
            {productName.toUpperCase()}
          </Text>
          <Text
            position={[0, -2.8, 0.1]}
            fontSize={0.3}
            color="#FFFFFF"
            outlineWidth="8%"
            outlineColor="#5C0000"
            outlineBlur="30%"
            depthOffset={-1}
            material-toneMapped={false}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.05}
          >
            ${productPrice.toFixed(2)}
          </Text>
        </Suspense>
      </group>
    </group>
  );
}

export function FinishLine({ curve, frames, steps, t }: { curve: THREE.CatmullRomCurve3, frames: FrenetFrames, steps: number, t: number }) {
  const { position, quaternion } = useMemo(() => {
    return getTrackAlignedTransform(curve, frames, steps, t, TRACK_SURFACE_OFFSET);
  }, [curve, frames, steps, t]);

  const metalMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.8, roughness: 0.2 }),
    []
  );

  const checkerTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, 1024, 256);
      context.fillStyle = '#000000';
      const rows = 4;
      const cols = 16;
      const w = 1024 / cols;
      const h = 256 / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if ((i + j) % 2 === 0) {
            context.fillRect(i * w, j * h, w, h);
          }
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  const bannerMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: checkerTexture, roughness: 0.8 }),
    [checkerTexture]
  );

  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[-4.5, 3, 0]} material={metalMaterial}>
        <cylinderGeometry args={[0.2, 0.2, 6, 16]} />
      </mesh>
      <mesh position={[4.5, 3, 0]} material={metalMaterial}>
        <cylinderGeometry args={[0.2, 0.2, 6, 16]} />
      </mesh>

      <mesh position={[0, 4.5, 0]} material={bannerMaterial}>
        <boxGeometry args={[9, 1.5, 0.1]} />
      </mesh>

      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 1]} />
        <meshStandardMaterial map={checkerTexture} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
