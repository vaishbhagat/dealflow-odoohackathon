import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import {
  CreditCard, CheckCircle2, Download, X, FileText,
  Shield, Zap, RefreshCw, Clock, TrendingUp, IndianRupee,
  AlertCircle, ExternalLink, Lock, Wifi,
} from 'lucide-react';

// ─── Razorpay Checkout Helper ─────────────────────────────────────────────────
function openRazorpayCheckout({ orderData, onSuccess, onDismiss }) {
  if (!window.Razorpay) {
    alert('Razorpay SDK not loaded. Please refresh the page.');
    return;
  }

  const options = {
    key: orderData.razorpayKeyId,
    amount: orderData.amount,           // paise
    currency: orderData.currency || 'INR',
    name: 'Gada Electronics Ltd.',
    description: `Invoice Payment – ${orderData.invoiceNumber}`,
    order_id: orderData.orderId,
    image: '/favicon.svg',
    prefill: {
      name: orderData.customerName || '',
      email: orderData.customerEmail || '',
      contact: orderData.customerPhone || '',
    },
    notes: {
      invoice_number: orderData.invoiceNumber,
      quotation_number: orderData.quotationNumber || '',
    },
    theme: {
      color: '#1d4ed8',        // Gada blue
      backdrop_color: 'rgba(0,0,0,0.7)',
    },
    modal: {
      ondismiss: onDismiss,
      animation: true,
    },
    handler: (response) => {
      onSuccess({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (resp) => {
    console.error('Razorpay payment failed:', resp.error);
    onDismiss();
  });
  rzp.open();
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────
const ReceiptModal = ({ invoice, onClose }) => {
  const handlePrint = () => {
    const content = document.getElementById('receipt-printable');
    const win = window.open('', '_blank', 'width=860,height=960');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt - ${invoice.invoice_number}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #111; font-size: 13px; background: #fff; }
        h1 { font-size: 22px; font-weight: 900; color: #1e40af; margin: 0; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
        .label { color: #6b7280; }
        .total { font-weight: 900; font-size: 16px; color: #111; }
        .badge { background: #dcfce7; color: #166534; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
        .section { margin: 20px 0; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #1e40af; padding-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        .gst-row td { background: #f8fafc; font-size: 11px; color: #64748b; }
        @media print { body { margin: 16px; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const items = invoice.items || [];
  const subtotal = items.reduce((acc, i) => acc + parseFloat(i.unit_price || 0) * parseInt(i.quantity || 1), 0);
  const taxTotal = parseFloat(invoice.total_amount || 0) - subtotal;
  const cgstTotal = parseFloat(invoice.cgst_total || taxTotal / 2);
  const sgstTotal = parseFloat(invoice.sgst_total || taxTotal / 2);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><FileText className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Tax Invoice</h2>
              <p className="text-xs text-slate-500">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Receipt
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div id="receipt-printable" className="p-6 space-y-5">
          <div className="flex items-start justify-between pb-4 border-b-2 border-blue-700">
            <div>
              <h1 className="text-xl font-black text-blue-800">Gada Electronics Ltd.</h1>
              <p className="text-xs text-slate-500 mt-0.5">Gokuldham Complex, Goregaon East, Mumbai 400063</p>
              <p className="text-xs text-slate-500">GSTIN: 27AACFG2345R1ZE • PAN: AACFG2345R</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl uppercase tracking-wide">TAX INVOICE</div>
              <p className="text-[11px] text-slate-500 mt-2">Invoice #: <strong className="text-slate-900">{invoice.invoice_number}</strong></p>
              <p className="text-[11px] text-slate-500">Date: <strong className="text-slate-900">{new Date(invoice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
              <p className="text-[11px] text-slate-500">Quotation: <strong className="text-slate-900">{invoice.quotation_number}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="text-sm font-bold text-slate-900">{invoice.customer_name}</p>
              <p className="text-xs text-slate-600 mt-1">{invoice.contact_person}</p>
              <p className="text-xs text-slate-500 mt-0.5">{invoice.billing_address || invoice.customer_email}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Status</p>
              <span className={`inline-block px-2.5 py-1 text-xs font-extrabold rounded-lg uppercase ${
                invoice.payment_status === 'PAID'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {invoice.payment_status}
              </span>
              <p className="text-xs text-slate-500 mt-2">Due: ₹{parseFloat(invoice.due_amount || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">Invoice Line Items</p>
            <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Description</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Qty</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Unit Price</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Taxable</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">CGST</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">SGST</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item, i) => {
                  const taxable = parseFloat(item.unit_price || 0) * parseInt(item.quantity || 1);
                  const cgst = parseFloat(item.cgst_amount || 0);
                  const sgst = parseFloat(item.sgst_amount || 0);
                  const lineTotal = taxable + cgst + sgst;
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-3 text-slate-800 font-medium">{item.description || item.product_name || 'Product'}</td>
                      <td className="p-3 text-right text-slate-600">{item.quantity || 1}</td>
                      <td className="p-3 text-right text-slate-600">₹{parseFloat(item.unit_price || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-slate-600">₹{taxable.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-slate-500">₹{cgst.toLocaleString('en-IN')}<br/><span className="text-[9px] text-slate-400">{item.cgst_pct || 9}%</span></td>
                      <td className="p-3 text-right text-slate-500">₹{sgst.toLocaleString('en-IN')}<br/><span className="text-[9px] text-slate-400">{item.sgst_pct || 9}%</span></td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{lineTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7} className="p-3 text-center text-slate-400">Line item details available on quotation</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            {subtotal > 0 && <div className="flex justify-between text-xs text-slate-600"><span>Subtotal (excl. tax)</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>}
            {cgstTotal > 0 && <div className="flex justify-between text-xs text-slate-600"><span>CGST (9%)</span><span>₹{cgstTotal.toLocaleString('en-IN')}</span></div>}
            {sgstTotal > 0 && <div className="flex justify-between text-xs text-slate-600"><span>SGST (9%)</span><span>₹{sgstTotal.toLocaleString('en-IN')}</span></div>}
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Grand Total</span>
              <span>₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              Computer-generated invoice. No signature required. • Gada Electronics Ltd. v2.5.0 • GSTIN: 27AACFG2345R1ZE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Razorpay Payment Dashboard Panel ─────────────────────────────────────────
const RazorpayDashboard = ({ invoices }) => {
  const totalInvoiced = invoices.reduce((a, i) => a + parseFloat(i.total_amount || 0), 0);
  const totalPaid     = invoices.reduce((a, i) => a + (i.payment_status === 'PAID' ? parseFloat(i.total_amount || 0) : 0), 0);
  const totalDue      = invoices.reduce((a, i) => a + parseFloat(i.due_amount || 0), 0);
  const paidCount     = invoices.filter(i => i.payment_status === 'PAID').length;
  const dueCount      = invoices.filter(i => i.payment_status !== 'PAID').length;
  const successRate   = invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-[#072654] via-[#0d3880] to-[#1a56b0] p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            {/* Razorpay-style Z icon */}
            <svg viewBox="0 0 28 28" className="w-5 h-5 fill-white">
              <path d="M5 4h18l-8 10h8L7 25l4-11H5z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-extrabold text-sm">Razorpay Payment Gateway</p>
            <p className="text-blue-200 text-[11px]">Test Mode • Integrated Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/20 border border-emerald-300/40 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-100 text-[11px] font-bold">LIVE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
        <div className="p-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><IndianRupee className="w-3 h-3" />Total Volume</p>
          <p className="text-lg font-black text-slate-900">₹{totalInvoiced.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">{invoices.length} invoices</p>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Collected</p>
          <p className="text-lg font-black text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-500">{paidCount} payments</p>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" />Outstanding</p>
          <p className="text-lg font-black text-rose-600">₹{totalDue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-rose-400">{dueCount} pending</p>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" />Success Rate</p>
          <p className="text-lg font-black text-blue-700">{successRate}%</p>
          {/* Mini bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${successRate}%` }} />
          </div>
        </div>
      </div>

      {/* Security badges */}
      <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-t border-slate-100 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
          <Lock className="w-3 h-3 text-emerald-500" /> PCI-DSS Compliant
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
          <Shield className="w-3 h-3 text-blue-500" /> 256-bit SSL Encrypted
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
          <Zap className="w-3 h-3 text-amber-500" /> Instant Verification
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
          <Wifi className="w-3 h-3 text-purple-500" /> UPI • Cards • Net Banking
        </div>
        <div className="ml-auto">
          <a
            href="https://dashboard.razorpay.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline"
          >
            Open Razorpay Dashboard <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ─── Payment Success Modal ─────────────────────────────────────────────────────
const PaymentSuccessModal = ({ data, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-5 animate-in fade-in zoom-in duration-300">
      {/* Success ring */}
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40" />
        <div className="relative w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
          <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-900">Payment Successful!</h2>
        <p className="text-sm text-slate-500 mt-1">Your invoice has been marked as <strong className="text-emerald-600">PAID</strong></p>
      </div>
      <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-left">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Invoice</span>
          <span className="font-bold text-slate-900">{data.invoiceNumber}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Amount Paid</span>
          <span className="font-black text-emerald-700">₹{parseFloat(data.amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Payment ID</span>
          <span className="font-mono text-[10px] text-blue-600 break-all">{data.paymentId}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Payment #</span>
          <span className="font-mono text-[10px] text-slate-700">{data.paymentNumber}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Gateway</span>
          <span className="font-bold text-slate-700">Razorpay</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-sm cursor-pointer"
      >
        Done
      </button>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [receiptInvoice, setReceiptInvoice] = useState(null);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/invoices');
      if (res.success) setInvoices(res.invoices || []);
      else setError(res.error || 'Failed to load invoices.');
    } catch (err) {
      setError(err.message || 'Error loading invoices.');
    } finally {
      setLoading(false);
    }
  };

  const openReceipt = async (inv) => {
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      setReceiptInvoice(res.success ? res.invoice : inv);
    } catch {
      setReceiptInvoice(inv);
    }
  };

  // ── Real Razorpay Checkout Flow ───────────────────────────────────────────
  const handlePayInvoice = useCallback(async (invoice) => {
    try {
      setPayingId(invoice.id);

      // 1. Create Razorpay order on backend
      const orderRes = await api.post('/payments/create-order', { invoiceId: invoice.id });
      if (!orderRes.success) throw new Error(orderRes.error || 'Could not create payment order.');

      // 2. Open the real Razorpay checkout modal
      openRazorpayCheckout({
        orderData: orderRes,
        onDismiss: () => setPayingId(null),
        onSuccess: async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
          try {
            // 3. Verify on backend and mark invoice PAID
            const verifyRes = await api.post('/payments/verify', {
              invoiceId: invoice.id,
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature,
            });
            if (verifyRes.success) {
              setSuccessData({
                invoiceNumber: verifyRes.invoiceNumber,
                amount: verifyRes.amount,
                paymentId: razorpayPaymentId,
                paymentNumber: verifyRes.paymentNumber,
              });
              await fetchInvoices();
            } else {
              alert('Verification failed: ' + (verifyRes.error || 'Unknown error'));
            }
          } catch (err) {
            alert('Payment verification error: ' + err.message);
          } finally {
            setPayingId(null);
          }
        },
      });
    } catch (err) {
      alert('Payment processing failed: ' + err.message);
      setPayingId(null);
    }
  }, []);

  const totalInvoiced   = invoices.reduce((a, i) => a + parseFloat(i.total_amount || 0), 0);
  const totalPaid       = invoices.reduce((a, i) => a + (i.payment_status === 'PAID' ? parseFloat(i.total_amount || 0) : 0), 0);
  const totalOutstanding = invoices.reduce((a, i) => a + parseFloat(i.due_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Modals */}
      {receiptInvoice && <ReceiptModal invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} />}
      {successData    && <PaymentSuccessModal data={successData} onClose={() => setSuccessData(null)} />}

      {/* ── Page Header ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              Razorpay Integrated Gateway
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">My Invoices & Payments</h1>
          <p className="text-xs text-blue-100 mt-1">View tax invoices, pay securely via Razorpay, and download GST receipts.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-blue-600/50">
          <div className="bg-white/10 border border-white/20 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-blue-100">Total Invoiced</span>
            <p className="text-xl font-black text-white mt-1">₹{totalInvoiced.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/30 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-emerald-200">Total Paid</span>
            <p className="text-xl font-black text-white mt-1">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-rose-500/20 border border-rose-400/30 p-4 rounded-2xl">
            <span className="text-xs font-semibold text-rose-200">Outstanding Balance</span>
            <p className="text-xl font-black text-white mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* ── Razorpay Dashboard Panel ── */}
      <RazorpayDashboard invoices={invoices} />

      {/* ── Invoices List ── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Commercial Invoices ({invoices.length})</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Razorpay Test Mode</span>
            <button onClick={fetchInvoices} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading invoices...</span>
          </div>
        ) : error ? (
          <div className="p-8 flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl m-4">
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-800">No invoices issued yet.</p>
            <p>Confirmed quotations automatically generate invoices here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const isPaid   = inv.payment_status === 'PAID';
              const isPaying = payingId === inv.id;

              return (
                <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  {/* Left: Invoice info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-black text-slate-900 text-base">{inv.invoice_number}</span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase border ${
                        isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {inv.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Quote: <strong className="text-blue-600">{inv.quotation_number}</strong>
                      {' '}• Issued: {new Date(inv.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  {/* Right: Amount + Actions */}
                  <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right mr-2">
                      <span className="text-base font-black text-slate-900">₹{parseFloat(inv.total_amount).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400 block">Due: ₹{parseFloat(inv.due_amount || 0).toLocaleString('en-IN')}</span>
                    </div>

                    {/* Receipt */}
                    <button
                      type="button"
                      onClick={() => openReceipt(inv)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Receipt
                    </button>

                    {/* Pay Now – opens real Razorpay modal */}
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => handlePayInvoice(inv)}
                        disabled={isPaying}
                        className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer shrink-0 ${
                          isPaying
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-[#072654] hover:bg-[#0d3880] active:scale-95'
                        }`}
                      >
                        {isPaying ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing Razorpay…
                          </>
                        ) : (
                          <>
                            {/* Razorpay lightning Z */}
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-white">
                              <path d="M3 2h10l-4.5 5.5H13L5 15l2.5-6.5H3z" />
                            </svg>
                            Pay via Razorpay
                          </>
                        )}
                      </button>
                    )}

                    {isPaid && (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> Paid
                      </span>
                    )}
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

export default CustomerInvoices;
