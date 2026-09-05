import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import { Sliders, ShieldCheck, Plus, Edit2, X, AlertTriangle, CheckCircle } from 'lucide-react';

export const DiscountRules = () => {
  const [discountRules, setDiscountRules] = useState([]);
  const [approvalRules, setApprovalRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    rule_type: 'CUSTOMER_TIER',
    target_tier: 'BRONZE',
    target_id: null,
    max_discount_pct: 10,
    description: '',
  });

  const [editingDiscountRule, setEditingDiscountRule] = useState(null);
  const [editingApprovalRule, setEditingApprovalRule] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const [dRes, aRes, cRes] = await Promise.all([
        api.get('/admin/discount-rules'),
        api.get('/admin/approval-rules'),
        api.get('/categories'),
      ]);

      if (dRes.success) setDiscountRules(dRes.rules || []);
      if (aRes.success) setApprovalRules(aRes.rules || []);
      if (cRes.success) setCategories(cRes.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscountRule = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        rule_type: discountForm.rule_type,
        target_tier: discountForm.rule_type === 'CUSTOMER_TIER' ? discountForm.target_tier : null,
        target_id: discountForm.rule_type === 'CATEGORY' ? parseInt(discountForm.target_id, 10) : null,
        max_discount_pct: parseFloat(discountForm.max_discount_pct),
        description: discountForm.description,
      };
      const res = await api.post('/admin/discount-rules', payload);
      if (res.success) {
        showToast('Discount ceiling rule created successfully!');
        setShowAddDiscountModal(false);
        setDiscountForm({
          rule_type: 'CUSTOMER_TIER',
          target_tier: 'BRONZE',
          target_id: null,
          max_discount_pct: 10,
          description: '',
        });
        await loadRules();
      }
    } catch (err) {
      alert(err.error || 'Failed to create discount rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDiscountRule = async (e) => {
    e.preventDefault();
    if (!editingDiscountRule) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/admin/discount-rules/${editingDiscountRule.id}`, {
        max_discount_pct: parseFloat(editingDiscountRule.max_discount_pct),
        description: editingDiscountRule.description,
      });
      if (res.success) {
        showToast('Discount rule ceiling updated!');
        setEditingDiscountRule(null);
        await loadRules();
      }
    } catch (err) {
      alert(err.error || 'Failed to update rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateApprovalRule = async (e) => {
    e.preventDefault();
    if (!editingApprovalRule) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/admin/approval-rules/${editingApprovalRule.id}`, {
        min_risk_pct: parseFloat(editingApprovalRule.min_risk_pct),
        max_risk_pct: parseFloat(editingApprovalRule.max_risk_pct),
        required_level: editingApprovalRule.required_level,
        description: editingApprovalRule.description,
      });
      if (res.success) {
        showToast('Approval routing threshold updated!');
        setEditingApprovalRule(null);
        await loadRules();
      }
    } catch (err) {
      alert(err.error || 'Failed to update approval rule');
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-amber-600" />
            <span>Discount Governance & Approval Chains</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable policy parameters stored in MySQL governing automatic deal routing.
          </p>
        </div>

        <button
          onClick={() => setShowAddDiscountModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Ceiling Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discount Ceilings Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configured Discount Ceilings ({discountRules.length})</h2>
              <p className="text-xs text-slate-400">Customer tier & category ceilings enforced by backend</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="py-3 px-4">Rule Type</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Max Ceiling</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {discountRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">
                        {rule.rule_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-blue-700">
                      {rule.target_tier || `Category #${rule.target_id}`}
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-700 text-sm">
                      {parseFloat(rule.max_discount_pct)}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{rule.description}</td>
                    <td className="py-3.5 px-2 text-center">
                      <button
                        onClick={() => setEditingDiscountRule({ ...rule })}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Ceiling"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Chains Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Dynamic Approval Chains ({approvalRules.length})</h2>
            <p className="text-xs text-slate-400">Automatic routing thresholds based on blended risk score</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="py-3 px-4">Risk Range</th>
                  <th className="py-3 px-4">Required Approval Level</th>
                  <th className="py-3 px-4">Policy Description</th>
                  <th className="py-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {approvalRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {parseFloat(rule.min_risk_pct)}% – {parseFloat(rule.max_risk_pct)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={rule.required_level} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">{rule.description}</td>
                    <td className="py-3.5 px-2 text-center">
                      <button
                        onClick={() => setEditingApprovalRule({ ...rule })}
                        className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Edit Approval Chain"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add Discount Rule */}
      {showAddDiscountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Discount Ceiling Rule</h3>
              <button onClick={() => setShowAddDiscountModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiscountRule} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Type</label>
                <select
                  value={discountForm.rule_type}
                  onChange={(e) => setDiscountForm({ ...discountForm, rule_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="CUSTOMER_TIER">Customer Tier Baseline</option>
                  <option value="CATEGORY">Product Category Ceiling</option>
                </select>
              </div>

              {discountForm.rule_type === 'CUSTOMER_TIER' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tier</label>
                  <select
                    value={discountForm.target_tier}
                    onChange={(e) => setDiscountForm({ ...discountForm, target_tier: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Category</label>
                  <select
                    value={discountForm.target_id || ''}
                    onChange={(e) => setDiscountForm({ ...discountForm, target_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountForm.max_discount_pct}
                  onChange={(e) => setDiscountForm({ ...discountForm, max_discount_pct: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Description</label>
                <textarea
                  rows={2}
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                  placeholder="e.g. Approved standard ceiling for high-volume enterprise hardware..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDiscountModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Ceiling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Discount Rule */}
      {editingDiscountRule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Ceiling: {editingDiscountRule.target_tier || `Category #${editingDiscountRule.target_id}`}
              </h3>
              <button onClick={() => setEditingDiscountRule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDiscountRule} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={editingDiscountRule.max_discount_pct}
                  onChange={(e) => setEditingDiscountRule({ ...editingDiscountRule, max_discount_pct: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Description</label>
                <textarea
                  rows={2}
                  value={editingDiscountRule.description || ''}
                  onChange={(e) => setEditingDiscountRule({ ...editingDiscountRule, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDiscountRule(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Ceiling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Approval Chain Rule */}
      {editingApprovalRule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Configure Approval Threshold
              </h3>
              <button onClick={() => setEditingApprovalRule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateApprovalRule} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Risk %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editingApprovalRule.min_risk_pct}
                    onChange={(e) => setEditingApprovalRule({ ...editingApprovalRule, min_risk_pct: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Risk %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editingApprovalRule.max_risk_pct}
                    onChange={(e) => setEditingApprovalRule({ ...editingApprovalRule, max_risk_pct: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Approval Level</label>
                <select
                  value={editingApprovalRule.required_level}
                  onChange={(e) => setEditingApprovalRule({ ...editingApprovalRule, required_level: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                >
                  <option value="AUTO_APPROVE">AUTO_APPROVE (No Sign-off)</option>
                  <option value="SALES_MANAGER">SALES_MANAGER (Step 1 Manager)</option>
                  <option value="FINANCE_OPS">FINANCE_OPS (Step 2 Finance Operations)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Description</label>
                <textarea
                  rows={2}
                  value={editingApprovalRule.description || ''}
                  onChange={(e) => setEditingApprovalRule({ ...editingApprovalRule, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingApprovalRule(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Threshold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountRules;
