/* =====================================================
   MBUN COLLECTION — FEATURES/BACKUP.JS
   Fitur cadangan data: menggabungkan semua data penting
   (produk, pelanggan, transaksi + item, shift) jadi satu
   file JSON yang bisa didownload pengguna sebagai jaga-jaga.
   Ini BUKAN restore otomatis — kalau perlu dipulihkan,
   datanya perlu diimpor manual ke Supabase.
   ===================================================== */

const BackupModule = {
  /** Mengumpulkan seluruh data aplikasi yang sedang dimuat di STATE */
  async _collectData() {
    let onlineOrders = [];
    try {
      onlineOrders = await API.fetchAll(CONFIG.TABLES.ONLINE_ORDERS, { order: 'created_at.desc' });
    } catch (err) {
      console.warn('[Backup] Gagal memuat online_orders untuk backup:', err.message);
    }

    return {
      backup_info: {
        store_name: CONFIG.STORE.NAME,
        created_at: new Date().toISOString(),
        version: 2,
      },
      products: STATE.products,
      customers: STATE.customers,
      transactions: STATE.transactions,
      shifts: STATE.shifts,
      categories: ProductsModule.getCategories(),
      online_orders: onlineOrders,
    };
  },

  /** Membuat & mengunduh file JSON cadangan */
  async downloadBackup() {
    try {
      const data = await this._collectData();
      const json = JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `backup-${CONFIG.STORE.NAME.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.json`;

      Utils.downloadFile(filename, json, 'application/json');
      Utils.showToast('Cadangan data berhasil didownload', 'success');
    } catch (err) {
      console.error('[Backup] Gagal membuat cadangan:', err);
      Utils.showToast('Gagal membuat cadangan data', 'error');
    }
  },

  /* ===================================================
     PULIHKAN DARI CADANGAN
     Prinsip keamanan: HANYA MENAMBAHKAN data yang belum
     ada di sistem (dicocokkan lewat barcode/nama/telepon).
     Tidak pernah menimpa atau menghapus data yang sudah ada.
     =================================================== */

  _restoreParsedData: null,

  openRestoreModal() {
    this._restoreParsedData = null;

    ModalManager.open('restoreBackup', {
      title: 'Pulihkan dari Cadangan',
      size: 'sm',
      bodyHtml: `
        <p style="margin-bottom: var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
          Pilih file cadangan (.json) yang pernah kamu download. Data yang <strong>sudah ada</strong> di sistem tidak akan ditimpa — cuma yang belum ada yang ditambahkan.
        </p>
        <input type="file" id="restoreFileInput" accept="application/json">
        <div id="restorePreview" style="margin-top: var(--space-4);"></div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" data-modal-close>Batal</button>
        <button class="btn btn-primary" id="confirmRestoreBtn" disabled>Pulihkan Data</button>`,
    });

    document.getElementById('restoreFileInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const preview = document.getElementById('restorePreview');
      const confirmBtn = document.getElementById('confirmRestoreBtn');

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') throw new Error('Format file tidak dikenali');

        this._restoreParsedData = parsed;

        const counts = {
          products: (parsed.products || []).length,
          customers: (parsed.customers || []).length,
          transactions: (parsed.transactions || []).length,
          shifts: (parsed.shifts || []).length,
        };

        if (preview) {
          preview.innerHTML = `
            <div class="card" style="padding: var(--space-4); background: var(--color-surface-alt); margin-bottom:0;">
              <p style="font-size: var(--font-size-sm); margin-bottom: var(--space-2);"><strong>Isi file ini:</strong></p>
              <p style="font-size: var(--font-size-sm);">
                📦 ${counts.products} produk &middot; 👤 ${counts.customers} pelanggan &middot;
                🧾 ${counts.transactions} transaksi &middot; ⏰ ${counts.shifts} shift
              </p>
            </div>`;
        }
        if (confirmBtn) confirmBtn.disabled = false;
      } catch (err) {
        Utils.showToast('File tidak valid atau rusak: ' + err.message, 'error');
        this._restoreParsedData = null;
        if (confirmBtn) confirmBtn.disabled = true;
        if (preview) preview.innerHTML = '';
      }
    });

    document.getElementById('confirmRestoreBtn')?.addEventListener('click', () => {
      if (!this._restoreParsedData) return;
      const data = this._restoreParsedData;

      // PROTEKSI PIN: restore bisa menambahkan banyak data sekaligus,
      // wajib verifikasi dulu.
      AuthModule.requirePin('memulihkan data dari cadangan', () => {
        this._runRestore(data);
      });
    });
  },

  async _runRestore(data) {
    Utils.showToast('Memulihkan data, mohon tunggu...', 'info', 5000);

    let added = { products: 0, customers: 0, transactions: 0, shifts: 0, onlineOrders: 0 };

    // ---------- PRODUK: skip kalau barcode atau nama sudah ada ----------
    for (const p of (data.products || [])) {
      const exists = STATE.products.some(existing =>
        (p.barcode && existing.barcode === p.barcode) || existing.name === p.name
      );
      if (exists) continue;
      const { id, ...payload } = p; // buang id lama, biar Supabase buatkan yang baru
      try {
        await API.products.create(payload);
        added.products++;
      } catch (err) {
        console.warn('[Backup] Gagal restore produk', p.name, err.message);
      }
    }

    // ---------- PELANGGAN: skip kalau telepon atau nama sudah ada ----------
    for (const c of (data.customers || [])) {
      const exists = STATE.customers.some(existing =>
        (c.phone && existing.phone === c.phone) || existing.name === c.name
      );
      if (exists) continue;
      const { id, ...payload } = c;
      try {
        await API.customers.create(payload);
        added.customers++;
      } catch (err) {
        console.warn('[Backup] Gagal restore pelanggan', c.name, err.message);
      }
    }

    // ---------- SHIFT: selalu ditambahkan sebagai catatan baru ----------
    for (const s of (data.shifts || [])) {
      const { id, ...payload } = s;
      try {
        await API.shifts.create(payload);
        added.shifts++;
      } catch (err) {
        console.warn('[Backup] Gagal restore shift', err.message);
      }
    }

    // ---------- TRANSAKSI + ITEM: insert transaksi dulu, ambil id baru,
    // baru insert item-itemnya dengan transaction_id yang baru ----------
    for (const t of (data.transactions || [])) {
      const { id, items, ...payload } = t;
      try {
        const [newTrx] = await API.transactions.create(payload);
        if (newTrx && Array.isArray(items) && items.length > 0) {
          const newItems = items.map(item => {
            const { id: itemId, transaction_id, ...itemPayload } = item;
            return { ...itemPayload, transaction_id: newTrx.id };
          });
          await API.transactionItems.create(newItems);
        }
        added.transactions++;
      } catch (err) {
        console.warn('[Backup] Gagal restore transaksi', err.message);
      }
    }

    // ---------- PESANAN ONLINE: selalu ditambahkan sebagai catatan baru ----------
    for (const o of (data.online_orders || [])) {
      const { id, ...payload } = o;
      try {
        await API.insert(CONFIG.TABLES.ONLINE_ORDERS, payload);
        added.onlineOrders++;
      } catch (err) {
        console.warn('[Backup] Gagal restore pesanan online', err.message);
      }
    }

    // ---------- KATEGORI: gabung tanpa duplikat ----------
    if (Array.isArray(data.categories)) {
      const merged = [...new Set([...ProductsModule.getCategories(), ...data.categories])];
      ProductsModule.saveCategories(merged);
    }

    ModalManager.close();
    Utils.showToast(
      `Pulihkan selesai: +${added.products} produk, +${added.customers} pelanggan, +${added.transactions} transaksi, +${added.shifts} shift, +${added.onlineOrders} pesanan online`,
      'success', 7000
    );

    // Muat ulang data dari server biar tampilan ikut update — pakai
    // fungsi loader yang sudah ada di AppMain supaya konsisten (termasuk
    // penggabungan transaction_items ke tiap transaksi).
    try {
      const products = await API.products.getAll();
      STATE.setProducts(products);
      await AppMain._loadCustomers();
      await AppMain._loadTransactions();
      await AppMain._loadShifts();
      await OnlineOrdersModule.load();
    } catch (err) {
      console.warn('[Backup] Gagal muat ulang data setelah restore:', err.message);
    }
  },
};
