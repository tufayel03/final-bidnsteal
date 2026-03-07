import React from 'react';
import { motion } from 'motion/react';
import { Star, Package, AlertTriangle } from 'lucide-react';
import type { Product } from '../../data/products';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const stockCount = product.inStock ? Number(product.stock || 0) : 0;
  const isLowStock = stockCount > 0 && stockCount < 10;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col bg-transparent"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[#FF6A00] text-xs sm:text-sm font-mono font-bold uppercase tracking-widest">
          {product.category}
        </p>
        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10">
          <Star size={14} className="text-[#FFD500] fill-[#FFD500]" />
          <span className="font-mono font-bold text-xs sm:text-sm text-white">{product.rating}</span>
          <span className="text-gray-500 font-mono text-[10px] sm:text-xs ml-1">(124)</span>
        </div>
      </div>

      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl uppercase tracking-tighter mb-6 text-white leading-tight">
        {product.name}
      </h1>
      
      <p className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed font-sans">
        {product.description || 'Experience the thrill of the track with this premium collectible. Built for speed, designed for glory.'}
      </p>

      {/* Stock Indicator (F1 Telemetry Style) */}
      <div className="bg-[#050505] border border-[#222] rounded-xl p-4 relative overflow-hidden">
        {/* Glare effect */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
              !product.inStock ? 'bg-red-500/10 border-red-500/30 text-red-500' :
              isLowStock ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
              'bg-[#FF6A00]/10 border-[#FF6A00]/30 text-[#FF6A00]'
            }`}>
              {product.inStock ? <Package size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 font-mono text-[10px] sm:text-xs uppercase tracking-wider">Inventory Status</span>
              <span className={`font-mono font-bold text-sm sm:text-base ${
                !product.inStock ? 'text-red-500' :
                isLowStock ? 'text-yellow-500' :
                'text-[#FF6A00]'
              }`}>
                {!product.inStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
              </span>
            </div>
          </div>

          {product.inStock && (
            <div className="flex flex-col items-end">
              <span className="text-gray-500 font-mono text-[10px] sm:text-xs uppercase tracking-wider">Available Units</span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl sm:text-3xl text-white leading-none">{stockCount}</span>
                <span className="text-gray-500 font-mono text-[10px]">PCS</span>
              </div>
            </div>
          )}
        </div>

        {/* Stock Progress Bar */}
        {product.inStock && (
          <div className="w-full h-1.5 bg-[#111] rounded-full mt-4 overflow-hidden border border-[#222]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stockCount / 42) * 100, 100)}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className={`h-full rounded-full ${
                isLowStock ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.5)]'
              }`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
