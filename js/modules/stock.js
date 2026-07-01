/**
 * ============================================
 * STOCK MODULE
 * ============================================
 * Mengelola stok barang:
 * - Tampilkan stok di tabel
 * - Barang masuk (stock in)
 * - Barang keluar (stock out)
 * - Riwayat pergerakan stok
 * - Alert stok menipis
 */

const StockModule = {
    init() {
        console.log('%c📦 StockModule initialized', 'color: #3b82f6;');
        this.setupEventListeners();
        this.render();
    },

    render() {
        const tbody = document.getElementById('stockTableBody');
        if (!tbody) return;

        if (AppState.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Belum ada data stok</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = AppState.products.map(product => {
            let status, statusClass;
            
            if (product.stock <= 0) {
                status = 'Habis';
                statusClass = 'badge-danger';
            } else if (product.stock <= CONFIG.stock.criticalStockThreshold) {
                status = 'Kritis';
                statusClass = 'badge-danger';
            } else if (product.stock <= CONFIG.stock.lowStockThreshold) {
                status = 'Menipis';
                statusClass = 'badge-warning';
            } else {
                status = 'Aman';
                statusClass = 'badge-success';
            }

            return `
                <tr data-product-id="${product.id}">
                    <td>
                        <div class="product-cell">
                            <span class="product-emoji">${product.emoji || '📦'}</span>
                            <strong>${product.name}</strong>
                        </div>
                    </td>
                    <td><strong>${product.stock}</strong></td>
                    <td>${CONFIG.stock.lowStockThreshold}</td>
                    <td><span class="badge ${statusClass}">${status}</span></td>
                    <td>${product.updated_at ? Utils.getRelativeTime(product.updated_at) : '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon-small btn-stock-in" title="Barang Masuk">
                                <i class="fas fa-plus-circle"></i>
                            </button>
                            <button class="btn-icon-small btn-stock-out" title="Barang Keluar">
                                <i class="fas fa-minus-circle"></i>
                            </button>
                            <button class="btn-icon-small btn-stock-history" title="Riwayat">
                                <i class="fas fa-history"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.attachListeners();
    },

    attachListeners() {
        document.querySelectorAll('.btn-stock-in').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.productId);
                this.openStockDialog(id, 'in');
            });
        });

        document.querySelectorAll('.btn-stock-out').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('tr').dataset.productId);
                this.openStockDialog(id, 'out');
            });
        });

        document.querySelectorAll('.btn-stock-history').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.closest('tr').dataset.productId);
                await this.showHistory(id);
            });
        });
    },

    async openStockDialog(productId, type) {
        const product = AppState.products.find(p => p.id === productId);
        if (!product) return;

        const action = type === 'in' ? 'Barang Masuk' : 'Barang Keluar';
        const quantity = prompt(
            `${action}: ${product.name}\nStok saat ini: ${product.stock}\n\nMasukkan jumlah:`,
            '1'
        );

        if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) return;

        const qty = parseInt(quantity);
        const previousStock = product.stock;
        let newStock;

        if (type === 'in') {
            newStock = previousStock + qty;
        } else {
            if (qty > previousStock) {
                Utils.toast('Stok tidak cukup', 'error');
                return;
            }
            newStock = previousStock - qty;
        }

        try {
            // Update product stock
            await API.products.updateStock(productId, newStock);
            
            // Log to history
            await API.stockHistory.log(
                productId, 
                type, 
                qty, 
                previousStock, 
                newStock,
                `${action} oleh kasir`
            );

            // Update state
            AppState.updateProduct(productId, { stock: newStock });
            
            this.render();
            ProductsModule.renderProductsGrid();
            
            Utils.toast(`${action} ${qty} ${product.name} berhasil`, 'success');
            Utils.playSound('success');
        } catch (error) {
            console.error('Stock update error:', error);
            Utils.toast('Gagal update stok', 'error');
        }
    },

    async showHistory(productId) {
        const product = AppState.products.find(p => p.id === productId);
        if (!product) return;

        try {
            const history = await API.stockHistory.getByProduct(productId);
            
            if (history.length === 0) {
                Utils.toast('Belum ada riwayat pergerakan stok', 'info');
                return;
            }

            const historyText = history.slice(0, 10).map(h => {
                const typeLabel = h.type === 'in' ? '📥 Masuk' : '📤 Keluar';
                return `${Utils.formatDateTime(h.created_at)} - ${typeLabel}: ${h.quantity} (Stok: ${h.previous_stock} → ${h.new_stock})`;
            }).join('\n');

            alert(`Riwayat Stok: ${product.name}\n\n${historyText}`);
        } catch (error) {
            console.error('Failed to load history:', error);
            Utils.toast('Gagal memuat riwayat', 'error');
        }
    },

    setupEventListeners() {
        const btnStockIn = document.getElementById('btnStockIn');
        if (btnStockIn) {
            btnStockIn.addEventListener('click', () => {
                Utils.toast('Pilih produk di tabel untuk menambah stok', 'info');
            });
        }

        AppState.subscribe('products:changed', () => this.render());
    }
};

Object.freeze(StockModule);
console.log('%c✅ StockModule loaded', 'color: #10b981;');
