import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { FileText, ArrowRight, ShieldCheck, Clock, CheckCircle2, ShoppingBag } from 'lucide-react';

export const CustomerQuotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCustomerQuotations();
  }, []);

  const loadCustomerQuotations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/quotations');
      if (res.success) {
        setQuotations(res.quotations || []);
      } else {
        setError(res.error || 'Failed to load quotations.');
      }
    } catch (e) {
      setError(e.message || 'Error loading quotations.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'REQUESTED') return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold rounded-full">REQUESTED</span>;
    if (s === 'SENT' || s === 'APPROVED') return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full">READY FOR REVIEW</span>;
    if (s === 'UNDER_NEGOTIATION') return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-full">UNDER NEGOTIATION</span>;
    if (s === 'FULFILLMENT' || s === 'CONFIRMED' || s === 'PAID') return <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold rounded-full">CONFIRMED ORDER</span>;
    return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-full">{s}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-400/20 border border-blue-300/40 text-blue-100 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              B2B Commercial Quotes
            </span>
            <span className="text-xs text-blue-100">• Gada Electronics Customer Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">My Commercial Quotations</h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            View active quotations, submit counter-offer discount requests, write line-level item comments, and confirm orders directly.
          </p>
        </div>

        <Link
          to="/customer/products"
          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 self-start md:self-center"
        >
          <ShoppingBag className="w-4 h-4 text-blue-700" />
          <span>New Quotation Request</span>
        </Link>
      </div>

      {/* Quotations List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Quotation Records ({quotations.length})</h2>
          <span className="text-xs text-slate-500">Assigned Representative: Bhagha</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading commercial quotations...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
            <p>{error}</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <p className="font-bold text-sm text-slate-800">No quotations found for your account.</p>
            <p>Add products to your cart and click "Generate Quotation" to create one.</p>
            <Link to="/customer/products" className="inline-block px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotations.map((q) => (
              <div key={q.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-blue-600 text-base">{q.quotation_number}</span>
                    {getStatusBadge(q.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Sales Rep: <strong className="text-slate-800">{q.salesperson_name || 'Bhagha'}</strong> • Date: {new Date(q.created_at).toLocaleDateString()} • Items: <strong className="text-slate-800">{q.item_count || 1}</strong>
                  </p>
                  {q.valid_until && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Valid Until: {new Date(q.valid_until).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">
                      ₹{parseFloat(q.total_amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Total incl. GST Tax</span>
                  </div>

                  <Link
                    to={`/customer/quotations/${q.id}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    <span>View & Negotiate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerQuotations;
