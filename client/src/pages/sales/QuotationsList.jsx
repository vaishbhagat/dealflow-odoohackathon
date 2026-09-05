import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { Plus, Search, Filter, ArrowUpRight, X } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const QuotationsList = () => {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('Commercial refresh quotation');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const [quotesRes, custRes] = await Promise.all([
        api.get(`/quotations?${params.toString()}`),
        api.get('/customers'),
      ]);

      if (quotesRes.success) setQuotations(quotesRes.quotations || []);
      if (custRes.success) setCustomers(custRes.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) return alert('Please select a customer.');

    try {
      const res = await api.post('/quotations', {
        customerId: selectedCustomerId,
        notes: quoteNotes,
      });
      if (res.success) {
        setShowCreateModal(false);
        navigate(`/sales/quotations/${res.quotationId}`);
      }
    } catch (err) {
      alert(err.error || 'Failed to create quotation');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quotations & Deals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, price, and govern B2B electronics quotations with live margin & discount governance.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quote number, customer name..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
          >
            <option value="">All Deal Stages</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="UNDER_NEGOTIATION">Under Negotiation</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="FULFILLMENT">Fulfillment</option>
            <option value="INVOICED">Invoiced</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold">No quotations found.</p>
            <p className="text-xs mt-1">Create your first deal to begin governance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Margin %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">Risk Reason</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quotations
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-blue-600">
                      <Link to={`/sales/quotations/${q.id}`} className="hover:underline">
                        {q.quotation_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{q.customer_name}</p>
                      <span className="text-[10px] text-slate-400">{q.customer_tier} Tier</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{q.salesperson_name}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{parseFloat(q.total_amount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      <span
                        className={
                          parseFloat(q.margin_pct) >= 15
                            ? 'text-emerald-600'
                            : parseFloat(q.margin_pct) >= 10
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }
                      >
                        {parseFloat(q.margin_pct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={q.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={q.approval_status} />
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate" title={q.risk_reason}>
                      {q.risk_reason || 'Normal'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/sales/quotations/${q.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all text-xs"
                      >
                        <span>Open</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {quotations.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalItems={quotations.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">New Deal Quotation</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select B2B Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.customer_tier} Tier) - Contact: {c.contact_person}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quotation Notes / Scope</label>
                <textarea
                  rows="3"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Enterprise IT equipment refresh for Mumbai branch"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Create & Launch Builder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsList;
