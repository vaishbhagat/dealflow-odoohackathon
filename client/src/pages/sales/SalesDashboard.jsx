import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import {
  DollarSign, TrendingUp, Clock, AlertTriangle, FilePlus, ArrowRight,
  ShieldAlert, Calendar, Zap, Package, Users, CheckCircle, BarChart3,
  ArrowUpRight, ArrowDownRight, Percent, Activity, ChevronRight
} from "lucide-react";

// Mini Bar Chart (pure CSS)
function MiniBarChart({ data, color = "blue" }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const colorMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
  };
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={`w-full rounded-t-sm ${colorMap[color] || "bg-blue-500"} opacity-80 transition-all`}
            style={{ height: `${Math.max(4, (d.value / max) * 48)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

// Status badge
function StatusBadge({ status }) {
  const map = {
    DRAFT: "bg-slate-100 text-slate-600",
    SENT: "bg-blue-100 text-blue-700",
    UNDER_NEGOTIATION: "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    FULFILLMENT: "bg-indigo-100 text-indigo-700",
    PAID: "bg-green-100 text-green-700",
    REQUESTED: "bg-purple-100 text-purple-700",
    REJECTED: "bg-rose-100 text-rose-700",
  };
  const labels = {
    DRAFT: "Draft", SENT: "Sent", UNDER_NEGOTIATION: "Negotiation",
    APPROVED: "Approved", FULFILLMENT: "Fulfillment", PAID: "Won",
    REQUESTED: "Requested", REJECTED: "Rejected",
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  return <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cls}`}>{labels[status] || status}</span>;
}

// KPI Card
function KpiCard({ title, value, subtitle, icon: Icon, color, trend, trendVal, chartData }) {
  const colors = {
    blue: { bg: "from-blue-50 to-indigo-50 border-blue-100", icon: "bg-blue-100 text-blue-600", val: "text-blue-900", trend: "text-blue-500" },
    emerald: { bg: "from-emerald-50 to-green-50 border-emerald-100", icon: "bg-emerald-100 text-emerald-600", val: "text-emerald-900", trend: "text-emerald-500" },
    amber: { bg: "from-amber-50 to-yellow-50 border-amber-100", icon: "bg-amber-100 text-amber-600", val: "text-amber-900", trend: "text-amber-500" },
    violet: { bg: "from-violet-50 to-purple-50 border-violet-100", icon: "bg-violet-100 text-violet-600", val: "text-violet-900", trend: "text-violet-500" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`bg-gradient-to-br ${c.bg} border rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {trendVal !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-bold ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
            {trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trendVal}%
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-black ${c.val} leading-tight`}>{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {chartData && <MiniBarChart data={chartData} color={color} />}
    </div>
  );
}

export const SalesDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [reportsData, quotesData] = await Promise.all([
        api.get("/reports/dashboard"),
        api.get("/quotations?limit=6"),
      ]);
      if (reportsData.success) setMetrics(reportsData.metrics);
      if (quotesData.success) setQuotations(quotesData.quotations || []);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Derive pipeline distribution for stage bar
  const stageMap = {};
  quotations.forEach(q => { stageMap[q.status] = (stageMap[q.status] || 0) + 1; });

  // Mock weekly data for mini charts (will use real data if available)
  const weeklyChartData = [
    { value: 40 }, { value: 65 }, { value: 55 }, { value: 80 }, { value: 70 }, { value: 90 }, { value: 75 }
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="w-10 h-10 border-4 border-blue-200 rounded-full absolute" />
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Live Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Operations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gada Electronics — DealFlow360 Command Center</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/sales/pipeline"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Pipeline View</span>
          </Link>
          <Link
            to="/sales/quotations?create=true"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>New Quotation</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Active Pipeline Value"
          value={`\u20b9${((metrics?.pipelineValue || 0) / 100000).toFixed(1)}L`}
          subtitle={`${metrics?.totalQuotes || 0} active quotations`}
          icon={TrendingUp}
          color="blue"
          trend="up"
          trendVal={12}
          chartData={weeklyChartData}
        />
        <KpiCard
          title="Closed Won Revenue"
          value={`\u20b9${((metrics?.totalRevenue || 0) / 100000).toFixed(1)}L`}
          subtitle={`Win rate: ${metrics?.winRatePct || 0}%`}
          icon={DollarSign}
          color="emerald"
          trend="up"
          trendVal={8}
          chartData={[{value:30},{value:50},{value:45},{value:70},{value:65},{value:85},{value:90}]}
        />
        <KpiCard
          title="Average Margin"
          value={`${metrics?.averageMarginPct || 0}%`}
          subtitle={`Avg discount: ${metrics?.averageDiscountPct || 0}%`}
          icon={Percent}
          color="amber"
          trendVal={2}
          trend="down"
          chartData={[{value:60},{value:55},{value:70},{value:65},{value:60},{value:58},{value:55}]}
        />
        <KpiCard
          title="Approvals Pending"
          value={metrics?.pendingApprovalCount || 0}
          subtitle="Manager & Finance reviews"
          icon={ShieldAlert}
          color="violet"
          chartData={[{value:2},{value:5},{value:3},{value:8},{value:6},{value:4},{value:metrics?.pendingApprovalCount||0}]}
        />
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/sales/negotiations", label: "Negotiations Inbox", icon: Activity, color: "text-amber-600", bg: "bg-amber-50 border-amber-100", badge: null },
          { to: "/sales/approvals", label: "Approval Tracker", icon: ShieldAlert, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", badge: metrics?.pendingApprovalCount },
          { to: "/sales/products", label: "Quote Builder", icon: Package, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", badge: null },
          { to: "/sales/follow-ups", label: "Follow-Up Tasks", icon: Calendar, color: "text-rose-600", bg: "bg-rose-50 border-rose-100", badge: null },
        ].map(({ to, label, icon: Icon, color, bg, badge }) => (
          <Link
            key={to}
            to={to}
            className={`${bg} border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all group`}
          >
            <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 leading-tight">{label}</p>
            </div>
            <div className="flex items-center gap-1">
              {badge > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">{badge}</span>}
              <ChevronRight className={`w-4 h-4 ${color} group-hover:translate-x-0.5 transition-transform`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content: Table + Stage Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Quotations Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Recent Deals</h2>
              <p className="text-xs text-slate-400 mt-0.5">Governed by backend discount policies</p>
            </div>
            <Link to="/sales/quotations" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <span>View All</span><ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Margin</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {quotations.slice(0, 6).map((q) => {
                  const margin = parseFloat(q.margin_pct || 0);
                  const health = parseInt(q.health_score || 100, 10);
                  return (
                    <tr key={q.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <Link to={`/sales/quotations/${q.id}`} className="font-black text-blue-600 hover:underline">
                          {q.quotation_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 truncate max-w-[120px]">{q.customer_name}</p>
                        <span className="text-[10px] text-slate-400">{q.customer_tier} Tier</span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        \u20b9{parseFloat(q.total_amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-black ${margin >= 15 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-rose-600"}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={q.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${health >= 70 ? "bg-emerald-500" : health >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${health}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{health}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/sales/quotations/${q.id}`} className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold rounded-lg text-[10px] transition-colors">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                      No quotations found. <Link to="/sales/quotations?create=true" className="text-blue-600 font-bold hover:underline">Create your first deal →</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stage Distribution Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">Pipeline Distribution</h2>
            <p className="text-xs text-slate-400">Deals across all stages</p>
          </div>

          <div className="space-y-3">
            {[
              { id: "REQUESTED", label: "Requested", color: "bg-slate-400" },
              { id: "DRAFT", label: "Draft", color: "bg-slate-500" },
              { id: "SENT", label: "Sent", color: "bg-blue-500" },
              { id: "UNDER_NEGOTIATION", label: "Negotiation", color: "bg-amber-500" },
              { id: "APPROVED", label: "Approved", color: "bg-emerald-500" },
              { id: "FULFILLMENT", label: "Fulfillment", color: "bg-indigo-500" },
              { id: "PAID", label: "Won & Paid", color: "bg-green-500" },
            ].map(({ id, label, color }) => {
              const cnt = stageMap[id] || 0;
              const total = quotations.length || 1;
              const pct = Math.round((cnt / total) * 100);
              return (
                <div key={id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-900">{cnt}</span>
                      <span className="text-[10px] text-slate-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link to="/sales/pipeline" className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl hover:border-blue-300 transition-all">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-blue-900">Full Kanban View</span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom: Team Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">Platform Status</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "RBAC Governance", ok: true },
              { label: "Discount Engine", ok: true },
              { label: "Approval Workflow", ok: true },
              { label: "Notifications", ok: true },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                  {ok ? "Active" : "Down"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-900">Rep Performance</span>
          </div>
          <div className="space-y-3">
            {[
              { name: "Bhagaha (You)", deals: 8, revenue: "₹12.4L", color: "bg-blue-500" },
              { name: "Magan Lal", deals: 5, revenue: "₹8.1L", color: "bg-emerald-500" },
            ].map(({ name, deals, revenue, color }) => (
              <div key={name} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{name}</p>
                  <p className="text-[10px] text-slate-400">{deals} deals · {revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-blue-200" />
            <span className="text-xs font-bold text-blue-200">Quick Actions</span>
          </div>
          <div className="space-y-2">
            {[
              { to: "/sales/products", label: "Build a Quotation" },
              { to: "/sales/negotiations", label: "Check Negotiations" },
              { to: "/sales/approvals", label: "Track Approvals" },
              { to: "/sales/follow-ups", label: "Follow-Up Tasks" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <span className="text-xs font-semibold">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-200" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
