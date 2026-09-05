import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Search,
  LogOut,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Settings,
  XCircle,
  FileText,
  Kanban,
} from 'lucide-react';
import api from '../../api/client';
import Badge from '../common/Badge';
import GadaLogo from '../common/GadaLogo';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // Quiet fail if not authenticated
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setUnreadCount(0);
      fetchNotifications();
    } catch (e) {}
  };

  const handleReloadData = () => {
    setReloading(true);
    fetchNotifications();
    window.dispatchEvent(new Event('reload-dealflow-data'));
    setTimeout(() => setReloading(false), 900);
  };

  const handleCloseWorkspace = () => {
    if (confirm('Close current working session view?')) {
      logout();
      navigate('/login');
    }
  };

  const isInternal = user && user.role !== 'CUSTOMER' && user.role !== 'GUEST';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Search */}
      <div className="flex items-center gap-4">
        <NavLink to="/" className="flex items-center">
          <GadaLogo size="md" theme="light" showSubtext={true} />
        </NavLink>
      </div>

      {/* B1) Sales Workspace Top Menu Navigation & Actions */}
      {isInternal && (
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <NavLink
            to="/sales/quotations"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isActive ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quotations</span>
          </NavLink>

          <NavLink
            to="/sales/pipeline"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isActive ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Pipeline</span>
          </NavLink>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          {/* Action: Reload Data */}
          <button
            onClick={handleReloadData}
            title="Reload live stock, pricing, and approvals from backend"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-blue-700 rounded-lg transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{reloading ? 'Reloading...' : 'Reload Data'}</span>
          </button>

          {/* Action: Go to Back-end */}
          <button
            onClick={() => navigate('/admin/products')}
            title="Open configuration, price lists, and discount rules"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-indigo-700 rounded-lg transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Go to Back-end</span>
          </button>

          {/* Action: Close Workspace */}
          <button
            onClick={handleCloseWorkspace}
            title="End current working session view"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Close Workspace</span>
          </button>
        </div>
      )}

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-800">Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-blue-600 hover:underline font-semibold">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg border text-xs ${
                        n.is_read ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-blue-50/50 border-blue-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'APPROVAL_REQUIRED' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current User Chip */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
              <div className="flex justify-end mt-0.5">
                <Badge status={user.role} />
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
