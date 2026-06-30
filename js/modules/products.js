/**
 * ================================================================
 * WARUNGKITA PRO MAX - PRODUCTS MODULE
 * ================================================================
 * Manajemen produk: load, render, search, filter, CRUD operations.
 * ================================================================
 */

import { state, loadProducts, addProduct, updateProduct, deleteProduct, updateStock } from '../state.js';
import { formatCurrency, generateBarcode, debounce, truncate, showToast } from '../utils.js';
import { api } from '../api.js';
import { APP_CONFIG, CATEGORY_EMOJIS } from '../config.js';

// ================================================================
// RENDER PRODUCTS
// ================================================================

/**
 * Render products table
 */
export function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const { products } = state;
    const { search, category, stock } = state.filters.products;

    // Filter products
    let filtered = [...products];

    if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.barcode?.includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }

    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }

    if (stock === 'low') {
        filtered = filtered.filter(p => p.stock <= APP_CONFIG.lowStockThreshold && p.stock > 0);
    } else if (stock === 'out') {
        filtered = filtered.filter(p => p.stock === 0);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted" style="padding: var(--spacing-8);">
                    <i class="fas fa-box-open" style="font-size: 2rem; display: block; margin-bottom: var(--spacing-3);"></i>
                    <p>Tidak ada produk ditemukan</p>
                    <small>Tambahkan produk baru dengan klik "Tambah Produk"</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-center gap-2">
                    <span style="font-size: var(--font-size-xl);">${product.emoji || '📦'}</span>
                    <span class="font-medium">${truncate(product.name, 30)}</span>
                </div>
            </td>
            <td><span class="badge badge-primary">${product.category || 'Lainnya'}</span></td>
            <td class="font-semibold">${formatCurrency(product.price)}</td>
            <td>
                <span class="badge ${product.stock <= 0 ? 'badge-danger' : product.stock <= APP_CONFIG.lowStockThreshold ? 'badge-warning' : 'badge-success'}">
                    ${product.stock}
                </span>
            </td>
            <td><code style="font-size: var(--font-size-xs);">${product.barcode || '-'}</code></td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-outline edit-product" data-id="${product.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline stock-in-btn" data-id="${product.id}" title="Tambah Stok">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Attach event listeners
    attachProductEvents();
}

/**
 * Render product grid for POS
 */
export function renderProductGrid() {
    const grid = document.getElementById('posProductGrid');
    if (!grid) return;

    const { products } = state;
    const search = document.getElementById('posSearch')?.value || '';
    const category = document.getElementById('posCategoryFilter')?.value || 'all';

    let filtered = [...products];

    if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.barcode?.includes(query)
        );
    }

    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-8);">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: var(--spacing-4);"></i>
                <p class="text-muted">Tidak ada produk ditemukan</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(product => `
        <div class="product-card" data-id="${product.id}" data-stock="${product.stock}" style="cursor: pointer;">
            <div class="product-emoji">${product.emoji || '📦'}</div>
            <div class="product-name">${truncate(product.name, 20)}</div>
            <div class="product-price">${formatCurrency(product.price)}</div>
            <div class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock <= APP_CONFIG.lowStockThreshold ? 'low-stock' : ''}">
                ${product.stock <= 0 ? 'Habis' : `${product.stock} tersisa`}
            </div>
            ${product.stock <= 0 ? '<div class="product-out-badge">HABIS</div>' : ''}
        </div>
    `).join('');

    // Attach click events
    grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.id;
            const stock = parseInt(card.dataset.stock);
            if (stock <= 0) {
                showToast('Stok habis!', 'error');
                return;
            }
            // Dispatch event for cart module
            const event = new CustomEvent('product-selected', { detail: { productId } });
            document.dispatchEvent(event);
        });
    });
}

// ================================================================
// PRODUCT CRUD
// ================================================================

/**
 * Load products from API or storage
 */
export async function loadProductsData() {
    try {
        // Try to load from API first
        if (api.isConnected) {
            const products = await api.getProducts();
            if (products && products.length > 0) {
                loadProducts(products);
                renderProducts();
                renderProductGrid();
                return;
            }
        }

        // Fallback to localStorage
        if (state.products.length > 0) {
            renderProducts();
            renderProductGrid();
        } else {
            // Load sample data
            const { SAMPLE_PRODUCTS } = await import('../config.js');
            loadProducts(SAMPLE_PRODUCTS.map(p => ({ ...p, id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6) })));
            renderProducts();
            renderProductGrid();
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showToast('Gagal memuat produk', 'error');
    }
}

/**
 * Handle add/edit product form submission
 */
export function handleProductForm() {
    const form = document.getElementById('productForm');
    const productId = document.getElementById('productId').value;

    const data = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        price: parseInt(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        emoji: document.getElementById('productEmoji').value || CATEGORY_EMOJIS[document.getElementById('productCategory').value] || '📦',
        barcode: document.getElementById('productBarcode').value || generateBarcode()
    };

    // Validate
    if (!data.name) {
        showToast('Nama produk harus diisi!', 'error');
        return;
    }

    if (!data.price || data.price <= 0) {
        showToast('Harga produk harus diisi dengan benar!', 'error');
        return;
    }

    if (!data.stock || data.stock < 0) {
        showToast('Stok harus diisi dengan benar!', 'error');
        return;
    }

    // Add modal price if exists
    const modalPrice = document.getElementById('productModalPrice');
    if (modalPrice && modalPrice.value) {
        data.modal_price = parseInt(modalPrice.value);
    }

    if (productId) {
        // Update existing product
        updateProduct(productId, data);
        showToast('Produk berhasil diupdate!', 'success');
    } else {
        // Add new product
        addProduct(data);
        showToast('Produk berhasil ditambahkan!', 'success');
    }

    // Close modal and refresh
    closeProductModal();
    renderProducts();
    renderProductGrid();
}

// ================================================================
// MODAL CONTROLS
// ================================================================

/**
 * Open product modal for add/edit
 * @param {string} productId - Product ID (optional for edit)
 */
export function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    form.reset();
    document.getElementById('productId').value = '';

    if (productId) {
        // Edit mode
        const product = state.products.find(p => p.id === productId);
        if (!product) {
            showToast('Produk tidak ditemukan!', 'error');
            return;
        }

        title.textContent = 'Edit Produk';
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category || 'Lainnya';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productEmoji').value = product.emoji || '';
        document.getElementById('productBarcode').value = product.barcode || '';
        if (document.getElementById('productModalPrice')) {
            document.getElementById('productModalPrice').value = product.modal_price || '';
        }
        document.getElementById('productId').value = productId;
    } else {
        // Add mode
        title.textContent = 'Tambah Produk';
        document.getElementById('productCategory').value = 'Makanan';
        document.getElementById('productEmoji').value = CATEGORY_EMOJIS['Makanan'];
        document.getElementById('productBarcode').value = generateBarcode();
    }

    modal.classList.add('active');
}

/**
 * Close product modal
 */
export function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
}

// ================================================================
// DELETE PRODUCT
// ================================================================

/**
 * Delete product with confirmation
 * @param {string} productId - Product ID
 */
export function deleteProductWithConfirm(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) {
        showToast('Produk tidak ditemukan!', 'error');
        return;
    }

    if (confirm(`Hapus produk "${product.name}"?`)) {
        deleteProduct(productId);
        showToast('Produk berhasil dihapus!', 'success');
        renderProducts();
        renderProductGrid();
    }
}

// ================================================================
// EVENT HANDLERS
// ================================================================

/**
 * Attach event listeners for product actions
 */
function attachProductEvents() {
    // Edit buttons
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            openProductModal(id);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            deleteProductWithConfirm(id);
        });
    });

    // Stock in buttons
    document.querySelectorAll('.stock-in-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            // Dispatch event for stock module
            const event = new CustomEvent('stock-in-request', { detail: { productId: id } });
            document.dispatchEvent(event);
        });
    });
}

// ================================================================
// SEARCH & FILTER
// ================================================================

/**
 * Setup search and filter for products
 */
export function setupProductsFilters() {
    const searchInput = document.getElementById('productsSearch');
    const categoryFilter = document.getElementById('productsCategoryFilter');
    const stockFilter = document.getElementById('productsStockFilter');

    if (searchInput) {
        const debouncedSearch = debounce(() => {
            state.filters.products.search = searchInput.value;
            renderProducts();
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            state.filters.products.category = categoryFilter.value;
            renderProducts();
        });
    }

    if (stockFilter) {
        stockFilter.addEventListener('change', () => {
            state.filters.products.stock = stockFilter.value;
            renderProducts();
        });
    }
}

/**
 * Setup POS search and filter
 */
export function setupPosFilters() {
    const searchInput = document.getElementById('posSearch');
    const categoryFilter = document.getElementById('posCategoryFilter');

    if (searchInput) {
        const debouncedSearch = debounce(() => {
            renderProductGrid();
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', renderProductGrid);
    }
}

// ================================================================
// EXPORT
// ================================================================

export default {
    renderProducts,
    renderProductGrid,
    loadProductsData,
    handleProductForm,
    openProductModal,
    closeProductModal,
    deleteProductWithConfirm,
    setupProductsFilters,
    setupPosFilters
};
