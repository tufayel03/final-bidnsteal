import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 2500; // 2.5 seconds to reach 100
    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      // Ease out cubic
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const currentProgress = Math.min(progress / duration, 1);
      const currentSpeed = Math.floor(easeOut(currentProgress) * 100);
      
      setSpeed(currentSpeed);

      if (currentProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        timeoutId = setTimeout(onComplete, 300); // Wait a bit after reaching 100
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);
    };
  }, [onComplete]);

  // Calculate needle angle (-135 to 135 degrees)
  const angle = -135 + (speed / 100) * 270;

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-[#0D0D0F] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
        {/* Outer Glow */}
        <div className="absolute inset-0 rounded-full bg-[#FF2A00] opacity-20 blur-3xl animate-pulse"></div>
        
        {/* Main Bezel */}
        <div className="absolute inset-0 rounded-full border-4 border-[#111] bg-gradient-to-br from-[#222] to-[#050505] shadow-[inset_0_0_30px_rgba(0,0,0,1),0_10px_20px_rgba(0,0,0,0.8)]"></div>
        
        {/* Inner Ring */}
        <div className="absolute inset-4 rounded-full border border-[#333] bg-[#0a0a0c] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>
        
        {/* Ticks and Numbers (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
          <defs>
            <linearGradient id="loadTickGrad" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#FFD500" />
              <stop offset="100%" stopColor="#FF2A00" />
            </linearGradient>
          </defs>
          
          {/* Colored Arc */}
          <path
            d="M 42.7 181.3 A 98 98 0 1 1 181.3 181.3"
            fill="none"
            stroke="url(#loadTickGrad)"
            strokeWidth="3"
            strokeDasharray="4 6"
            opacity="0.3"
          />

          {/* Generate ticks */}
          {Array.from({ length: 21 }).map((_, i) => {
            const tickAngle = 135 + (i * 270) / 20;
            const angleRad = (tickAngle * Math.PI) / 180;
            const isMajor = i % 2 === 0;
            const length = isMajor ? 14 : 6;
            const width = isMajor ? 3 : 1.5;
            const radius = 98;
            const cx = 112;
            const cy = 112;
            const x1 = cx + (radius - length) * Math.cos(angleRad);
            const y1 = cy + (radius - length) * Math.sin(angleRad);
            const x2 = cx + radius * Math.cos(angleRad);
            const y2 = cy + radius * Math.sin(angleRad);
            const color = i > 16 ? '#FF2A00' : (i > 12 ? '#FFD500' : '#FFFFFF');
            
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
                {isMajor && (
                  <text
                    x={cx + (radius - 28) * Math.cos(angleRad)}
                    y={cy + (radius - 28) * Math.sin(angleRad)}
                    fill={color}
                    fontSize="14"
                    fontFamily="Montserrat, sans-serif"
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  >
                    {i * 5}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Status Text */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
           <span className="font-display text-[#FFD500] text-sm tracking-widest animate-pulse">INITIALIZING</span>
        </div>

        {/* Digital Display */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-2 flex flex-col items-center">
          <div className="bg-[#050505] border border-[#222] rounded px-6 py-2 flex flex-col items-center shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
            <span className="font-display text-5xl text-white tracking-tighter leading-none" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>{speed}</span>
            <span className="font-mono text-[10px] text-[#FFD500] uppercase tracking-widest mt-1">PERCENT</span>
          </div>
        </div>

        {/* Needle */}
        <div className="absolute top-1/2 left-1/2 w-1.5 h-28 md:h-36 -ml-[3px] -mt-28 md:-mt-36 origin-bottom transition-transform duration-75" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="w-full h-full bg-gradient-to-t from-transparent via-[#FF2A00] to-[#FFD500] rounded-t-full shadow-[0_0_15px_rgba(255,42,0,1)]"></div>
        </div>
        
        {/* Center Cap */}
        <div className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 rounded-full bg-gradient-to-br from-[#333] to-[#0a0a0c] border-2 border-[#111] shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center z-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#111] to-[#000] border border-[#222] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#FF2A00] shadow-[0_0_8px_rgba(255,42,0,0.8)]"></div>
          </div>
        </div>
      </div>
      
      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="h-1 w-48 bg-[#222] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#FF2A00] to-[#FFD500] transition-all duration-75"
            style={{ width: `${speed}%` }}
          ></div>
        </div>
        <span className="font-mono text-xs text-white/50 tracking-widest uppercase">Loading Assets...</span>
      </div>
    </motion.div>
  );
}
