import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, Server, Globe, Shield, Zap } from 'lucide-react';

// Architecture diagram rendered as pure SVG/HTML — no external library needed
const MODULE_COLORS = {
  auth: 'from-slate-700 to-slate-900',
  sales: 'from-blue-600 to-blue-800',
  approval: 'from-amber-500 to-amber-700',
  fulfillment: 'from-indigo-600 to-indigo-800',
  billing: 'from-emerald-600 to-emerald-800',
  customer: 'from-teal-600 to-teal-800',
  health: 'from-rose-600 to-rose-800',
  reports: 'from-purple-600 to-purple-800',
};

const Box = ({ title, sub, items, color, className = '' }) => (
  <div className={`rounded-2xl p-4 text-white shadow-xl ${className} bg-gradient-to-br ${color}`}>
    <p className="text-xs font-extrabold uppercase tracking-widest opacity-70">{sub}</p>
    <p className="text-sm font-black mt-0.5 leading-tight">{title}</p>
    <ul className="mt-3 space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5 text-[11px] font-medium opacity-90">
          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const Arrow = ({ label, vertical = false }) => (
  <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center justify-center gap-1`}>
    <div className={`${vertical ? 'w-0.5 h-6' : 'h-0.5 w-8'} bg-slate-300`} />
    {label && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>}
    <div className={`${vertical ? 'w-0.5 h-6' : 'h-0.5 w-8'} bg-slate-300`} />
  </div>
);

export const ArchitecturePage = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 mb-2 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Architecture</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            DealFlow360 — System design, data model, and module connectivity overview.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
          <Zap className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-800">Hackathon Deliverable: Architecture Diagram</span>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Globe, label: 'Frontend', items: ['React 19 + Vite 8', 'Tailwind CSS 3', 'Lucide React Icons', 'React Router v7'], color: 'bg-blue-50 border-blue-200 text-blue-900' },
          { icon: Server, label: 'Backend', items: ['Node.js + Express', 'JWT Authentication', 'Razorpay Payments', 'Role-Based Access Control (RBAC)'], color: 'bg-slate-50 border-slate-200 text-slate-900' },
          { icon: Database, label: 'Database', items: ['MySQL 8 (InnoDB)', '37 relational tables', 'SELECT…FOR UPDATE locks', 'Seed data for 5 demo roles'], color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
        ].map(({ icon: Icon, label, items, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-5 h-5" />
              <span className="text-sm font-extrabold">{label}</span>
            </div>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="text-xs font-medium flex items-start gap-1.5">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Module Flow Diagram */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          End-to-End Module Connectivity
        </h2>

        {/* Row 1: Entry Points */}
        <div className="flex flex-wrap gap-3 justify-center mb-2">
          <Box title="Auth & Session" sub="Entry" color={MODULE_COLORS.auth}
            items={['JWT login / magic link', 'Role: Admin / Rep / Manager / Finance / Customer', 'RBAC middleware on all routes']} />
          <Box title="Admin Configuration" sub="Backend Setup" color={MODULE_COLORS.reports}
            items={['Products, Variants, Price Lists', 'Discount Tiers & Approval Rules', 'Warehouses & Subscription Plans', 'Upsell/Cross-sell Rules']} />
        </div>

        <div className="flex justify-center mb-2"><Arrow label="triggers" /></div>

        {/* Row 2: Core Sales Flow */}
        <div className="flex flex-wrap gap-3 justify-center mb-2">
          <Box title="Quotation Builder" sub="B3 — Rep Workspace" color={MODULE_COLORS.sales}
            items={['Create quote, pick products & variants', 'Apply line / order discounts', 'Live margin indicator updates', 'Upsell/cross-sell panel alongside cart']} />
          <Box title="Blended Risk Scoring" sub="Core Engine" color={MODULE_COLORS.approval}
            items={['Per-line category ceiling check', 'Weighted discount overage score', 'Worst-line + spread detection', 'Auto-routes to correct approval tier']} />
          <Box title="Approval Queue" sub="B4 — Governance" color={MODULE_COLORS.approval}
            items={['PENDING_MANAGER → Sales Manager', 'PENDING_FINANCE → Finance (if HIGH risk)', 'Approve / Reject / Return with audit log', 'Notifications on each state change']} />
        </div>

        <div className="flex justify-center mb-2"><Arrow label="on approval" /></div>

        {/* Row 3: Fulfillment & Billing */}
        <div className="flex flex-wrap gap-3 justify-center mb-2">
          <Box title="Warehouse Fulfillment" sub="B6 — Multi-Warehouse Split" color={MODULE_COLORS.fulfillment}
            items={['Stock check across all warehouses', 'Auto-split by availability & shipping cost', 'SELECT…FOR UPDATE inventory lock', 'Manual override + backorder consolidation']} />
          <Box title="Hybrid Billing" sub="B7 — Subscription & One-time" color={MODULE_COLORS.billing}
            items={['One-time lines → single invoice', 'Recurring lines → billing schedule', 'Mid-cycle proration engine', 'Cancel/modify → credit note auto-trigger']} />
          <Box title="Customer Portal" sub="B8 — Negotiation" color={MODULE_COLORS.customer}
            items={['Magic-link / email portal login', 'Line-level comments & counter-offers', 'Confirm with one click', 'Re-enters approval if thresholds exceeded']} />
        </div>

        <div className="flex justify-center mb-2"><Arrow label="post-payment" /></div>

        {/* Row 4: Monitoring & Analytics */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Box title="Deal Health Dashboard" sub="B9 — Anomaly Detection" color={MODULE_COLORS.health}
            items={['Stalled deals (inactivity threshold)', 'Discount anomaly vs. rep historical avg', 'Delivery promise slippage alerts', 'Nudge / escalate actions']} />
          <Box title="Reports & Analytics" sub="A7 — Manager/Finance" color={MODULE_COLORS.reports}
            items={['Period / Rep / Status / Category filters', 'Sales performance & pipeline metrics', 'Product performance ranking', 'PDF / XLS export']} />
          <Box title="Notifications" sub="Real-time Alerts" color={MODULE_COLORS.auth}
            items={['Approval required alerts', 'Deal won / rejected notifications', 'Follow-up task automation', 'Bell icon with unread count']} />
        </div>
      </div>

      {/* Data Model Summary */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white">
        <h2 className="text-sm font-extrabold mb-4 text-slate-200">Key Database Tables (37 total)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { group: 'Core Entities', tables: ['companies', 'users', 'customers', 'sales_teams'] },
            { group: 'Product Catalog', tables: ['categories', 'products', 'product_variants', 'price_lists', 'price_list_items'] },
            { group: 'Quotation & Items', tables: ['quotations', 'quotation_items', 'discount_rules', 'upsell_rules'] },
            { group: 'Approval Chain', tables: ['approval_requests', 'approval_history', 'approval_rules'] },
            { group: 'Fulfillment', tables: ['warehouses', 'warehouse_inventory', 'fulfillment_orders', 'fulfillment_splits', 'backorder_items'] },
            { group: 'Billing', tables: ['subscription_plans', 'subscriptions', 'subscription_adjustments', 'invoices', 'payments'] },
            { group: 'Negotiation', tables: ['negotiations', 'quotation_comments'] },
            { group: 'Platform', tables: ['notifications', 'follow_up_tasks', 'audit_logs', 'deal_health_scores'] },
          ].map(({ group, tables }) => (
            <div key={group} className="bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{group}</p>
              {tables.map(t => (
                <p key={t} className="text-[11px] font-mono text-emerald-400 leading-relaxed">{t}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-6 text-white">
        <h2 className="text-sm font-extrabold mb-3">What We'd Build Next (With More Time)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: 'Multi-currency support', desc: 'Exchange rate sync + currency-specific price lists for international customers.' },
            { title: 'WebSocket live updates', desc: 'Replace polling with real-time push for approval notifications and deal status changes.' },
            { title: 'AI deal scoring', desc: 'ML model trained on won/lost history to predict deal close probability in real time.' },
            { title: 'E-signature integration', desc: 'DocuSign/HelloSign embedded in customer portal for legally-binding confirmations.' },
            { title: 'ERP sync (SAP / Tally)', desc: 'Bi-directional sync with accounting and inventory ERP for production deployments.' },
            { title: 'Mobile app', desc: 'React Native companion app for reps to build quotes and track approvals on the go.' },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs font-extrabold text-white">{title}</p>
              <p className="text-[11px] text-blue-200 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePage;
