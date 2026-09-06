import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Sparkles, Plus, Trash2, Star, X, CheckCircle2 } from 'lucide-react';

export const UpsellRulesAdmin = () => {
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    triggerProductId: '',
    recommendedProductId: '',
    recommendationType: 'CROSS_SELL',
    reason: '',
    marginDelta: 0,
    isPromoted: false,
    promoTag: '',
  });

  useEffect(() => { loadData(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.all([api.get('/admin/upsell-rules'), api.get('/admin/products')]);
      if (rRes.success) setRules(rRes.rules || []);
      if (pRes.success) setProducts(pRes.products || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/admin/upsell-rules', {
        triggerProductId: parseInt(form.triggerProductId),
        recommendedProductId: parseInt(form.recommendedProductId),
        recommendationType: form.recommendationType,
        reason: form.reason,
        marginDelta: parseFloat(form.marginDelta),
        isPromoted: form.isPromoted ? 1 : 0,
        promoTag: form.promoTag || null,
      });
      if (res.success) {
        showToast('Upsell pairing created!');
        setShowAddModal(false);
        setForm({ triggerProductId: '', recommendedProductId: '', recommendationType: 'CROSS_SELL', reason: '', marginDelta: 0, isPromoted: false, promoTag: '' });
        await loadData();
      }
    } catch (err) { showToast(err.error || 'Failed to create rule', 'error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this upsell pairing?')) return;
    try { await api.delete(`/admin/upsell-rules/${id}`); showToast('Pairing removed.'); await loadData(); }
    catch { showToast('Failed to delete rule', 'error'); }
  };

  const typeBadgeColor = {
    CROSS_SELL: 'bg-blue-50 text-blue-700 border-blue-200',
    UPSELL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ATTACHMENT: 'bg-violet-50 text-violet-700 border-violet-200',
    SERVICE: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-white/20 text-white font-extrabold text-[11px] rounded-full uppercase tracking-wider">AI Recommendation Engine</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-2">
            <Sparkles className="w-7 h-7 text-violet-300" /> Upsell & Cross-Sell Rules
          </h1>
          <p className="text-xs text-violet-100 max-w-2xl">
            Define product pairings. Promoted rules surface first in the AI panel. Margin delta shows expected incremental revenue from each recommendation.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-white text-violet-700 hover:bg-violet-50 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Pairing Rule
        </button>
      </div>

      {toast && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${toast.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" /><span>{toast.msg}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Configured Pairings ({rules.length})</h2>
          <span className="text-xs text-slate-500">Live rules powering Quote Builder AI panel</span>
        </div>

        {loading ? (
          <div className="p-12 text-center flex items-center justify-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading rules...</span>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Sparkles className="w-10 h-10 mx-auto text-slate-200" />
            <p className="text-sm font-bold text-slate-500">No Upsell Rules Configured</p>
            <p className="text-xs">Add pairings to power the Quote Builder AI recommendations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">When Product Added</th>
                  <th className="py-3.5 px-4">Recommend This</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Reason / Tag</th>
                  <th className="py-3.5 px-3 text-center">Margin Δ</th>
                  <th className="py-3.5 px-3 text-center">Promoted</th>
                  <th className="py-3.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{rule.trigger_product_name || `#${rule.trigger_product_id}`}</td>
                    <td className="py-3.5 px-4 font-semibold text-violet-700">{rule.recommended_product_name || `#${rule.recommended_product_id}`}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${typeBadgeColor[rule.recommendation_type] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {rule.recommendation_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-slate-600">{rule.reason}</span>
                      {rule.promo_tag && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">{rule.promo_tag}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-emerald-600">
                      {rule.margin_delta > 0 ? '+' : ''}₹{parseFloat(rule.margin_delta || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {rule.is_promoted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-bold">
                          <Star className="w-3 h-3" /> Promoted
                        </span>
                      ) : <span className="text-slate-300 text-[10px]">Standard</span>}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-violet-700 space-y-1">
        <p className="font-bold text-violet-900">Rule Logic:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="font-semibold">CROSS_SELL</span>: Complementary product (Mouse with Laptop)</li>
          <li><span className="font-semibold">UPSELL</span>: Premium alternative to an existing cart item</li>
          <li><span className="font-semibold">ATTACHMENT</span>: Service/warranty bundle alongside hardware</li>
          <li><span className="font-semibold">Promoted</span>: Ranks first in AI panel. Best for seasonal bundles.</li>
        </ul>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600" /> Add Recommendation Pairing</h3>
              <p className="text-xs text-slate-500 mt-1">Define when to suggest a product while another is in the quote basket.</p>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">When this product is in the basket...</label>
                <select required value={form.triggerProductId} onChange={e => setForm({ ...form, triggerProductId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900">
                  <option value="">-- Select Trigger Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">...recommend this product</label>
                <select required value={form.recommendedProductId} onChange={e => setForm({ ...form, recommendedProductId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900">
                  <option value="">-- Select Recommended Product --</option>
                  {products.filter(p => p.id !== parseInt(form.triggerProductId)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recommendation Type</label>
                  <select value={form.recommendationType} onChange={e => setForm({ ...form, recommendationType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900">
                    <option value="CROSS_SELL">CROSS_SELL</option>
                    <option value="UPSELL">UPSELL</option>
                    <option value="ATTACHMENT">ATTACHMENT</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Margin Δ (₹)</label>
                  <input type="number" step="0.01" value={form.marginDelta} onChange={e => setForm({ ...form, marginDelta: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason (shown to rep in AI panel)</label>
                <input type="text" required placeholder="e.g. Frequently bought together with laptops" value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Promo Tag (Optional)</label>
                  <input type="text" placeholder="e.g. BUNDLE DEAL" value={form.promoTag}
                    onChange={e => setForm({ ...form, promoTag: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isPromoted} onChange={e => setForm({ ...form, isPromoted: e.target.checked })}
                      className="w-4 h-4 rounded text-violet-600 border-slate-300" />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500" /> Mark as Promoted
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Pairing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpsellRulesAdmin;

