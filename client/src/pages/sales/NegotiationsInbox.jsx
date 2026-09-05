import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import {
  MessageSquare,
  CheckCircle,
  RotateCcw,
  XCircle,
  ArrowUpRight,
  Building,
  TrendingDown,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
} from 'lucide-react';

// ─── Mini Chip ────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const map = {
    OPEN: 'bg-amber-100 text-amber-800 border-amber-300',
    ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    COUNTERED: 'bg-blue-100 text-blue-800 border-blue-300',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
    PENDING_APPROVAL: 'bg-purple-100 text-purple-800 border-purple-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

// ─── Negotiation Row Card ─────────────────────────────────
const NegotiationCard = ({ neg, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [responding, setResponding] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [counterPct, setCounterPct] = useState(
    parseFloat(neg.requested_discount_pct || 5).toFixed(0)
  );
  const [rejectReason, setRejectReason] = useState('');
  const [actionMode, setActionMode] = useState(null); // 'counter' | 'reject' | 'comment'

  const quotationId = neg.quotation_id;
  const isOpen = neg.status === 'OPEN';

  const respond = async (action, extra = {}) => {
    try {
      setResponding(true);
      await api.post(`/negotiations/${quotationId}/respond`, {
        negotiationId: neg.id,
        action,
        ...extra,
      });
      setActionMode(null);
      setCommentText('');
      setRejectReason('');
      onRefresh();
    } catch (err) {
      alert(err.error || 'Action failed. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setResponding(true);
      await api.post(`/negotiations/${quotationId}/comment`, {
        commentText: commentText.trim(),
      });
      setCommentText('');
      onRefresh();
    } catch (err) {
      alert(err.error || 'Could not send message.');
    } finally {
      setResponding(false);
    }
  };

  const discountRequested = parseFloat(neg.requested_discount_pct || 0);
  const prevTotal = parseFloat(neg.previous_total || 0);
  const counterTotal = parseFloat(neg.counter_total || 0);
  const savings = prevTotal - counterTotal;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isOpen ? 'border-amber-300' : 'border-slate-200'}`}>
      {/* Top Banner for open negotiations */}
      {isOpen && (
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />
      )}

      {/* Card Header */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Left: Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 text-sm">{neg.quotation_number}</span>
              <StatusChip status={neg.status} />
              {isOpen && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3 h-3" /> Action Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">{neg.customer_name}</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                {neg.customer_tier} TIER
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Submitted: {new Date(neg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Right: Price Stats */}
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Discount Req.</p>
              <p className="text-lg font-black text-amber-600">{discountRequested}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Original</p>
              <p className="text-sm font-bold text-slate-500 line-through">₹{prevTotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Proposed</p>
              <p className="text-sm font-black text-emerald-700">₹{counterTotal.toLocaleString('en-IN')}</p>
            </div>
            {savings > 0 && (
              <div className="text-center">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Saving Ask</p>
                <p className="text-sm font-black text-rose-600">-₹{savings.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Notes */}
        {neg.notes && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">Customer Rationale</p>
            <p className="text-xs text-amber-900 italic">"{neg.notes}"</p>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
          {/* Primary Actions */}
          {isOpen && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => respond('ACCEPT', { responseMessage: 'Accepted customer counter-offer terms. Commercial agreement reached.' })}
                disabled={responding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Accept Terms
              </button>
              <button
                onClick={() => setActionMode(actionMode === 'counter' ? null : 'counter')}
                disabled={responding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Counter Back
              </button>
              <button
                onClick={() => setActionMode(actionMode === 'reject' ? null : 'reject')}
                disabled={responding}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Decline
              </button>
            </div>
          )}

          {/* Secondary: View Full Quote + Expand Thread */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setActionMode(actionMode === 'comment' ? null : 'comment')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Thread {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <Link
              to={`/sales/quotations/${quotationId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all"
            >
              Open Quote <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Inline Counter Form */}
        {actionMode === 'counter' && (
          <div className="mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Send Counter-Offer</p>
            <div className="flex items-center gap-3">
              <label className="text-xs text-blue-700 font-semibold whitespace-nowrap">Your Offer (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={counterPct}
                onChange={(e) => setCounterPct(e.target.value)}
                className="w-20 border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-blue-600">% discount on all lines</span>
            </div>
            <input
              type="text"
              placeholder="Optional message to customer..."
              className="w-full border border-blue-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setCommentText(e.target.value)}
              value={commentText}
            />
            <div className="flex gap-2">
              <button
                onClick={() => respond('COUNTER', {
                  counterDiscountPct: parseFloat(counterPct),
                  responseMessage: commentText || `Sales Rep proposed ${counterPct}% discount as revised commercial terms.`,
                })}
                disabled={responding}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {responding ? 'Sending...' : 'Send Counter-Offer'}
              </button>
              <button onClick={() => setActionMode(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline Reject Form */}
        {actionMode === 'reject' && (
          <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">Decline Customer Request</p>
            <textarea
              rows={2}
              placeholder="State reason for declining (shown to customer)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-rose-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => respond('REJECT', {
                  responseMessage: rejectReason || 'Unable to accept requested terms due to minimum distributor margin requirements.',
                })}
                disabled={responding}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {responding ? 'Declining...' : 'Confirm Decline'}
              </button>
              <button onClick={() => setActionMode(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message/Comment form */}
        {actionMode === 'comment' && (
          <form onSubmit={sendComment} className="mt-3 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Send a message to the customer about this negotiation..."
              className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || responding}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Expanded Thread */}
      {expanded && neg.comments && neg.comments.length > 0 && (
        <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
            Negotiation Thread ({neg.comments.length} messages)
          </p>
          {neg.comments.map((c, idx) => {
            const isRep = ['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(c.author_role);
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl text-xs ${isRep ? 'bg-blue-50 border border-blue-200 ml-8' : 'bg-white border border-slate-200 mr-8'}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-bold text-[11px] ${isRep ? 'text-blue-800' : 'text-slate-700'}`}>
                    {c.author_name || (isRep ? 'Sales Rep' : neg.customer_name)}
                    <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[9px] rounded font-bold">
                      {c.author_role}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-700">{c.comment_text}</p>
              </div>
            );
          })}
        </div>
      )}
      {expanded && (!neg.comments || neg.comments.length === 0) && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 text-center">
          <p className="text-xs text-slate-400 italic">No messages in this thread yet.</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────
export const NegotiationsInbox = () => {
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');

  useEffect(() => {
    loadNegotiations();
  }, []);

  const loadNegotiations = async () => {
    try {
      setLoading(true);
      // Load all quotations with negotiation data
      const res = await api.get('/quotations?limit=100');
      if (!res.success) return;

      // For each quotation that's UNDER_NEGOTIATION or has negotiations, gather data
      const negsWithQuoteInfo = [];
      const negotiationQuotes = (res.quotations || []).filter(
        (q) => q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT'
      );

      for (const q of negotiationQuotes) {
        try {
          const negRes = await api.get(`/negotiations/${q.id}`);
          if (negRes.success && negRes.negotiations && negRes.negotiations.length > 0) {
            const latest = negRes.negotiations[0];
            negsWithQuoteInfo.push({
              ...latest,
              quotation_id: q.id,
              quotation_number: q.quotation_number,
              customer_name: q.customer_name,
              customer_tier: q.customer_tier,
              comments: negRes.comments || [],
            });
          }
        } catch (_) {}
      }

      setNegotiations(negsWithQuoteInfo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'ALL'
    ? negotiations
    : negotiations.filter((n) => n.status === filter);

  const openCount = negotiations.filter((n) => n.status === 'OPEN').length;
  const totalCount = negotiations.length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <MessageSquare className="w-5 h-5 text-amber-600" />
            </div>
            Customer Negotiations Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Respond to customer counter-offers, counter back, or message customers directly from here.
          </p>
        </div>
        <button
          onClick={loadNegotiations}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Action Required', value: openCount, color: 'amber', icon: AlertTriangle },
          { label: 'Total Negotiations', value: totalCount, color: 'blue', icon: MessageSquare },
          { label: 'Accepted', value: negotiations.filter(n => n.status === 'ACCEPTED').length, color: 'emerald', icon: CheckCircle },
          { label: 'Countered', value: negotiations.filter(n => n.status === 'COUNTERED').length, color: 'purple', icon: RotateCcw },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm`}>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'OPEN', label: 'Open' },
          { key: 'COUNTERED', label: 'Countered' },
          { key: 'ACCEPTED', label: 'Accepted' },
          { key: 'REJECTED', label: 'Declined' },
          { key: 'ALL', label: 'All' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {key === 'OPEN' && openCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded-full font-black">
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Negotiation Cards */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-600">
            {filter === 'OPEN' ? 'No pending negotiations' : `No ${filter.toLowerCase()} negotiations`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {filter === 'OPEN'
              ? 'Customer counter-offers on your quotations will appear here.'
              : 'Switch filters to see other negotiations.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((neg) => (
            <NegotiationCard key={neg.id} neg={neg} onRefresh={loadNegotiations} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NegotiationsInbox;
