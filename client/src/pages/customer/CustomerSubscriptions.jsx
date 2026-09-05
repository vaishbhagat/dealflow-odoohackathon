import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  Calendar,
  ShieldCheck,
  Zap,
  Sparkles,
  Award,
  Check,
  ArrowRight,
  HelpCircle,
  Laptop,
  Tv,
  Wind,
  Printer,
  CreditCard
} from 'lucide-react';

const AVAILABLE_WARRANTY_PLANS = [
  {
    id: 'warranty-laptop-pro',
    dbPlanId: 6, // Dell Inspiron / Workstation Extended Warranty in DB
    name: 'Dell & Workstation Extended Warranty Care',
    category: 'Laptops & Workstations',
    productSku: 'LAP-DELL-15, LAP-HP-14, LAP-LEN-15',
    description: 'Comprehensive accidental damage and OEM hardware protection for commercial laptops and enterprise workstations.',
    price: 1000,
    billingInterval: 'YEARLY',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Laptop,
    features: [
      'Next-business-day on-site doorstep technician',
      '100% genuine OEM spare parts replacement',
      'Accidental liquid spill & screen drop protection',
      'Dedicated enterprise helpdesk priority queue',
    ],
  },
  {
    id: 'warranty-ac-amc',
    dbPlanId: 4, // Annual Appliance AMC in DB
    name: 'Commercial HVAC & Air Conditioner AMC',
    category: 'Air Conditioners & Cooling',
    productSku: 'AC-SAM-15, AC-VOLT-15, AC-DAIK-15',
    description: 'Preventative quarterly servicing and gas refilling contract for office cooling installations.',
    price: 3999,
    billingInterval: 'YEARLY',
    badge: 'Essential AMC',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Wind,
    features: [
      '4 scheduled preventative wet services per year',
      'Free compressor refrigerant gas recharge',
      'PCB electrical circuit repair and replacement',
      'Guaranteed 4-hour breakdown turnaround in Mumbai',
    ],
  },
  {
    id: 'warranty-tv-display',
    dbPlanId: 1, // Premium Device Support - Monthly in DB
    name: 'Smart Conference Display & TV Care',
    category: 'Smart TVs & Monitors',
    productSku: 'TV-SAM-55, TV-LG-65, TV-SONY-55',
    description: 'Specialized panel defect protection and board replacement for presentation displays.',
    price: 999,
    billingInterval: 'MONTHLY',
    badge: 'Enterprise Display',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Tv,
    features: [
      'Zero dead-pixel guarantee with instant replacement',
      'Internal power supply and HDMI logic board coverage',
      'Free de-mounting and re-mounting wall assistance',
      'Remote diagnostics and firmware calibration',
    ],
  },
  {
    id: 'warranty-business-it',
    dbPlanId: 5, // Business IT Support in DB
    name: 'Full Office Infrastructure & IT Fleet Support',
    category: 'Office IT Fleet & Printers',
    productSku: 'PRN-HP-LJ, PRN-CAN-PX, PRN-EPS-ET',
    description: 'Mechanical roller replacement, fuser repair, router maintenance, and priority corporate SLA.',
    price: 24999,
    billingInterval: 'YEARLY',
    badge: 'Enterprise SLA',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Printer,
    features: [
      'Periodic paper jam roller alignment & laser cleaning',
      'Free fuser assembly and scanner head repairs',
      'Unlimited standby emergency hardware replacement',
      'Dedicated SLA manager and 2-hour response guarantee',
    ],
  },
];

export const CustomerSubscriptions = () => {
  const { user, isGuest } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollingPlan, setEnrollingPlan] = useState(null);
  const [enrollSuccess, setEnrollSuccess] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/subscriptions');
      if (res.success) {
        setSubscriptions(res.subscriptions || []);
      } else {
        setError(res.error || 'Failed to load subscriptions.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async (plan) => {
    if (isGuest || !user || user.role === 'GUEST') {
      alert('Guest Account: Please sign in or register with a corporate customer account to buy warranty subscriptions.');
      return;
    }

    try {
      setEnrollingPlan(plan.id);
      const orderRes = await api.post('/payments/subscription/order', { planId: plan.dbPlanId });
      
      if (!orderRes.success) {
        throw new Error(orderRes.error || 'Failed to initialize subscription checkout');
      }

      if (typeof window.Razorpay === 'function') {
        const options = {
          key: orderRes.razorpayKeyId || 'rzp_test_TYIQZHTbJvKoGi',
          amount: orderRes.amount,
          currency: 'INR',
          name: 'Gada Electronics',
          description: `${orderRes.planName} Plan Activation`,
          image: '/favicon.svg',
          order_id: orderRes.orderId,
          handler: async function (response) {
            try {
              const verifyRes = await api.post('/payments/subscription/verify', {
                planId: orderRes.planId,
                razorpayOrderId: response.razorpay_order_id || orderRes.orderId,
                razorpayPaymentId: response.razorpay_payment_id || `pay_test_${Date.now()}`,
                razorpaySignature: response.razorpay_signature || 'TEST_VERIFIED',
              });
              if (verifyRes.success) {
                setEnrollSuccess(`Success! "${orderRes.planName}" is now active on your corporate account.`);
                await fetchSubscriptions();
              }
            } catch (vErr) {
              alert('Payment verification failed: ' + (vErr.error || vErr.message));
            }
          },
          prefill: {
            name: orderRes.customerName || user?.name || 'Customer',
            email: orderRes.customerEmail || user?.email || '',
            contact: orderRes.customerPhone || '9876543210',
          },
          theme: {
            color: '#D97706',
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert('Payment was not completed: ' + (resp.error?.description || 'Cancelled'));
        });
        rzp.open();
      } else {
        // Direct test mode simulation fallback
        const verifyRes = await api.post('/payments/subscription/verify', {
          planId: orderRes.planId,
          razorpayOrderId: orderRes.orderId,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          razorpaySignature: 'TEST_VERIFIED',
        });
        if (verifyRes.success) {
          setEnrollSuccess(`Success! "${orderRes.planName}" is now active on your corporate account.`);
          await fetchSubscriptions();
        }
      }
    } catch (err) {
      alert('Subscription Checkout error: ' + (err.error || err.message));
    } finally {
      setEnrollingPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              Hybrid Recurring Billing & AMC
            </span>
            <span className="text-xs text-slate-400">• Gada Electronics Certified Protection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Product Warranties & Subscriptions</h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manage your company's active device warranties, annual maintenance contracts (AMC), and SLA-backed support tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 px-4 border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block">Active Contracts</span>
            <span className="text-xl font-black text-white">{subscriptions.length}</span>
          </div>
          <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-3 px-4 border border-emerald-500/30 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">SLA Protection</span>
            <span className="text-xl font-black text-emerald-300">24h Response</span>
          </div>
        </div>
      </div>

      {enrollSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{enrollSuccess}</span>
          </div>
          <a href="/customer/cart" className="text-emerald-700 underline font-bold hover:text-emerald-900">
            View Cart & Generate Quote →
          </a>
        </div>
      )}

      {/* SECTION 1: Active Subscriptions */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Active Subscriptions & Contracts</h2>
            <p className="text-xs text-slate-500">Commercial quotation lines with recurring billing intervals</p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {subscriptions.length} Active
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading active subscriptions...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 m-5 rounded-2xl">
            <p>{error}</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-slate-900">No active device subscriptions yet.</p>
            <p className="max-w-md mx-auto text-slate-500">
              Browse available product-specific warranty plans and maintenance contracts below to extend device lifespan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-extrabold text-slate-900 text-base">{sub.plan_name || 'Premium Device Support'}</h3>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full uppercase">
                      {sub.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Product Covered: <strong className="text-slate-900">{sub.product_name || 'Enterprise Electronics'}</strong>
                    {' '}• Billing Interval: <strong className="text-indigo-600 uppercase">{sub.billing_interval || 'ANNUAL'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Next Scheduled Billing: <strong className="text-slate-800">{sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('en-IN') : '01 Sep 2027'}</strong>
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-xl font-black text-slate-900">
                    ₹{parseFloat(sub.recurring_amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">/ {(sub.billing_interval || 'year').toLowerCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Available Warranties & AMC by Product Category */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Available Product Warranties & Maintenance Contracts (AMC)
            </h2>
            <p className="text-xs text-slate-500">
              Select product-specific extended warranty and servicing plans tailored for your purchased devices.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {AVAILABLE_WARRANTY_PLANS.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg hover:border-indigo-200 transition-all group"
              >
                <div className="space-y-4">
                  {/* Top tags & icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {plan.category}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                          {plan.name}
                        </h3>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${plan.badgeColor} shrink-0`}>
                      {plan.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="text-[11px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    Applicable Models: <span className="font-medium text-slate-700">{plan.productSku}</span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Plan Inclusions:</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        / {plan.billingInterval.toLowerCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold block">Zero Deductible Claims</span>
                  </div>

                  <button
                    onClick={() => handleBuyNow(plan)}
                    disabled={enrollingPlan === plan.id}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {enrollingPlan === plan.id ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Buy Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerSubscriptions;
