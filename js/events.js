/* =====================================================
   WARUNGKITA PRO MAX — EVENTS.JS
   Dua bagian utama di file ini:
   1. ModalManager — helper generik untuk buka/tutup modal
      yang dipakai seluruh modul di js/modules & js/features
   2. EventsModule — mendaftarkan SEMUA event listener DOM
      (klik tombol, keyboard shortcut, navigasi view, dsb)
      di satu tempat agar mudah ditelusuri dan dirawat.
   ===================================================== */

/* =====================================================
   BAGIAN 1 — MODAL MANAGER
   ===================================================== */

const ModalManager = {
  /** Apakah modal sedang terbuka */
  isOpen: false,

  /**
   * Membuka modal baru di dalam #modalRoot.
   * @param {string} id - identifier unik modal (bebas, untuk debugging)
   * @param {object} options
   * @param {string} options.title - judul header modal
   * @param {'sm'|'md'|'lg'|'xl'} options.size - lebar modal
   * @param {string} options.bodyHtml - HTML konten modal
   * @param {string} options.footerHtml - HTML tombol footer
   * @param {boolean} options.dismissable - bisa ditutup klik overlay (default: true)
   */
  open(id, { title = '', size = 'md', bodyHtml = '', footerHtml = '', dismissable = true } = {}) {
    const root = document.getElementById('modalRoot');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="modalTitle" id="modal-${id}">
          <div class="modal-header">
            <h3 id="modalTitle">${Utils.escapeHtml(title)}</h3>
            <button class="modal-close-btn" data-modal-close aria-label="Tutup modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>`;

    root.classList.add('is-open');
    root.removeAttribute('aria-hidden');
    this.isOpen = true;

    // Fokus ke elemen pertama yang bisa difokus di dalam modal
    setTimeout(() => {
      const focusable = root.querySelector('input, button, select, textarea, [tabindex="0"]');
      focusable?.focus();
    }, 50);

    // Event: tutup saat klik overlay (di luar modal)
    if (dismissable) {
      document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') this.close();
      });
    }

    // Event: tutup saat klik tombol [data-modal-close]
    root.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
  },

  /** Menutup dan membersihkan modal yang sedang aktif */
  close() {
    const root = document.getElementById('modalRoot');
    if (!root) return;
    root.innerHTML = '';
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
  },
};

/* =====================================================
   BAGIAN 2 — EVENTS MODULE
   ===================================================== */

const EventsModule = {
  init() {
    this._bindNavigation();
    this._bindTopbar();
    this._bindKasirView();
    this._bindProdukView();
    this._bindPengaturanView();
    this._bindTransaksiView();
    this._bindStokView();
    this._bindPelangganView();
    this._bindKeyboardShortcuts();
    this._bindGlobalDelegation();
  },

  /* ===================================================
     NAVIGASI SIDEBAR
     =================================================== */
  _bindNavigation() {
    // Tombol nav di sidebar
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        AppMain.switchView(view);
      });
    });

    // Link "Lihat semua" di dashboard
    document.querySelectorAll('[data-view-link]').forEach(link => {
      link.addEventListener('click', () => AppMain.switchView(link.dataset.viewLink));
    });

    // Toggle sidebar collapsed (desktop)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      const app = document.getElementById('app');
      app.classList.toggle('is-sidebar-collapsed');
      STATE.isSidebarCollapsed = app.classList.contains('is-sidebar-collapsed');
    });

    // Tombol hamburger di topbar (mobile)
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('is-mobile-open');
    });

    // Dark mode toggle
    document.getElementById('darkModeToggle')?.addEventListener('click', () => {
      const newTheme = STATE.theme === 'light' ? 'dark' : 'light';
      document.body.setAttribute('data-theme', newTheme);
      STATE.setTheme(newTheme);
      const icon = document.querySelector('#darkModeToggle i');
      if (icon) icon.className = `fa-solid ${newTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
      // Hancurkan chart agar warnanya ikut update tema baru
      Charts.destroyAll();
      AppMain.renderDashboardCharts();
    });
  },

  /* ===================================================
     TOPBAR
     =================================================== */
  _bindTopbar() {
    // Pencarian global (debounce 300ms)
    document.getElementById('globalSearch')?.addEventListener('input',
      Utils.debounce((e) => {
        STATE.searchQuery = e.target.value;
        if (STATE.currentView === 'kasir') {
          ProductsModule.renderProductGrid();
        }
      }, 300)
    );

    // Tombol notifikasi
    document.getElementById('notifBtn')?.addEventListener('click', () => {
      Notifications.openNotificationPanel();
    });

    // Tombol AI Assistant
    document.getElementById('aiAssistantBtn')?.addEventListener('click', () => {
      AIModule.openAssistant();
    });

    // Tombol "Transaksi Baru" — langsung switch ke view Kasir
    document.getElementById('newSaleBtn')?.addEventListener('click', () => {
      AppMain.switchView('kasir');
    });
  },

  /* ===================================================
     VIEW KASIR (POS)
     =================================================== */
  _bindKasirView() {
    // Klik kartu produk di grid → tambah ke keranjang
    document.getElementById('productGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('[data-product-id]');
      if (card && !card.disabled) CartModule.addItem(card.dataset.productId);
    });

    // Filter kategori
    document.getElementById('categoryPills')?.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-category]');
      if (!pill) return;
      STATE.activeCategory = pill.dataset.category;
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      ProductsModule.renderProductGrid();
    });

    // Tombol barcode scanner
    document.getElementById('scanBarcodeBtn')?.addEventListener('click', () => {
      BarcodeModule.openScannerModal();
    });

    // Pilih pelanggan untuk transaksi saat ini
    document.getElementById('selectCustomerBtn')?.addEventListener('click', () => {
      CartModule.openCustomerPicker();
    });

    // Terapkan kode diskon
    document.getElementById('applyDiscountBtn')?.addEventListener('click', () => {
      const code = document.getElementById('discountCodeInput')?.value;
      if (!code || !code.trim()) {
        Utils.showToast('Masukkan kode diskon dulu', 'warning');
        return;
      }

      // PROTEKSI PIN: diskon kode berlaku ke SELURUH keranjang, jadi
      // wajib verifikasi PIN dulu supaya tidak sembarang orang bisa
      // motong harga transaksi.
      AuthModule.requirePin('menerapkan kode diskon', () => {
        if (CartModule.applyDiscountCode(code)) {
          const input = document.getElementById('discountCodeInput');
          if (input) input.value = '';
        }
      });
    });

    // Tahan keranjang
    document.getElementById('holdCartBtn')?.addEventListener('click', () => {
      HoldCartModule.holdCurrentCart();
    });

    // Lihat daftar keranjang yang ditahan
    document.getElementById('viewHeldCartsBtn')?.addEventListener('click', () => {
      HoldCartModule.openHeldCartsModal();
    });
    this._syncHeldCartsBadge();

    // Kosongkan keranjang
    document.getElementById('clearCartBtn')?.addEventListener('click', () => {
      CartModule.clear();
    });

    // Tombol bayar
    document.getElementById('payBtn')?.addEventListener('click', () => {
      PaymentModule.openPaymentModal();
    });
  },

  /* ===================================================
     BADGE KERANJANG DITAHAN
     =================================================== */
  _syncHeldCartsBadge() {
    const badge = document.getElementById('heldCartsBadge');
    if (!badge) return;
    const count = STATE.heldCarts.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  /* ===================================================
     VIEW PRODUK
     =================================================== */
  _bindProdukView() {
    // Tambah produk baru
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
      AppMain.openProductFormModal();
    });

    // Ekspor produk
    document.getElementById('exportProductsBtn')?.addEventListener('click', () => {
      ExportModule.exportProducts();
    });
  },

  /* ===================================================
     VIEW PENGATURAN
     =================================================== */
  _bindPengaturanView() {
    // Tambah kategori produk baru
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
      const input = document.getElementById('newCategoryInput');
      ProductsModule.addCategory(input?.value);
      if (input) input.value = '';
    });

    document.getElementById('newCategoryInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        ProductsModule.addCategory(e.target.value);
        e.target.value = '';
      }
    });

    // Download cadangan semua data
    document.getElementById('backupDataBtn')?.addEventListener('click', () => {
      BackupModule.downloadBackup();
    });

    document.getElementById('restoreDataBtn')?.addEventListener('click', () => {
      BackupModule.openRestoreModal();
    });
  },

  /* ===================================================
     VIEW TRANSAKSI
     =================================================== */
  _bindTransaksiView() {
    document.getElementById('exportTransactionsBtn')?.addEventListener('click', () => {
      ExportModule.exportTransactions();
    });
  },

  /* ===================================================
     VIEW STOK
     =================================================== */
  _bindStokView() {
    document.getElementById('stockInBtn')?.addEventListener('click', () => {
      StockModule.openStockInModal();
    });

    document.getElementById('stockOutBtn')?.addEventListener('click', () => {
      StockModule.openStockOutModal();
    });
  },

  /* ===================================================
     VIEW PELANGGAN
     =================================================== */
  _bindPelangganView() {
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
      AppMain.openCustomerFormModal();
    });
  },

  /* ===================================================
     KEYBOARD SHORTCUTS
     =================================================== */
  _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const s = CONFIG.SHORTCUTS;

      // Ctrl+K — fokus ke search
      if (e.ctrlKey && e.key === s.FOCUS_SEARCH.key) {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }

      // Ctrl+N — tambah produk baru (dari view produk)
      if (e.ctrlKey && e.key === s.NEW_PRODUCT.key) {
        e.preventDefault();
        AppMain.openProductFormModal();
      }

      // Ctrl+D — toggle dark mode
      if (e.ctrlKey && e.key === s.TOGGLE_DARK_MODE.key) {
        e.preventDefault();
        document.getElementById('darkModeToggle')?.click();
      }

      // F9 — proses pembayaran
      if (e.key === s.PROCESS_PAYMENT.key) {
        e.preventDefault();
        PaymentModule.openPaymentModal();
      }

      // Escape — tutup modal atau kosongkan keranjang
      if (e.key === s.CLOSE_ESCAPE.key) {
        if (ModalManager.isOpen) {
          ModalManager.close();
        }
      }
    });
  },

  /* ===================================================
     EVENT DELEGATION GLOBAL
     Menangkap klik pada elemen yang di-render secara
     dinamis (tabel produk, tabel stok, dsb).
     =================================================== */
  _bindGlobalDelegation() {
    document.addEventListener('click', (e) => {
      // Edit produk
      const editBtn = e.target.closest('[data-edit-product]');
      if (editBtn) AppMain.openProductFormModal(editBtn.dataset.editProduct);

      // Pilih pelanggan dari daftar
      const pickCustomerBtn = e.target.closest('[data-pick-customer]');
      if (pickCustomerBtn) CartModule.setActiveCustomer(pickCustomerBtn.dataset.pickCustomer);

      // Edit pelanggan
      const editCustomerBtn = e.target.closest('[data-edit-customer]');
      if (editCustomerBtn) AppMain.openCustomerFormModal(editCustomerBtn.dataset.editCustomer);

      // Hapus produk
      const deleteBtn = e.target.closest('[data-delete-product]');
      if (deleteBtn) {
        if (window.confirm('Hapus produk ini? Tindakan tidak bisa dibatalkan.')) {
          // PROTEKSI PIN: hapus produk itu permanen & sensitif.
          AuthModule.requirePin('menghapus produk ini', () => {
            ProductsModule.remove(deleteBtn.dataset.deleteProduct);
          });
        }
      }

      // Barang masuk dari tabel stok
      const stockInBtn = e.target.closest('[data-stock-in]');
      if (stockInBtn) StockModule.openStockInModal(stockInBtn.dataset.stockIn);

      const stockOutBtn = e.target.closest('[data-stock-out]');
      if (stockOutBtn) StockModule.openStockOutModal(stockOutBtn.dataset.stockOut);

      // Keranjang: increment/decrement/remove
      const incrementBtn = e.target.closest('[data-cart-increment]');
      if (incrementBtn) CartModule.incrementItem(incrementBtn.dataset.cartIncrement);

      const decrementBtn = e.target.closest('[data-cart-decrement]');
      if (decrementBtn) CartModule.decrementItem(decrementBtn.dataset.cartDecrement);

      const removeBtn = e.target.closest('[data-cart-remove]');
      if (removeBtn) CartModule.removeItem(removeBtn.dataset.cartRemove);

      const itemDiscountBtn = e.target.closest('[data-item-discount]');
      if (itemDiscountBtn) CartModule.openItemDiscountModal(itemDiscountBtn.dataset.itemDiscount);
    });
  },
};

/* =====================================================
   MOBILE UX — ditambahkan sebagai extension EventsModule
   ===================================================== */

const MobileUX = {
  init() {
    this._bindBottomNav();
    this._bindCartFab();
    this._bindSidebarBackdrop();
    this._syncCartBadge();

    // Update badge keranjang setiap kali cart berubah
    STATE.subscribe('cart', () => this._syncCartBadge());
    // Update active state bottom nav setiap ganti view
    STATE.subscribe('view', () => this._syncBottomNav());
  },

  /* -------- Bottom Navigation -------- */
  _bindBottomNav() {
    document.querySelectorAll('#bottomNav [data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        AppMain.switchView(btn.dataset.view);
      });
    });
  },

  _syncBottomNav() {
    document.querySelectorAll('#bottomNav [data-view]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === STATE.currentView);
    });
  },

  /* -------- Floating Cart Button -------- */
  _bindCartFab() {
    const fab = document.getElementById('cartFab');
    const cart = document.getElementById('posCart') || document.querySelector('.pos-cart');
    const backdrop = document.getElementById('cartBackdrop');

    fab?.addEventListener('click', () => this._openCart());
    backdrop?.addEventListener('click', () => this._closeCart());

    // Drag handle di header keranjang untuk tutup
    document.querySelector('.pos-cart-header')?.addEventListener('click', (e) => {
      if (window.innerWidth <= 860 && document.querySelector('.pos-cart.is-cart-open')) {
        this._closeCart();
      }
    });
  },

  _openCart() {
    document.querySelector('.pos-cart')?.classList.add('is-cart-open');
    document.getElementById('cartBackdrop')?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  },

  _closeCart() {
    document.querySelector('.pos-cart')?.classList.remove('is-cart-open');
    document.getElementById('cartBackdrop')?.classList.remove('is-visible');
    document.body.style.overflow = '';
  },

  _syncCartBadge() {
    const badge = document.getElementById('cartFabBadge');
    const fab = document.getElementById('cartFab');
    if (!badge || !fab) return;

    const count = STATE.cartItemCount;
    badge.textContent = count;

    // Hanya tampilkan FAB saat di view kasir DAN ada item / selalu tampil di kasir
    if (STATE.currentView === 'kasir') {
      fab.style.display = 'flex';
    } else {
      fab.style.display = 'none';
    }
  },

  /* -------- Sidebar Backdrop -------- */
  _bindSidebarBackdrop() {
    document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('is-mobile-open');
      document.getElementById('sidebarBackdrop')?.classList.remove('is-visible');
    });

    // Saat sidebar dibuka, tampilkan juga backdrop
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      const isOpen = document.getElementById('sidebar')?.classList.contains('is-mobile-open');
      document.getElementById('sidebarBackdrop')?.classList.toggle('is-visible', isOpen);
    });
  },
};

// Bootstrap MobileUX setelah DOM siap
document.addEventListener('DOMContentLoaded', () => {
  // Tunggu AppMain selesai init dulu, baru init MobileUX
  setTimeout(() => MobileUX.init(), 100);
});
