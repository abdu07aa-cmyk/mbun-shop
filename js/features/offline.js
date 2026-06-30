/**
 * js/features/offline.js
 * - Menangani event online/offline dan sinkronisasi pending data ke Supabase
 * - Menyajikan hooks: initOffline() untuk di-invoke dari main.js
 *
 * Fitur:
 * - Menampilkan notifikasi saat offline/online
 * - Saat kembali online: jalankan api.syncPendingTransactions()
 * - Menyediakan interval background sync (configurable)
 */

import api from '../api.js';
import state from '../state.js';
import utils from '../utils.js';

const SYNC_INTERVAL_MS = 1000 * 60 * 2; // 2 menit (default)
let syncTimer = null;

function onOffline() {
  utils.toast('Anda sedang offline. Aksi akan disimpan secara lokal dan disinkronkan nanti.', { type: 'warning', duration: 4000 });
  window.dispatchEvent(new CustomEvent('warungkita:network:offline'));
}

async function onOnline() {
  utils.toast('Koneksi kembali. Menyinkronkan data...', { type: 'info', duration: 3000 });
  window.dispatchEvent(new CustomEvent('warungkita:network:online'));
  try {
    const results = await api.syncPendingTransactions();
    // Tampilkan ringkasan hasil
    const success = results.filter(r => r.status === 'synced').length;
    const failed = results.filter(r => r.status === 'failed').length;
    utils.toast(`Sinkron selesai. Berhasil: ${success}, Gagal: ${failed}`, { type: failed ? 'warning' : 'success', duration: 4000 });
  } catch (err) {
    console.warn('Sinkronisasi gagal', err);
    utils.toast('Sinkronisasi gagal. Akan dicoba lagi nanti.', { type: 'danger', duration: 4000 });
  }
}

/* Periodic background sync (try only when online and SUPABASE_KEY is set) */
function startPeriodicSync() {
  stopPeriodicSync();
  syncTimer = setInterval(async () => {
    if (navigator.onLine) {
      try {
        await api.syncPendingTransactions();
      } catch (err) {
        // ignore and wait for next tick
        console.warn('Periodic sync failed', err);
      }
    }
  }, SYNC_INTERVAL_MS);
}
function stopPeriodicSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

/* Inisialisasi event listeners */
export function initOffline({ enablePeriodicSync = true } = {}) {
  // Initial state
  if (!navigator.onLine) onOffline();

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Save state before unload to avoid data loss
  window.addEventListener('beforeunload', () => {
    state.saveToLocal?.(); // some environments may not expose; safe call
  });

  if (enablePeriodicSync) startPeriodicSync();
}

/* Cleanup helper (not used now) */
export function destroyOffline() {
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  stopPeriodicSync();
}

export default { initOffline, destroyOffline };
