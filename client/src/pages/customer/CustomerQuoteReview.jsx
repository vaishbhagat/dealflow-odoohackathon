import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { 
  FileText, MessageSquare, CreditCard, CheckCircle2, Clock, Send,
  User, Check, ArrowLeft, History, Layers, ShieldCheck, HelpCircle, X, ChevronRight
} from 'lucide-react';

export const CustomerQuoteReview = () => {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quote'); // 'quote', 'history', 'comments'

  // Counter Offer Modal state
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [requestedDiscount, setRequestedDiscount] = useState(15);
  const [negotiationReason, setNegotiationReason] = useState('We are placing a bulk order and would like a better price.');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  // Line Comment Modal
  const [selectedItemForComment, setSelectedItemForComment] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Confirmation & Payment state
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    loadQuotationDetail();
  }, [id]);

  const loadQuotationDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customer/quotations/${id}`);
      if (res.success) {
        setQuotation(res.quotation);
        setItems(res.items || []);
        setComments(res.comments || []);
        setVersions(res.versions || []);
      }
    } catch (e) {
      console.error('Error loading quotation detail:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLineCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const res = await api.post(`/customer/quotations/${id}/comments`, {
        quotationItemId: selectedItemForComment?.id || null,
        commentText: commentText.trim(),
      });
      if (res.success) {
        setToastMessage('Comment submitted to Sales Rep Bhagha.');
        setSelectedItemForComment(null);
        setCommentText('');
        await loadQuotationDetail();
      }
    } catch (err) {
      alert('Failed to submit comment: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCounterOfferSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingCounter(true);
      const res = await api.post(`/customer/quotations/${id}/counter-offer`, {
        requestedDiscountPct: requestedDiscount,
        reason: negotiationReason,
      });
      if (res.success) {
        setToastMessage('Counter offer submitted successfully! Status updated to Under Negotiation.');
        setShowNegotiateModal(false);
        await loadQuotationDetail();
      }
    } catch (err) {
      alert('Failed to submit counter offer: ' + err.message);
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleConfirmQuotation = async () => {
    try {
      setConfirming(true);
      const res = await api.post(`/customer/quotations/${id}/confirm`);
      if (res.success) {
        setToastMessage('Quotation confirmed! Order & Invoice generated.');
        await loadQuotationDetail();
      }
    } catch (err) {
      alert('Failed to confirm quotation: ' + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handlePayNow = async () => {
    try {
      setPaying(true);

      // 1. Find or create invoice for this quotation
      const invRes = await api.get('/customer/invoices');
      let targetInv = invRes.invoices?.find(
        (i) => parseInt(i.quotation_id, 10) === parseInt(id, 10)
      );

      let invId = targetInv?.id;
      if (!invId) {
        // Confirm quotation first to generate invoice
        const confRes = await api.post(`/customer/quotations/${id}/confirm`);
        if (!confRes.success) {
          setToastMessage('Could not generate invoice. Please try again.');
          return;
        }
        invId = confRes.invoiceId;
      }

      if (!invId) {
        setToastMessage('Invoice not found. Please contact support.');
        return;
      }

      // 2. Create Razorpay Order on backend
      const orderRes = await api.post('/payments/create-order', { invoiceId: invId });
      if (!orderRes.success && !orderRes.orderId) {
        setToastMessage('Could not initialize payment. Please try again.');
        return;
      }

      // 3. Open Razorpay Checkout
      const razorpayKey = orderRes.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (typeof window.Razorpay === 'function') {
        const options = {
          key: razorpayKey,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'Gada Electronics',
          description: `Payment for Quotation ${quotation.quotation_number}`,
          image: '/favicon.svg',
          order_id: orderRes.orderId,
          handler: async function (response) {
            try {
              // 4. Verify payment on backend
              const verifyRes = await api.post('/payments/verify', {
                invoiceId: invId,
                razorpayOrderId: response.razorpay_order_id || orderRes.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              if (verifyRes.success) {
                setToastMessage(
                  `✅ Payment Successful! ID: ${response.razorpay_payment_id} • Amount: ₹${parseFloat(quotation.total_amount).toLocaleString('en-IN')}`
                );
                await loadQuotationDetail();
              } else {
                setToastMessage('Payment verification failed. Please contact support.');
              }
            } catch (vErr) {
              setToastMessage('Payment verification error: ' + (vErr.error || vErr.message));
            } finally {
              setPaying(false);
            }
          },
          prefill: {
            name: orderRes.customerName || quotation.contact_person || 'Customer',
            email: orderRes.customerEmail || quotation.customer_email || '',
            contact: orderRes.customerPhone || '9876543210',
          },
          theme: {
            color: '#2563EB',
          },
          modal: {
            ondismiss: function () {
              setPaying(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setToastMessage('Payment failed: ' + (resp.error?.description || 'Cancelled or declined.'));
          setPaying(false);
        });
        rzp.open();
        // Don't set paying=false here — handled in handler/ondismiss
        return;
      } else {
        // Razorpay script not loaded fallback
        setToastMessage('Razorpay is not available. Please refresh the page and try again.');
        setPaying(false);
      }
    } catch (err) {
      setToastMessage('Payment error: ' + (err.error || err.message || 'Unknown error.'));
      setPaying(false);
    }
  };

  if (loading || !quotation) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-3 min-h-[400px]">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading commercial proposal...</span>
      </div>
    );
  }

  const isConfirmed = ['FULFILLMENT', 'INVOICED', 'PAID', 'COMPLETED'].includes(quotation.status);
  const isPaid = quotation.status === 'PAID';

  // Timeline Steps Configuration
  const timelineSteps = [
    { title: 'Quotation Requested', done: true },
    { title: 'Quotation Created', done: true },
    { title: 'Sent to Customer', done: true },
    { title: 'Customer Viewed', done: true },
    { title: 'Counter Offer Submitted', done: quotation.status === 'UNDER_NEGOTIATION' || isConfirmed },
    { title: 'Approval Requested', done: quotation.approval_status === 'APPROVED' || isConfirmed },
    { title: 'Revised Quote Approved', done: quotation.approval_status === 'APPROVED' || isConfirmed },
    { title: 'Customer Confirmation', done: isConfirmed },
    { title: 'Payment', done: isPaid },
    { title: 'Fulfillment', done: isConfirmed },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link to="/customer/quotations" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Quotations</span>
        </Link>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('quote')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'quote' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Commercial Proposal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Quote History ({versions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'comments' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments ({comments.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: DEAL TIMELINE STEPPER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deal Progress Timeline</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-2 min-w-[700px]">
            {timelineSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[11px] font-semibold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.title}
                  </span>
                </div>
                {idx < timelineSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 min-w-[20px] ${step.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: OFFICIAL COMMERCIAL PROPOSAL */}
      {activeTab === 'quote' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900">Gada Electronics</h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold rounded-md uppercase">
                  B2B Commercial Proposal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quotation ID: <strong className="text-blue-600 font-mono">{quotation.quotation_number}</strong> • Status: <strong className="text-slate-900">{quotation.status}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Date: {new Date(quotation.created_at).toLocaleDateString()}</span>
              {quotation.valid_until && (
                <span className="text-xs text-amber-700 font-semibold block mt-0.5">
                  Valid Until: {new Date(quotation.valid_until).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Customer & Rep Personnel Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Details</span>
              <p className="font-bold text-slate-900 text-sm">{quotation.contact_person || 'Krish'}</p>
              <p className="text-slate-700">{quotation.company_name || 'Metro Office Systems'}</p>
              <p className="text-slate-500 mt-0.5">{quotation.customer_email}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sales Representative</span>
              <p className="font-bold text-blue-700 text-sm">{quotation.salesperson_name || 'Bhagha'}</p>
              <p className="text-slate-700">Gada Electronics Sales Rep</p>
              <p className="text-slate-500 mt-0.5">{quotation.salesperson_email || 'rep@gadaelectronics.com'}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sales Manager</span>
              <p className="font-bold text-amber-700 text-sm">{quotation.manager_name || 'Natu Kaka'}</p>
              <p className="text-slate-700">Discount Governance Approver</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Products & Commercial Terms</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-3 text-center">Qty</th>
                    <th className="py-3.5 px-3 text-right">Unit Price</th>
                    <th className="py-3.5 px-3 text-center">Discount</th>
                    <th className="py-3.5 px-3 text-center">GST %</th>
                    <th className="py-3.5 px-3 text-right">CGST</th>
                    <th className="py-3.5 px-3 text-right">SGST</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {items.map((item) => {
                    const itemTax = parseFloat(item.tax_amount || 0);
                    const cgst = item.cgst_amount ? parseFloat(item.cgst_amount) : itemTax / 2;
                    const sgst = item.sgst_amount ? parseFloat(item.sgst_amount) : itemTax / 2;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=100'}
                              alt={item.product_name}
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-100"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{item.product_name}</span>
                              <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-3.5 px-3 text-right">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-3 text-center font-semibold text-blue-600">{parseFloat(item.discount_pct || 0)}%</td>
                        <td className="py-3.5 px-3 text-center font-semibold text-amber-700">{parseFloat(item.tax_pct || 18)}%</td>
                        <td className="py-3.5 px-3 text-right text-slate-600 font-medium">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-3 text-right text-slate-600 font-medium">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">₹{parseFloat(item.line_total).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForComment(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Ask / Comment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Breakdown Summary */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-4 border-t border-slate-100 gap-6">
            <div className="text-xs text-slate-500 max-w-sm space-y-1">
              <p className="font-bold text-slate-800">Commercial & GST Terms:</p>
              <p>All items comply with Indian GST rules with 50% CGST and 50% SGST allocation. Gada Electronics standard warranty applies.</p>
            </div>

            <div className="w-full sm:w-80 space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">₹{parseFloat(quotation.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Applied Discount</span>
                <span className="font-semibold">-₹{parseFloat(quotation.total_discount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Central GST (CGST - 50%)</span>
                <span className="font-semibold text-slate-900">
                  ₹{(parseFloat(quotation.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State GST (SGST - 50%)</span>
                <span className="font-semibold text-slate-900">
                  ₹{(parseFloat(quotation.tax_amount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                <span>Grand Total (Incl. GST)</span>
                <span className="text-blue-600">₹{parseFloat(quotation.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setShowNegotiateModal(true)}
              disabled={isConfirmed}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Submit Counter Offer</span>
            </button>

            <div className="flex items-center gap-3">
              {!isConfirmed && (
                <button
                  type="button"
                  onClick={handleConfirmQuotation}
                  disabled={confirming}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {confirming ? 'Confirming...' : 'Confirm Quotation'}
                </button>
              )}

              {!isPaid && (
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={paying}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{paying ? 'Processing Razorpay...' : 'Pay Now (Razorpay Test Mode)'}</span>
                </button>
              )}

              {isPaid && (
                <span className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Invoice PAID</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTE VERSION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-black text-base text-slate-900">Quotation Version History</h3>
            <span className="text-xs text-slate-500">Total Versions: {versions.length}</span>
          </div>

          <div className="space-y-4">
            {versions.map((ver) => (
              <div key={ver.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">
                      Version {ver.version_number}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{ver.status}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ver.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1">{ver.change_summary}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-500">
                  <span>Modified by: <strong className="text-slate-900">{ver.changed_by}</strong></span>
                  <span className="font-mono text-slate-900 font-bold">Total: ₹{parseFloat(ver.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LINE COMMENTS & NEGOTIATION TIMELINE */}
      {activeTab === 'comments' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <h3 className="font-black text-base text-slate-900">Negotiation Timeline & Comments</h3>

          {comments.length === 0 ? (
            <p className="text-xs text-slate-500">No comments added yet. Use "Ask / Comment" on any product line to start a discussion.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600">{c.author_name || c.author_role}</span>
                    <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-800">{c.comment_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COUNTER OFFER MODAL */}
      {showNegotiateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowNegotiateModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900">Submit Counter Offer</h3>
            <p className="text-xs text-slate-500">
              Propose a revised discount percentage for Sales Rep Bhagha and Manager Natu Kaka to review.
            </p>

            <form onSubmit={handleCounterOfferSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requested Discount (%)</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  required
                  value={requestedDiscount}
                  onChange={(e) => setRequestedDiscount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Rationale</label>
                <textarea
                  rows="3"
                  required
                  value={negotiationReason}
                  onChange={(e) => setNegotiationReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNegotiateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCounter}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {submittingCounter ? 'Submitting...' : 'Submit Counter Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINE COMMENT MODAL */}
      {selectedItemForComment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setSelectedItemForComment(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900">Comment on: {selectedItemForComment.product_name}</h3>

            <form onSubmit={handleLineCommentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Write your question or price query</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Can you provide a better price for 5 units?"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItemForComment(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {submittingComment ? 'Sending...' : 'Send Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerQuoteReview;
