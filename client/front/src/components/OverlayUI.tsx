import React, { useEffect, useRef, useState } from 'react';
import { Scroll, useScroll, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Flame, Terminal, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HUDHero } from './HUDHero';
import { apiRequest } from '../lib/api';

interface SiteProfile {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsappNumber: string;
  whatsappUrl: string;
  supportPhoneUrl: string;
  supportEmailUrl: string;
  facebookUrl: string;
}

const DEFAULT_SITE_PROFILE: SiteProfile = {
  siteName: 'BidnSteal',
  siteUrl: '',
  supportEmail: '',
  supportPhone: '',
  supportWhatsappNumber: '',
  whatsappUrl: '',
  supportPhoneUrl: '',
  supportEmailUrl: '',
  facebookUrl: ''
};

function SyndicateFooterContent({ mobile = false, siteProfile = DEFAULT_SITE_PROFILE }: { mobile?: boolean; siteProfile?: SiteProfile }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const secureLineHref = siteProfile.whatsappUrl || siteProfile.supportPhoneUrl || siteProfile.supportEmailUrl || siteProfile.siteUrl || '#';
  const socialHref = siteProfile.facebookUrl || siteProfile.siteUrl || '#';
  const secureLineExternal = /^https?:\/\//i.test(secureLineHref);
  const socialExternal = /^https?:\/\//i.test(socialHref);
  const secureLineValue = siteProfile.supportPhone || siteProfile.supportEmail || 'Support Line';
  const socialValue = siteProfile.facebookUrl ? 'Facebook' : siteProfile.siteName || 'BidnSteal';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setIsError(false);

    if (!email.trim()) {
      setIsError(true);
      setStatus('Email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/subscribers', {
        method: 'POST',
        body: { email: email.trim() }
      });
      setEmail('');
      setStatus('Secure comms linked.');
    } catch (requestError) {
      setIsError(true);
      setStatus(requestError instanceof Error ? requestError.message : 'Transmission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative z-10 pointer-events-auto w-full ${mobile ? 'max-w-md mx-auto grid grid-cols-1 gap-3' : 'max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 place-items-stretch'}`}>
      <div className={`bg-black/80 border border-[#333] backdrop-blur-md flex flex-col justify-center text-left group hover:border-[#FF2A00] transition-colors duration-500 ${mobile ? 'rounded-2xl p-5' : 'rounded-[28px] p-6 md:p-12'}`}>
        <Flame className={`${mobile ? 'w-7 h-7 mb-4' : 'w-8 h-8 md:w-10 md:h-10 mb-4 md:mb-6'} text-[#FF2A00]`} />
        <h2 className={`font-display uppercase tracking-tighter text-white mb-2 ${mobile ? 'text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'}`}>
          Join The <span className="text-[#FFD500]">Syndicate</span>
        </h2>
        <p className={`font-mono text-gray-400 uppercase ${mobile ? 'text-[10px] tracking-[0.18em] mb-5' : 'text-xs sm:text-sm tracking-widest mb-6 md:mb-8'}`}>
          Encrypted alerts for the next drop.
        </p>

        <form className={`flex flex-col w-full ${mobile ? 'gap-2.5' : 'gap-3 md:gap-4'}`} onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="ENTER SECURE COMMS (EMAIL)"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`bg-[#111] border border-[#333] text-white font-mono outline-none focus:border-[#FF2A00] transition-colors w-full uppercase placeholder-gray-600 ${mobile ? 'text-[11px] px-4 py-3 rounded-xl' : 'text-xs sm:text-sm px-4 sm:px-6 py-3 sm:py-4'}`}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={`bg-[#FF2A00] hover:bg-[#FFD500] text-black font-display uppercase transition-colors duration-300 w-full flex items-center justify-between disabled:opacity-70 ${mobile ? 'text-sm px-4 py-3 rounded-xl tracking-[0.18em]' : 'text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 tracking-widest'}`}
          >
            <span>{isSubmitting ? 'Linking' : 'Transmit'}</span>
            <Terminal size={mobile ? 16 : 18} className={mobile ? '' : 'sm:w-5 sm:h-5'} />
          </button>
          {status && (
            <p className={`font-mono uppercase ${mobile ? 'text-[10px] tracking-[0.14em]' : 'text-[11px] tracking-[0.18em]'} ${isError ? 'text-[#FF2A00]' : 'text-[#FFD500]'}`}>
              {status}
            </p>
          )}
        </form>
      </div>

      <div className={`flex flex-col ${mobile ? 'gap-3' : 'gap-4 md:gap-6'}`}>
        <a
          href={secureLineHref}
          target={secureLineExternal ? "_blank" : undefined}
          rel={secureLineExternal ? "noopener noreferrer" : undefined}
          className={`bg-black/80 border border-[#333] backdrop-blur-md flex items-center hover:border-[#25D366] transition-all duration-300 group ${mobile ? 'rounded-2xl p-4 gap-4' : 'rounded-[28px] p-4 sm:p-6 md:p-8 gap-4 md:gap-6 flex-1'}`}
        >
          <div className={`bg-[#111] border border-[#333] group-hover:border-[#25D366] group-hover:bg-[#25D366]/10 rounded-full transition-colors shrink-0 ${mobile ? 'p-3' : 'p-3 md:p-4'}`}>
            <svg className={`${mobile ? 'w-5 h-5' : 'w-6 h-6 md:w-8 md:h-8'} text-gray-400 group-hover:text-[#25D366] transition-colors`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex flex-col items-start text-left overflow-hidden min-w-0">
            <span className={`font-mono uppercase text-gray-500 group-hover:text-[#25D366] transition-colors truncate w-full ${mobile ? 'text-[10px] tracking-[0.18em]' : 'text-[10px] sm:text-xs tracking-widest'}`}>Secure Line</span>
            <span className={`font-display tracking-wider text-white truncate w-full ${mobile ? 'text-lg' : 'text-base sm:text-xl md:text-2xl'}`}>{secureLineValue}</span>
          </div>
        </a>

        <a
          href={socialHref}
          target={socialExternal ? "_blank" : undefined}
          rel={socialExternal ? "noopener noreferrer" : undefined}
          className={`bg-black/80 border border-[#333] backdrop-blur-md flex items-center hover:border-[#1877F2] transition-all duration-300 group ${mobile ? 'rounded-2xl p-4 gap-4' : 'rounded-[28px] p-4 sm:p-6 md:p-8 gap-4 md:gap-6 flex-1'}`}
        >
          <div className={`bg-[#111] border border-[#333] group-hover:border-[#1877F2] group-hover:bg-[#1877F2]/10 rounded-full transition-colors shrink-0 ${mobile ? 'p-3' : 'p-3 md:p-4'}`}>
            <Facebook className={`${mobile ? 'w-5 h-5' : 'w-6 h-6 md:w-8 md:h-8'} text-gray-400 group-hover:text-[#1877F2] transition-colors`} />
          </div>
          <div className="flex flex-col items-start text-left overflow-hidden min-w-0">
            <span className={`font-mono uppercase text-gray-500 group-hover:text-[#1877F2] transition-colors truncate w-full ${mobile ? 'text-[10px] tracking-[0.18em]' : 'text-[10px] sm:text-xs tracking-widest'}`}>Social Network</span>
            <span className={`font-display tracking-wider text-white truncate w-full ${mobile ? 'text-lg' : 'text-base sm:text-xl md:text-2xl'}`}>{socialValue}</span>
          </div>
        </a>
      </div>
    </div>
  );
}

export function OverlayUI({ onShopClick, totalPages }: { onShopClick: () => void, totalPages: number }) {
  const [mounted, setMounted] = useState(false);
  const [siteProfile, setSiteProfile] = useState<SiteProfile>(DEFAULT_SITE_PROFILE);
  const navigate = useNavigate();
  const scroll = useScroll();
  
  // Auto Pilot State
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [autoPilotSpeed, setAutoPilotSpeed] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  
  // Speedometer Logic
  const lastScrollTop = useRef(0);
  const currentSpeed = useRef(0);
  const lastScrollTime = useRef(0);
  
  useEffect(() => {
    setMounted(true);

    const handlePointerDown = () => setIsHolding(true);
    const handlePointerUp = () => setIsHolding(false);

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSiteProfile() {
      try {
        const payload = await apiRequest<Partial<SiteProfile>>('/site-profile');
        if (!cancelled && payload && typeof payload === 'object') {
          setSiteProfile((current) => ({
            ...current,
            ...payload
          }));
        }
      } catch {
        // fall back to baked defaults when public profile data is not available
      }
    }

    void loadSiteProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useFrame(() => {
    if (scroll.el) {
      // Auto Pilot Scrolling
      if (isAutoPilot && autoPilotSpeed > 0 && !isHolding) {
        // Map autoPilotSpeed to scroll speed
        const scrollSpeed = autoPilotSpeed * 1.25; 
        scroll.el.scrollTop += scrollSpeed;
      }
      
      // Auto turn off if at top or bottom
      if (isAutoPilot) {
        if (scroll.el.scrollTop <= 10) {
           setIsAutoPilot(false);
           setAutoPilotSpeed(0);
        } else if (scroll.el.scrollTop >= scroll.el.scrollHeight - scroll.el.clientHeight - 10) {
           setIsAutoPilot(false);
           setAutoPilotSpeed(0);
        }
      }

      // Speedometer Calculation
      const currentScrollTop = scroll.el.scrollTop;
      const delta = currentScrollTop - lastScrollTop.current;
      lastScrollTop.current = currentScrollTop;
      
      // Smooth the speed value
      let targetSpeed = Math.abs(delta) * 15;
      if (isAutoPilot && !isHolding && autoPilotSpeed > 0) {
         targetSpeed = (autoPilotSpeed / 2) * 50; // Gear 1 = 50, Gear 2 = 100, Gear 3 = 150, Gear 4 = 200
      }

      currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, 0.1);
      
      // Update DOM element directly for performance
      const speedContainerEl = document.getElementById('speedometer-container');
      const speedValueEl = document.getElementById('speed-value');
      const speedNeedleEl = document.getElementById('speed-needle');
      const speedGlowEl = document.getElementById('speed-glow');
      
      // Visibility Logic
      if (Math.abs(delta) > 0.1 || (isAutoPilot && autoPilotSpeed > 0)) {
        lastScrollTime.current = performance.now();
      }
      
      if (speedContainerEl) {
        const timeSinceLastScroll = performance.now() - lastScrollTime.current;
        if (timeSinceLastScroll < 2000) {
          speedContainerEl.style.opacity = '1';
        } else {
          speedContainerEl.style.opacity = '0';
        }
      }

      if (speedValueEl) {
        speedValueEl.innerText = Math.round(currentSpeed.current).toString();
      }
      
      if (speedNeedleEl) {
        // Map speed to angle: 0 -> -135deg, 200 -> 135deg
        const displaySpeed = Math.min(currentSpeed.current, 200);
        const angle = -135 + (displaySpeed / 200) * 270;
        speedNeedleEl.style.transform = `rotate(${angle}deg)`;
      }
      
      if (speedGlowEl) {
        // Glow intensity based on speed
        const opacity = Math.min(currentSpeed.current / 200, 1) * 0.6;
        speedGlowEl.style.opacity = opacity.toString();
      }

    }
  });

  return (
    <>
      {/* FIXED HUD ELEMENTS */}
      <Html fullscreen className="pointer-events-none z-40">
        {/* Top Bar */}
        <div className="absolute top-16 md:top-20 left-0 w-full p-6 flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#FF2A00] font-mono text-sm font-bold tracking-[0.3em] uppercase">
              <Terminal size={16} />
              <span>Syndicate.OS</span>
            </div>
          </div>
        </div>
      </Html>

      {/* SCROLLING CONTENT */}
      <Scroll html style={{ width: '100%' }}>
        {/* 1. HERO */}
        <HUDHero 
          onShopClick={onShopClick} 
          isAutoPilot={isAutoPilot}
          setIsAutoPilot={setIsAutoPilot}
          autoPilotSpeed={autoPilotSpeed}
          setAutoPilotSpeed={setAutoPilotSpeed}
        />

        {/* SPACER */}
        <div className="pointer-events-none" style={{ height: `${Math.max(0, totalPages - 2) * 100}vh` }}></div>

        {/* FOOTER */}
        <section className="min-h-[100svh] py-24 pb-40 md:pb-24 flex items-center justify-center text-center px-4 relative pointer-events-none">
          <div className="w-full md:hidden">
            <SyndicateFooterContent mobile siteProfile={siteProfile} />
          </div>
          <div className="hidden w-full md:block">
            <SyndicateFooterContent siteProfile={siteProfile} />
          </div>
        </section>
      </Scroll>
        </>
      );
    }
