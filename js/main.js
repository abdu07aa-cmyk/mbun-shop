/* =====================================================
   WARUNGKITA PRO MAX — MAIN.JS
   Entry point utama aplikasi. Menginisialisasi semua
   modul, mengatur routing antar view, dan menyediakan
   beberapa fungsi global yang dipanggil dari modul lain.
   ===================================================== */

const AppMain = {
  /** Menyimpan referensi ke semua view section */
  _views: {},

  /** Apakah aplikasi sudah siap */
  isReady: false,

  /* ===================================================
     INISIALISASI
     =================================================== */

  async init() {
    if (this.isReady) return;

    try {
      // 1. Setup tema dari localStorage
      this._applyTheme();

      // 2. Inisialisasi semua modul
      await this._initModules();

      // 3. Daftarkan view dan navigasi
      this._setupViews();

      // 4. Muat data awal
      await this._loadInitialData();

      // 5. Render dashboard
      this.renderDashboard();

      // 6. Inisialisasi Events
      try {
        EventsModule.init();
      } catch (e) {
        console.warn('[AppMain] Gagal inisialisasi EventsModule:', e);
      }

      // 7. Sembunyikan loading screen
      this._hideLoading();

      this.isReady = true;
      console.log('✅ MBUN COLLECTION siap!');
    } catch (error) {
      console.error('[AppMain] Error fatal saat init:', error);
      Utils.showToast('Gagal memuat aplikasi. Refresh halaman.', 'error');
    }
  },

  /** Menerapkan tema dari STATE */
  _applyTheme() {
    const theme = STATE.theme || 'light';
    document.body.setAttribute('data-theme', theme);
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) icon.className = `fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
  },

  /** Inisialisasi semua modul (urutan penting) */
  async _initModules() {
    // Modul yang tidak butuh data awal
    ProductsModule.init();
    CartModule.init();
    StockModule.init();

    // Modul yang butuh state
    Notifications?.init?.();
    BarcodeModule?.init?.();
    HoldCartModule?.init?.();
    PaymentModule?.init?.();
    ExportModule?.init?.();
    BackupModule?.init?.();
    ShiftModule?.init?.();
    SplitPaymentModule?.init?.();
    ReturnsModule?.init?.();

    // AI & Auth diinisialisasi nanti
  },

  /** Mendaftarkan view-section untuk routing */
  _setupViews() {
    this._views = {};
    document.querySelectorAll('.view').forEach(el => {
      const viewName = el.dataset.view;
      if (viewName) {
        this._views[viewName] = el;
      }
    });

    // Navigasi default: dashboard
    this.switchView('dashboard');
  },

  /** Memuat data awal dari API */
  async _loadInitialData() {
    try {
      // Load produk (paling penting)
      await ProductsModule.load();

      // Load data lainnya
      await Promise.allSettled([
        API.transactions.getAll().then(data => STATE.setTransactions(data || [])),
        API.customers.getAll().then(data => STATE.setCustomers(data || [])),
        API.shifts.getAll().then(data => STATE.setShifts(data || [])),
      ]);

      // Update low stock badge di notifikasi
      Notifications?.checkLowStock?.();
    } catch (error) {
      console.warn('[AppMain] Gagal memuat beberapa data:', error);
      // Tetap lanjut, data mungkin kosong
    }
  },

  /** Sembunyikan loading screen */
  _hideLoading() {
    const loading = document.getElementById('loadingScreen');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 400);
    }
  },

  /* ===================================================
     ROUTING / NAVIGASI
     =================================================== */

  /**
   * Berganti ke view tertentu
   * @param {string} viewName - nama view (dashboard/kasir/produk/...)
   */
  switchView(viewName) {
    if (!viewName || !this._views[viewName]) {
      console.warn(`[AppMain] View "${viewName}" tidak ditemukan.`);
      return;
    }

    // Update state
    STATE.setCurrentView(viewName);

    // Sembunyikan semua view
    Object.values(this._views).forEach(el => el.hidden = true);

    // Tampilkan view yang dipilih
    const target = this._views[viewName];
    target.hidden = false;

    // Update active state di sidebar & bottom nav
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === viewName);
    });

    // Update judul halaman
    const titles = {
      dashboard: 'Dashboard',
      kasir: 'Kasir',
      produk: 'Manajemen Produk',
      transaksi: 'Riwayat Transaksi',
      stok: 'Stok Barang',
      pelanggan: 'Pelanggan',
      shift: 'Shift Kasir',
      laporan: 'Laporan Laba/Rugi',
      pengaturan: 'Pengaturan'
    };
    document.title = `MBUN | ${titles[viewName] || viewName}`;

    // Panggil callback saat view berubah
    this._onViewEnter(viewName);
  },

  /** Callback saat masuk ke suatu view */
  _onViewEnter(viewName) {
    switch (viewName) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'kasir':
        ProductsModule.renderProductGrid();
        CartModule.renderCart();
        break;
      case 'produk':
        ProductsModule.renderProductsTable();
        break;
      case 'transaksi':
        this.renderTransactionsTable();
        break;
      case 'stok':
        StockModule.renderStockTable();
        break;
      case 'pelanggan':
        this.renderCustomersTable();
        break;
      case 'shift':
        ShiftModule.renderShiftUI();
        break;
      case 'laporan':
        this.renderLaporan();
        break;
      case 'pengaturan':
        this.renderPengaturan();
        break;
    }
  },

  /* ===================================================
     RENDER: DASHBOARD
     =================================================== */

  renderDashboard() {
    this.renderStats();
    this.renderRecentTransactions();
    this.renderDashboardCharts();
  },

  renderStats() {
    const grid = document.getElementById('statGrid');
    if (!grid) return;

    const totalProducts = STATE.products.length;
    const lowStock = STATE.lowStockProducts.length;
    const todayTransactions = STATE.transactions.filter(t => {
      const today = new Date().toDateString();
      return new Date(t.created_at).toDateString() === today;
    });
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--color-primary-50); color: var(--color-primary);">
          <i class="fa-solid fa-coins"></i>
        </div>
        <div class="stat-card-content">
          <span class="stat-card-label">Omzet Hari Ini</span>
          <span class="stat-card-value">${Utils.formatCurrency(todayRevenue)}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: #dbeafe; color: #2563eb;">
          <i class="fa-solid fa-receipt"></i>
        </div>
        <div class="stat-card-content">
          <span class="stat-card-label">Transaksi Hari Ini</span>
          <span class="stat-card-value">${todayTransactions.length}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: #d1fae5; color: #059669;">
          <i class="fa-solid fa-boxes-stacked"></i>
        </div>
        <div class="stat-card-content">
          <span class="stat-card-label">Total Produk</span>
          <span class="stat-card-value">${totalProducts}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: #fee2e2; color: #dc2626;">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="stat-card-content">
          <span class="stat-card-label">Stok Menipis/Habis</span>
          <span class="stat-card-value ${lowStock > 0 ? 'text-danger' : ''}">${lowStock}</span>
        </div>
      </div>
    `;
  },

  renderRecentTransactions() {
    const tbody = document.querySelector('#recentTransactionsTable tbody');
    if (!tbody) return;

    const recent = STATE.transactions.slice(-10).reverse();

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Belum ada transaksi.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(t => `
      <tr>
        <td><span class="badge badge-info">#${t.id?.slice(0, 8) || 'N/A'}</span></td>
        <td>${Utils.formatDateTime(t.created_at)}</td>
        <td>${Utils.escapeHtml(t.customer_name || 'Umum')}</td>
        <td><span class="badge badge-secondary">${Utils.escapeHtml(t.payment_method || 'Tunai')}</span></td>
        <td>${Utils.formatCurrency(t.total)}</td>
        <td><span class="badge badge-success">Selesai</span></td>
      </tr>
    `).join('');
  },

  renderDashboardCharts() {
    Charts.renderSalesTrend('salesTrendChart');
    Charts.renderTopProducts('topProductsChart');
  },

  /* ===================================================
     RENDER: TABEL TRANSAKSI
     =================================================== */

  renderTransactionsTable() {
    const tbody = document.querySelector('#transactionsTable tbody');
    if (!tbody) return;

    const data = STATE.transactions.slice().reverse();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Belum ada transaksi.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td><span class="badge badge-info">#${t.id?.slice(0, 8) || 'N/A'}</span></td>
        <td>${Utils.formatDateTime(t.created_at)}</td>
        <td>${Utils.escapeHtml(t.cashier_name || 'Kasir')}</td>
        <td>${Utils.escapeHtml(t.customer_name || 'Umum')}</td>
        <td>${t.items?.length || 0} item</td>
        <td><span class="badge badge-secondary">${Utils.escapeHtml(t.payment_method || 'Tunai')}</span></td>
        <td><strong>${Utils.formatCurrency(t.total)}</strong></td>
        <td><span class="badge badge-success">Selesai</span></td>
        <td>
          <button class="icon-btn" data-view-transaction="${t.id}" aria-label="Detail transaksi">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  /* ===================================================
     RENDER: TABEL PELANGGAN
     =================================================== */

  renderCustomersTable() {
    const tbody = document.querySelector('#customersTable tbody');
    if (!tbody) return;

    const data = STATE.customers;

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada pelanggan.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr>
        <td>${Utils.escapeHtml(c.name)}</td>
        <td>${Utils.escapeHtml(c.phone || '-')}</td>
        <td>${c.points || 0}</td>
        <td>${Utils.formatDate(c.created_at)}</td>
        <td>
          <button class="icon-btn" data-edit-customer="${c.id}" aria-label="Edit pelanggan">
            <i class="fa-solid fa-pen"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  /* ===================================================
     RENDER: LAPORAN
     =================================================== */

  renderLaporan() {
    // Sementara kosong, akan diisi oleh modul laporan
  },

  /* ===================================================
     RENDER: PENGATURAN
     =================================================== */

  renderPengaturan() {
    // Render kategori
    ProductsModule.renderCategoryManageList();

    // Load settings dari localStorage
    const url = localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_URL) || '';
    const key = localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_KEY) || '';
    const pin = localStorage.getItem(CONFIG.STORAGE_KEYS.PIN) || '';

    document.getElementById('settingSupabaseUrl').value = url;
    document.getElementById('settingSupabaseKey').value = key;
    document.getElementById('settingPin').value = pin;
  },

  /* ===================================================
     MODAL HELPERS (dipanggil dari events.js)
     =================================================== */

  openProductFormModal(productId = null) {
    const isEdit = !!productId;
    const product = isEdit ? STATE.products.find(p => String(p.id) === String(productId)) : null;

    const title = isEdit ? 'Edit Produk' : 'Tambah Produk Baru';
    const name = product?.name || '';
    const category = product?.category || 'Umum';
    const price = product?.price || '';
    const stock = product?.stock || 0;
    const emoji = product?.emoji || '📦';
    const barcode = product?.barcode || '';
    const modalPrice = product?.modal_price || '';

    ModalManager.open('productForm', {
      title: title,
      size: 'md',
      bodyHtml: `
        <form id="productForm" class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-field" style="grid-column: 1 / -1;">
            <label for="productEmoji">Emoji</label>
            <input type="text" id="productEmoji" value="${emoji}" maxlength="2" style="text-align:center; font-size:24px; width:60px;">
          </div>
          <div class="form-field" style="grid-column: 1 / -1;">
            <label for="productName">Nama Produk *</label>
            <input type="text" id="productName" value="${Utils.escapeHtml(name)}" placeholder="Contoh: Beras Premium 5kg" required>
          </div>
          <div class="form-field">
            <label for="productCategory">Kategori</label>
            <input type="text" id="productCategory" value="${Utils.escapeHtml(category)}" placeholder="Kategori" list="categoryList">
            <datalist id="categoryList">
              ${ProductsModule.getCategories().map(c => `<option value="${Utils.escapeHtml(c)}">`).join('')}
            </datalist>
          </div>
          <div class="form-field">
            <label for="productBarcode">Barcode</label>
            <input type="text" id="productBarcode" value="${Utils.escapeHtml(barcode)}" placeholder="Scan atau ketik barcode">
          </div>
          <div class="form-field">
            <label for="productPrice">Harga Jual (Rp) *</label>
            <input type="number" id="productPrice" value="${price}" placeholder="0" min="0">
          </div>
          <div class="form-field">
            <label for="productModalPrice">Harga Modal (Rp)</label>
            <input type="number" id="productModalPrice" value="${modalPrice}" placeholder="0" min="0">
          </div>
          <div class="form-field">
            <label for="productStock">Stok</label>
            <input type="number" id="productStock" value="${stock}" placeholder="0" min="0">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="saveProductBtn">
          <i class="fa-solid ${isEdit ? 'fa-pen' : 'fa-plus'}"></i> ${isEdit ? 'Update' : 'Tambah'}
        </button>
      `
    });

    // Event save
    document.getElementById('saveProductBtn')?.addEventListener('click', async () => {
      const data = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value.trim() || 'Umum',
        price: Number(document.getElementById('productPrice').value),
        stock: Number(document.getElementById('productStock').value) || 0,
        emoji: document.getElementById('productEmoji').value.trim() || '📦',
        barcode: document.getElementById('productBarcode').value.trim(),
        modal_price: Number(document.getElementById('productModalPrice').value) || 0,
      };

      if (!data.name || !data.price) {
        Utils.showToast('Nama dan harga wajib diisi', 'error');
        return;
      }

      try {
        if (isEdit) {
          await ProductsModule.update(productId, data);
        } else {
          await ProductsModule.create(data);
        }
        ModalManager.close();
      } catch (error) {
        Utils.showToast('Gagal menyimpan produk: ' + error.message, 'error');
      }
    });
  },

  openCustomerFormModal(customerId = null) {
    const isEdit = !!customerId;
    const customer = isEdit ? STATE.customers.find(c => String(c.id) === String(customerId)) : null;

    const title = isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru';
    const name = customer?.name || '';
    const phone = customer?.phone || '';
    const points = customer?.points || 0;

    ModalManager.open('customerForm', {
      title: title,
      size: 'sm',
      bodyHtml: `
        <form id="customerForm" class="form-grid">
          <div class="form-field">
            <label for="customerName">Nama Pelanggan *</label>
            <input type="text" id="customerName" value="${Utils.escapeHtml(name)}" placeholder="Nama lengkap" required>
          </div>
          <div class="form-field">
            <label for="customerPhone">Telepon</label>
            <input type="tel" id="customerPhone" value="${Utils.escapeHtml(phone)}" placeholder="08xx-xxxx-xxxx">
          </div>
          <div class="form-field">
            <label for="customerPoints">Poin</label>
            <input type="number" id="customerPoints" value="${points}" min="0">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="saveCustomerBtn">
          <i class="fa-solid ${isEdit ? 'fa-pen' : 'fa-user-plus'}"></i> ${isEdit ? 'Update' : 'Tambah'}
        </button>
      `
    });

    document.getElementById('saveCustomerBtn')?.addEventListener('click', async () => {
      const data = {
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        points: Number(document.getElementById('customerPoints').value) || 0,
      };

      if (!data.name) {
        Utils.showToast('Nama pelanggan wajib diisi', 'error');
        return;
      }

      try {
        if (isEdit) {
          await API.customers.update(customerId, data);
          STATE.setCustomers(STATE.customers.map(c =>
            String(c.id) === String(customerId) ? { ...c, ...data } : c
          ));
        } else {
          const [created] = await API.customers.create(data);
          STATE.setCustomers([...STATE.customers, created]);
        }
        ModalManager.close();
        this.renderCustomersTable();
        Utils.showToast(`Pelanggan ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success');
      } catch (error) {
        Utils.showToast('Gagal menyimpan: ' + error.message, 'error');
      }
    });
  },

  /* ===================================================
     DESTROY / CLEANUP
     =================================================== */

  destroy() {
    // Hapus semua chart
    Charts.destroyAll();
    this.isReady = false;
  }
};

/* =====================================================
   STARTUP — Jalankan saat DOM siap
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi AppMain
  AppMain.init().catch(err => {
    console.error('[AppMain] Startup error:', err);
    Utils.showToast('Gagal memulai aplikasi. Refresh halaman.', 'error');
  });

  // Handle error global
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] Unhandled rejection:', event.reason);
    Utils.showToast('Terjadi kesalahan. Coba refresh.', 'error');
  });
});

// Ekspor untuk debugging (opsional)
window.AppMain = AppMain;
