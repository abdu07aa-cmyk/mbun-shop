/* =====================================================
   WARUNGKITA PRO MAX — MODULES/AUTH.JS
   Modul autentikasi & pengaturan koneksi. Saat ini belum
   memakai Supabase Auth penuh (lihat roadmap "Multi-user
   & Role"), tapi sudah menyediakan:
   1. Penyimpanan nama kasir aktif (untuk shift & struk)
   2. Pengaturan kredensial Supabase dari halaman Pengaturan
   3. Kerangka dasar yang siap di-upgrade ke Supabase Auth
   ===================================================== */

const AuthModule = {
  /** Kunci localStorage untuk menyimpan nama kasir aktif */
  _cashierKey: 'wk_cashier_name',

  /** Kunci localStorage untuk menyimpan PIN keamanan */
  _pinKey: 'wk_security_pin',
  /** PIN default kalau pemilik belum pernah mengatur PIN sendiri */
  _defaultPin: 'azmi',

  /* ===================================================
     NAMA KASIR AKTIF
     =================================================== */

  /** Mengambil nama kasir yang sedang login dari localStorage */
  getCashierName() {
    return localStorage.getItem(this._cashierKey) || 'Kasir';
  },

  /**
   * Menyimpan nama kasir aktif dan memperbarui tampilan sidebar.
   * @param {string} name
   */
  setCashierName(name) {
    const clean = name.trim() || 'Kasir';
    localStorage.setItem(this._cashierKey, clean);
    const el = document.getElementById('cashierName');
    if (el) el.textContent = clean;
  },

  /** Meminta nama kasir lewat modal sederhana saat aplikasi pertama kali dibuka */
  promptCashierNameIfNeeded() {
    const existing = localStorage.getItem(this._cashierKey);
    if (existing) {
      this.setCashierName(existing);
      return;
    }

    ModalManager.open('cashierName', {
      title: 'Selamat Datang di MBUN COLLECTION 👋',
      size: 'sm',
      bodyHtml: `
        <label class="form-field">
          <span>Siapa nama Anda (kasir yang bertugas)?</span>
          <input type="text" id="cashierNameInput" placeholder="mis. Budi">
        </label>`,
      footerHtml: `<button class="btn btn-primary btn-block" id="saveCashierNameBtn">Mulai Bekerja</button>`,
      dismissable: false,
    });

    document.getElementById('saveCashierNameBtn')?.addEventListener('click', () => {
      const name = document.getElementById('cashierNameInput')?.value || 'Kasir';
      this.setCashierName(name);
      ModalManager.close();
    });
  },

  /* ===================================================
     PIN KEAMANAN
     Dipakai untuk melindungi aksi sensitif: hapus transaksi,
     hapus produk, memberi diskon. Disimpan di localStorage
     (bukan Supabase) karena ini proteksi tingkat perangkat,
     bukan sistem login multi-user.
     =================================================== */

  getPin() {
    return localStorage.getItem(this._pinKey) || this._defaultPin;
  },

  setPin(pin) {
    const clean = String(pin || '').trim();
    if (!clean) {
      Utils.showToast('PIN tidak boleh kosong', 'error');
      return false;
    }
    localStorage.setItem(this._pinKey, clean);
    Utils.showToast('PIN keamanan berhasil disimpan', 'success');
    return true;
  },

  /**
   * Meminta PIN lewat modal sebelum menjalankan aksi sensitif.
   * @param {string} actionLabel - dijelaskan ke pengguna, mis. "menghapus transaksi ini"
   * @param {() => void} onSuccess - dijalankan HANYA kalau PIN benar
   */
  requirePin(actionLabel, onSuccess) {
    ModalManager.open('pinCheck', {
      title: 'Verifikasi PIN',
      size: 'sm',
      bodyHtml: `
        <p style="margin-bottom: var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
          Masukkan PIN keamanan untuk ${Utils.escapeHtml(actionLabel)}.
        </p>
        <label class="form-field">
          <span>PIN</span>
          <input type="password" id="pinCheckInput" placeholder="••••" autocomplete="off">
        </label>
        <p id="pinCheckError" style="color: var(--color-danger); font-size: var(--font-size-xs); margin-top: var(--space-2); display:none;">
          PIN salah, coba lagi.
        </p>`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="pinCheckConfirmBtn">Konfirmasi</button>`,
    });

    const input = document.getElementById('pinCheckInput');
    input?.focus();

    const verify = () => {
      const entered = input?.value.trim() || '';
      if (entered === this.getPin()) {
        ModalManager.close();
        onSuccess();
      } else {
        const errEl = document.getElementById('pinCheckError');
        if (errEl) errEl.style.display = 'block';
        if (input) { input.value = ''; input.focus(); }
      }
    };

    document.getElementById('pinCheckConfirmBtn')?.addEventListener('click', verify);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verify();
    });
  },

  /* ===================================================
     PENGATURAN KONEKSI SUPABASE
     =================================================== */

  /** Mengisi form pengaturan dengan nilai konfigurasi saat ini */
  populateSettingsForm() {
    const urlInput = document.getElementById('settingSupabaseUrl');
    const keyInput = document.getElementById('settingSupabaseKey');
    if (urlInput) urlInput.value = CONFIG.SUPABASE_URL;
    if (keyInput) keyInput.value = CONFIG.SUPABASE_ANON_KEY;
  },

  /**
   * Menyimpan kredensial Supabase baru dari halaman Pengaturan,
   * lalu menguji koneksinya.
   */
  async saveSupabaseSettings() {
    const url = document.getElementById('settingSupabaseUrl')?.value.trim();
    const key = document.getElementById('settingSupabaseKey')?.value.trim();

    if (Utils.isEmpty(url) || Utils.isEmpty(key)) {
      Utils.showToast('URL dan Key Supabase wajib diisi', 'error');
      return;
    }

    localStorage.setItem('wk_supabase_url', url);
    localStorage.setItem('wk_supabase_key', key);
    CONFIG.SUPABASE_URL = url;
    CONFIG.SUPABASE_ANON_KEY = key;

    Utils.showToast('Menguji koneksi ke Supabase...', 'info');
    const connected = await API.testConnection();

    if (connected) {
      Utils.showToast('Berhasil terhubung ke Supabase ✅', 'success');
      // Muat ulang seluruh data utama setelah berhasil konek
      await Promise.all([
        ProductsModule.load(),
        TransactionsModule?.load?.(),
        CustomersModule?.load?.(),
      ]);
    } else {
      Utils.showToast('Gagal terhubung. Periksa kembali URL dan Key Anda', 'error');
    }
  },

  /* ===================================================
     INISIALISASI
     =================================================== */
  init() {
    this.setCashierName(this.getCashierName());

    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn?.addEventListener('click', () => this.saveSupabaseSettings());

    document.getElementById('savePinBtn')?.addEventListener('click', () => {
      const value = document.getElementById('settingPin')?.value;
      if (this.setPin(value)) {
        const field = document.getElementById('settingPin');
        if (field) field.value = '';
      }
    });

    // Isi form pengaturan saat view Pengaturan dibuka
    STATE.subscribe('view', () => {
      if (STATE.currentView === 'pengaturan') this.populateSettingsForm();
    });
  },
};
