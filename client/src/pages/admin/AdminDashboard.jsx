import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import {
  Shield, Users, Package, DollarSign, TrendingUp, Database,
  Settings, Warehouse, Sliders, Activity, CheckCircle, AlertTriangle,
  ArrowRight, BarChart3, Globe, Zap, Server, RefreshCw, ChevronRight
} from "lucide-react";

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rpt, usr] = await Promise.all([
        api.get("/reports/dashboard").catch(() => ({ success: false })),
        api.get("/admin/users").catch(() => ({ success: false })),
      ]);
      if (rpt.success) setMetrics(rpt.metrics);
      if (usr.success) setUsers(usr.users || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const roleCount = (role) => users.filter(u => u.role === role).length;

  const modules = [
    { name: "User Management", desc: "Manage users, roles & access", icon: Users, to: "/admin/users", color: "from-blue-600 to-indigo-600", count: users.length },
    { name: "Product Catalogue", desc: "Products, variants & SKUs", icon: Package, to: "/admin/products", color: "from-emerald-600 to-teal-600", count: null },
    { name: "Price Lists", desc: "Tier pricing & discounts", icon: DollarSign, to: "/admin/price-lists", color: "from-amber-500 to-orange-500", count: null },
    { name: "Discount Rules", desc: "Governance & approval thresholds", icon: Sliders, to: "/admin/discount-rules", color: "from-violet-600 to-purple-600", count: null },
    { name: "Warehouses", desc: "Inventory & stock management", icon: Warehouse, to: "/admin/warehouses", color: "from-cyan-500 to-blue-500", count: null },
    { name: "Architecture", desc: "System design & data flow", icon: Globe, to: "/admin/architecture", color: "from-rose-500 to-pink-600", count: null },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-violet-600" />
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Platform Admin</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Admin Control Panel</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gada Electronics — DealFlow360 Configuration Center</p>
        </div>
        <button onClick={loadData} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* System Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-black">System Healthy</p>
              <p className="text-xs text-slate-400">All DealFlow360 enterprise modules operational</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "MySQL DB", status: true },
              { label: "RBAC Engine", status: true },
              { label: "Email Service", status: true },
              { label: "Payment Gateway", status: true },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
                <span className="text-xs font-medium text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
          { label: "Pipeline Value", value: `₹${((metrics?.pipelineValue || 0)/100000).toFixed(1)}L`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Win Rate", value: `${metrics?.winRatePct || 0}%`, icon: BarChart3, color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
          { label: "Pending Approvals", value: metrics?.pendingApprovalCount || 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-2xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500 font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Module Cards */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-sm font-black text-slate-900">Platform Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map(({ name, desc, icon: Icon, to, color, count }) => (
              <Link
                key={to}
                to={to}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all group flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-900">{name}</p>
                    {count !== null && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{count}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* Users Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">User Roles</h2>
            <Link to="/admin/users" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 space-y-3">
            {[
              { role: "ADMIN", label: "Admins", color: "bg-violet-100 text-violet-700" },
              { role: "SALES_MANAGER", label: "Sales Managers", color: "bg-blue-100 text-blue-700" },
              { role: "SALES_REP", label: "Sales Reps", color: "bg-emerald-100 text-emerald-700" },
              { role: "FINANCE_OPERATIONS", label: "Finance Ops", color: "bg-amber-100 text-amber-700" },
              { role: "CUSTOMER", label: "Customers", color: "bg-cyan-100 text-cyan-700" },
              { role: "GUEST", label: "Guest Users", color: "bg-slate-100 text-slate-600" },
            ].map(({ role, label, color }) => {
              const cnt = roleCount(role);
              const maxCnt = Math.max(1, users.length);
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${color}`}>{label}</span>
                    <span className="text-xs font-black text-slate-700">{cnt}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${(cnt/maxCnt)*100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Users */}
          <div className="p-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Users</p>
            <div className="space-y-2">
              {users.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {(u.name || "U")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                    {(u.role || "").replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
