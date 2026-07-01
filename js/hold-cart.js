/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/HOLD-CART.JS
   Fitur "Tahan Keranjang" (Hold Cart): kasir bisa menahan
   transaksi yang sedang berjalan (mis. pelanggan masih
   mencari barang tambahan) tanpa kehilangan progres, lalu
   melayani pelanggan lain, dan melanjutkan keranjang yang
   ditahan kapan saja. Disimpan di localStorage agar tetap
   ada walau halaman di-refresh.
   ===================================================== */

const HoldCartModule = {
  /* ===================================================
     MENAHAN KERANJANG SAAT INI
     =================================================== */

  /** Menahan keranjang aktif, lalu mengosongkan keranjang kerja saat ini */
  holdCurrentCart() {
    if (STATE.cart.length === 0) {
      Utils.showToast('Keranjang masih kosong, tidak ada yang bisa ditahan', 'warning');
      return;
    }

    const held = {
      id: Utils.generateId('HOLD'),
      label: STATE.activeCustomer?.name || `Pelanggan ${STATE.heldCarts.length + 1}`,
      cart: Utils.deepClone(STATE.cart),
      discount: STATE.activeDiscount ? Utils.deepClone(STATE.activeDiscount) : null,
      customer: STATE.activeCustomer ? Utils.deepClone(STATE.activeCustomer) : null,
      heldAt: new Date().toISOString(),
    };

    STATE.heldCarts.push(held);
    this._saveToLocalStorage();

    STATE.resetCart();
    Utils.showToast(`Keranjang ditahan sebagai "${held.label}"`, 'success');
  },

  /* ===================================================
     MELANJUTKAN KERANJANG YANG DITAHAN
     =================================================== */

  /**
   * Mengembalikan keranjang yang ditahan menjadi keranjang aktif.
   * Jika keranjang aktif saat ini masih berisi item, kasir akan
   * diminta konfirmasi karena akan ditimpa.
   * @param {string} holdId
   */
  resumeCart(holdId) {
    const held = STATE.heldCarts.find(h => h.id === holdId);
    if (!held) return;

    if (STATE.cart.length > 0) {
      const confirmed = window.confirm('Keranjang saat ini belum kosong. Lanjutkan keranjang yang ditahan dan timpa keranjang aktif?');
      if (!confirmed) return;
    }

    STATE.cart = Utils.deepClone(held.cart);
    STATE.activeDiscount = held.discount ? Utils.deepClone(held.discount) : null;
    STATE.activeCustomer = held.customer ? Utils.deepClone(held.customer) : null;
    STATE.notify('cart');

    this._removeHeld(holdId);
    Utils.showToast(`Keranjang "${held.label}" dilanjutkan`, 'success');
  },

  /**
   * Menghapus keranjang yang ditahan tanpa melanjutkannya
   * (mis. pelanggan batal jadi membeli).
   * @param {string} holdId
   */
  discardHeld(holdId) {
    const held = STATE.heldCarts.find(h => h.id === holdId);
    if (!held) return;

    const confirmed = window.confirm(`Hapus keranjang yang ditahan "${held.label}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!confirmed) return;

    this._removeHeld(holdId);
    Utils.showToast('Keranjang yang ditahan telah dihapus', 'info');
  },

  _removeHeld(holdId) {
    STATE.heldCarts = STATE.heldCarts.filter(h => h.id !== holdId);
    this._saveToLocalStorage();
    this._renderHeldListIfOpen();
  },

  /* ===================================================
     PERSISTENSI LOKAL
     =================================================== */

  _saveToLocalStorage() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.HELD_CARTS, JSON.stringify(STATE.heldCarts));
  },

  /** Memuat keranjang yang ditahan dari localStorage saat aplikasi dibuka */
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.HELD_CARTS);
      STATE.heldCarts = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('[HoldCart] Gagal memuat keranjang tertahan:', err);
      STATE.heldCarts = [];
    }
  },

  /* ===================================================
     MODAL: DAFTAR KERANJANG YANG DITAHAN
     =================================================== */

  openHeldCartsModal() {
    ModalManager.open('heldCarts', {
      title: `Keranjang Ditahan (${STATE.heldCarts.length})`,
      size: 'sm',
      bodyHtml: this._heldListHtml(),
      footerHtml: `<button class="btn btn-secondary btn-block" data-modal-close>Tutup</button>`,
    });
    this._bindHeldListEvents();
  },

  _heldListHtml() {
    if (STATE.heldCarts.length === 0) {
      return `<div class="cart-empty-state"><i class="fa-solid fa-pause"></i><p>Belum ada keranjang yang ditahan</p></div>`;
    }

    return STATE.heldCarts.map(h => {
      const total = h.cart.reduce((sum, item) => sum + item.subtotal, 0);
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border);">
          <div>
            <strong style="font-size: var(--font-size-sm);">${Utils.escapeHtml(h.label)}</strong><br>
            <small>${h.cart.length} item • ${Utils.formatCurrency(total)} • ${Utils.formatRelativeTime(h.heldAt)}</small>
          </div>
          <div style="display:flex; gap: var(--space-2);">
            <button class="btn btn-primary" style="padding: var(--space-2) var(--space-3);" data-resume-hold="${h.id}">Lanjutkan</button>
            <button class="icon-btn" style="color: var(--color-danger);" data-discard-hold="${h.id}" aria-label="Hapus">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>`;
    }).join('');
  },

  _bindHeldListEvents() {
    Utils.qsa('[data-resume-hold]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.resumeCart(btn.dataset.resumeHold);
        ModalManager.close();
      });
    });
    Utils.qsa('[data-discard-hold]').forEach(btn => {
      btn.addEventListener('click', () => this.discardHeld(btn.dataset.discardHold));
    });
  },

  /** Merender ulang isi modal jika sedang terbuka (dipanggil setelah perubahan data) */
  _renderHeldListIfOpen() {
    const body = document.querySelector('#modalRoot .modal-body');
    if (body && document.querySelector('.modal-header h3')?.textContent.includes('Keranjang Ditahan')) {
      body.innerHTML = this._heldListHtml();
      this._bindHeldListEvents();
    }
  },

  init() {
    this.loadFromLocalStorage();
  },
};
