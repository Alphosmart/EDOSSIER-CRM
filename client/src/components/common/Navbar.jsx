import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { timeAgo } from '../../utils/formatDate';
import { HiOutlineMenu, HiOutlineLogout, HiOutlineUser, HiOutlineBell, HiOutlineCalendar } from 'react-icons/hi';
import { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../services/notificationService';
import GlobalSearch from './GlobalSearch';

function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await notificationService.getAll();
      setNotifications(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n) => {
    if (!n.read) {
      await notificationService.markRead(n._id);
      load();
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    await notificationService.markAllRead();
    load();
  };


  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 relative"
        title="Notifications"
      >
        <HiOutlineBell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
            ) : notifications.map(n => {
                const isFollowUp = n.type === 'follow_up';
                const dotColor = !n.read ? (isFollowUp ? 'bg-amber-500' : 'bg-blue-500') : '';
                const rowBg = !n.read ? (isFollowUp ? 'bg-amber-50/60' : 'bg-blue-50/50') : '';
                return (
                  <button
                    key={n._id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${rowBg}`}
                  >
                    <div className="flex items-start gap-2">
                      {isFollowUp
                        ? <HiOutlineCalendar className={`w-4 h-4 mt-0.5 shrink-0 ${!n.read ? 'text-amber-500' : 'text-gray-300'}`} />
                        : <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${dotColor}`} />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 h-16">
      <div className="flex items-center justify-between h-full px-4 gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <HiOutlineMenu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ED</span>
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">EDOSSIER CRM</span>
          </Link>
        </div>

        {/* Global Search — centred, grows */}
        <div className="flex-1 max-w-sm hidden md:block">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {ROLE_LABELS[user?.role]} • {user?.territory}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationPanel />
            <Link
              to="/settings"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <HiOutlineUser className="w-5 h-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600"
              title="Logout"
            >
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
