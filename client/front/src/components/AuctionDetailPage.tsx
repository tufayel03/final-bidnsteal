import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Gavel, Users, Activity, Zap, ShieldCheck, Eye, DollarSign, ChevronDown, ChevronUp, ShoppingBag, ShoppingCart, ArrowLeft, ArrowRight } from 'lucide-react';
import { Navbar } from './Navbar';
import { CartSidebar } from './CartSidebar';
import type { Auction } from '../data/auctions';
import { apiRequest, assetUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('00:00:00');
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
  }, [endTime]);

  return (
    <span className={`font-mono font-bold tracking-widest ${isUrgent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
      {timeLeft}
    </span>
  );
}

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { auctions } = useStore();
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [actionError, setActionError] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isClaimingOrder, setIsClaimingOrder] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadAuction = async () => {
      try {
        setIsLoading(true);
        setActionError('');
        const seeded = auctions.find((auction) => auction.id === id || auction.productSlug === id);
        if (seeded && !ignore) {
          setActiveAuction(seeded);
        }
        const payload = await apiRequest<Auction>(`/auctions/${id}`);
        if (!ignore) {
          setActiveAuction(payload);
        }
      } catch (error) {
        if (!ignore) {
          setActionError(error instanceof Error ? error.message : 'Failed to load auction.');
          setActiveAuction(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadAuction();
    return () => {
      ignore = true;
    };
  }, [id, auctions]);

  useEffect(() => {
    if (!activeAuction || activeAuction.status !== 'LIVE') return;

    const interval = window.setInterval(async () => {
      try {
        const payload = await apiRequest<Auction>(`/auctions/${id}`);
        setActiveAuction(payload);
      } catch {
        // ignore background polling failures
      }
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activeAuction?.status, id]);

  if (!activeAuction && !isLoading) {
    return (
      <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Auction Not Found</h2>
          {actionError ? <p className="text-sm text-gray-500 mb-4">{actionError}</p> : null}
          <button onClick={() => navigate('/auction')} className="text-[#FF6A00] hover:underline">Return to Auctions</button>
        </div>
      </div>
    );
  }

  if (!activeAuction) {
    return (
      <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center">
        <h2 className="text-2xl font-bold">Loading Auction...</h2>
      </div>
    );
  }

  const currentBid = activeAuction.bids.length > 0 ? Math.max(...activeAuction.bids.map(b => b.amount)) : activeAuction.startingBid;
  const minimumBid = currentBid + Math.max(1, Number(activeAuction.minIncrement || 1));
  const winningBid = activeAuction.bids.length > 0 ? activeAuction.bids.reduce((prev, current) => (prev.amount > current.amount) ? prev : current) : null;
  const isWinner = winningBid?.isUser;

  const claimWonAuction = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setIsClaimingOrder(true);
      setActionError('');
      await apiRequest(`/auctions/${activeAuction.id}/claim`, {
        method: 'POST'
      });
      navigate('/account');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to claim auction.');
    } finally {
      setIsClaimingOrder(false);
    }
  };

  const handleCustomBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const amount = parseInt(customBidAmount.replace(/,/g, ''), 10);
    if (!isNaN(amount) && amount >= minimumBid) {
      try {
        setIsSubmittingBid(true);
        setActionError('');
        const payload = await apiRequest<Auction>(`/auctions/${activeAuction.id}/bids`, {
          method: 'POST',
          body: { amount }
        });
        setActiveAuction(payload);
        setCustomBidAmount('');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to place bid.');
      } finally {
        setIsSubmittingBid(false);
      }
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setIsBuyingNow(true);
      setActionError('');
      await apiRequest(`/auctions/${activeAuction.id}/buy-now`, {
        method: 'POST'
      });
      navigate('/account');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Buy now failed.');
    } finally {
      setIsBuyingNow(false);
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

      <div className="relative z-10 flex flex-col min-h-screen pt-20 sm:pt-24 pb-12">
        <Navbar />

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <button 
            onClick={() => navigate('/auction')}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 sm:mb-8 font-mono text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Network
          </button>

          {/* NEW SPLIT LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
            
            {/* Mobile Title (Hidden on Desktop) */}
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                <span className="bg-white/5 border border-white/10 text-white px-2 py-1 rounded">LOT {activeAuction.id}</span>
                <span>{activeAuction.year}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500"/> {activeAuction.authenticity}</span>
              </div>
              
              <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight text-white leading-none">
                {activeAuction.name}
              </h1>
              
              <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">
                <p>Condition: <span className="text-gray-300">{activeAuction.condition}</span></p>
              </div>
            </div>

            {/* LEFT COLUMN: GALLERY (Sticky on Desktop) */}
            <div className="lg:col-span-7 lg:sticky lg:top-28 flex flex-col gap-3 sm:gap-4">
              {/* Main Image */}
              <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 aspect-square sm:aspect-[4/3] shadow-2xl group">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeAuction.gallery?.[activeImageIndex] || activeAuction.image}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    src={assetUrl(activeAuction.gallery?.[activeImageIndex] || activeAuction.image)} 
                    alt={activeAuction.name} 
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-60 pointer-events-none" />
                
                {/* Floating Badges */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2 z-10">
                  {activeAuction.status === 'LIVE' && (
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 text-white shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]" /> Live
                    </div>
                  )}
                  {activeAuction.status === 'ENDED' && (
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 text-gray-400 shadow-md">
                      Ended
                    </div>
                  )}
                  <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 text-white shadow-md">
                    <Eye size={12} className="text-gray-400" /> {activeAuction.viewers}
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {activeAuction.gallery && activeAuction.gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {activeAuction.gallery.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative rounded-lg overflow-hidden aspect-[4/3] border transition-all ${
                        activeImageIndex === index ? 'border-[#FF6A00] opacity-100' : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/30'
                      }`}
                    >
                      <img src={assetUrl(img)} alt={`${activeAuction.name} view ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Desktop Description Section */}
              <div className="hidden lg:block bg-[#141414] border border-white/10 rounded-xl p-5 sm:p-6 mt-4 sm:mt-8 shadow-xl">
                <h3 className="font-mono font-bold uppercase tracking-widest text-xs sm:text-sm text-white mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-[#FF6A00]" /> Description
                </h3>
                <div className="text-gray-400 text-sm sm:text-base leading-relaxed space-y-4">
                  <p>
                    This exceptional {activeAuction.year} {activeAuction.name} represents a pinnacle of automotive engineering and design. Meticulously maintained and in {activeAuction.condition.toLowerCase()} condition, it stands as a testament to its legacy.
                  </p>
                  <p>
                    Featuring authentic components and verified provenance, this lot offers a rare opportunity for serious collectors. The vehicle has undergone comprehensive inspection to ensure it meets our highest standards of authenticity and quality.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 mt-4 text-gray-300">
                    <li><strong className="text-white">Verified Authenticity:</strong> {activeAuction.authenticity}</li>
                    <li><strong className="text-white">Current Condition:</strong> {activeAuction.condition}</li>
                    <li><strong className="text-white">Lot Number:</strong> {activeAuction.id}</li>
                    <li><strong className="text-white">Year:</strong> {activeAuction.year}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAILS & BIDDING */}
            <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
              
              {/* Desktop Title (Hidden on Mobile) */}
              <div className="hidden lg:flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                  <span className="bg-white/5 border border-white/10 text-white px-2 py-1 rounded">LOT {activeAuction.id}</span>
                  <span>{activeAuction.year}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500"/> {activeAuction.authenticity}</span>
                </div>
                
                <h1 className="font-display text-4xl lg:text-5xl uppercase tracking-tight text-white leading-none">
                  {activeAuction.name}
                </h1>
                
                <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">
                  <p>Condition: <span className="text-gray-300">{activeAuction.condition}</span></p>
                </div>
              </div>

              {/* Bidding Panel */}
              <div className="bg-[#141414] border border-white/10 rounded-xl p-5 sm:p-6 lg:p-8 flex flex-col gap-5 sm:gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6A00]/5 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex justify-between items-end relative z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Current Bid</span>
                    <motion.div 
                      key={currentBid}
                      initial={{ color: '#FF6A00', y: -5 }}
                      animate={{ color: '#FFFFFF', y: 0 }}
                      className="font-mono text-4xl sm:text-5xl tracking-tighter text-white flex items-center gap-1 leading-none font-bold"
                    >
                      <span className="text-[#FF6A00] text-2xl sm:text-3xl">$</span>
                      {currentBid.toLocaleString()}
                    </motion.div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/40 rounded-lg p-3 sm:p-4 border border-white/5 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-white/5 flex items-center justify-center border border-white/5">
                      <Timer size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                      {activeAuction.status === 'ENDED' ? 'Ended' : 'Ends In'}
                    </span>
                  </div>
                  <div className="text-base sm:text-lg">
                    {activeAuction.status === 'ENDED' ? (
                      <span className="font-mono font-bold text-gray-600">00:00:00</span>
                    ) : (
                      <CountdownTimer endTime={activeAuction.endTime} />
                    )}
                  </div>
                </div>

                {actionError ? (
                  <div className="text-sm text-red-400 relative z-10">{actionError}</div>
                ) : null}

                {activeAuction.status === 'LIVE' && (
                  <div className="flex flex-col gap-3 sm:gap-4 mt-1 sm:mt-2 relative z-10">
                    <form onSubmit={handleCustomBidSubmit} className="flex flex-col gap-2 sm:gap-3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                          <DollarSign size={16} className="text-gray-500" />
                        </div>
                        <input
                          type="text"
                          value={customBidAmount}
                          onChange={(e) => setCustomBidAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={`Min bid: ${minimumBid.toLocaleString()}`}
                          className="w-full bg-black border border-white/10 focus:border-[#FF6A00] rounded-lg py-3 sm:py-4 pl-9 sm:pl-10 pr-4 text-white font-mono text-base sm:text-lg outline-none transition-all placeholder:text-gray-600"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={isSubmittingBid || !customBidAmount || parseInt(customBidAmount, 10) < minimumBid}
                        className="w-full bg-white text-black font-bold uppercase tracking-widest py-3 sm:py-4 rounded-lg hover:bg-[#FF6A00] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm"
                      >
                        <Gavel size={16} /> {isSubmittingBid ? 'Placing Bid...' : 'Place Bid'}
                      </button>
                    </form>

                    <div className="relative flex items-center py-1 sm:py-2">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink-0 mx-3 sm:mx-4 text-gray-600 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest">or</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>

                    <button 
                      onClick={handleBuyNow}
                      disabled={isBuyingNow}
                      className="w-full group flex items-center justify-between bg-transparent border border-white/10 hover:border-[#FF6A00]/50 px-4 sm:px-5 py-3 sm:py-4 rounded-lg transition-all"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <ShoppingBag size={14} className="text-gray-400 group-hover:text-[#FF6A00] transition-colors sm:w-4 sm:h-4" />
                        <span className="font-bold text-white uppercase tracking-widest text-[10px] sm:text-xs">{isBuyingNow ? 'Processing...' : 'Buy It Now'}</span>
                      </div>
                      <span className="font-mono text-xs sm:text-sm text-white">${activeAuction.buyNowPrice.toLocaleString()}</span>
                    </button>
                  </div>
                )}
                {activeAuction.status === 'ENDED' && (
                  <div className="flex flex-col gap-3 sm:gap-4 mt-1 sm:mt-2 relative z-10">
                    {isWinner ? (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={claimWonAuction}
                          disabled={isClaimingOrder}
                          className="w-full bg-[#FF6A00] text-white font-bold uppercase tracking-widest py-3 sm:py-4 rounded-lg hover:bg-[#FF6A00]/80 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingBag size={16} /> {isClaimingOrder ? 'Processing...' : 'Checkout'}
                        </button>
                        <button 
                          onClick={claimWonAuction}
                          disabled={isClaimingOrder}
                          className="w-full bg-white/10 text-white font-bold uppercase tracking-widest py-3 sm:py-4 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart size={16} /> {isClaimingOrder ? 'Processing...' : 'Add to Cart'}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full bg-white/5 text-gray-500 font-mono text-xs sm:text-sm uppercase tracking-widest py-3 sm:py-4 rounded-lg flex items-center justify-center gap-2 border border-white/5 relative z-10">
                        Auction Closed
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bid History */}
              <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <button 
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 lg:p-6 bg-transparent hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Activity size={14} className="text-[#FF6A00] sm:w-4 sm:h-4" />
                    <span className="font-mono font-bold uppercase tracking-widest text-[10px] sm:text-xs text-white">Bid History</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono text-gray-400 ml-1 sm:ml-2">
                      {activeAuction.bids.length}
                    </span>
                  </div>
                  {isHistoryOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                
                <AnimatePresence>
                  {isHistoryOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-4 sm:p-5 lg:p-6 pt-3 sm:pt-4">
                        <div className="grid grid-cols-12 gap-2 pb-2 sm:pb-3 border-b border-white/5 text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-gray-500">
                          <div className="col-span-5">Bidder</div>
                          <div className="col-span-4 text-right">Amount</div>
                          <div className="col-span-3 text-right">Time</div>
                        </div>
                        <div className="flex flex-col gap-2 mt-2 sm:mt-3 max-h-[200px] sm:max-h-[250px] overflow-y-auto scrollbar-hide pr-1 sm:pr-2">
                          {activeAuction.bids.map((bid, index) => (
                            <div key={bid.id} className={`grid grid-cols-12 gap-1 sm:gap-2 p-2 sm:p-2.5 rounded-lg items-center transition-colors ${index === 0 ? 'bg-[#FF6A00]/10 border border-[#FF6A00]/20' : 'hover:bg-white/5 border border-transparent'}`}>
                              <div className="col-span-5 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center shrink-0 ${index === 0 ? 'bg-[#FF6A00] text-white' : bid.isUser ? 'bg-white text-black' : 'bg-white/10 text-gray-400'}`}>
                                  {bid.isUser ? <Zap size={8} className="sm:w-2.5 sm:h-2.5" /> : <Users size={8} className="sm:w-2.5 sm:h-2.5" />}
                                </div>
                                <span className={`font-mono text-[9px] sm:text-[10px] uppercase tracking-widest truncate ${index === 0 ? 'text-[#FF6A00] font-bold' : bid.isUser ? 'text-white font-bold' : 'text-gray-400'}`}>
                                  {bid.user}
                                </span>
                              </div>
                              <div className={`col-span-4 text-right font-mono font-bold text-[10px] sm:text-xs ${index === 0 ? 'text-[#FF6A00]' : 'text-gray-300'}`}>
                                ${bid.amount.toLocaleString()}
                              </div>
                              <div className="col-span-3 text-right text-[8px] sm:text-[9px] font-mono text-gray-600">
                                {bid.time}
                              </div>
                            </div>
                          ))}
                          {activeAuction.bids.length === 0 && (
                            <div className="text-center py-4 sm:py-6 text-gray-600 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest">No bids placed</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Description Section */}
              <div className="lg:hidden bg-[#141414] border border-white/10 rounded-xl p-5 sm:p-6 shadow-xl">
                <h3 className="font-mono font-bold uppercase tracking-widest text-xs sm:text-sm text-white mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-[#FF6A00]" /> Description
                </h3>
                <div className="text-gray-400 text-sm sm:text-base leading-relaxed space-y-4">
                  <p>
                    This exceptional {activeAuction.year} {activeAuction.name} represents a pinnacle of automotive engineering and design. Meticulously maintained and in {activeAuction.condition.toLowerCase()} condition, it stands as a testament to its legacy.
                  </p>
                  <p>
                    Featuring authentic components and verified provenance, this lot offers a rare opportunity for serious collectors. The vehicle has undergone comprehensive inspection to ensure it meets our highest standards of authenticity and quality.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 mt-4 text-gray-300">
                    <li><strong className="text-white">Verified Authenticity:</strong> {activeAuction.authenticity}</li>
                    <li><strong className="text-white">Current Condition:</strong> {activeAuction.condition}</li>
                    <li><strong className="text-white">Lot Number:</strong> {activeAuction.id}</li>
                    <li><strong className="text-white">Year:</strong> {activeAuction.year}</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      <CartSidebar />
    </div>
  );
}
