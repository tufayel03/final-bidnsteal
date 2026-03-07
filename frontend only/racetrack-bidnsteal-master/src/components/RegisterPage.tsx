import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, Lock, User, ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      login();
      navigate('/account');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#FF6A00] selection:text-white relative flex items-center justify-center overflow-hidden py-12">
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

      <Link to="/shop" className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group z-20">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-mono uppercase tracking-widest text-xs">Back to Shop</span>
      </Link>

      <div className="w-full max-w-md p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 bg-[#111] border border-white/10 rounded-2xl mx-auto mb-6 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6A00]/20 to-[#FF2A00]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <UserPlus size={32} className="text-[#FF6A00] relative z-10" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-2">
            New <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF2A00]">Recruit</span>
          </h1>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
            Register to build your collection
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#111]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          {/* Decorative corner accents */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#FF6A00]/30 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#FF6A00]/30 rounded-bl-2xl pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Pilot Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Racer_X" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="email" 
                  placeholder="racer@example.com" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Mobile Phone</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="tel" 
                  placeholder="017xxxxxx" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm tracking-widest"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="group relative w-full h-14 bg-transparent text-[#FF6A00] font-mono font-bold tracking-widest uppercase text-sm overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8 border border-[#FF6A00]/50 hover:border-[#FF6A00] hover:shadow-[0_0_20px_rgba(255,106,0,0.3)]"
            >
              <div className="absolute inset-0 bg-[#FF6A00] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <div className="relative z-10 flex items-center justify-center gap-3 group-hover:text-black transition-colors duration-300">
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    REGISTERING...
                  </>
                ) : (
                  <>
                    CREATE PROFILE
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 text-center relative z-10 border-t border-white/10 pt-6">
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
              Already enlisted?
              <Link 
                to="/login"
                className="ml-2 text-white font-bold hover:text-[#FF6A00] transition-colors"
              >
                Access System
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
