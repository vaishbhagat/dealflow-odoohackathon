import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { CreditCard, FileText, CheckCircle2, Plus, Download, X } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const InvoicesView = () => {
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generateQuoteId, setGenerateQuoteId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    loadInvoices();
    loadQuotations();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      if (res.success) setInvoices(res.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotations = async () => {
    try {
      const res = await api.get('/quotations');
      if (res.success) {
        // Filter quotations that can be invoiced (CONFIRMED or APPROVED)
        setQuotations(res.quotations || []);
      }
    } catch (e) {
      console.error('Error loading quotations:', e);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!generateQuoteId) return;

    try {
      setGenerating(true);
      const res = await api.post(`/subscriptions/generate-invoice/${generateQuoteId}`);
      showToast(res.message || 'Invoice generated successfully!');
      setGenerateQuoteId('');
      await loadInvoices();
    } catch (err) {
      alert(err.error || err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const totalItems = invoices.length;
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-cyan-600" />
            <span>Invoices & Billing Operations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial billing records, payment verification, and recurring subscription activation.
          </p>
        </div>

        {/* Generate Invoice Form with Select Dropdown */}
        <form onSubmit={handleGenerateInvoice} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <select
            value={generateQuoteId}
            onChange={(e) => setGenerateQuoteId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 min-w-[220px]"
          >
            <option value="">-- Select Quotation to Invoice --</option>
            {quotations.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quotation_number} – {q.customer_name} (₹{parseFloat(q.total_amount).toLocaleString('en-IN')})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!generateQuoteId || generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{generating ? 'Issuing...' : 'Issue Invoice'}</span>
          </button>
        </form>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-extrabold text-slate-900">
            Issued Invoices ({totalItems})
          </h2>
          <span className="text-xs text-slate-500">20 Invoices per Page</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold">No invoices issued yet.</p>
            <p className="text-xs mt-1">Select a confirmed quotation above to issue the tax invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Quotation #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Due Amount</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-center">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-blue-600">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {inv.quotation_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {inv.customer_name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">
                      ₹{parseFloat(inv.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-rose-600 text-right">
                      ₹{parseFloat(inv.due_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          inv.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesView;
