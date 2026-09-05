import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import {
  Truck,
  Warehouse,
  CheckCircle2,
  Package,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Plus,
} from 'lucide-react';

export const FulfillmentView = () => {
  const [searchParams] = useSearchParams();
  const quoteIdParam = searchParams.get('quoteId') || '1';

  const [activeTab, setActiveTab] = useState('plan'); // 'plan', 'orders', 'backorders'
  const [quotationId, setQuotationId] = useState(quoteIdParam);
  const [fulfillmentPlan, setFulfillmentPlan] = useState(null);
  const [fulfillmentOrders, setFulfillmentOrders] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [manualOverride, setManualOverride] = useState(false);

  const handleSplitQuantityChange = (itemId, splitIdx, newQty) => {
    if (!fulfillmentPlan) return;
    const parsedQty = Math.max(0, parseInt(newQty, 10) || 0);

    const updatedPlanItems = fulfillmentPlan.planItems.map((item) => {
      if (item.quotationItemId !== itemId) return item;
      const updatedSplits = item.splits.map((s, idx) => {
        if (idx === splitIdx) {
          return { ...s, allocatedQuantity: Math.min(s.availableQuantity, parsedQty) };
        }
        return s;
      });

      const totalAllocated = updatedSplits.reduce((sum, s) => sum + s.allocatedQuantity, 0);
      const backorderQty = Math.max(0, item.requiredQuantity - totalAllocated);

      return {
        ...item,
        splits: updatedSplits,
        backorderQuantity: backorderQty,
      };
    });

    const hasAnyBackorder = updatedPlanItems.some((i) => i.backorderQuantity > 0);
    const activeHubs = new Set();
    updatedPlanItems.forEach((i) => {
      i.splits.forEach((s) => {
        if (s.allocatedQuantity > 0) activeHubs.add(s.warehouseId);
      });
    });

    setFulfillmentPlan({
      ...fulfillmentPlan,
      planItems: updatedPlanItems,
      hasBackorder: hasAnyBackorder,
      shipmentCount: Math.max(1, activeHubs.size),
    });
  };

  useEffect(() => {
    loadData();
  }, [quotationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [planRes, ordersRes, backordersRes] = await Promise.all([
        api.get(`/fulfillment/${quotationId}/plan`).catch(() => ({ success: false })),
        api.get('/fulfillment/orders'),
        api.get('/fulfillment/backorders'),
      ]);

      if (planRes.success) setFulfillmentPlan(planRes.plan);
      if (ordersRes.success) setFulfillmentOrders(ordersRes.orders || []);
      if (backordersRes.success) setBackorders(backordersRes.backorders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSplit = async () => {
    try {
      setAllocating(true);
      const res = await api.post(`/fulfillment/${quotationId}/allocate`, {
        allocationPlan: fulfillmentPlan,
      });

      setSuccessMessage(res.message);
      await loadData();
      setActiveTab('orders');
    } catch (err) {
      alert(err.error || 'Fulfillment allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const handleConsolidateBackorder = async (boId, whId, qty) => {
    try {
      const res = await api.post(`/fulfillment/backorders/${boId}/consolidate`, {
        warehouseId: whId,
        quantity: qty,
      });
      alert(res.message);
      await loadData();
    } catch (e) {
      alert(e.error || 'Backorder consolidation failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Multi-Warehouse Inventory & Fulfillment</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated stock allocation across Main, East, and North depots minimizing shipment counts and costs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'plan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Quotation Allocation Plan
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Fulfillment Orders ({fulfillmentOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('backorders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'backorders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Backorders ({backorders.length})
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-200 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab 1: Allocation Plan (Golden Demo Warehouse Splitting) */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Target Quotation Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Evaluating Quotation:</span>
              <input
                type="number"
                value={quotationId}
                onChange={(e) => setQuotationId(e.target.value)}
                className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
              />
              <span className="text-xs text-slate-400">
                (Default Quotation #1: Metro Office Systems — 5x Dell Inspiron 15)
              </span>
            </div>

            <Link
              to="/sales/quotations?create=true"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Quotation</span>
            </Link>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !fulfillmentPlan ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border">
              No physical products to fulfill for Quotation #{quotationId}.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Warehouse Split Visualizer */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">Recommended Stock Allocation</h2>
                      <p className="text-xs text-slate-400">
                        Derived from live MySQL inventory across all distribution centers
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setManualOverride(!manualOverride)}
                        className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all ${
                          manualOverride
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {manualOverride ? 'Manual Override: ON' : 'Enable Manual Override'}
                      </button>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-100">
                        Optimal Split Engine
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    {fulfillmentPlan.planItems.map((item) => (
                      <div key={item.quotationItemId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-xs font-bold text-slate-900">{item.productName}</h3>
                            <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-900">
                            Required: {item.requiredQuantity} Units
                          </span>
                        </div>

                        {/* Splitting Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {item.splits.map((s, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs flex flex-col justify-between"
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[11px] font-bold text-slate-800 line-clamp-1">
                                  {s.warehouseName}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                {manualOverride ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={s.availableQuantity}
                                      value={s.allocatedQuantity}
                                      onChange={(e) => handleSplitQuantityChange(item.quotationItemId, idx, e.target.value)}
                                      className="w-16 bg-blue-50 border border-blue-300 rounded-lg p-1 text-sm font-black text-blue-800 text-center"
                                    />
                                    <span className="text-[10px] text-slate-400 font-semibold">units</span>
                                  </div>
                                ) : (
                                  <span className="text-lg font-black text-blue-700">{s.allocatedQuantity}</span>
                                )}
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Avail: {s.availableQuantity}
                                </span>
                              </div>
                            </div>
                          ))}

                          {item.backorderQuantity > 0 && (
                            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-900">
                              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Backorder</span>
                              </div>
                              <span className="text-lg font-black text-rose-700">{item.backorderQuantity} Units</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Col: Fulfillment Summary & Execution */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                    Dispatch Logistics
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated Shipments</span>
                      <span className="font-extrabold text-slate-900">
                        {fulfillmentPlan.shipmentCount} Separate Hubs
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Freight & Logistics</span>
                      <span className="font-extrabold text-slate-900">
                        ₹{fulfillmentPlan.estimatedShippingCost.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Backorder Status</span>
                      <span
                        className={`font-bold ${
                          fulfillmentPlan.hasBackorder ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {fulfillmentPlan.hasBackorder ? 'Partial Stock' : 'Full Stock Available'}
                      </span>
                    </div>
                  </div>

                  {/* Backorder Consolidation Prompt */}
                  {fulfillmentPlan.hasBackorder && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Backorder Consolidation Prompt</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-tight">
                        Stock deficit detected. Remaining items will create an automatic backorder queue upon dispatch.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('backorders')}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs"
                      >
                        Review & Consolidate Backorders &rarr;
                      </button>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={handleAcceptSplit}
                      disabled={allocating}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{allocating ? 'Locking Inventory...' : manualOverride ? 'Accept Custom Split & Fulfill' : 'Accept Suggested Split & Fulfill'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      Locks inventory rows in MySQL transactions (`SELECT ... FOR UPDATE`).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
              <tr>
                <th className="py-3 px-4">Fulfillment #</th>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Shipments</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Allocated Warehouse Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {fulfillmentOrders.map((fo) => (
                <tr key={fo.id}>
                  <td className="py-4 px-4 font-bold text-slate-900">{fo.fulfillment_number}</td>
                  <td className="py-4 px-4 font-semibold text-blue-600">
                    <Link to={`/sales/quotations/${fo.quotation_id}`} className="hover:underline">
                      {fo.quotation_number}
                    </Link>
                  </td>
                  <td className="py-4 px-4 font-bold">{fo.customer_name}</td>
                  <td className="py-4 px-4 font-semibold">{fo.total_shipments} Shipments</td>
                  <td className="py-4 px-4">
                    <Badge status={fo.status} />
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      {(fo.items || []).map((itm) => (
                        <div key={itm.id} className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold text-slate-800">{itm.product_name}:</span>
                          <span className="px-2 py-0.2 rounded bg-blue-50 text-blue-700 font-bold">
                            {itm.quantity} units from {itm.warehouse_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Backorders */}
      {activeTab === 'backorders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Needed</th>
                <th className="py-3 px-4">Allocated</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {backorders.map((bo) => (
                <tr key={bo.id}>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{bo.product_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-blue-600">{bo.quotation_number}</td>
                  <td className="py-3.5 px-4">{bo.customer_name}</td>
                  <td className="py-3.5 px-4 font-black text-rose-600">{bo.quantity_needed}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600">{bo.quantity_allocated}</td>
                  <td className="py-3.5 px-4">
                    <Badge status={bo.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleConsolidateBackorder(bo.id, 1, bo.quantity_needed - bo.quantity_allocated)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                    >
                      Consolidate Backorder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FulfillmentView;
