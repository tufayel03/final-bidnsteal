import React, { useState } from 'react';
import { Zap, Bell, Check, Truck, ShieldCheck, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../../data/products';
import { useCart } from '../../context/CartContext';

interface ProductActionsProps {
  product: Product;
}

export function ProductActions({ product }: ProductActionsProps) {
  const { addToCart } = useCart();
  const [notified, setNotified] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleNotify = () => {
    setNotified(true);
    setTimeout(() => setNotified(false), 3000);
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart(product);
    setTimeout(() => setIsAdding(false), 500);
  };

  return (
    <div className="bg-transparent">
      
      {/* Price Display */}
      <div className="flex items-end gap-2 sm:gap-4 mb-8 bg-[#050505] p-6 rounded-2xl border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="text-gray-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest absolute top-4 left-6">UNIT PRICE</div>
        <div className="flex items-end mt-4">
          <div className="text-5xl sm:text-6xl font-display text-white leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            ৳{Math.floor(product.price)}
          </div>
          <div className="text-xl sm:text-2xl font-display text-[#FF6A00] mb-1 ml-1">
            .{(product.price % 1).toFixed(2).substring(2)}
          </div>
        </div>
      </div>

      {/* Action Button */}
      {product.inStock ? (
        <button 
          onClick={handleAddToCart}
          className={`group relative w-full h-16 sm:h-20 rounded-xl bg-[#FF6A00] flex items-center justify-center overflow-hidden transition-all active:scale-[0.98] ${isAdding ? 'brightness-150' : ''}`}
        >
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6A00] via-[#FF2A00] to-[#FF6A00] opacity-100 group-hover:opacity-80 transition-opacity" />
          
          {/* Tech lines pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
          }} />

          {/* Actual Button Content */}
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
            <ShoppingCart size={24} className="text-black sm:w-7 sm:h-7" /> 
            <span className="font-display text-xl sm:text-2xl uppercase tracking-widest text-black font-bold">
              {isAdding ? 'ADDING...' : 'ADD TO CART'}
            </span>
          </div>
          
          {/* Hover glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] transition-opacity duration-300" />
        </button>
      ) : (
        <button 
          onClick={handleNotify}
          disabled={notified}
          className={`group relative w-full h-16 sm:h-20 rounded-xl flex items-center justify-center overflow-hidden transition-all active:scale-[0.98] border border-white/10 bg-[#111]`}
        >
          {/* Actual Button Content */}
          <div className={`relative z-10 flex items-center justify-center gap-3 sm:gap-4 transition-all ${
            notified ? 'text-green-400' : 'text-gray-400 group-hover:text-white'
          }`}>
            {notified ? (
              <>
                <Check size={24} className="sm:w-7 sm:h-7" />
                <span className="font-display text-lg sm:text-xl uppercase tracking-widest font-bold">
                  NOTIFIED
                </span>
              </>
            ) : (
              <>
                <Bell size={24} className="sm:w-7 sm:h-7" />
                <span className="font-display text-lg sm:text-xl uppercase tracking-widest font-bold">
                  NOTIFY ME
                </span>
              </>
            )}
          </div>
        </button>
      )}

      {/* Perks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 text-gray-400 bg-transparent p-2 rounded-xl">
          <Truck size={20} className="text-[#FF6A00] shrink-0" />
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider">Free Shipping<br/>over ৳50</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400 bg-transparent p-2 rounded-xl">
          <ShieldCheck size={20} className="text-[#FF6A00] shrink-0" />
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider">Authenticity<br/>Guaranteed</span>
        </div>
      </div>
    </div>
  );
}
