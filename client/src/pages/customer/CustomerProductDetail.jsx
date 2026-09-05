import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { 
  ShoppingCart, ArrowLeft, CheckCircle, ShieldCheck, Truck, RefreshCcw,
  Check, ChevronRight, FileText, Plus, Minus
} from 'lucide-react';

export const CustomerProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customer/products/${id}`);
      if (res.success) {
        setProduct(res.product);
      } else {
        setError(res.error || 'Product not found.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching product detail.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      setAdding(true);
      const res = await api.post('/customer/cart', {
        productId: product.id,
        quantity,
      });

      if (res.success) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
      }
    } catch (err) {
      alert('Error adding item to cart: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading product details...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        <p className="font-bold">{error || 'Product not found.'}</p>
        <Link to="/customer/products" className="mt-3 inline-block px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const taxAmount = (parseFloat(product.customer_price) * (parseFloat(product.tax_percentage || 18) / 100)) * quantity;
  const totalPrice = (parseFloat(product.customer_price) * quantity) + taxAmount;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/customer/products" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Product Catalog</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-300 font-semibold line-clamp-1">{product.name}</span>
      </div>

      {/* Main Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
        {/* Left Column: Product Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-4/3 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative">
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 font-extrabold text-xs rounded-lg uppercase tracking-wider">
                {product.category_name}
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 text-xs font-extrabold rounded-lg backdrop-blur-md ${
                product.availability === 'In Stock' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                product.availability === 'Low Stock' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-slate-800/80 text-slate-300 border border-slate-700'
              }`}>
                {product.availability}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Gada Electronics B2B Quality Assurance</span>
            </div>
            <p className="leading-relaxed">
              Official manufacturer warranty applicable. Standard delivery within 3-5 business days across India.
            </p>
          </div>
        </div>

        {/* Right Column: Product Info & Cart Actions */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{product.name}</h1>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {product.description}
            </p>

            {/* Price Info Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-white">
                  ₹{parseFloat(product.customer_price).toLocaleString('en-IN')}
                </span>
                {product.has_tier_discount && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{parseFloat(product.standard_price).toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">/ unit</span>
              </div>
              <p className="text-[11px] text-slate-400">
                + {product.tax_percentage || 18}% GST Tax Applicable at Checkout (₹{(parseFloat(product.customer_price) * 0.18).toLocaleString('en-IN')}/unit)
              </p>
              {product.has_tier_discount && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-md">
                    <CheckCircle className="w-3 h-3" />
                    Special B2B Gold Tier Pricing Applied
                  </span>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Order Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center font-bold text-sm text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  Calculated Line Total: <strong className="text-white font-mono">₹{totalPrice.toLocaleString('en-IN')}</strong> (incl. tax)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={adding}
                className={`py-3 px-4 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  added
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add {quantity} to Cart</span>
                  </>
                )}
              </button>

              <Link
                to="/customer/cart"
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Go to Cart & Generate Quote</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProductDetail;
