import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout & Common
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Sales & Internal Pages
import SalesDashboard from './pages/sales/SalesDashboard';
import QuotationsList from './pages/sales/QuotationsList';
import QuotationDetail from './pages/sales/QuotationDetail';
import PipelineKanban from './pages/sales/PipelineKanban';
import NegotiationsInbox from './pages/sales/NegotiationsInbox';
import ApprovalTracker from './pages/sales/ApprovalTracker';
import FollowUpsList from './pages/sales/FollowUpsList';
import RepProductCatalog from './pages/sales/RepProductCatalog';
import CustomersView from './pages/sales/CustomersView';

import ApprovalsQueue from './pages/manager/ApprovalsQueue';
import DealHealthView from './pages/manager/DealHealthView';
import ReportsView from './pages/manager/ReportsView';
import FulfillmentView from './pages/finance/FulfillmentView';
import InvoicesView from './pages/finance/InvoicesView';
import SubscriptionsView from './pages/finance/SubscriptionsView';

// Customer Portal Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerProducts from './pages/customer/CustomerProducts';
import CustomerProductDetail from './pages/customer/CustomerProductDetail';
import CustomerCart from './pages/customer/CustomerCart';
import CustomerQuotations from './pages/customer/CustomerQuotations';
import CustomerQuoteReview from './pages/customer/CustomerQuoteReview';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerInvoices from './pages/customer/CustomerInvoices';
import CustomerSubscriptions from './pages/customer/CustomerSubscriptions';
import CustomerNotifications from './pages/customer/CustomerNotifications';
import CustomerProfile from './pages/customer/CustomerProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductsCatalog from './pages/admin/AdminProductsCatalog';
import AdminPriceLists from './pages/admin/AdminPriceLists';
import DiscountRules from './pages/admin/DiscountRules';
import WarehousesView from './pages/admin/WarehousesView';
import UsersManagement from './pages/admin/UsersManagement';
import ArchitecturePage from './pages/admin/ArchitecturePage';

// Main Layout Shell
const AppLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Customers must only access the customer portal — redirect away from internal pages
  if (user.role === 'CUSTOMER') {
    const isCustomerPath = window.location.pathname.startsWith('/customer');
    if (!isCustomerPath) {
      return <Navigate to="/customer/dashboard" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-16">{children}</main>
      </div>
    </div>
  );
};

// Role-aware catch-all: customers → portal dashboard, everyone else → sales dashboard
const CatchAllRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'CUSTOMER') return <Navigate to="/customer/dashboard" replace />;
  return <Navigate to="/sales/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Core Operations Routes inside AppLayout */}
          <Route
            path="/"
            element={
              <AppLayout>
                <SalesDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/sales/dashboard"
            element={
              <AppLayout>
                <SalesDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/sales/quotations"
            element={
              <AppLayout>
                <QuotationsList />
              </AppLayout>
            }
          />
          <Route
            path="/sales/quotations/:id"
            element={
              <AppLayout>
                <QuotationDetail />
              </AppLayout>
            }
          />
          <Route
            path="/sales/pipeline"
            element={
              <AppLayout>
                <PipelineKanban />
              </AppLayout>
            }
          />
          <Route
            path="/sales/negotiations"
            element={
              <AppLayout>
                <NegotiationsInbox />
              </AppLayout>
            }
          />
          <Route
            path="/sales/approvals"
            element={
              <AppLayout>
                <ApprovalTracker />
              </AppLayout>
            }
          />
          <Route
            path="/sales/follow-ups"
            element={
              <AppLayout>
                <FollowUpsList />
              </AppLayout>
            }
          />

          <Route
            path="/sales/products"
            element={
              <AppLayout>
                <RepProductCatalog />
              </AppLayout>
            }
          />
          <Route
            path="/sales/customers"
            element={
              <AppLayout>
                <CustomersView />
              </AppLayout>
            }
          />

          {/* Governance & Manager */}
          <Route
            path="/manager/dashboard"
            element={
              <AppLayout>
                <ApprovalsQueue />
              </AppLayout>
            }
          />
          <Route
            path="/manager/approvals"
            element={
              <AppLayout>
                <ApprovalsQueue />
              </AppLayout>
            }
          />
          <Route
            path="/manager/deals"
            element={
              <AppLayout>
                <DealHealthView />
              </AppLayout>
            }
          />
          <Route
            path="/manager/reports"
            element={
              <AppLayout>
                <ReportsView />
              </AppLayout>
            }
          />
          <Route
            path="/manager/products"
            element={
              <AppLayout>
                <AdminProductsCatalog />
              </AppLayout>
            }
          />

          {/* Finance & Fulfillment */}
          <Route
            path="/finance/dashboard"
            element={
              <AppLayout>
                <FulfillmentView />
              </AppLayout>
            }
          />
          <Route
            path="/finance/approvals"
            element={
              <AppLayout>
                <ApprovalsQueue />
              </AppLayout>
            }
          />
          <Route
            path="/finance/fulfillment"
            element={
              <AppLayout>
                <FulfillmentView />
              </AppLayout>
            }
          />
          <Route
            path="/finance/invoices"
            element={
              <AppLayout>
                <InvoicesView />
              </AppLayout>
            }
          />
          <Route
            path="/finance/subscriptions"
            element={
              <AppLayout>
                <SubscriptionsView />
              </AppLayout>
            }
          />
          <Route
            path="/finance/products"
            element={
              <AppLayout>
                <AdminProductsCatalog />
              </AppLayout>
            }
          />

          {/* Customer Portal */}
          <Route
            path="/customer"
            element={<Navigate to="/customer/dashboard" replace />}
          />
          <Route
            path="/customer/dashboard"
            element={
              <AppLayout>
                <CustomerDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/customer/products"
            element={
              <AppLayout>
                <CustomerProducts />
              </AppLayout>
            }
          />
          <Route
            path="/customer/products/:id"
            element={
              <AppLayout>
                <CustomerProductDetail />
              </AppLayout>
            }
          />
          <Route
            path="/customer/cart"
            element={
              <AppLayout>
                <CustomerCart />
              </AppLayout>
            }
          />
          <Route
            path="/customer/quotations"
            element={
              <AppLayout>
                <CustomerQuotations />
              </AppLayout>
            }
          />
          <Route
            path="/customer/quotations/:id"
            element={
              <AppLayout>
                <CustomerQuoteReview />
              </AppLayout>
            }
          />
          <Route
            path="/customer/orders"
            element={
              <AppLayout>
                <CustomerOrders />
              </AppLayout>
            }
          />
          <Route
            path="/customer/invoices"
            element={
              <AppLayout>
                <CustomerInvoices />
              </AppLayout>
            }
          />
          <Route
            path="/customer/subscriptions"
            element={
              <AppLayout>
                <CustomerSubscriptions />
              </AppLayout>
            }
          />
          <Route
            path="/customer/notifications"
            element={
              <AppLayout>
                <CustomerNotifications />
              </AppLayout>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <AppLayout>
                <CustomerProfile />
              </AppLayout>
            }
          />

          {/* Admin Management */}
          <Route
            path="/admin/dashboard"
            element={
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AppLayout>
                <AdminProductsCatalog />
              </AppLayout>
            }
          />
          <Route
            path="/admin/price-lists"
            element={
              <AppLayout>
                <AdminPriceLists />
              </AppLayout>
            }
          />
          <Route
            path="/admin/discount-rules"
            element={
              <AppLayout>
                <DiscountRules />
              </AppLayout>
            }
          />
          <Route
            path="/admin/warehouses"
            element={
              <AppLayout>
                <WarehousesView />
              </AppLayout>
            }
          />
          <Route
            path="/admin/architecture"
            element={
              <AppLayout>
                <ArchitecturePage />
              </AppLayout>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AppLayout>
                <UsersManagement />
              </AppLayout>
            }
          />

          {/* Catch all fallback */}
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
