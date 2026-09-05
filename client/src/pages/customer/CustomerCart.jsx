import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { 
  ShoppingCart, Trash2, Plus, Minus, FileText, ArrowRight, ArrowLeft,
  CheckCircle2, ShieldCheck, AlertCircle, Sparkles, X
} from 'lucide-react';

export const CustomerCart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/cart');
      if (res.success) {
        setCart(res);
      } else {
        setError(res.error || 'Failed to fetch cart.');
      }
    } catch (err) {
      setError(err.message || 'Error loading cart.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    try {
      setUpdating(true);
      const res = await api.put(`/customer/cart/${itemId}`, { quantity: newQuantity });
      if (res.success) {
        await fetchCart();
      }
    } catch (err) {
      alert('Error updating quantity: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      setUpdating(true);
      const res = await api.delete(`/customer/cart/${itemId}`);
      if (res.success) {
        await fetchCart();
      }
    } catch (err) {
      alert('Error removing item: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateQuotationSubmit = async () => {
    try {
      setSubmittingQuote(true);
      const res = await api.post('/customer/cart/generate-quotation');
      if (res.success) {
        setShowConfirmModal(false);
        navigate(`/customer/quotations/${res.quotationId}`);
      } else {
        alert(res.error || 'Failed to generate quotation.');
      }
    } catch (err) {
      alert('Error generating quotation: ' + err.message);
    } finally {
      setSubmittingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading shopping cart...</span>
      </div>
    );
  }

  const items = cart?.items || [];
  const summary = cart?.summary || { subtotal: 0, taxAmount: 0, total: 0, itemCount: 0 };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-400/20 border border-blue-300/40 text-blue-100 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              B2B Quotation Builder
            </span>
            <span className="text-xs text-blue-100">• Gada Electronics Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">My Shopping Cart</h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            Items added here will be compiled into an official Gada Electronics quotation request. Sales Representative <strong className="text-white">Bhagha</strong> will review and apply volume discount governance.
          </p>
        </div>

        <Link
          to="/customer/products"
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 self-start md:self-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Cart Content Grid */}
      {items.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-500 text-xs space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Your cart is currently empty</h3>
            <p className="mt-1">Browse our product catalog to select electronics and generate a quotation request.</p>
          </div>
          <Link
            to="/customer/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <span>Explore Product Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Cart Items Table */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Cart Items ({summary.itemCount})</h3>
                <span className="text-xs text-slate-500">Gold Tier Discounts Calculated</span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200'}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <div>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                        <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-500">{item.category}</p>
                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                          ₹{parseFloat(item.unitPrice).toLocaleString('en-IN')} / unit
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={updating}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-xs text-slate-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updating}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">
                          ₹{parseFloat(item.lineTotal).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400">(incl. tax)</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={updating}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note on B2B Quotation Workflow */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">DealFlow360 B2B Sales Operations Notice:</p>
                <p className="text-blue-800 mt-0.5 leading-relaxed">
                  Unlike consumer e-commerce, clicking "Generate Quotation" submits your requested item list for deal approval. You can negotiate price discounts or request quantity changes after the quote is created.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Quotation Summary Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
              <h3 className="font-black text-base text-slate-900">Quotation Summary</h3>

              <div className="space-y-3 text-xs border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal ({summary.itemCount} items)</span>
                  <span className="font-semibold text-slate-900">₹{summary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>CGST (50% of GST)</span>
                  <span className="font-semibold text-slate-900">₹{(summary.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>SGST (50% of GST)</span>
                  <span className="font-semibold text-slate-900">₹{(summary.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] border-t border-slate-100 pt-2">
                  <span>Total GST</span>
                  <span className="font-semibold text-slate-700">₹{summary.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between text-slate-900">
                <span className="text-sm font-bold">Estimated Total</span>
                <span className="text-xl font-black text-blue-600">
                  ₹{summary.total.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Quotation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM QUOTATION REQUEST MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Submit Quotation Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify your order request details before creating the official quotation.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">Krish (Metro Office Systems)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Sales Rep:</span>
                <span className="font-bold text-blue-600">Bhagha</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Line Items:</span>
                <span className="font-bold text-slate-900">{summary.itemCount} items</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Quotation Total Amount:</span>
                <span className="text-emerald-700">₹{summary.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateQuotationSubmit}
                disabled={submittingQuote}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingQuote ? 'Creating Quote...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCart;
