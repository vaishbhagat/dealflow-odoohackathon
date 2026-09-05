import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Package, Truck, CheckCircle2, Clock, MapPin, ArrowRight, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  DELIVERED: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    barColor: 'bg-emerald-500',
    leftBorder: 'border-l-emerald-500',
    icon: CheckCircle2,
  },
  DISPATCHED: {
    label: 'Dispatched',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    barColor: 'bg-blue-500',
    leftBorder: 'border-l-blue-500',
    icon: Truck,
  },
  ALLOCATED: {
    label: 'Processing',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    barColor: 'bg-amber-500',
    leftBorder: 'border-l-amber-500',
    icon: Package,
  },
  PENDING: {
    label: 'Pending',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    barColor: 'bg-slate-400',
    leftBorder: 'border-l-slate-400',
    icon: Clock,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    barColor: 'bg-rose-500',
    leftBorder: 'border-l-rose-500',
    icon: XCircle,
  },
};

const getStepProgress = (status) => {
  const s = (status || '').toUpperCase();
  return [
    { label: 'Order Confirmed', done: true },
    { label: 'Packed & Ready', done: ['ALLOCATED', 'DISPATCHED', 'DELIVERED'].includes(s) },
    { label: 'Shipped', done: ['DISPATCHED', 'DELIVERED'].includes(s) },
    { label: 'Delivered', done: s === 'DELIVERED' },
  ];
};

export const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/orders');
      if (res.success) setOrders(res.orders || []);
      else setError(res.error || 'Failed to fetch orders.');
    } catch (err) {
      setError(err.message || 'Error fetching orders.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-white/10 border border-white/20 text-blue-100 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              Live Order Tracking
            </span>
            <span className="text-xs text-blue-200">• Gada Electronics Logistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">My Confirmed Orders</h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Track real-time fulfillment, dispatch status, and delivery timelines.
          </p>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Orders ({orders.length})</h2>
          <span className="text-xs text-slate-500">Assigned Hub: West Depot</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading confirmed orders...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl m-4">
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-800">No active orders found.</p>
            <p>Confirmed quotations automatically create orders here.</p>
            <Link
              to="/customer/quotations"
              className="inline-block px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all"
            >
              View Quotations
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((ord) => {
              const statusKey = (ord.status || 'PENDING').toUpperCase();
              const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
              const StatusIcon = cfg.icon;
              const steps = getStepProgress(ord.status);

              return (
                <div
                  key={ord.id}
                  className={`p-5 sm:p-6 space-y-4 border-l-4 ${cfg.leftBorder} hover:bg-slate-50/60 transition-colors`}
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-black text-slate-900 text-base">
                          {ord.fulfillment_number}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Quotation:{' '}
                        <strong className="text-blue-600">{ord.quotation_number}</strong>
                        {' '} • Amount:{' '}
                        <strong className="text-slate-900">₹{parseFloat(ord.total_amount || 0).toLocaleString('en-IN')}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[11px] text-slate-500 block">Expected Delivery</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {ord.expected_delivery_date
                          ? new Date(ord.expected_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Within 5 business days'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Stepper */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Fulfillment Progress
                    </p>
                    <div className="flex items-center gap-0">
                      {steps.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-white font-bold text-xs transition-all ${
                              step.done
                                ? `${cfg.barColor} border-transparent shadow-sm`
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}>
                              {step.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-slate-400 font-bold text-xs">{idx + 1}</span>}
                            </div>
                            <span className={`text-[9px] font-bold text-center leading-tight px-1 ${step.done ? 'text-slate-700' : 'text-slate-400'}`}>
                              {step.label}
                            </span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mb-5 transition-all ${step.done ? cfg.barColor : 'bg-slate-200'}`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
