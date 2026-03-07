import React, { useRef } from 'react';
import { Html, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function NextDropOverlay() {
  const scroll = useScroll();
  const overlayRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!overlayRef.current) return;

    const newOpacity = Math.max(0, Math.min(1, (scroll.offset - 0.95) / 0.05));
    overlayRef.current.style.opacity = newOpacity.toString();
    overlayRef.current.style.pointerEvents = newOpacity > 0.5 ? 'auto' : 'none';
  });

  return (
    <Html fullscreen zIndexRange={[50, 0]}>
      <div
        ref={overlayRef}
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
        style={{ opacity: 0, pointerEvents: 'none', backgroundColor: 'rgba(13, 13, 15, 0.9)' }}
      >
        <div className="bg-[#0D0D0F] border-2 border-white p-8 md:p-12 max-w-4xl w-full mx-4 text-center relative shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
            <div className="w-20 h-12 grid grid-cols-5 grid-rows-3 border border-white/20">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className={(i + Math.floor(i / 5)) % 2 === 0 ? 'bg-white' : 'bg-[#0D0D0F]'} />
              ))}
            </div>
            <h2 className="text-4xl md:text-6xl font-display text-white tracking-wider uppercase">
              JOIN THE <span className="text-[#FF2A00]">SYNDICATE</span>
            </h2>
          </div>
          <p className="text-gray-300 mb-8 text-lg font-sans uppercase tracking-widest">
            Encrypted alerts for the next drop.
          </p>
          <div className="flex flex-col sm:flex-row gap-0 justify-center max-w-xl mx-auto">
            <input
              type="email"
              placeholder="ENTER YOUR EMAIL"
              className="bg-[#1A1A1A] border border-gray-700 text-white px-6 py-4 font-display tracking-widest focus:outline-none focus:border-gray-500 flex-1 text-sm"
            />
            <button className="bg-[#FFD500] text-black font-display px-8 py-4 tracking-widest hover:bg-white transition-colors text-sm">
              JOIN CREW
            </button>
          </div>
        </div>
      </div>
    </Html>
  );
}
