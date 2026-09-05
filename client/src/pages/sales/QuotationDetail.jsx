import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import {
  Plus,
  Trash2,
  Send,
  ShieldAlert,
  CheckCircle,
  Truck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  History,
  Building,
  User,
  Calendar,
} from 'lucide-react';

export const QuotationDetail = () => {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Item form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscountPct, setItemDiscountPct] = useState(0);
  const [itemInterval, setItemInterval] = useState('ONE_TIME');

  // Upsell Dismissal & Order Discount states
  const [dismissedRecs, setDismissedRecs] = useState(new Set());
  const [showOrderDiscountModal, setShowOrderDiscountModal] = useState(false);
  const [orderDiscountPct, setOrderDiscountPct] = useState(5);

  // Submitting / Action state
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadQuotationDetails();
    loadCatalog();
  }, [id]);

  const loadQuotationDetails = async () => {
    try {
      setLoading(true);
      const [quoteRes, recRes] = await Promise.all([
        api.get(`/quotations/${id}`),
        api.get(`/recommendations/${id}`),
      ]);

      if (quoteRes.success) setQuotation(quoteRes.quotation);
      if (recRes.success) setRecommendations(recRes.recommendations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await api.get('/products');
      if (res.success) setProducts(res.products || []);
    } catch (e) {}
  };

  // Add line item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;

    try {
      setSubmitting(true);
      await api.post(`/quotations/${id}/items`, {
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        quantity: itemQuantity,
        discountPct: itemDiscountPct,
        billingInterval: itemInterval,
      });
      setSelectedProductId('');
      setSelectedVariantId('');
      setItemQuantity(1);
      setItemDiscountPct(0);
      await loadQuotationDetails();
    } catch (err) {
      alert(err.error || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  // Update line item
  const handleUpdateItem = async (itemId, field, value) => {
    try {
      await api.put(`/quotations/${id}/items/${itemId}`, {
        [field]: value,
      });
      await loadQuotationDetails();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete line item
  const handleDeleteItem = async (itemId) => {
    if (!confirm('Remove this product line?')) return;
    try {
      await api.delete(`/quotations/${id}/items/${itemId}`);
      await loadQuotationDetails();
    } catch (err) {
      alert(err.error || 'Failed to delete');
    }
  };

  // Apply order-level discount across all items
  const handleApplyOrderDiscount = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post(`/quotations/${id}/order-discount`, {
        discountPct: orderDiscountPct,
      });
      setShowOrderDiscountModal(false);
      setActionMessage(res.message);
      setTimeout(() => setActionMessage(null), 4000);
      await loadQuotationDetails();
    } catch (err) {
      alert(err.error || 'Failed to apply order discount');
    } finally {
      setSubmitting(false);
    }
  };

  // Add upsell recommendation directly
  const handleAddUpsell = async (rec) => {
    try {
      setSubmitting(true);
      await api.post(`/quotations/${id}/items`, {
        productId: rec.recommended_product_id,
        quantity: 1,
        discountPct: 0,
        billingInterval: rec.product_type === 'SUBSCRIPTION' ? 'YEARLY' : 'ONE_TIME',
      });
      setActionMessage(`Added recommended ${rec.product_name} (+₹${rec.margin_delta} margin)!`);
      setTimeout(() => setActionMessage(null), 4000);
      await loadQuotationDetails();
    } catch (e) {
      alert(e.error || 'Failed to add recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  // Dismiss recommendation
  const handleDismissUpsell = (recId) => {
    setDismissedRecs((prev) => new Set([...prev, recId]));
  };

  // Submit for approval
  const handleSubmitApproval = async () => {
    try {
      setSubmitting(true);
      const res = await api.post(`/quotations/${id}/submit`);
      setActionMessage(res.message);
      await loadQuotationDetails();
    } catch (err) {
      alert(err.error || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Send to Customer
  const handleSendToCustomer = async () => {
    try {
      setSubmitting(true);
      const res = await api.post(`/quotations/${id}/send`);
      setActionMessage(res.message);
      await loadQuotationDetails();
    } catch (err) {
      alert(err.error || 'Failed to send to customer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quotation) {
    return (
      <div className="p-12 flex justify-center min-h-[60vh] items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedProductObj = products.find((p) => p.id === parseInt(selectedProductId, 10));
  const isPendingApproval = quotation.status === 'PENDING_APPROVAL';
  const isApproved = quotation.status === 'APPROVED';
  const canEdit = quotation.status === 'DRAFT' || quotation.status === 'RETURNED_FOR_REVISION';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast message */}
      {actionMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-100 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                Quotation {quotation.quotation_number}
              </span>
              <Badge status={quotation.status} />
              <Badge status={quotation.approval_status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900 font-bold">{quotation.customer_name}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                  {quotation.customer_tier} TIER
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>Rep: {quotation.salesperson_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Valid until: {new Date(quotation.valid_until).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

            {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Order Discount Button */}
            {canEdit && (
              <button
                onClick={() => setShowOrderDiscountModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                <span>Apply Order Discount</span>
              </button>
            )}

            {/* Submit for Approval */}
            {quotation.status === 'DRAFT' && (
              <button
                onClick={handleSubmitApproval}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Submit Quotation</span>
              </button>
            )}

            {/* Send to Customer */}
            {(quotation.status === 'APPROVED' || (quotation.status === 'DRAFT' && quotation.approval_status === 'NOT_REQUIRED')) && (
              <button
                onClick={handleSendToCustomer}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Send to Customer</span>
              </button>
            )}

            {/* Fulfill Order */}
            {(quotation.status === 'APPROVED' || quotation.status === 'FULFILLMENT') && (
              <Link
                to={`/finance/fulfillment?quoteId=${quotation.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all"
              >
                <Truck className="w-4 h-4" />
                <span>Fulfill & Split Warehouse</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Discount Governance & Multi-Step Approval Chain Visualizer */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">
                Automated Governance & Approval Chain
              </h3>
              <p className="text-[11px] text-slate-500">
                Routing determined by blended discount risk score across all quotation items.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Blended Risk:</span>
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                parseFloat(quotation.risk_score) > 10
                  ? 'bg-rose-100 text-rose-800'
                  : parseFloat(quotation.risk_score) > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {parseFloat(quotation.risk_score).toFixed(1)}% Risk Score
            </span>
          </div>
        </div>

        {/* Step-by-Step Approval Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          {/* Step 1: Sales Manager */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step 1</span>
              <p className="text-xs font-extrabold text-slate-900">Sales Manager Review</p>
              <p className="text-[10px] text-slate-500">Required for deals with &gt; 5% risk</p>
            </div>
            <div>
              <Badge
                status={
                  quotation.approval_status === 'APPROVED' || quotation.approval_status === 'MANAGER_APPROVED'
                    ? 'APPROVED'
                    : quotation.approval_status === 'PENDING_MANAGER'
                    ? 'PENDING'
                    : quotation.approval_status === 'REJECTED'
                    ? 'REJECTED'
                    : 'NOT_REQUIRED'
                }
              />
            </div>
          </div>

          {/* Step 2: Finance Operations */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step 2</span>
              <p className="text-xs font-extrabold text-slate-900">Finance & Operations Sign-off</p>
              <p className="text-[10px] text-slate-500">Only triggered when blended risk &gt; 10%</p>
            </div>
            <div>
              <Badge
                status={
                  quotation.approval_status === 'APPROVED'
                    ? 'APPROVED'
                    : quotation.approval_status === 'PENDING_FINANCE'
                    ? 'PENDING'
                    : parseFloat(quotation.risk_score) > 10
                    ? 'PENDING'
                    : 'NOT_REQUIRED'
                }
              />
            </div>
          </div>
        </div>

        {parseFloat(quotation.risk_score) > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-semibold">
            Policy Exception: {quotation.risk_reason}
          </div>
        )}
      </div>

      {/* Main Grid: Left Items / Right Upsell & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Line Items & Add Product Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotation Line Items ({quotation.items.length})</h3>
                <p className="text-xs text-slate-400">One-time hardware, installation services, and warranties</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-2 text-center">Qty</th>
                    <th className="py-3 px-3">Discount %</th>
                    <th className="py-3 px-3 text-center">GST %</th>
                    <th className="py-3 px-3 text-right">Line Total</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {quotation.items.map((item) => {
                    const isOverage = parseFloat(item.discount_overage_pct) > 0;
                    return (
                      <tr key={item.id} className={isOverage ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=100'}
                              alt={item.product_name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1">{item.product_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Ceiling: {parseFloat(item.category_ceiling_pct)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.item_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          ₹{parseFloat(item.unit_price).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center text-xs font-bold text-slate-800"
                          />
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_pct}
                              onChange={(e) => handleUpdateItem(item.id, 'discount_pct', e.target.value)}
                              className={`w-14 p-1 rounded-lg text-center text-xs font-bold border ${
                                isOverage
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 focus:ring-rose-500'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                          {isOverage && (
                            <span className="text-[9px] font-bold text-rose-600 block mt-0.5">
                              +{parseFloat(item.discount_overage_pct).toFixed(1)}% over ceiling!
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                            {item.tax_pct ? `${parseFloat(item.tax_pct)}%` : '18%'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                          ₹{parseFloat(item.line_total).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-2 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                            title="Remove Line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Product Line Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Product to Deal
            </h3>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Catalog Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedVariantId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Product ({products.length} available) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{parseFloat(p.selling_price).toLocaleString()} ({p.category_name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductObj?.variants && selectedProductObj.variants.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Variant / Config</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full bg-blue-50/60 border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Base Configuration (+₹0)</option>
                    {selectedProductObj.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.attribute_type}: {v.attribute_value} (+₹{parseFloat(v.price_delta || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Billing Interval</label>
                <select
                  value={itemInterval}
                  onChange={(e) => setItemInterval(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ONE_TIME">One-Time Billing</option>
                  <option value="MONTHLY">Recurring: Monthly</option>
                  <option value="QUARTERLY">Recurring: Quarterly</option>
                  <option value="YEARLY">Recurring: Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={itemDiscountPct}
                  onChange={(e) => setItemDiscountPct(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedProductId || submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
                >
                  Add Line Item
                </button>
              </div>
            </form>
          </div>

          {/* Audit Trail Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Immutable Deal Audit Trail ({quotation.auditLogs?.length || 0})
            </h3>

            <div className="space-y-3 relative pl-4 border-l-2 border-slate-200">
              {(quotation.auditLogs || []).map((log, idx) => (
                <div key={idx} className="relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[21px] top-1 ring-4 ring-white"></span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-slate-400 text-[10px] ml-2">
                      by {log.user_name || log.user_role} • {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.reason && <p className="text-[11px] text-slate-600 mt-0.5">{log.reason}</p>}
                    {log.newValue && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{log.newValue}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Financials & Smart Upsell Panel */}
        <div className="space-y-6">
          {/* Financial Summary & Live Margin Gauge */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Deal Commercials & Margins
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal Gross</span>
                <span className="font-semibold text-slate-800">
                  ₹{parseFloat(quotation.subtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Total Discount</span>
                <span className="font-semibold">-₹{parseFloat(quotation.total_discount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Central GST (CGST - 50%)</span>
                <span className="font-semibold text-slate-800">
                  ₹{(parseFloat(quotation.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State GST (SGST - 50%)</span>
                <span className="font-semibold text-slate-800">
                  ₹{(parseFloat(quotation.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-base font-extrabold text-slate-900">
                <span>Total Deal Value</span>
                <span className="text-blue-700">₹{parseFloat(quotation.total_amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Live Margin Indicator */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600">Expected Gross Margin</span>
                <span
                  className={`text-sm font-extrabold ${
                    parseFloat(quotation.margin_pct) >= 15
                      ? 'text-emerald-600'
                      : parseFloat(quotation.margin_pct) >= 10
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  ₹{parseFloat(quotation.margin_amount).toLocaleString()} ({parseFloat(quotation.margin_pct).toFixed(1)}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    parseFloat(quotation.margin_pct) >= 15
                      ? 'bg-emerald-500'
                      : parseFloat(quotation.margin_pct) >= 10
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(quotation.margin_pct) * 2.5))}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Cost of Goods: ₹{parseFloat(quotation.total_cost).toLocaleString()}</p>
            </div>
          </div>

          {/* Smart Upsell & Cross-Sell Recommendations */}
          <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-2xl p-5 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-blue-900">
                Smart Recommendations ({recommendations.filter(r => !dismissedRecs.has(r.id)).length})
              </h3>
            </div>
            <p className="text-[11px] text-slate-600 mb-4 leading-tight">
              Database-driven attachment rules derived from high-margin co-purchase history.
            </p>

            <div className="space-y-3">
              {recommendations.filter(r => !dismissedRecs.has(r.id)).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No additional attachments available.</p>
              ) : (
                recommendations.filter(r => !dismissedRecs.has(r.id)).map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{rec.product_name}</span>
                          {rec.promo_tag && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                              {rec.promo_tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{rec.reason}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900">
                          ₹{parseFloat(rec.selling_price).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 ml-1.5">
                          +₹{parseFloat(rec.margin_delta).toLocaleString()} margin
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDismissUpsell(rec.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddUpsell(rec)}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors"
                        >
                          + Add to Quote
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order-Level Discount Modal */}
      {showOrderDiscountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Apply Order-Level Discount</h3>
            <p className="text-xs text-slate-500 mt-1">
              Applies a uniform discount percentage across all line items in this quotation, automatically re-evaluating risk thresholds.
            </p>

            <form onSubmit={handleApplyOrderDiscount} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uniform Discount Percentage (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={orderDiscountPct}
                    onChange={(e) => setOrderDiscountPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="font-bold text-slate-500">%</span>
                </div>
                {orderDiscountPct > 10 && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    Notice: Order discounts &gt; 10% will route this deal for 2-step Finance sign-off.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrderDiscountModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Applying...' : 'Apply to All Lines'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationDetail;
