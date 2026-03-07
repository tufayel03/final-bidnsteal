import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, ArrowRight, ShieldAlert, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const token = searchParams.get('token')?.trim() || '';
  const isTokenFlow = Boolean(token);
  const { requestPasswordReset, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setIsProcessing(true);
      if (isTokenFlow) {
        if (!password || password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await resetPassword({ token, password });
      } else {
        await requestPasswordReset(email);
      }
      setIsSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#FF6A00] selection:text-white relative flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[#FF6A00] opacity-[0.12] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF2A00] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)`
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202] opacity-80" />
      </div>

      <Link to="/login" className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group z-20">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-mono uppercase tracking-widest text-xs">Back to Login</span>
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
            {isTokenFlow ? <Lock size={32} className="text-[#FF6A00] relative z-10" /> : <ShieldAlert size={32} className="text-[#FF6A00] relative z-10" />}
          </div>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-2">
            {isTokenFlow ? 'Set New ' : 'Reset '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF2A00]">{isTokenFlow ? 'Password' : 'Access'}</span>
          </h1>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
            {isTokenFlow ? 'Finalize your secure credential reset' : 'Recover your system credentials'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#111]/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#FF6A00]/30 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#FF6A00]/30 rounded-bl-2xl pointer-events-none" />

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 relative z-10"
            >
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="font-sans font-bold text-xl text-white mb-2">Transmission Sent</h3>
              <p className="text-gray-400 text-sm mb-8">
                {isTokenFlow
                  ? 'Your password has been updated. You can log in with the new credentials now.'
                  : "If an account exists for that email, we've sent instructions to reset your password."}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[#FF6A00] font-mono text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Return to Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <p className="text-sm text-gray-400 mb-6">
                {isTokenFlow
                  ? 'Enter your new password to complete the reset flow.'
                  : "Enter your email address and we'll send you a secure link to reset your password."}
              </p>

              {isTokenFlow ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">New Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Confirm Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      placeholder="racer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all font-mono text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

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
                      TRANSMITTING...
                    </>
                  ) : (
                    <>
                      {isTokenFlow ? 'UPDATE PASSWORD' : 'SEND RESET LINK'}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
