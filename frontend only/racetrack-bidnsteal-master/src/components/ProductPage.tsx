import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PRODUCTS } from '../data/products';
import { Navbar } from './Navbar';
import { CartSidebar } from './CartSidebar';
import { ProductInfo } from './product/ProductInfo';
import { ProductActions } from './product/ProductActions';
import { ChevronLeft, Scan } from 'lucide-react';

export function ProductPage() {
  const { id } = useParams();
  const product = PRODUCTS.find(p => p.id === Number(id));
  const [activeImage, setActiveImage] = useState(0);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <h1 className="font-display text-4xl mb-4">Product Not Found</h1>
        <Link to="/shop" className="text-[#00E5FF] hover:underline">Return to Paddock</Link>
      </div>
    );
  }

  const galleryImages = [
    product.image,
    product.image.replace('w=600', 'w=601'),
    product.image.replace('w=600', 'w=602'),
    product.image.replace('w=600', 'w=603'),
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-gray-300 font-sans selection:bg-[#FF6A00] selection:text-white relative overflow-x-hidden flex flex-col">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[#FF6A00] opacity-[0.12] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF2A00] opacity-[0.08] blur-[120px] rounded-full" />
        
        {/* Dot Matrix Pattern */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
        
        {/* Scanline overlay */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)`
        }} />
        
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202] opacity-80" />
      </div>
      
      <Navbar />

      <main className="relative z-10 flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex flex-col justify-center min-h-screen">
        
        {/* Top Bar Navigation */}
        <div className="mb-8 w-full flex justify-between items-center">
          <Link to="/shop" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#FF6A00] transition-colors font-mono text-xs sm:text-sm uppercase tracking-widest group">
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#FF6A00]/50 transition-colors bg-black/50">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Paddock
          </Link>
          <div className="hidden sm:flex items-center gap-4 font-mono text-xs text-gray-500 uppercase tracking-widest">
            <span>SYS.STATUS: <span className="text-[#FF6A00]">ONLINE</span></span>
            <span>UPLINK: <span className="text-[#FF6A00]">STABLE</span></span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
          
          {/* Left Column: Vertical Thumbnails (Hidden on mobile, shown on bottom for mobile) */}
          <div className="hidden lg:flex lg:col-span-1 flex-col gap-4 h-full justify-center">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`relative aspect-square w-full rounded-lg overflow-hidden border transition-all group ${
                  activeImage === idx 
                    ? 'border-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.3)]' 
                    : 'border-[#222] hover:border-[#FF6A00]/50 opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Feed ${idx + 1}`} className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-300" />
                <div className={`absolute top-1 left-1 text-[8px] font-mono px-1 rounded backdrop-blur-sm ${
                  activeImage === idx ? 'bg-[#FF6A00] text-black' : 'bg-black/80 text-white/50'
                }`}>
                  F{idx + 1}
                </div>
              </button>
            ))}
          </div>

          {/* Center Column: Huge Main Image */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[40vh] lg:min-h-[60vh]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full max-w-3xl aspect-square sm:aspect-video lg:aspect-square flex items-center justify-center"
            >
              {/* Decorative Tech Circle Behind Image */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-white/5 border-dashed animate-[spin_60s_linear_infinite] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border border-[#FF6A00]/10 animate-[spin_40s_linear_infinite_reverse] pointer-events-none" />
              
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImage}
                  initial={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                  exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  src={galleryImages[activeImage]} 
                  alt={`${product.name} view ${activeImage + 1}`}
                  className="relative z-10 w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                />
              </AnimatePresence>

              {/* Crosshairs & Markers */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-[#FF6A00] to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-t from-[#FF6A00] to-transparent pointer-events-none" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-px bg-gradient-to-r from-[#FF6A00] to-transparent pointer-events-none" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-px bg-gradient-to-l from-[#FF6A00] to-transparent pointer-events-none" />
              
              {product.badge && (
                <div className="absolute top-4 right-4 z-20 bg-[#FF0000]/20 text-[#FF0000] border border-[#FF0000]/30 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded backdrop-blur-md">
                  {product.badge}
                </div>
              )}
            </motion.div>
          </div>

          {/* Mobile Thumbnails */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-4 snap-x">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`relative shrink-0 w-20 aspect-square rounded-lg overflow-hidden border transition-all snap-center ${
                  activeImage === idx 
                    ? 'border-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.3)]' 
                    : 'border-[#222] opacity-50'
                }`}
              >
                <img src={img} alt={`Feed ${idx + 1}`} className="w-full h-full object-cover mix-blend-luminosity" />
              </button>
            ))}
          </div>

          {/* Right Column: Info & Actions (Telemetry Panel) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden">
              {/* Panel Header */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF6A00] to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-[#FF6A00]">
                  <Scan size={16} />
                  <span className="font-mono text-[10px] uppercase tracking-widest">Target Acquired</span>
                </div>
                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">ID: {product.id.toString().padStart(4, '0')}</span>
              </div>

              <ProductInfo product={product} />
              
              <div className="mt-8 pt-8 border-t border-white/10">
                <ProductActions product={product} />
              </div>
            </div>
          </div>

        </div>
      </main>

      <CartSidebar />
    </div>
  );
}
