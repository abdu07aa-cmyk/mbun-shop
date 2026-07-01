/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/SHIFT.JS
   Manajemen shift kasir: membuka shift dengan modal kas
   awal, menutup shift dengan rekonsiliasi (kas akhir vs
   kas yang seharusnya berdasarkan transaksi tunai), dan
   menampilkan status shift di halaman "Shift Kasir".
   ===================================================== */

const ShiftModule = {
  /* ===================================================
     RENDER: KARTU STATUS SHIFT
     =================================================== */

  renderShiftCard() {
    const card = document.getElementById('shiftCard');
    if (!card) return;

    card.innerHTML = STATE.isShiftOpen ? this._openShiftHtml() : this._closedShiftHtml();
    this._bindShiftCardEvents();
  },

  _closedShiftHtml() {
    return `
      <div style="text-align:center; padding: var(--space-8) 0;">
        <i class="fa-solid fa-cash-register" style="font-size: 48px; color: var(--color-text-muted); margin-bottom: var(--space-4);"></i>
        <h3 style="margin-bottom: var(--space-2);">Shift Belum Dibuka</h3>
        <p style="margin-bottom: var(--space-5); color: var(--color-text-secondary);">Buka shift untuk mulai mencatat transaksi hari ini.</p>
        <button class="btn btn-primary" id="openShiftBtn"><i class="fa-solid fa-play"></i> Buka Shift</button>
      </div>`;
  },

  _openShiftHtml() {
    const shift = STATE.currentShift;
    const cashTransactions = STATE.transactions.filter(t => t.shift_id === shift.id && t.payment_method === 'cash');
    const cashSales = cashTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
    const expectedCash = Number(shift.initial_cash) + cashSales;

    return `
      <div class="stat-grid" style="margin-bottom: var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-icon is-purple"><i class="fa-solid fa-user"></i></div>
          <div class="stat-card-value" style="font-size: var(--font-size-lg);">${Utils.escapeHtml(shift.cashier_name)}</div>
          <div class="stat-card-label">Kasir Bertugas</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon is-green"><i class="fa-solid fa-money-bill-wave"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(shift.initial_cash)}</div>
          <div class="stat-card-label">Kas Awal</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon is-orange"><i class="fa-solid fa-receipt"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(cashSales)}</div>
          <div class="stat-card-label">Penjualan Tunai (${cashTransactions.length} transaksi)</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon is-purple"><i class="fa-solid fa-vault"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(expectedCash)}</div>
          <div class="stat-card-label">Kas Seharusnya</div>
        </div>
      </div>
      <p style="color: var(--color-text-secondary); margin-bottom: var(--space-4); font-size: var(--font-size-sm);">
        Shift dibuka ${Utils.formatDateTime(shift.opened_at)}
      </p>
      <button class="btn btn-danger" id="closeShiftBtn"><i class="fa-solid fa-stop"></i> Tutup Shift</button>`;
  },

  _bindShiftCardEvents() {
    document.getElementById('openShiftBtn')?.addEventListener('click', () => this.openShiftModal());
    document.getElementById('closeShiftBtn')?.addEventListener('click', () => this.closeShiftModal());
  },

  /* ===================================================
     MODAL: BUKA SHIFT
     =================================================== */

  openShiftModal() {
    ModalManager.open('openShift', {
      title: 'Buka Shift Kasir',
      size: 'sm',
      bodyHtml: `
        <div class="form-grid" style="grid-template-columns: 1fr;">
          <label class="form-field">
            <span>Nama Kasir</span>
            <input type="text" id="shiftCashierInput" value="${Utils.escapeHtml(AuthModule.getCashierName())}">
          </label>
          <label class="form-field">
            <span>Kas Awal (Modal Tunai)</span>
            <input type="number" id="shiftInitialCashInput" placeholder="0" min="0">
          </label>
        </div>`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="confirmOpenShiftBtn"><i class="fa-solid fa-play"></i> Buka Shift</button>`,
    });

    document.getElementById('confirmOpenShiftBtn')?.addEventListener('click', () => this._confirmOpenShift());
  },

  async _confirmOpenShift() {
    const cashierName = document.getElementById('shiftCashierInput')?.value.trim() || 'Kasir';
    const initialCash = Number(document.getElementById('shiftInitialCashInput')?.value) || 0;

    const payload = {
      cashier_name: cashierName,
      initial_cash: initialCash,
      final_cash: null,
      opened_at: new Date().toISOString(),
      closed_at: null,
      status: 'open',
    };

    const [shift] = await API.shifts.create(payload);

    STATE.setCurrentShift(shift);
    AuthModule.setCashierName(cashierName);
    this._updateShiftStatusLabel();

    ModalManager.close();
    Utils.showToast(`Shift dibuka untuk ${cashierName}`, 'success');
    this.renderShiftCard();
  },

  /* ===================================================
     MODAL: TUTUP SHIFT (REKONSILIASI)
     =================================================== */

  closeShiftModal() {
    const shift = STATE.currentShift;
    const cashTransactions = STATE.transactions.filter(t => t.shift_id === shift.id && t.payment_method === 'cash');
    const cashSales = cashTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
    const expectedCash = Number(shift.initial_cash) + cashSales;

    ModalManager.open('closeShift', {
      title: 'Tutup Shift Kasir',
      size: 'sm',
      bodyHtml: `
        <div class="summary-row"><span>Kas Awal</span><span>${Utils.formatCurrency(shift.initial_cash)}</span></div>
        <div class="summary-row"><span>Penjualan Tunai</span><span>${Utils.formatCurrency(cashSales)}</span></div>
        <div class="summary-row summary-row-total" style="margin-bottom: var(--space-4);"><span>Kas Seharusnya</span><span>${Utils.formatCurrency(expectedCash)}</span></div>
        <label class="form-field">
          <span>Kas Akhir (Hasil Hitung Fisik)</span>
          <input type="number" id="shiftFinalCashInput" placeholder="0" min="0">
        </label>
        <div id="shiftDiscrepancy" style="margin-top: var(--space-3); font-size: var(--font-size-sm);"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-danger" id="confirmCloseShiftBtn"><i class="fa-solid fa-stop"></i> Tutup Shift</button>`,
    });

    document.getElementById('shiftFinalCashInput')?.addEventListener('input', (e) => {
      const finalCash = Number(e.target.value) || 0;
      const diff = finalCash - expectedCash;
      const el = document.getElementById('shiftDiscrepancy');
      if (!el) return;
      if (diff === 0) {
        el.innerHTML = `<span class="badge badge-success">Kas sesuai ✅</span>`;
      } else if (diff > 0) {
        el.innerHTML = `<span class="badge badge-info">Kelebihan ${Utils.formatCurrency(diff)}</span>`;
      } else {
        el.innerHTML = `<span class="badge badge-danger">Kekurangan ${Utils.formatCurrency(Math.abs(diff))}</span>`;
      }
    });

    document.getElementById('confirmCloseShiftBtn')?.addEventListener('click', () => this._confirmCloseShift(expectedCash));
  },

  async _confirmCloseShift(expectedCash) {
    const finalCash = Number(document.getElementById('shiftFinalCashInput')?.value) || 0;
    const shift = STATE.currentShift;

    await API.shifts.update(shift.id, {
      final_cash: finalCash,
      closed_at: new Date().toISOString(),
      status: 'closed',
    });

    const diff = finalCash - expectedCash;
    STATE.setCurrentShift(null);
    this._updateShiftStatusLabel();

    ModalManager.close();
    Utils.showToast(
      diff === 0 ? 'Shift ditutup, kas sesuai ✅' : `Shift ditutup dengan selisih ${Utils.formatCurrency(Math.abs(diff))}`,
      diff === 0 ? 'success' : 'warning'
    );
    this.renderShiftCard();
  },

  /* ===================================================
     STATUS LABEL DI SIDEBAR
     =================================================== */

  _updateShiftStatusLabel() {
    const label = document.getElementById('shiftStatusLabel');
    if (!label) return;
    label.textContent = STATE.isShiftOpen ? 'Shift sedang berjalan' : 'Shift belum dibuka';
  },

  init() {
    STATE.subscribe('shift', () => {
      this.renderShiftCard();
      this._updateShiftStatusLabel();
    });
    this._updateShiftStatusLabel();
  },
};
