/* =====================================================
   WARUNGKITA PRO MAX — CONFIG.JS
   Konfigurasi global aplikasi: key, URL, threshold,
   daftar kode diskon, shortcut keyboard, dll.
   ===================================================== */

const CONFIG = {
  /* ---------- SUPABASE ---------- */
  SUPABASE_URL: 'https://vpmxphfshgididkqjgct.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbXhwaGZzaGdpZGlka3FqZ2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTU3ODIsImV4cCI6MjA2NDg5MTc4Mn0.5PmzDf0v48oMxJfYwr29g_uzj0fGBsCj4c2j0r3wP-c',

  /* ---------- STORAGE KEYS (localStorage) ---------- */
  STORAGE_KEYS: {
    THEME: 'warungkita_theme',
    CART: 'warungkita_cart',
    HELD_CARTS: 'warungkita_held_carts',
    CATEGORIES: 'warungkita_categories',
    SUPABASE_URL: 'warungkita_supabase_url',
    SUPABASE_KEY: 'warungkita_supabase_key',
    PIN: 'warungkita_pin',
    PREFERENCES: 'warungkita_preferences',
  },

  /* ---------- DEFAULT KATEGORI ---------- */
  DEFAULT_CATEGORIES: [
    'Sembako', 'Minuman', 'Snack & Makanan', 'Bumbu Dapur',
    'Kebersihan', 'Rokok', 'Lainnya'
  ],

  /* ---------- DISKON KODE ---------- */
  DISCOUNT_CODES: {
    'WARUNG10': { type: 'percent', value: 10, label: 'Diskon 10% (WARUNG10)' },
    'WARUNG20': { type: 'percent', value: 20, label: 'Diskon 20% (WARUNG20)' },
    'WARUNG50': { type: 'percent', value: 50, label: 'Diskon 50% (WARUNG50)' },
    'MBUN10': { type: 'percent', value: 10, label: 'Diskon 10% (MBUN10)' },
    'MBUN25': { type: 'percent', value: 25, label: 'Diskon 25% (MBUN25)' },
  },

  /* ---------- AMBANG BATAS ---------- */
  LOW_STOCK_THRESHOLD: 10,
  EXPIRY_WARNING_DAYS: 7,

  /* ---------- SHORTCUT KEYBOARD ---------- */
  SHORTCUTS: {
    FOCUS_SEARCH: { key: 'k', ctrl: true },
    NEW_PRODUCT: { key: 'n', ctrl: true },
    TOGGLE_DARK_MODE: { key: 'd', ctrl: true },
    PROCESS_PAYMENT: { key: 'F9', ctrl: false },
    CLOSE_ESCAPE: { key: 'Escape', ctrl: false },
  },

  /* ---------- CURRENCY ---------- */
  CURRENCY: {
    locale: 'id-ID',
    currency: 'IDR',
  },

  /* ---------- PAGINATION ---------- */
  PAGE_SIZE: 20,

  /* ---------- MODAL ---------- */
  MODAL_ANIMATION_DURATION: 200,
};

// Freeze agar tidak diubah
Object.freeze(CONFIG);
