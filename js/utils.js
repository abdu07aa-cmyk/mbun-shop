/* =====================================================
   WARUNGKITA PRO MAX — UTILS.JS
   Kumpulan fungsi helper murni (pure function) yang
   dipakai di berbagai modul: format angka/tanggal,
   toast notification, debounce, generate ID, dsb.
   Tidak ada modul lain yang di-import di sini supaya
   utils.js bisa dipakai paling awal tanpa dependensi.
   ===================================================== */

const Utils = {
  /* ---------- FORMAT MATA UANG ---------- */
  /**
   * Format angka menjadi format Rupiah, mis. 15000 -> "Rp 15.000"
   * @param {number} value
   * @returns {string}
   */
  formatCurrency(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat(CONFIG.CURRENCY_LOCALE, {
      style: 'currency',
      currency: CONFIG.CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number).replace('IDR', 'Rp');
  },

  /**
   * Format angka biasa dengan pemisah ribuan, mis. 15000 -> "15.000"
   * @param {number} value
   */
  formatNumber(value) {
    return new Intl.NumberFormat(CONFIG.CURRENCY_LOCALE).format(Number(value) || 0);
  },

  /* ---------- FORMAT TANGGAL & WAKTU ---------- */

  /**
   * FIX: Supabase/Postgres kadang mengembalikan timestamp TANPA info zona
   * waktu (mis. "2026-07-06T05:30:00" tanpa "Z" di akhir). String seperti
   * itu, kalau langsung dibuat jadi `new Date(...)`, oleh JavaScript
   * dianggap sebagai WAKTU LOKAL — padahal nilainya sebenarnya UTC. Ini
   * bikin jam yang ditampilkan meleset sebesar selisih zona waktu (di
   * Indonesia/WIB, meleset 7 jam). Fungsi ini memaksa string tanpa
   * info zona waktu untuk dianggap UTC (dengan menambahkan "Z"), supaya
   * jam yang ditampilkan ke pengguna akurat sesuai zona waktu lokal HP.
   * @param {string|Date|number} value
   * @returns {Date}
   */
  _parseDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const hasTimezoneInfo = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value);
      if (!hasTimezoneInfo) {
        // Format "YYYY-MM-DD HH:MM:SS" (spasi) -> ubah jadi "YYYY-MM-DDTHH:MM:SSZ"
        const normalized = value.includes('T') ? value : value.replace(' ', 'T');
        return new Date(normalized + 'Z');
      }
    }
    return new Date(value);
  },

  /**
   * Format ISO date string menjadi format tanggal Indonesia.
   * @param {string|Date} date
   * @param {object} options - opsi tambahan Intl.DateTimeFormat
   */
  formatDate(date, options = {}) {
    const d = this._parseDate(date);
    return new Intl.DateTimeFormat(CONFIG.CURRENCY_LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(d);
  },

  /** Format tanggal + jam, mis. "30 Jun 2026, 14:05" */
  formatDateTime(date) {
    const d = this._parseDate(date);
    const datePart = this.formatDate(d);
    const timePart = new Intl.DateTimeFormat(CONFIG.CURRENCY_LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
    return `${datePart}, ${timePart}`;
  },

  /** Mengubah tanggal menjadi teks relatif, mis. "5 menit lalu" */
  formatRelativeTime(date) {
    const now = new Date();
    const target = this._parseDate(date);
    const diffSeconds = Math.floor((now - target) / 1000);

    if (diffSeconds < 60) return 'Baru saja';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit lalu`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam lalu`;
    if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} hari lalu`;
    return this.formatDate(target);
  },

  /* ---------- ID GENERATOR ---------- */
  /**
   * Membuat ID unik sederhana berbasis timestamp + random string.
   * Dipakai untuk record yang dibuat secara offline sebelum
   * disinkronkan ke Supabase (yang biasanya pakai UUID/serial).
   * @param {string} prefix - mis. 'TRX', 'PRD'
   */
  generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  },

  /* ---------- DEBOUNCE & THROTTLE ---------- */
  /**
   * Mengembalikan versi "debounced" dari sebuah fungsi — fungsi
   * baru hanya dijalankan setelah `delay` ms tanpa pemanggilan baru.
   * Cocok untuk input pencarian.
   * @param {Function} fn
   * @param {number} delay
   */
  debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Membatasi pemanggilan fungsi maksimal sekali per `limit` ms.
   * @param {Function} fn
   * @param {number} limit
   */
  throttle(fn, limit = 300) {
    let waiting = false;
    return (...args) => {
      if (waiting) return;
      fn(...args);
      waiting = true;
      setTimeout(() => { waiting = false; }, limit);
    };
  },

  /* ---------- TOAST NOTIFICATION ---------- */
  /**
   * Menampilkan notifikasi toast sementara di pojok kanan atas.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration - ms sebelum toast hilang otomatis
   */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };

    const toast = document.createElement('div');
    toast.className = `toast is-${type}`;
    toast.innerHTML = `
      <span class="toast-icon"><i class="fa-solid ${icons[type] || icons.info}"></i></span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  /* ---------- KEAMANAN: ESCAPE HTML ---------- */
  /**
   * Mencegah XSS saat menyisipkan teks dari user/database ke innerHTML.
   * @param {string} str
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  },

  /* ---------- VALIDASI ---------- */
  isEmpty(value) {
    return value === null || value === undefined || String(value).trim() === '';
  },

  isValidPhone(phone) {
    return /^(\+62|0)8[1-9][0-9]{6,10}$/.test(String(phone).replace(/[\s-]/g, ''));
  },

  /* ---------- SOUND EFFECTS (Web Audio API, tanpa file eksternal) ---------- */
  _audioCtx: null,

  /**
   * Memainkan bunyi pendek menggunakan oscillator Web Audio API.
   * @param {'success'|'error'|'click'|'cash'} type
   */
  playSound(type = 'click') {
    if (!CONFIG.FEATURES.SOUND_EFFECTS) return;
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this._audioCtx;

      // FIX: browser modern (Chrome/Safari) otomatis men-suspend AudioContext
      // kalau dibuat/dipakai di luar user-gesture langsung (mis. dari callback
      // kamera scanner yang berjalan otomatis, bukan dari klik langsung).
      // Tanpa resume() ini, oscillator tetap "start" tapi tidak ada suara
      // yang benar-benar keluar.
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const presets = {
        click: { freq: 600, duration: 0.05, type: 'sine' },
        success: { freq: 880, duration: 0.15, type: 'sine' },
        error: { freq: 220, duration: 0.2, type: 'sawtooth' },
        cash: { freq: 1200, duration: 0.1, type: 'triangle' },
      };
      const preset = presets[type] || presets.click;

      osc.type = preset.type;
      osc.frequency.value = preset.freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + preset.duration);

      osc.start();
      osc.stop(ctx.currentTime + preset.duration);
    } catch (err) {
      // Diam-diam gagal jika browser tidak mendukung Web Audio API
      console.warn('Gagal memutar suara:', err);
    }
  },

  /**
   * Panggil dari dalam event handler klik/tap langsung untuk "membuka
   * kunci" AudioContext, supaya playSound() yang dipanggil belakangan
   * dari callback asinkron (mis. hasil scan kamera) tetap bisa bunyi.
   */
  unlockAudio() {
    if (!CONFIG.FEATURES.SOUND_EFFECTS) return;
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }
    } catch {
      // aman diabaikan
    }
  },

  /* ---------- CLONE & PERBANDINGAN OBJEK ---------- */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /* ---------- DOM HELPER ---------- */
  /** Shortcut untuk document.querySelector */
  qs(selector, scope = document) {
    return scope.querySelector(selector);
  },

  /** Shortcut untuk document.querySelectorAll, mengembalikan array */
  qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  },

  /* ---------- DOWNLOAD FILE (dipakai oleh fitur export) ---------- */
  /**
   * Memicu unduhan file dari konten string di browser.
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
