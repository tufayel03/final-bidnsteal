import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Zap, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export function CartSidebar() {
  const navigate = useNavigate();
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartCount, cartTotal } = useCart();

  // Calculate subtotal
  const finalTotal = cartTotal;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />
          
          {/* Sidebar Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-[#0a0a0a] border-l border-white/10 z-[101] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#FF6A00]/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-[#FF2A00]/10 rounded-full blur-[80px]" />
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />
            </div>

            {/* Header */}
            <div className="relative p-6 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-md z-10">
              <div>
                <h2 className="font-display text-2xl uppercase tracking-tight text-white flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[#FF6A00]" />
                  Active Cart
                </h2>
                <p className="text-xs font-mono text-gray-500 mt-1">
                  SYSTEM.CART // {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
                </p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all hover:rotate-90 duration-300"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Cart Content */}
            <div className="relative flex-1 overflow-y-auto p-6 flex flex-col z-10 hide-scrollbar">
              {cartCount === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-24 h-24 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 border border-[#FF6A00]/30 rounded-full animate-ping opacity-20" />
                    <ShoppingCart size={32} className="text-gray-500" />
                  </div>
                  <p className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-2">No items detected</p>
                  <p className="text-gray-600 text-sm max-w-[250px] mb-8">Your garage is currently empty. Browse the catalog to add items.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="group relative px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-mono text-sm uppercase tracking-wider rounded border border-white/10 transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Access Catalog <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FF6A00]/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((item, index) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        key={item.id} 
                        className="group flex gap-4 bg-[#141414] p-3 rounded-lg border border-white/5 hover:border-white/20 transition-colors relative overflow-hidden"
                      >
                        {/* Hover Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6A00]/0 via-[#FF6A00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Image */}
                        <div className="w-20 h-20 bg-black rounded-md overflow-hidden shrink-0 relative border border-white/10">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-all duration-500" />
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between items-start">
                            <div className="pr-4">
                              <p className="text-[#FF6A00] text-[9px] font-mono uppercase tracking-widest mb-1">{item.category}</p>
                              <h3 className="font-sans text-sm font-medium text-white leading-tight line-clamp-1">{item.name}</h3>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-sm text-white">৳{item.price.toFixed(2)}</span>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded px-1 py-0.5">
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-mono w-4 text-center text-white">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer / Checkout */}
            {cartCount > 0 && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative p-6 border-t border-white/10 bg-[#0a0a0a] z-10"
              >
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-mono uppercase">Subtotal</span>
                    <span className="font-mono text-gray-300">৳{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="h-px w-full bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-mono uppercase tracking-widest text-sm">Total</span>
                    <span className="font-mono text-2xl text-[#FF6A00]">৳{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="group relative w-full bg-white text-black font-display text-xl uppercase tracking-wider px-8 py-4 rounded-lg hover:shadow-[0_0_30px_rgba(255,106,0,0.3)] transition-all overflow-hidden flex items-center justify-center gap-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF6A00] to-[#FF2A00] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out" />
                  <Zap size={20} className="relative z-10 group-hover:text-white transition-colors" /> 
                  <span className="relative z-10 group-hover:text-white transition-colors">Initiate Checkout</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
