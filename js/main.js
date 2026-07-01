/**
 * WARUNGKITA PRO MAX - Main Application
 * Clean version tanpa double-init
 */

const AppMain = {
    async init() {
        console.log('%c🏪 WarungKita PRO MAX - Starting...', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
        
        try {
            // 1. Test Supabase connection
            let isConnected = false;
            try {
                isConnected = await Promise.race([
                    API.healthCheck(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
            } catch (e) {
                isConnected = false;
            }
            
            console.log(`%c${isConnected ? '✅ Supabase connected' : '⚠️ Offline mode'}`, 
                `color: ${isConnected ? '#10b981' : '#f59e0b'};`);

            // 2. Init core modules (yang sudah auto-init dari script tags tidak perlu di-init lagi)
            console.log('%c📦 Core modules loaded from script tags', 'color: #94a3b8;');
            
            // 3. Init features
            console.log('%c🔧 Loading features...', 'color: #94a3b8;');
            this.initFeatures();

            // 4. Setup navigation
            console.log('%c🧭 Setting up navigation...', 'color: #94a3b8;');
            this.setupNavigation();

            // 5. Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // 6. Hide loading screen
            console.log('%c✨ Hiding loading screen...', 'color: #10b981;');
            this.hideLoadingScreen();

            // 7. Welcome message
            setTimeout(() => {
                const name = typeof AuthModule !== 'undefined' && AuthModule.currentUser 
                    ? AuthModule.currentUser.name 
                    : 'User';
                Utils.toast(`Selamat datang, ${name}! 👋`, 'success', 3000);
            }, 500);

            console.log('%c✅✅✅ APP READY! ✅✅✅', 'color: #10b981; font-size: 20px; font-weight: bold;');
            
        } catch (error) {
            console.error('%c❌ FATAL ERROR:', 'color: #ef4444; font-size: 16px;', error);
            this.hideLoadingScreen();
            Utils.toast(`Error: ${error.message}`, 'error', 5000);
        }
    },

    initFeatures() {
        const features = [
            'ShiftModule',
            'BarcodeModule', 
            'OfflineModule',
            'ExportModule',
            'HoldCartModule',
            'NotificationsModule',
            'ReturnsModule',
            'SplitPaymentModule'
        ];

        features.forEach(name => {
            const feature = window[name];
            if (feature && typeof feature.init === 'function') {
                try {
                    feature.init();
                    console.log(`   ✅ ${name} initialized`);
                } catch (e) {
                    console.warn(`   ⚠️ ${name} failed:`, e.message);
                }
            }
        });
    },

    setupNavigation() {
        // Nav items click
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) this.switchView(view);
            });
        });

        // Mobile menu
        const btnMenu = document.getElementById('btnMenuMobile');
        if (btnMenu) {
            btnMenu.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }

        // Sidebar toggle
        const btnToggle = document.getElementById('toggleSidebar');
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }

        // Default view
        this.switchView('dashboard');
        console.log('   ✅ Navigation ready');
    },

    switchView(viewName) {
        // Map view names (Indonesia ↔ English)
        const viewMap = {
            'kasir': 'pos',
            'produk': 'products',
            'transaksi': 'transactions',
            'stok': 'stock',
            'pelanggan': 'customers',
            'laporan': 'reports',
            'pengaturan': 'settings'
        };
        
        const normalizedView = viewMap[viewName] || viewName;
        
        // Update state
        if (typeof AppState !== 'undefined') {
            AppState.setView(normalizedView);
        }

        // Update nav active
        document.querySelectorAll('.nav-item').forEach(item => {
            const itemView = viewMap[item.dataset.view] || item.dataset.view;
            item.classList.toggle('active', itemView === normalizedView);
        });

        // Show/hide views
        document.querySelectorAll('.view').forEach(view => {
            const isActive = view.id === `view-${viewName}` || view.id === `view-${normalizedView}`;
            view.classList.toggle('active', isActive);
            view.style.display = isActive ? 'block' : 'none';
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            pos: 'Kasir (POS)',
            kasir: 'Kasir (POS)',
            products: 'Manajemen Produk',
            produk: 'Manajemen Produk',
            transactions: 'Riwayat Transaksi',
            transaksi: 'Riwayat Transaksi',
            stock: 'Manajemen Stok',
            stok: 'Manajemen Stok',
            customers: 'Pelanggan',
            pelanggan: 'Pelanggan',
            reports: 'Laporan',
            laporan: 'Laporan',
            shift: 'Shift Kasir',
            settings: 'Pengaturan',
            pengaturan: 'Pengaturan'
        };
        
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) {
            titleEl.textContent = titles[viewName] || titles[normalizedView] || 'Dashboard';
        }

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('active');
        }

        // View-specific logic
        this.onViewChange(normalizedView);
    },

    onViewChange(viewName) {
        switch (viewName) {
            case 'dashboard':
                if (typeof AppMain !== 'undefined') AppMain.refreshDashboard();
                break;
            case 'transactions':
                if (typeof AppMain !== 'undefined') AppMain.loadTransactions();
                break;
            case 'customers':
                if (typeof AppMain !== 'undefined') AppMain.loadCustomers();
                break;
            case 'pos':
                if (typeof ProductsModule !== 'undefined') ProductsModule.renderProductsGrid();
                break;
            case 'stock':
                if (typeof StockModule !== 'undefined') StockModule.render();
                break;
        }
    },

    async refreshDashboard() {
        try {
            const el = (id) => document.getElementById(id);
            
            // Get today's transactions
            const todayTx = typeof API !== 'undefined' 
                ? await API.transactions.getToday().catch(() => []) 
                : [];
            
            const totalRev = todayTx.reduce((s, t) => s + (t.total_amount || 0), 0);
            const products = typeof AppState !== 'undefined' ? AppState.products : [];
            const lowStock = products.filter(p => p.stock <= 10).length;

            if (el('statTransactions')) el('statTransactions').textContent = todayTx.length || 0;
            if (el('statRevenue')) el('statRevenue').textContent = Utils?.formatCurrency(totalRev) || 'Rp 0';
            if (el('statProductsSold')) el('statProductsSold').textContent = '0';
            if (el('statLowStock')) el('statLowStock').textContent = lowStock;

            this.renderRecentTransactions(todayTx.slice(0, 5));
        } catch (e) {
            console.warn('Dashboard refresh failed:', e);
        }
    },

    renderRecentTransactions(transactions) {
        const tbody = document.getElementById('recentTransactionsBody');
        if (!tbody) return;

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">
                        <i class="fas fa-receipt" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        Belum ada transaksi hari ini
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(tx => `
            <tr>
                <td><code>${tx.transaction_code || tx.id || '-'}</code></td>
                <td>${tx.customer_name || 'Umum'}</td>
                <td><strong>${Utils?.formatCurrency(tx.total_amount) || 'Rp 0'}</strong></td>
                <td><span class="badge badge-info">${tx.payment_method || '-'}</span></td>
                <td><span class="badge badge-success">${tx.payment_status || '-'}</span></td>
                <td>${Utils?.getRelativeTime(tx.created_at) || '-'}</td>
            </tr>
        `).join('');
    },

    async loadTransactions() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        try {
            const txs = typeof API !== 'undefined' 
                ? await API.transactions.getAll({ limit: 100 }).catch(() => []) 
                : [];
            
            if (!txs || txs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem;">
                            Belum ada transaksi
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = txs.map(tx => `
                <tr>
                    <td><code>${tx.transaction_code || tx.id}</code></td>
                    <td>${Utils?.formatDateTime(tx.created_at) || '-'}</td>
                    <td>${tx.customer_name || 'Umum'}</td>
                    <td>-</td>
                    <td><strong>${Utils?.formatCurrency(tx.total_amount) || 'Rp 0'}</strong></td>
                    <td>${tx.payment_method || '-'}</td>
                    <td><span class="badge badge-success">${tx.payment_status || '-'}</span></td>
                    <td><button class="btn-icon-small"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Load transactions failed:', e);
        }
    },

    async loadCustomers() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        try {
            const customers = typeof API !== 'undefined' 
                ? await API.customers.getAll().catch(() => []) 
                : [];
            
            if (typeof AppState !== 'undefined') AppState.setCustomers(customers);

            tbody.innerHTML = customers.length === 0 
                ? `<tr><td colspan="6" style="text-align:center;padding:2rem;">Belum ada pelanggan</td></tr>`
                : customers.map(c => `
                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.phone || '-'}</td>
                        <td>${c.total_transactions || 0}</td>
                        <td>${Utils?.formatCurrency(c.total_spent || 0) || 'Rp 0'}</td>
                        <td><span class="badge badge-info">${c.points || 0} pts</span></td>
                        <td><button class="btn-icon-small"><i class="fas fa-edit"></i></button></td>
                    </tr>
                `).join('');
        } catch (e) {
            console.error('Load customers failed:', e);
        }
    },

    hideLoadingScreen() {
        const loading = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loading) {
            loading.classList.add('fade-out');
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
        
        if (app) {
            app.style.display = 'block';
            app.style.opacity = '1';
        }
        
        console.log('   ✅ Loading screen hidden');
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            
            // Ctrl+K: Search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('globalSearch')?.focus();
            }
            
            // Ctrl+N: New product
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (typeof ProductsModule !== 'undefined') ProductsModule.openNewModal();
            }
            
            // Ctrl+D: Toggle theme
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                if (typeof AppState !== 'undefined') AppState.toggleTheme();
            }
            
            // F9: Payment
            if (e.key === 'F9') {
                e.preventDefault();
                if (typeof PaymentModule !== 'undefined') PaymentModule.openPaymentModal();
            }
            
            // Escape: Clear/close
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    if (typeof Utils !== 'undefined') Utils.closeAllModals();
                } else if (typeof AppState !== 'undefined' && AppState.currentView === 'pos') {
                    if (typeof CartModule !== 'undefined') CartModule.clearCart();
                }
            }
        });
    }
};

// Bootstrap when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppMain.init());
} else {
    AppMain.init();
}

console.log('%c✅ AppMain loaded', 'color: #10b981;');
