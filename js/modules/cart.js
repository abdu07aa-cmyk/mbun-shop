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
    // FIX: productId dari tap kartu produk (dataset HTML) selalu string,
    // sedangkan product.id di database bisa berupa number/bigint.
    // Disamakan ke string biar selalu ketemu, dan cart konsisten
    // menyimpan productId sebagai string dari sini seterusnya.
    productId = String(productId);
    const product = STATE.products.find(p => String(p.id) === productId);
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
        productId: String(product.id),
        name: product.name,
        price: product.price,
        emoji: product.emoji || '📦',
        image_url: product.image_url || null,
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
    productId = String(productId);
    const product = STATE.products.find(p => String(p.id) === productId);
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
    productId = String(productId);
    const item = STATE.cart.find(i => i.productId === productId);
    if (item) this.setItemQty(productId, item.qty + 1);
  },

  /** Mengurangi kuantitas item sebanyak 1 (akan menghapus jika mencapai 0) */
  decrementItem(productId) {
    productId = String(productId);
    const item = STATE.cart.find(i => i.productId === productId);
    if (item) this.setItemQty(productId, item.qty - 1);
  },

  /**
   * Menghapus satu item dari keranjang.
   * @param {string} productId
   */
  removeItem(productId) {
    productId = String(productId);
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
    const lineTotal = item.price * item.qty;
    const discountAmount = item.discount
      ? (item.discount.type === 'percent'
          ? Math.round(lineTotal * (item.discount.value / 100))
          : Math.min(item.discount.value, lineTotal))
      : 0;
    const hasDiscount = discountAmount > 0;

    return `
      <div class="cart-item" data-product-id="${item.productId}"
        style="display:flex; align-items:center; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border);">
        <div>${Utils.productIconHtml(item, 24)}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${Utils.escapeHtml(item.name)}
            ${hasDiscount ? `<span class="badge badge-danger" style="margin-left:6px; font-size:10px;">-${Utils.formatCurrency(discountAmount)}</span>` : ''}
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
        <button class="icon-btn" style="width:28px;height:28px; ${hasDiscount ? 'color: var(--color-danger);' : ''}" data-item-discount="${item.productId}" aria-label="Diskon item ini" title="Diskon item ini">
          <i class="fa-solid fa-tag" style="font-size: 11px;"></i>
        </button>
        <button class="icon-btn" style="width:28px;height:28px; color: var(--color-danger);" data-cart-remove="${item.productId}" aria-label="Hapus item">
          <i class="fa-solid fa-trash" style="font-size: 11px;"></i>
        </button>
      </div>`;
  },

  /* ===================================================
     DISKON PER-ITEM
     Beda dengan diskon kode (berlaku ke semua barang), ini
     cuma motong harga 1 barang tertentu di keranjang.
     =================================================== */

  openItemDiscountModal(productId) {
    const item = STATE.cart.find(i => i.productId === String(productId));
    if (!item) return;

    const current = item.discount || { type: 'percent', value: '' };

    ModalManager.open('itemDiscount', {
      title: `Diskon: ${item.name}`,
      size: 'sm',
      bodyHtml: `
        <div class="form-grid" style="grid-template-columns: 1fr;">
          <label class="form-field">
            <span>Jenis Diskon</span>
            <select id="itemDiscountType" class="select-field">
              <option value="percent" ${current.type === 'percent' ? 'selected' : ''}>Persen (%)</option>
              <option value="fixed" ${current.type === 'fixed' ? 'selected' : ''}>Potongan Tetap (Rp)</option>
            </select>
          </label>
          <label class="form-field">
            <span>Nilai Diskon</span>
            <input type="number" id="itemDiscountValue" min="0" value="${current.value}" placeholder="mis. 10">
          </label>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Harga barang ini: ${Utils.formatCurrency(item.price)} x ${item.qty} = ${Utils.formatCurrency(item.price * item.qty)}
          </p>
        </div>`,
      footerHtml: `
        ${item.discount ? `<button class="btn btn-secondary" id="removeItemDiscountBtn">Hapus Diskon</button>` : ''}
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="saveItemDiscountBtn">Terapkan</button>`,
    });

    document.getElementById('saveItemDiscountBtn')?.addEventListener('click', () => {
      const type = document.getElementById('itemDiscountType')?.value;
      const value = Number(document.getElementById('itemDiscountValue')?.value) || 0;

      if (value <= 0) {
        Utils.showToast('Masukkan nilai diskon yang valid', 'error');
        return;
      }
      if (type === 'percent' && value > 100) {
        Utils.showToast('Diskon persen maksimal 100%', 'error');
        return;
      }

      // PROTEKSI PIN: catatan penting — requirePin() membuka modal BARU
      // (menimpa modal diskon ini di #modalRoot), makanya `type` dan
      // `value` HARUS sudah dibaca ke variabel di atas SEBELUM baris ini,
      // bukan dibaca ulang dari DOM sesudahnya (modal aslinya sudah hilang).
      AuthModule.requirePin('memberi diskon item ini', () => {
        this.setItemDiscount(productId, type, value);
      });
    });

    document.getElementById('removeItemDiscountBtn')?.addEventListener('click', () => {
      this.removeItemDiscount(productId);
      ModalManager.close();
    });
  },

  setItemDiscount(productId, type, value) {
    const pid = String(productId);
    STATE.cart = STATE.cart.map(item =>
      item.productId === pid ? { ...item, discount: { type, value } } : item
    );
    STATE.setCart([...STATE.cart]);
    Utils.showToast('Diskon item diterapkan', 'success');
  },

  removeItemDiscount(productId) {
    const pid = String(productId);
    STATE.cart = STATE.cart.map(item =>
      item.productId === pid ? { ...item, discount: null } : item
    );
    STATE.setCart([...STATE.cart]);
    Utils.showToast('Diskon item dihapus', 'success');
  },

  renderSummary() {
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const totalEl = document.getElementById('cartTotal');
    const payBtn = document.getElementById('payBtn');

    // Gabungan diskon per-item + diskon kode, ditampilkan sebagai satu
    // angka "Diskon" di ringkasan (index.html tidak perlu diubah lagi).
    const totalDiscount = STATE.cartItemDiscountsTotal + STATE.cartDiscountAmount;

    if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(STATE.cartSubtotal);
    if (discountEl) discountEl.textContent = `- ${Utils.formatCurrency(totalDiscount)}`;
    if (totalEl) totalEl.textContent = Utils.formatCurrency(STATE.cartTotal);
    if (payBtn) payBtn.disabled = STATE.cart.length === 0;
  },

  /* ===================================================
     PILIH PELANGGAN
     Menentukan STATE.activeCustomer yang nanti ikut kesimpan
     di kolom "Pelanggan" pada tabel Transaksi/Histori.
     =================================================== */

  openCustomerPicker() {
    ModalManager.open('customerPicker', {
      title: 'Pilih Pelanggan',
      size: 'sm',
      bodyHtml: `
        <div class="form-field" style="margin-bottom: var(--space-3);">
          <input type="text" id="customerPickerSearch" placeholder="Cari nama pelanggan...">
        </div>
        <div id="customerPickerList" style="display:flex; flex-direction:column; gap: var(--space-2); max-height: 320px; overflow-y:auto;">
          ${this._renderCustomerPickerList(STATE.customers)}
        </div>
      `,
      footerHtml: `<button class="btn btn-secondary btn-block" data-modal-close>Tutup</button>`,
    });

    document.getElementById('customerPickerSearch')?.addEventListener('input', Utils.debounce((e) => {
      const q = e.target.value.toLowerCase();
      const filtered = STATE.customers.filter(c => c.name.toLowerCase().includes(q));
      const listEl = document.getElementById('customerPickerList');
      if (listEl) listEl.innerHTML = this._renderCustomerPickerList(filtered);
    }, 200));
  },

  _renderCustomerPickerList(customers) {
    const umumRow = `
      <button class="btn btn-secondary btn-block" data-pick-customer="umum" style="justify-content:flex-start;">
        <i class="fa-solid fa-user-slash"></i>&nbsp; Umum (tanpa pelanggan)
      </button>`;

    if (customers.length === 0) {
      return umumRow + `<p style="text-align:center; color: var(--color-text-muted); font-size: var(--font-size-sm); padding: var(--space-4) 0;">Belum ada pelanggan terdaftar. Tambahkan dulu di menu Pelanggan.</p>`;
    }

    const rows = customers.map(c => `
      <button class="btn btn-secondary btn-block" data-pick-customer="${c.id}" style="justify-content:flex-start;">
        <i class="fa-solid fa-user"></i>&nbsp; ${Utils.escapeHtml(c.name)}${c.phone ? ' — ' + Utils.escapeHtml(c.phone) : ''}
      </button>`).join('');

    return umumRow + rows;
  },

  /** @param {string} customerId - 'umum' untuk mengosongkan pelanggan aktif */
  setActiveCustomer(customerId) {
    if (!customerId || customerId === 'umum') {
      STATE.activeCustomer = null;
    } else {
      STATE.activeCustomer = STATE.customers.find(c => String(c.id) === String(customerId)) || null;
    }
    this._syncCustomerLabel();
    ModalManager.close();
    Utils.showToast(`Pelanggan diset ke: ${STATE.activeCustomer?.name || 'Umum'}`, 'success');
  },

  _syncCustomerLabel() {
    const label = document.getElementById('activeCustomerName');
    if (label) label.textContent = STATE.activeCustomer?.name || 'Umum';
  },

  /* ===================================================
     INISIALISASI
     =================================================== */
  init() {
    STATE.subscribe('cart', () => {
      this.renderCart();
      this._syncCustomerLabel(); // ikut ke-reset ke "Umum" setelah transaksi selesai
    });
    this.renderCart();
  },
};
