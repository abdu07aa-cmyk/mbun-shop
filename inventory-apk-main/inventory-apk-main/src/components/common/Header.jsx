import React, { useState } from 'react';
import { Bars3Icon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden">
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          <div className="relative">
            <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <UserCircleIcon className="w-8 h-8 text-gray-500" />
              <span className="hidden md:block text-sm">{user?.email}</span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700">
                <button onClick={logout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;