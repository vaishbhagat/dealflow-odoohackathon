import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Warehouse,
  MapPin,
  Package,
  Plus,
  Edit2,
  X,
  Sliders,
  AlertTriangle,
  CheckCircle,
  Truck,
  ArrowUpDown,
} from 'lucide-react';

export const WarehousesView = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    location: '',
    shipping_cost: 250,
    is_active: true,
  });

  // Stock Management Modal
  const [selectedWarehouseForStock, setSelectedWarehouseForStock] = useState(null);
  const [inventoryList, setInventoryList] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [products, setProducts] = useState([]);
  const [stockForm, setStockForm] = useState({
    product_id: '',
    quantity: 10,
    reorder_level: 5,
  });

  useEffect(() => {
    loadWarehouses();
    loadProducts();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/warehouses');
      if (res.success) setWarehouses(res.warehouses || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products');
      if (res.success) setProducts(res.products || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenStockModal = async (wh) => {
    setSelectedWarehouseForStock(wh);
    setLoadingInventory(true);
    try {
      const res = await api.get(`/admin/warehouses/${wh.id}/inventory`);
      if (res.success) {
        setInventoryList(res.inventory || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/admin/warehouses', warehouseForm);
      if (res.success) {
        showToast(`Warehouse "${warehouseForm.name}" created!`);
        setShowAddWarehouseModal(false);
        setWarehouseForm({
          name: '',
          code: '',
          location: '',
          shipping_cost: 250,
          is_active: true,
        });
        await loadWarehouses();
      }
    } catch (err) {
      alert(err.error || 'Failed to create warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/admin/warehouses/${editingWarehouse.id}`, {
        name: editingWarehouse.name,
        code: editingWarehouse.code,
        location: editingWarehouse.location,
        shipping_cost: parseFloat(editingWarehouse.shipping_cost),
        is_active: editingWarehouse.is_active,
      });
      if (res.success) {
        showToast(`Warehouse "${editingWarehouse.name}" updated!`);
        setEditingWarehouse(null);
        await loadWarehouses();
      }
    } catch (err) {
      alert(err.error || 'Failed to update warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseForStock || !stockForm.product_id) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/admin/warehouses/${selectedWarehouseForStock.id}/inventory`, {
        product_id: parseInt(stockForm.product_id, 10),
        quantity: parseInt(stockForm.quantity, 10),
        reorder_level: parseInt(stockForm.reorder_level, 10),
      });
      if (res.success) {
        showToast('Inventory & reorder level saved!');
        // Reload inventory
        const invRes = await api.get(`/admin/warehouses/${selectedWarehouseForStock.id}/inventory`);
        if (invRes.success) setInventoryList(invRes.inventory || []);
        await loadWarehouses();
      }
    } catch (err) {
      alert(err.error || 'Failed to update stock');
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
            <Warehouse className="w-6 h-6 text-indigo-600" />
            <span>Warehouses & Regional Fulfillment Hubs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribution hubs supporting multi-warehouse split fulfillment, freight weighting, and replenishment reorder rules.
          </p>
        </div>

        <button
          onClick={() => setShowAddWarehouseModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Warehouse Hub</span>
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <div
            key={wh.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {wh.code}
                  </span>
                </div>
                <button
                  onClick={() => setEditingWarehouse({ ...wh })}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit Warehouse"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{wh.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{wh.location}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Freight Weighting</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{parseFloat(wh.shipping_cost).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Total On Hand</span>
                  <span className="font-black text-indigo-700 text-sm">
                    {wh.total_stock} units
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOpenStockModal(wh)}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Manage Stock & Reorders</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: Add Warehouse */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Warehouse Hub</h3>
              <button onClick={() => setShowAddWarehouseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Name</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="e.g. North Regional Logistics Park"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hub Code</label>
                  <input
                    type="text"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH-NORTH"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={warehouseForm.shipping_cost}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, shipping_cost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  placeholder="e.g. Gurugram Highway, Haryana"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Warehouse */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Warehouse: {editingWarehouse.code}</h3>
              <button onClick={() => setEditingWarehouse(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWarehouse} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Name</label>
                <input
                  type="text"
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hub Code</label>
                  <input
                    type="text"
                    value={editingWarehouse.code}
                    onChange={(e) => setEditingWarehouse({ ...editingWarehouse, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWarehouse.shipping_cost}
                    onChange={(e) => setEditingWarehouse({ ...editingWarehouse, shipping_cost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editingWarehouse.location}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Stock Management & Replenishment Reorder Rules */}
      {selectedWarehouseForStock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Inventory & Reorder Rules: {selectedWarehouseForStock.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage real-time on-hand stock and automated replenishment triggers.
                  </p>
                </div>
                <button onClick={() => setSelectedWarehouseForStock(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add / Adjust stock rule form */}
              <form onSubmit={handleSaveStock} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Product</label>
                  <select
                    value={stockForm.product_id}
                    onChange={(e) => setStockForm({ ...stockForm, product_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">On-Hand Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.reorder_level}
                    onChange={(e) => setStockForm({ ...stockForm, reorder_level: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>

                <div className="sm:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !stockForm.product_id}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Set Stock & Reorder Rule'}
                  </button>
                </div>
              </form>

              {/* Current inventory table */}
              <div className="mt-4 max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sticky top-0 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">On-Hand</th>
                      <th className="py-2.5 px-3 text-center">Reserved</th>
                      <th className="py-2.5 px-3 text-center">Reorder Level</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {inventoryList.map((inv) => {
                      const isLowStock = inv.quantity <= inv.reorder_level;
                      return (
                        <tr key={inv.id} className={isLowStock ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{inv.product_name}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{inv.sku}</td>
                          <td className="py-2.5 px-3 text-center font-black text-slate-900">{inv.quantity}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500">{inv.reserved_quantity || 0}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500">{inv.reorder_level}</td>
                          <td className="py-2.5 px-3 text-center">
                            {isLowStock ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                Adequate
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWarehouseForStock(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousesView;
