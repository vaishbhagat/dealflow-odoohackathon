import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Zap,
  Tag,
  Warehouse,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

export const RepProductCatalog = () => {
  const navigate = useNavigate();

  // Data states
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & selections & pagination
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // Cart / Basket for building quotation
  const [quoteItems, setQuoteItems] = useState([]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [upsellRules, setUpsellRules] = useState([]);
  const [dismissedRecIds, setDismissedRecIds] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([
        api.get('/customer/products'),
        api.get('/customers'),
      ]);

      if (prodRes.success) {
        setProducts(prodRes.products || []);
        // Extract categories
        const cats = Array.from(
          new Set((prodRes.products || []).map((p) => p.category_name).filter(Boolean))
        );
        setCategories(cats);
      }

      if (custRes.success && custRes.customers?.length > 0) {
        setCustomers(custRes.customers);
        setSelectedCustomerId(custRes.customers[0].id.toString());
      }

      // Fetch upsell rules for AI panel
      const upsellRes = await api.get('/admin/upsell-rules').catch(() => ({ success: false }));
      if (upsellRes.success) setUpsellRules(upsellRes.rules || []);
    } catch (err) {
      console.error('Failed to load products/customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id.toString() === selectedCustomerId);

  // Add product to quote basket
  const handleAddToQuote = (product) => {
    setQuoteItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          discountPct: 0,
        },
      ];
    });
  };

  // Update item quantity
  const handleQuantityChange = (productId, delta) => {
    setQuoteItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Update item discount %
  const handleDiscountChange = (productId, discount) => {
    const parsed = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
    setQuoteItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, discountPct: parsed } : item
      )
    );
  };

  // Remove item from basket
  const handleRemoveItem = (productId) => {
    setQuoteItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations for quote summary & hybrid billing
  const isSubscriptionCategory = (catName) => {
    if (!catName) return false;
    const lower = catName.toLowerCase();
    return lower.includes('warranty') || lower.includes('amc') || lower.includes('service') || lower.includes('subscription');
  };

  const subtotal = quoteItems.reduce((acc, item) => {
    const listPrice = parseFloat(item.product.selling_price || 0);
    return acc + listPrice * item.quantity;
  }, 0);

  const totalDiscount = quoteItems.reduce((acc, item) => {
    const listPrice = parseFloat(item.product.selling_price || 0);
    const lineGross = listPrice * item.quantity;
    return acc + lineGross * (item.discountPct / 100);
  }, 0);

  const netSubtotal = subtotal - totalDiscount;
  const totalTax = netSubtotal * 0.18; // 18% GST
  const grandTotal = netSubtotal + totalTax;

  // Hybrid billing breakdown (Upfront Hardware vs Recurring Subscriptions/AMC)
  const upfrontNet = quoteItems
    .filter((i) => !isSubscriptionCategory(i.product.category_name))
    .reduce((acc, i) => {
      const list = parseFloat(i.product.selling_price || 0);
      return acc + list * i.quantity * (1 - i.discountPct / 100);
    }, 0);

  const recurringNet = quoteItems
    .filter((i) => isSubscriptionCategory(i.product.category_name))
    .reduce((acc, i) => {
      const list = parseFloat(i.product.selling_price || 0);
      return acc + list * i.quantity * (1 - i.discountPct / 100);
    }, 0);

  const maxDiscountPct = quoteItems.length > 0
    ? Math.max(...quoteItems.map((i) => i.discountPct))
    : 0;

  // Multi-tier discount governance rules
  const isTier1Auto = maxDiscountPct <= 10;
  const needsManagerApproval = maxDiscountPct > 10 && maxDiscountPct <= 20;
  const needsFinanceApproval = maxDiscountPct > 20 || grandTotal > 500000;

  // Smart AI Recommendations: driven by configured upsell_rules table
  // Find rules where trigger product is in the cart, recommended product is NOT yet in cart
  const cartProductIds = quoteItems.map((i) => i.product.id);
  const dynamicRecommendations = upsellRules
    .filter((rule) => {
      const triggerInCart = cartProductIds.includes(parseInt(rule.trigger_product_id));
      const recNotInCart = !cartProductIds.includes(parseInt(rule.recommended_product_id));
      const notDismissed = !dismissedRecIds.includes(rule.id);
      return triggerInCart && recNotInCart && notDismissed && rule.active;
    })
    .sort((a, b) => (b.is_promoted ? 1 : 0) - (a.is_promoted ? 1 : 0)) // promoted first
    .slice(0, 4);

  // Map recommended_product_id to actual product data
  const smartRecommendations = dynamicRecommendations
    .map((rule) => {
      const product = products.find((p) => p.id === parseInt(rule.recommended_product_id));
      if (!product) return null;
      return { ...product, _rule: rule };
    })
    .filter(Boolean);

  const handleDismissRec = (ruleId) => {
    setDismissedRecIds((prev) => [...prev, ruleId]);
  };

  // Submit and create official Quotation
  const handleGenerateQuotation = async () => {
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer for this quotation.');
      return;
    }
    if (quoteItems.length === 0) {
      setErrorMessage('Please add at least one product to the quotation basket.');
      return;
    }

    try {
      setIsCreatingQuote(true);
      setErrorMessage(null);

      const payload = {
        customerId: parseInt(selectedCustomerId, 10),
        notes: quoteNotes || `Sales Rep Quotation created for ${selectedCustomer?.company_name || 'Customer'}`,
        items: quoteItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discountPct: item.discountPct,
        })),
      };

      const res = await api.post('/quotations', payload);

      if (res.success && res.quotationId) {
        setSuccessMessage(`Quotation ${res.quotationNumber} generated successfully! Redirecting...`);
        setTimeout(() => {
          navigate(`/sales/quotations/${res.quotationId}`);
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to generate quotation.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Server error while generating quotation.');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  // Filter products by category & search
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category_name === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 font-extrabold text-[11px] rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sales Representative Rapid Quote Builder (Bhagha)</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Create Official Quotation for Customer
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Select products from Gada Electronics commercial inventory, configure rep discounts, and generate formal quotations instantly for your B2B clients.
          </p>
        </div>

        {/* Customer Selector Header Control */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 min-w-[280px]">
          <label className="block text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Target B2B Client</span>
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-900 border border-blue-400/30 text-white font-bold text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.customer_tier || 'GOLD'} Tier)
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <div className="mt-2 text-[10px] text-blue-200 flex justify-between">
              <span>Contact: {selectedCustomer.contact_person}</span>
              <span className="font-bold text-amber-300">{selectedCustomer.customer_tier} Tier</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split Layout: Left Product Showcase / Right Quote Basket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Product Catalog Grid (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search products by SKU, name, or model..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Products ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid (9 items per page) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedProducts.map((product) => {
              const inBasket = quoteItems.find((i) => i.product.id === product.id);
              const listPrice = parseFloat(product.selling_price || 0);

              return (
                <div
                  key={product.id}
                  className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                    inBasket ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="relative h-40 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center p-2">
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600'}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white font-mono text-[9px] font-bold rounded-md">
                        {product.sku}
                      </span>
                      {product.stock_quantity > 0 ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/90 backdrop-blur-xs text-white text-[9px] font-extrabold rounded-md flex items-center gap-1">
                          <Warehouse className="w-2.5 h-2.5" />
                          <span>{product.stock_quantity} In Stock</span>
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-extrabold rounded-md">
                          Backorder
                        </span>
                      )}
                    </div>

                    {/* Category & Name */}
                    <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                      {product.category_name}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-2 min-h-[32px]">
                      {product.name}
                    </h3>
                  </div>

                  {/* Commercials & Add Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 line-through">
                        ₹{(listPrice * 1.1).toFixed(0)}
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        ₹{listPrice.toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToQuote(product)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        inBasket
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20'
                      }`}
                    >
                      {inBasket ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Added ({inBasket.quantity})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Quote</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Control (9 items per page) */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        </div>

        {/* RIGHT COLUMN: Live Quotation Builder Basket (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-lg space-y-5 sticky top-6">
            
            {/* Basket Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Quotation Basket</h2>
                  <p className="text-[10px] text-slate-500">
                    {quoteItems.length} product(s) selected
                  </p>
                </div>
              </div>
              {quoteItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuoteItems([])}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Items List */}
            {quoteItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-500">No items added to quote yet</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">
                  Click "+ Add to Quote" on any product card to start building your client quotation.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                {quoteItems.map((item) => {
                  const listPrice = parseFloat(item.product.selling_price || 0);
                  const costPrice = parseFloat(item.product.cost_price || (listPrice * 0.65)); // Default 65% cost if undefined
                  const lineCost = costPrice * item.quantity;
                  const lineSubtotal = listPrice * item.quantity;
                  const discountVal = lineSubtotal * (item.discountPct / 100);
                  const lineNet = lineSubtotal - discountVal;
                  
                  const marginAmt = lineNet - lineCost;
                  const marginPct = lineNet > 0 ? (marginAmt / lineNet) * 100 : 0;
                  const isMarginWarning = marginPct < 15;

                  return (
                    <div
                      key={item.product.id}
                      className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {item.product.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.product.sku}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity & Discount Controls */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Qty Counter */}
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product.id, -1)}
                            className="p-1 text-slate-500 hover:text-slate-900"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product.id, 1)}
                            className="p-1 text-slate-500 hover:text-slate-900"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Rep Discount % Input */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 gap-1">
                          <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPct}
                            onChange={(e) => handleDiscountChange(item.product.id, e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 focus:outline-none text-right"
                            placeholder="0"
                          />
                          <span className="text-[10px] font-bold text-slate-400">% off</span>
                        </div>
                      </div>

                      {/* Line Item Pricing Summary */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <div className="flex flex-col">
                          <span className="text-slate-500">
                            ₹{listPrice.toLocaleString()} × {item.quantity}
                          </span>
                          <span className={`font-semibold ${isMarginWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                            Margin: {marginPct.toFixed(1)}% 
                            {isMarginWarning && <AlertCircle className="inline-block w-3 h-3 ml-1" />}
                          </span>
                        </div>
                        <div className="text-right">
                          {item.discountPct > 0 && (
                            <span className="text-[10px] text-rose-600 font-bold block">
                              -{item.discountPct}% (-₹{discountVal.toFixed(0)})
                            </span>
                          )}
                          <span className="font-extrabold text-slate-900">
                            ₹{lineNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart AI Upsell & Cross-Sell Recommendations - Driven by configured upsell_rules */}
            {quoteItems.length > 0 && smartRecommendations.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>AI Smart Upsell & Cross-Sell</span>
                  </div>
                  <span className="text-[10px] text-indigo-400">{smartRecommendations.length} suggestion{smartRecommendations.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1.5">
                  {smartRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`bg-white border rounded-xl p-2 flex items-center justify-between gap-2 text-xs shadow-xs ${rec._rule?.is_promoted ? 'border-amber-300 bg-amber-50/50' : 'border-indigo-100'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="font-bold text-slate-900 truncate">{rec.name}</p>
                          {rec._rule?.is_promoted && (
                            <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-extrabold rounded uppercase shrink-0">★ Promoted</span>
                          )}
                          {rec._rule?.promo_tag && (
                            <span className="px-1 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-extrabold rounded uppercase shrink-0">{rec._rule.promo_tag}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>₹{parseFloat(rec.selling_price).toLocaleString()} • {rec.category_name}</span>
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            +{parseFloat(rec._rule?.margin_delta || 2.5).toFixed(1)}% Margin Delta
                          </span>
                        </div>
                        {rec._rule?.reason && (
                          <p className="text-[10px] text-indigo-500 italic mt-0.5">{rec._rule.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAddToQuote(rec)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 shadow-xs transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissRec(rec._rule?.id)}
                          title="Dismiss suggestion"
                          className="p-1 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-[10px] transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Tier Governance Status Alert */}
            {quoteItems.length > 0 && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-medium space-y-1 ${
                  needsFinanceApproval
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : needsManagerApproval
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {needsFinanceApproval ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  ) : needsManagerApproval ? (
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>
                    {needsFinanceApproval
                      ? 'Level 3: Finance & VP Executive Approval Required'
                      : needsManagerApproval
                      ? 'Level 2: Sales Manager Review Required'
                      : 'Level 1: Autonomous Rep Delegation (Auto-Approved)'}
                  </span>
                </div>
                <p className="text-[10px] opacity-90 leading-tight">
                  {needsFinanceApproval
                    ? `Max discount applied (${maxDiscountPct}%) or high deal value (>₹5,00,000) triggers executive approval routing.`
                    : needsManagerApproval
                    ? `Max discount (${maxDiscountPct}%) exceeds standard 10% rep threshold and routes to manager queue.`
                    : `Discount rate (${maxDiscountPct}%) is auto-approved under standard rep policy.`}
                </p>
              </div>
            )}

            {/* Special Quotation Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Quotation Notes / Terms
              </label>
              <textarea
                rows="2"
                placeholder="Add special terms, payment terms, or AMC support details..."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              ></textarea>
            </div>

            {/* Financial Totals Breakdown & Hybrid Billing Split */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
              {/* Hybrid Billing Lines */}
              {quoteItems.length > 0 && (
                <div className="pb-2 border-b border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Upfront Hardware Total:
                    </span>
                    <span className="font-bold">₹{upfrontNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  {recurringNet > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Recurring Subscriptions (MRR):
                      </span>
                      <span className="font-bold">₹{recurringNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal Gross</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-rose-400">
                <span>Total Discount</span>
                <span>-₹{totalDiscount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>GST Tax (18%)</span>
                <span>₹{totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">Total Deal Value</span>
                  <span className="text-[10px] text-blue-300">Incl. CGST + SGST</span>
                </div>
                <span className="text-lg font-black text-amber-400">
                  ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleGenerateQuotation}
              disabled={quoteItems.length === 0 || isCreatingQuote}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCreatingQuote ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Generate & Send Official Quotation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepProductCatalog;
