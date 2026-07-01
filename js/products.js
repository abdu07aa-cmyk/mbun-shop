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

  /** Template kartu produk untuk grid Kasir */
  _productCardHtml(product) {
    const isOutOfStock = product.stock <= 0;
    return `
      <button class="card product-card" data-product-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}
        style="padding: var(--space-4); text-align: left; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; opacity: ${isOutOfStock ? 0.5 : 1}; margin-bottom: 0;">
        <div style="font-size: 32px; margin-bottom: var(--space-2);">${product.emoji || '📦'}</div>
        <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); margin-bottom: 2px;">
          ${Utils.escapeHtml(product.name)}
        </div>
        <div style="color: var(--color-primary); font-weight: var(--font-weight-bold); font-size: var(--font-size-sm);">
          ${Utils.formatCurrency(product.price)}
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">
          ${isOutOfStock ? 'Stok habis' : `Stok: ${product.stock}`}
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
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="7">Belum ada produk. Klik "Tambah Produk" untuk mulai.</td></tr>`;
      return;
    }

    tbody.innerHTML = STATE.products.map(p => `
      <tr>
        <td style="font-size: 20px;">${p.emoji || '📦'}</td>
        <td>${Utils.escapeHtml(p.name)}</td>
        <td>${Utils.escapeHtml(p.category || '-')}</td>
        <td>${Utils.formatCurrency(p.price)}</td>
        <td>
          ${p.stock <= CONFIG.LOW_STOCK_THRESHOLD
            ? `<span class="badge badge-danger">${p.stock} (Menipis)</span>`
            : `<span class="badge badge-success">${p.stock}</span>`}
        </td>
        <td>${Utils.escapeHtml(p.barcode || '-')}</td>
        <td>
          <button class="icon-btn" data-edit-product="${p.id}" aria-label="Edit produk"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn" data-delete-product="${p.id}" aria-label="Hapus produk"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
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

    const updatedProducts = STATE.products.map(p => (p.id === id ? { ...p, ...changes } : p));
    STATE.setProducts(updatedProducts);

    Utils.showToast('Produk berhasil diperbarui', 'success');
  },

  /**
   * Menghapus produk.
   * @param {string} id
   */
  async remove(id) {
    const product = STATE.products.find(p => p.id === id);
    if (!product) return;

    await API.products.delete(id);

    STATE.setProducts(STATE.products.filter(p => p.id !== id));
    this.renderCategoryPills();
    Utils.showToast(`Produk "${product.name}" dihapus`, 'success');
  },

  /** Mencari satu produk berdasarkan barcode (dipakai fitur scanner) */
  findByBarcode(barcode) {
    return STATE.products.find(p => p.barcode === barcode);
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
