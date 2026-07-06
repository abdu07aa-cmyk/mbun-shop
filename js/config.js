/* =====================================================
   WARUNGKITA PRO MAX — CONFIG.JS
   Konfigurasi koneksi Supabase dan konstanta global
   aplikasi. File ini HARUS dimuat paling pertama
   (sebelum state.js, api.js, dll) karena modul lain
   bergantung pada objek CONFIG di sini.
   ===================================================== */

const CONFIG = {
  /* ---------- SUPABASE ---------- */
  // URL project Supabase. Bisa di-override dari halaman Pengaturan
  // dan akan disimpan ke localStorage (lihat js/modules/auth.js).
  SUPABASE_URL: localStorage.getItem('wk_supabase_url') || 'https://marelgsluzshkwxwcjod.supabase.co',

  // Anon/public key Supabase. JANGAN pernah commit service_role key di sini.
  SUPABASE_ANON_KEY: localStorage.getItem('wk_supabase_key') || '',

  // Endpoint REST Supabase (PostgREST). Dipakai oleh js/api.js
  get SUPABASE_REST_URL() {
    return `${this.SUPABASE_URL}/rest/v1`;
  },

  /* ---------- NAMA TABEL DATABASE ---------- */
  TABLES: {
    PRODUCTS: 'products',
    TRANSACTIONS: 'transactions',
    TRANSACTION_ITEMS: 'transaction_items',
    SHIFTS: 'shifts',
    CUSTOMERS: 'customers',
    STOCK_MOVEMENTS: 'stock_movements',
  },

  /* ---------- INFORMASI TOKO ---------- */
  STORE: {
    NAME: 'Zhafran Store',
    TAGLINE: 'Belanja Hemat, Hidup Nikmat',
    ADDRESS: 'Kp.Rawasapi Rt 03/09,Kel.Jatimulya Kec.Tambun Selatan. Bekasi ',
    PHONE: '0897-3488-963',
  },

  /* ---------- METODE PEMBAYARAN ---------- */
  PAYMENT_METHODS: [
    { id: 'cash', label: 'Tunai', icon: 'fa-money-bill-wave' },
    { id: 'qris', label: 'QRIS', icon: 'fa-qrcode' },
    { id: 'transfer', label: 'Transfer Bank', icon: 'fa-building-columns' },
    { id: 'ewallet', label: 'E-Wallet', icon: 'fa-wallet' },
  ],

  /* ---------- KODE DISKON BAWAAN ---------- */
  DISCOUNT_CODES: {
    WARUNG10: { type: 'percent', value: 10, label: 'Diskon 10%' },
    HEMAT20: { type: 'percent', value: 20, label: 'Diskon 20%' },
    PROMO50: { type: 'percent', value: 50, label: 'Diskon 50%' },
  },

  /* ---------- AMBANG BATAS STOK MENIPIS ---------- */
  LOW_STOCK_THRESHOLD: 5,

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  SHORTCUTS: {
    FOCUS_SEARCH: { key: 'k', ctrlKey: true },
    NEW_PRODUCT: { key: 'n', ctrlKey: true },
    TOGGLE_DARK_MODE: { key: 'd', ctrlKey: true },
    PROCESS_PAYMENT: { key: 'F9' },
    CLOSE_ESCAPE: { key: 'Escape' },
  },

  /* ---------- PENGATURAN UMUM ---------- */
  CURRENCY: 'IDR',
  CURRENCY_LOCALE: 'id-ID',
  DEFAULT_PAGE_SIZE: 20,

  /* ---------- KUNCI LOCALSTORAGE (untuk offline-first / fallback) ---------- */
  STORAGE_KEYS: {
    PRODUCTS: 'wk_products',
    TRANSACTIONS: 'wk_transactions',
    CART: 'wk_cart',
    CUSTOMERS: 'wk_customers',
    SHIFTS: 'wk_shifts',
    HELD_CARTS: 'wk_held_carts',
    THEME: 'wk_theme',
    SYNC_QUEUE: 'wk_sync_queue',
  },

  /* ---------- FLAG FITUR (untuk mengaktifkan/menonaktifkan fitur secara cepat) ---------- */
  FEATURES: {
    OFFLINE_MODE: true,
    AI_ASSISTANT: true,
    SOUND_EFFECTS: true,
    BARCODE_SCANNER: true,
  },
};

// Bekukan objek konfigurasi tingkat atas agar tidak sengaja
// diubah dari modul lain (mutasi nilai di dalam TABLES/STORE
// tetap dimungkinkan kecuali ikut di-freeze juga).
Object.freeze(CONFIG.TABLES);
Object.freeze(CONFIG.STORE);
Object.freeze(CONFIG.STORAGE_KEYS);
