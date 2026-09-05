import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import {
  Users, Search, Building2, Phone, Mail, Star, TrendingUp,
  ChevronRight, Filter, RefreshCw, Briefcase, DollarSign,
  MapPin, Calendar, Award, ArrowUpRight
} from "lucide-react";

const TIER_CONFIG = {
  PLATINUM: { cls: "bg-violet-100 text-violet-700 border-violet-300", dot: "bg-violet-500" },
  GOLD: { cls: "bg-amber-100 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  SILVER: { cls: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-400" },
  BRONZE: { cls: "bg-orange-100 text-orange-700 border-orange-300", dot: "bg-orange-400" },
};

export const CustomersView = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customers");
      if (res.success) setCustomers(res.customers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      (c.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "ALL" || c.customer_tier === tierFilter;
    return matchSearch && matchTier;
  });

  const stats = {
    total: customers.length,
    platinum: customers.filter(c => c.customer_tier === "PLATINUM").length,
    gold: customers.filter(c => c.customer_tier === "GOLD").length,
    active: customers.filter(c => c.assigned_salesperson_id).length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
              <Users className="w-4 h-4 text-white" />
            </div>
            B2B Customer Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage enterprise customer accounts, tiers and account health</p>
        </div>
        <button onClick={loadCustomers} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Accounts", value: stats.total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
          { label: "Platinum Tier", value: stats.platinum, icon: Award, color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
          { label: "Gold Tier", value: stats.gold, icon: Star, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Assigned", value: stats.active, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-2xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-500 font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Customer List */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-slate-50" placeholder="Search by company, contact, email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              {["ALL","PLATINUM","GOLD","SILVER","BRONZE"].map(t => (
                <button key={t} onClick={() => setTierFilter(t)} className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${tierFilter === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium">No customers found</p>
                </div>
              ) : filtered.map(c => {
                const tier = TIER_CONFIG[c.customer_tier] || TIER_CONFIG.BRONZE;
                const isSelected = selected?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(isSelected ? null : c)}
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? "bg-blue-50/50 border-l-4 border-l-blue-500" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {(c.company_name || "?")[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-black text-slate-900 truncate">{c.company_name}</p>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border ${tier.cls} shrink-0`}>
                          {c.customer_tier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{c.contact_person} · {c.email}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {c.salesperson_name && (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[9px] font-bold">
                            {(c.salesperson_name || "B")[0]}
                          </div>
                          <span className="font-medium truncate max-w-[80px]">{c.salesperson_name}</span>
                        </div>
                      )}
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "rotate-90 text-blue-500" : ""}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Detail Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">Select a customer</p>
              <p className="text-xs text-slate-400 mt-1">Click any row to view account details</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl mx-auto mb-3 shadow-md">
                  {(selected.company_name || "?")[0].toUpperCase()}
                </div>
                <h3 className="text-base font-black text-slate-900">{selected.company_name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${(TIER_CONFIG[selected.customer_tier] || TIER_CONFIG.BRONZE).cls}`}>
                    {selected.customer_tier} TIER
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {[
                  { icon: Users, label: "Contact", value: selected.contact_person },
                  { icon: Mail, label: "Email", value: selected.email },
                  { icon: Phone, label: "Phone", value: selected.phone },
                  { icon: MapPin, label: "Billing", value: selected.billing_address },
                  { icon: Briefcase, label: "Sales Rep", value: selected.salesperson_name || "Unassigned" },
                ].map(({ icon: Icon, label, value }) => value && (
                  <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 break-all">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
                <Link to={`/sales/quotations?customer=${selected.id}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">View Quotations</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </Link>
                <Link to="/sales/products" className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:border-emerald-300 transition-all">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">Build Quotation</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersView;
