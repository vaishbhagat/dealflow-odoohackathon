import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import {
  Package,
  Search,
  Plus,
  Edit,
  Edit2,
  Trash2,
  Eye,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  Percent,
  Tag,
  Boxes,
  Sparkles
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const AdminProductsCatalog = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // New product form
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('1');
  const [newDescription, setNewDescription] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newTaxPercentage, setNewTaxPercentage] = useState('18');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newProductType, setNewProductType] = useState('ONE_TIME');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Edit product state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editTaxPercentage, setEditTaxPercentage] = useState('18');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('1');

  // Variants state
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [activeProductForVariants, setActiveProductForVariants] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({ variantName: '', attributeType: 'Size', attributeValue: '', priceDelta: 0, sku: '' });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchVariants = async (productId) => {
    try {
      const res = await api.get(`/admin/variants?productId=${productId}`);
      if (res.success) setProductVariants(res.variants || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/admin/variants', {
        productId: activeProductForVariants.id,
        variantName: variantForm.variantName,
        attributeType: variantForm.attributeType,
        attributeValue: variantForm.attributeValue,
        priceDelta: parseFloat(variantForm.priceDelta),
        sku: variantForm.sku
      });
      if (res.success) {
        showToast('Variant added!');
        setVariantForm({ variantName: '', attributeType: 'Size', attributeValue: '', priceDelta: 0, sku: '' });
        await fetchVariants(activeProductForVariants.id);
      }
    } catch (err) {
      alert(err.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/products');
      if (res.success) {
        setProducts(res.products || []);
      } else {
        setError(res.error || 'Failed to load products.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching products.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/admin/products', {
        sku: newSku,
        name: newName,
        categoryId: parseInt(newCategoryId, 10),
        description: newDescription,
        sellingPrice: parseFloat(newSellingPrice),
        costPrice: parseFloat(newCostPrice),
        taxPercentage: parseFloat(newTaxPercentage) || 18.0,
        productType: newProductType,
        imageUrl: newImageUrl || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500',
      });

      if (res.success) {
        showToast(`Product "${newName}" added to catalogue successfully!`);
        setShowAddModal(false);
        setNewSku('');
        setNewName('');
        setNewDescription('');
        setNewSellingPrice('');
        setNewCostPrice('');
        setNewTaxPercentage('18');
        setNewImageUrl('');
        await fetchProducts();
      }
    } catch (err) {
      alert('Error creating product: ' + (err.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditSellingPrice(p.selling_price);
    setEditCostPrice(p.cost_price);
    setEditTaxPercentage(p.tax_percentage !== undefined ? String(p.tax_percentage) : '18');
    setEditImageUrl(p.image_url || '');
    setEditDescription(p.description || '');
    setEditCategoryId(p.category_id ? String(p.category_id) : '1');
    setShowEditModal(true);
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/admin/products/${editingProduct.id}`, {
        name: editName,
        sellingPrice: parseFloat(editSellingPrice),
        costPrice: parseFloat(editCostPrice),
        taxPercentage: parseFloat(editTaxPercentage),
        imageUrl: editImageUrl,
        description: editDescription,
        categoryId: parseInt(editCategoryId, 10),
      });
      if (res.success) {
        showToast(`Product "${editName}" updated successfully!`);
        setShowEditModal(false);
        setEditingProduct(null);
        await fetchProducts();
      }
    } catch (err) {
      alert('Error updating product: ' + (err.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Are you sure you want to deactivate "${p.name}"? It will be archived from active sales.`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/products/${p.id}`);
      if (res.success) {
        showToast(`Product "${p.name}" deactivated.`);
        await fetchProducts();
      }
    } catch (err) {
      alert('Error deactivating product: ' + (err.error || err.message));
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = search
      ? p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchCat = selectedCategory ? p.category_name === selectedCategory : true;
    return matchSearch && matchCat;
  });

  // Pagination
  const totalItems = filteredProducts.length;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 border border-blue-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 text-white font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              {isAdmin ? 'Master Catalogue Governance' : 'Operations & Sales Inventory View'}
            </span>
            <span className="text-xs text-blue-200">• Live Enterprise Catalogue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Product Catalogue</h1>
          <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
            Configure Gada Electronics products, standard selling prices, cost prices, GST rates, and categories. Changes propagate live across customer and sales workspaces.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-extrabold text-slate-900">
            Catalogue Items ({totalItems})
          </h2>
          <span className="text-xs text-slate-500">20 Products per Page</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading product catalogue...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 m-5 rounded-2xl">
            <p>{error}</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No products matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-3">SKU</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3 text-right">Selling Price</th>
                  <th className="py-3.5 px-3 text-right">Cost Price</th>
                  <th className="py-3.5 px-3 text-center">GST Rate</th>
                  <th className="py-3.5 px-3 text-center">Type</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                      <img
                        src={p.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=100'}
                        alt={p.name}
                        className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0 shadow-xs"
                      />
                      <div>
                        <span className="block font-extrabold text-slate-900">{p.name}</span>
                        {p.total_stock !== undefined && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            Stock: {p.total_stock} units
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px] font-semibold">{p.sku}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                        {p.category_name || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm">
                      ₹{parseFloat(p.selling_price).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500 font-medium">
                      ₹{parseFloat(p.cost_price).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px]">
                        {p.tax_percentage ? `${p.tax_percentage}% GST` : '18% GST'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-extrabold text-[10px] uppercase">
                        {p.product_type || 'ONE_TIME'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full uppercase">
                        ACTIVE
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setActiveProductForVariants(p); fetchVariants(p.id); setShowVariantsModal(true); }}
                            title="Manage Variants"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors cursor-pointer"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Product & GST"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            title="Deactivate Product"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-900">Add Product to Catalogue</h3>
              <p className="text-xs text-slate-500">Creates a new product record in master catalog</p>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAP-DELL-XPS15"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell XPS 15 Workstation 32GB"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="75000"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="60000"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={newTaxPercentage}
                    onChange={(e) => setNewTaxPercentage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Type</label>
                  <select
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  >
                    <option value="ONE_TIME">One Time Hardware</option>
                    <option value="RECURRING">Recurring Subscription</option>
                    <option value="SERVICE">Service / Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Detailed specifications..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-200 cursor-pointer"
                >
                  {submitting ? 'Adding...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-900">Edit Product & GST</h3>
              <p className="text-xs text-slate-500">Update pricing, GST percentage, and product information</p>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={editingProduct.sku}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product GST (%)</label>
                  <select
                    value={editTaxPercentage}
                    onChange={(e) => setEditTaxPercentage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold text-amber-700"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-200 cursor-pointer"
                >
                  {submitting ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VARIANTS MODAL */}
      {showVariantsModal && activeProductForVariants && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowVariantsModal(false); setActiveProductForVariants(null); setProductVariants([]); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                Product Variants: {activeProductForVariants.name}
              </h3>
              <p className="text-xs text-slate-500">Add or remove attributes like Size, Pack, or Color with price adjustments.</p>
            </div>

            {/* List Existing Variants */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Existing Variants ({productVariants.length})</h4>
              {productVariants.length === 0 ? (
                <p className="text-xs text-slate-400">No variants configured. Product acts as a single SKU.</p>
              ) : (
                <ul className="space-y-2">
                  {productVariants.map(v => (
                    <li key={v.id} className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-lg shadow-xs text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{v.variant_name}</span>
                        <span className="text-slate-400 ml-2">({v.attribute_type}: {v.attribute_value})</span>
                        <span className="text-[10px] text-slate-400 font-mono block">SKU: {v.sku || 'N/A'}</span>
                      </div>
                      <div className="font-black text-indigo-600">
                        {v.price_delta > 0 ? '+' : ''}₹{parseFloat(v.price_delta).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add New Variant Form */}
            <form onSubmit={handleAddVariant} className="space-y-4 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-700">Add New Variant</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Variant Name</label>
                  <input
                    type="text" required placeholder="e.g. 64GB Model"
                    value={variantForm.variantName}
                    onChange={(e) => setVariantForm({ ...variantForm, variantName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Variant SKU</label>
                  <input
                    type="text" required placeholder="e.g. LAP-DELL-64GB"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attribute Type</label>
                  <select
                    value={variantForm.attributeType}
                    onChange={(e) => setVariantForm({ ...variantForm, attributeType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="Size">Size</option>
                    <option value="Color">Color</option>
                    <option value="Storage">Storage</option>
                    <option value="Memory">Memory</option>
                    <option value="Pack">Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attribute Value</label>
                  <input
                    type="text" required placeholder="e.g. XL, 64GB"
                    value={variantForm.attributeValue}
                    onChange={(e) => setVariantForm({ ...variantForm, attributeValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price Adjustment (₹)</label>
                  <input
                    type="number" step="0.01" required placeholder="e.g. 500 or -200"
                    value={variantForm.priceDelta}
                    onChange={(e) => setVariantForm({ ...variantForm, priceDelta: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {submitting ? 'Adding...' : 'Add Variant'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsCatalog;
