import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineUsers,
  HiOutlineX
} from 'react-icons/hi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineHome, roles: null },
  { path: '/leads', label: 'Leads', icon: HiOutlineUserGroup, roles: null },
  { path: '/commissions', label: 'Commissions', icon: HiOutlineCurrencyDollar, roles: null },
  { path: '/reports', label: 'Reports', icon: HiOutlineChartBar, roles: null },
  { path: '/users', label: 'Users', icon: HiOutlineUsers, roles: ['admin', 'manager'] },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog, roles: null },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  const filteredItems = navItems.filter(
    item => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-semibold">Menu</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
