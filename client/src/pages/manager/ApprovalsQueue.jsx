import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import { ShieldCheck, Check, X, RotateCcw, AlertTriangle, Building, Eye } from 'lucide-react';

export const ApprovalsQueue = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decisionModal, setDecisionModal] = useState({ isOpen: false, type: '', req: null });
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals');
      if (res.success) setRequests(res.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!decisionModal.req || !decisionModal.type) return;

    try {
      setProcessing(true);
      const endpoint =
        decisionModal.req.level === 'FINANCE'
          ? '/approvals/finance-decide'
          : '/approvals/manager-decide';

      const res = await api.post(endpoint, {
        quotationId: decisionModal.req.quotation_id,
        decision: decisionModal.type,
        comments,
      });

      alert(res.message);
      setDecisionModal({ isOpen: false, type: '', req: null });
      setComments('');
      await loadApprovals();
    } catch (err) {
      alert(err.error || 'Decision failed');
    } finally {
      setProcessing(false);
    }
  };

  // Approval chain stepper component
  const ApprovalStepper = ({ level }) => {
    const steps = [
      { id: 'MANAGER', label: 'Sales Manager Review', sub: 'Tier 1 — Discount & margin governance' },
      { id: 'FINANCE', label: 'Finance Sign-off', sub: 'Tier 2 — High-risk or strategic exceptions' },
    ];
    const activeIdx = steps.findIndex(s => s.id === level);
    return (
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <React.Fragment key={step.id}>
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-amber-500 text-white shadow-md shadow-amber-400/30' :
                isDone ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? 'bg-white text-amber-600' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div>
                  <p className="leading-tight">{step.label}</p>
                  <p className={`text-[10px] font-medium ${isActive ? 'text-amber-100' : 'opacity-70'}`}>{step.sub}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 ${isDone || isActive ? 'bg-amber-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
            <span>Governance Approval Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate quotations exceeding commercial discount ceilings or margin tolerances.
          </p>
        </div>
        {/* Approval chain stepper — shows current overall queue level */}
        {requests.length > 0 && (
          <ApprovalStepper level={requests[0]?.level || 'MANAGER'} />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-800">All Approvals Cleared!</p>
            <p className="text-xs mt-1">No quotations currently require governance sign-off.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer & Tier</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Margin %</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Governance Exception Reason</th>
                  <th className="py-3 px-4 text-right">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-bold text-blue-600">
                      <Link to={`/sales/quotations/${req.quotation_id}`} className="hover:underline flex items-center gap-1">
                        <span>{req.quotation_number}</span>
                        <Eye className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900">{req.customer_name}</p>
                      <Badge status={req.customer_tier} />
                    </td>

                    <td className="py-4 px-4 text-slate-600 font-medium">{req.salesperson_name}</td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      ₹{parseFloat(req.total_amount).toLocaleString()}
                    </td>

                    <td className="py-4 px-4 font-bold">
                      <span className={parseFloat(req.margin_pct) >= 15 ? 'text-emerald-600' : 'text-amber-600'}>
                        {parseFloat(req.margin_pct).toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg text-xs">
                        {parseFloat(req.risk_score).toFixed(1)}% Risk
                      </span>
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 font-medium line-clamp-2">{req.risk_summary}</p>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDecisionModal({ isOpen: true, type: 'APPROVE', req })}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors font-bold flex items-center gap-1 text-[11px] px-2.5"
                          title="Approve Quotation"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => setDecisionModal({ isOpen: true, type: 'RETURN', req })}
                          className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg transition-colors font-bold flex items-center gap-1 text-[11px] px-2.5"
                          title="Return for Revision"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Return</span>
                        </button>

                        <button
                          onClick={() => setDecisionModal({ isOpen: true, type: 'REJECT', req })}
                          className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-colors font-bold flex items-center gap-1 text-[11px] px-2.5"
                          title="Reject Quotation"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Confirm Decision: <span className="uppercase text-blue-600">{decisionModal.type}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Quotation {decisionModal.req?.quotation_number} for {decisionModal.req?.customer_name}
            </p>

            <form onSubmit={handleDecision} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Feedback / Audit Reason
                </label>
                <textarea
                  rows="3"
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    decisionModal.type === 'APPROVE'
                      ? 'e.g. Strategic customer relationship; approved bundle discount exception.'
                      : 'e.g. Discount is too aggressive; please reduce installation discount to 10% maximum.'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal({ isOpen: false, type: '', req: null })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md ${
                    decisionModal.type === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionModal.type === 'RETURN'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processing ? 'Processing...' : `Submit ${decisionModal.type}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsQueue;
