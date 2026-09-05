import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Bell, Check, CheckCheck, Clock, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CustomerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/notifications');
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      } else {
        setError(res.error || 'Failed to load notifications.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.post(`/customer/notifications/${id}/read`);
      if (res.success) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-[11px] rounded-full uppercase tracking-wider">
              Real-time Notifications
            </span>
            <span className="text-xs text-slate-400">• DealFlow360 Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Notifications Center</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Stay updated on quotation status revisions, counter-offer approvals, payment receipts, and order shipping dispatches.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => handleMarkAsRead('all')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Feed List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white">Activity Feed</h2>
          <span className="text-xs font-semibold text-amber-400">{unreadCount} Unread Notifications</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading notification feed...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <p>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Bell className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-bold text-sm text-white">No notifications yet.</p>
            <p>Updates on your quotations, orders, and invoices will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !notif.is_read ? 'bg-amber-500/5' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !notif.is_read ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {notif.link_url && (
                    <Link
                      to={notif.link_url}
                      className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerNotifications;
