import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  FilePlus,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export const SalesDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [reportsData, quotesData] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/quotations?limit=6'),
      ]);

      if (reportsData.success) setMetrics(reportsData.metrics);
      if (quotesData.success) setQuotations(quotesData.quotations || []);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor pipeline velocity, discount governance, and deal health across Gada Electronics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/sales/quotations?create=true"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create New Quotation</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Pipeline Value"
          value={`₹${(metrics?.pipelineValue || 0).toLocaleString()}`}
          subtitle={`${metrics?.totalQuotes || 0} active quotations`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Closed Won Revenue"
          value={`₹${(metrics?.totalRevenue || 0).toLocaleString()}`}
          subtitle={`Win rate: ${metrics?.winRatePct || 0}%`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Average Margin"
          value={`${metrics?.averageMarginPct || 0}%`}
          subtitle={`Avg discount: ${metrics?.averageDiscountPct || 0}%`}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Approvals Pending"
          value={metrics?.pendingApprovalCount || 0}
          subtitle="Manager & Finance reviews"
          icon={ShieldAlert}
          color="amber"
        />
      </div>

      {/* Main Quotations Table & Pipeline Snapshot */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Quotations & Deals</h2>
            <p className="text-xs text-slate-400">Live deal states governed by backend discount policies</p>
          </div>
          <Link
            to="/sales/quotations"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All Quotations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Margin %</th>
                <th className="py-3 px-4">Deal Status</th>
                <th className="py-3 px-4">Approval Level</th>
                <th className="py-3 px-4">Deal Health</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {quotations.slice(0, 6).map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-blue-600">
                    <Link to={`/sales/quotations/${q.id}`} className="hover:underline">
                      {q.quotation_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{q.customer_name}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{q.customer_tier} Tier</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    ₹{parseFloat(q.total_amount).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    <span
                      className={`${
                        parseFloat(q.margin_pct) >= 15
                          ? 'text-emerald-600'
                          : parseFloat(q.margin_pct) >= 10
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
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
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          (q.health_score || 100) >= 70
                            ? 'bg-emerald-500'
                            : (q.health_score || 100) >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      ></span>
                      <span className="font-bold">{q.health_score || 100}/100</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/sales/quotations/${q.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
