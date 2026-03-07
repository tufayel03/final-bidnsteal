import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plane } from 'lucide-react';

export function HUDHero({
  onShopClick,
  isAutoPilot,
  setIsAutoPilot,
  autoPilotSpeed,
  setAutoPilotSpeed,
}: {
  onShopClick: () => void,
  isAutoPilot: boolean,
  setIsAutoPilot: (val: boolean) => void,
  autoPilotSpeed: number,
  setAutoPilotSpeed: (speed: number) => void,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Collapse menu if auto pilot is turned off externally (e.g. scrolling back up)
  useEffect(() => {
    if (!isAutoPilot) {
      setIsExpanded(false);
    }
  }, [isAutoPilot]);

  const currentGear = autoPilotSpeed / 2;

  return (
    <section className="h-[100svh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-transparent pointer-events-none px-4 pt-16 pb-24 md:pb-0">
      <div className="z-10 flex max-w-[22rem] flex-col items-center justify-center text-center pointer-events-auto md:mt-[-10vh] md:max-w-none">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="font-display text-[3.8rem] leading-[0.88] md:text-8xl lg:text-9xl text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,42,0,0.5)]"
        >
          Speed <span className="text-[#FF2A00]">Syndicate</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-5 font-mono text-[11px] md:text-lg text-gray-300 tracking-[0.22em] md:tracking-[0.3em] uppercase max-w-2xl px-2 md:px-4"
        >
          Experience the ultimate cinematic racing track.
        </motion.p>
      </div>

      {/* AUTO PILOT SECTION (CENTER) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-5 md:gap-6 z-20 pointer-events-auto"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFD500]">
          Auto Pilot
        </div>

        <div className="relative flex flex-col items-center w-full">
          <div
            className={`absolute -top-8 font-mono text-[9px] sm:text-[10px] tracking-[0.2em] transition-opacity duration-300 ${
              isExpanded && !isAutoPilot ? 'opacity-100 text-[#FFD500] animate-pulse' : 'opacity-0 pointer-events-none whitespace-nowrap'
            }`}
          >
            SELECT GEAR TO ENGAGE
          </div>

          <div
            className={`relative flex items-center bg-[#0a0a0c]/95 backdrop-blur-md border-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
              isAutoPilot
                ? 'border-[#FF2A00] shadow-[0_0_30px_rgba(255,42,0,0.5)]'
                : isExpanded
                  ? 'border-[#FFD500] shadow-[0_0_20px_rgba(255,213,0,0.2)]'
                  : 'border-white/30 hover:border-[#FFD500]'
            } ${
              isExpanded ? 'w-[280px] sm:w-[380px] h-20 sm:h-24' : 'w-16 h-16 sm:w-20 sm:h-20'
            }`}
          >
            <button
              onClick={() => {
                if (isAutoPilot) {
                  setIsAutoPilot(false);
                  setIsExpanded(false);
                } else {
                  setIsExpanded(!isExpanded);
                }
              }}
              className={`absolute left-0 z-20 flex items-center justify-center rounded-full transition-all duration-300 ${
                isExpanded ? 'w-16 h-20 sm:w-20 sm:h-24 bg-transparent' : 'w-16 h-16 sm:w-20 sm:h-20 bg-black/50'
              } ${isAutoPilot && !isExpanded ? 'bg-[#FF2A00]/20' : ''}`}
            >
              <div className={`transition-transform duration-500 ${isAutoPilot ? 'translate-y-1 scale-90' : isExpanded ? 'rotate-[-45deg] scale-90' : ''}`}>
                <Plane
                  className={`w-6 h-6 sm:w-7 sm:h-7 ${isAutoPilot ? 'text-[#FF2A00]' : isExpanded ? 'text-[#FFD500]' : 'text-white'}`}
                  style={{ transform: 'rotate(135deg)' }}
                />
              </div>
            </button>

            <div
              className={`relative flex-1 flex flex-col justify-center h-full ml-16 sm:ml-20 pr-4 sm:pr-8 transition-opacity duration-300 ${
                isExpanded ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="relative w-full flex justify-between items-center z-10">
                <div className="absolute left-0 right-0 h-[2px] bg-white/10 -z-10" />
                <div
                  className="absolute left-0 h-[2px] bg-gradient-to-r from-[#FFD500] to-[#FF2A00] transition-all duration-500 -z-10"
                  style={{ width: isAutoPilot ? `${((currentGear - 1) / 3) * 100}%` : '0%' }}
                />

                {[1, 2, 3, 4].map((gear) => {
                  const isActive = isAutoPilot && currentGear === gear;
                  const speedDisplay = gear === 1 ? '30' : gear === 2 ? '60' : gear === 3 ? '90' : '120';
                  return (
                    <div
                      key={gear}
                      onClick={() => {
                        setAutoPilotSpeed(gear * 2);
                        setIsAutoPilot(true);
                      }}
                      className="relative flex flex-col items-center justify-center group cursor-pointer w-6 h-6 sm:w-8 sm:h-8"
                    >
                      <span className={`absolute -top-5 sm:-top-6 font-mono text-[10px] sm:text-[12px] font-bold transition-colors ${isActive ? 'text-[#FFD500]' : 'text-gray-500 group-hover:text-white'}`}>
                        G{gear}
                      </span>

                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rotate-45 transition-all duration-300 ${
                        isActive
                          ? 'bg-[#FF2A00] border-[#FF2A00] shadow-[0_0_15px_rgba(255,42,0,0.8)] scale-125'
                          : 'bg-black border border-gray-500 group-hover:border-white group-hover:scale-110'
                      }`} />

                      <span className={`absolute -bottom-5 sm:-bottom-6 font-mono text-[8px] sm:text-[10px] tracking-wider transition-colors whitespace-nowrap ${isActive ? 'text-[#FF2A00]' : 'text-gray-600 group-hover:text-gray-400'}`}>
                        {speedDisplay}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
