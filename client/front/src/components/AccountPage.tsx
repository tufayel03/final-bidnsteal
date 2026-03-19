import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Package,
  Settings,
  LogOut,
  ArrowLeft,
  Save,
  Bell,
  Shield,
  Key,
  ChevronRight,
  ChevronDown,
  MapPin,
  CreditCard,
  Star,
  Award,
  Mail,
  Phone,
  Gavel,
  Trophy,
  Activity,
  DollarSign,
  ExternalLink,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, assetUrl } from '../lib/api';
import type { Auction } from '../types/auction';

const DISTRICTS = ['Bagerhat', 'Bandarban', 'Barguna', 'Barisal', 'Bhola', 'Bogra', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Chuadanga', 'Comilla', "Cox's Bazar", 'Dhaka', 'Dinajpur', 'Faridpur', 'Feni', 'Gaibandha', 'Gazipur', 'Gopalganj', 'Habiganj', 'Jamalpur', 'Jessore', 'Jhalokati', 'Jhenaidah', 'Joypurhat', 'Khagrachari', 'Khulna', 'Kishoreganj', 'Kurigram', 'Kushtia', 'Lakshmipur', 'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj', 'Meherpur', 'Moulvibazar', 'Munshiganj', 'Mymensingh', 'Naogaon', 'Narail', 'Narayanganj', 'Narsingdi', 'Natore', 'Nawabganj', 'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna', 'Panchagarh', 'Patuakhali', 'Pirojpur', 'Rajbari', 'Rajshahi', 'Rangamati', 'Rangpur', 'Satkhira', 'Shariatpur', 'Sherpur', 'Sirajgonj', 'Sunamganj', 'Sylhet', 'Tangail', 'Thakurgaon'];
const TAKA = '\u09F3';

interface ShippingAddress { fullName?: string; phone?: string; addressLine1?: string; addressLine2?: string; area?: string; city?: string; postalCode?: string; country?: string; }
interface ActivityUser { id: string; name: string; email: string; phone?: string; shippingAddress?: ShippingAddress; }
interface ActivityOrderItem { titleSnapshot: string; qty: number; unitPrice: number; imageUrl?: string; type?: string; }
interface ActivityOrder { id: string; orderNumber: string; paymentStatus: string; fulfillmentStatus: string; total: number; createdAt: string; items: ActivityOrderItem[]; shippingAddress?: ShippingAddress; }
interface ActivityResponse { user: ActivityUser; orders: ActivityOrder[]; auctions: Auction[]; }
interface DisplayOrder { id: string; status: string; statusKey: string; orderDate: string; deliveredDate: string | null; total: number; items: Array<{ name: string; qty: number; price: number; image: string }>; shipping: { address: string; method: string }; payment: string; }

function formatCurrency(value: number, compact = false) {
  const amount = Number(value || 0);
  return compact ? `${TAKA}${amount.toLocaleString()}` : `${TAKA}${amount.toFixed(2)}`;
}

function formatDateLabel(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildAddress(address?: ShippingAddress) {
  const parts = [address?.addressLine1, address?.addressLine2, address?.area, address?.city, address?.postalCode, address?.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Shipping details pending.';
}

function normalizeFulfillmentStatusKey(status: string) {
  return String(status || '').trim().toLowerCase();
}

function formatFulfillmentStatus(status: string) {
  const normalized = normalizeFulfillmentStatusKey(status);
  if (!normalized) return 'Pending';

  const labels: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return normalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFulfillmentSignal(statusKey: string) {
  const normalized = normalizeFulfillmentStatusKey(statusKey);

  if (normalized === 'delivered') {
    return {
      badgeClass: 'bg-green-500/10 text-green-400 border-green-500/25',
      timelineFillClass: 'w-full bg-green-500/50',
      timelineStatusClass: 'text-green-400'
    };
  }

  if (normalized === 'cancelled') {
    return {
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/25',
      timelineFillClass: 'w-full bg-red-500/50',
      timelineStatusClass: 'text-red-400'
    };
  }

  if (normalized === 'shipped') {
    return {
      badgeClass: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/25',
      timelineFillClass: 'w-3/4 bg-yellow-400/50',
      timelineStatusClass: 'text-yellow-300'
    };
  }

  if (normalized === 'processing') {
    return {
      badgeClass: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/25',
      timelineFillClass: 'w-1/2 bg-yellow-400/50',
      timelineStatusClass: 'text-yellow-300'
    };
  }

  return {
    badgeClass: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/25',
    timelineFillClass: 'w-1/4 bg-yellow-400/50',
    timelineStatusClass: 'text-yellow-300'
  };
}

function getUserMaxBid(auction: Auction) {
  return auction.bids.filter((bid) => bid.isUser).reduce((max, bid) => Math.max(max, bid.amount), 0);
}

function getHighestBid(auction: Auction) {
  return auction.bids.reduce((max, bid) => Math.max(max, bid.amount), auction.startingBid);
}

function isWinningAuction(auction: Auction) {
  const userMaxBid = getUserMaxBid(auction);
  return Boolean(userMaxBid) && userMaxBid === getHighestBid(auction);
}

export function AccountPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [auctionFilter, setAuctionFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [orders, setOrders] = useState<ActivityOrder[]>([]);
  const [userAuctions, setUserAuctions] = useState<Auction[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [claimingAuctionId, setClaimingAuctionId] = useState('');
  const [auctionMessage, setAuctionMessage] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [shippingForm, setShippingForm] = useState({ fullName: '', email: '', phone: '', district: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '' });
  const ordersPerPage = 10;
  const { user, isAuthenticated, loading, logout, refreshAuth, updateProfile, updatePassword, updateShipping } = useAuth();
  const navigate = useNavigate();

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const payload = await apiRequest<ActivityResponse>('/users/me/activity');
      setOrders(payload.orders || []);
      setUserAuctions(payload.auctions || []);
      setProfileForm({ name: payload.user?.name || '', email: payload.user?.email || '', phone: payload.user?.phone || '' });
      setShippingForm({
        fullName: payload.user?.shippingAddress?.fullName || payload.user?.name || '',
        email: payload.user?.email || '',
        phone: payload.user?.shippingAddress?.phone || payload.user?.phone || '',
        district: payload.user?.shippingAddress?.city || '',
        address: payload.user?.shippingAddress?.addressLine1 || ''
      });
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'Unable to load account activity.');
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!loading && isAuthenticated) {
      void loadActivity();
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length]);

  const displayOrders = useMemo<DisplayOrder[]>(() => orders.map((order) => ({
    id: order.orderNumber || order.id,
    statusKey: normalizeFulfillmentStatusKey(order.fulfillmentStatus),
    status: formatFulfillmentStatus(order.fulfillmentStatus),
    orderDate: formatDateLabel(order.createdAt),
    deliveredDate: normalizeFulfillmentStatusKey(order.fulfillmentStatus) === 'delivered' ? 'Completed' : null,
    total: Number(order.total || 0),
    items: (order.items || []).map((item) => ({ name: item.titleSnapshot, qty: Number(item.qty || 0), price: Number(item.unitPrice || 0), image: item.imageUrl || '' })),
    shipping: { address: buildAddress(order.shippingAddress), method: order.items.some((item) => item.type === 'auction') ? 'Auction Fulfillment' : 'Standard Delivery' },
    payment: order.paymentStatus === 'paid' ? 'Paid' : 'Cash on Delivery'
  })), [orders]);

  const totalPages = Math.ceil(displayOrders.length / ordersPerPage);
  const currentOrders = useMemo(() => displayOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage), [currentPage, displayOrders]);
  const filteredAuctions = useMemo(() => userAuctions.filter((auction) => {
    const winning = isWinningAuction(auction);
    const isEnded = auction.status === 'ENDED';
    if (auctionFilter === 'active') return !isEnded;
    if (auctionFilter === 'won') return isEnded && winning;
    if (auctionFilter === 'lost') return isEnded && !winning;
    return true;
  }), [auctionFilter, userAuctions]);
  const totalBidCount = useMemo(() => userAuctions.reduce((sum, auction) => sum + auction.bids.filter((bid) => bid.isUser).length, 0), [userAuctions]);
  const activeBids = useMemo(() => userAuctions.filter((auction) => auction.status === 'LIVE').length, [userAuctions]);
  const wonAuctions = useMemo(() => userAuctions.filter((auction) => auction.status === 'ENDED' && isWinningAuction(auction)), [userAuctions]);
  const totalAuctionSpend = useMemo(() => wonAuctions.reduce((sum, auction) => sum + getHighestBid(auction), 0), [wonAuctions]);
  const winsRatio = userAuctions.length ? ((wonAuctions.length / userAuctions.length) * 100).toFixed(1) : '0.0';
  const pilotLevel = Math.max(1, Math.min(99, 12 + displayOrders.length * 2 + wonAuctions.length * 4));
  const pilotSpeed = Math.min(320, 140 + activeBids * 25 + wonAuctions.length * 15);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const toggleOrder = (orderId: string) => setExpandedOrder(expandedOrder === orderId ? null : orderId);

  const handleSettingsSave = async () => {
    setIsSavingSettings(true);
    setSettingsError('');
    setSettingsMessage('');
    try {
      await updateProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim() });
      await updateShipping({ fullName: shippingForm.fullName.trim(), phone: shippingForm.phone.trim(), addressLine1: shippingForm.address.trim(), city: shippingForm.district.trim(), area: shippingForm.district.trim(), country: 'BD' });
      await refreshAuth();
      await loadActivity();
      setSettingsMessage('Configuration saved.');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to save configuration.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePasswordSave = async () => {
    setIsSavingPassword(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      await updatePassword({ currentPassword: passwordForm.currentPassword, nextPassword: passwordForm.nextPassword });
      setPasswordForm({ currentPassword: '', nextPassword: '' });
      setPasswordMessage('Credentials updated.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to update credentials.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleClaimAuction = async (auction: Auction) => {
    setClaimingAuctionId(auction.id);
    setAuctionMessage('');
    try {
      const payload = await apiRequest<{ order: { orderNumber: string } }>(`/auctions/${auction.id}/claim`, { method: 'POST' });
      setAuctionMessage(`Auction claim completed. Order ${payload.order.orderNumber} created.`);
      setActiveTab('orders');
      await loadActivity();
    } catch (error) {
      setAuctionMessage(error instanceof Error ? error.message : 'Unable to claim auction.');
    } finally {
      setClaimingAuctionId('');
    }
  };

  if (loading || activityLoading) {
    return <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center font-mono uppercase tracking-[0.3em] text-xs">Syncing command center...</div>;
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#FF6A00] selection:text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[#FF6A00] opacity-[0.12] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF2A00] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202] opacity-80" />
      </div>

      <nav className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/shop" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono uppercase tracking-widest text-xs hidden sm:inline">Back to Shop</span>
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF2A00]">Command Center</h1>
        <div className="w-8 sm:w-24" />
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="relative bg-[#1a1a1a] rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-[#0a0a0a] overflow-hidden group">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #1a1a1a 25%, #1a1a1a 75%, #000 75%, #000)', backgroundPosition: '0 0, 4px 4px', backgroundSize: '8px 8px' }} />
              <div className="absolute top-12 bottom-12 left-0 w-6 bg-[#111] border-r border-white/10 rounded-r-2xl shadow-[inset_-4px_0_10px_rgba(0,0,0,0.5)]" />
              <div className="absolute top-12 bottom-12 right-0 w-6 bg-[#111] border-l border-white/10 rounded-l-2xl shadow-[inset_4px_0_10px_rgba(0,0,0,0.5)]" />
              <div className="relative z-10">
                <div className="flex justify-center gap-1.5 mb-5 bg-black/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm mx-4">
                  {[...Array(5)].map((_, i) => <div key={`g-${i}`} className="w-3 h-2 rounded-[1px] bg-[#00FF00] shadow-[0_0_8px_#00FF00]" />)}
                  {[...Array(4)].map((_, i) => <div key={`y-${i}`} className="w-3 h-2 rounded-[1px] bg-[#FFD500] shadow-[0_0_8px_#FFD500]" />)}
                  {[...Array(3)].map((_, i) => <div key={`r-${i}`} className="w-3 h-2 rounded-[1px] bg-[#FF2A00] shadow-[0_0_8px_#FF2A00]" />)}
                  {[...Array(3)].map((_, i) => <div key={`b-${i}`} className="w-3 h-2 rounded-[1px] bg-[#0055FF]/20" />)}
                </div>
                <div className="bg-[#050814] border-4 border-[#0a0f1e] rounded-xl p-4 shadow-[inset_0_0_30px_rgba(0,150,255,0.15)] relative mx-4">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none rounded-lg" />
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col"><span className="text-[#00E5FF]/50 font-mono text-[8px] tracking-widest">GEAR / LVL</span><span className="text-[#00E5FF] font-display text-3xl leading-none drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">{pilotLevel}</span></div>
                    <div className="flex flex-col items-end"><span className="text-[#00E5FF]/50 font-mono text-[8px] tracking-widest">MODE</span><span className="text-[#00E5FF] font-mono text-sm font-bold tracking-widest drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">RACE</span></div>
                  </div>
                  <div className="flex flex-col items-center justify-center my-2">
                    <div className="w-16 h-16 rounded-full border-2 border-[#00E5FF]/30 flex items-center justify-center bg-[#00E5FF]/10 relative"><User size={28} className="text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" /></div>
                    <h2 className="font-display text-xl text-white tracking-widest uppercase mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{profileForm.name || user?.name || 'Racer'}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-[#00E5FF]/10 rounded border border-[#00E5FF]/20 p-1.5 text-center"><div className="text-[#00E5FF]/60 font-mono text-[8px] tracking-widest">SPEED</div><div className="text-[#00E5FF] font-mono text-sm font-bold">{pilotSpeed} <span className="text-[8px]">MPH</span></div></div>
                    <div className="bg-[#00E5FF]/10 rounded border border-[#00E5FF]/20 p-1.5 text-center"><div className="text-[#00E5FF]/60 font-mono text-[8px] tracking-widest">WINS</div><div className="text-[#00E5FF] font-mono text-sm font-bold">{winsRatio} <span className="text-[8px]">%</span></div></div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6 px-6">
                  <div className="flex flex-col items-center gap-1.5 group/dial cursor-help" title="VIP Member"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#0a0a0a] border-2 border-[#333] shadow-[0_5px_10px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(255,255,255,0.1)] flex items-center justify-center relative transition-transform group-hover/dial:rotate-45"><div className="absolute top-1 w-1 h-2.5 bg-[#FFD500] rounded-full shadow-[0_0_8px_#FFD500]" /><Star size={16} className="text-[#FFD500] mt-2 opacity-50 group-hover/dial:opacity-100 transition-opacity" /></div><span className="text-[9px] font-mono text-gray-400 font-bold tracking-widest">VIP</span></div>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF2A00] to-[#990000] border-4 border-[#111] shadow-[0_0_15px_rgba(255,42,0,0.4),inset_0_2px_5px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center cursor-pointer hover:shadow-[0_0_25px_rgba(255,42,0,0.6)] transition-shadow"><span className="text-[7px] font-mono text-white/80 font-bold tracking-widest">ENGINE</span><span className="text-[10px] font-display text-white font-bold tracking-widest">START</span></div>
                  <div className="flex flex-col items-center gap-1.5 group/dial cursor-help" title="Pro Competitor"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#0a0a0a] border-2 border-[#333] shadow-[0_5px_10px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(255,255,255,0.1)] flex items-center justify-center relative transition-transform group-hover/dial:-rotate-45"><div className="absolute top-1 w-1 h-2.5 bg-[#00E5FF] rounded-full shadow-[0_0_8px_#00E5FF]" /><Award size={16} className="text-[#00E5FF] mt-2 opacity-50 group-hover/dial:opacity-100 transition-opacity" /></div><span className="text-[9px] font-mono text-gray-400 font-bold tracking-widest">PRO</span></div>
                </div>
              </div>
            </div>
            <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              <button onClick={() => setActiveTab('orders')} className={`flex-shrink-0 lg:w-full flex items-center justify-between px-4 py-4 rounded-xl font-mono text-xs uppercase tracking-widest transition-all border ${activeTab === 'orders' ? 'bg-[#FF6A00]/10 border-[#FF6A00]/50 text-[#FF6A00]' : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}><div className="flex items-center gap-3"><Package size={16} /><span className="hidden sm:inline">Order History</span><span className="sm:hidden">Orders</span></div>{activeTab === 'orders' && <ChevronRight size={16} className="hidden lg:block" />}</button>
              <button onClick={() => setActiveTab('auctions')} className={`flex-shrink-0 lg:w-full flex items-center justify-between px-4 py-4 rounded-xl font-mono text-xs uppercase tracking-widest transition-all border ${activeTab === 'auctions' ? 'bg-[#FF6A00]/10 border-[#FF6A00]/50 text-[#FF6A00]' : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}><div className="flex items-center gap-3"><Gavel size={16} /><span className="hidden sm:inline">My Auctions</span><span className="sm:hidden">Auctions</span></div>{activeTab === 'auctions' && <ChevronRight size={16} className="hidden lg:block" />}</button>
              <button onClick={() => setActiveTab('settings')} className={`flex-shrink-0 lg:w-full flex items-center justify-between px-4 py-4 rounded-xl font-mono text-xs uppercase tracking-widest transition-all border ${activeTab === 'settings' ? 'bg-[#FF6A00]/10 border-[#FF6A00]/50 text-[#FF6A00]' : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}><div className="flex items-center gap-3"><Settings size={16} /><span className="hidden sm:inline">System Settings</span><span className="sm:hidden">Settings</span></div>{activeTab === 'settings' && <ChevronRight size={16} className="hidden lg:block" />}</button>
              <button onClick={() => void handleLogout()} className="flex-shrink-0 lg:w-full flex items-center gap-3 bg-[#111] border border-red-500/20 text-red-500 hover:bg-red-500/10 px-4 py-4 rounded-xl font-mono text-xs uppercase tracking-widest transition-all lg:mt-4"><LogOut size={16} /><span className="hidden sm:inline">Terminate Session</span><span className="sm:hidden">Logout</span></button>
            </nav>
          </div>
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {activeTab === 'orders' && (
                <motion.section key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center"><Package size={16} className="text-[#FF6A00]" /></div>
                    <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white">Acquisition History</h2>
                  </div>
                  {activityError && <div className="text-sm font-mono uppercase tracking-widest text-[#FF6A00] border border-[#FF6A00]/20 bg-[#FF6A00]/5 rounded-2xl p-4">{activityError}</div>}
                  <div className="space-y-4">
                    {currentOrders.map((order) => {
                      const isExpanded = expandedOrder === order.id;
                      const fulfillmentSignal = getFulfillmentSignal(order.statusKey);
                      return (
                        <div key={order.id} className={`bg-[#111] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-[#FF6A00]/50 shadow-[0_0_20px_rgba(255,106,0,0.1)]' : 'border-white/10 hover:border-white/30'}`}>
                          <button onClick={() => toggleOrder(order.id)} className="w-full p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <div className="flex items-center gap-4 w-full sm:w-auto relative z-10">
                              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 transition-colors ${isExpanded ? 'border-[#FF6A00] bg-[#FF6A00]/10' : 'border-white/10 bg-black'}`}>
                                {order.items.length === 1 ? <img src={assetUrl(order.items[0].image)} alt={order.items[0].name} className="w-full h-full object-cover opacity-80" /> : <Package size={24} className={isExpanded ? 'text-[#FF6A00]' : 'text-gray-500'} />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-mono text-sm uppercase tracking-widest text-white">ID: {order.id}</h3>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border ${fulfillmentSignal.badgeClass}`}>{order.status}</span>
                                </div>
                                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Ordered: {order.orderDate}</p>
                              </div>
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t border-white/5 sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0 relative z-10">
                              <span className="font-display text-xl text-[#FF6A00]">{formatCurrency(order.total)}</span>
                              <div className="flex items-center gap-2 text-gray-500">
                                <span className="text-xs font-mono uppercase tracking-widest hidden sm:inline">{isExpanded ? 'Close Details' : 'View Details'}</span>
                                <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#FF6A00]' : ''}`} />
                              </div>
                            </div>
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                                <div className="p-4 sm:p-6 pt-0 border-t border-white/10 bg-black/20">
                                  <div className="flex items-center gap-4 mb-6 pt-4">
                                    <div className="flex flex-col"><span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Order Placed</span><span className="text-sm font-mono text-white">{order.orderDate}</span></div>
                                    <div className="flex-1 h-px bg-white/10 relative"><div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${fulfillmentSignal.timelineFillClass}`} /></div>
                                    <div className="flex flex-col text-right"><span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Fulfillment</span><span className={`text-sm font-mono ${fulfillmentSignal.timelineStatusClass}`}>{order.status}</span></div>
                                  </div>
                                  <div className="py-4 space-y-4">
                                    <h4 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">Acquired Assets</h4>
                                    {order.items.map((item, idx) => (
                                      <div key={`${order.id}-${idx}`} className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-black rounded overflow-hidden border border-white/10 shrink-0"><img src={assetUrl(item.image)} alt={item.name} className="w-full h-full object-cover opacity-80" /></div>
                                          <div><p className="font-sans text-sm text-white line-clamp-1">{item.name}</p><p className="text-xs text-gray-500 font-mono">Qty: {item.qty}</p></div>
                                        </div>
                                        <span className="font-mono text-sm text-white shrink-0">{formatCurrency(item.price)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5"><div className="flex items-center gap-2 mb-2"><MapPin size={14} className="text-[#FF6A00]" /><h4 className="font-mono text-xs text-gray-500 uppercase tracking-widest">Logistics</h4></div><p className="text-sm text-white mb-1">{order.shipping.method}</p><p className="text-xs text-gray-400">{order.shipping.address}</p></div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5"><div className="flex items-center gap-2 mb-2"><CreditCard size={14} className="text-[#FF6A00]" /><h4 className="font-mono text-xs text-gray-500 uppercase tracking-widest">Payment</h4></div><p className="text-sm text-white">{order.payment}</p></div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    {!currentOrders.length && !activityError && <div className="text-center py-12 text-gray-500 font-mono text-sm uppercase tracking-widest border border-dashed border-white/10 rounded-2xl">No orders found.</div>}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-8 pt-4 border-t border-white/10">
                        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:border-[#FF6A00] disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:text-gray-400 transition-colors"><ArrowLeft size={16} /></button>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: totalPages }).map((_, idx) => (
                            <button key={idx} onClick={() => setCurrentPage(idx + 1)} className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm transition-colors ${currentPage === idx + 1 ? 'bg-[#FF6A00]/20 border border-[#FF6A00] text-[#FF6A00]' : 'border border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}>{idx + 1}</button>
                          ))}
                        </div>
                        <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:border-[#FF6A00] disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:text-gray-400 transition-colors"><ChevronRight size={16} /></button>
                      </div>
                    )}
                  </div>
                </motion.section>
              )}
              {activeTab === 'auctions' && (
                <motion.section key="auctions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center"><Gavel size={16} className="text-[#FF6A00]" /></div>
                    <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white">My Auctions</h2>
                  </div>
                  {auctionMessage && <div className={`text-sm font-mono uppercase tracking-widest rounded-2xl p-4 border ${auctionMessage.includes('created') ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-[#FF6A00] border-[#FF6A00]/20 bg-[#FF6A00]/5'}`}>{auctionMessage}</div>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col"><div className="flex items-center gap-2 text-gray-500 mb-2"><Gavel size={14} /> <span className="text-[10px] font-mono uppercase tracking-widest">Total Bids</span></div><span className="font-display text-2xl text-white">{totalBidCount}</span></div>
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col"><div className="flex items-center gap-2 text-[#FF6A00] mb-2"><Activity size={14} /> <span className="text-[10px] font-mono uppercase tracking-widest">Active Bids</span></div><span className="font-display text-2xl text-white">{activeBids}</span></div>
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col"><div className="flex items-center gap-2 text-green-500 mb-2"><Trophy size={14} /> <span className="text-[10px] font-mono uppercase tracking-widest">Auctions Won</span></div><span className="font-display text-2xl text-white">{wonAuctions.length}</span></div>
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col"><div className="flex items-center gap-2 text-[#FF6A00] mb-2"><DollarSign size={14} /> <span className="text-[10px] font-mono uppercase tracking-widest">Total Spent</span></div><span className="font-display text-2xl text-white">{formatCurrency(totalAuctionSpend, true)}</span></div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['all', 'active', 'won', 'lost'].map((filter) => (
                      <button key={filter} onClick={() => setAuctionFilter(filter)} className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-colors whitespace-nowrap ${auctionFilter === filter ? 'bg-[#FF6A00] text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'}`}>{filter}</button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {filteredAuctions.map((auction) => {
                      const userBids = auction.bids.filter((bid) => bid.isUser);
                      const maxUserBid = getUserMaxBid(auction);
                      const highestBid = getHighestBid(auction);
                      const isWinning = isWinningAuction(auction);
                      const isEnded = auction.status === 'ENDED';
                      const auctionLink = auction.productSlug || auction.id;
                      const statusBadge = isEnded ? (
                        isWinning ? <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1"><Trophy size={10} /> Won</span> : <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border bg-red-500/10 text-red-500 border-red-500/20">Lost</span>
                      ) : (
                        isWinning ? <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border bg-[#D6E74F]/10 text-[#D6E74F] border-[#D6E74F]/20">Winning</span> : <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border bg-[#FF6A00]/10 text-[#FF6A00] border-[#FF6A00]/20">Outbid</span>
                      );
                      return (
                        <div key={auction.id} className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/30 flex flex-col">
                          <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                            <div className="flex items-center gap-4 w-full sm:w-auto relative z-10">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/10 bg-black shrink-0 relative">
                                <img src={assetUrl(auction.image)} alt={auction.name} className="w-full h-full object-cover opacity-80" />
                                {isEnded && isWinning && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[2px]"><Trophy size={24} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" /></div>}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1"><h3 className="font-mono text-sm uppercase tracking-widest text-white">LOT {auction.id}</h3>{statusBadge}</div>
                                <p className="text-white text-sm sm:text-base font-sans font-medium line-clamp-1">{auction.name}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs font-mono text-gray-500 uppercase tracking-widest"><span className="flex items-center gap-1"><Clock size={12} /> {isEnded ? 'Ended' : formatDateLabel(auction.endTime)}</span></div>
                              </div>
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t border-white/5 sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0 relative z-10">
                              <div className="flex flex-col sm:items-end"><span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Your Max Bid</span><span className="font-display text-xl text-white">{formatCurrency(maxUserBid, true)}</span></div>
                              <div className="flex flex-col sm:items-end"><span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Current/Final Bid</span><span className={`font-display text-lg ${isWinning ? 'text-green-500' : 'text-[#FF6A00]'}`}>{formatCurrency(highestBid, true)}</span></div>
                            </div>
                          </div>
                          <div className="bg-black/40 border-t border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Your Bid History</span>
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-full sm:max-w-[200px] md:max-w-[300px]">
                                {userBids.slice(0, 3).map((bid) => <span key={bid.id} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-gray-400 shrink-0">{formatCurrency(bid.amount, true)} <span className="opacity-50 ml-1">{bid.time}</span></span>)}
                                {userBids.length > 3 && <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-gray-400 shrink-0">+{userBids.length - 3} more</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                              {!isEnded && !isWinning && <Link to={`/auction/${auctionLink}`} className="flex-1 sm:flex-none px-4 py-2 bg-[#FF6A00] text-black font-bold text-xs font-mono uppercase tracking-widest rounded hover:bg-[#FF6A00]/80 transition-colors text-center">Increase Bid</Link>}
                              {isEnded && isWinning && <button type="button" onClick={() => void handleClaimAuction(auction)} disabled={claimingAuctionId === auction.id} className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-black font-bold text-xs font-mono uppercase tracking-widest rounded hover:bg-green-400 transition-colors flex items-center justify-center gap-1 disabled:opacity-70"><ShoppingBag size={14} />{claimingAuctionId === auction.id ? 'Claiming...' : 'Checkout'}</button>}
                              <Link to={`/auction/${auctionLink}`} className="flex-1 sm:flex-none px-4 py-2 border border-white/10 text-white text-xs font-mono uppercase tracking-widest rounded hover:bg-white/5 transition-colors flex items-center justify-center gap-1"><ExternalLink size={14} /> View</Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredAuctions.length === 0 && <div className="text-center py-12 text-gray-500 font-mono text-sm uppercase tracking-widest border border-dashed border-white/10 rounded-2xl">No auctions found for this filter.</div>}
                  </div>
                </motion.section>
              )}
              {activeTab === 'settings' && (
                <motion.section key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                  <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center"><Settings size={16} className="text-[#FF6A00]" /></div>
                    <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white">System Configuration</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:col-span-2">
                      <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2"><User size={14} className="text-[#FF6A00]" /> Pilot Data</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Callsign (Username)</label><input type="text" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Comms Channel (Email)</label><input type="email" value={profileForm.email} readOnly className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 outline-none transition-all font-mono text-sm text-gray-400" /></div>
                      </div>
                    </div>
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                      <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Shield size={14} className="text-[#FF6A00]" /> Security Protocol</h3>
                      <div className="space-y-6">
                        <div className="space-y-2"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Current Password</label><input type="password" placeholder="********" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm tracking-widest" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">New Password</label><input type="password" placeholder="********" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm tracking-widest" /></div>
                        {(passwordError || passwordMessage) && <p className={`text-[11px] font-mono uppercase tracking-wider ${passwordError ? 'text-[#FF6A00]' : 'text-green-400'}`}>{passwordError || passwordMessage}</p>}
                        <button type="button" onClick={() => void handlePasswordSave()} disabled={isSavingPassword} className="group relative w-full h-12 bg-transparent text-[#FF6A00] font-mono font-bold tracking-widest uppercase text-xs overflow-hidden transition-all border border-[#FF6A00]/50 hover:border-[#FF6A00] hover:shadow-[0_0_15px_rgba(255,106,0,0.3)] rounded-lg mt-2 disabled:opacity-70"><div className="absolute inset-0 bg-[#FF6A00] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out" /><div className="relative z-10 flex items-center justify-center gap-2 group-hover:text-black transition-colors duration-300"><Key size={14} />{isSavingPassword ? 'UPDATING...' : 'UPDATE CREDENTIALS'}</div></button>
                      </div>
                    </div>
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                      <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Bell size={14} className="text-[#FF6A00]" /> Alerts & Comms</h3>
                      <div className="space-y-6">
                        <label className="flex items-start justify-between cursor-pointer group"><div className="pr-4"><p className="font-sans font-bold text-sm text-white group-hover:text-[#FF6A00] transition-colors">Acquisition Updates</p><p className="text-xs text-gray-500 font-mono mt-1">Receive status changes for your orders.</p></div><div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1"><input type="checkbox" className="sr-only peer" defaultChecked /><div className="w-9 h-5 bg-black border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-[#FF6A00] after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:border-[#FF6A00]/50" /></div></label>
                        <div className="w-full h-px bg-white/5" />
                        <label className="flex items-start justify-between cursor-pointer group"><div className="pr-4"><p className="font-sans font-bold text-sm text-white group-hover:text-[#FF6A00] transition-colors">Classified Drops</p><p className="text-xs text-gray-500 font-mono mt-1">Alerts for limited edition vehicle releases.</p></div><div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1"><input type="checkbox" className="sr-only peer" defaultChecked /><div className="w-9 h-5 bg-black border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-[#FF6A00] after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:border-[#FF6A00]/50" /></div></label>
                      </div>
                    </div>
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:col-span-2">
                      <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPin size={14} className="text-[#FF6A00]" /> Shipping Address</h3>
                      <div className="space-y-8">
                        <div>
                          <h4 className="font-sans text-sm font-bold text-white mb-4">Contact Info</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Full Name</label><div className="relative"><input type="text" placeholder="John Doe" value={shippingForm.fullName} onChange={(event) => setShippingForm((current) => ({ ...current, fullName: event.target.value }))} className="w-full bg-black/50 border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm" /><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /></div></div>
                            <div className="space-y-2"><label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Email Address</label><div className="relative"><input type="email" placeholder="john@example.com" value={shippingForm.email} readOnly className="w-full bg-black/50 border border-white/10 rounded-lg p-4 pl-11 outline-none transition-all font-mono text-sm text-gray-400" /><Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /></div></div>
                            <div className="space-y-2"><label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Phone Number</label><div className="relative"><input type="tel" placeholder="+880 1XXX XXXXXX" value={shippingForm.phone} onChange={(event) => { const value = event.target.value; setShippingForm((current) => ({ ...current, phone: value })); setProfileForm((current) => ({ ...current, phone: value })); }} className="w-full bg-black/50 border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm" /><Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /></div></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-sans text-sm font-bold text-white mb-4">Shipping Details</h4>
                          <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-2"><label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">District</label><div className="relative"><select className="w-full bg-black/50 border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm appearance-none text-white" value={shippingForm.district} onChange={(event) => setShippingForm((current) => ({ ...current, district: event.target.value }))}><option value="" disabled>Select your district</option>{DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}</select><MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div></div></div>
                            <div className="space-y-2"><label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Full Address</label><textarea placeholder="House/Apartment number, Street name, Area, etc." rows={3} value={shippingForm.address} onChange={(event) => setShippingForm((current) => ({ ...current, address: event.target.value }))} className="w-full bg-black/50 border border-white/10 rounded-lg p-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm resize-none" /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
                      {(settingsError || settingsMessage) && <p className={`text-[11px] font-mono uppercase tracking-wider ${settingsError ? 'text-[#FF6A00]' : 'text-green-400'}`}>{settingsError || settingsMessage}</p>}
                      <button type="button" onClick={() => void handleSettingsSave()} disabled={isSavingSettings} className="group relative w-full sm:w-auto px-8 h-12 bg-transparent text-[#FF6A00] font-mono font-bold tracking-widest uppercase text-xs overflow-hidden transition-all border border-[#FF6A00]/50 hover:border-[#FF6A00] hover:shadow-[0_0_15px_rgba(255,106,0,0.3)] rounded-lg disabled:opacity-70"><div className="absolute inset-0 bg-[#FF6A00] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out" /><div className="relative z-10 flex items-center justify-center gap-2 group-hover:text-black transition-colors duration-300"><Save size={14} />{isSavingSettings ? 'SAVING...' : 'SAVE CONFIGURATION'}</div></button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
