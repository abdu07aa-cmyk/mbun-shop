/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/EXPORT.JS
   Fitur ekspor data ke format CSV (kompatibel Excel) dan
   PDF sederhana. Tidak memerlukan library eksternal untuk
   CSV; untuk PDF memakai jendela print bawaan browser
   dengan template cetak khusus agar tetap ringan.
   ===================================================== */

const ExportModule = {
  /* ===================================================
     EKSPOR CSV (BISA DIBUKA DI EXCEL)
     =================================================== */

  /**
   * Mengubah array of object menjadi string CSV dan memicu unduhan.
   * @param {Array<object>} rows - data yang akan diekspor
   * @param {Array<{key: string, label: string}>} columns - definisi kolom
   * @param {string} filename
   */
  exportToCsv(rows, columns, filename) {
    if (!rows || rows.length === 0) {
      Utils.showToast('Tidak ada data untuk diekspor', 'warning');
      return;
    }

    const header = columns.map(c => this._csvEscape(c.label)).join(',');
    const body = rows
      .map(row => columns.map(c => this._csvEscape(this._resolveValue(row, c.key))).join(','))
      .join('\n');

    // Tambahkan BOM agar karakter non-ASCII (mis. emoji/Rupiah) tampil benar di Excel
    const csvContent = '\uFEFF' + header + '\n' + body;

    Utils.downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
    Utils.showToast(`Berhasil mengekspor ${rows.length} baris ke ${filename}`, 'success');
  },

  /** Mengambil nilai dari object, mendukung path bertitik mis. "items.length" */
  _resolveValue(row, key) {
    return key.split('.').reduce((obj, part) => (obj ? obj[part] : ''), row) ?? '';
  },

  /** Membungkus nilai dengan tanda kutip jika mengandung koma/baris baru/kutip */
  _csvEscape(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  },

  /* ===================================================
     EKSPOR PER-ENTITAS (shortcut siap pakai)
     =================================================== */

  exportProducts() {
    this.exportToCsv(
      STATE.products,
      [
        { key: 'name', label: 'Nama Produk' },
        { key: 'category', label: 'Kategori' },
        { key: 'price', label: 'Harga Jual' },
        { key: 'modal_price', label: 'Harga Modal' },
        { key: 'stock', label: 'Stok' },
        { key: 'barcode', label: 'Barcode' },
      ],
      `produk-warungkita-${this._todayStamp()}.csv`
    );
  },

  exportTransactions() {
    this.exportToCsv(
      STATE.transactions,
      [
        { key: 'id', label: 'ID Transaksi' },
        { key: 'created_at', label: 'Waktu' },
        { key: 'customer_name', label: 'Pelanggan' },
        { key: 'payment_method', label: 'Metode Bayar' },
        { key: 'total_amount', label: 'Total' },
        { key: 'discount', label: 'Diskon' },
        { key: 'payment_status', label: 'Status' },
      ],
      `transaksi-warungkita-${this._todayStamp()}.csv`
    );
  },

  exportCustomers() {
    this.exportToCsv(
      STATE.customers,
      [
        { key: 'name', label: 'Nama' },
        { key: 'phone', label: 'Telepon' },
        { key: 'points', label: 'Poin' },
        { key: 'created_at', label: 'Bergabung Sejak' },
      ],
      `pelanggan-warungkita-${this._todayStamp()}.csv`
    );
  },

  /* ===================================================
     EKSPOR PDF (VIA PRINT WINDOW)
     =================================================== */

  /**
   * Membuka jendela cetak berisi tabel sederhana yang bisa
   * disimpan sebagai PDF lewat dialog "Print to PDF" browser.
   * @param {string} title
   * @param {Array<object>} rows
   * @param {Array<{key: string, label: string}>} columns
   */
  exportToPdf(title, rows, columns) {
    if (!rows || rows.length === 0) {
      Utils.showToast('Tidak ada data untuk diekspor', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Utils.showToast('Browser memblokir jendela cetak, izinkan pop-up untuk situs ini', 'error');
      return;
    }

    const tableRows = rows.map(row => `
      <tr>${columns.map(c => `<td>${Utils.escapeHtml(this._resolveValue(row, c.key))}</td>`).join('')}</tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${Utils.escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            small { color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f4f6fb; }
          </style>
        </head>
        <body>
          <h1>${Utils.escapeHtml(title)}</h1>
          <small>${CONFIG.STORE.NAME} — Diekspor pada ${Utils.formatDateTime(new Date())}</small>
          <table>
            <thead><tr>${columns.map(c => `<th>${Utils.escapeHtml(c.label)}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  },

  _todayStamp() {
    return new Date().toISOString().slice(0, 10);
  },
};
