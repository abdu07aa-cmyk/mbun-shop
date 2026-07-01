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
            if (!online) {
                Utils.toast('📡 Mode offline aktif', 'warning');
            } else {
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

        let buffer = '';
        let lastTime = 0;
        
        document.addEventListener('keypress', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            const now = Date.now();
            if (now - lastTime > 100) buffer = '';
            lastTime = now;
            if (e.key === 'Enter' && buffer.length >= 8) {
                this.handleBarcode(buffer);
                buffer = '';
            } else if (e.key.match(/[0-9]/)) {
                buffer += e.key;
            }
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

console.log('%c✅ Events loaded', 'color: #10b981;');
