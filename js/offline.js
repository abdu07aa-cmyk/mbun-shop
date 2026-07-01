/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/OFFLINE.JS
   Mode offline-first: menyimpan data ke localStorage
   sebagai cache/fallback, serta antrean sinkronisasi
   (sync queue) yang akan dikirim ke Supabase saat koneksi
   kembali tersedia. Dipakai langsung oleh js/api.js,
   jadi file ini harus dimuat SEBELUM api.js.
   ===================================================== */

const Offline = {
  /* ===================================================
     PENYIMPANAN LOKAL DASAR (CACHE)
     =================================================== */

  /**
   * Mengambil key localStorage yang sesuai untuk sebuah nama tabel.
   * Memetakan nama tabel Supabase ke STORAGE_KEYS di config.js.
   * @param {string} table
   */
  _storageKeyFor(table) {
    const map = {
      [CONFIG.TABLES.PRODUCTS]: CONFIG.STORAGE_KEYS.PRODUCTS,
      [CONFIG.TABLES.TRANSACTIONS]: CONFIG.STORAGE_KEYS.TRANSACTIONS,
      [CONFIG.TABLES.CUSTOMERS]: CONFIG.STORAGE_KEYS.CUSTOMERS,
      [CONFIG.TABLES.SHIFTS]: CONFIG.STORAGE_KEYS.SHIFTS,
    };
    // Tabel yang tidak terdaftar (mis. transaction_items) tetap
    // dapat disimpan dengan key generik berbasis nama tabel.
    return map[table] || `wk_${table}`;
  },

  /**
   * Mengambil seluruh data tabel dari localStorage.
   * @param {string} table
   * @returns {Array}
   */
  getLocal(table) {
    try {
      const raw = localStorage.getItem(this._storageKeyFor(table));
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error(`[Offline] Gagal membaca cache lokal untuk ${table}:`, err);
      return [];
    }
  },

  /**
   * Menimpa seluruh data tabel di localStorage (dipakai untuk
   * menyimpan hasil fetch dari Supabase sebagai cache terbaru).
   * @param {string} table
   * @param {Array} data
   */
  saveLocal(table, data) {
    try {
      localStorage.setItem(this._storageKeyFor(table), JSON.stringify(data));
    } catch (err) {
      console.error(`[Offline] Gagal menyimpan cache lokal untuk ${table}:`, err);
    }
  },

  /**
   * Menambahkan satu/beberapa baris baru ke cache lokal.
   * Jika Supabase tidak terkonfigurasi, ini berfungsi sebagai
   * "database" utama untuk sementara waktu.
   * @param {string} table
   * @param {object|Array} payload
   * @returns {Array} baris yang baru ditambahkan (dengan id digenerate jika perlu)
   */
  insertLocal(table, payload) {
    const rows = Array.isArray(payload) ? payload : [payload];
    const withIds = rows.map(row => ({
      id: row.id || Utils.generateId(table.slice(0, 3).toUpperCase()),
      created_at: row.created_at || new Date().toISOString(),
      ...row,
    }));

    const current = this.getLocal(table);
    const updated = [...current, ...withIds];
    this.saveLocal(table, updated);

    return withIds;
  },

  /**
   * Memperbarui baris di cache lokal berdasarkan filter sederhana
   * berformat PostgREST, mis. { id: 'eq.PRD-123' }.
   * @param {string} table
   * @param {object} filter
   * @param {object} payload
   */
  updateLocal(table, filter, payload) {
    const current = this.getLocal(table);
    const matcher = this._buildMatcher(filter);

    const updated = current.map(row => (matcher(row) ? { ...row, ...payload } : row));
    this.saveLocal(table, updated);

    return updated.filter(matcher);
  },

  /**
   * Menghapus baris dari cache lokal berdasarkan filter.
   * @param {string} table
   * @param {object} filter
   */
  removeLocal(table, filter) {
    const current = this.getLocal(table);
    const matcher = this._buildMatcher(filter);

    const remaining = current.filter(row => !matcher(row));
    this.saveLocal(table, remaining);

    return true;
  },

  /**
   * Mengubah filter bergaya PostgREST ({ id: 'eq.5' }) menjadi
   * fungsi predikat JS sederhana. Hanya mendukung operator 'eq'
   * karena itu yang dipakai di seluruh aplikasi ini.
   * @param {object} filter
   * @returns {Function}
   */
  _buildMatcher(filter) {
    const entries = Object.entries(filter).map(([key, condition]) => {
      const value = String(condition).replace(/^eq\./, '');
      return [key, value];
    });
    return (row) => entries.every(([key, value]) => String(row[key]) === value);
  },

  /* ===================================================
     SYNC QUEUE (ANTREAN SINKRONISASI)
     Saat operasi gagal terkirim ke Supabase, perintahnya
     disimpan di sini agar bisa dicoba ulang ketika koneksi
     internet/Supabase kembali tersedia.
     =================================================== */

  /**
   * Menambahkan satu perintah ke antrean sinkronisasi.
   * @param {'insert'|'update'|'delete'} action
   * @param {string} table
   * @param {object} payload - data lengkap yang dibutuhkan untuk mengulang aksi
   */
  queueSync(action, table, payload) {
    const queue = this._getQueue();
    queue.push({
      id: Utils.generateId('SYNC'),
      action,
      table,
      payload,
      queuedAt: new Date().toISOString(),
    });
    this._saveQueue(queue);
    Utils.showToast('Perubahan disimpan offline & akan disinkronkan otomatis', 'warning');
  },

  _getQueue() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  _saveQueue(queue) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  },

  /** Jumlah perintah yang masih menunggu disinkronkan */
  pendingCount() {
    return this._getQueue().length;
  },

  /**
   * Memproses seluruh antrean sinkronisasi ke Supabase satu per satu.
   * Dipanggil otomatis saat event 'online' terpicu, atau bisa
   * dipicu manual (mis. tombol "Sync Sekarang" di Pengaturan).
   */
  async processQueue() {
    if (!API.isConfigured()) return;

    const queue = this._getQueue();
    if (queue.length === 0) return;

    Utils.showToast(`Menyinkronkan ${queue.length} perubahan...`, 'info');
    const remaining = [];

    for (const job of queue) {
      try {
        if (job.action === 'insert') {
          await API.insert(job.table, job.payload);
        } else if (job.action === 'update') {
          await API.update(job.table, job.payload.filter, job.payload.payload);
        } else if (job.action === 'delete') {
          await API.remove(job.table, job.payload.filter);
        }
      } catch (err) {
        console.error('[Offline] Gagal memproses job sinkronisasi:', job, err);
        remaining.push(job); // simpan ulang jika masih gagal
      }
    }

    this._saveQueue(remaining);

    if (remaining.length === 0) {
      Utils.showToast('Semua data berhasil disinkronkan ✅', 'success');
    } else {
      Utils.showToast(`${remaining.length} perubahan masih gagal disinkronkan`, 'error');
    }
  },

  /* ===================================================
     INISIALISASI: PANTAU STATUS KONEKSI
     =================================================== */
  init() {
    window.addEventListener('online', () => {
      STATE.isOnline = true;
      Utils.showToast('Koneksi internet kembali tersambung', 'success');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      STATE.isOnline = false;
      Utils.showToast('Anda sedang offline — perubahan akan disimpan sementara', 'warning');
    });
  },
};
