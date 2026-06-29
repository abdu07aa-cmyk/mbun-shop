import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, CubeIcon, CogIcon } from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Inventory', href: '/inventory', icon: CubeIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-16 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-primary-600">Inventory APK</h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink key={item.name} to={item.href} className={({ isActive }) =>
              `flex items-center px-4 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary-100 dark:bg-primary-900 text-primary-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`
            }>
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;