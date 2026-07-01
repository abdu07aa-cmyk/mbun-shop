/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/RETURNS.JS
   Fitur retur/refund: kasir dapat memilih transaksi lama,
   menentukan item & jumlah yang dikembalikan, lalu sistem
   akan mengembalikan stok produk dan mencatat transaksi
   retur sebagai nominal negatif agar laporan tetap akurat.
   ===================================================== */

const ReturnsModule = {
  /** Transaksi yang sedang diproses returnya */
  _targetTransaction: null,
  /** Jumlah retur per item: { [productId]: qty } */
  _returnQty: {},

  /* ===================================================
     MODAL: CARI TRANSAKSI UNTUK DIRETUR
     =================================================== */

  openReturnSearchModal() {
    ModalManager.open('returnSearch', {
      title: 'Retur / Refund Barang',
      size: 'sm',
      bodyHtml: `
        <label class="form-field">
          <span>Masukkan ID Transaksi</span>
          <input type="text" id="returnTrxIdInput" placeholder="mis. TRX-ABC123">
        </label>
        <div id="returnSearchResult" style="margin-top: var(--space-4);"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="findTransactionBtn"><i class="fa-solid fa-magnifying-glass"></i> Cari</button>`,
    });

    document.getElementById('findTransactionBtn')?.addEventListener('click', () => this._findTransaction());
    document.getElementById('returnTrxIdInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._findTransaction();
    });
  },

  _findTransaction() {
    const id = document.getElementById('returnTrxIdInput')?.value.trim();
    const resultEl = document.getElementById('returnSearchResult');
    if (!id) return;

    const transaction = STATE.transactions.find(t => t.id === id);

    if (!transaction) {
      resultEl.innerHTML = `<span class="badge badge-danger">Transaksi "${Utils.escapeHtml(id)}" tidak ditemukan</span>`;
      return;
    }

    if (transaction.payment_status === 'refunded') {
      resultEl.innerHTML = `<span class="badge badge-warning">Transaksi ini sudah pernah diretur sebelumnya</span>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="badge badge-success" style="margin-bottom: var(--space-3);">Transaksi ditemukan</div>
      <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
        ${Utils.formatDateTime(transaction.created_at)} • ${Utils.formatCurrency(transaction.total_amount)}
      </p>
      <button class="btn btn-primary btn-block" style="margin-top: var(--space-3);" id="proceedReturnBtn">Lanjut Pilih Barang</button>
    `;

    document.getElementById('proceedReturnBtn')?.addEventListener('click', () => this.openReturnItemsModal(transaction));
  },

  /* ===================================================
     MODAL: PILIH ITEM YANG DIRETUR
     =================================================== */

  openReturnItemsModal(transaction) {
    this._targetTransaction = transaction;
    this._returnQty = {};

    const items = transaction.items || [];

    ModalManager.open('returnItems', {
      title: `Retur Transaksi #${transaction.id}`,
      size: 'md',
      bodyHtml: `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Produk</th><th>Dibeli</th><th>Jumlah Retur</th></tr></thead>
            <tbody>
              ${items.map(item => {
                const product = STATE.products.find(p => p.id === item.product_id);
                return `
                  <tr>
                    <td>${Utils.escapeHtml(product?.name || 'Produk')}</td>
                    <td>${item.quantity}</td>
                    <td><input type="number" min="0" max="${item.quantity}" value="0" style="width: 80px;" data-return-qty="${item.product_id}"></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <label class="form-field" style="margin-top: var(--space-4);">
          <span>Alasan Retur</span>
          <input type="text" id="returnReasonInput" placeholder="mis. Barang cacat / salah pesan">
        </label>
        <div id="returnTotalPreview" style="margin-top: var(--space-3); font-weight: var(--font-weight-semibold);"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-danger" id="confirmReturnBtn"><i class="fa-solid fa-rotate-left"></i> Proses Retur</button>`,
    });

    Utils.qsa('[data-return-qty]').forEach(input => {
      input.addEventListener('input', (e) => {
        const productId = e.target.dataset.returnQty;
        this._returnQty[productId] = Number(e.target.value) || 0;
        this._updateReturnPreview();
      });
    });

    document.getElementById('confirmReturnBtn')?.addEventListener('click', () => this._confirmReturn());
    this._updateReturnPreview();
  },

  _updateReturnPreview() {
    const total = this._calculateRefundAmount();
    const el = document.getElementById('returnTotalPreview');
    if (el) el.textContent = `Total dikembalikan: ${Utils.formatCurrency(total)}`;
  },

  _calculateRefundAmount() {
    const items = this._targetTransaction?.items || [];
    return items.reduce((sum, item) => {
      const qty = this._returnQty[item.product_id] || 0;
      return sum + (qty * item.price);
    }, 0);
  },

  /* ===================================================
     KONFIRMASI RETUR
     =================================================== */

  async _confirmReturn() {
    const refundAmount = this._calculateRefundAmount();

    if (refundAmount <= 0) {
      Utils.showToast('Tentukan minimal satu item dan jumlah retur', 'error');
      return;
    }

    const reason = document.getElementById('returnReasonInput')?.value.trim() || 'Tidak disebutkan';
    const confirmBtn = document.getElementById('confirmReturnBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    }

    try {
      // 1. Kembalikan stok untuk setiap item yang diretur
      for (const [productId, qty] of Object.entries(this._returnQty)) {
        if (qty <= 0) continue;
        const product = STATE.products.find(p => p.id === productId);
        if (!product) continue;
        await ProductsModule.update(productId, { stock: product.stock + qty });
      }

      // 2. Catat transaksi retur sebagai nominal negatif agar laporan tetap akurat
      const [returnTransaction] = await API.transactions.create({
        total_amount: -refundAmount,
        payment_method: this._targetTransaction.payment_method,
        payment_status: 'refunded',
        customer_name: this._targetTransaction.customer_name,
        discount: 0,
        shift_id: STATE.currentShift?.id || null,
      });

      STATE.setTransactions([returnTransaction, ...STATE.transactions]);

      // 3. Tandai transaksi asli sebagai sudah diretur
      await API.transactions.update(this._targetTransaction.id, { payment_status: 'refunded' });
      STATE.transactions = STATE.transactions.map(t =>
        t.id === this._targetTransaction.id ? { ...t, payment_status: 'refunded' } : t
      );
      STATE.notify('transactions');

      Utils.showToast(`Retur sebesar ${Utils.formatCurrency(refundAmount)} berhasil diproses (alasan: ${reason})`, 'success');
      ModalManager.close();
    } catch (err) {
      console.error('[Returns] Gagal memproses retur:', err);
      Utils.showToast('Gagal memproses retur, coba lagi', 'error');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Proses Retur';
      }
    }
  },
};
