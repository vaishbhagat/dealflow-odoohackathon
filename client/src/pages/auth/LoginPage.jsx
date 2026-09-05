import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import GadaLogo from '../../components/common/GadaLogo';
import {
  ShieldCheck,
  LogIn,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  Compass,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const { login, loginWithGoogle, loginAsGuest, switchRole, demoAccounts } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (role) => {
    if (role === 'CUSTOMER' || role === 'GUEST') navigate('/customer/products');
    else if (role === 'SALES_MANAGER') navigate('/manager/dashboard');
    else if (role === 'FINANCE_OPERATIONS') navigate('/finance/dashboard');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/sales/dashboard');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res && res.success) {
      redirectByRole(res.user.role);
    } else {
      setError(res?.error || 'Invalid email or password. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setLoading(true);
    const res = await loginWithGoogle(credentialResponse);
    setLoading(false);
    if (res && res.success) {
      redirectByRole(res.user.role);
    } else {
      setError(res?.error || 'Google sign-in failed. Please try again.');
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setGuestLoading(true);
    const res = await loginAsGuest();
    setGuestLoading(false);
    if (res && res.success) {
      navigate('/customer/products');
    } else {
      setError('Unable to initialize guest session. Please try again.');
    }
  };

  const handleDemoSelect = async (roleKey) => {
    setError(null);
    setLoading(true);
    const res = await switchRole(roleKey);
    setLoading(false);
    if (res && res.success) {
      redirectByRole(res.user.role);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border border-slate-800 relative z-10">
        
        {/* LEFT COLUMN: Real-World Commercial Electronics Facility */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 xl:p-10 text-white overflow-hidden">
          {/* Authentic B2B Electronics Logistics & Distribution Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80')`,
            }}
          />
          {/* Deep Sapphire Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-blue-950/75 backdrop-blur-[2px]" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <GadaLogo size="lg" theme="dark" showSubtext={true} />
          </div>

          {/* Middle Value Proposition */}
          <div className="relative z-10 space-y-4 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Official B2B Enterprise Portal</span>
            </div>

            <h2 className="text-2xl xl:text-3xl font-black text-white leading-tight">
              Enterprise Sales & Wholesale Distribution
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Serving retail partners, corporate clients, and regional distributors with verified GST invoicing, dynamic pricing, and nationwide fulfillment.
            </p>

            <div className="pt-2 space-y-2">
              {[
                'Real-time inventory across Central & Regional Warehouses',
                'Custom B2B Quotations & Product-level GST compliance',
                'Instant Razorpay checkout for subscriptions & orders',
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              AES-256 Verified Enterprise Security
            </span>
            <span className="font-mono text-[10px] text-slate-500">DealFlow360</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Login & Guest Access */}
        <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 xl:p-12 bg-slate-900 text-slate-100">
          <div className="max-w-md w-full mx-auto space-y-5">
            
            {/* Mobile Brand Header */}
            <div className="lg:hidden flex justify-center mb-2">
              <GadaLogo size="md" theme="dark" showSubtext={true} />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Sign In to DealFlow360
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Gada Electronics credentials or continue as a guest.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-shake">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="user@gadaelectronics.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] text-amber-400/80 hover:text-amber-400 cursor-pointer">
                    Forgot Password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Or Continue With
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Guest Login & Google Auth */}
            <div className="space-y-2.5">
              {/* Continue as Guest Button */}
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={guestLoading}
                className="w-full py-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {guestLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>Explore as Guest</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">
                      Browse Catalogue
                    </span>
                  </>
                )}
              </button>

              {/* Google OAuth Login */}
              <div className="flex justify-center pt-1">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in was cancelled.')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  width="360"
                  text="signin_with"
                />
              </div>
            </div>

            {/* Demo Quick Logins */}
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3 h-3 text-amber-400" />
                <span>Demo Accounts:</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { label: 'Admin (Jethalal)', role: 'ADMIN', color: 'hover:border-purple-500' },
                  { label: 'Sales Mgr (Natu)', role: 'SALES_MANAGER', color: 'hover:border-blue-500' },
                  { label: 'Sales Rep (Bhagha)', role: 'SALES_REP', color: 'hover:border-indigo-500' },
                  { label: 'Customer (Krish)', role: 'CUSTOMER', color: 'hover:border-emerald-500' },
                  { label: 'Finance (Chandar)', role: 'FINANCE_OPERATIONS', color: 'hover:border-amber-500' },
                ].map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleDemoSelect(demo.role)}
                    className={`px-2 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-[10px] font-medium text-slate-300 ${demo.color} hover:text-white transition-all text-left truncate cursor-pointer`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign up Link */}
            <p className="text-center text-[11px] text-slate-400 pt-1">
              Need a new enterprise account?{' '}
              <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2">
                Register Company
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
