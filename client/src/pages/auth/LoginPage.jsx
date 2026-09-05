import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import GadaLogo from '../../components/common/GadaLogo';
import {
  LogIn,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Compass,
  ShieldCheck,
  X,
  CheckCircle2,
  Send,
  AlertCircle,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────
   Forgot-Password Modal
   ───────────────────────────────────────────────────────────────────── */
const ForgotPasswordModal = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate a brief send delay
    await new Promise((r) => setTimeout(r, 900));
    setSent(true);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative bg-white border border-blue-100 rounded-3xl shadow-2xl w-full max-w-md p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!sent ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Forgot Password?</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Enter your registered email address. We'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="your@gadaelectronics.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-blue-50/60 border border-blue-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Check Your Email</h2>
            <p className="text-sm text-slate-500">
              A password reset link has been sent to <strong className="text-slate-800">{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   Main Login Page
   ───────────────────────────────────────────────────────────────────── */
export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login, loginWithGoogle, loginAsGuest } = useAuth();
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

  return (
    <>
      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl shadow-blue-200/50 overflow-hidden border border-blue-100 relative z-10">

          {/* ── LEFT COLUMN: Electronics B2B Image Panel ── */}
          <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 xl:p-10 text-white overflow-hidden">
            {/* Real electronics warehouse image — no AI generated */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80')`,
              }}
            />
            {/* Blue overlay to match light-blue theme */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/95 via-blue-800/80 to-blue-700/60" />

            {/* Brand Header */}
            <div className="relative z-10">
              <GadaLogo size="lg" theme="dark" showSubtext={true} />
            </div>

            {/* Value Proposition */}
            <div className="relative z-10 space-y-4 my-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>Official B2B Enterprise Portal</span>
              </div>

              <h2 className="text-2xl xl:text-3xl font-black text-white leading-tight">
                Gada Electronics<br />Wholesale Distribution
              </h2>

              <p className="text-xs text-blue-100 leading-relaxed max-w-xs">
                Serving retail partners, corporate clients, and regional distributors with verified GST invoicing and nationwide fulfillment.
              </p>

              <div className="pt-2 space-y-2.5">
                {[
                  'Real-time inventory across Central & Regional Warehouses',
                  'Custom B2B Quotations & Product-level GST compliance',
                  'Secure Razorpay checkout for subscriptions & orders',
                ].map((text, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-blue-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-blue-200 border-t border-white/10 pt-4">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                AES-256 Secured
              </span>
              <span className="font-mono opacity-60">DealFlow360 v2.0</span>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Login Form ── */}
          <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 xl:p-12 bg-white">
            <div className="max-w-md w-full mx-auto space-y-6">

              {/* Mobile Brand Header */}
              <div className="lg:hidden flex justify-center mb-2">
                <GadaLogo size="md" theme="light" showSubtext={true} />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Sign in to your Gada Electronics enterprise account.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="user@gadaelectronics.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-blue-50/60 border border-blue-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    {/* ── FORGOT PASSWORD — clearly visible ── */}
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-blue-50/60 border border-blue-200 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-blue-100" />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Or continue with
                </span>
                <div className="flex-1 h-px bg-blue-100" />
              </div>

              {/* Guest + Google */}
              <div className="space-y-3">
                {/* Guest Access */}
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={guestLoading}
                  className="w-full py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {guestLoading ? (
                    <div className="w-4 h-4 border-2 border-blue-400/40 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Compass className="w-4 h-4 text-blue-500" />
                      <span>Browse as Guest</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-200/70 text-blue-700 font-medium">
                        View Catalogue
                      </span>
                    </>
                  )}
                </button>

                {/* Google OAuth */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in was cancelled or failed.')}
                    theme="outline"
                    shape="rectangular"
                    size="large"
                    width="370"
                    text="signin_with"
                  />
                </div>
              </div>

              {/* Sign-up Link */}
              <p className="text-center text-sm text-slate-500">
                Need a new enterprise account?{' '}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-blue-800 font-bold underline underline-offset-2 transition-colors"
                >
                  Register Company
                </Link>
              </p>

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default LoginPage;
