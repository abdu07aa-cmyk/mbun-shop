/* =====================================================
   WARUNGKITA PRO MAX — MODULES/CART.JS
   Operasi keranjang belanja di halaman Kasir: menambah
   produk, mengubah kuantitas, menghapus item, menerapkan
   kode diskon, dan merender ringkasan keranjang.
   ===================================================== */

const CartModule = {
  /* ===================================================
     OPERASI KERANJANG
     =================================================== */

  /**
   * Menambahkan produk ke keranjang. Jika produk sudah ada,
   * kuantitasnya akan ditambah 1 (selama stok mencukupi).
   * @param {string} productId
   */
  addItem(productId) {
    const product = STATE.products.find(p => p.id === productId);
    if (!product) {
      Utils.showToast('Produk tidak ditemukan', 'error');
      return;
    }

    if (product.stock <= 0) {
      Utils.showToast(`Stok "${product.name}" habis`, 'error');
      return;
    }

    const existing = STATE.cart.find(item => item.productId === productId);

    if (existing) {
      if (existing.qty >= product.stock) {
        Utils.showToast(`Stok "${product.name}" tidak mencukupi`, 'warning');
        return;
      }
      existing.qty += 1;
      existing.subtotal = existing.qty * existing.price;
    } else {
      STATE.cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        emoji: product.emoji || '📦',
        qty: 1,
        subtotal: product.price,
      });
    }

    STATE.setCart([...STATE.cart]);
    Utils.playSound('click');
  },

  /**
   * Mengubah kuantitas sebuah item di keranjang secara langsung.
   * Jika qty menjadi 0 atau kurang, item akan dihapus.
   * @param {string} productId
   * @param {number} newQty
   */
  setItemQty(productId, newQty) {
    const product = STATE.products.find(p => p.id === productId);
    const item = STATE.cart.find(i => i.productId === productId);
    if (!item) return;

    if (newQty <= 0) {
      this.removeItem(productId);
      return;
    }

    if (product && newQty > product.stock) {
      Utils.showToast(`Stok "${product.name}" hanya tersisa ${product.stock}`, 'warning');
      newQty = product.stock;
    }

    item.qty = newQty;
    item.subtotal = item.qty * item.price;
    STATE.setCart([...STATE.cart]);
  },

  /** Menambah kuantitas item sebanyak 1 */
  incrementItem(productId) {
    const item = STATE.cart.find(i => i.productId === productId);
    if (item) this.setItemQty(productId, item.qty + 1);
  },

  /** Mengurangi kuantitas item sebanyak 1 (akan menghapus jika mencapai 0) */
  decrementItem(productId) {
    const item = STATE.cart.find(i => i.productId === productId);
    if (item) this.setItemQty(productId, item.qty - 1);
  },

  /**
   * Menghapus satu item dari keranjang.
   * @param {string} productId
   */
  removeItem(productId) {
    STATE.setCart(STATE.cart.filter(item => item.productId !== productId));
  },

  /** Mengosongkan seluruh keranjang dan diskon/pelanggan aktif */
  clear() {
    if (STATE.cart.length === 0) return;
    STATE.resetCart();
    Utils.showToast('Keranjang dikosongkan', 'info');
  },

  /**
   * Menerapkan kode diskon ke keranjang saat ini.
   * @param {string} code
   */
  applyDiscountCode(code) {
    const normalized = code.trim().toUpperCase();
    const discount = CONFIG.DISCOUNT_CODES[normalized];

    if (!discount) {
      Utils.showToast('Kode diskon tidak valid', 'error');
      return false;
    }

    if (STATE.cart.length === 0) {
      Utils.showToast('Keranjang masih kosong', 'warning');
      return false;
    }

    STATE.activeDiscount = { code: normalized, ...discount };
    STATE.notify('cart');
    Utils.showToast(`${discount.label} berhasil diterapkan`, 'success');
    return true;
  },

  /** Menghapus diskon yang sedang aktif */
  removeDiscount() {
    STATE.activeDiscount = null;
    STATE.notify('cart');
  },

  /* ===================================================
     RENDER: DAFTAR ITEM & RINGKASAN KERANJANG
     =================================================== */

  renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    if (STATE.cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-state">
          <i class="fa-solid fa-cart-shopping"></i>
          <p>Keranjang masih kosong</p>
        </div>`;
    } else {
      container.innerHTML = STATE.cart.map(item => this._cartItemHtml(item)).join('');
    }

    this.renderSummary();
  },

  _cartItemHtml(item) {
    return `
      <div class="cart-item" data-product-id="${item.productId}"
        style="display:flex; align-items:center; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border);">
        <div style="font-size: 24px;">${item.emoji}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${Utils.escapeHtml(item.name)}
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            ${Utils.formatCurrency(item.price)} x ${item.qty}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap: var(--space-2);">
          <button class="icon-btn" style="width:28px;height:28px;" data-cart-decrement="${item.productId}" aria-label="Kurangi">
            <i class="fa-solid fa-minus" style="font-size: 10px;"></i>
          </button>
          <span style="min-width: 18px; text-align:center; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${item.qty}</span>
          <button class="icon-btn" style="width:28px;height:28px;" data-cart-increment="${item.productId}" aria-label="Tambah">
            <i class="fa-solid fa-plus" style="font-size: 10px;"></i>
          </button>
        </div>
        <button class="icon-btn" style="width:28px;height:28px; color: var(--color-danger);" data-cart-remove="${item.productId}" aria-label="Hapus item">
          <i class="fa-solid fa-trash" style="font-size: 11px;"></i>
        </button>
      </div>`;
  },

  renderSummary() {
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const totalEl = document.getElementById('cartTotal');
    const payBtn = document.getElementById('payBtn');

    if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(STATE.cartSubtotal);
    if (discountEl) discountEl.textContent = `- ${Utils.formatCurrency(STATE.cartDiscountAmount)}`;
    if (totalEl) totalEl.textContent = Utils.formatCurrency(STATE.cartTotal);
    if (payBtn) payBtn.disabled = STATE.cart.length === 0;
  },

  /* ===================================================
     INISIALISASI
     =================================================== */
  init() {
    STATE.subscribe('cart', () => this.renderCart());
    this.renderCart();
  },
};
