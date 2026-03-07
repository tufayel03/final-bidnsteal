import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Gavel, SlidersHorizontal, Check, LayoutGrid, Grid3x3, Grid2x2, List, PackageX, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { CartSidebar } from './CartSidebar';
import { useStore } from '../context/StoreContext';
import { assetUrl } from '../lib/api';

const STATUSES = ['All', 'Live', 'Upcoming', 'Ended'];
const SORT_OPTIONS = [
  { label: 'Ending Soon', value: 'ending_soon' },
  { label: 'Highest Bid', value: 'highest_bid' },
  { label: 'Lowest Bid', value: 'lowest_bid' },
];

function CountdownTimer({ endTime, status }: { endTime: string, status: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (status !== 'Live') {
      const date = new Date(endTime);
      setTimeLeft(date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Ended');
        setIsUrgent(false);
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      setIsUrgent(distance < 1000 * 60 * 2);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, status]);

  if (status !== 'Live') {
    return <span className="font-mono text-gray-400">{timeLeft}</span>;
  }

  return (
    <span className={`font-mono font-bold tracking-widest ${isUrgent ? 'text-red-500 animate-pulse' : 'text-[#FFD500]'}`}>
      {timeLeft}
    </span>
  );
}

export function AuctionPage() {
  const { auctions, loadingAuctions } = useStore();
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeSort, setActiveSort] = useState('ending_soon');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<'list' | '2' | '3' | '4' | '5'>('5');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, activeSort]);

  const gridClassMap = {
    'list': 'flex flex-col gap-3 md:gap-4',
    '2': 'grid grid-cols-2 gap-3 md:gap-4',
    '3': 'grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4',
    '4': 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4',
    '5': 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4',
  };

  const filteredAndSortedAuctions = useMemo(() => {
    let result = auctions.filter((a) => {
      if (activeStatus === 'All') return true;
      return a.status.toLowerCase() === activeStatus.toLowerCase();
    });

    result.sort((a, b) => {
      const highestA = a.bids.length > 0 ? Math.max(...a.bids.map(bid => bid.amount)) : a.startingBid;
      const highestB = b.bids.length > 0 ? Math.max(...b.bids.map(bid => bid.amount)) : b.startingBid;

      switch (activeSort) {
        case 'ending_soon':
          return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
        case 'highest_bid':
          return highestB - highestA;
        case 'lowest_bid':
          return highestA - highestB;
        default:
          return 0;
      }
    });

    return result;
  }, [auctions, activeStatus, activeSort]);

  const totalPages = Math.ceil(filteredAndSortedAuctions.length / itemsPerPage);
  const paginatedAuctions = filteredAndSortedAuctions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-[#FFD500] selection:text-black relative overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[#FFD500] opacity-[0.05] blur-[150px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.1]" style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-90" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-24 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
            <div>
              <h1 className="font-display text-4xl uppercase tracking-tight text-white">Auction House</h1>
              <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">
                SYSTEM.NETWORK // {filteredAndSortedAuctions.length} LOTS FOUND
              </p>
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
              {/* Status */}
              <div>
                <h3 className="text-xs font-mono text-gray-500 mb-3 uppercase tracking-widest">Status</h3>
                <div className="space-y-1">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => setActiveStatus(status)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                        activeStatus === status
                          ? 'bg-[#FFD500]/10 text-[#FFD500] font-medium border border-[#FFD500]/20'
                          : 'hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      {status}
                      {status === 'Live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-xs font-mono text-gray-500 mb-3 uppercase tracking-widest">Sort By</h3>
                <div className="space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setActiveSort(option.value)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                        activeSort === option.value
                          ? 'bg-white/10 text-white font-medium'
                          : 'hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      {option.label}
                      {activeSort === option.value && <Check size={14} className="text-[#FFD500]" />}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Auction Grid */}
            <div className="flex-1">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedAuctions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex flex-col items-center justify-center py-32 text-gray-500 bg-[#111] border border-dashed border-white/10 rounded-[2rem]"
                  >
                    <Gavel size={48} className="mb-4 opacity-30" />
                    <p className="font-mono text-sm uppercase tracking-widest">{loadingAuctions ? 'Loading lots...' : 'No lots match your criteria.'}</p>
                    <button 
                      onClick={() => {
                        setActiveStatus('All');
                        setActiveSort('ending_soon');
                      }}
                      className="mt-6 text-[#FFD500] hover:text-white text-xs font-mono uppercase tracking-widest transition-colors"
                    >
                      Clear Filters
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="auction-grid"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="flex flex-col w-full"
                  >
                    <div className={gridClassMap[gridColumns]}>
                      {paginatedAuctions.map((auction) => {
                        const highestBid = auction.bids.length > 0 ? Math.max(...auction.bids.map(b => b.amount)) : auction.startingBid;
                        
                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            key={auction.id}
                            className={`group relative bg-[#141414] rounded-lg border border-white/5 flex overflow-hidden transition-colors hover:border-[#FFD500]/50 ${gridColumns === 'list' ? 'flex-row items-center h-32 sm:h-40' : 'flex-col'}`}
                          >
                            <Link to={`/auction/${auction.id}`} className="absolute inset-0 z-20" />
                            
                            {/* Image Area */}
                            <div className={`relative bg-[#0a0a0a] overflow-hidden p-2 shrink-0 ${gridColumns === 'list' ? 'w-32 h-32 sm:w-40 sm:h-40' : 'aspect-square'}`}>
                              <img 
                                src={assetUrl(auction.image)} 
                                alt={auction.name}
                                className="w-full h-full object-cover rounded transition-all duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80" />
                              
                              {/* Badges */}
                              <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                                {auction.status === 'LIVE' ? (
                                  <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest text-white flex items-center gap-1.5 shadow-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                                  </div>
                                ) : auction.status === 'UPCOMING' ? (
                                  <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest text-gray-400 shadow-md">
                                    Upcoming
                                  </div>
                                ) : (
                                  <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest text-gray-400 shadow-md">
                                    Ended
                                  </div>
                                )}
                              </div>

                              {auction.status === 'LIVE' && (
                                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 px-1.5 py-1 rounded text-[9px] font-mono uppercase tracking-widest text-white flex items-center gap-1 shadow-md">
                                  <Eye size={10} className="text-gray-400" /> {auction.viewers}
                                </div>
                              )}
                            </div>

                            {/* Details Area */}
                            <div className={`p-3 sm:p-4 flex flex-col flex-1 h-full relative z-10 ${gridColumns === 'list' ? 'justify-center' : ''}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[#FFD500] text-[9px] sm:text-[10px] font-mono uppercase tracking-widest">
                                  LOT {auction.id}
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                  {auction.year}
                                </span>
                              </div>
                              
                              <h3 className={`font-sans font-medium text-white leading-tight mb-2 group-hover:text-[#FFD500] transition-colors ${gridColumns === 'list' ? 'text-base sm:text-lg' : 'text-sm line-clamp-2'}`}>
                                {auction.name}
                              </h3>
                              
                              <div className={`mt-auto pt-3 border-t border-white/5 flex flex-col gap-2 ${gridColumns === 'list' ? 'mt-4' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                    {auction.status === 'LIVE' ? 'Current Bid' : auction.status === 'ENDED' ? 'Winning Bid' : 'Starting Bid'}
                                  </span>
                                  <span className={`font-mono font-bold text-white ${gridColumns === 'list' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
                                    ${highestBid.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-black/50 rounded p-2 border border-white/5">
                                  <div className="flex items-center gap-1.5">
                                    <Timer size={12} className="text-gray-400" />
                                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                                      {auction.status === 'LIVE' ? 'Ends In' : auction.status === 'ENDED' ? 'Ended' : 'Starts'}
                                    </span>
                                  </div>
                                  <div className="text-xs sm:text-sm">
                                    {auction.status === 'ENDED' ? (
                                      <span className="font-mono text-gray-400">00:00:00</span>
                                    ) : (
                                      <CountdownTimer endTime={auction.endTime} status={auction.status} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
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
                                  ? 'bg-[#FFD500] text-black font-bold' 
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
