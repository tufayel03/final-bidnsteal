import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  ShieldCheck,
  MapPin,
  User,
  Mail,
  Phone,
  Tag,
  ArrowRight,
  Package
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest, assetUrl } from '../lib/api';

const DISTRICTS = [
  'Bagerhat',
  'Bandarban',
  'Barguna',
  'Barisal',
  'Bhola',
  'Bogra',
  'Brahmanbaria',
  'Chandpur',
  'Chattogram',
  'Chuadanga',
  'Comilla',
  "Cox's Bazar",
  'Dhaka',
  'Dinajpur',
  'Faridpur',
  'Feni',
  'Gaibandha',
  'Gazipur',
  'Gopalganj',
  'Habiganj',
  'Jamalpur',
  'Jessore',
  'Jhalokati',
  'Jhenaidah',
  'Joypurhat',
  'Khagrachari',
  'Khulna',
  'Kishoreganj',
  'Kurigram',
  'Kushtia',
  'Lakshmipur',
  'Lalmonirhat',
  'Madaripur',
  'Magura',
  'Manikganj',
  'Meherpur',
  'Moulvibazar',
  'Munshiganj',
  'Mymensingh',
  'Naogaon',
  'Narail',
  'Narayanganj',
  'Narsingdi',
  'Natore',
  'Nawabganj',
  'Netrokona',
  'Nilphamari',
  'Noakhali',
  'Pabna',
  'Panchagarh',
  'Patuakhali',
  'Pirojpur',
  'Rajbari',
  'Rajshahi',
  'Rangamati',
  'Rangpur',
  'Satkhira',
  'Shariatpur',
  'Sherpur',
  'Sirajgonj',
  'Sunamganj',
  'Sylhet',
  'Tangail',
  'Thakurgaon'
];

const TAKA = '\u09F3';

interface CouponResponse {
  code: string;
  discount: number;
}

interface OrderResponse {
  orderNumber: string;
  total: number;
}

interface CheckoutFormState {
  fullName: string;
  email: string;
  phone: string;
  district: string;
  address: string;
}

function formatMoney(value: number) {
  return `${TAKA}${Number(value || 0).toFixed(2)}`;
}

export function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [form, setForm] = useState<CheckoutFormState>({
    fullName: '',
    email: '',
    phone: '',
    district: '',
    address: ''
  });
  const navigate = useNavigate();
  const { cartTotal, items, clearCart } = useCart();
  const { user, isAuthenticated, loading, updateShipping } = useAuth();

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.shippingAddress?.fullName || user.name || '',
        email: user.email || '',
        phone: user.shippingAddress?.phone || user.phone || '',
        district: user.shippingAddress?.city || '',
        address: user.shippingAddress?.addressLine1 || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const barcodeBars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        id: index,
        width: `${((index * 17) % 4) + 1}px`,
        opacity: (((index * 19) % 5) + 1) / 10
      })),
    []
  );

  const finalTotal = Math.max(0, cartTotal - discount);

  const handleFieldChange =
    (field: keyof CheckoutFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleApplyCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setCouponMessage('');
    setError('');

    if (!couponCode.trim()) {
      setDiscount(0);
      setAppliedCouponCode('');
      return;
    }

    try {
      const payload = await apiRequest<CouponResponse>('/coupons/validate', {
        method: 'POST',
        body: {
          code: couponCode.trim(),
          subtotal: cartTotal
        }
      });
      setDiscount(Number(payload.discount || 0));
      setAppliedCouponCode(payload.code);
      setCouponMessage(`Coupon ${payload.code} applied.`);
    } catch (requestError) {
      setDiscount(0);
      setAppliedCouponCode('');
      setCouponMessage(requestError instanceof Error ? requestError.message : 'Unable to validate coupon.');
    }
  };

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setCouponMessage('');

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }

    setIsProcessing(true);

    try {
      const order = await apiRequest<OrderResponse>('/orders', {
        method: 'POST',
        body: {
          items: items.map((item) => ({
            productId: item.id,
            qty: item.quantity
          })),
          couponCode: appliedCouponCode,
          shippingAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            addressLine1: form.address.trim(),
            city: form.district.trim(),
            area: form.district.trim(),
            country: 'BD'
          }
        }
      });

      void updateShipping({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        addressLine1: form.address.trim(),
        city: form.district.trim(),
        area: form.district.trim(),
        country: 'BD'
      }).catch(() => undefined);

      setConfirmedTotal(Number(order.total || finalTotal));
      setOrderId(order.orderNumber);
      setIsSuccess(true);
      clearCart();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Checkout failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || (!isAuthenticated && !isSuccess)) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono uppercase tracking-[0.3em] text-xs">
        Syncing checkout...
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-green-500 blur-[150px]" />
        </div>

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
          className="bg-green-500/10 p-6 sm:p-8 rounded-full mb-6 sm:mb-8 border border-green-500/30 relative z-10"
        >
          <CheckCircle size={64} className="text-green-500 sm:w-20 sm:h-20" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl uppercase tracking-tighter mb-8 text-center relative z-10"
        >
          Order <span className="text-green-500">Confirmed.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', damping: 20 }}
          className="relative z-10 w-full max-w-md mx-auto mb-10"
        >
          <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-[#050505] rounded-full border-r border-white/10 z-20" />
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 w-8 h-8 bg-[#050505] rounded-full border-l border-white/10 z-20" />

            <div className="p-6 sm:p-8 border-b border-dashed border-white/20 relative bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1">Order ID</p>
                  <p className="text-white font-mono text-xl sm:text-2xl font-bold tracking-wider">{orderId}</p>
                </div>
                <div className="bg-green-500/10 px-3 py-1.5 rounded border border-green-500/20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-500 font-mono text-[10px] uppercase tracking-widest font-bold">Confirmed</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1">Date</p>
                  <p className="text-gray-300 font-mono text-sm">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-1">Payment</p>
                  <p className="text-gray-300 font-mono text-sm">Cash on Delivery</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-black/20">
              <div className="flex justify-between items-end mb-6">
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Total Amount</span>
                <span className="text-[#FF6A00] font-display text-3xl">{formatMoney(confirmedTotal || finalTotal)}</span>
              </div>

              <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <Package size={16} className="text-gray-400" />
                </div>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  Your gear is being prepped for the track. We&apos;ll email you the tracking details shortly.
                </p>
              </div>
            </div>

            <div className="h-12 w-full bg-white/5 flex items-center justify-center gap-1 px-8 opacity-50 overflow-hidden">
              {barcodeBars.map((bar) => (
                <div
                  key={bar.id}
                  className="h-6 bg-white shrink-0"
                  style={{ width: bar.width, opacity: bar.opacity }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative z-10"
        >
          <Link
            to="/shop"
            className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-white/5 hover:bg-white/10 text-white font-mono text-xs sm:text-sm uppercase tracking-wider rounded border border-white/10 transition-all overflow-hidden inline-flex items-center gap-2"
          >
            <span className="relative z-10 flex items-center gap-2">
              Return to Shop <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#FF6A00] selection:text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[#FF6A00] opacity-[0.12] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF2A00] opacity-[0.08] blur-[120px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202] opacity-80" />
      </div>

      <nav className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/shop" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono uppercase tracking-widest text-xs hidden sm:inline">Back to Shop</span>
        </Link>
        <h1 className="font-display text-2xl uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF2A00]">
          Secure Checkout
        </h1>
        <div className="w-8 sm:w-24 flex justify-end">
          <ShieldCheck size={20} className="text-green-500" />
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="flex-1 space-y-10">
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-10">
              <section>
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                    <User size={16} className="text-[#FF6A00]" />
                  </div>
                  <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white">Contact Info</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="fullName"
                        placeholder="John Doe"
                        value={form.fullName}
                        onChange={handleFieldChange('fullName')}
                        className="w-full bg-[#111] border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                        required
                      />
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        placeholder="john@example.com"
                        value={form.email}
                        onChange={handleFieldChange('email')}
                        className="w-full bg-[#111] border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                        required
                      />
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+880 1XXX XXXXXX"
                        value={form.phone}
                        onChange={handleFieldChange('phone')}
                        className="w-full bg-[#111] border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                        required
                      />
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                    <MapPin size={16} className="text-[#FF6A00]" />
                  </div>
                  <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white">Shipping Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">District</label>
                    <div className="relative">
                      <select
                        name="district"
                        value={form.district}
                        onChange={handleFieldChange('district')}
                        className="w-full bg-[#111] border border-white/10 rounded-lg p-4 pl-11 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm appearance-none text-white"
                        required
                      >
                        <option value="" disabled>
                          Select your district
                        </option>
                        {DISTRICTS.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1.5L6 6.5L11 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Full Address</label>
                    <textarea
                      name="address"
                      placeholder="House/Apartment number, Street name, Area, etc."
                      rows={3}
                      value={form.address}
                      onChange={handleFieldChange('address')}
                      className="w-full bg-[#111] border border-white/10 rounded-lg p-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm resize-none"
                      required
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                    <CreditCard size={16} className="text-[#FF6A00]" />
                  </div>
                  <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white">Payment Method</h2>
                </div>

                <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle size={24} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-white text-lg">Cash on Delivery (COD)</h3>
                    <p className="text-sm text-gray-400 mt-1">Pay with cash upon delivery. No advance payment required.</p>
                  </div>
                </div>
              </section>
            </form>
          </div>

          <div className="lg:w-[400px] shrink-0">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 lg:p-8 sticky top-24 shadow-2xl">
              <h2 className="font-sans text-xl font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                Order Summary
                <span className="bg-white/10 text-xs px-2 py-1 rounded-full font-mono">{items.length} items</span>
              </h2>

              <div className="space-y-4 mb-6 max-h-[200px] overflow-y-auto pr-2 hide-scrollbar">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-black rounded overflow-hidden shrink-0 border border-white/5">
                      <img src={assetUrl(item.image)} alt={item.name} className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 font-mono">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-mono text-sm text-white shrink-0">{formatMoney(item.price * item.quantity)}</div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-500 font-mono text-xs uppercase tracking-widest border border-dashed border-white/10 rounded-xl">
                    No items in cart.
                  </div>
                )}
              </div>

              <form onSubmit={handleApplyCoupon} className="mb-3 relative">
                <div className="relative flex items-center">
                  <Tag size={16} className="absolute left-3 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Coupon code (Try SPEED10)"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg py-3 pl-10 pr-20 focus:border-[#FF6A00] outline-none font-mono text-sm uppercase"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase px-3 rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </form>

              {(couponMessage || error) && (
                <p className={`mb-6 text-[11px] font-mono uppercase tracking-wider ${error ? 'text-red-400' : couponMessage.includes('applied') ? 'text-green-400' : 'text-[#FF6A00]'}`}>
                  {error || couponMessage}
                </p>
              )}

              <div className="space-y-3 mb-6 border-t border-white/10 pt-6">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{formatMoney(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-400">Shipping</span>
                  <span className="text-green-500">Free</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-mono text-[#FF6A00]">
                    <span>Discount</span>
                    <span>-{formatMoney(discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end mb-8 border-t border-white/10 pt-6">
                <span className="font-mono uppercase tracking-widest text-sm text-gray-400">Total</span>
                <span className="font-display text-4xl text-white leading-none">{formatMoney(finalTotal)}</span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing || items.length === 0}
                className="group relative w-full h-16 bg-transparent text-[#FF6A00] font-mono font-bold tracking-widest uppercase text-sm sm:text-base overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#FF6A00]/50 hover:border-[#FF6A00] hover:shadow-[0_0_20px_rgba(255,106,0,0.3)]"
              >
                <div className="absolute inset-0 bg-[#FF6A00] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <div className="relative z-10 flex items-center justify-center gap-3 group-hover:text-black transition-colors duration-300">
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      PROCESSING...
                    </>
                  ) : (
                    <>
                      CONFIRM ORDER (COD)
                      <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
