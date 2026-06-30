/**
 * js/config.js
 * - Konfigurasi Supabase (REST) dan konstanta aplikasi
 * - Ditulis sebagai modul ES (export).
 *
 * CATATAN:
 * - Masukkan SUPABASE_KEY Anda di runtime / environment. Jangan commit key ke VCS.
 * - File ini berfungsi sebagai sumber konstanta yang dipakai seluruh aplikasi.
 */

/* Supabase (REST) */
export const SUPABASE_URL = 'https://marelgsluzshkwxwcjod.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmVsZ3NsdXpzaGt3eHdjam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDg3MzIsImV4cCI6MjA5ODI4NDczMn0.73CLxhbxhO28UplJU8C1-mtNawlsMegVsORXY7PPzlg'  // <-- ISI DENGAN KEY ANDA DI SINI (atau set via env di build)

/* API endpoints (REST) */
export const ENDPOINTS = {
  products: `${SUPABASE_URL}/rest/v1/products`,
  transactions: `${SUPABASE_URL}/rest/v1/transactions`,
  transaction_items: `${SUPABASE_URL}/rest/v1/transaction_items`,
  shifts: `${SUPABASE_URL}/rest/v1/shifts`,
  customers: `${SUPABASE_URL}/rest/v1/customers`
};

/* Table names (dipakai untuk query & konsistensi) */
export const TABLES = {
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  TRANSACTION_ITEMS: 'transaction_items',
  SHIFTS: 'shifts',
  CUSTOMERS: 'customers'
};

/* App config */
export const APP_CONFIG = {
  name: 'WarungKita PRO MAX',
  currency: 'IDR',
  locale: 'id-ID',
  storageKey: 'warungkita:state:v1',      // localStorage key untuk menyimpan state
  autosaveInterval: 1000,                 // debounce ms untuk autosave state
  defaultTheme: 'light',
  supportedPayments: ['cash', 'qris', 'transfer', 'ewallet'],
  discountCodes: {
    WARUNG10: 0.10,
    HEMAT20: 0.20,
    PROMO50: 0.50
  },
  // Headers umum apabila memakai Supabase REST API
  supabaseHeaders: (key = SUPABASE_KEY) => ({
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': key ? `Bearer ${key}` : ''
  })
};

/* Export helper untuk format uang default (bisa di-override di utils) */
export function formatCurrency(value) {
  try {
    return new Intl.NumberFormat(APP_CONFIG.locale, {
      style: 'currency',
      currency: APP_CONFIG.currency,
      maximumFractionDigits: 0
    }).format(value);
  } catch (e) {
    // fallback sederhana
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
  }
}
