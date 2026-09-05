import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Pagination from '../../components/common/Pagination';
import { Tag, Plus, Edit, CheckCircle2, Shield, Layers, DollarSign, X, ChevronRight, Percent } from 'lucide-react';

export const AdminPriceLists = () => {
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [viewAllList, setViewAllList] = useState(null);
  const [modalPage, setModalPage] = useState(1);

  const [productId, setProductId] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    fetchPriceLists();
    fetchProducts();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchPriceLists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/price-lists');
      if (res.success) {
        setPriceLists(res.priceLists || []);
      } else {
        setError(res.error || 'Failed to load price lists.');
      }
    } catch (err) {
      setError(err.message || 'Error loading price lists.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/admin/products');
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleSavePriceListItem = async (e) => {
    e.preventDefault();
    if (!selectedList || !productId) return;

    try {
      setSubmitting(true);
      const res = await api.post('/admin/price-lists/item', {
        priceListId: selectedList.id,
        productId: parseInt(productId, 10),
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        discountPct: parseFloat(discountPct || 0),
      });

      if (res.success) {
        showToast(`Rule saved for price list "${selectedList.name}"!`);
        setShowItemModal(false);
        setProductId('');
        setSpecialPrice('');
        setDiscountPct('0');
        await fetchPriceLists();
      }
    } catch (err) {
      alert('Error saving price list rule: ' + (err.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 border border-emerald-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 text-white font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              Customer Tier Pricing Engine
            </span>
            <span className="text-xs text-emerald-100">• Gada Electronics Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Price Lists & Rules</h1>
          <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
            Configure tier-specific price lists (BRONZE, SILVER, GOLD, PLATINUM) and individual product price overrides applied automatically during quotation building.
          </p>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Price Lists Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading price lists...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {priceLists.map((pl) => (
            <div
              key={pl.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase border ${
                      pl.customer_tier === 'PLATINUM'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : pl.customer_tier === 'GOLD'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : pl.customer_tier === 'SILVER'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}
                  >
                    {pl.customer_tier} TIER LIST
                  </span>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900">{pl.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Currency: {pl.currency || 'INR'}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Configured Product Rules:</span>
                    <strong className="text-slate-900 font-mono">{pl.items?.length || 0} rules</strong>
                  </div>

                  {pl.items && pl.items.length > 0 ? (
                    <div className="space-y-1.5 pt-2">
                      {pl.items.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] flex justify-between items-center"
                        >
                          <span className="text-slate-800 font-medium line-clamp-1">{item.product_name}</span>
                          <span className="font-bold text-emerald-700 shrink-0 ml-2">
                            {item.special_price
                              ? `₹${parseFloat(item.special_price).toLocaleString('en-IN')}`
                              : `${item.discount_pct}% off`}
                          </span>
                        </div>
                      ))}
                      {pl.items.length > 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewAllList(pl);
                            setModalPage(1);
                            setShowViewAllModal(true);
                          }}
                          className="text-[11px] text-blue-600 font-bold hover:underline block pt-1 cursor-pointer"
                        >
                          View all {pl.items.length} product rules →
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic pt-2">No product rules added yet.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedList(pl);
                    setShowItemModal(true);
                  }}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Add Product Rule</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW ALL RULES MODAL (WITH PAGINATION) */}
      {showViewAllModal && viewAllList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowViewAllModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-900">{viewAllList.name} – All Product Rules</h3>
              <p className="text-xs text-slate-500">Tier: {viewAllList.customer_tier} • Total Rules: {viewAllList.items?.length || 0}</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(viewAllList.items || [])
                .slice((modalPage - 1) * 10, modalPage * 10)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.product_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku || `ID #${item.product_id}`}</p>
                    </div>
                    <div className="text-right">
                      {item.special_price ? (
                        <span className="font-black text-emerald-700 text-sm">
                          ₹{parseFloat(item.special_price).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {item.discount_pct}% Discount
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Pagination
                currentPage={modalPage}
                totalItems={viewAllList.items?.length || 0}
                itemsPerPage={10}
                onPageChange={(p) => setModalPage(p)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ADD ITEM RULE MODAL */}
      {showItemModal && selectedList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowItemModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-900">Add Price Rule to {selectedList.name}</h3>
              <p className="text-xs text-slate-500">
                Configure a special fixed price or tier discount percentage for a product in the {selectedList.customer_tier} tier.
              </p>
            </div>

            <form onSubmit={handleSavePriceListItem} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Product</label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Choose a Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) – Std: ₹{parseFloat(p.selling_price).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Fixed Price (₹) <span className="font-normal text-slate-400">[Optional]</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 62000 (leaves discount % calculated)"
                  value={specialPrice}
                  onChange={(e) => setSpecialPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Discount % <span className="font-normal text-slate-400">[Optional]</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 8"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-200 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPriceLists;
