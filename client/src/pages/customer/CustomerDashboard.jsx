import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { 
  ShoppingBag, FileText, Package, CreditCard, RefreshCw, Bell, ArrowRight,
  AlertTriangle, CheckCircle, Clock, ShieldCheck, Sparkles, TrendingUp, ChevronRight
} from 'lucide-react';

export const CustomerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/dashboard');
      if (res.success) {
        setData(res);
      } else {
        setError(res.error || 'Failed to load dashboard.');
      }
    } catch (err) {
      setError(err.message || 'Server error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Gada Electronics Portal...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        <p className="font-bold text-base">{error}</p>
        <button onClick={fetchDashboardData} className="mt-3 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 transition-all cursor-pointer">
          Try Again
        </button>
      </div>
    );
  }

  const { customer, actionRequired = [], paymentSummary = {}, stats = {} } = data || {};

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-blue-900/10">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/40 text-amber-200 font-extrabold text-[11px] rounded-full tracking-wider uppercase">
                {customer?.customer_tier || 'GOLD'} TIER MEMBER
              </span>
              <span className="text-xs text-blue-100 font-medium">• Metro Office Systems</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome back, {customer?.contact_person || 'Krish'}!
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
              Your assigned Gada Electronics representative is <span className="text-white font-bold underline decoration-blue-300">{customer?.salesperson_name || 'Bhagha'}</span>. Explore products, request quotations, and manage orders.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/customer/products"
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-blue-700" />
              <span>Browse Catalog</span>
            </Link>
            <Link
              to="/customer/cart"
              className="px-5 py-2.5 bg-blue-800/80 hover:bg-blue-800 border border-blue-600/60 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>View Cart & Quote</span>
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 1: ACTION REQUIRED CENTER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Action Required</h2>
            {actionRequired.length > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                {actionRequired.length}
              </span>
            )}
          </div>
        </div>

        {actionRequired.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>No pending actions. All quotations and payments are up to date!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionRequired.map((act) => (
              <div
                key={act.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                      act.type === 'QUOTATION' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      act.type === 'INVOICE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {act.type}
                    </span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{act.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{act.message}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    to={act.linkUrl}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
                  >
                    <span>{act.actionText}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: PAYMENT SUMMARY CARD & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Summary */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">Payment Summary</h2>
            </div>
            <Link to="/customer/invoices" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <span>View Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-[11px] font-semibold text-slate-500">Total Invoiced</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                ₹{paymentSummary.totalInvoiced ? paymentSummary.totalInvoiced.toLocaleString('en-IN') : '0'}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
              <p className="text-[11px] font-semibold text-emerald-700">Paid Amount</p>
              <p className="text-lg sm:text-xl font-black text-emerald-800 mt-1">
                ₹{paymentSummary.paid ? paymentSummary.paid.toLocaleString('en-IN') : '0'}
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
              <p className="text-[11px] font-semibold text-rose-700">Outstanding</p>
              <p className="text-lg sm:text-xl font-black text-rose-800 mt-1">
                ₹{paymentSummary.outstanding ? paymentSummary.outstanding.toLocaleString('en-IN') : '0'}
              </p>
            </div>
          </div>

          {paymentSummary.outstanding > 0 && (
            <div className="flex items-center justify-between bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
              <span className="text-xs text-amber-900 font-medium">You have outstanding unpaid invoices. Pay online via Razorpay Test Mode.</span>
              <Link
                to="/customer/invoices"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 ml-3"
              >
                Pay Outstanding
              </Link>
            </div>
          )}
        </div>

        {/* Quick Portal Stats */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <Link
            to="/customer/quotations"
            className="bg-white border border-slate-200 hover:border-blue-500 rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xs group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-900">{stats.totalQuotes || 0}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">My Quotations</p>
            </div>
          </Link>

          <Link
            to="/customer/orders"
            className="bg-white border border-slate-200 hover:border-indigo-500 rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xs group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-900">{stats.activeOrders || 0}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">My Orders</p>
            </div>
          </Link>

          <Link
            to="/customer/subscriptions"
            className="bg-white border border-slate-200 hover:border-purple-500 rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xs group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-900">Active</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Subscriptions</p>
            </div>
          </Link>

          <Link
            to="/customer/notifications"
            className="bg-white border border-slate-200 hover:border-amber-500 rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xs group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-900">{stats.unreadNotifications || 0}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Unread Alerts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
