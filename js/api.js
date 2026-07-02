/* =====================================================
   WARUNGKITA PRO MAX — API.JS
   Wrapper untuk komunikasi dengan Supabase REST API
   (PostgREST), lengkap dengan fallback otomatis ke
   localStorage jika Supabase gagal/tidak terkonfigurasi
   (lihat js/features/offline.js untuk sinkronisasi).
   ===================================================== */

const API = {
  /**
   * Membuat header standar untuk request ke Supabase.
   * @param {boolean} returnRepresentation - jika true, minta Supabase
   *        mengembalikan data hasil insert/update (Prefer: return=representation)
   */
  _headers(returnRepresentation = false) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    };
    if (returnRepresentation) {
      headers['Prefer'] = 'return=representation';
    }
    return headers;
  },

  /** Apakah konfigurasi Supabase sudah lengkap */
  isConfigured() {
    return !Utils.isEmpty(CONFIG.SUPABASE_URL) && !Utils.isEmpty(CONFIG.SUPABASE_ANON_KEY);
  },

  /* ===================================================
     OPERASI CRUD GENERIK
     Semua fungsi di bawah ini menerima nama tabel (lihat
     CONFIG.TABLES) sehingga bisa dipakai untuk produk,
     transaksi, pelanggan, shift, dll tanpa duplikasi kode.
     =================================================== */

  /**
   * Mengambil semua baris dari sebuah tabel, dengan filter opsional.
   * @param {string} table - nama tabel, mis. CONFIG.TABLES.PRODUCTS
   * @param {object} params - query params PostgREST, mis. { select: '*', order: 'created_at.desc' }
   * @returns {Promise<Array>}
   */
  async fetchAll(table, params = {}) {
    if (!this.isConfigured()) {
      return Offline.getLocal(table);
    }

    try {
      const query = new URLSearchParams({ select: '*', ...params }).toString();
      const res = await fetch(`${CONFIG.SUPABASE_REST_URL}/${table}?${query}`, {
        method: 'GET',
        headers: this._headers(),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        console.error(`[API] Detail error fetchAll('${table}'):`, errorBody);
        throw new Error(`Gagal mengambil data ${table}: ${res.status}`);
      }

      const data = await res.json();
      Offline.saveLocal(table, data); // simpan cache lokal untuk fallback berikutnya
      STATE.isSupabaseConnected = true;
      return data;
    } catch (err) {
      console.warn(`[API] fetchAll('${table}') gagal, fallback ke localStorage:`, err.message);
      STATE.isSupabaseConnected = false;
      return Offline.getLocal(table);
    }
  },

  /**
   * Menyisipkan satu atau beberapa baris baru ke tabel.
   * @param {string} table
   * @param {object|Array} payload
   * @returns {Promise<Array>} baris yang berhasil disimpan
   */
  async insert(table, payload) {
    if (!this.isConfigured()) {
      return Offline.insertLocal(table, payload);
    }

    try {
      const res = await fetch(`${CONFIG.SUPABASE_REST_URL}/${table}`, {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        console.error(`[API] Detail error insert('${table}'):`, errorBody);
        const detail = errorBody?.message || errorBody?.hint || errorBody?.details || '';
        throw new Error(`Gagal menyimpan ke ${table}: ${res.status}${detail ? ' — ' + detail : ''}`);
      }

      const data = await res.json();
      Offline.insertLocal(table, data, { skipQueue: true }); // sync cache lokal
      return data;
    } catch (err) {
      console.warn(`[API] insert('${table}') gagal, disimpan ke antrean offline:`, err.message);
      Utils.showToast(`Gagal simpan ke server: ${err.message}`, 'error', 8000);
      Offline.queueSync('insert', table, payload);
      return Offline.insertLocal(table, payload);
    }
  },

  /**
   * Memperbarui baris yang cocok dengan filter (mis. { id: 'eq.5' }).
   * @param {string} table
   * @param {object} filter - mis. { id: `eq.${id}` }
   * @param {object} payload - field yang ingin diubah
   */
  async update(table, filter, payload) {
    if (!this.isConfigured()) {
      return Offline.updateLocal(table, filter, payload);
    }

    try {
      const query = new URLSearchParams(filter).toString();
      const res = await fetch(`${CONFIG.SUPABASE_REST_URL}/${table}?${query}`, {
        method: 'PATCH',
        headers: this._headers(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        console.error(`[API] Detail error update('${table}'):`, errorBody);
        const detail = errorBody?.message || errorBody?.hint || errorBody?.details || '';
        throw new Error(`Gagal memperbarui ${table}: ${res.status}${detail ? ' — ' + detail : ''}`);
      }

      const data = await res.json();

      // Kasus khusus: request PATCH sukses (200) tapi tidak ada baris yang
      // cocok di server — ini terjadi kalau ID yang di-update adalah ID
      // buatan lokal (produk yang gagal ter-insert ke Supabase sebelumnya
      // dan belum sempat disinkronkan). Perubahan tetap disimpan ke
      // localStorage di bawah, tapi TIDAK benar-benar tersimpan di server,
      // sehingga akan "hilang"/kembali seperti semula saat data di-fetch
      // ulang dari Supabase (mis. setelah refresh halaman).
      if (Array.isArray(data) && data.length === 0) {
        console.warn(`[API] update('${table}') tidak menemukan baris cocok di server (ID mungkin belum tersinkron)`);
        Utils.showToast(
          'Perubahan tersimpan sementara di HP, tapi belum nyambung ke server (data lama belum tersinkron). Cek koneksi/pengaturan Supabase.',
          'warning',
          8000
        );
      }

      Offline.updateLocal(table, filter, payload, { skipQueue: true });
      return data;
    } catch (err) {
      console.warn(`[API] update('${table}') gagal, disimpan ke antrean offline:`, err.message);
      Utils.showToast(`Gagal update ke server: ${err.message}`, 'error', 8000);
      Offline.queueSync('update', table, { filter, payload });
      return Offline.updateLocal(table, filter, payload);
    }
  },

  /**
   * Menghapus baris yang cocok dengan filter.
   * @param {string} table
   * @param {object} filter - mis. { id: `eq.${id}` }
   */
  async remove(table, filter) {
    if (!this.isConfigured()) {
      return Offline.removeLocal(table, filter);
    }

    try {
      const query = new URLSearchParams(filter).toString();
      const res = await fetch(`${CONFIG.SUPABASE_REST_URL}/${table}?${query}`, {
        method: 'DELETE',
        headers: this._headers(),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        console.error(`[API] Detail error remove('${table}'):`, errorBody);
        throw new Error(`Gagal menghapus dari ${table}: ${res.status}`);
      }

      Offline.removeLocal(table, filter, { skipQueue: true });
      return true;
    } catch (err) {
      console.warn(`[API] remove('${table}') gagal, disimpan ke antrean offline:`, err.message);
      Offline.queueSync('delete', table, { filter });
      return Offline.removeLocal(table, filter);
    }
  },

  /* ===================================================
     SHORTCUT PER-ENTITAS
     Pembungkus tipis di atas fungsi generik agar kode
     pemanggil di modul lain lebih mudah dibaca.
     =================================================== */

  products: {
    getAll: () => API.fetchAll(CONFIG.TABLES.PRODUCTS, { order: 'name.asc' }),
    create: (product) => API.insert(CONFIG.TABLES.PRODUCTS, product),
    update: (id, changes) => API.update(CONFIG.TABLES.PRODUCTS, { id: `eq.${id}` }, changes),
    delete: (id) => API.remove(CONFIG.TABLES.PRODUCTS, { id: `eq.${id}` }),
  },

  transactions: {
    getAll: () => API.fetchAll(CONFIG.TABLES.TRANSACTIONS, { order: 'created_at.desc' }),
    create: (transaction) => API.insert(CONFIG.TABLES.TRANSACTIONS, transaction),
    update: (id, changes) => API.update(CONFIG.TABLES.TRANSACTIONS, { id: `eq.${id}` }, changes),
  },

  transactionItems: {
    create: (items) => API.insert(CONFIG.TABLES.TRANSACTION_ITEMS, items),
    getByTransaction: (transactionId) =>
      API.fetchAll(CONFIG.TABLES.TRANSACTION_ITEMS, { transaction_id: `eq.${transactionId}` }),
  },

  customers: {
    getAll: () => API.fetchAll(CONFIG.TABLES.CUSTOMERS, { order: 'name.asc' }),
    create: (customer) => API.insert(CONFIG.TABLES.CUSTOMERS, customer),
    update: (id, changes) => API.update(CONFIG.TABLES.CUSTOMERS, { id: `eq.${id}` }, changes),
    delete: (id) => API.remove(CONFIG.TABLES.CUSTOMERS, { id: `eq.${id}` }),
  },

  shifts: {
    getAll: () => API.fetchAll(CONFIG.TABLES.SHIFTS, { order: 'opened_at.desc' }),
    create: (shift) => API.insert(CONFIG.TABLES.SHIFTS, shift),
    update: (id, changes) => API.update(CONFIG.TABLES.SHIFTS, { id: `eq.${id}` }, changes),
  },

  /**
   * Mengecek konektivitas ke Supabase dengan request ringan.
   * Dipakai saat aplikasi pertama kali dimuat untuk menentukan
   * apakah memakai mode online atau offline-first.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    if (!this.isConfigured()) {
      STATE.isSupabaseConnected = false;
      return false;
    }
    try {
      const res = await fetch(`${CONFIG.SUPABASE_REST_URL}/${CONFIG.TABLES.PRODUCTS}?select=id&limit=1`, {
        headers: this._headers(),
      });
      STATE.isSupabaseConnected = res.ok;
      return res.ok;
    } catch {
      STATE.isSupabaseConnected = false;
      return false;
    }
  },
};
