import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { CreditCard, CheckCircle2, Download, X, FileText, Building, Phone, Mail } from 'lucide-react';

// ─── Receipt Modal ───────────────────────────────────────────────────────────
const ReceiptModal = ({ invoice, onClose }) => {
  const handlePrint = () => {
    const content = document.getElementById('receipt-printable');
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt - ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #111; font-size: 13px; }
        h1 { font-size: 22px; font-weight: 900; color: #1e40af; }
        h2 { font-size: 15px; color: #374151; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
        .label { color: #6b7280; }
        .total { font-weight: 900; font-size: 16px; color: #111; }
        .badge { background: #dcfce7; color: #166534; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
        .section { margin: 20px 0; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #1e40af; padding-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; }
        td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
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
              <Download className="w-3.5 h-3.5" />
              Download Receipt
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div id="receipt-printable" className="p-6 space-y-5">
          {/* Letterhead */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-blue-700">
            <div>
              <h1 className="text-xl font-black text-blue-800">Gada Electronics Ltd.</h1>
              <p className="text-xs text-slate-500 mt-0.5">Gokuldham Complex, Goregaon East, Mumbai 400063</p>
              <p className="text-xs text-slate-500">GSTIN: 27AACFG2345R1ZE • PAN: AACFG2345R</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl uppercase tracking-wide">
                TAX INVOICE
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Invoice #: <strong className="text-slate-900">{invoice.invoice_number}</strong></p>
              <p className="text-[11px] text-slate-500">Date: <strong className="text-slate-900">{new Date(invoice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
              <p className="text-[11px] text-slate-500">Quotation: <strong className="text-slate-900">{invoice.quotation_number}</strong></p>
            </div>
          </div>

          {/* Billing Details */}
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

          {/* Line Items */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">Invoice Line Items</p>
            <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Qty</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-3 text-slate-800 font-medium">{item.description || item.product_name || 'Product Line Item'}</td>
                    <td className="p-3 text-right text-slate-600">{item.quantity || 1}</td>
                    <td className="p-3 text-right text-slate-600">₹{parseFloat(item.unit_price || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-slate-900">₹{(parseFloat(item.unit_price || 0) * parseInt(item.quantity || 1)).toLocaleString('en-IN')}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-400">Line item details available on quotation</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            {subtotal > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal (excl. tax)</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            {taxTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>GST / Tax</span>
                <span>₹{taxTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Total Amount</span>
              <span>₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              This is a computer-generated invoice and does not require a signature. • Gada Electronics Ltd. v2.4.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [toastSuccess, setToastSuccess] = useState(null);
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
      if (res.success) setReceiptInvoice(res.invoice);
      else setReceiptInvoice(inv);
    } catch {
      setReceiptInvoice(inv);
    }
  };

  const handlePayInvoice = async (invoice) => {
    try {
      setPayingId(invoice.id);
      const orderRes = await api.post('/payments/create-order', { invoiceId: invoice.id });
      const testPaymentId = `pay_test_${Date.now().toString().slice(-8)}`;
      const verifyRes = await api.post('/payments/verify', {
        invoiceId: invoice.id,
        razorpayOrderId: orderRes.orderId,
        razorpayPaymentId: testPaymentId,
        razorpaySignature: 'test_valid_signature_gada_electronics',
      });
      if (verifyRes.success) {
        setToastSuccess({ message: 'Payment Successful via Razorpay Test Mode!', paymentId: testPaymentId, amount: invoice.total_amount });
        await fetchInvoices();
      }
    } catch (err) {
      alert('Payment processing failed: ' + err.message);
    } finally {
      setPayingId(null);
    }
  };

  const totalInvoiced = invoices.reduce((acc, i) => acc + parseFloat(i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + (i.payment_status === 'PAID' ? parseFloat(i.total_amount || 0) : 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + parseFloat(i.due_amount || 0), 0);

  return (
    <div className="space-y-6">
      {receiptInvoice && <ReceiptModal invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} />}

      {/* Toast */}
      {toastSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-extrabold">{toastSuccess.message}</p>
              <p className="text-emerald-100 text-[11px] mt-0.5">
                Payment ID: {toastSuccess.paymentId} • ₹{parseFloat(toastSuccess.amount).toLocaleString('en-IN')} Paid
              </p>
            </div>
          </div>
          <button onClick={() => setToastSuccess(null)} className="text-emerald-200 hover:text-white ml-4">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              Razorpay Integrated Gateway
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">My Invoices & Payments</h1>
          <p className="text-xs text-blue-100 mt-1">View tax invoices, check balances, and download receipts.</p>
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

      {/* Invoices List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Commercial Invoices ({invoices.length})</h2>
          <span className="text-xs text-slate-500">Razorpay Test Mode</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading invoices...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl m-4">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-bold text-sm text-slate-800">No invoices issued yet.</p>
            <p>Confirmed quotations automatically generate invoices here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const isPaid = inv.payment_status === 'PAID';
              const isPaying = payingId === inv.id;
              return (
                <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-black text-slate-900 text-base">{inv.invoice_number}</span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase border ${
                        isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {inv.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Quote: <strong className="text-blue-600">{inv.quotation_number}</strong>
                      {' '}• Issued: {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right mr-2">
                      <span className="text-base font-black text-slate-900">₹{parseFloat(inv.total_amount).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400 block">Due: ₹{parseFloat(inv.due_amount || 0).toLocaleString('en-IN')}</span>
                    </div>

                    {/* View/Download Receipt button always visible */}
                    <button
                      type="button"
                      onClick={() => openReceipt(inv)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Receipt
                    </button>

                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => handlePayInvoice(inv)}
                        disabled={isPaying}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{isPaying ? 'Processing...' : 'Pay Now'}</span>
                      </button>
                    )}
                    {isPaid && (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
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
