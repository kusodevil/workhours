import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useUser } from '../context/UserContext';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '總覽' },
  { path: '/timesheet', label: '填寫工時' },
  { path: '/my-records', label: '我的紀錄' },
  { path: '/trends', label: '趨勢分析' },
];

function Avatar({ size }: { size: 'sm' }) {
  const { profile } = useUser();
  const cls = size === 'sm' ? 'w-8 h-8' : '';
  return profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.username}
      className={`${cls} rounded-full object-cover bg-gray-200 dark:bg-gray-700`}
    />
  ) : (
    <div className={`${cls} rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center`}>
      <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
        {(profile?.username || '我')[0].toUpperCase()}
      </span>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { profile } = useUser();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = (path: string, mobile = false) =>
    `${mobile ? 'px-4 py-3' : 'px-4 py-2'} rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                WorkHours
              </Link>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-1">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} className={linkClass(item.path)}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center gap-4">
                <Link to="/settings" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar size="sm" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {profile?.username || '我'}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
              <nav className="flex flex-col gap-2">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={linkClass(item.path, true)}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* Mobile User Section */}
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Avatar size="sm" />
                    <span className="text-sm font-medium">{profile?.username || '我'}</span>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
