import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Users,
  ShieldCheck,
  Activity,
  BarChart3,
  Truck,
  CreditCard,
  Repeat,
  ShoppingBag,
  Sliders,
  Settings,
  Warehouse,
  Flame,
  Network,
  MessageSquare,
  Bell,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || 'SALES_REP';

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600 shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Customer Portal / Guest Portal Specific Navigation */}
        {role === 'GUEST' ? (
          <div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
              <p className="text-xs font-bold text-amber-900">Guest Browsing Mode</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Explore full electronics catalogue & pricing.</p>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Guest Access
            </p>
            <nav className="space-y-1">
              <NavLink to="/customer/products" className={navItemClass}>
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Product Catalogue</span>
              </NavLink>
              <NavLink to="/login" className={navItemClass}>
                <Users className="w-4 h-4 text-blue-600" />
                <span>Sign In / Register</span>
              </NavLink>
            </nav>
          </div>
        ) : role === 'CUSTOMER' ? (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Customer Portal
            </p>
            <nav className="space-y-1">
              <NavLink to="/customer/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/customer/products" className={navItemClass}>
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Product Catalogue</span>
              </NavLink>
              <NavLink to="/customer/cart" className={navItemClass}>
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>My Cart</span>
              </NavLink>
              <NavLink to="/customer/quotations" className={navItemClass}>
                <FileText className="w-4 h-4 text-blue-500" />
                <span>My Quotations</span>
              </NavLink>
              <NavLink to="/customer/orders" className={navItemClass}>
                <Truck className="w-4 h-4 text-purple-600" />
                <span>My Orders</span>
              </NavLink>
              <NavLink to="/customer/invoices" className={navItemClass}>
                <CreditCard className="w-4 h-4 text-cyan-600" />
                <span>My Invoices</span>
              </NavLink>
              <NavLink to="/customer/subscriptions" className={navItemClass}>
                <Repeat className="w-4 h-4 text-amber-600" />
                <span>My Subscriptions</span>
              </NavLink>
              <NavLink to="/customer/notifications" className={navItemClass}>
                <Activity className="w-4 h-4 text-rose-500" />
                <span>Notifications</span>
              </NavLink>
              <NavLink to="/customer/profile" className={navItemClass}>
                <Users className="w-4 h-4 text-slate-600" />
                <span>My Profile</span>
              </NavLink>
            </nav>
          </div>
        ) : (
          <>
            {/* Sales Operations Section */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Sales Operations
              </p>
              <nav className="space-y-1">
                <NavLink to="/sales/dashboard" className={navItemClass}>
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Workspace Dashboard</span>
                </NavLink>
                <NavLink to="/sales/products" className={navItemClass}>
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <span>Rapid Quote Builder</span>
                </NavLink>
                <NavLink to="/sales/quotations" className={navItemClass}>
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Quotations & Deals</span>
                </NavLink>
                <NavLink to="/sales/pipeline" className={navItemClass}>
                  <Kanban className="w-4 h-4 text-purple-600" />
                  <span>Pipeline Kanban</span>
                </NavLink>
                <NavLink to="/sales/customers" className={navItemClass}>
                  <Users className="w-4 h-4 text-cyan-600" />
                  <span>B2B Customers</span>
                </NavLink>

                {/* Sales Rep exclusive tools */}
                <div className="pt-2 pb-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">My Rep Tools</p>
                </div>
                {role !== 'FINANCE_OPERATIONS' && (
                  <NavLink to="/sales/negotiations" className={navItemClass}>
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>Negotiations Inbox</span>
                  </NavLink>
                )}
                <NavLink to="/sales/approvals" className={navItemClass}>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Approval Tracker</span>
                </NavLink>
              </nav>
            </div>

            {/* Manager Governance Section */}
            {(role === 'SALES_MANAGER' || role === 'ADMIN') && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                  Governance & Approvals
                </p>
                <nav className="space-y-1">
                  <NavLink to="/manager/products" className={navItemClass}>
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    <span>Product Catalogue</span>
                  </NavLink>
                  <NavLink to="/manager/approvals" className={navItemClass}>
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Approval Queue</span>
                  </NavLink>
                  <NavLink to="/manager/deals" className={navItemClass}>
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span>Deal Health & Anomalies</span>
                  </NavLink>
                  <NavLink to="/manager/reports" className={navItemClass}>
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Sales Performance</span>
                  </NavLink>
                </nav>
              </div>
            )}

            {/* Finance & Fulfillment Operations Section */}
            {(role === 'FINANCE_OPERATIONS' || role === 'ADMIN') && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                  Finance & Operations
                </p>
                <nav className="space-y-1">
                  <NavLink to="/finance/products" className={navItemClass}>
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Product Catalogue</span>
                  </NavLink>
                  <NavLink to="/finance/approvals" className={navItemClass}>
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Finance Approvals</span>
                  </NavLink>
                  <NavLink to="/finance/fulfillment" className={navItemClass}>
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>Warehouse Fulfillment</span>
                  </NavLink>
                  <NavLink to="/finance/invoices" className={navItemClass}>
                    <CreditCard className="w-4 h-4 text-cyan-600" />
                    <span>Invoices & Payments</span>
                  </NavLink>
                  <NavLink to="/finance/subscriptions" className={navItemClass}>
                    <Repeat className="w-4 h-4 text-blue-600" />
                    <span>Hybrid Subscriptions</span>
                  </NavLink>
                </nav>
              </div>
            )}

            {/* Admin Management Section */}
            {role === 'ADMIN' && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                  Platform Admin
                </p>
                <nav className="space-y-1">
                  <NavLink to="/admin/dashboard" className={navItemClass}>
                    <LayoutDashboard className="w-4 h-4 text-purple-600" />
                    <span>Admin Overview</span>
                  </NavLink>
                  <NavLink to="/admin/products" className={navItemClass}>
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Product Catalogue</span>
                  </NavLink>
                  <NavLink to="/admin/price-lists" className={navItemClass}>
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span>Price Lists & Rules</span>
                  </NavLink>
                  <NavLink to="/admin/discount-rules" className={navItemClass}>
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>Discount Governance</span>
                  </NavLink>
                  <NavLink to="/admin/warehouses" className={navItemClass}>
                    <Warehouse className="w-4 h-4 text-indigo-600" />
                    <span>Warehouses & Stocks</span>
                  </NavLink>
                  <NavLink to="/admin/users" className={navItemClass}>
                    <Settings className="w-4 h-4 text-slate-600" />
                    <span>User Management</span>
                  </NavLink>
                  <NavLink to="/admin/architecture" className={navItemClass}>
                    <Network className="w-4 h-4 text-blue-500" />
                    <span>Architecture Diagram</span>
                  </NavLink>
                  <NavLink to="/admin/upsell-rules" className={navItemClass}>
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <span>Upsell / Cross-Sell Rules</span>
                  </NavLink>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enterprise Footer info */}
      <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">Gada Electronics</span>
          <span className="font-semibold text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Enterprise Active
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
