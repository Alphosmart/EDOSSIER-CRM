import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { HiOutlineMenu, HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 h-16">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {ROLE_LABELS[user?.role]} • {user?.territory}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
