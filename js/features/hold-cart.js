/* =====================================================
   MBUN COLLECTION — FEATURES/HOLD-CART.JS
   Fitur "Tahan Keranjang" (Hold Cart): kasir bisa menahan
   transaksi yang sedang berjalan (mis. pelanggan masih
   mencari barang tambahan) tanpa kehilangan progres, lalu
   melayani pelanggan lain, dan melanjutkan keranjang yang
   ditahan kapan saja.

   FIX: sebelumnya disimpan di localStorage, yang artinya
   HANYA bisa diakses dari device/browser yang sama persis
   (keranjang ditahan di PC tidak akan kelihatan di HP).
   Sekarang disimpan ke Supabase (tabel held_carts) supaya
   bisa lintas device — ditahan di PC, dilanjutkan dari HP,
   atau sebaliknya.
   ===================================================== */

const HoldCartModule = {
  /* ===================================================
     MENAHAN KERANJANG SAAT INI
     =================================================== */

  /** Menahan keranjang aktif, lalu mengosongkan keranjang kerja saat ini */
  async holdCurrentCart() {
    if (STATE.cart.length === 0) {
      Utils.showToast('Keranjang masih kosong, tidak ada yang bisa ditahan', 'warning');
      return;
    }

    const payload = {
      label: STATE.activeCustomer?.name || `Pelanggan ${STATE.heldCarts.length + 1}`,
      cart: STATE.cart,
      discount: STATE.activeDiscount || null,
      customer: STATE.activeCustomer || null,
    };

    const [saved] = await API.insert(CONFIG.TABLES.HELD_CARTS, payload);
    STATE.heldCarts.push(saved || { ...payload, id: Utils.generateId('HOLD'), created_at: new Date().toISOString() });

    STATE.resetCart();
    Utils.showToast(`Keranjang ditahan sebagai "${payload.label}"`, 'success');
    EventsModule._syncHeldCartsBadge?.();
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
  async resumeCart(holdId) {
    const held = STATE.heldCarts.find(h => String(h.id) === String(holdId));
    if (!held) return;

    if (STATE.cart.length > 0) {
      const confirmed = window.confirm('Keranjang saat ini belum kosong. Lanjutkan keranjang yang ditahan dan timpa keranjang aktif?');
      if (!confirmed) return;
    }

    STATE.cart = Utils.deepClone(held.cart);
    STATE.activeDiscount = held.discount ? Utils.deepClone(held.discount) : null;
    STATE.activeCustomer = held.customer ? Utils.deepClone(held.customer) : null;
    STATE.notify('cart');

    await this._removeHeld(holdId);
    Utils.showToast(`Keranjang "${held.label}" dilanjutkan`, 'success');
  },

  /**
   * Menghapus keranjang yang ditahan tanpa melanjutkannya
   * (mis. pelanggan batal jadi membeli).
   * @param {string} holdId
   */
  async discardHeld(holdId) {
    const held = STATE.heldCarts.find(h => String(h.id) === String(holdId));
    if (!held) return;

    const confirmed = window.confirm(`Hapus keranjang yang ditahan "${held.label}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!confirmed) return;

    await this._removeHeld(holdId);
    Utils.showToast('Keranjang yang ditahan telah dihapus', 'info');
  },

  async _removeHeld(holdId) {
    STATE.heldCarts = STATE.heldCarts.filter(h => String(h.id) !== String(holdId));
    await API.remove(CONFIG.TABLES.HELD_CARTS, { id: `eq.${holdId}` });
    this._renderHeldListIfOpen();
    EventsModule._syncHeldCartsBadge?.();
  },

  /* ===================================================
     MUAT DARI SUPABASE
     =================================================== */

  /** Memuat semua keranjang yang ditahan dari server (lintas device) */
  async loadHeldCarts() {
    try {
      const data = await API.fetchAll(CONFIG.TABLES.HELD_CARTS, { order: 'created_at.desc' });
      STATE.heldCarts = data;
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
      const total = (h.cart || []).reduce((sum, item) => sum + item.subtotal, 0);
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border);">
          <div>
            <strong style="font-size: var(--font-size-sm);">${Utils.escapeHtml(h.label)}</strong><br>
            <small>${(h.cart || []).length} item &middot; ${Utils.formatCurrency(total)} &middot; ${Utils.formatRelativeTime(h.created_at)}</small>
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

  async init() {
    await this.loadHeldCarts();
    EventsModule._syncHeldCartsBadge?.();
  },
};
