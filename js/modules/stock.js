/**
 * ================================================================
 * WARUNGKITA PRO MAX - STOCK MODULE
 * ================================================================
 * Manajemen stok: barang masuk, barang keluar, low stock alerts.
 * ================================================================
 */

import { state, updateStock } from '../state.js';
import { showToast, formatCurrency, truncate } from '../utils.js';
import { APP_CONFIG } from '../config.js';

// ================================================================
// RENDER LOW STOCK ALERTS
// ================================================================

/**
 * Render low stock alerts
 */
export function renderLowStockAlerts() {
    const container = document.getElementById('stockAlerts');
    if (!container) return;

    const lowStockProducts = state.products.filter(p =>
        p.stock <= APP_CONFIG.lowStockThreshold && p.stock > 0
    );

    const outOfStockProducts = state.products.filter(p => p.stock === 0);

    if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success" style="display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-4); background: var(--color-success-bg); border-radius: var(--border-radius-md); border: 1px solid var(--color-success-border);">
                <i class="fas fa-check-circle" style="color: var(--color-success); font-size: var(--font-size-xl);"></i>
                <div>
                    <strong>Stok Aman!</strong>
                    <p style="margin: 0; font-size: var(--font-size-sm);">Semua produk memiliki stok yang cukup.</p>
                </div>
            </div>
        `;
        return;
    }

    let html = '';

    if (outOfStockProducts.length > 0) {
        html += `
            <div class="alert alert-danger" style="display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-4); background: var(--color-danger-bg); border-radius: var(--border-radius-md); border: 1px solid var(--color-danger-border); margin-bottom: var(--spacing-3);">
                <i class="fas fa-exclamation-circle" style="color: var(--color-danger); font-size: var(--font-size-xl);"></i>
                <div>
                    <strong>Stok Habis!</strong>
                    <p style="margin: 0; font-size: var(--font-size-sm);">
                        ${outOfStockProducts.map(p => `${p.emoji || '📦'} ${p.name}`).join(', ')}
                    </p>
                </div>
            </div>
        `;
    }

    if (lowStockProducts.length > 0) {
        html += `
            <div class="alert alert-warning" style="display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-4); background: var(--color-warning-bg); border-radius: var(--border-radius-md); border: 1px solid var(--color-warning-border);">
                <i class="fas fa-exclamation-triangle" style="color: var(--color-warning); font-size: var(--font-size-xl);"></i>
                <div>
                    <strong>Stok Menipis!</strong>
                    <p style="margin: 0; font-size: var(--font-size-sm);">
                        ${lowStockProducts.map(p => `${p.emoji || '📦'} ${p.name} (${p.stock})`).join(', ')}
                    </p>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

/**
 * Render low stock list
 */
export function renderLowStockList() {
    const container = document.getElementById('lowStockList');
    if (!container) return;

    const lowStockProducts = state.products.filter(p =>
        p.stock <= APP_CONFIG.lowStockThreshold
    );

    if (lowStockProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted" style="padding: var(--spacing-4);">
                <i class="fas fa-check-circle" style="color: var(--color-success); font-size: var(--font-size-2xl); display: block; margin-bottom: var(--spacing-2);"></i>
                <p>Semua stok aman</p>
            </div>
        `;
        return;
    }

    container.innerHTML = lowStockProducts.map(product => `
        <div class="stock-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-2) 0; border-bottom: 1px solid var(--border-color);">
            <div>
                <span style="font-size: var(--font-size-xl);">${product.emoji || '📦'}</span>
                <span class="font-medium">${truncate(product.name, 20)}</span>
            </div>
            <span class="badge ${product.stock === 0 ? 'badge-danger' : 'badge-warning'}">
                ${product.stock === 0 ? 'Habis' : `${product.stock} tersisa`}
            </span>
        </div>
    `).join('');
}

// ================================================================
// STOCK OPERATIONS
// ================================================================

/**
 * Open stock in modal
 * @param {string} productId - Product ID (optional)
 */
export function openStockInModal(productId = null) {
    const modal = document.getElementById('stockModal');
    const title = document.getElementById('stockModalTitle');
    const form = document.getElementById('stockForm');
    const select = document.getElementById('stockProductSelect');

    form.reset();
    document.getElementById('stockProductId').value = '';
    document.getElementById('stockQuantity').value = '';
    document.getElementById('stockNote').value = '';

    // Populate product select
    const currentOptions = select.innerHTML;
    select.innerHTML = '<option value="">Pilih Produk</option>';

    state.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.emoji || '📦'} ${product.name} (Stok: ${product.stock})`;
        select.appendChild(option);
    });

    if (productId) {
        select.value = productId;
        title.textContent = 'Tambah Stok - Barang Masuk';
    } else {
        title.textContent = 'Tambah Stok Barang Masuk';
    }

    modal.classList.add('active');
}

/**
 * Open stock out modal
 */
export function openStockOutModal() {
    const modal = document.getElementById('stockModal');
    const title = document.getElementById('stockModalTitle');
    const select = document.getElementById('stockProductSelect');

    // Populate product select (only products with stock > 0)
    select.innerHTML = '<option value="">Pilih Produk</option>';
    state.products
        .filter(p => p.stock > 0)
        .forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.emoji || '📦'} ${product.name} (Stok: ${product.stock})`;
            select.appendChild(option);
        });

    title.textContent = 'Kurangi Stok - Barang Keluar';
    document.getElementById('stockForm').reset();
    document.getElementById('stockProductId').value = '';

    modal.classList.add('active');
}

/**
 * Close stock modal
 */
export function closeStockModal() {
    const modal = document.getElementById('stockModal');
    modal.classList.remove('active');
}

/**
 * Handle stock form submission
 */
export function handleStockForm() {
    const productId = document.getElementById('stockProductSelect').value;
    const quantity = parseInt(document.getElementById('stockQuantity').value);
    const note = document.getElementById('stockNote').value.trim();
    const title = document.getElementById('stockModalTitle').textContent;

    if (!productId) {
        showToast('Pilih produk terlebih dahulu!', 'error');
        return;
    }

    if (!quantity || quantity <= 0) {
        showToast('Jumlah harus diisi dengan benar!', 'error');
        return;
    }

    const product = state.products.find(p => p.id === productId);
    if (!product) {
        showToast('Produk tidak ditemukan!', 'error');
        return;
    }

    const isStockIn = title.includes('Barang Masuk');
    const change = isStockIn ? quantity : -quantity;
    const action = isStockIn ? 'ditambahkan' : 'dikurangi';

    // Check if enough stock for stock out
    if (!isStockIn && product.stock < quantity) {
        showToast(`Stok tidak mencukupi! Tersedia: ${product.stock}`, 'error');
        return;
    }

    updateStock(productId, change, note || `${isStockIn ? 'Barang masuk' : 'Barang keluar'}`);

    showToast(`Stok ${product.name} ${action} ${quantity} unit!`, 'success');
    closeStockModal();

    // Refresh UI
    renderLowStockAlerts();
    renderLowStockList();

    // Refresh product lists
    const event = new CustomEvent('stock-updated');
    document.dispatchEvent(event);
}

// ================================================================
// STOCK STATS
// ================================================================

/**
 * Update stock statistics
 */
export function updateStockStats() {
    const products = state.products;

    document.getElementById('stockTotalProducts').textContent = products.length;
    document.getElementById('stockTotalItems').textContent = products.reduce((sum, p) => sum + p.stock, 0);

    // Find category with most products
    const categories = {};
    products.forEach(p => {
        const cat = p.category || 'Lainnya';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    let topCategory = '-';
    let maxCount = 0;
    Object.entries(categories).forEach(([cat, count]) => {
        if (count > maxCount) {
            maxCount = count;
            topCategory = cat;
        }
    });

    document.getElementById('stockTopCategory').textContent = topCategory;
}

// ================================================================
// CHECK STOCK
// ================================================================

/**
 * Check if product has enough stock
 * @param {string} productId - Product ID
 * @param {number} quantity - Required quantity
 * @returns {boolean} True if stock is sufficient
 */
export function hasEnoughStock(productId, quantity) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return false;
    return product.stock >= quantity;
}

/**
 * Get product stock
 * @param {string} productId - Product ID
 * @returns {number} Stock quantity
 */
export function getProductStock(productId) {
    const product = state.products.find(p => p.id === productId);
    return product ? product.stock : 0;
}

// ================================================================
// EXPORT
// ================================================================

export default {
    renderLowStockAlerts,
    renderLowStockList,
    openStockInModal,
    openStockOutModal,
    closeStockModal,
    handleStockForm,
    updateStockStats,
    hasEnoughStock,
    getProductStock
};
