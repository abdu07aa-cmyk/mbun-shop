/* =====================================================
   WARUNGKITA PRO MAX — MODULES/PRODUCTS.JS
   Mengelola data produk: memuat dari API, merender ke
   grid Kasir & tabel Manajemen Produk, pencarian/filter
   kategori, serta operasi CRUD (tambah/edit/hapus).
   ===================================================== */

const ProductsModule = {
  /* ===================================================
     MEMUAT DATA
     =================================================== */

  /** Mengambil semua produk dari API lalu menyimpannya ke STATE */
  async load() {
    const products = await API.products.getAll();
    STATE.setProducts(products);
    this.renderCategoryPills();
    return products;
  },

  /* ===================================================
     RENDER: GRID PRODUK (HALAMAN KASIR)
     =================================================== */

  /** Merender grid kartu produk di halaman Kasir, menghormati filter aktif */
  renderProductGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const filtered = this.getFilteredProducts();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="cart-empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-box-open"></i>
          <p>Produk tidak ditemukan</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => this._productCardHtml(p)).join('');
  },

  /** Template kartu produk untuk grid Kasir — mode potret (foto penuh di atas) */
  _productCardHtml(product) {
    const isOutOfStock = product.stock <= 0;

    // FIX: sebelumnya pakai CSS "aspect-ratio", yang ternyata punya
    // bug/qwirk di sebagian Chrome Android saat dikombinasikan dengan
    // CSS Grid + gambar — bikin grid gagal menyusut jadi 3 kolom di HP
    // (walau di Firefox desktop terlihat normal). Diganti pakai teknik
    // "padding-top percentage" yang jauh lebih tua tapi didukung 100%
    // di semua browser tanpa pengecualian, dan tidak bergantung sama
    // sekali pada ukuran asli (intrinsic size) gambarnya.
    const imageBlock = product.image_url
      ? `<div style="width:100%; padding-top:133.33%; position:relative; overflow:hidden; background: var(--color-surface-alt);">
          <img src="${product.image_url}" alt="" loading="lazy" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;">
        </div>`
      : `<div style="width:100%; padding-top:133.33%; position:relative; background: var(--color-surface-alt);">
          <span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:40px;">${product.emoji || '📦'}</span>
        </div>`;

    return `
      <button class="card product-card" data-product-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}
        style="padding:0; overflow:hidden; text-align: left; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; opacity: ${isOutOfStock ? 0.5 : 1}; margin-bottom: 0; display:flex; flex-direction:column;">
        <div style="position:relative;">
          ${imageBlock}
          ${isOutOfStock ? `<div style="position:absolute; inset:0; background:rgba(15,23,42,0.55); display:flex; align-items:center; justify-content:center;"><span class="badge badge-danger">Stok Habis</span></div>` : ''}
        </div>
        <div style="padding: var(--space-3);">
          <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); margin-bottom: 2px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height: 2.6em;">
            ${Utils.escapeHtml(product.name)}
          </div>
          <div style="color: var(--color-primary); font-weight: var(--font-weight-bold); font-size: var(--font-size-sm);">
            ${Utils.formatCurrency(product.price)}
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">
            ${isOutOfStock ? 'Stok habis' : `Stok: ${product.stock}`}
          </div>
        </div>
      </button>`;
  },

  /** Menerapkan filter kategori + pencarian terhadap STATE.products */
  getFilteredProducts() {
    let result = STATE.products;

    if (STATE.activeCategory && STATE.activeCategory !== 'all') {
      result = result.filter(p => p.category === STATE.activeCategory);
    }

    if (STATE.searchQuery) {
      const q = STATE.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    }

    return result;
  },

  /** Merender pill kategori secara dinamis berdasarkan kategori unik di STATE.products */
  renderCategoryPills() {
    const container = document.getElementById('categoryPills');
    if (!container) return;

    const categories = [...new Set(STATE.products.map(p => p.category).filter(Boolean))];

    container.innerHTML = `
      <button class="pill ${STATE.activeCategory === 'all' ? 'is-active' : ''}" data-category="all">Semua</button>
      ${categories.map(cat => `
        <button class="pill ${STATE.activeCategory === cat ? 'is-active' : ''}" data-category="${Utils.escapeHtml(cat)}">
          ${Utils.escapeHtml(cat)}
        </button>`).join('')}
    `;
  },

  /* ===================================================
     RENDER: TABEL MANAJEMEN PRODUK
     =================================================== */

  renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;

    if (STATE.products.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">Belum ada produk. Klik "Tambah Produk" untuk mulai.</td></tr>`;
      return;
    }

    tbody.innerHTML = STATE.products.map(p => `
      <tr>
        <td>${Utils.productIconHtml(p, 32)}</td>
        <td>${Utils.escapeHtml(p.name)}</td>
        <td>${Utils.escapeHtml(p.category || '-')}</td>
        <td>${Utils.formatCurrency(p.price)}</td>
        <td>
          ${p.stock <= CONFIG.LOW_STOCK_THRESHOLD
            ? `<span class="badge badge-danger">${p.stock} (Menipis)</span>`
            : `<span class="badge badge-success">${p.stock}</span>`}
        </td>
        <td>${Utils.escapeHtml(p.barcode || '-')}</td>
        <td>${this._expiryBadge(p.expiry_date)}</td>
        <td>
          <button class="icon-btn" data-edit-product="${p.id}" aria-label="Edit produk"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn" data-delete-product="${p.id}" aria-label="Hapus produk"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  /** Menampilkan badge tanggal kadaluarsa dengan warna sesuai urgensi */
  _expiryBadge(expiryDate) {
    if (!expiryDate) return '-';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(expiryDate);
    const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    const label = Utils.formatDate(target);

    if (daysLeft < 0) return `<span class="badge badge-danger">${label}</span>`;
    if (daysLeft <= CONFIG.EXPIRY_WARNING_DAYS) return `<span class="badge badge-warning">${label}</span>`;
    return `<span class="badge badge-info">${label}</span>`;
  },

  /* ===================================================
     OPERASI CRUD
     =================================================== */

  /**
   * Menambahkan produk baru.
   * @param {object} productData - { name, category, price, stock, emoji, barcode, modal_price }
   */
  async create(productData) {
    if (Utils.isEmpty(productData.name) || !productData.price) {
      Utils.showToast('Nama dan harga produk wajib diisi', 'error');
      return null;
    }

    const [created] = await API.products.create({
      name: productData.name,
      category: productData.category || 'Umum',
      price: Number(productData.price),
      stock: Number(productData.stock) || 0,
      emoji: productData.emoji || '📦',
      image_url: productData.image_url || null,
      barcode: productData.barcode || '',
      modal_price: Number(productData.modal_price) || 0,
    });

    STATE.setProducts([...STATE.products, created]);
    this.renderCategoryPills();
    Utils.showToast(`Produk "${created.name}" berhasil ditambahkan`, 'success');
    Utils.playSound('success');
    return created;
  },

  /**
   * Memperbarui produk yang sudah ada.
   * @param {string} id
   * @param {object} changes
   */
  async update(id, changes) {
    await API.products.update(id, changes);

    // FIX: bandingkan sebagai string, karena id dari form (dataset HTML)
    // selalu string sedangkan p.id di STATE bisa berupa number/bigint —
    // perbandingan "===" tanpa ini bikin tidak ada baris yang cocok,
    // sehingga update tidak pernah tersimpan ke STATE lokal.
    const updatedProducts = STATE.products.map(p => (String(p.id) === String(id) ? { ...p, ...changes } : p));
    STATE.setProducts(updatedProducts);

    Utils.showToast('Produk berhasil diperbarui', 'success');
  },

  /**
   * Menghapus produk.
   * @param {string} id
   */
  async remove(id) {
    const product = STATE.products.find(p => String(p.id) === String(id));
    if (!product) return;

    await API.products.delete(id);

    STATE.setProducts(STATE.products.filter(p => String(p.id) !== String(id)));
    this.renderCategoryPills();
    Utils.showToast(`Produk "${product.name}" dihapus`, 'success');
  },

  /** Mencari satu produk berdasarkan barcode (dipakai fitur scanner) */
  findByBarcode(barcode) {
    return STATE.products.find(p => p.barcode === barcode);
  },

  /* ===================================================
     KELOLA KATEGORI PRODUK
     Disimpan di localStorage (bukan Supabase) — cuma daftar
     pilihan kategori, bukan data transaksional.
     =================================================== */

  getCategories() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.CATEGORIES);
      return stored ? JSON.parse(stored) : [...CONFIG.DEFAULT_CATEGORIES];
    } catch {
      return [...CONFIG.DEFAULT_CATEGORIES];
    }
  },

  saveCategories(categories) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  addCategory(name) {
    const clean = String(name || '').trim();
    if (!clean) {
      Utils.showToast('Nama kategori tidak boleh kosong', 'error');
      return;
    }
    const categories = this.getCategories();
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      Utils.showToast('Kategori itu sudah ada', 'warning');
      return;
    }
    categories.push(clean);
    this.saveCategories(categories);
    this.renderCategoryManageList();
    Utils.showToast(`Kategori "${clean}" ditambahkan`, 'success');
  },

  removeCategory(name) {
    const inUse = STATE.products.some(p => p.category === name);
    if (inUse) {
      Utils.showToast('Kategori ini masih dipakai produk, tidak bisa dihapus', 'error');
      return;
    }
    this.saveCategories(this.getCategories().filter(c => c !== name));
    this.renderCategoryManageList();
    Utils.showToast('Kategori dihapus', 'success');
  },

  renderCategoryManageList() {
    const container = document.getElementById('categoryManageList');
    if (!container) return;

    const categories = this.getCategories();
    container.innerHTML = categories.map(c => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding: var(--space-2) var(--space-3); background: var(--color-surface-alt); border-radius: var(--radius-sm);">
        <span style="font-size: var(--font-size-sm);">${Utils.escapeHtml(c)}</span>
        <button class="icon-btn" style="width:28px; height:28px;" data-remove-category="${Utils.escapeHtml(c)}" aria-label="Hapus kategori">
          <i class="fa-solid fa-xmark" style="font-size:11px;"></i>
        </button>
      </div>
    `).join('');

    Utils.qsa('[data-remove-category]').forEach(btn => {
      btn.addEventListener('click', () => this.removeCategory(btn.dataset.removeCategory));
    });
  },

  /* ===================================================
     RENDER ULANG OTOMATIS SAAT STATE BERUBAH
     =================================================== */
  init() {
    STATE.subscribe('products', () => {
      this.renderProductGrid();
      this.renderProductsTable();
      Notifications?.checkLowStock?.();
    });
  },
};
