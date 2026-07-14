/* =====================================================
   WARUNGKITA PRO MAX — MODULES/STOCK.JS
   Mengelola pergerakan stok barang: pencatatan barang
   masuk (restock) & barang keluar (rusak/hilang/kadaluarsa/
   koreksi), tampilan status stok di tabel khusus, dan
   deteksi produk dengan stok menipis/habis. Kedua modal
   (masuk & keluar) bisa diisi manual lewat dropdown ATAU
   dengan memindai barcode produk pakai kamera HP.
   ===================================================== */

const StockModule = {
  /* ===================================================
     RENDER: TABEL STOK BARANG
     =================================================== */

  renderStockTable() {
    const tbody = document.querySelector('#stockTable tbody');
    if (!tbody) return;

    if (STATE.products.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">Belum ada data produk.</td></tr>`;
      return;
    }

    // Urutkan supaya produk dengan stok paling menipis tampil di atas
    const sorted = [...STATE.products].sort((a, b) => a.stock - b.stock);

    tbody.innerHTML = sorted.map(p => `
      <tr>
        <td style="display:flex; align-items:center; gap: var(--space-2);">${Utils.productIconHtml(p, 24)} ${Utils.escapeHtml(p.name)}</td>
        <td>${Utils.formatNumber(p.stock)}</td>
        <td>${this._statusBadge(p)}</td>
        <td style="display:flex; gap: var(--space-2); flex-wrap:wrap;">
          <button class="btn btn-secondary" style="padding: var(--space-2) var(--space-3);" data-stock-in="${p.id}">
            <i class="fa-solid fa-plus"></i> Masuk
          </button>
          <button class="btn btn-secondary" style="padding: var(--space-2) var(--space-3);" data-stock-out="${p.id}">
            <i class="fa-solid fa-minus"></i> Keluar
          </button>
        </td>
      </tr>
    `).join('');
  },

  _statusBadge(product) {
    if (product.stock <= 0) return `<span class="badge badge-danger">Habis</span>`;
    if (product.stock <= CONFIG.LOW_STOCK_THRESHOLD) return `<span class="badge badge-warning">Menipis</span>`;
    return `<span class="badge badge-success">Aman</span>`;
  },

  /* ===================================================
     MODAL: BARANG MASUK (STOCK IN)
     =================================================== */

  /**
   * Membuka modal untuk mencatat barang masuk.
   * @param {string} [productId] - jika diisi, form akan terisi otomatis untuk produk ini
   */
  openStockInModal(productId = null) {
    if (STATE.products.length === 0) {
      Utils.showToast('Tambahkan produk terlebih dahulu sebelum mencatat stok masuk', 'warning');
      return;
    }

    ModalManager.open('stockIn', {
      title: 'Catat Barang Masuk',
      size: 'sm',
      bodyHtml: `
        <div class="form-grid" style="grid-template-columns: 1fr;">
          <label class="form-field">
            <span>Produk</span>
            <div style="display:flex; gap: var(--space-2);">
              <select id="stockInProductSelect" class="select-field" style="flex:1;">
                ${STATE.products.map(p => `<option value="${p.id}" ${String(p.id) === String(productId) ? 'selected' : ''}>${Utils.escapeHtml(p.name)} (stok: ${p.stock})</option>`).join('')}
              </select>
              <button type="button" class="icon-btn" id="scanStockInBtn" aria-label="Scan barcode" title="Scan barcode">
                <i class="fa-solid fa-barcode"></i>
              </button>
            </div>
          </label>
          <label class="form-field">
            <span>Jumlah Masuk</span>
            <input type="number" id="stockInQty" min="1" value="1" placeholder="0">
          </label>
          <label class="form-field">
            <span>Catatan (opsional)</span>
            <input type="text" id="stockInNote" placeholder="mis. Pembelian dari Supplier A">
          </label>
        </div>`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="confirmStockInBtn"><i class="fa-solid fa-check"></i> Simpan</button>`,
    });

    document.getElementById('confirmStockInBtn')?.addEventListener('click', () => this._confirmStockIn());
    document.getElementById('scanStockInBtn')?.addEventListener('click', () => {
      BarcodeModule.openScannerModal({ mode: 'stok-masuk' });
    });
  },

  async _confirmStockIn() {
    const productId = document.getElementById('stockInProductSelect')?.value;
    const qty = Number(document.getElementById('stockInQty')?.value) || 0;
    const note = document.getElementById('stockInNote')?.value || '';

    if (!productId || qty <= 0) {
      Utils.showToast('Pilih produk dan masukkan jumlah yang valid', 'error');
      return;
    }

    // FIX: productId dari <select> selalu string, p.id di STATE bisa
    // number/bigint — disamakan ke string biar selalu ketemu.
    const product = STATE.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    const newStock = product.stock + qty;
    await ProductsModule.update(product.id, { stock: newStock });
    this._logMovement(product.id, 'in', qty, note);

    Utils.showToast(`Stok "${product.name}" bertambah ${qty} (total: ${newStock})`, 'success');
    ModalManager.close();
  },

  /* ===================================================
     MODAL: BARANG KELUAR (STOCK OUT)
     =================================================== */

  /**
   * Membuka modal untuk mencatat barang keluar (rusak, hilang,
   * kadaluarsa, atau koreksi stok) — di luar penjualan normal
   * (penjualan sudah otomatis mengurangi stok lewat payment.js).
   * @param {string} [productId] - jika diisi, form akan terisi otomatis untuk produk ini
   */
  openStockOutModal(productId = null) {
    if (STATE.products.length === 0) {
      Utils.showToast('Belum ada produk untuk dicatat', 'warning');
      return;
    }

    ModalManager.open('stockOut', {
      title: 'Catat Barang Keluar',
      size: 'sm',
      bodyHtml: `
        <div class="form-grid" style="grid-template-columns: 1fr;">
          <label class="form-field">
            <span>Produk</span>
            <div style="display:flex; gap: var(--space-2);">
              <select id="stockOutProductSelect" class="select-field" style="flex:1;">
                ${STATE.products.map(p => `<option value="${p.id}" ${String(p.id) === String(productId) ? 'selected' : ''}>${Utils.escapeHtml(p.name)} (stok: ${p.stock})</option>`).join('')}
              </select>
              <button type="button" class="icon-btn" id="scanStockOutBtn" aria-label="Scan barcode" title="Scan barcode">
                <i class="fa-solid fa-barcode"></i>
              </button>
            </div>
          </label>
          <label class="form-field">
            <span>Jumlah Keluar</span>
            <input type="number" id="stockOutQty" min="1" value="1" placeholder="0">
          </label>
          <label class="form-field">
            <span>Alasan</span>
            <select id="stockOutReason" class="select-field">
              <option value="rusak">Rusak</option>
              <option value="hilang">Hilang</option>
              <option value="kadaluarsa">Kadaluarsa</option>
              <option value="koreksi">Koreksi stok</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </label>
          <label class="form-field">
            <span>Catatan (opsional)</span>
            <input type="text" id="stockOutNote" placeholder="mis. Rusak saat pengiriman">
          </label>
        </div>`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-danger" id="confirmStockOutBtn"><i class="fa-solid fa-check"></i> Simpan</button>`,
    });

    document.getElementById('confirmStockOutBtn')?.addEventListener('click', () => this._confirmStockOut());
    document.getElementById('scanStockOutBtn')?.addEventListener('click', () => {
      BarcodeModule.openScannerModal({ mode: 'stok-keluar' });
    });
  },

  async _confirmStockOut() {
    const productId = document.getElementById('stockOutProductSelect')?.value;
    const qty = Number(document.getElementById('stockOutQty')?.value) || 0;
    const reason = document.getElementById('stockOutReason')?.value || 'lainnya';
    const note = document.getElementById('stockOutNote')?.value || '';

    if (!productId || qty <= 0) {
      Utils.showToast('Pilih produk dan masukkan jumlah yang valid', 'error');
      return;
    }

    const product = STATE.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    if (qty > product.stock) {
      Utils.showToast(`Jumlah keluar (${qty}) melebihi stok saat ini (${product.stock})`, 'error');
      return;
    }

    const newStock = Math.max(0, product.stock - qty);
    await ProductsModule.update(product.id, { stock: newStock });
    this._logMovement(product.id, 'out', qty, `${reason}${note ? ' — ' + note : ''}`);

    Utils.showToast(`Stok "${product.name}" berkurang ${qty} (total: ${newStock})`, 'success');
    ModalManager.close();
  },

  /* ===================================================
     LOG PERGERAKAN STOK (best-effort, tidak memblokir UI
     kalau gagal — cukup dicatat di console)
     =================================================== */
  async _logMovement(productId, type, qty, note = '') {
    try {
      if (CONFIG.TABLES.STOCK_MOVEMENTS) {
        await API.insert(CONFIG.TABLES.STOCK_MOVEMENTS, {
          product_id: productId,
          type,
          qty,
          note,
        });
      }
    } catch (err) {
      console.warn('[Stock] Gagal mencatat riwayat pergerakan stok:', err.message);
    }
  },

  /* ===================================================
     INISIALISASI
     =================================================== */
  init() {
    STATE.subscribe('products', () => this.renderStockTable());
  },
};
