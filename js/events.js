/**
 * WARUNGKITA PRO MAX - Global Events
 */

const Events = {
    init() {
        console.log('%c🎯 Events initialized', 'color: #3b82f6;');
        this.setupThemeToggle();
        this.setupModalHandlers();
        this.setupOnlineOffline();
        this.setupCartBadge();
        this.setupNotifications();
        this.setupBarcodeScanner();
    },

    setupThemeToggle() {
        const btn = document.getElementById('btnThemeToggle');
        if (!btn) return;

        this.updateThemeIcon();
        btn.addEventListener('click', () => {
            AppState.toggleTheme();
            this.updateThemeIcon();
            Utils.playSound('click');
        });
        AppState.subscribe('theme:changed', () => this.updateThemeIcon());
    },

    updateThemeIcon() {
        const icon = document.querySelector('#btnThemeToggle i');
        if (!icon) return;
        icon.className = AppState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    },

    setupModalHandlers() {
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    },

    setupOnlineOffline() {
        const update = () => {
            const online = navigator.onLine;
            AppState.setOnlineStatus(online);
            if (!online) Utils.toast('📡 Mode offline aktif', 'warning');
            else {
                Utils.toast('✅ Online kembali', 'success');
                if (typeof OfflineModule !== 'undefined' && OfflineModule.syncQueue) {
                    OfflineModule.syncQueue();
                }
            }
        };
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
    },

    setupCartBadge() {
        const sync = () => {
            const total = AppState.cart.reduce((s, i) => s + i.quantity, 0);
            document.querySelectorAll('.cart-badge, .cart-count').forEach(b => {
                b.textContent = total;
                b.style.display = total > 0 ? 'flex' : 'none';
            });
        };
        sync();
        AppState.subscribe('cart:changed', sync);
    },

    setupNotifications() {
        const btn = document.getElementById('btnNotifications');
        if (!btn) return;

        const update = () => {
            const count = AppState.products.filter(
                p => p.stock <= CONFIG.stock.lowStockThreshold
            ).length;
            const badge = btn.querySelector('.badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        };
        update();
        AppState.subscribe('products:changed', update);

        btn.addEventListener('click', () => {
            const low = AppState.products.filter(p => p.stock <= CONFIG.stock.lowStockThreshold);
            if (low.length === 0) {
                Utils.toast('✅ Tidak ada notifikasi', 'success');
                return;
            }
            const msg = low.slice(0, 10).map(p => 
                `${p.stock <= 0 ? '❌' : '⚠️'} ${p.emoji} ${p.name}: ${p.stock} pcs`
            ).join('\n');
            alert(`🔔 Stok Menipis (${low.length})\n\n${msg}`);
        });
    },

    setupBarcodeScanner() {
        document.getElementById('btnBarcodeScan')?.addEventListener('click', () => {
            if (typeof BarcodeModule !== 'undefined' && BarcodeModule.startScanning) {
                BarcodeModule.startScanning();
            } else {
                Utils.toast('Barcode scanner belum tersedia', 'info');
            }
        });

        let buffer = '', lastTime = 0;
        document.addEventListener('keypress', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            const now = Date.now();
            if (now - lastTime > 100) buffer = '';
            lastTime = now;
            if (e.key === 'Enter' && buffer.length >= 8) {
                this.handleBarcode(buffer);
                buffer = '';
            } else if (e.key.match(/[0-9]/)) buffer += e.key;
        });
    },

    async handleBarcode(barcode) {
        try {
            const product = await API.products.getByBarcode(barcode);
            if (product) {
                CartModule.addToCart(product);
                Utils.toast(`✅ ${product.name} ditambahkan`, 'success');
                Utils.playSound('add');
            } else {
                Utils.toast(`❌ Barcode tidak ditemukan`, 'error');
                Utils.playSound('error');
            }
        } catch (e) {
            console.error(e);
        }
    }
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Events.init());
} else {
    setTimeout(() => Events.init(), 100);
}

console.log('%c✅ Events loaded', 'color: #10b981;');/**
 * ============================================
 * WARUNGKITA PRO MAX - Global Events
 * ============================================
 * Menangani semua event listeners global:
 * - Theme toggle
 * - Modal close
 * - Online/Offline detection
 * - Cart badge sync
 * - Notifications
 */

const Events = {
    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        console.log('%c🎯 Events initialized', 'color: #3b82f6;');
        
        this.setupThemeToggle();
        this.setupModalHandlers();
        this.setupOnlineOffline();
        this.setupCartBadge();
        this.setupNotifications();
        this.setupBarcodeScanner();
    },

    // ========================================
    // THEME TOGGLE
    // ========================================
    setupThemeToggle() {
        const btnTheme = document.getElementById('btnThemeToggle');
        if (!btnTheme) return;

        // Update icon based on current theme
        this.updateThemeIcon();

        btnTheme.addEventListener('click', () => {
            AppState.toggleTheme();
            this.updateThemeIcon();
            Utils.playSound('click');
        });

        // Subscribe to theme changes
        AppState.subscribe('theme:changed', () => this.updateThemeIcon());
    },

    updateThemeIcon() {
        const btnTheme = document.getElementById('btnThemeToggle');
        if (!btnTheme) return;

        const icon = btnTheme.querySelector('i');
        if (!icon) return;

        if (AppState.theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    },

    // ========================================
    // MODAL HANDLERS
    // ========================================
    setupModalHandlers() {
        // Close modal on button click
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.closeAllModals();
            }
        });
    },

    // ========================================
    // ONLINE/OFFLINE DETECTION
    // ========================================
    setupOnlineOffline() {
        const updateStatus = () => {
            const isOnline = navigator.onLine;
            AppState.setOnlineStatus(isOnline);
            
            const indicator = document.getElementById('onlineStatus');
            if (indicator) {
                indicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
                indicator.innerHTML = isOnline 
                    ? '<i class="fas fa-wifi"></i> Online'
                    : '<i class="fas fa-wifi-slash"></i> Offline';
            }

            if (!isOnline) {
                Utils.toast('📡 Anda offline. Data akan di-sync saat online.', 'warning');
            } else {
                Utils.toast('✅ Anda kembali online', 'success');
                // Trigger sync if offline module exists
                if (typeof OfflineModule !== 'undefined' && OfflineModule.syncQueue) {
                    OfflineModule.syncQueue();
                }
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        
        // Initial status
        updateStatus();
    },

    // ========================================
    // CART BADGE SYNC
    // ========================================
    setupCartBadge() {
        const syncCartBadge = () => {
            const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
            
            // Update all cart badges (header, sidebar, etc)
            document.querySelectorAll('.cart-badge, .cart-count').forEach(badge => {
                badge.textContent = totalItems;
                badge.style.display = totalItems > 0 ? 'flex' : 'none';
            });
        };

        // Initial sync
        syncCartBadge();

        // Subscribe to cart changes
        AppState.subscribe('cart:changed', syncCartBadge);
    },

    // ========================================
    // NOTIFICATIONS
    // ========================================
    setupNotifications() {
        const btnNotifications = document.getElementById('btnNotifications');
        if (!btnNotifications) return;

        const updateNotificationBadge = () => {
            const lowStockCount = AppState.products.filter(
                p => p.stock <= CONFIG.stock.lowStockThreshold
            ).length;

            const badge = btnNotifications.querySelector('.badge');
            if (badge) {
                badge.textContent = lowStockCount;
                badge.style.display = lowStockCount > 0 ? 'flex' : 'none';
            }
        };

        // Initial update
        updateNotificationBadge();

        // Subscribe to product changes
        AppState.subscribe('products:changed', updateNotificationBadge);

        // Click handler
        btnNotifications.addEventListener('click', () => {
            this.showNotificationsPanel();
        });
    },

    showNotificationsPanel() {
        const lowStockProducts = AppState.products.filter(
            p => p.stock <= CONFIG.stock.lowStockThreshold
        );

        if (lowStockProducts.length === 0) {
            Utils.toast('✅ Tidak ada notifikasi baru', 'success');
            return;
        }

        const message = lowStockProducts.slice(0, 10).map(p => {
            const status = p.stock <= 0 ? '❌ Habis' : '⚠️ Menipis';
            return `${status} ${p.emoji} ${p.name}: ${p.stock} pcs`;
        }).join('\n');

        alert(`🔔 Notifikasi Stok (${lowStockProducts.length} produk)\n\n${message}`);
    },

    // ========================================
    // BARCODE SCANNER
    // ========================================
    setupBarcodeScanner() {
        const btnScan = document.getElementById('btnBarcodeScan');
        if (btnScan) {
            btnScan.addEventListener('click', () => {
                if (typeof BarcodeModule !== 'undefined' && BarcodeModule.startScanning) {
                    BarcodeModule.startScanning();
                } else {
                    Utils.toast('Fitur barcode scanner belum tersedia', 'info');
                }
            });
        }

        // Listen for barcode input (from scanner hardware)
        let barcodeBuffer = '';
        let lastKeyTime = 0;

        document.addEventListener('keypress', (e) => {
            // Ignore if typing in input
            if (e.target.matches('input, textarea, select')) return;

            const currentTime = Date.now();
            
            // Reset buffer if too slow (not a scanner)
            if (currentTime - lastKeyTime > 100) {
                barcodeBuffer = '';
            }
            
            lastKeyTime = currentTime;

            if (e.key === 'Enter' && barcodeBuffer.length >= 8) {
                // Looks like a barcode
                this.handleBarcodeScan(barcodeBuffer);
                barcodeBuffer = '';
            } else if (e.key.match(/[0-9]/)) {
                barcodeBuffer += e.key;
            }
        });
    },

    async handleBarcodeScan(barcode) {
        try {
            const product = await API.products.getByBarcode(barcode);
            
            if (product) {
                CartModule.addToCart(product);
                Utils.toast(`✅ ${product.name} ditambahkan`, 'success');
                Utils.playSound('add');
            } else {
                Utils.toast(`❌ Produk dengan barcode ${barcode} tidak ditemukan`, 'error');
                Utils.playSound('error');
            }
        } catch (error) {
            console.error('Barcode scan error:', error);
            Utils.toast('Gagal memproses barcode', 'error');
        }
    },

    // ========================================
    // EXPORT BUTTONS
    // ========================================
    setupExportButtons() {
        const btnExport = document.getElementById('btnExportTransactions');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                try {
                    const transactions = await API.transactions.getAll({ limit: 1000 });
                    Utils.exportToCSV(transactions, `transaksi_${Date.now()}.csv`);
                } catch (error) {
                    Utils.toast('Gagal export data', 'error');
                }
            });
        }
    }
};

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Events.init());
} else {
    // DOM already ready, init after a short delay to ensure modules are loaded
    setTimeout(() => Events.init(), 100);
}

console.log('%c✅ Events loaded', 'color: #10b981;');
