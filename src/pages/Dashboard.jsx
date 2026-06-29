import React from 'react';
import { CubeIcon, CurrencyDollarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const stats = [
    { title: 'Total Items', value: '1,234', icon: CubeIcon, color: 'blue' },
    { title: 'Total Value', value: 'Rp 12.3M', icon: CurrencyDollarIcon, color: 'green' },
    { title: 'Low Stock', value: '23', icon: ExclamationTriangleIcon, color: 'red' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;