/* =====================================================
   MBUN COLLECTION — FEATURES/BACKUP.JS
   Fitur cadangan data: menggabungkan semua data penting
   (produk, pelanggan, transaksi + item, shift) jadi satu
   file JSON yang bisa didownload pengguna sebagai jaga-jaga.
   Ini BUKAN restore otomatis — kalau perlu dipulihkan,
   datanya perlu diimpor manual ke Supabase.
   ===================================================== */

const BackupModule = {
  /** Mengumpulkan seluruh data aplikasi yang sedang dimuat di STATE */
  _collectData() {
    return {
      backup_info: {
        store_name: CONFIG.STORE.NAME,
        created_at: new Date().toISOString(),
        version: 1,
      },
      products: STATE.products,
      customers: STATE.customers,
      transactions: STATE.transactions,
      shifts: STATE.shifts,
      categories: ProductsModule.getCategories(),
    };
  },

  /** Membuat & mengunduh file JSON cadangan */
  downloadBackup() {
    try {
      const data = this._collectData();
      const json = JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `backup-${CONFIG.STORE.NAME.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.json`;

      Utils.downloadFile(filename, json, 'application/json');
      Utils.showToast('Cadangan data berhasil didownload', 'success');
    } catch (err) {
      console.error('[Backup] Gagal membuat cadangan:', err);
      Utils.showToast('Gagal membuat cadangan data', 'error');
    }
  },
};
