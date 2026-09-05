import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import {
  Flame,
  AlertTriangle,
  Activity,
  ShieldAlert,
  ArrowRight,
  User,
  Bell,
  TrendingUp,
  AlertOctagon,
  Clock,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export const DealHealthView = () => {
  const [healthData, setHealthData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id of deal being nudged/escalated

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, anomalyRes] = await Promise.all([
        api.get('/deals/overview'),
        api.get('/deals/anomalies'),
      ]);

      if (overviewRes.success) setHealthData(overviewRes);
      if (anomalyRes.success) setAnomalies(anomalyRes.anomalies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNudgeRep = async (quotationId, repName) => {
    try {
      setActionLoading(`nudge-${quotationId}`);
      const res = await api.post('/deals/nudge', {
        quotationId,
        message: 'Manager nudge: Please follow up on this stalled deal immediately.',
      });
      if (res.success) {
        showToast(`Nudge notification dispatched to sales rep (${repName})!`);
      }
    } catch (err) {
      alert(err.error || 'Failed to send nudge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalateDeal = async (quotationId) => {
    try {
      setActionLoading(`esc-${quotationId}`);
      const res = await api.post('/deals/escalate', {
        quotationId,
        reason: 'Severe deal health deterioration or discount anomaly requiring executive intervention.',
      });
      if (res.success) {
        showToast('Deal escalated to Executive Operations and flagged in audit log!');
        await loadData();
      }
    } catch (err) {
      alert(err.error || 'Failed to escalate deal');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = healthData?.stats || {};
  const atRiskDeals = healthData?.atRiskDeals || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-100 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Flame className="w-6 h-6 text-rose-600" />
          <span>Deal Health Engine & Anomaly Detection</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Algorithmic health scoring (0-100) tracking customer inactivity, discount erosion, approval bottlenecks, and delivery promise slippage.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Deal Health"
          value={`${Math.round(stats.average_health_score || 85)}/100`}
          subtitle="Portfolio health score"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Healthy Deals"
          value={stats.healthy_count || 0}
          subtitle="Score 70-100"
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="At-Risk Deals"
          value={stats.at_risk_count || 0}
          subtitle="Score 40-69 (Action needed)"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Critical Deals"
          value={stats.critical_count || 0}
          subtitle="Score < 40 (Immediate intervention)"
          icon={Flame}
          color="rose"
        />
      </div>

      {/* Discount Anomalies Alert */}
      {anomalies.length > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Salesperson Discount Anomalies Detected ({anomalies.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalies.map((a) => (
              <div key={a.id} className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{a.customer_name}</span>
                    <Badge status={a.severity} />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{a.description}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-medium">
                  <span>Rep: {a.salesperson_name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNudgeRep(a.quotation_id, a.salesperson_name)}
                      disabled={actionLoading === `nudge-${a.quotation_id}`}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" />
                      <span>{actionLoading === `nudge-${a.quotation_id}` ? 'Nudging...' : 'Nudge Rep'}</span>
                    </button>
                    <button
                      onClick={() => handleEscalateDeal(a.quotation_id)}
                      disabled={actionLoading === `esc-${a.quotation_id}`}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <AlertOctagon className="w-3 h-3" />
                      <span>{actionLoading === `esc-${a.quotation_id}` ? 'Escalating...' : 'Escalate'}</span>
                    </button>
                    <Link
                      to={`/sales/quotations/${a.quotation_id}`}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-0.5 ml-1"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-Risk Deals Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">At-Risk & Stalled Pipeline Deals ({atRiskDeals.length})</h2>
          <p className="text-xs text-slate-400">
            Deals penalized for customer inactivity, approval bottlenecks, delivery promise slippage, or severe discount margin leaks
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Deal Value</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Delivery Promise</th>
                <th className="py-3 px-4">Penalty Explanation</th>
                <th className="py-3 px-4 text-right">Intervention Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {atRiskDeals.map((deal) => {
                const hasDeliverySlippage =
                  deal.delivery_slippage_deduction > 0 ||
                  (deal.explanation && deal.explanation.toLowerCase().includes('delivery'));

                return (
                  <tr key={deal.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-bold text-blue-600">
                      <Link to={`/sales/quotations/${deal.quotation_id}`} className="hover:underline">
                        {deal.quotation_number}
                      </Link>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">{deal.customer_name}</td>
                    <td className="py-4 px-4 text-slate-600">{deal.salesperson_name}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      ₹{parseFloat(deal.total_amount).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            deal.health_score >= 70
                              ? 'bg-emerald-500'
                              : deal.health_score >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        ></span>
                        <span className="font-extrabold text-slate-900">{deal.health_score}/100</span>
                        <Badge status={deal.status} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {hasDeliverySlippage ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[10px] rounded-full flex items-center gap-1 w-fit">
                          <Truck className="w-3 h-3 text-rose-600" />
                          <span>Promise Slippage</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">On Schedule</span>
                      )}
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 font-medium">{deal.explanation}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleNudgeRep(deal.quotation_id, deal.salesperson_name)}
                          disabled={actionLoading === `nudge-${deal.quotation_id}`}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Bell className="w-3 h-3" />
                          <span>{actionLoading === `nudge-${deal.quotation_id}` ? 'Nudging...' : 'Nudge'}</span>
                        </button>
                        <button
                          onClick={() => handleEscalateDeal(deal.quotation_id)}
                          disabled={actionLoading === `esc-${deal.quotation_id}`}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <AlertOctagon className="w-3 h-3" />
                          <span>{actionLoading === `esc-${deal.quotation_id}` ? 'Escalating...' : 'Escalate'}</span>
                        </button>
                        <Link
                          to={`/sales/quotations/${deal.quotation_id}`}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold rounded-lg text-[11px] transition-colors inline-block"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DealHealthView;
