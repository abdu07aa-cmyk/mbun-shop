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
    
    // CEK: apakah ada image_url yang valid?
    const hasImage = product.image_url && 
                     product.image_url.startsWith('http') && 
                     !product.image_url.includes('null');
    
    // TAMPILKAN GAMBAR jika ada, fallback ke emoji
    let imageHtml = '';
    if (hasImage) {
      imageHtml = `
        <div style="width:100%; aspect-ratio: 1/1; position:relative; overflow:hidden; background: var(--color-surface-alt);">
          <img src="${product.image_url}" 
               alt="${Utils.escapeHtml(product.name)}" 
               loading="lazy" 
               onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:32px;\\'>${product.emoji || '📦'}</span>';"
               style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;">
        </div>
      `;
    } else {
      imageHtml = `
        <div style="width:100%; aspect-ratio: 1/1; position:relative; background: var(--color-surface-alt);">
          <span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:32px;">${product.emoji || '📦'}</span>
        </div>
      `;
    }

    return `
      <button class="card product-card" data-product-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}
        style="padding:0; overflow:hidden; text-align: left; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; opacity: ${isOutOfStock ? 0.5 : 1}; margin-bottom: 0; display:flex; flex-direction:column; min-width:0; max-width:100%; width:100%;">
        <div style="position:relative; width:100%;">
          ${imageHtml}
          ${isOutOfStock ? `<div style="position:absolute; inset:0; background:rgba(15,23,42,0.55); display:flex; align-items:center; justify-content:center;"><span class="badge badge-danger">Stok Habis</span></div>` : ''}
        </div>
        <div style="padding: var(--space-2); flex:1; min-width:0;">
          <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-xs); margin-bottom: 2px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height: 2.4em; line-height:1.2;">
            ${Utils.escapeHtml(product.name)}
          </div>
          <div style="color: var(--color-primary); font-weight: var(--font-weight-bold); font-size: var(--font-size-xs);">
            ${Utils.formatCurrency(product.price)}
          </div>
          <div style="font-size: 9px; color: var(--color-text-muted); margin-top: 2px;">
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

    tbody.innerHTML = STATE.products.map(p => {
      // Cek apakah ada gambar
      const hasImage = p.image_url && p.image_url.startsWith('http');
      const iconHtml = hasImage 
        ? `<img src="${p.image_url}" alt="${Utils.escapeHtml(p.name)}" style="width:32px; height:32px; object-fit:cover; border-radius:4px;" onerror="this.style.display='none'; this.parentElement.innerHTML='${p.emoji || '📦'}';">`
        : `${p.emoji || '📦'}`;
      
      return `
        <tr>
          <td>${iconHtml}</td>
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
      `;
    }).join('');
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
   * @param {object} productData - { name, category, price, stock, emoji, barcode, modal_price, imageFile }
   */
  async create(productData) {
    if (Utils.isEmpty(productData.name) || !productData.price) {
      Utils.showToast('Nama dan harga produk wajib diisi', 'error');
      return null;
    }

    try {
      let imageUrl = null;
      
      // ==== PROSES UPLOAD GAMBAR DENGAN KOMPRESI ====
      if (productData.imageFile) {
        Utils.showToast('Mengompres dan mengunggah gambar...', 'info');
        
        // Kompres gambar
        const compressedBlob = await Utils.compressImage(productData.imageFile, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.7,
          maxSizeMB: 0.3 // Target < 300KB
        });
        
        // Upload ke Supabase Storage
        const fileName = `products/${Date.now()}_${productData.imageFile.name.replace(/\.[^.]+$/, '')}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, compressedBlob, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) throw error;
        
        // Dapatkan URL publik
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
        
        console.log(`✅ Upload berhasil: ${Utils.formatFileSize(productData.imageFile.size)} → ${Utils.formatFileSize(compressedBlob.size)}`);
        Utils.showToast('Gambar berhasil diunggah!', 'success');
      }

      const [created] = await API.products.create({
        name: productData.name,
        category: productData.category || 'Umum',
        price: Number(productData.price),
        stock: Number(productData.stock) || 0,
        emoji: productData.emoji || '📦',
        image_url: imageUrl,
        barcode: productData.barcode || '',
        modal_price: Number(productData.modal_price) || 0,
      });

      STATE.setProducts([...STATE.products, created]);
      this.renderCategoryPills();
      this.renderProductGrid();
      this.renderProductsTable();
      Utils.showToast(`Produk "${created.name}" berhasil ditambahkan`, 'success');
      Utils.playSound('success');
      return created;
      
    } catch (error) {
      console.error('Error creating product:', error);
      Utils.showToast('Gagal menambahkan produk: ' + error.message, 'error');
      return null;
    }
  },

  /**
   * Memperbarui produk yang sudah ada.
   * @param {string} id
   * @param {object} changes
   */
  async update(id, changes) {
    await API.products.update(id, changes);

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
