import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import { Kanban as KanbanIcon, Plus, ArrowRight } from 'lucide-react';

export const PipelineKanban = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  const stages = [
    { id: 'DRAFT', title: 'Draft', color: 'border-slate-300' },
    { id: 'SENT', title: 'Sent to Client', color: 'border-blue-400' },
    { id: 'UNDER_NEGOTIATION', title: 'Under Negotiation', color: 'border-amber-400' },
    { id: 'PENDING_APPROVAL', title: 'Pending Approval', color: 'border-purple-400' },
    { id: 'APPROVED', title: 'Approved', color: 'border-emerald-400' },
    { id: 'FULFILLMENT', title: 'Fulfillment & Split', color: 'border-indigo-400' },
    { id: 'PAID', title: 'Won & Paid', color: 'border-green-500' },
  ];

  useEffect(() => {
    loadPipeline();
  }, []);

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotations');
      if (res.success) setQuotations(res.quotations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-full mx-auto overflow-x-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <KanbanIcon className="w-6 h-6 text-blue-600" />
            <span>Sales Pipeline Kanban</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end deal visibility governed across commercial, approval, and fulfillment milestones.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex gap-4 pb-6 min-w-[1200px]">
          {stages.map((stage) => {
            const stageQuotes = quotations.filter((q) => q.status === stage.id);
            const stageTotal = stageQuotes.reduce((acc, q) => acc + parseFloat(q.total_amount || 0), 0);

            return (
              <div key={stage.id} className="w-72 bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col shrink-0">
                {/* Column Header */}
                <div className={`border-t-4 ${stage.color} pt-2 pb-3 mb-2 px-1`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{stage.title}</span>
                    <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {stageQuotes.length}
                    </span>
                  </div>
                  <p className="text-[11px] font-extrabold text-slate-500 mt-1">₹{stageTotal.toLocaleString()}</p>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
                  {stageQuotes.map((q) => (
                    <Link
                      key={q.id}
                      to={`/sales/quotations/${q.id}`}
                      className="block bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-blue-600">{q.quotation_number}</span>
                        <Badge status={q.customer_tier} />
                      </div>

                      <p className="font-bold text-slate-900 line-clamp-1">{q.customer_name}</p>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="font-extrabold text-slate-900">
                          ₹{parseFloat(q.total_amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">{q.margin_pct}% Margin</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PipelineKanban;
