/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/SPLIT-PAYMENT.JS
   Fitur pembayaran campur (split payment): pelanggan bisa
   membayar satu transaksi dengan lebih dari satu metode,
   mis. sebagian tunai + sebagian QRIS. Modal ini terpisah
   dari modal pembayaran biasa di payment.js, dan dipicu
   lewat opsi tambahan saat checkout.
   ===================================================== */

const SplitPaymentModule = {
  /** Baris pembayaran saat ini: [{ method, amount }] */
  rows: [],

  /* ===================================================
     MODAL SPLIT PAYMENT
     =================================================== */

  open() {
    if (STATE.cart.length === 0) {
      Utils.showToast('Keranjang masih kosong', 'warning');
      return;
    }

    // Mulai dengan satu baris tunai berisi seluruh total sebagai default
    this.rows = [{ method: 'cash', amount: STATE.cartTotal }];

    ModalManager.open('splitPayment', {
      title: 'Pembayaran Campur (Split Payment)',
      size: 'md',
      bodyHtml: this._bodyHtml(),
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="confirmSplitPaymentBtn"><i class="fa-solid fa-check"></i> Konfirmasi</button>`,
    });

    this._bindEvents();
  },

  _bodyHtml() {
    return `
      <div class="summary-row summary-row-total" style="margin-bottom: var(--space-5);">
        <span>Total Tagihan</span><span>${Utils.formatCurrency(STATE.cartTotal)}</span>
      </div>

      <div id="splitPaymentRows">
        ${this.rows.map((row, i) => this._rowHtml(row, i)).join('')}
      </div>

      <button class="link-btn" id="addSplitRowBtn"><i class="fa-solid fa-plus"></i> Tambah Metode Bayar</button>

      <div id="splitPaymentStatus" style="margin-top: var(--space-4);"></div>
    `;
  },

  _rowHtml(row, index) {
    return `
      <div class="split-payment-row" data-row-index="${index}">
        <select class="select-field" data-split-method="${index}">
          ${CONFIG.PAYMENT_METHODS.map(m => `<option value="${m.id}" ${m.id === row.method ? 'selected' : ''}>${m.label}</option>`).join('')}
        </select>
        <input type="number" placeholder="Nominal" value="${row.amount || ''}" data-split-amount="${index}" min="0" style="flex:1;">
        ${this.rows.length > 1 ? `<button class="icon-btn" style="color: var(--color-danger);" data-split-remove="${index}"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>`;
  },

  _bindEvents() {
    document.getElementById('addSplitRowBtn')?.addEventListener('click', () => {
      this.rows.push({ method: 'cash', amount: 0 });
      this._rerender();
    });

    document.getElementById('confirmSplitPaymentBtn')?.addEventListener('click', () => this._confirm());

    this._bindRowEvents();
    this._updateStatus();
  },

  _bindRowEvents() {
    Utils.qsa('[data-split-method]').forEach(select => {
      select.addEventListener('change', (e) => {
        const i = Number(e.target.dataset.splitMethod);
        this.rows[i].method = e.target.value;
      });
    });

    Utils.qsa('[data-split-amount]').forEach(input => {
      input.addEventListener('input', (e) => {
        const i = Number(e.target.dataset.splitAmount);
        this.rows[i].amount = Number(e.target.value) || 0;
        this._updateStatus();
      });
    });

    Utils.qsa('[data-split-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.target.closest('[data-split-remove]').dataset.splitRemove);
        this.rows.splice(i, 1);
        this._rerender();
      });
    });
  },

  _rerender() {
    const container = document.getElementById('splitPaymentRows');
    if (container) {
      container.innerHTML = this.rows.map((row, i) => this._rowHtml(row, i)).join('');
      this._bindRowEvents();
    }
    this._updateStatus();
  },

  /** Total yang sudah dialokasikan ke semua baris pembayaran */
  _totalAllocated() {
    return this.rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  },

  _updateStatus() {
    const statusEl = document.getElementById('splitPaymentStatus');
    if (!statusEl) return;

    const allocated = this._totalAllocated();
    const remaining = STATE.cartTotal - allocated;

    if (remaining === 0) {
      statusEl.innerHTML = `<span class="badge badge-success">Total pas, siap dikonfirmasi ✅</span>`;
    } else if (remaining > 0) {
      statusEl.innerHTML = `<span class="badge badge-warning">Kurang ${Utils.formatCurrency(remaining)}</span>`;
    } else {
      statusEl.innerHTML = `<span class="badge badge-danger">Lebih ${Utils.formatCurrency(Math.abs(remaining))}</span>`;
    }
  },

  /* ===================================================
     KONFIRMASI: SIMPAN TRANSAKSI DENGAN MULTI-METODE
     =================================================== */

  async _confirm() {
    const allocated = this._totalAllocated();

    if (allocated !== STATE.cartTotal) {
      Utils.showToast('Total alokasi pembayaran harus sama persis dengan total tagihan', 'error');
      return;
    }

    if (this.rows.some(r => r.amount <= 0)) {
      Utils.showToast('Setiap metode bayar harus memiliki nominal lebih dari 0', 'error');
      return;
    }

    const confirmBtn = document.getElementById('confirmSplitPaymentBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    }

    try {
      // Metode pembayaran disimpan sebagai ringkasan gabungan, mis. "cash+qris"
      const methodSummary = this.rows.map(r => r.method).join('+');

      const payload = {
        total_amount: STATE.cartTotal,
        payment_method: methodSummary,
        payment_status: 'paid',
        customer_name: STATE.activeCustomer?.name || 'Umum',
        discount: STATE.cartDiscountAmount,
        shift_id: STATE.currentShift?.id || null,
      };

      const [transaction] = await API.transactions.create(payload);

      const items = STATE.cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.productId,
        quantity: item.qty,
        price: item.price,
      }));
      await API.transactionItems.create(items);

      // Kurangi stok seperti pada pembayaran biasa
      for (const item of STATE.cart) {
        const product = STATE.products.find(p => p.id === item.productId);
        if (!product) continue;
        await ProductsModule.update(product.id, { stock: Math.max(0, product.stock - item.qty) });
      }

      STATE.setTransactions([{ ...transaction, items }, ...STATE.transactions]);

      Utils.playSound('cash');
      Utils.showToast('Pembayaran campur berhasil diproses!', 'success');
      ModalManager.close();
      STATE.resetCart();
    } catch (err) {
      console.error('[SplitPayment] Gagal memproses:', err);
      Utils.showToast('Gagal memproses pembayaran campur', 'error');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Konfirmasi';
      }
    }
  },
};
