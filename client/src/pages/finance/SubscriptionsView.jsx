import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import {
  Repeat,
  Calendar,
  Calculator,
  ArrowRight,
  Plus,
  XCircle,
  FileText,
  DollarSign,
  ShieldAlert,
  CheckCircle,
  X,
  Edit2,
  RefreshCw,
} from 'lucide-react';

export const SubscriptionsView = () => {
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'plans' | 'adjustments'
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Proration calculator state
  const [calcCurrentPrice, setCalcCurrentPrice] = useState(8999);
  const [calcNewPrice, setCalcNewPrice] = useState(24999);
  const [calcDaysRemaining, setCalcDaysRemaining] = useState(15);
  const [prorationResult, setProrationResult] = useState(null);

  // Cancel Modal
  const [cancelModalSub, setCancelModalSub] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer requested termination');

  // Modify Modal
  const [modifyModalSub, setModifyModalSub] = useState(null);
  const [modifyForm, setModifyForm] = useState({
    newPlanPrice: '',
    billingInterval: 'YEARLY',
  });

  // Add Plan Modal
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    billing_interval: 'YEARLY',
    price: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    if (activeTab === 'plans') loadPlans();
    if (activeTab === 'adjustments') loadAdjustments();
  }, [activeTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions');
      if (res.success) setSubscriptions(res.subscriptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await api.get('/subscriptions/plans');
      if (res.success) setPlans(res.plans || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdjustments = async () => {
    try {
      const res = await api.get('/subscriptions/adjustments');
      if (res.success) setAdjustments(res.adjustments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateProration = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/subscriptions/prorate', {
        currentPlanPrice: parseFloat(calcCurrentPrice),
        newPlanPrice: parseFloat(calcNewPrice),
        cycleTotalDays: 30,
        daysRemaining: parseInt(calcDaysRemaining, 10),
      });
      if (res.success) setProrationResult(res.proration);
    } catch (e) {
      alert('Calculation failed');
    }
  };

  const handleCancelSubscription = async (e) => {
    e.preventDefault();
    if (!cancelModalSub) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/subscriptions/${cancelModalSub.id}/cancel`, {
        reason: cancelReason,
      });
      if (res.success) {
        showToast(
          res.creditNote
            ? `Subscription cancelled! Credit note #${res.creditNote.adjustment_number} issued for ₹${parseFloat(res.creditNote.amount).toLocaleString()}`
            : 'Subscription cancelled successfully'
        );
        setCancelModalSub(null);
        await loadSubscriptions();
      }
    } catch (err) {
      alert(err.error || 'Failed to cancel subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModifySubscription = async (e) => {
    e.preventDefault();
    if (!modifyModalSub) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/subscriptions/${modifyModalSub.id}/modify`, {
        newPlanPrice: parseFloat(modifyForm.newPlanPrice),
        billingInterval: modifyForm.billingInterval,
      });
      if (res.success) {
        showToast('Subscription modified and billing schedule updated!');
        setModifyModalSub(null);
        await loadSubscriptions();
      }
    } catch (err) {
      alert(err.error || 'Failed to modify subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/subscriptions/plans', {
        ...planForm,
        planName: planForm.name,
        billingInterval: planForm.billing_interval,
        price: parseFloat(planForm.price),
        productId: 1,
      });
      if (res.success) {
        showToast(`Plan "${planForm.name}" created!`);
        setShowAddPlanModal(false);
        setPlanForm({
          name: '',
          code: '',
          billing_interval: 'YEARLY',
          price: '',
          description: '',
          is_active: true,
        });
        await loadPlans();
      }
    } catch (err) {
      alert(err.error || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-100 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-blue-600" />
            <span>Hybrid Subscription & Recurring Billing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage AMC maintenance contracts, cancellation credit notes, mid-cycle proration, and recurring interval plans.
          </p>
        </div>

        {activeTab === 'plans' && (
          <button
            onClick={() => setShowAddPlanModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recurring Plan</span>
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Active Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'plans'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Plan Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'adjustments'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Credit Notes & Adjustments</span>
        </button>
      </div>

      {/* TAB 1: Subscriptions & Proration */}
      {activeTab === 'subscriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Active Subscriptions & Schedule */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Active Customer Subscriptions ({subscriptions.length})
                  </h2>
                  <p className="text-xs text-slate-400">Recurring maintenance and warranty service agreements</p>
                </div>
              </div>

              {loading ? (
                <div className="p-12 flex justify-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <p className="text-xs font-semibold">No active subscriptions yet.</p>
                  <p className="text-[11px] mt-1">
                    Issue an invoice from a quotation with warranty/AMC lines to activate.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-xs">{sub.product_name}</h3>
                            <Badge status={sub.billing_interval} />
                            <Badge status={sub.status} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Account: <span className="font-bold text-slate-800">{sub.customer_name}</span> • Quote #{sub.quotation_number}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Active since {new Date(sub.start_date).toLocaleDateString()} • Next renewal: {new Date(sub.next_billing_date).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <span className="text-sm font-extrabold text-slate-900">
                            ₹{parseFloat(sub.recurring_amount).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            per {sub.billing_interval?.toLowerCase()}
                          </span>

                          {sub.status === 'ACTIVE' && (
                            <div className="flex items-center gap-2 mt-2 sm:justify-end">
                              <button
                                onClick={() => {
                                  setModifyModalSub(sub);
                                  setModifyForm({
                                    newPlanPrice: sub.recurring_amount,
                                    billingInterval: sub.billing_interval,
                                  });
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Modify Plan
                              </button>
                              <button
                                onClick={() => setCancelModalSub(sub)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Cancel & Refund
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upcoming Billing Schedule Dates */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" /> Next Cycles:
                        </span>
                        {(sub.schedules || []).slice(0, 3).map((sch) => (
                          <span
                            key={sch.id}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-100"
                          >
                            {new Date(sch.billing_date).toLocaleDateString()} — ₹{parseFloat(sch.amount).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Proration Engine Calculator */}
          <div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calculator className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    Proration Adjustment Engine
                  </h3>
                  <p className="text-[10px] text-slate-400">Calculates mid-cycle upgrade/downgrade adjustments</p>
                </div>
              </div>

              <form onSubmit={handleCalculateProration} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Current Plan Price (₹)
                  </label>
                  <input
                    type="number"
                    value={calcCurrentPrice}
                    onChange={(e) => setCalcCurrentPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Upgraded Plan Price (₹)
                  </label>
                  <input
                    type="number"
                    value={calcNewPrice}
                    onChange={(e) => setCalcNewPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Unused Days Remaining in Cycle
                  </label>
                  <input
                    type="number"
                    value={calcDaysRemaining}
                    onChange={(e) => setCalcDaysRemaining(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  Compute Proration
                </button>
              </form>

              {prorationResult && (
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Unused Credit:</span>
                    <span className="font-bold text-emerald-600">-₹{prorationResult.unusedCredit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">New Plan Prorated Cost:</span>
                    <span className="font-bold text-slate-900">+₹{prorationResult.newPlanProratedCost}</span>
                  </div>
                  <div className="pt-2 border-t border-blue-200 flex justify-between font-extrabold text-slate-900 text-sm">
                    <span>Net Adjustment:</span>
                    <span className="text-blue-700">₹{prorationResult.netAdjustment}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Plan Configuration */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">Standard Recurring Plans ({plans.length})</h3>
              <p className="text-xs text-slate-500">
                Templates configured for monthly hardware maintenance, quarterly support, and annual enterprise AMC.
              </p>
            </div>
            <button
              onClick={() => setShowAddPlanModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              + Add Plan
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((pl) => (
              <div key={pl.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {pl.code}
                  </span>
                  <Badge status={pl.billing_interval} />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">{pl.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{pl.description}</p>
                <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900">
                    ₹{parseFloat(pl.price).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ {pl.billing_interval?.toLowerCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Credit Notes & Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">
              Billing Adjustments & Credit Notes ({adjustments.length})
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of partial refunds and credits created from mid-cycle terminations and proration downgrades.
            </p>
          </div>

          {adjustments.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No adjustments or credit notes recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
                  <tr>
                    <th className="py-3 px-4">Adjustment #</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Amount (INR)</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{adj.adjustment_number}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded">
                          {adj.adjustment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{adj.customer_name || 'Enterprise Account'}</td>
                      <td className="py-3 px-4 font-black text-emerald-600">
                        ₹{parseFloat(adj.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{adj.reason}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(adj.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Cancel Subscription & Issue Credit Note */}
      {cancelModalSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Cancel Subscription</h3>
              <button onClick={() => setCancelModalSub(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubscription} className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-bold">Cancellation Policy:</p>
                <p className="mt-0.5">
                  Terminating "{cancelModalSub.product_name}" for {cancelModalSub.customer_name}. The system will automatically compute remaining unearned days and issue a formal Credit Note in `billing_adjustments`.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cancellation Reason</label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalSub(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Termination & Issue Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Modify Subscription */}
      {modifyModalSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Modify Subscription Plan</h3>
              <button onClick={() => setModifyModalSub(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModifySubscription} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Recurring Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={modifyForm.newPlanPrice}
                  onChange={(e) => setModifyForm({ ...modifyForm, newPlanPrice: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Interval</label>
                <select
                  value={modifyForm.billingInterval}
                  onChange={(e) => setModifyForm({ ...modifyForm, billingInterval: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModifyModalSub(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Apply Mid-Cycle Modification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Recurring Plan */}
      {showAddPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Recurring Subscription Plan</h3>
              <button onClick={() => setShowAddPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Enterprise 24/7 Hardware Support"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Code</label>
                  <input
                    type="text"
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. AMC-ENT-247"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interval</label>
                  <select
                    value={planForm.billing_interval}
                    onChange={(e) => setPlanForm({ ...planForm, billing_interval: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recurring Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  placeholder="e.g. 15000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Coverage inclusions, response time SLAs..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsView;
