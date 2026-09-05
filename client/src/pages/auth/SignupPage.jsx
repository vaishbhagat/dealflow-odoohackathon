import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${surname.trim()}`.trim();

    const res = await signup({
      name: fullName,
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (res && res.success) {
      setSuccessMsg('Account created successfully! Redirecting to customer portal...');
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 1200);
    } else {
      setError(res?.error || 'Registration failed. Please check your details.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    const res = await loginWithGoogle(credentialResponse);
    if (res && res.success) {
      setSuccessMsg('Google sign-in successful! Redirecting to your portal...');
      setTimeout(() => navigate('/customer/dashboard'), 900);
    } else {
      setError(res?.error || 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-100">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden min-h-[620px]">
        {/* LEFT COLUMN - Brand & Introduction */}
        <div className="lg:col-span-6 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-black text-xl">
                G
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">Gada Electronics</h1>
                <p className="text-xs text-blue-400 font-semibold tracking-wide">DealFlow360 Platform</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative z-10 my-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Join Gada Electronics B2B Portal</span>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight">
              Create Your B2B Account <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                Unlock Preferred Pricing
              </span>
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Sign up to browse commercial electronics, generate instant B2B quotations, request volume tier discounts, and track order fulfillment in real-time.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant access to standard catalog & tier-specific pricing</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>B2B Cart to official quotation request workflow</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct counter-offer negotiation channel with sales managers</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Enterprise Data Protection
            </span>
            <span className="font-mono text-[11px] text-slate-400">Gada Electronics B2B</span>
          </div>
        </div>

        {/* RIGHT COLUMN - Sign Up Form */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-center bg-slate-900">
          <div className="max-w-md mx-auto w-full space-y-6">
            <div>
              <h3 className="text-2xl font-black text-white">Create Account</h3>
              <p className="text-xs text-slate-400 mt-1">
                Fill in your details below to register your account.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Krish"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shah"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Sign Up</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 space-y-4">
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-[11px] text-slate-500 font-medium">OR SIGN UP WITH</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {/* Google Sign-Up Button */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in was cancelled or failed.')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  width="380"
                  text="signup_with"
                  logo_alignment="left"
                />
              </div>

              <div className="text-center text-xs text-slate-400">
                <span>Already have an account? </span>
                <Link to="/login" className="text-blue-400 font-bold hover:text-blue-300 underline underline-offset-4">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
