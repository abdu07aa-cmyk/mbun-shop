/* =====================================================
   WARUNGKITA PRO MAX — API.JS
   Lapisan akses ke Supabase. Semua modul memanggil fungsi
   di sini untuk CRUD data, bukan langsung memakai supabase
   client. Dengan begitu jika suatu saat mau ganti backend,
   cukup ubah di file ini saja.
   ===================================================== */

// Inisialisasi Supabase client
const supabaseClient = supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

const API = {
  /* ---------- PRODUK ---------- */
  products: {
    /** Ambil semua produk */
    async getAll() {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },

    /** Ambil satu produk berdasarkan ID */
    async getById(id) {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    /** Tambah produk baru */
    async create(product) {
      const { data, error } = await supabaseClient
        .from('products')
        .insert([product])
        .select();
      if (error) throw error;
      return data || [];
    },

    /** Update produk */
    async update(id, changes) {
      const { data, error } = await supabaseClient
        .from('products')
        .update(changes)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data || [];
    },

    /** Hapus produk */
    async delete(id) {
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },

    /** Update stok (increment/decrement) */
    async updateStock(id, delta) {
      // Ambil produk dulu
      const product = await this.getById(id);
      if (!product) throw new Error('Produk tidak ditemukan');

      const newStock = Math.max(0, (product.stock || 0) + delta);
      return this.update(id, { stock: newStock });
    },
  },

  /* ---------- TRANSAKSI ---------- */
  transactions: {
    /** Ambil semua transaksi */
    async getAll() {
      const { data, error } = await supabaseClient
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    /** Ambil transaksi dengan filter tanggal */
    async getByDateRange(startDate, endDate) {
      const { data, error } = await supabaseClient
        .from('transactions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    /** Ambil satu transaksi + item detail */
    async getWithItems(id) {
      const { data, error } = await supabaseClient
        .from('transactions')
        .select('*, items:transaction_items(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    /** Buat transaksi baru (header + items) */
    async create(transactionData) {
      const { items, ...header } = transactionData;

      // Insert header
      const { data: headerData, error: headerError } = await supabaseClient
        .from('transactions')
        .insert([header])
        .select();
      if (headerError) throw headerError;

      const transaction = headerData?.[0];
      if (!transaction) throw new Error('Gagal membuat transaksi');

      // Insert items jika ada
      if (items && items.length > 0) {
        const itemsWithTransactionId = items.map(item => ({
          ...item,
          transaction_id: transaction.id,
        }));

        const { error: itemsError } = await supabaseClient
          .from('transaction_items')
          .insert(itemsWithTransactionId);
        if (itemsError) throw itemsError;
      }

      // Update stok produk
      for (const item of items || []) {
        if (item.product_id) {
          await API.products.updateStock(item.product_id, -item.quantity);
        }
      }

      return transaction;
    },

    /** Update transaksi (misal status) */
    async update(id, changes) {
      const { data, error } = await supabaseClient
        .from('transactions')
        .update(changes)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data || [];
    },

    /** Hapus transaksi (beserta items) */
    async delete(id) {
      // Hapus items dulu (cascade)
      const { error: itemsError } = await supabaseClient
        .from('transaction_items')
        .delete()
        .eq('transaction_id', id);
      if (itemsError) throw itemsError;

      const { error } = await supabaseClient
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
  },

  /* ---------- PELANGGAN ---------- */
  customers: {
    async getAll() {
      const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },

    async getById(id) {
      const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(customer) {
      const { data, error } = await supabaseClient
        .from('customers')
        .insert([customer])
        .select();
      if (error) throw error;
      return data || [];
    },

    async update(id, changes) {
      const { data, error } = await supabaseClient
        .from('customers')
        .update(changes)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data || [];
    },

    async delete(id) {
      const { error } = await supabaseClient
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },

    /** Tambah poin ke pelanggan */
    async addPoints(id, points) {
      const customer = await this.getById(id);
      if (!customer) throw new Error('Pelanggan tidak ditemukan');
      return this.update(id, { points: (customer.points || 0) + points });
    },
  },

  /* ---------- SHIFT ---------- */
  shifts: {
    async getAll() {
      const { data, error } = await supabaseClient
        .from('shifts')
        .select('*')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getActive() {
      const { data, error } = await supabaseClient
        .from('shifts')
        .select('*')
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },

    async create(shift) {
      const { data, error } = await supabaseClient
        .from('shifts')
        .insert([shift])
        .select();
      if (error) throw error;
      return data || [];
    },

    async update(id, changes) {
      const { data, error } = await supabaseClient
        .from('shifts')
        .update(changes)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data || [];
    },

    async close(id, endTime, totalCash) {
      return this.update(id, {
        end_time: endTime || new Date().toISOString(),
        total_cash: totalCash || 0,
        status: 'closed',
      });
    },
  },

  /* ---------- STORAGE (Gambar) ---------- */
  storage: {
    /** Upload file ke bucket */
    async upload(bucket, path, file) {
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
      if (error) throw error;
      return data;
    },

    /** Dapatkan URL publik */
    getPublicUrl(bucket, path) {
      const { data } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(path);
      return data.publicUrl;
    },

    /** Hapus file */
    async delete(bucket, paths) {
      const { error } = await supabaseClient.storage
        .from(bucket)
        .remove(paths);
      if (error) throw error;
      return true;
    },
  },
};

// Ekspor untuk debugging
window.API = API;
