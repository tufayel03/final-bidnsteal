import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, SlidersHorizontal, PackageX, Check, LayoutGrid, Grid3x3, Grid2x2, List, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/products';
import { Navbar } from './Navbar';
import { CartSidebar } from './CartSidebar';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { assetUrl } from '../lib/api';

const CATEGORIES = ['All', 'Cars', 'Tracks', 'Playsets', 'Accessories'];
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ৳20', min: 0, max: 20 },
  { label: '৳20 - ৳50', min: 20, max: 50 },
  { label: 'Over ৳50', min: 50, max: Infinity },
];

export function ShopPage() {
  const { products, loadingProducts } = useStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePriceRange, setActivePriceRange] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<'list' | '2' | '3' | '4' | '5'>('5');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const { addToCart } = useCart();

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activePriceRange, inStockOnly, searchQuery]);

  const gridClassMap = {
    'list': 'flex flex-col gap-3 md:gap-4',
    '2': 'grid grid-cols-2 gap-3 md:gap-4',
    '3': 'grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4',
    '4': 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4',
    '5': 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4',
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchPrice = p.price >= PRICE_RANGES[activePriceRange].min && p.price <= PRICE_RANGES[activePriceRange].max;
      const matchStock = inStockOnly ? p.inStock : true;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchPrice && matchStock && matchSearch;
    });
  }, [products, activeCategory, activePriceRange, inStockOnly, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    if (product.inStock) {
      addToCart(product);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-gray-300 font-sans selection:bg-[#FF6A00] selection:text-white relative overflow-x-hidden">
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

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="font-display text-4xl uppercase tracking-tight text-white">Inventory</h1>
            <p className="text-xs font-mono text-gray-500 mt-1">SYSTEM.CATALOG // {filteredProducts.length} ITEMS FOUND</p>
          </div>

          <div className="flex-1 max-w-md relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FF6A00] transition-colors font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/10">
              <button onClick={() => setGridColumns('list')} className={`p-1.5 rounded transition-colors ${gridColumns === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="List View"><List size={16} /></button>
              <button onClick={() => setGridColumns('2')} className={`p-1.5 rounded transition-colors ${gridColumns === '2' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="2 Columns"><Grid2x2 size={16} /></button>
              <button onClick={() => setGridColumns('3')} className={`hidden sm:block p-1.5 rounded transition-colors ${gridColumns === '3' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="3 Columns"><Grid3x3 size={16} /></button>
              <button onClick={() => setGridColumns('4')} className={`hidden lg:block p-1.5 rounded transition-colors ${gridColumns === '4' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="4 Columns"><LayoutGrid size={16} /></button>
              <button onClick={() => setGridColumns('5')} className={`hidden xl:block p-1.5 rounded transition-colors ${gridColumns === '5' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="5 Columns">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18M7.5 3v18M12 3v18M16.5 3v18M21 3v18" />
                </svg>
              </button>
            </div>
            <button 
              className="md:hidden flex items-center gap-2 bg-white/5 px-4 py-2 rounded-md border border-white/10 text-sm font-mono"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            >
              <SlidersHorizontal size={16} />
              FILTERS
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className={`w-full md:w-56 shrink-0 space-y-8 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
            {/* Categories */}
            <div>
              <h3 className="text-xs font-mono text-gray-500 mb-3 uppercase tracking-widest">Category</h3>
              <div className="space-y-1">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      activeCategory === category
                        ? 'bg-[#FF6A00]/10 text-[#FF6A00] font-medium border border-[#FF6A00]/20'
                        : 'hover:bg-white/5 text-gray-400'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <h3 className="text-xs font-mono text-gray-500 mb-3 uppercase tracking-widest">Price</h3>
              <div className="space-y-1">
                {PRICE_RANGES.map((range, index) => (
                  <button
                    key={range.label}
                    onClick={() => setActivePriceRange(index)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                      activePriceRange === index
                        ? 'bg-white/10 text-white font-medium'
                        : 'hover:bg-white/5 text-gray-400'
                    }`}
                  >
                    {range.label}
                    {activePriceRange === index && <Check size={14} className="text-[#FF6A00]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Status */}
            <div>
              <h3 className="text-xs font-mono text-gray-500 mb-3 uppercase tracking-widest">Availability</h3>
              <label className="flex items-center gap-3 cursor-pointer group px-3 py-2 hover:bg-white/5 rounded transition-colors">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  inStockOnly ? 'bg-[#FF6A00] border-[#FF6A00]' : 'border-gray-600 group-hover:border-gray-400'
                }`}>
                  {inStockOnly && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-200">In Stock Only</span>
                {/* Hidden input to make it accessible */}
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
              </label>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            <AnimatePresence mode="popLayout">
              {filteredProducts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-white/10 rounded-lg"
                >
                  <PackageX size={48} className="mb-4 opacity-50" />
                  <p className="font-mono text-sm uppercase">{loadingProducts ? 'Loading inventory...' : 'No matching items found.'}</p>
                  <button 
                    onClick={() => {
                      setActiveCategory('All');
                      setActivePriceRange(0);
                      setInStockOnly(false);
                    }}
                    className="mt-4 text-[#FF6A00] hover:underline text-sm"
                  >
                    Clear Filters
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="product-grid"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex flex-col w-full"
                >
                  <div className={gridClassMap[gridColumns]}>
                    {paginatedProducts.map((product) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      key={product.id}
                      className={`group relative bg-[#141414] rounded-lg border flex overflow-hidden transition-colors ${
                        product.inStock ? 'border-white/5 hover:border-[#FF6A00]/50' : 'border-white/5 opacity-75'
                      } ${gridColumns === 'list' ? 'flex-row items-center h-32 sm:h-40' : 'flex-col'}`}
                    >
                      <Link to={`/shop/${product.slug || product.id}`} className="absolute inset-0 z-10" />
                      
                      {/* Image Area */}
                      <div className={`relative bg-[#0a0a0a] overflow-hidden p-2 shrink-0 ${gridColumns === 'list' ? 'w-32 h-32 sm:w-40 sm:h-40' : 'aspect-square'}`}>
                        <img 
                          src={assetUrl(product.image)} 
                          alt={product.name}
                          className="w-full h-full object-cover rounded transition-all duration-500 group-hover:scale-105"
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          {product.badge && (
                            <span className="bg-white text-black text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm shadow-md">
                              {product.badge}
                            </span>
                          )}
                        </div>

                        {/* Stock Indicator */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider border border-white/10 shadow-md">
                          <div className={`w-1.5 h-1.5 rounded-full ${product.inStock ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 shadow-[0_0_5px_#ef4444]'}`} />
                          <span className={gridColumns === 'list' ? 'hidden sm:inline' : ''}>{product.inStock ? 'In Stock' : 'Out of Stock'}</span>
                        </div>
                      </div>

                      {/* Details Area */}
                      <div className={`p-3 sm:p-4 flex flex-col flex-1 h-full ${gridColumns === 'list' ? 'justify-center' : ''}`}>
                        <p className="text-[#FF6A00] text-[9px] sm:text-xs font-mono uppercase tracking-widest mb-1">
                          {product.category}
                        </p>
                        <h3 className={`font-sans font-medium text-white leading-tight mb-2 group-hover:text-[#FF6A00] transition-colors ${gridColumns === 'list' ? 'text-base sm:text-lg' : 'text-sm line-clamp-2'}`}>
                          {product.name}
                        </h3>
                        {gridColumns === 'list' && (
                          <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 mb-3 hidden sm:block">
                            {product.description}
                          </p>
                        )}
                        
                        <div className={`mt-auto flex items-center justify-between relative z-20 ${gridColumns === 'list' ? 'mt-4' : ''}`}>
                          <span className={`font-mono text-white ${gridColumns === 'list' ? 'text-lg sm:text-xl' : 'text-sm'}`}>
                            ৳{product.price.toFixed(2)}
                          </span>
                          <button 
                            onClick={(e) => handleAddToCart(e, product)}
                            disabled={!product.inStock}
                            className={`p-2 rounded transition-colors ${
                              product.inStock 
                                ? 'bg-white/10 hover:bg-[#FF6A00] text-white hover:shadow-[0_0_10px_rgba(255,106,0,0.4)]' 
                                : 'bg-white/5 text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingCart size={gridColumns === 'list' ? 18 : 14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 rounded flex items-center justify-center text-sm font-mono transition-colors ${
                            currentPage === i + 1 
                              ? 'bg-[#FF6A00] text-white' 
                              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
      </div>

      <CartSidebar />
    </div>
  );
}
