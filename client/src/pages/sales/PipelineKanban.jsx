import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import {
  Kanban as KanbanIcon, TrendingUp, DollarSign, Shield, Flame,
  Search, SlidersHorizontal, RefreshCw, Activity, User, Star, Zap, ChevronRight
} from "lucide-react";

const STAGES = [
  { id: "REQUESTED", title: "Requested", bg: "bg-slate-50", txt: "text-slate-700", accent: "#94a3b8" },
  { id: "DRAFT", title: "Draft", bg: "bg-slate-50", txt: "text-slate-700", accent: "#94a3b8" },
  { id: "SENT", title: "Sent to Client", bg: "bg-blue-50", txt: "text-blue-700", accent: "#3b82f6" },
  { id: "UNDER_NEGOTIATION", title: "Negotiation", bg: "bg-amber-50", txt: "text-amber-800", accent: "#f59e0b" },
  { id: "APPROVED", title: "Approved", bg: "bg-emerald-50", txt: "text-emerald-700", accent: "#10b981" },
  { id: "FULFILLMENT", title: "Fulfillment", bg: "bg-indigo-50", txt: "text-indigo-700", accent: "#6366f1" },
  { id: "PAID", title: "Won & Paid", bg: "bg-green-50", txt: "text-green-800", accent: "#22c55e" },
];

const TIER_COLORS = {
  PLATINUM: "bg-violet-100 text-violet-700 border-violet-200",
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  SILVER: "bg-slate-100 text-slate-600 border-slate-200",
  BRONZE: "bg-orange-100 text-orange-700 border-orange-200",
};

function HealthDot({ score }) {
  const s = parseInt(score || 100, 10);
  const cls = s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-500" : "bg-rose-500 animate-pulse";
  return <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${cls}`} />;
}

function ApprovalChip({ status }) {
  if (!status || status === "NOT_REQUIRED") return null;
  const map = {
    PENDING_MANAGER: ["Mgr", "bg-amber-50 text-amber-700 border-amber-200"],
    PENDING_FINANCE: ["Fin", "bg-purple-50 text-purple-700 border-purple-200"],
    APPROVED: ["\u2713", "bg-emerald-50 text-emerald-700 border-emerald-200"],
    REJECTED: ["\u2717", "bg-rose-50 text-rose-700 border-rose-200"],
  };
  const [label, cls] = map[status] || [];
  if (!label) return null;
  return <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${cls}`}>{label}</span>;
}

export const PipelineKanban = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => { loadPipeline(); }, []);

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const res = await api.get("/quotations");
      if (res.success) setQuotations(res.quotations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = quotations.filter((q) => {
    const matchSearch = !search ||
      (q.quotation_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.customer_name || "").toLowerCase().includes(search.toLowerCase());
    const matchTier = selectedTier === "ALL" || q.customer_tier === selectedTier;
    return matchSearch && matchTier;
  });

  const totalValue = quotations.reduce((s, q) => s + parseFloat(q.total_amount || 0), 0);
  const wonValue = quotations.filter(q => q.status === "PAID").reduce((s, q) => s + parseFloat(q.total_amount || 0), 0);
  const pendingApproval = quotations.filter(q => q.approval_status === "PENDING_MANAGER" || q.approval_status === "PENDING_FINANCE").length;
  const atRisk = quotations.filter(q => parseInt(q.health_score || 100, 10) < 40).length;

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative w-12 h-12">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full absolute" />
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute" />
        </div>
        <p className="text-sm text-slate-500 font-medium">Loading Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-100 flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                <KanbanIcon className="w-4 h-4 text-white" />
              </div>
              Sales Pipeline Kanban
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">End-to-end deal visibility governed by Gada Electronics discount policies</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadPipeline} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link to="/sales/quotations?create=true" className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:opacity-90 transition-all">
              <Zap className="w-3.5 h-3.5" /><span>New Deal</span>
            </Link>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: TrendingUp, label: "Pipeline", value: `\u20b9${(totalValue/100000).toFixed(1)}L`, bg: "bg-blue-50 border-blue-100", icb: "bg-blue-100", ic: "text-blue-600", vc: "text-blue-900", lc: "text-blue-600" },
            { icon: DollarSign, label: "Won", value: `\u20b9${(wonValue/100000).toFixed(1)}L`, bg: "bg-emerald-50 border-emerald-100", icb: "bg-emerald-100", ic: "text-emerald-600", vc: "text-emerald-900", lc: "text-emerald-600" },
            { icon: Shield, label: "Approvals", value: `${pendingApproval} Pending`, bg: "bg-amber-50 border-amber-100", icb: "bg-amber-100", ic: "text-amber-600", vc: "text-amber-900", lc: "text-amber-600" },
            { icon: Flame, label: "At Risk", value: `${atRisk} Deals`, bg: "bg-rose-50 border-rose-100", icb: "bg-rose-100", ic: "text-rose-600", vc: "text-rose-900", lc: "text-rose-600" },
          ].map(({ icon: Icon, label, value, bg, icb, ic, vc, lc }) => (
            <div key={label} className={`${bg} border rounded-2xl p-3 flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-xl ${icb} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${ic}`} />
              </div>
              <div>
                <p className={`text-[10px] font-semibold ${lc} uppercase tracking-wide`}>{label}</p>
                <p className={`text-sm font-black ${vc}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white" placeholder="Search quote # or customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {["ALL","PLATINUM","GOLD","SILVER","BRONZE"].map(t => (
              <button key={t} onClick={() => setSelectedTier(t)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedTier === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 overflow-y-hidden">
        <div className="flex gap-3 h-full pb-4" style={{ minWidth: `${STAGES.length * 272}px` }}>
          {STAGES.map((stage) => {
            const cards = filtered.filter(q => q.status === stage.id);
            const stageVal = cards.reduce((s, q) => s + parseFloat(q.total_amount || 0), 0);

            return (
              <div key={stage.id} className="flex flex-col rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex-1" style={{ minWidth: 260 }}>
                {/* Column Header */}
                <div className={`${stage.bg} border-b border-slate-200 p-3 shrink-0`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.accent }} />
                      <span className={`text-xs font-black ${stage.txt}`}>{stage.title}</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md text-white" style={{ backgroundColor: stage.accent }}>{cards.length}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">\u20b9{(stageVal/1000).toFixed(0)}K pipeline</p>
                  <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: totalValue > 0 ? `${Math.min(100,(stageVal/totalValue)*100)}%` : "0%", backgroundColor: stage.accent }} />
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Activity className="w-6 h-6 text-slate-200 mb-2" />
                      <p className="text-[11px] text-slate-400 font-medium">No deals</p>
                    </div>
                  ) : cards.map((q) => {
                    const margin = parseFloat(q.margin_pct || 0);
                    const health = parseInt(q.health_score || 100, 10);
                    const tierCls = TIER_COLORS[q.customer_tier] || TIER_COLORS.BRONZE;

                    return (
                      <Link
                        key={q.id}
                        to={`/sales/quotations/${q.id}`}
                        onMouseEnter={() => setHoveredCard(q.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`block bg-white rounded-xl border p-3 transition-all duration-200 ${hoveredCard === q.id ? "border-blue-300 shadow-md shadow-blue-100 -translate-y-0.5" : "border-slate-200 shadow-sm"}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <HealthDot score={health} />
                            <span className="text-[11px] font-black text-blue-600 truncate">{q.quotation_number}</span>
                          </div>
                          <ApprovalChip status={q.approval_status} />
                        </div>

                        <p className="text-xs font-bold text-slate-900 line-clamp-1 mb-1.5">{q.customer_name || "Unknown"}</p>

                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded border ${tierCls}`}>
                          <Star className="w-2.5 h-2.5" />{q.customer_tier || "BRONZE"}
                        </span>

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-xs font-black text-slate-900">\u20b9{parseFloat(q.total_amount || 0).toLocaleString("en-IN")}</p>
                            <p className="text-[10px] text-slate-400">Total Value</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-black ${margin >= 15 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-rose-600"}`}>{margin.toFixed(1)}%</p>
                            <p className="text-[10px] text-slate-400">Margin</p>
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px] text-slate-400 font-semibold">Health</span>
                            <span className="text-[9px] font-bold text-slate-600">{health}/100</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${health >= 70 ? "bg-emerald-500" : health >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${health}%` }} />
                          </div>
                        </div>

                        {q.salesperson_name && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-50">
                            <User className="w-3 h-3 text-slate-300" />
                            <span className="text-[9px] text-slate-400 truncate">{q.salesperson_name}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {cards.length > 0 && (
                  <div className="p-2 border-t border-slate-200 bg-white shrink-0">
                    <Link to={`/sales/quotations?status=${stage.id}`} className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-600 transition-colors py-1">
                      <span>View All ({cards.length})</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineKanban;
