import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpRight,
  AlertTriangle,
  Building,
  RefreshCw,
  Info,
  Hourglass,
} from 'lucide-react';

// ─── Progress Bar for Approval Chain ─────────────────────
const ApprovalProgressBar = ({ approvalStatus, riskScore }) => {
  const steps = [
    {
      label: 'Submitted',
      done: true,
      color: 'bg-blue-500',
    },
    {
      label: 'Manager Review',
      done: ['MANAGER_APPROVED', 'APPROVED'].includes(approvalStatus),
      active: approvalStatus === 'PENDING_MANAGER',
      rejected: approvalStatus === 'REJECTED',
      color: 'bg-emerald-500',
    },
    {
      label: 'Finance Review',
      done: approvalStatus === 'APPROVED' && parseFloat(riskScore) > 20,
      active: approvalStatus === 'PENDING_FINANCE',
      rejected: false,
      hidden: parseFloat(riskScore) <= 20,
      color: 'bg-purple-500',
    },
    {
      label: 'Approved',
      done: approvalStatus === 'APPROVED',
      active: false,
      color: 'bg-emerald-500',
    },
  ].filter((s) => !s.hidden);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  step.rejected
                    ? 'bg-rose-500 border-rose-600'
                    : step.done
                    ? `${step.color} border-transparent`
                    : step.active
                    ? 'bg-white border-amber-500 animate-pulse'
                    : 'bg-white border-slate-200'
                }`}
              >
                {step.rejected ? (
                  <XCircle className="w-3.5 h-3.5 text-white" />
                ) : step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : step.active ? (
                  <Hourglass className="w-3 h-3 text-amber-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                )}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                  step.rejected
                    ? 'text-rose-600'
                    : step.done
                    ? 'text-emerald-600'
                    : step.active
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 -mt-5 ${
                  step.done ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ─── Approval Status Row Card ─────────────────────────────
const ApprovalCard = ({ quote }) => {
  const riskScore = parseFloat(quote.risk_score || 0);
  const isRejected = quote.approval_status === 'REJECTED';
  const isApproved = quote.approval_status === 'APPROVED';
  const isPending = quote.approval_status?.startsWith('PENDING');
  const isReturned = quote.status === 'RETURNED_FOR_REVISION';
  const notRequired = quote.approval_status === 'NOT_REQUIRED';

  const borderClass = isRejected
    ? 'border-rose-300 bg-rose-50/30'
    : isPending
    ? 'border-amber-300 bg-amber-50/20'
    : isApproved
    ? 'border-emerald-300 bg-emerald-50/20'
    : isReturned
    ? 'border-purple-300 bg-purple-50/20'
    : 'border-slate-200';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${borderClass}`}>
      {/* Accent bar */}
      <div
        className={`h-1 ${
          isRejected
            ? 'bg-rose-500'
            : isPending
            ? 'bg-gradient-to-r from-amber-400 to-orange-400'
            : isApproved
            ? 'bg-emerald-500'
            : isReturned
            ? 'bg-purple-500'
            : 'bg-slate-200'
        }`}
      />

      <div className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Left: Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 text-sm">{quote.quotation_number}</span>
              <Badge status={quote.status} />
              <Badge status={quote.approval_status} />
              {isReturned && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  <RotateCcw className="w-3 h-3" /> Revise & Resubmit
                </span>
              )}
              {isPending && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="w-3 h-3 animate-pulse" /> Awaiting Review
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">{quote.customer_name}</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                {quote.customer_tier} TIER
              </span>
            </div>
          </div>

          {/* Right: Amounts */}
          <div className="flex gap-5 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
              <p className="text-base font-black text-slate-900">
                ₹{parseFloat(quote.total_amount || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Margin</p>
              <p
                className={`text-base font-black ${
                  parseFloat(quote.margin_pct) >= 15
                    ? 'text-emerald-600'
                    : parseFloat(quote.margin_pct) >= 8
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {parseFloat(quote.margin_pct || 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Risk Score</p>
              <p
                className={`text-base font-black ${
                  riskScore > 10 ? 'text-rose-600' : riskScore > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {riskScore.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Approval Chain Progress */}
        {!notRequired && (
          <ApprovalProgressBar approvalStatus={quote.approval_status} riskScore={quote.risk_score} />
        )}

        {notRequired && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-800 font-medium">
              No approval needed — discount within allowed limits. Quote can be sent directly to customer.
            </p>
          </div>
        )}

        {/* Rejection Reason / Return Reason */}
        {(isRejected || isReturned) && quote.rejection_reason && (
          <div className={`p-2.5 rounded-xl border text-xs ${isRejected ? 'bg-rose-50 border-rose-200' : 'bg-purple-50 border-purple-200'}`}>
            <p className={`font-bold uppercase tracking-wide text-[10px] mb-0.5 ${isRejected ? 'text-rose-700' : 'text-purple-700'}`}>
              {isRejected ? 'Rejection Reason' : 'Revision Required'}
            </p>
            <p className={`${isRejected ? 'text-rose-800' : 'text-purple-800'}`}>{quote.rejection_reason}</p>
          </div>
        )}

        {/* Footer: Date & Action */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" />
            <span>
              Updated: {new Date(quote.updated_at || quote.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <Link
            to={`/sales/quotations/${quote.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all"
          >
            Open Quotation <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────
export const ApprovalTracker = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotations?limit=100');
      if (res.success) setQuotations(res.quotations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Exclude DRAFT + NOT_REQUIRED unless filter = ALL
  const withApprovalAction = quotations.filter(
    (q) => q.approval_status && q.approval_status !== 'NOT_REQUIRED' || q.status === 'PENDING_APPROVAL' || q.status === 'RETURNED_FOR_REVISION'
  );

  const pendingCount = withApprovalAction.filter((q) => q.approval_status?.startsWith('PENDING')).length;
  const approvedCount = withApprovalAction.filter((q) => q.approval_status === 'APPROVED').length;
  const rejectedCount = withApprovalAction.filter((q) => q.approval_status === 'REJECTED').length;
  const returnedCount = withApprovalAction.filter((q) => q.status === 'RETURNED_FOR_REVISION').length;

  const filtered = (() => {
    switch (filter) {
      case 'PENDING':
        return withApprovalAction.filter((q) => q.approval_status?.startsWith('PENDING') || q.status === 'PENDING_APPROVAL');
      case 'APPROVED':
        return withApprovalAction.filter((q) => q.approval_status === 'APPROVED');
      case 'REJECTED':
        return withApprovalAction.filter((q) => q.approval_status === 'REJECTED');
      case 'RETURNED':
        return withApprovalAction.filter((q) => q.status === 'RETURNED_FOR_REVISION');
      default:
        return withApprovalAction;
    }
  })();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
            </div>
            Approval Status Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track where each of your quotations stands in the approval chain — in real time.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Awaiting Approval', value: pendingCount, color: 'amber', icon: Clock },
          { label: 'Approved', value: approvedCount, color: 'emerald', icon: CheckCircle2 },
          { label: 'Rejected', value: rejectedCount, color: 'rose', icon: XCircle },
          { label: 'Needs Revision', value: returnedCount, color: 'purple', icon: RotateCcw },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-black mt-0.5 text-${color}-600`}>{value}</p>
              </div>
              <div className={`p-2 bg-${color}-50 rounded-xl`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box about Blended Risk */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-0.5">
          <p className="font-bold">How approval routing works</p>
          <p>
            When you submit a quotation, the system computes a <strong>Blended Discount Risk Score</strong> across every product line. 
            Risk Score <strong>&gt; 5%</strong> → Sales Manager review. Risk Score <strong>&gt; 20%</strong> → Finance approval also required.
            Mixed categories (hardware vs. services) are evaluated against their own separate ceilings.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'PENDING', label: 'Pending', count: pendingCount },
          { key: 'APPROVED', label: 'Approved', count: approvedCount },
          { key: 'REJECTED', label: 'Rejected', count: rejectedCount },
          { key: 'RETURNED', label: 'Revision', count: returnedCount },
          { key: 'ALL', label: 'All', count: withApprovalAction.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-black ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-600">
            {filter === 'PENDING' ? 'No pending approvals' : `No ${filter.toLowerCase()} quotations`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {filter === 'PENDING'
              ? 'Your submitted quotations will appear here once sent for approval.'
              : 'Switch filters to view other status categories.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <ApprovalCard key={q.id} quote={q} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalTracker;
