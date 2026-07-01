/* =====================================================
   WARUNGKITA PRO MAX — STATE.JS
   Pusat penyimpanan data aplikasi (single source of truth).
   Semua modul membaca/menulis data lewat objek STATE ini
   alih-alih membuat variabel global terpisah-pisah, supaya
   alurnya mudah ditelusuri.

   Pola yang dipakai: STATE menyimpan data + STATE.subscribe()
   untuk komponen yang ingin tahu kapan data berubah
   (mis. cart berubah -> render ulang ringkasan keranjang).
   ===================================================== */

const STATE = {
  /* ---------- DATA UTAMA ---------- */
  products: [],          // Daftar semua produk
  transactions: [],       // Riwayat transaksi
  customers: [],          // Daftar pelanggan
  shifts: [],             // Riwayat shift kasir

  /* ---------- DATA TRANSAKSI BERJALAN ---------- */
  cart: [],               // Item di keranjang saat ini: { productId, name, price, qty, subtotal }
  heldCarts: [],          // Keranjang yang ditahan sementara (fitur Hold Cart)
  activeDiscount: null,   // Kode diskon yang sedang aktif: { code, type, value }
  activeCustomer: null,   // Pelanggan yang dipilih untuk transaksi saat ini

  /* ---------- SHIFT KASIR ---------- */
  currentShift: null,     // Shift yang sedang berjalan, null jika belum buka kasir

  /* ---------- UI STATE ---------- */
  currentView: 'dashboard',
  theme: 'light',
  isSidebarCollapsed: false,
  isLoading: false,
  searchQuery: '',
  activeCategory: 'all',

  /* ---------- STATUS KONEKSI ---------- */
  isOnline: navigator.onLine,
  isSupabaseConnected: false,

  /* ---------- SISTEM SUBSCRIBE/NOTIFY (mini pub-sub) ---------- */
  _listeners: {},

  /**
   * Mendaftarkan fungsi callback yang akan dipanggil saat
   * sebuah "topik" state berubah (mis. 'cart', 'products').
   * @param {string} topic - nama topik, bebas namun harus konsisten antar modul
   * @param {Function} callback
   * @returns {Function} fungsi untuk berhenti berlangganan (unsubscribe)
   */
  subscribe(topic, callback) {
    if (!this._listeners[topic]) this._listeners[topic] = [];
    this._listeners[topic].push(callback);
    return () => {
      this._listeners[topic] = this._listeners[topic].filter(fn => fn !== callback);
    };
  },

  /**
   * Memberitahu semua subscriber suatu topik bahwa datanya berubah.
   * Dipanggil secara manual setelah STATE.products / STATE.cart dsb diubah.
   * @param {string} topic
   */
  notify(topic) {
    (this._listeners[topic] || []).forEach(fn => fn(this));
  },

  /* ---------- HELPER UNTUK MENGUBAH STATE + NOTIFY SEKALIGUS ---------- */

  setProducts(products) {
    this.products = products;
    this.notify('products');
  },

  setCart(cart) {
    this.cart = cart;
    this.notify('cart');
  },

  setTransactions(transactions) {
    this.transactions = transactions;
    this.notify('transactions');
  },

  setCustomers(customers) {
    this.customers = customers;
    this.notify('customers');
  },

  setCurrentView(view) {
    this.currentView = view;
    this.notify('view');
  },

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
    this.notify('theme');
  },

  setCurrentShift(shift) {
    this.currentShift = shift;
    this.notify('shift');
  },

  /* ---------- GETTER TURUNAN (computed) ---------- */

  /** Total harga semua item di keranjang sebelum diskon */
  get cartSubtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  },

  /** Nominal potongan diskon aktif (dalam Rupiah) */
  get cartDiscountAmount() {
    if (!this.activeDiscount) return 0;
    const { type, value } = this.activeDiscount;
    if (type === 'percent') return Math.round(this.cartSubtotal * (value / 100));
    if (type === 'fixed') return Math.min(value, this.cartSubtotal);
    return 0;
  },

  /** Total akhir setelah dikurangi diskon */
  get cartTotal() {
    return Math.max(0, this.cartSubtotal - this.cartDiscountAmount);
  },

  /** Jumlah total item (qty) di keranjang */
  get cartItemCount() {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  },

  /** Daftar produk dengan stok di bawah ambang batas */
  get lowStockProducts() {
    return this.products.filter(p => p.stock <= CONFIG.LOW_STOCK_THRESHOLD);
  },

  /** Apakah shift kasir sedang berjalan */
  get isShiftOpen() {
    return this.currentShift !== null && this.currentShift.status === 'open';
  },

  /* ---------- RESET STATE TRANSAKSI BERJALAN ---------- */
  resetCart() {
    this.cart = [];
    this.activeDiscount = null;
    this.activeCustomer = null;
    this.notify('cart');
  },
};

// Inisialisasi tema dari localStorage saat file dimuat
STATE.theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
