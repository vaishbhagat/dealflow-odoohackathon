import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import {
  Search, ShoppingCart, Eye, Tag, ArrowUpDown, Check, Percent, LogIn
} from 'lucide-react';

const ITEMS_PER_PAGE = 12;

export const CustomerProducts = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [customerTier, setCustomerTier] = useState('GOLD');
  const [addedItems, setAddedItems] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const isGuestUser = isGuest || user?.role === 'GUEST';

  const categories = [
    'All', 'Laptops', 'Smartphones', 'Smart TVs', 'Refrigerators',
    'Washing Machines', 'Air Conditioners', 'Microwave Ovens',
    'Tablets', 'Printers', 'Accessories', 'Services', 'Subscriptions'
  ];

  useEffect(() => {
    fetchProducts();
    setCurrentPage(1);
  }, [selectedCategory, selectedType, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedType) params.append('productType', selectedType);
      if (sortBy) params.append('sort', sortBy);
      if (search) params.append('search', search);

      const res = await api.get(`/customer/products?${params.toString()}`);
      if (res.success) {
        setProducts(res.products);
        if (res.customerTier) setCustomerTier(res.customerTier);
      } else {
        setError(res.error || 'Failed to fetch product catalog.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const handleAddToCart = async (product) => {
    // Guest users must log in before adding to cart
    if (isGuestUser) {
      navigate('/login');
      return;
    }
    try {
      setAddedItems((prev) => ({ ...prev, [product.id]: 'adding' }));
      const res = await api.post('/customer/cart', { productId: product.id, quantity: 1 });
      if (res.success) {
        setAddedItems((prev) => ({ ...prev, [product.id]: 'added' }));
        setTimeout(() => setAddedItems((prev) => ({ ...prev, [product.id]: null })), 2000);
      } else {
        setAddedItems((prev) => ({ ...prev, [product.id]: null }));
      }
    } catch (err) {
      console.error('Error adding item to cart:', err.message);
      setAddedItems((prev) => ({ ...prev, [product.id]: null }));
    }
  };

  // Pagination
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-700 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/40 text-amber-200 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              {customerTier} Tier Pricing Active
            </span>
            <span className="text-xs text-blue-100">• Official Gada Electronics Catalogue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Product Catalogue</h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            Browse commercial electronics, refrigerators, workstations, and hospitality appliances.
          </p>
        </div>
        <Link
          to="/customer/cart"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 self-start md:self-center"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>My Cart & Quotation</span>
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, SKU, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setSelectedCategory(cat === 'All' ? '' : cat); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  (selectedCategory === cat || (cat === 'All' && !selectedCategory))
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="popular">Popularity</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading products...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
          <p>{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs space-y-2">
          <p className="text-sm font-bold text-slate-800">No products found</p>
          <p>Try adjusting your search criteria or category filter.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedProducts.map((product) => {
              const isAdded = addedItems[product.id] === 'added';
              const isAdding = addedItems[product.id] === 'adding';
              const gst = parseFloat(product.tax_percentage || 18);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group hover:shadow-lg shadow-sm"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={product.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                      <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 font-bold text-[10px] rounded-md shadow-sm">
                        {product.category_name}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md backdrop-blur-sm shadow-sm ${
                        product.availability === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : product.availability === 'Low Stock'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {product.availability}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 mb-0.5">SKU: {product.sku}</div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Price + GST */}
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-slate-900">
                          ₹{parseFloat(product.customer_price || product.selling_price).toLocaleString('en-IN')}
                        </span>
                        {product.has_tier_discount && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{parseFloat(product.standard_price || product.selling_price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                          <Percent className="w-2.5 h-2.5" />
                          {gst}% GST
                        </span>
                        {product.has_tier_discount && (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            {customerTier} Price
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <Link
                        to={`/customer/products/${product.id}`}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Details</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : isGuestUser
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isAdded ? (
                          <><Check className="w-3.5 h-3.5" /><span>Added!</span></>
                        ) : isGuestUser ? (
                          <><LogIn className="w-3.5 h-3.5" /><span>Sign In to Buy</span></>
                        ) : (
                          <><ShoppingCart className="w-3.5 h-3.5" /><span>Add to Cart</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={products.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default CustomerProducts;
