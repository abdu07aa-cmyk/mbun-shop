/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/NOTIFICATIONS.JS
   Fitur notifikasi proaktif: memeriksa stok menipis secara
   otomatis setiap kali data produk berubah, menampilkan
   badge di ikon lonceng topbar, dan daftar notifikasi
   yang bisa dibuka kasir kapan saja.
   ===================================================== */

const Notifications = {
  /** Daftar notifikasi aktif, item terbaru ada di indeks 0 */
  items: [],

  /* ===================================================
     PEMERIKSAAN STOK MENIPIS
     =================================================== */

  /**
   * Memeriksa STATE.lowStockProducts dan membuat/memperbarui
   * notifikasi untuk produk yang stoknya menipis atau habis.
   * Dipanggil otomatis setiap kali STATE.products berubah.
   */
  checkLowStock() {
    const lowStock = STATE.lowStockProducts;

    // Hapus notifikasi stok lama untuk produk yang sudah tidak menipis lagi
    this.items = this.items.filter(n => {
      if (n.type !== 'low_stock') return true;
      return lowStock.some(p => p.id === n.productId);
    });

    lowStock.forEach(product => {
      const alreadyExists = this.items.some(n => n.type === 'low_stock' && n.productId === product.id);
      if (alreadyExists) return;

      this.items.unshift({
        id: Utils.generateId('NOTIF'),
        type: 'low_stock',
        productId: product.id,
        title: product.stock <= 0 ? 'Stok Habis' : 'Stok Menipis',
        message: product.stock <= 0
          ? `${product.name} kehabisan stok`
          : `${product.name} tersisa ${product.stock} unit`,
        severity: product.stock <= 0 ? 'danger' : 'warning',
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    });

    this._updateBadge();
  },

  /**
   * Menambahkan notifikasi umum non-stok (mis. dari fitur lain
   * di masa depan: shift hampir habis, transaksi besar, dll).
   * @param {{title: string, message: string, severity?: string}} notif
   */
  push(notif) {
    this.items.unshift({
      id: Utils.generateId('NOTIF'),
      type: 'general',
      severity: 'info',
      createdAt: new Date().toISOString(),
      isRead: false,
      ...notif,
    });
    this._updateBadge();
  },

  /* ===================================================
     RENDER: BADGE & DAFTAR NOTIFIKASI
     =================================================== */

  _updateBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const unreadCount = this.items.filter(n => !n.isRead).length;
    badge.hidden = unreadCount === 0;
  },

  /** Membuka modal/panel daftar notifikasi */
  openNotificationPanel() {
    ModalManager.open('notifications', {
      title: 'Notifikasi',
      size: 'sm',
      bodyHtml: this._listHtml(),
      footerHtml: this.items.length > 0
        ? `<button class="btn btn-secondary btn-block" id="markAllReadBtn">Tandai Semua Dibaca</button>`
        : '',
    });

    this.items.forEach(n => { n.isRead = true; });
    this._updateBadge();

    document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
      this.items.forEach(n => { n.isRead = true; });
      this._updateBadge();
      ModalManager.close();
    });
  },

  _listHtml() {
    if (this.items.length === 0) {
      return `<div class="cart-empty-state"><i class="fa-solid fa-bell-slash"></i><p>Belum ada notifikasi</p></div>`;
    }

    return this.items.map(n => `
      <div style="display:flex; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border);">
        <span class="badge badge-${n.severity}" style="height: fit-content;">
          <i class="fa-solid ${n.severity === 'danger' ? 'fa-circle-exclamation' : n.severity === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i>
        </span>
        <div>
          <strong style="font-size: var(--font-size-sm);">${Utils.escapeHtml(n.title)}</strong><br>
          <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${Utils.escapeHtml(n.message)}</span><br>
          <small>${Utils.formatRelativeTime(n.createdAt)}</small>
        </div>
      </div>
    `).join('');
  },

  init() {
    STATE.subscribe('products', () => this.checkLowStock());
  },
};
