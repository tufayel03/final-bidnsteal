import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, User, Search, Gavel, Store, Flag, Zap, Flame, Gauge } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Track', path: '/', icon: Flag },
    { name: 'Shop', path: '/shop', icon: Store },
    { name: 'Auctions', path: '/auction', icon: Gavel },
  ];

  return (
    <>
      <style>{`
        @keyframes lightSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* DESKTOP NAVIGATION - F1 Style */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a] h-[64px] items-center transition-all duration-300 border-b border-zinc-900">
        
        {/* The 2 Animated Glowing Red Lines */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          {/* Glow Layer (Masked to fade out on the right) */}
          <div 
            className="absolute top-0 left-0 w-full h-full"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(255, 26, 26, 0.8))',
              maskImage: 'linear-gradient(to right, black 0%, black 30%, transparent 70%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 30%, transparent 70%)'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-red-600" style={{ clipPath: 'polygon(0 40px, 100px 40px, 132px 8px, 100% 8px, 100% 12px, 136px 12px, 104px 44px, 0 44px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-red-600" style={{ clipPath: 'polygon(0 44px, 104px 44px, 136px 12px, 100% 12px, 100% 17px, 141px 17px, 109px 49px, 0 49px)' }} />
          </div>

          {/* Actual Lines */}
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Line 1 (Top - Less Neon Red fading to black) */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                clipPath: 'polygon(0 40px, 100px 40px, 132px 8px, 100% 8px, 100% 12px, 136px 12px, 104px 44px, 0 44px)',
                background: 'linear-gradient(to right, #cc0000 0%, #800000 20%, #000000 100%)',
              }}
            >
              <div 
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255,0,0,0.6) 48%, rgba(255,50,50,1) 50%, rgba(255,0,0,0.6) 52%, transparent 55%, transparent 100%)',
                  animation: 'lightSweep 20s infinite linear'
                }}
              />
            </div>

            {/* Line 2 (Bottom - Neon Bright Glowing Red) */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                clipPath: 'polygon(0 44px, 104px 44px, 136px 12px, 100% 12px, 100% 17px, 141px 17px, 109px 49px, 0 49px)',
                background: 'linear-gradient(to right, #ff0000 0%, #000000 100%)',
              }}
            >
              <div 
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255,0,0,0.9) 48%, rgba(255,100,100,1) 50%, rgba(255,0,0,0.9) 52%, transparent 55%, transparent 100%)',
                  animation: 'lightSweep 20s infinite linear 0.15s'
                }}
              />
            </div>
          </div>
        </div>

        {/* Logo Area */}
        <Link to="/" className="absolute top-0 left-6 h-[32px] flex items-center z-10">
          <span className="font-display text-2xl italic font-black uppercase tracking-tighter text-white">
            Bid<span className="text-[#e10600]">Steal</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-8 ml-[160px] mt-1 z-10">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isActive ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-4 px-6 mt-1 z-10">
          <Link to={isAuthenticated ? "/account" : "/login"} className="flex items-center gap-2 border border-zinc-600 rounded px-4 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors ml-2">
            <User size={14} />
            {isAuthenticated ? "ACCOUNT" : "SIGN IN"}
          </Link>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-[#e10600] rounded px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <ShoppingCart size={14} />
            CART {cartCount > 0 && `(${cartCount})`}
          </button>
        </div>
      </header>

      {/* MOBILE NAVIGATION */}
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a] h-[56px] flex justify-between items-center border-b border-zinc-900">
        
        {/* The 2 Animated Glowing Red Lines */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          {/* Glow Layer */}
          <div 
            className="absolute top-0 left-0 w-full h-full"
            style={{ 
              filter: 'drop-shadow(0 0 8px rgba(255, 26, 26, 0.8))',
              maskImage: 'linear-gradient(to right, black 0%, black 30%, transparent 70%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 30%, transparent 70%)'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-red-600" style={{ clipPath: 'polygon(0 30px, 60px 30px, 84px 6px, 100% 6px, 100% 9px, 87px 9px, 63px 33px, 0 33px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-red-600" style={{ clipPath: 'polygon(0 33px, 63px 33px, 87px 9px, 100% 9px, 100% 12px, 90px 12px, 66px 36px, 0 36px)' }} />
          </div>

          {/* Actual Lines */}
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Line 1 (Top - Less Neon Red fading to black) */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                clipPath: 'polygon(0 30px, 60px 30px, 84px 6px, 100% 6px, 100% 9px, 87px 9px, 63px 33px, 0 33px)',
                background: 'linear-gradient(to right, #cc0000 0%, #800000 25%, #000000 100%)',
              }}
            >
              <div 
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255,0,0,0.6) 48%, rgba(255,50,50,1) 50%, rgba(255,0,0,0.6) 52%, transparent 55%, transparent 100%)',
                  animation: 'lightSweep 20s infinite linear'
                }}
              />
            </div>

            {/* Line 2 (Bottom - Neon Bright Glowing Red) */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                clipPath: 'polygon(0 33px, 63px 33px, 87px 9px, 100% 9px, 100% 12px, 90px 12px, 66px 36px, 0 36px)',
                background: 'linear-gradient(to right, #ff0000 0%, #000000 100%)',
              }}
            >
              <div 
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255,0,0,0.9) 48%, rgba(255,100,100,1) 50%, rgba(255,0,0,0.9) 52%, transparent 55%, transparent 100%)',
                  animation: 'lightSweep 20s infinite linear 0.15s'
                }}
              />
            </div>
          </div>
        </div>

        <Link to="/" className="absolute top-0 left-4 h-[24px] flex items-center z-10">
          <span className="font-display text-lg italic font-black uppercase tracking-tighter text-white">
            Bid<span className="text-[#e10600]">Steal</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 px-4 ml-auto z-10 mt-1">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative text-zinc-400 hover:text-white transition-colors"
          >
            <ShoppingCart size={18} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-[#e10600] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Dock */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="bg-[#0a0a0a] border-t border-zinc-900 h-[64px] flex justify-around items-center px-2 pb-safe">
          {[...navLinks, { name: isAuthenticated ? 'Profile' : 'Sign In', path: isAuthenticated ? '/account' : '/login', icon: User }].map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className="relative flex flex-col items-center justify-center w-16 h-full group"
              >
                {/* Active Indicator */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#e10600] transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

                <Icon 
                  size={20} 
                  className={`mb-1 transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500'}`} 
                />
                <span className={`text-[10px] font-medium transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-zinc-500'
                }`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
