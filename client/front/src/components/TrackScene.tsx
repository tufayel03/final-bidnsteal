import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ScrollControls } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { OverlayUI } from './OverlayUI';
import { CameraRig, MovingStars, SpeedLines } from './track/TrackEffects';
import { FinishLine, SignBoard, Track } from './track/TrackGeometry';
import { useStore } from '../context/StoreContext';

function buildTrackData(totalBanners: number) {
  const zSpacing = 10;
  const totalPoints = Math.max(20, totalBanners * 6 + 10);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const z = -i * zSpacing;
    const x =
      Math.sin(i * 0.35) * 60 +
      Math.sin(i * 0.12) * 30;

    const y =
      Math.cos(i * 0.25) * 40 +
      Math.sin(i * 0.1) * 20;
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const steps = Math.floor(curve.getLength() * 4);
  const frames = curve.computeFrenetFrames(steps, false);

  const bannerTs = Array.from(
    { length: totalBanners },
    (_, i) => 0.05 + (0.85 / totalBanners) * i
  );

  const tStep = totalBanners > 1 ? (0.92 - 0.05) / (totalBanners - 1) : 0;

  return { curve, steps, bannerTs, frames, tStep };
}

export function TrackScene() {
  const navigate = useNavigate();
  const { products } = useStore();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;

  const { curve, bannerTs, steps, frames, tStep } = useMemo(
    () => buildTrackData(Math.max(products.length, 1)),
    [products.length]
  );

  const pages = Math.max(5, Math.floor(Math.max(products.length, 1) * 1.5));

  return (
    <div className="w-full h-[100svh] bg-[#0D0D0F]">
      <Canvas camera={{ position: [0, 2, 5], fov: 120 }}>
        <color attach="background" args={['#0D0D0F']} />
        <fog attach="fog" args={['#0D0D0F', 10, 150]} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#FFD500" />
        <pointLight position={[0, 5, -50]} intensity={2} color="#FF2A00" distance={50} />
        <pointLight position={[30, 15, -100]} intensity={2} color="#FF6A00" distance={50} />
        <pointLight position={[-50, 25, -250]} intensity={2} color="#FFD500" distance={50} />

        <MovingStars />

        <ScrollControls pages={pages} damping={0.25}>
          <Track curve={curve} steps={steps} />
          {bannerTs.map((t, i) => (
            <SignBoard
              key={i}
              curve={curve}
              frames={frames}
              steps={steps}
              t={t}
              imageUrl={products[i]?.image || ''}
              productName={products[i]?.name || 'Incoming Drop'}
              productPrice={products[i]?.price || 0}
              isMobile={isMobile}
              onClick={() => {
                const identifier = products[i]?.slug || products[i]?.id;
                if (identifier) navigate(`/product/${identifier}`);
              }}
            />
          ))}
          <FinishLine curve={curve} frames={frames} steps={steps} t={0.98} />
          <CameraRig curve={curve} bannerTs={bannerTs} frames={frames} steps={steps} tStep={tStep} isMobile={isMobile} />
          <SpeedLines />
          <OverlayUI onShopClick={() => navigate('/shop')} totalPages={pages} />
        </ScrollControls>

        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
