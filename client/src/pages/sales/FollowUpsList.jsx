import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import { Clock, CheckCircle2, Play, AlertTriangle, MessageSquare, ArrowUpRight } from 'lucide-react';

export const FollowUpsList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/follow-ups');
      if (res.success) setTasks(res.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      const res = await api.post('/follow-ups/scan');
      alert(`Smart Follow-Up Engine scanned pipeline: ${res.count} new follow-up tasks scheduled.`);
      await loadTasks();
    } catch (e) {
      alert(e.error || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleCompleteTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await api.post(`/follow-ups/${selectedTask.id}/complete`, {
        actionTaken: actionNotes,
      });
      setSelectedTask(null);
      setActionNotes('');
      await loadTasks();
    } catch (err) {
      alert(err.error || 'Failed to complete task');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            <span>Smart Follow-up Automation</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Self-governing deal momentum engine (EVENT → RULE → ACTION) keeping customer engagement on track.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{scanning ? 'Evaluating Rules...' : 'Run Automation Scanner'}</span>
        </button>
      </div>

      {/* Follow-up tasks table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold">No pending follow-ups found.</p>
            <p className="text-xs mt-1">All customer deals are moving actively.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Quotation</th>
                  <th className="py-3 px-4">Follow-up Trigger Reason</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <Badge status={task.priority} />
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{task.company_name}</p>
                      <span className="text-[10px] text-slate-400">Contact: {task.contact_person}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600">
                      <Link to={`/sales/quotations/${task.quotation_id}`} className="hover:underline">
                        {task.quotation_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-semibold text-slate-800 line-clamp-1">{task.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{task.reason}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {new Date(task.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={task.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {task.status === 'PENDING' ? (
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                        >
                          Mark Complete
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Complete Follow-up Task</h3>
            <p className="text-xs text-slate-500 mt-1">
              Record outcome for {selectedTask.company_name} ({selectedTask.quotation_number})
            </p>

            <form onSubmit={handleCompleteTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Action Notes</label>
                <textarea
                  rows="3"
                  required
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Spoke with client, clarified installation scope, client agreed to review terms."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpsList;
