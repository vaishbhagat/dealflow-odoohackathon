import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import {
  ShoppingBag,
  Search,
  Plus,
  Layers,
  DollarSign,
  Tag,
  CheckCircle,
  X,
  Edit2,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export const ProductCatalog = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'variants' | 'pricelists'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    product_type: 'GOODS',
    selling_price: '',
    cost_price: '',
    tax_rate: 18,
    unit_of_measure: 'Units',
  });

  // Variant tab state
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);
  const [variantsList, setVariantsList] = useState([]);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [variantForm, setVariantForm] = useState({
    attribute_type: 'Storage',
    attribute_value: '',
    price_delta: 0,
    sku_delta: '',
  });

  // Price List tab state
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [showAddPriceListItemModal, setShowAddPriceListItemModal] = useState(false);
  const [priceListItemForm, setPriceListItemForm] = useState({
    product_id: '',
    fixed_price: '',
    discount_pct: 0,
    min_quantity: 1,
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCatalogData();
  }, [search, selectedCategory]);

  useEffect(() => {
    if (activeTab === 'pricelists') {
      loadPriceLists();
    }
  }, [activeTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadCatalogData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('categoryId', selectedCategory);

      const [pRes, cRes] = await Promise.all([
        api.get(`/products?${params.toString()}`),
        api.get('/categories'),
      ]);

      if (pRes.success) {
        setProducts(pRes.products || []);
        if (!selectedVariantProduct && pRes.products?.length > 0) {
          setSelectedVariantProduct(pRes.products[0]);
          loadVariantsForProduct(pRes.products[0].id);
        }
      }
      if (cRes.success) setCategories(cRes.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadVariantsForProduct = async (productId) => {
    try {
      const res = await api.get(`/admin/products/${productId}/variants`);
      if (res.success) {
        setVariantsList(res.variants || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPriceLists = async () => {
    try {
      const res = await api.get('/admin/price-lists');
      if (res.success) {
        setPriceLists(res.priceLists || []);
        if (!selectedPriceList && res.priceLists?.length > 0) {
          setSelectedPriceList(res.priceLists[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/admin/products', productForm);
      if (res.success) {
        showToast(`Product "${productForm.name}" created successfully!`);
        setShowAddProductModal(false);
        setProductForm({
          name: '',
          sku: '',
          category_id: categories[0]?.id || '',
          description: '',
          product_type: 'GOODS',
          selling_price: '',
          cost_price: '',
          tax_rate: 18,
          unit_of_measure: 'Units',
        });
        await loadCatalogData();
      }
    } catch (err) {
      alert(err.error || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    if (!selectedVariantProduct) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/admin/products/${selectedVariantProduct.id}/variants`, variantForm);
      if (res.success) {
        showToast('Product variant added successfully!');
        setShowAddVariantModal(false);
        setVariantForm({
          attribute_type: 'Storage',
          attribute_value: '',
          price_delta: 0,
          sku_delta: '',
        });
        await loadVariantsForProduct(selectedVariantProduct.id);
        await loadCatalogData();
      }
    } catch (err) {
      alert(err.error || 'Failed to create variant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePriceListItem = async (e) => {
    e.preventDefault();
    if (!selectedPriceList) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/admin/price-lists/${selectedPriceList.id}/items`, priceListItemForm);
      if (res.success) {
        showToast('Price list item rule saved!');
        setShowAddPriceListItemModal(false);
        setPriceListItemForm({
          product_id: '',
          fixed_price: '',
          discount_pct: 0,
          min_quantity: 1,
        });
        await loadPriceLists();
      }
    } catch (err) {
      alert(err.error || 'Failed to add price list item');
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

      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
            <span>Product Catalog & Price Lists</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure product catalog info, multi-attribute variants, and tier-specific price matrices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'catalog' && (
            <button
              onClick={() => {
                if (categories.length > 0 && !productForm.category_id) {
                  setProductForm((prev) => ({ ...prev, category_id: categories[0].id }));
                }
                setShowAddProductModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}

          {activeTab === 'variants' && selectedVariantProduct && (
            <button
              onClick={() => setShowAddVariantModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Variant for {selectedVariantProduct.name}</span>
            </button>
          )}

          {activeTab === 'pricelists' && selectedPriceList && (
            <button
              onClick={() => setShowAddPriceListItemModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rule to {selectedPriceList.name}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'catalog'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('variants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'variants'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Product Variants</span>
        </button>

        <button
          onClick={() => setActiveTab('pricelists')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'pricelists'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Tier & Currency Price Lists</span>
        </button>
      </div>

      {/* TAB 1: Products Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name, SKU, or model..."
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl text-slate-700 w-full sm:w-56"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Cap: {parseFloat(c.discount_ceiling_pct)}%)
                </option>
              ))}
            </select>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={p.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400'}
                      alt={p.name}
                      className="w-full h-40 object-cover bg-slate-100"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {p.category_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-xs line-clamp-1">{p.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                      {p.variants && p.variants.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                          <Layers className="w-3 h-3" />
                          <span>{p.variants.length} variant configs available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Selling Price</span>
                        <span className="text-sm font-black text-slate-900">
                          ₹{parseFloat(p.selling_price).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Ceiling</span>
                        <span className="text-xs font-bold text-amber-700">
                          {parseFloat(p.category_ceiling_pct || 15)}% max
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Product Variants */}
      {activeTab === 'variants' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Select Product Column */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Product to View Variants
            </h3>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedVariantProduct(p);
                    loadVariantsForProduct(p.id);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                    selectedVariantProduct?.id === p.id
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate">{p.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Variants Table for Selected Product */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
            {selectedVariantProduct ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Variants for {selectedVariantProduct.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Base Price: ₹{parseFloat(selectedVariantProduct.selling_price).toLocaleString()} | Base SKU: {selectedVariantProduct.sku}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddVariantModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + New Variant
                  </button>
                </div>

                {variantsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No variants configured for this product. Click "+ New Variant" to add options like RAM, Storage, or Color.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Attribute Type</th>
                          <th className="py-2.5 px-3">Attribute Value</th>
                          <th className="py-2.5 px-3">Price Delta</th>
                          <th className="py-2.5 px-3">Variant Effective Price</th>
                          <th className="py-2.5 px-3">SKU Modifier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {variantsList.map((v) => {
                          const effPrice = parseFloat(selectedVariantProduct.selling_price) + parseFloat(v.price_delta || 0);
                          return (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-bold text-slate-900">{v.attribute_type}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                                  {v.attribute_value}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-emerald-600">
                                +₹{parseFloat(v.price_delta || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-3 font-black text-slate-900">
                                ₹{effPrice.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                                {v.sku_delta || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select a product from the left to configure its variants.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Tier & Currency Price Lists */}
      {activeTab === 'pricelists' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Price Lists Selector */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configured Price Lists
            </h3>
            <div className="space-y-2">
              {priceLists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setSelectedPriceList(pl)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all border ${
                    selectedPriceList?.id === pl.id
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{pl.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      {pl.currency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {pl.description || 'Tier-based customer pricing matrix'}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                    {pl.items?.length || 0} product pricing overrides
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price List Items Table */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
            {selectedPriceList ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Pricing Rules: {selectedPriceList.name} ({selectedPriceList.currency})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Custom price points and volume break discounts applied when quoting customers in this tier.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddPriceListItemModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + Add Price Rule
                  </button>
                </div>

                {!selectedPriceList.items || selectedPriceList.items.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No custom pricing rules defined in this price list yet. Click "+ Add Price Rule".
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3">Fixed Price</th>
                          <th className="py-2.5 px-3">Discount %</th>
                          <th className="py-2.5 px-3">Min Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {selectedPriceList.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {item.product_name || `Product #${item.product_id}`}
                            </td>
                            <td className="py-3 px-3 font-black text-slate-900">
                              {item.fixed_price ? `${selectedPriceList.currency} ${parseFloat(item.fixed_price).toLocaleString()}` : 'Default Standard'}
                            </td>
                            <td className="py-3 px-3 font-bold text-blue-600">
                              {parseFloat(item.discount_pct || 0)}%
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-600">
                              {item.min_quantity || 1}+ units
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select a price list on the left to review its tier overrides.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Catalog Product</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Dell Latitude 7440 Ultra"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. DELL-LAT-7440"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                    placeholder="e.g. 85000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                    placeholder="e.g. 68000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Type</label>
                  <select
                    value={productForm.product_type}
                    onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="GOODS">Goods / Hardware</option>
                    <option value="SERVICE">Service / Installation</option>
                    <option value="SUBSCRIPTION">Recurring Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={productForm.unit_of_measure}
                    onChange={(e) => setProductForm({ ...productForm, unit_of_measure: e.target.value })}
                    placeholder="Units / Months / Hours"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Detailed specifications, warranty notes..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Variant */}
      {showAddVariantModal && selectedVariantProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Variant: {selectedVariantProduct.name}</h3>
              <button onClick={() => setShowAddVariantModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attribute Type</label>
                <select
                  value={variantForm.attribute_type}
                  onChange={(e) => setVariantForm({ ...variantForm, attribute_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="Storage">Storage (e.g. 512GB, 1TB SSD)</option>
                  <option value="RAM">RAM (e.g. 16GB, 32GB DDR5)</option>
                  <option value="Color">Color / Finish</option>
                  <option value="Tier">Service Tier (e.g. Premium Support)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attribute Value</label>
                <input
                  type="text"
                  value={variantForm.attribute_value}
                  onChange={(e) => setVariantForm({ ...variantForm, attribute_value: e.target.value })}
                  placeholder="e.g. 32GB RAM / 1TB SSD"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price Delta (₹ added to base)</label>
                <input
                  type="number"
                  value={variantForm.price_delta}
                  onChange={(e) => setVariantForm({ ...variantForm, price_delta: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 6000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SKU Suffix (Optional)</label>
                <input
                  type="text"
                  value={variantForm.sku_delta}
                  onChange={(e) => setVariantForm({ ...variantForm, sku_delta: e.target.value.toUpperCase() })}
                  placeholder="e.g. -32G-1T"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVariantModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Price List Item Rule */}
      {showAddPriceListItemModal && selectedPriceList && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Add Rule to {selectedPriceList.name}
              </h3>
              <button onClick={() => setShowAddPriceListItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePriceListItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Product</label>
                <select
                  value={priceListItemForm.product_id}
                  onChange={(e) => setPriceListItemForm({ ...priceListItemForm, product_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Base: ₹{parseFloat(p.selling_price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fixed Price Override ({selectedPriceList.currency}) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={priceListItemForm.fixed_price}
                  onChange={(e) => setPriceListItemForm({ ...priceListItemForm, fixed_price: e.target.value })}
                  placeholder="Leave empty if using % discount"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tier Discount % (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={priceListItemForm.discount_pct}
                  onChange={(e) => setPriceListItemForm({ ...priceListItemForm, discount_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Order Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={priceListItemForm.min_quantity}
                  onChange={(e) => setPriceListItemForm({ ...priceListItemForm, min_quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPriceListItemModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
