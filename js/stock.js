/* =====================================================
   WARUNGKITA PRO MAX — MODULES/STOCK.JS
   Mengelola pergerakan stok barang: pencatatan barang
   masuk (restock), tampilan status stok di tabel khusus,
   dan deteksi produk dengan stok menipis/habis.
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
        <td>${p.emoji || '📦'} ${Utils.escapeHtml(p.name)}</td>
        <td>${Utils.formatNumber(p.stock)}</td>
        <td>${this._statusBadge(p)}</td>
        <td>
          <button class="btn btn-secondary" style="padding: var(--space-2) var(--space-3);" data-stock-in="${p.id}">
            <i class="fa-solid fa-plus"></i> Tambah Stok
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
            <select id="stockInProductSelect" class="select-field">
              ${STATE.products.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${Utils.escapeHtml(p.name)} (stok: ${p.stock})</option>`).join('')}
            </select>
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
  },

  async _confirmStockIn() {
    const productId = document.getElementById('stockInProductSelect')?.value;
    const qty = Number(document.getElementById('stockInQty')?.value) || 0;

    if (!productId || qty <= 0) {
      Utils.showToast('Pilih produk dan masukkan jumlah yang valid', 'error');
      return;
    }

    const product = STATE.products.find(p => p.id === productId);
    if (!product) return;

    const newStock = product.stock + qty;
    await ProductsModule.update(productId, { stock: newStock });

    Utils.showToast(`Stok "${product.name}" bertambah ${qty} (total: ${newStock})`, 'success');
    ModalManager.close();
  },

  /* ===================================================
     INISIALISASI
     =================================================== */
  init() {
    STATE.subscribe('products', () => this.renderStockTable());
  },
};
