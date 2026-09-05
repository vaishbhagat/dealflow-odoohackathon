import React from 'react';

const colorStyles = {
  // Quotation & Deal Statuses
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_NEGOTIATION: 'bg-amber-50 text-amber-700 border-amber-300',
  PENDING_APPROVAL: 'bg-purple-50 text-purple-700 border-purple-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  FULFILLMENT: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  INVOICED: 'bg-cyan-50 text-cyan-700 border-cyan-300',
  PAID: 'bg-green-50 text-green-700 border-green-300',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-300',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-300',
  RETURNED_FOR_REVISION: 'bg-orange-50 text-orange-700 border-orange-300',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-300',

  // Approval Statuses
  NOT_REQUIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  PENDING_MANAGER: 'bg-amber-100 text-amber-800 border-amber-300',
  MANAGER_APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  PENDING_FINANCE: 'bg-purple-100 text-purple-800 border-purple-300',

  // Deal Health
  HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  AT_RISK: 'bg-amber-100 text-amber-800 border-amber-300',
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300',

  // Risk Levels
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',

  // Priority
  URGENT: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const Badge = ({ status, text, className = '' }) => {
  const normalized = (status || '').toUpperCase().replace(/ /g, '_');
  const style = colorStyles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = text || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {label}
    </span>
  );
};

export default Badge;
