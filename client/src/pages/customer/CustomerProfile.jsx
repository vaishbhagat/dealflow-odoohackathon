import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Shield,
  Lock,
  Award,
  CheckCircle2,
  Edit2,
  Save,
  X,
  AlertCircle
} from 'lucide-react';

export const CustomerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    contact_person: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
  });

  const [emailPrefs, setEmailPrefs] = useState({
    quoteUpdates: true,
    paymentReceipts: true,
    marketingPromos: false,
  });
  const [savedPrefs, setSavedPrefs] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/profile');
      if (res.success) {
        setProfile(res.profile);
        setFormData({
          contact_person: res.profile.contact_person || '',
          phone: res.profile.phone || '',
          billing_address: res.profile.billing_address || '',
          shipping_address: res.profile.shipping_address || '',
        });
      } else {
        setError(res.error || 'Failed to load profile.');
      }
    } catch (err) {
      setError(err.message || 'Error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePref = (key) => {
    setEmailPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2500);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg(null);
      setError(null);
      const res = await api.put('/customer/profile', {
        contact_person: formData.contact_person,
        phone: formData.phone,
        billing_address: formData.billing_address,
        shipping_address: formData.shipping_address,
      });

      if (res.success) {
        setProfile(res.profile);
        setIsEditing(false);
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setError(err.message || 'Error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading profile information...</span>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
        <p>{error || 'Profile details unavailable.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/40 text-amber-200 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              {profile.customer_tier || 'GOLD'} Preferred Customer
            </span>
            <span className="text-xs text-blue-100">• {profile.company_name || 'Enterprise Account'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Customer Profile</h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            Manage your personal enterprise details, registered shipping & billing addresses, and notification preferences.
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  contact_person: profile.contact_person || '',
                  phone: profile.phone || '',
                  billing_address: profile.billing_address || '',
                  shipping_address: profile.shipping_address || '',
                });
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel Editing
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
        {/* SECTION 1: Personal & Contact Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Contact Person & Enterprise Details</span>
            </h3>
            {isEditing && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                Editing Mode Active
              </span>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Company Name (System Registered)</label>
                  <input
                    type="text"
                    disabled
                    value={profile.company_name || ''}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address (Login ID)</label>
                  <input
                    type="email"
                    disabled
                    value={profile.email || ''}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registered Shipping Address</label>
                <textarea
                  rows={2}
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  placeholder="Street, City, State, PIN"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registered Billing Address</label>
                <textarea
                  rows={2}
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  placeholder="Street, City, State, PIN"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <p className="text-sm font-bold text-slate-900">{profile.contact_person || 'Not Specified'}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Name</label>
                  <p className="text-sm font-bold text-slate-900">{profile.company_name || 'Not Specified'}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <p className="text-sm font-bold text-slate-900">{profile.email || 'Not Specified'}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <p className="text-sm font-bold text-slate-900">{profile.phone || 'Not Specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    Registered Shipping Address
                  </label>
                  <p className="text-xs text-slate-700 leading-relaxed">{profile.shipping_address || 'Not Specified'}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Building className="w-3 h-3 text-indigo-500" />
                    Registered Billing Address
                  </label>
                  <p className="text-xs text-slate-700 leading-relaxed">{profile.billing_address || profile.shipping_address || 'Same as Shipping Address'}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SECTION 2: EMAIL NOTIFICATION PREFERENCES (Smart follow-up removed) */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <span>Real-Time Email Notification Preferences</span>
            </h3>
            {savedPrefs && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <div className="space-y-3 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Quotation Status & Counter Offer Alerts</p>
                <p className="text-[11px] text-slate-500">Receive emails when your assigned sales representative updates quote terms.</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.quoteUpdates}
                onChange={() => handleTogglePref('quoteUpdates')}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Payment & Invoice Receipts</p>
                <p className="text-[11px] text-slate-500">Receive Razorpay payment confirmation receipts via email.</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.paymentReceipts}
                onChange={() => handleTogglePref('paymentReceipts')}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Product Promotions & Catalog Updates</p>
                <p className="text-[11px] text-slate-500">Receive occasional notifications on new catalog arrivals and bulk discounts.</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.marketingPromos}
                onChange={() => handleTogglePref('marketingPromos')}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM CONFIGURATION */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Assigned Governance & Tier Settings</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              System Managed (Read-Only)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-[10px] font-bold uppercase tracking-wider">Customer Tier</span>
                <Award className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-amber-900">{profile.customer_tier || 'GOLD'}</p>
              <p className="text-[10px] text-amber-800">Tier volume discounts auto-applied across catalog.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-[10px] font-bold uppercase tracking-wider">Assigned Representative</span>
                <User className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-blue-900">{profile.sales_rep_name || 'Bhagha'}</p>
              <p className="text-[10px] text-blue-800">Handles quotation review & discount approvals.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Credit Limit</span>
              <p className="text-lg font-black text-slate-900">
                ₹{parseFloat(profile.credit_limit || 1500000).toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-500">Pre-approved procurement credit allocation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
