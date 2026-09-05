import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  BarChart3,
  TrendingUp,
  Award,
  Download,
  Printer,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';

export const ReportsView = () => {
  const [repPerformance, setRepPerformance] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [categories, setCategories] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('ALL');
  const [salespersonId, setSalespersonId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    loadFilterMetadata();
  }, []);

  useEffect(() => {
    loadReports();
  }, [period, salespersonId, approvalStatus, categoryId]);

  const loadFilterMetadata = async () => {
    try {
      const [catRes, userRes] = await Promise.all([
        api.get('/categories'),
        api.get('/admin/users').catch(() => ({ success: false })),
      ]);

      if (catRes.success) setCategories(catRes.categories || []);
      if (userRes.success) {
        setSalespeople((userRes.users || []).filter((u) => u.role === 'SALES_REP'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (salespersonId) params.append('salespersonId', salespersonId);
      if (approvalStatus) params.append('approvalStatus', approvalStatus);
      if (categoryId) params.append('categoryId', categoryId);

      const [repRes, prodRes] = await Promise.all([
        api.get(`/reports/sales-performance?${params.toString()}`),
        api.get(`/reports/product-performance?${params.toString()}`),
      ]);

      if (repRes.success) setRepPerformance(repRes.performance || []);
      if (prodRes.success) setProductPerformance(prodRes.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (period) params.append('period', period);
      if (salespersonId) params.append('salespersonId', salespersonId);
      if (approvalStatus) params.append('approvalStatus', approvalStatus);
      if (categoryId) params.append('categoryId', categoryId);

      // Authenticated fetch — build CSV rows from the data we already have in state
      const repRows = repPerformance.map((rep) =>
        [
          `"${rep.rep_name}"`,
          rep.total_quotes,
          parseFloat(rep.won_value || 0).toFixed(2),
          parseFloat(rep.avg_discount_pct || 0).toFixed(2),
          parseFloat(rep.avg_margin_pct || 0).toFixed(2),
        ].join(',')
      );

      const prodRows = productPerformance.map((p) =>
        [
          `"${p.name}"`,
          `"${p.category_name || ''}"`,
          p.units_sold,
          parseFloat(p.total_sales || 0).toFixed(2),
          parseFloat(p.gross_margin || 0).toFixed(2),
        ].join(',')
      );

      const lines = [
        'DEALFLOW360 — SALES PERFORMANCE REPORT',
        `Generated: ${new Date().toLocaleString()}`,
        '',
        '--- SALES REP LEADERBOARD ---',
        'Rep Name,Total Quotes,Won Value (INR),Avg Discount %,Avg Margin %',
        ...repRows,
        '',
        '--- TOP PRODUCTS ---',
        'Product Name,Category,Units Sold,Total Revenue (INR),Gross Margin (INR)',
        ...prodRows,
      ];

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DealFlow360_SalesReport_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Sales & Product Performance Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-dimensional reporting filters with automated export to XLS/CSV and PDF printable audit copies.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV / Excel</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden during Print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Report Filter Dimensions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sales Representative</label>
            <select
              value={salespersonId}
              onChange={(e) => setSalespersonId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sales Representatives</option>
              {salespeople.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Approval Governance Status</label>
            <select
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="APPROVED">Fully Approved</option>
              <option value="PENDING">Pending Approval Chain</option>
              <option value="NOT_REQUIRED">Standard Policy (Auto)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Product Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rep Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Sales Representative Leaderboard</h2>
                <p className="text-xs text-slate-400">Total won volume, average deal discount, and gross margins</p>
              </div>
              <Award className="w-4 h-4 text-amber-500" />
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Deals</th>
                  <th className="py-3 px-4">Won Value</th>
                  <th className="py-3 px-4">Avg Discount</th>
                  <th className="py-3 px-4">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {repPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No representative performance records found for current filters.
                    </td>
                  </tr>
                ) : (
                  repPerformance.map((rep) => (
                    <tr key={rep.rep_id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{rep.rep_name}</td>
                      <td className="py-3.5 px-4 font-semibold">{rep.total_quotes} Quotes</td>
                      <td className="py-3.5 px-4 font-black text-emerald-700">
                        ₹{parseFloat(rep.won_value || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{parseFloat(rep.avg_discount_pct || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        {parseFloat(rep.avg_margin_pct || 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Top Selling Products & Margins</h2>
                <p className="text-xs text-slate-400">Category sales breakdown and gross margin contributions</p>
              </div>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Total Revenue</th>
                  <th className="py-3 px-4">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {productPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No product sales records found for current filters.
                    </td>
                  </tr>
                ) : (
                  productPerformance.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 line-clamp-1">{p.name}</td>
                      <td className="py-3.5 px-4 font-semibold">{p.units_sold} Units</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{parseFloat(p.total_sales || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-700">
                        ₹{parseFloat(p.gross_margin || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
