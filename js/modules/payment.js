/* =====================================================
   WARUNGKITA PRO MAX — MODULES/PAYMENT.JS
   Mengelola alur pembayaran: pemilihan metode bayar,
   tampilan QRIS, perhitungan kembalian tunai, penyimpanan
   transaksi ke database, pengurangan stok produk, dan
   penampilan struk digital setelah transaksi berhasil.
   ===================================================== */

const PaymentModule = {
  /** Metode pembayaran yang sedang dipilih di modal pembayaran */
  selectedMethod: 'cash',
  /** Nominal uang tunai yang diterima dari pelanggan (untuk hitung kembalian) */
  cashReceived: 0,

  /* ===================================================
     MODAL PEMBAYARAN
     =================================================== */

  /** Membuka modal pembayaran berdasarkan isi keranjang saat ini */
  openPaymentModal() {
    if (STATE.cart.length === 0) {
      Utils.showToast('Keranjang masih kosong', 'warning');
      return;
    }
    if (CONFIG.FEATURES && !STATE.isShiftOpen) {
      Utils.showToast('Buka shift kasir terlebih dahulu sebelum bertransaksi', 'warning');
      return;
    }

    this.selectedMethod = 'cash';
    this.cashReceived = 0;

    ModalManager.open('payment', {
      title: 'Proses Pembayaran',
      size: 'md',
      bodyHtml: this._paymentBodyHtml(),
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="confirmPaymentBtn">
          <i class="fa-solid fa-check"></i> Konfirmasi Pembayaran
        </button>`,
    });

    document.getElementById('confirmPaymentBtn')?.addEventListener('click', () => this.confirmPayment());
    this._bindPaymentMethodButtons();
  },

  _paymentBodyHtml() {
    return `
      <div class="summary-row summary-row-total" style="margin-bottom: var(--space-5);">
        <span>Total Bayar</span><span>${Utils.formatCurrency(STATE.cartTotal)}</span>
      </div>

      <div class="payment-method-grid" id="paymentMethodGrid">
        ${CONFIG.PAYMENT_METHODS.map(m => `
          <button class="payment-method-option ${m.id === this.selectedMethod ? 'is-selected' : ''}" data-payment-method="${m.id}">
            <i class="fa-solid ${m.icon}"></i>
            <span>${m.label}</span>
          </button>`).join('')}
      </div>

      <div id="paymentMethodDetail"></div>
    `;
  },

  _bindPaymentMethodButtons() {
    Utils.qsa('[data-payment-method]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedMethod = btn.dataset.paymentMethod;
        Utils.qsa('[data-payment-method]').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        this._renderMethodDetail();
      });
    });
    this._renderMethodDetail();
  },

  /** Merender input tambahan sesuai metode bayar yang dipilih (tunai/QRIS/dll) */
  _renderMethodDetail() {
    const container = document.getElementById('paymentMethodDetail');
    if (!container) return;

    if (this.selectedMethod === 'cash') {
      container.innerHTML = `
        <label class="form-field">
          <span>Uang Diterima</span>
          <input type="number" id="cashReceivedInput" placeholder="0" min="0">
        </label>
        <div class="summary-row" style="margin-top: var(--space-2);">
          <span>Kembalian</span><span id="changeAmount">${Utils.formatCurrency(0)}</span>
        </div>`;

      document.getElementById('cashReceivedInput')?.addEventListener('input', (e) => {
        this.cashReceived = Number(e.target.value) || 0;
        const change = Math.max(0, this.cashReceived - STATE.cartTotal);
        document.getElementById('changeAmount').textContent = Utils.formatCurrency(change);
      });
    } else if (this.selectedMethod === 'qris') {
      container.innerHTML = `<div class="qris-display"><canvas id="qrisCanvas"></canvas><p>Pindai untuk membayar ${Utils.formatCurrency(STATE.cartTotal)}</p></div>`;
      this._renderQrCode();
    } else {
      container.innerHTML = `<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Konfirmasi setelah pelanggan menyelesaikan pembayaran via ${this.selectedMethod}.</p>`;
    }
  },

  _renderQrCode() {
    const el = document.getElementById('qrisCanvas');
    if (!el || typeof QRCode === 'undefined') return;
    // QRCode.js butuh elemen <div>, jadi ganti canvas placeholder jadi div on the fly
    const wrapper = document.createElement('div');
    el.replaceWith(wrapper);
    new QRCode(wrapper, {
      text: `WARUNGKITA-PAY:${STATE.cartTotal}:${Date.now()}`,
      width: 180,
      height: 180,
    });
  },

  /* ===================================================
     KONFIRMASI & PROSES TRANSAKSI
     =================================================== */

  /** Memvalidasi & menyimpan transaksi setelah pembayaran dikonfirmasi */
  async confirmPayment() {
    if (this.selectedMethod === 'cash' && this.cashReceived < STATE.cartTotal) {
      Utils.showToast('Uang diterima kurang dari total tagihan', 'error');
      return;
    }

    const confirmBtn = document.getElementById('confirmPaymentBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    }

    try {
      const transaction = await this._saveTransaction();
      await this._reduceStock();

      Utils.playSound('cash');
      Utils.showToast('Pembayaran berhasil!', 'success');

      ModalManager.close();
      this._showReceipt(transaction);

      STATE.resetCart();
    } catch (err) {
      console.error('[Payment] Gagal memproses pembayaran:', err);
      Utils.showToast('Gagal memproses pembayaran, coba lagi', 'error');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Konfirmasi Pembayaran';
      }
    }
  },

  /** Menyimpan record transaksi + item-itemnya ke database */
  async _saveTransaction() {
    const payload = {
      total_amount: STATE.cartTotal,
      payment_method: this.selectedMethod,
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

    const fullTransaction = { ...transaction, items, change: Math.max(0, this.cashReceived - STATE.cartTotal) };
    STATE.setTransactions([fullTransaction, ...STATE.transactions]);

    return fullTransaction;
  },

  /** Mengurangi stok setiap produk yang terjual sesuai kuantitas di keranjang */
  async _reduceStock() {
    for (const item of STATE.cart) {
      // FIX: item.productId berasal dari dataset HTML (selalu string),
      // sedangkan product.id bisa berupa number/bigint dari database —
      // disamakan ke string dulu biar produk selalu ketemu.
      const product = STATE.products.find(p => String(p.id) === String(item.productId));
      if (!product) continue;
      const newStock = Math.max(0, product.stock - item.qty);
      await ProductsModule.update(product.id, { stock: newStock });
    }
  },

  /* ===================================================
     STRUK DIGITAL
     =================================================== */

  _showReceipt(transaction) {
    ModalManager.open('receipt', {
      title: 'Struk Pembayaran',
      size: 'sm',
      bodyHtml: this._receiptHtml(transaction),
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Tutup</button>
        <button class="btn btn-secondary" id="shareReceiptBtn"><i class="fa-solid fa-share-nodes"></i> Bagikan</button>
        <button class="btn btn-primary" id="printReceiptBtn"><i class="fa-solid fa-print"></i> Cetak</button>`,
    });

    document.getElementById('printReceiptBtn')?.addEventListener('click', () => window.print());
    document.getElementById('shareReceiptBtn')?.addEventListener('click', () => this._shareReceipt(transaction));
  },

  /**
   * Membagikan struk sebagai GAMBAR (persis tampilan struk aslinya) lewat
   * fitur share bawaan HP (WhatsApp, Telegram, dll). Alternatif buat yang
   * belum punya printer struk.
   *
   * Urutan fallback:
   * 1. Render elemen .receipt jadi gambar (html2canvas) -> share sebagai file gambar
   * 2. Kalau share file tidak didukung -> download gambar ke HP + tampilkan
   *    petunjuk cara kirim manual
   * 3. Kalau html2canvas gagal dimuat -> fallback lama (share teks)
   */
  async _shareReceipt(t) {
    const receiptEl = document.querySelector('#modalRoot .receipt');

    if (typeof html2canvas === 'undefined' || !receiptEl) {
      return this._shareReceiptAsText(t);
    }

    const shareBtn = document.getElementById('shareReceiptBtn');
    if (shareBtn) {
      shareBtn.disabled = true;
      shareBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan gambar...';
    }

    try {
      // devicePixelRatio biar hasil gambarnya tajam (nggak buram) pas dibuka di HP
      const canvas = await html2canvas(receiptEl, {
        scale: Math.max(2, window.devicePixelRatio || 1),
        backgroundColor: '#ffffff',
        useCORS: true,
        onclone: (clonedDoc) => {
          // Paksa tema terang di hasil "foto" struk, supaya tulisannya
          // tetap kelihatan jelas (hitam di atas putih) walau aplikasi
          // aslinya lagi dalam mode gelap.
          clonedDoc.body.setAttribute('data-theme', 'light');
        },
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Gagal membuat gambar struk');

      const fileName = `struk-${String(t.id).slice(-8)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Struk ${CONFIG.STORE.NAME}`,
          files: [file],
        });
      } else {
        // HP/browser belum dukung share file -> download gambarnya,
        // biar pengguna bisa lampirkan manual ke WhatsApp/chat.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Utils.showToast('Gambar struk tersimpan ke HP — lampirkan manual ke chat', 'success', 5000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Payment] Gagal membagikan struk sebagai gambar:', err.message);
        Utils.showToast('Gagal membuat gambar struk, mencoba bagikan sebagai teks...', 'warning');
        await this._shareReceiptAsText(t);
      }
    } finally {
      if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Bagikan';
      }
    }
  },

  /** Fallback lama: bagikan sebagai teks polos (dipakai kalau gambar gagal dibuat) */
  async _shareReceiptAsText(t) {
    const text = this._receiptText(t);

    if (navigator.share) {
      try {
        await navigator.share({ title: `Struk ${CONFIG.STORE.NAME}`, text });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[Payment] Gagal membagikan struk:', err.message);
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Struk disalin ke clipboard — tempel (paste) ke WhatsApp/chat', 'success', 5000);
    } catch {
      Utils.showToast('Fitur bagikan tidak didukung di browser ini', 'error');
    }
  },

  /** Versi teks polos dari struk, dipakai untuk fitur Bagikan */
  _receiptText(t) {
    const itemLines = t.items.map(item => {
      const product = STATE.products.find(p => String(p.id) === String(item.product_id));
      const name = product?.name || 'Produk';
      return `${name} x${item.quantity} - ${Utils.formatCurrency(item.price * item.quantity)}`;
    }).join('\n');

    const paymentLines = t.payment_method === 'cash'
      ? `Tunai: ${Utils.formatCurrency(PaymentModule.cashReceived)}\nKembalian: ${Utils.formatCurrency(t.change || 0)}`
      : `Metode: ${t.payment_method.toUpperCase()}`;

    return [
      `*${CONFIG.STORE.NAME}*`,
      CONFIG.STORE.ADDRESS,
      Utils.formatDateTime(t.created_at || new Date()),
      '------------------------------',
      itemLines,
      '------------------------------',
      `Diskon: -${Utils.formatCurrency(t.discount || 0)}`,
      `*TOTAL: ${Utils.formatCurrency(t.total_amount)}*`,
      paymentLines,
      '',
      'Terima kasih sudah berbelanja! 🙏',
    ].join('\n');
  },

  _receiptHtml(t) {
    const itemRows = t.items.map(item => {
      const product = STATE.products.find(p => String(p.id) === String(item.product_id));
      return `<div class="receipt-row"><span>${Utils.escapeHtml(product?.name || 'Produk')} x${item.quantity}</span><span>${Utils.formatCurrency(item.price * item.quantity)}</span></div>`;
    }).join('');

    return `
      <div class="receipt">
        <div class="receipt-header">
          <strong>${CONFIG.STORE.NAME}</strong><br>
          <small>${CONFIG.STORE.ADDRESS}</small><br>
          <small>${Utils.formatDateTime(t.created_at || new Date())}</small>
        </div>
        ${itemRows}
        <div class="receipt-divider"></div>
        <div class="receipt-row"><span>Diskon</span><span>- ${Utils.formatCurrency(t.discount || 0)}</span></div>
        <div class="receipt-divider"></div>
        <div class="receipt-total-row"><span>TOTAL</span><span>${Utils.formatCurrency(t.total_amount)}</span></div>
        ${t.payment_method === 'cash' ? `
          <div class="receipt-row"><span>Tunai</span><span>${Utils.formatCurrency(PaymentModule.cashReceived)}</span></div>
          <div class="receipt-row"><span>Kembalian</span><span>${Utils.formatCurrency(t.change || 0)}</span></div>
        ` : `<div class="receipt-row"><span>Metode</span><span>${Utils.escapeHtml(t.payment_method.toUpperCase())}</span></div>`}
        <div class="receipt-header" style="border-bottom:none; border-top: 1px dashed var(--color-border); margin-top: var(--space-3); padding-top: var(--space-3);">
          Terima kasih sudah berbelanja! 🙏
        </div>
      </div>`;
  },
};
