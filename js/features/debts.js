/* =====================================================
   MBUN COLLECTION — FEATURES/DEBTS.JS
   Fitur HUTANG / PIUTANG PELANGGAN:
   - Pencatatan hutang dilakukan dari modal pembayaran kasir
     (metode "Hutang", lihat payment.js), termasuk DP.
   - Menu "Hutang": ringkasan piutang, daftar per pelanggan,
     rincian, pembayaran/cicilan (dialokasikan ke hutang
     TERTUA dulu), bukti pembayaran, dan pengingat WhatsApp.

   Modul ini mandiri: mendaftarkan event & render sendiri
   (lihat bagian init di bawah), jadi events.js tidak perlu
   diubah. Data pembayaran ada di tabel debt_payments;
   sisa hutang tiap transaksi dihitung dari kolom
   transactions.amount_paid.
   ===================================================== */

const DebtsModule = {
  /** Semua catatan pembayaran hutang (terbaru di indeks 0) */
  payments: [],
  _overdueAlerted: false,

  /* ===================================================
     HELPER DATA
     =================================================== */

  /** Apakah transaksi ini transaksi hutang (bukan retur) */
  isDebt(t) {
    return !!t && t.payment_method === 'debt' && Number(t.total_amount) > 0;
  },

  /** Sisa hutang sebuah transaksi (0 kalau bukan hutang / sudah lunas) */
  outstanding(t) {
    if (!this.isDebt(t)) return 0;
    if (t.payment_status === 'paid' || t.payment_status === 'refunded') return 0;
    return Math.max(0, Number(t.total_amount) - (Number(t.amount_paid) || 0));
  },

  /** Mengubah "YYYY-MM-DD" jadi Date lokal akhir hari (hindari geser zona waktu) */
  _dueDateObj(str) {
    if (!str) return null;
    const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 23, 59, 59);
  },

  formatDueDate(str) {
    const d = this._dueDateObj(str);
    return d ? Utils.formatDate(d) : '-';
  },

  isOverdue(t) {
    const due = this._dueDateObj(t.due_date);
    return !!due && this.outstanding(t) > 0 && due < new Date();
  },

  _byOldest(a, b) {
    return Utils._parseDate(a.created_at) - Utils._parseDate(b.created_at);
  },

  _methodLabel(id) {
    return CONFIG.PAYMENT_METHODS.find(m => m.id === id)?.label || String(id || '-');
  },

  /** Transaksi yang masih punya sisa hutang */
  getOpenTransactions() {
    return STATE.transactions.filter(t => this.outstanding(t) > 0);
  },

  /** Hutang dikelompokkan per pelanggan, hutang terbesar di atas */
  getCustomerDebts() {
    const map = {};

    this.getOpenTransactions().forEach(t => {
      const name = t.customer_name || 'Umum';
      if (!map[name]) map[name] = { name, total: 0, count: 0, oldest: null, overdue: false, trxs: [] };
      const c = map[name];
      c.total += this.outstanding(t);
      c.count += 1;
      c.trxs.push(t);
      const created = Utils._parseDate(t.created_at);
      if (!c.oldest || created < c.oldest) c.oldest = created;
      if (this.isOverdue(t)) c.overdue = true;
    });

    const list = Object.values(map);
    list.forEach(c => c.trxs.sort((a, b) => this._byOldest(a, b)));
    return list.sort((a, b) => b.total - a.total);
  },

  /** Total seluruh piutang */
  totalOutstanding() {
    return this.getOpenTransactions().reduce((sum, t) => sum + this.outstanding(t), 0);
  },

  /** Total hutang aktif milik 1 pelanggan (dicocokkan lewat nama) */
  outstandingFor(customerName) {
    return this.getOpenTransactions()
      .filter(t => (t.customer_name || 'Umum') === customerName)
      .reduce((sum, t) => sum + this.outstanding(t), 0);
  },

  /** Ringkasan hutang 1 pelanggan: total, jumlah transaksi, dan bagian yang lewat jatuh tempo */
  summaryFor(customerName) {
    const trxs = this.getOpenTransactions()
      .filter(t => (t.customer_name || 'Umum') === customerName);

    let total = 0, overdueAmount = 0, overdueCount = 0;
    trxs.forEach(t => {
      const rest = this.outstanding(t);
      total += rest;
      if (this.isOverdue(t)) {
        overdueAmount += rest;
        overdueCount += 1;
      }
    });

    return { total, count: trxs.length, overdueAmount, overdueCount };
  },

  /** Uang TUNAI dari pembayaran hutang (DP/cicilan) yang diterima selama 1 shift */
  cashCollectedInShift(shiftId) {
    return this.payments
      .filter(p =>
        p.method === 'cash' &&
        String(p.shift_id) === String(shiftId) &&
        STATE.transactions.some(t => String(t.id) === String(p.transaction_id))
      )
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  },

  /** Badge status untuk tabel transaksi (Hutang / Cicilan / Lunas / Retur) */
  statusBadgeHtml(t) {
    if (Number(t.total_amount) < 0) return '<span class="badge badge-danger">Retur</span>';
    if (t.payment_method === 'debt') {
      if (t.payment_status === 'unpaid') return '<span class="badge badge-danger">Hutang</span>';
      if (t.payment_status === 'partial') return '<span class="badge badge-warning">Cicilan</span>';
    }
    return '<span class="badge badge-success">Lunas</span>';
  },

  /* ===================================================
     MUAT & SIMPAN DATA PEMBAYARAN
     =================================================== */

  async load() {
    try {
      this.payments = await API.fetchAll(CONFIG.TABLES.DEBT_PAYMENTS, { order: 'created_at.desc' });
    } catch (err) {
      console.warn('[Debts] Gagal memuat debt_payments:', err.message);
      this.payments = [];
    }
    this.render();
  },

  /** Menyimpan 1 atau beberapa catatan pembayaran ke database */
  async recordPayments(rows) {
    const saved = await API.insert(CONFIG.TABLES.DEBT_PAYMENTS, rows);
    const list = Array.isArray(saved) && saved.length ? saved : rows;
    this.payments = [...list, ...this.payments];
    return list;
  },

  /* ===================================================
     RENDER: MENU HUTANG
     =================================================== */

  render() {
    this._renderSummary();
    this._renderTable();
    this._syncBadge();
  },

  _renderSummary() {
    const grid = document.getElementById('debtStatGrid');
    if (!grid) return;

    const customers = this.getCustomerDebts();
    const total = customers.reduce((sum, c) => sum + c.total, 0);
    const overdueCount = this.getOpenTransactions().filter(t => this.isOverdue(t)).length;

    const now = new Date();
    const receivedThisMonth = this.payments
      .filter(p => {
        const d = Utils._parseDate(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const cards = [
      { icon: 'fa-book',               color: 'is-red',    value: Utils.formatCurrency(total),            label: 'Total Piutang' },
      { icon: 'fa-users',              color: 'is-orange', value: customers.length,                       label: 'Pelanggan Berhutang' },
      { icon: 'fa-clock',              color: 'is-red',    value: overdueCount,                           label: 'Lewat Jatuh Tempo' },
      { icon: 'fa-hand-holding-dollar', color: 'is-green', value: Utils.formatCurrency(receivedThisMonth), label: 'Pembayaran Diterima Bulan Ini' },
    ];

    grid.innerHTML = cards.map(s => `
      <div class="stat-card">
        <div class="stat-card-icon ${s.color}"><i class="fa-solid ${s.icon}"></i></div>
        <div class="stat-card-value">${s.value}</div>
        <div class="stat-card-label">${s.label}</div>
      </div>`).join('');
  },

  _renderTable() {
    const tbody = document.querySelector('#debtTable tbody');
    if (!tbody) return;

    const q = STATE.currentView === 'hutang'
      ? (document.getElementById('globalSearch')?.value || '').trim().toLowerCase()
      : '';

    let list = this.getCustomerDebts();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q));

    if (list.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="6">${q ? 'Tidak ada pelanggan yang cocok dengan pencarian.' : 'Tidak ada hutang tercatat 🎉'}</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const key = encodeURIComponent(c.name);
      return `
        <tr>
          <td><strong>${Utils.escapeHtml(c.name)}</strong></td>
          <td>${c.count} transaksi</td>
          <td><strong style="color: var(--color-danger);">${Utils.formatCurrency(c.total)}</strong></td>
          <td>${c.oldest ? Utils.formatRelativeTime(c.oldest) : '-'}</td>
          <td>${c.overdue
            ? '<span class="badge badge-danger">Lewat jatuh tempo</span>'
            : '<span class="badge badge-warning">Belum lunas</span>'}</td>
          <td style="display:flex; gap: var(--space-2); flex-wrap:wrap;">
            <button class="icon-btn" data-debt-detail="${key}" title="Rincian hutang" aria-label="Rincian hutang">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-primary" style="padding: var(--space-2) var(--space-3);" data-debt-pay="${key}">
              <i class="fa-solid fa-hand-holding-dollar"></i> Bayar
            </button>
            <button class="icon-btn" style="color:#16a34a;" data-debt-remind="${key}" title="Ingatkan via WhatsApp" aria-label="Ingatkan via WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
          </td>
        </tr>`;
    }).join('');
  },

  /** Titik merah di sidebar kalau ada hutang lewat jatuh tempo */
  _syncBadge() {
    const badge = document.getElementById('debtBadge');
    if (!badge) return;
    const hasOverdue = this.getOpenTransactions().some(t => this.isOverdue(t));
    badge.style.display = hasOverdue ? 'block' : 'none';
  },

  /* ===================================================
     MODAL: RINCIAN HUTANG 1 PELANGGAN
     =================================================== */

  openDetailModal(name) {
    const c = this.getCustomerDebts().find(x => x.name === name);
    if (!c) {
      Utils.showToast('Pelanggan ini tidak punya hutang aktif', 'info');
      return;
    }

    const key = encodeURIComponent(name);

    const trxHtml = c.trxs.map(t => {
      const rest = this.outstanding(t);
      const overdue = this.isOverdue(t);
      const items = (t.items || []).map(item => {
        const product = STATE.products.find(p => String(p.id) === String(item.product_id));
        return `${Utils.escapeHtml(product?.name || 'Produk')} x${item.quantity}`;
      }).join(', ') || 'Detail item tidak tersedia';

      return `
        <div class="card" style="margin-bottom: var(--space-3); padding: var(--space-4);">
          <div style="display:flex; justify-content:space-between; gap: var(--space-2); margin-bottom: var(--space-2);">
            <strong style="font-size: var(--font-size-sm);">${Utils.formatDateTime(t.created_at)}</strong>
            <strong style="font-size: var(--font-size-sm); flex-shrink:0; color: var(--color-danger);">${Utils.formatCurrency(rest)}</strong>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2);">${items}</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Total ${Utils.formatCurrency(t.total_amount)} &middot; Dibayar ${Utils.formatCurrency(t.amount_paid || 0)}
          </div>
          ${t.due_date ? `<span class="badge ${overdue ? 'badge-danger' : 'badge-info'}" style="margin-top: var(--space-2);">Jatuh tempo ${this.formatDueDate(t.due_date)}</span>` : ''}
          ${t.note ? `<div style="font-size: var(--font-size-xs); margin-top: var(--space-2);">📝 ${Utils.escapeHtml(t.note)}</div>` : ''}
        </div>`;
    }).join('');

    const history = this.payments.filter(p => p.customer_name === name).slice(0, 15);
    const historyHtml = history.length
      ? history.map(p => `
          <div class="summary-row" style="padding: var(--space-1) 0;">
            <span>${Utils.formatDateTime(p.created_at)} &middot; ${this._methodLabel(p.method)}${p.note === 'DP' ? ' (DP)' : ''}</span>
            <strong style="color: var(--color-success);">${Utils.formatCurrency(p.amount)}</strong>
          </div>`).join('')
      : `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Belum ada pembayaran tercatat.</p>`;

    ModalManager.open('debtDetail', {
      title: `Hutang: ${name}`,
      size: 'md',
      bodyHtml: `
        <div class="summary-row summary-row-total" style="margin-bottom: var(--space-4);">
          <span>Total Sisa Hutang</span><span style="color: var(--color-danger);">${Utils.formatCurrency(c.total)}</span>
        </div>
        <p style="margin-bottom: var(--space-2); font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">Transaksi belum lunas (terlama di atas)</p>
        ${trxHtml}
        <p style="margin: var(--space-4) 0 var(--space-2); font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">Riwayat pembayaran</p>
        ${historyHtml}`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Tutup</button>
        <button class="btn btn-secondary" data-debt-remind="${key}"><i class="fa-brands fa-whatsapp"></i> Ingatkan</button>
        <button class="btn btn-primary" data-debt-pay="${key}"><i class="fa-solid fa-hand-holding-dollar"></i> Bayar Hutang</button>`,
    });
  },

  /* ===================================================
     MODAL: BAYAR HUTANG (CICIL / LUNAS)
     =================================================== */

  openPayModal(name) {
    const c = this.getCustomerDebts().find(x => x.name === name);
    if (!c) {
      Utils.showToast('Pelanggan ini tidak punya hutang aktif', 'info');
      return;
    }

    ModalManager.open('debtPay', {
      title: `Bayar Hutang: ${name}`,
      size: 'sm',
      bodyHtml: `
        <div class="summary-row summary-row-total" style="margin-bottom: var(--space-4);">
          <span>Total Hutang</span><span>${Utils.formatCurrency(c.total)}</span>
        </div>
        <div class="form-grid" style="grid-template-columns: 1fr;">
          <label class="form-field">
            <span>Nominal Dibayar</span>
            <input type="number" id="debtPayAmount" min="1" max="${c.total}" value="${c.total}">
          </label>
          <div style="display:flex; gap: var(--space-2); flex-wrap:wrap;">
            <button type="button" class="link-btn" id="debtPayFullBtn">Bayar lunas semua</button>
            <button type="button" class="link-btn" id="debtPayHalfBtn">Bayar setengah</button>
          </div>
          <label class="form-field">
            <span>Metode Pembayaran</span>
            <select id="debtPayMethod" class="select-field">
              ${CONFIG.PAYMENT_METHODS.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
            </select>
          </label>
          <label class="form-field">
            <span>Catatan (opsional)</span>
            <input type="text" id="debtPayNote" placeholder="mis. cicilan ke-2">
          </label>
        </div>
        <div id="debtPayPreview" style="margin-top: var(--space-3);"></div>`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="confirmDebtPayBtn"><i class="fa-solid fa-check"></i> Catat Pembayaran</button>`,
    });

    const amountInput = document.getElementById('debtPayAmount');

    const updatePreview = () => {
      const amount = Number(amountInput?.value) || 0;
      const rest = Math.max(0, c.total - amount);
      const preview = document.getElementById('debtPayPreview');
      if (!preview) return;
      preview.innerHTML = amount > c.total
        ? `<span class="badge badge-danger">Nominal melebihi total hutang</span>`
        : `<div class="summary-row"><span>Sisa hutang setelah bayar</span><strong>${Utils.formatCurrency(rest)}</strong></div>
           ${rest === 0 ? '<span class="badge badge-success">Akan lunas ✅</span>' : ''}`;
    };

    amountInput?.addEventListener('input', updatePreview);
    document.getElementById('debtPayFullBtn')?.addEventListener('click', () => {
      amountInput.value = c.total;
      updatePreview();
    });
    document.getElementById('debtPayHalfBtn')?.addEventListener('click', () => {
      amountInput.value = Math.ceil(c.total / 2);
      updatePreview();
    });
    document.getElementById('confirmDebtPayBtn')?.addEventListener('click', () => this._confirmPay(name));

    updatePreview();
  },

  async _confirmPay(name) {
    const c = this.getCustomerDebts().find(x => x.name === name);
    if (!c) return;

    const amount = Number(document.getElementById('debtPayAmount')?.value) || 0;
    const method = document.getElementById('debtPayMethod')?.value || 'cash';
    const note = document.getElementById('debtPayNote')?.value.trim() || '';

    if (amount <= 0) {
      Utils.showToast('Masukkan nominal pembayaran', 'error');
      return;
    }
    if (amount > c.total) {
      Utils.showToast('Nominal melebihi total hutang', 'error');
      return;
    }
    if (method === 'cash' && !STATE.isShiftOpen) {
      Utils.showToast('Buka shift kasir dulu untuk menerima pembayaran tunai', 'warning');
      return;
    }

    const btn = document.getElementById('confirmDebtPayBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    }

    try {
      const result = await this.applyPayment(name, amount, method, note);
      ModalManager.close();
      Utils.playSound('cash');
      Utils.showToast('Pembayaran hutang berhasil dicatat', 'success');
      this._showProof(result);
    } catch (err) {
      console.error('[Debts] Gagal mencatat pembayaran:', err);
      Utils.showToast('Gagal mencatat pembayaran, coba lagi', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Catat Pembayaran';
      }
    }
  },

  /**
   * Mengalokasikan pembayaran ke hutang TERTUA dulu, memperbarui
   * transaksi (amount_paid & status), lalu mencatat ke debt_payments.
   */
  async applyPayment(name, amount, method, note) {
    const c = this.getCustomerDebts().find(x => x.name === name);
    if (!c) throw new Error('Hutang pelanggan tidak ditemukan');

    let left = amount;
    const updates = [];
    const rows = [];
    const allocations = [];
    const shiftId = STATE.currentShift?.id ? String(STATE.currentShift.id) : null;

    for (const t of c.trxs) { // sudah terurut dari yang tertua
      if (left <= 0) break;
      const pay = Math.min(this.outstanding(t), left);
      if (pay <= 0) continue;
      left -= pay;

      const newPaid = (Number(t.amount_paid) || 0) + pay;
      const settled = newPaid >= Number(t.total_amount);

      updates.push({ id: t.id, newPaid, status: settled ? 'paid' : 'partial' });
      rows.push({
        transaction_id: String(t.id),
        customer_name: name,
        amount: pay,
        method,
        shift_id: shiftId,
        note: note || null,
      });
      allocations.push({ created_at: t.created_at, paid: pay, settled });
    }

    for (const u of updates) {
      await API.transactions.update(u.id, { amount_paid: u.newPaid, payment_status: u.status });
    }

    STATE.setTransactions(STATE.transactions.map(t => {
      const u = updates.find(x => String(x.id) === String(t.id));
      return u ? { ...t, amount_paid: u.newPaid, payment_status: u.status } : t;
    }));

    await this.recordPayments(rows);
    this.render();

    return {
      name,
      amount,
      method,
      note,
      date: new Date(),
      allocations,
      remaining: this.outstandingFor(name),
    };
  },

  /* ===================================================
     BUKTI PEMBAYARAN HUTANG
     =================================================== */

  _proofText(r) {
    return [
      `*${CONFIG.STORE.NAME}*`,
      '*BUKTI PEMBAYARAN HUTANG*',
      Utils.formatDateTime(r.date),
      '------------------------------',
      `Pelanggan: ${r.name}`,
      ...r.allocations.map(a => `Belanja ${Utils.formatDate(a.created_at)}${a.settled ? ' (lunas)' : ''}: ${Utils.formatCurrency(a.paid)}`),
      '------------------------------',
      `*DIBAYAR: ${Utils.formatCurrency(r.amount)}*`,
      `Metode: ${this._methodLabel(r.method)}`,
      `Sisa hutang: ${Utils.formatCurrency(r.remaining)}`,
      r.remaining === 0 ? '*** LUNAS ***' : '',
      '',
      'Terima kasih 🙏',
    ].filter(line => line !== null).join('\n');
  },

  _showProof(r) {
    const allocRows = r.allocations.map(a => `
      <div class="receipt-row">
        <span>Belanja ${Utils.formatDate(a.created_at)}${a.settled ? ' (lunas)' : ''}</span>
        <span>${Utils.formatCurrency(a.paid)}</span>
      </div>`).join('');

    ModalManager.open('debtProof', {
      title: 'Bukti Pembayaran Hutang',
      size: 'sm',
      bodyHtml: `
        <div class="receipt">
          <div class="receipt-header">
            <strong>${CONFIG.STORE.NAME}</strong><br>
            <small>${CONFIG.STORE.ADDRESS}</small><br>
            <small>Telp: ${CONFIG.STORE.PHONE}</small><br>
            <small>${Utils.formatDateTime(r.date)}</small>
          </div>
          <div style="text-align:center; font-weight: var(--font-weight-bold); margin-bottom: var(--space-3);">BUKTI PEMBAYARAN HUTANG</div>
          <div class="receipt-row"><span>Pelanggan</span><span>${Utils.escapeHtml(r.name)}</span></div>
          <div class="receipt-divider"></div>
          ${allocRows}
          <div class="receipt-divider"></div>
          <div class="receipt-total-row"><span>DIBAYAR</span><span>${Utils.formatCurrency(r.amount)}</span></div>
          <div class="receipt-row"><span>Metode</span><span>${Utils.escapeHtml(this._methodLabel(r.method))}</span></div>
          <div class="receipt-row"><span>Sisa hutang</span><span>${Utils.formatCurrency(r.remaining)}</span></div>
          ${r.remaining === 0 ? `<div style="text-align:center; font-weight: var(--font-weight-bold); margin-top: var(--space-2);">*** LUNAS ***</div>` : ''}
          <div class="receipt-header" style="border-bottom:none; border-top: 1px dashed var(--color-border); margin-top: var(--space-3); padding-top: var(--space-3);">
            Terima kasih! 🙏
          </div>
        </div>`,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Tutup</button>
        <button class="btn btn-primary" id="shareDebtProofBtn"><i class="fa-solid fa-share-nodes"></i> Bagikan</button>`,
    });

    document.getElementById('shareDebtProofBtn')?.addEventListener('click', () => this._shareProof(r));
  },

  /** Bagikan bukti sebagai gambar (fallback: teks) */
  async _shareProof(r) {
    const el = document.querySelector('#modalRoot .receipt');
    const text = this._proofText(r);
    const btn = document.getElementById('shareDebtProofBtn');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
    }

    try {
      if (typeof html2canvas !== 'undefined' && el) {
        const canvas = await html2canvas(el, {
          scale: Math.max(2, window.devicePixelRatio || 1),
          backgroundColor: '#ffffff',
          useCORS: true,
          onclone: (doc) => doc.body.setAttribute('data-theme', 'light'),
        });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        if (blob) {
          const fileName = `bukti-hutang-${Date.now()}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: `Bukti Pembayaran ${CONFIG.STORE.NAME}`, files: [file] });
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          Utils.showToast('Gambar bukti tersimpan ke HP — lampirkan manual ke chat', 'success', 5000);
          return;
        }
      }
      await this._shareText(text);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Debts] Gagal bagikan gambar, pakai teks:', err.message);
        await this._shareText(text);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Bagikan';
      }
    }
  },

  async _shareText(text) {
    if (navigator.share) {
      try {
        await navigator.share({ title: CONFIG.STORE.NAME, text });
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('[Debts] Gagal share teks:', err.message);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Teks disalin ke clipboard — tempel (paste) ke WhatsApp/chat', 'success', 5000);
    } catch {
      Utils.showToast('Fitur bagikan tidak didukung di browser ini', 'error');
    }
  },

  /* ===================================================
     PENGINGAT VIA WHATSAPP
     =================================================== */

  /** Mengubah nomor HP lokal (08xx) menjadi format internasional (628xx) */
  _waNumber(phone) {
    let n = String(phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (!n) return '';
    if (n.startsWith('0')) n = '62' + n.slice(1);
    else if (n.startsWith('8')) n = '62' + n;
    return n;
  },

  remind(name) {
    const c = this.getCustomerDebts().find(x => x.name === name);
    if (!c) {
      Utils.showToast('Pelanggan ini tidak punya hutang aktif', 'info');
      return;
    }

    const customer = STATE.customers.find(x => x.name === name);
    const phone = this._waNumber(customer?.phone);
    if (!phone) {
      Utils.showToast('Nomor HP pelanggan belum diisi. Isi dulu di menu Pelanggan (tombol edit).', 'warning', 5000);
      return;
    }

    const bank = CONFIG.STORE.BANK_ACCOUNT;
    const lines = c.trxs.map(t =>
      `• ${Utils.formatDate(t.created_at)}: ${Utils.formatCurrency(this.outstanding(t))}` +
      (t.due_date ? ` (jatuh tempo ${this.formatDueDate(t.due_date)})` : '')
    );

    const text = [
      `Halo ${name}, kami dari ${CONFIG.STORE.NAME} 🙏`,
      '',
      `Mengingatkan bahwa masih ada sisa hutang belanja sebesar *${Utils.formatCurrency(c.total)}*:`,
      ...lines,
      '',
      `Pembayaran bisa tunai di toko atau transfer ke ${bank.BANK} ${bank.NUMBER} a.n. ${bank.HOLDER}.`,
      'Terima kasih 🙏',
    ].join('\n');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  },

  /* ===================================================
     INISIALISASI (mandiri)
     =================================================== */

  _onDataChange() {
    // try/catch: kalau ada error di tampilan hutang, JANGAN sampai
    // menggagalkan proses pembayaran/penyimpanan transaksi di kasir.
    try {
      this.render();

      // Notifikasi lonceng sekali per sesi kalau ada yang lewat jatuh tempo
      if (this._overdueAlerted) return;
      const overdueCount = this.getOpenTransactions().filter(t => this.isOverdue(t)).length;
      if (overdueCount > 0 && typeof Notifications !== 'undefined') {
        Notifications.push({
          title: 'Hutang Jatuh Tempo',
          message: `${overdueCount} transaksi hutang sudah lewat jatuh tempo`,
          severity: 'warning',
        });
        this._overdueAlerted = true;
      }
    } catch (err) {
      console.warn('[Debts] Gagal memperbarui tampilan hutang:', err);
    }
  },

  init() {
    STATE.subscribe('transactions', () => this._onDataChange());

    STATE.subscribe('view', () => {
      if (STATE.currentView === 'hutang') this.load();
    });

    // Delegasi klik: tombol di tabel Hutang maupun di dalam modal
    document.addEventListener('click', (e) => {
      const detailBtn = e.target.closest('[data-debt-detail]');
      if (detailBtn) return this.openDetailModal(decodeURIComponent(detailBtn.dataset.debtDetail));

      const payBtn = e.target.closest('[data-debt-pay]');
      if (payBtn) return this.openPayModal(decodeURIComponent(payBtn.dataset.debtPay));

      const remindBtn = e.target.closest('[data-debt-remind]');
      if (remindBtn) return this.remind(decodeURIComponent(remindBtn.dataset.debtRemind));
    });

    // Pencarian global ikut menyaring daftar hutang saat menu Hutang terbuka
    document.getElementById('globalSearch')?.addEventListener('input', Utils.debounce(() => {
      if (STATE.currentView === 'hutang') this._renderTable();
    }, 300));

    this.load();
  },
};

document.addEventListener('DOMContentLoaded', () => DebtsModule.init());
