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
      title: 'Selamat Datang di WarungKita PRO MAX 👋',
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

    // Isi form pengaturan saat view Pengaturan dibuka
    STATE.subscribe('view', () => {
      if (STATE.currentView === 'pengaturan') this.populateSettingsForm();
    });
  },
};
