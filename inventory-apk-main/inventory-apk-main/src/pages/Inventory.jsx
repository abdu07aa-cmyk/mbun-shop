import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

const Inventory = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-600 dark:text-gray-400">Kelola semua item inventory</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <PlusIcon className="w-5 h-5 mr-2" />
          Tambah Item
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <input type="text" placeholder="Cari item..." className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900" />
        </div>
        <div className="p-8 text-center text-gray-500">Data inventory akan tampil di sini</div>
      </div>
    </div>
  );
};

export default Inventory;