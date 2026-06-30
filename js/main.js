/**
 * ================================================================
 * WARUNGKITA PRO MAX - MAIN APPLICATION
 * ================================================================
 * Entry point aplikasi. Inisialisasi semua modul dan state.
 * ================================================================
 */

import { state, loadState, subscribe, setOnlineStatus } from './state.js';
import { showToast, formatCurrency, formatDate, generateId, generateBarcode } from './utils.js';
import { api } from './api.js';
import { APP_CONFIG } from './config.js';

// Import modules
import * as Products from './modules/products.js';
import * as Cart from './modules/cart.js';
import * as Payment from './modules/payment.js';
import * as Stock from './modules/stock.js';
import * as AI from './modules/ai.js';

// Import events
import {
    setupNavigation,
    setupKeyboardShortcuts,
    setupGlobalSearch,
    setupModalEvents,
    setupProductEvents,
    setupCartEvents,
    setupPaymentEvents,
    setupStockEvents,
    setupAIEvents,
    setupShiftEvents,
    setupThemeEvents,
    setupSettingsEvents,
    navigateToSection,
    refreshDashboard
} from './events.js';

// ================================================================
// APP INITIALIZATION
// ================================================================

/**
 * Initialize application
 */
export async function initApp() {
    console.log(`🚀 ${APP_CONFIG.appName} v${APP_CONFIG.appVersion} starting...`);

    // 1. Load state from storage
    loadState();

    // 2. Setup Supabase API
    setupSupabase();

    // 3. Setup event listeners
    setupEventListeners();

    // 4. Load data
    await loadData();

    // 5. Render initial UI
    renderInitialUI();

    // 6. Setup online/offline detection
    setupOnlineDetection();

    // 7. Handle URL hash
    handleHashChange();

    // 8. Update clock
    updateClock();
    setInterval(updateClock, 10000);

    console.log(`✅ ${APP_CONFIG.appName} ready!`);
}

// ================================================================
// SUPABASE SETUP
// ================================================================

/**
 * Setup Supabase API
 */
function setupSupabase() {
    // Try to get API key from localStorage
    const savedKey = localStorage.getItem('supabase-key');
    if (savedKey) {
        api.setApiKey(savedKey);
        console.log('🔑 Supabase API key loaded from storage');
    } else {
        // Prompt for API key if not set
        const key = prompt('Masukkan Supabase API Key:', '');
        if (key) {
            api.setApiKey(key);
            localStorage.setItem('supabase-key', key);
            console.log('🔑 Supabase API key saved');
        } else {
            console.warn('⚠️ No Supabase API key provided. Using local storage only.');
        }
    }

    // Check connection
    api.checkConnection().then(connected => {
        setOnlineStatus(connected);
        updateConnectionStatus(connected);
    });
}

// ================================================================
// EVENT LISTENERS
// ================================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    setupNavigation();
    setupKeyboardShortcuts();
    setupGlobalSearch();
    setupModalEvents();
    setupProductEvents();
    setupCartEvents();
    setupPaymentEvents();
    setupStockEvents();
    setupAIEvents();
    setupShiftEvents();
    setupThemeEvents();
    setupSettingsEvents();

    // Handle hash change for navigation
    window.addEventListener('hashchange', handleHashChange);

    // State subscription for UI updates
    subscribe((newState, action, data) => {
        handleStateChange(action, data);
    });
}

// ================================================================
// DATA LOADING
// ================================================================

/**
 * Load all data
 */
async function loadData() {
    try {
        // Load products
        await Products.loadProductsData();

        // Load customers if empty
        if (state.customers.length === 0) {
            loadSampleCustomers();
        }

        // Render all sections
        Products.renderProducts();
        Products.renderProductGrid();
        Cart.renderCart();
        Stock.renderLowStockAlerts();
        Stock.renderLowStockList();
        Stock.updateStockStats();
        refreshDashboard();

        console.log(`📦 Loaded ${state.products.length} products`);
        console.log(`📋 Loaded ${state.transactions.length} transactions`);
        console.log(`👥 Loaded ${state.customers.length} customers`);
        console.log(`⏰ Loaded ${state.shifts.length} shifts`);

    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Gagal memuat data', 'error');
    }
}

/**
 * Load sample customers
 */
function loadSampleCustomers() {
    const sampleCustomers = [
        { name: 'Budi Santoso', phone: '081234567890', points: 150 },
        { name: 'Siti Rahayu', phone: '081298765432', points: 75 },
        { name: 'Agus Wijaya', phone: '081355577788', points: 200 },
        { name: 'Dewi Lestari', phone: '081277788899', points: 50 }
    ];

    sampleCustomers.forEach(c => {
        const customer = {
            id: generateId('CUST'),
            ...c,
            created_at: new Date().toISOString()
        };
        state.customers.push(customer);
    });

    localStorage.setItem('warungkita-customers', JSON.stringify(state.customers));
}

// ================================================================
// UI RENDERING
// ================================================================

/**
 * Render initial UI
 */
function renderInitialUI() {
    // Update time
    updateClock();

    // Update shift status
    updateShiftUI();

    // Update connection status
    updateConnectionStatus(navigator.onLine);

    // Show initial section from hash or default
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateToSection(hash);

    // Apply saved theme
    const savedTheme = localStorage.getItem('warungkita-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

/**
 * Update clock
 */
function updateClock() {
    const el = document.getElementById('currentTime');
    if (el) {
        el.textContent = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * Update shift status UI
 */
function updateShiftUI() {
    const container = document.getElementById('shiftStatus');
    if (!container) return;

    const activeShift = state.shifts.find(s => s.status === 'open');

    if (activeShift) {
        container.innerHTML = `
            <span class="status-dot online"></span>
            <span>Shift #${activeShift.id.slice(-6)}</span>
        `;
    } else {
        container.innerHTML = `
            <span class="status-dot offline"></span>
            <span>Offline</span>
        `;
    }
}

/**
 * Update connection status
 */
function updateConnectionStatus(connected) {
    const container = document.getElementById('shiftStatus');
    if (!container) return;

    const dot = container.querySelector('.status-dot');
    const text = container.querySelector('span:last-child');

    if (connected) {
        dot.className = 'status-dot online';
        if (text) text.textContent = state.activeShiftId ? 'Online' : 'Online';
    } else {
        dot.className = 'status-dot offline';
        if (text) text.textContent = 'Offline';
    }

    // Update DB status in settings
    const dbStatus = document.getElementById('dbStatus');
    if (dbStatus) {
        dbStatus.textContent = connected ? '🟢 Online' : '🔴 Offline';
        dbStatus.style.color = connected ? 'var(--color-success)' : 'var(--color-danger)';
    }
}

// ================================================================
// STATE CHANGE HANDLER
// ================================================================

/**
 * Handle state changes
 */
function handleStateChange(action, data) {
    switch (action) {
        case 'products-loaded':
        case 'product-added':
        case 'product-updated':
        case 'product-deleted':
            // Refresh product views
            Products.renderProducts();
            Products.renderProductGrid();
            Stock.renderLowStockAlerts();
            Stock.renderLowStockList();
            Stock.updateStockStats();
            break;

        case 'cart-updated':
            Cart.renderCart();
            break;

        case 'cart-cleared':
            Cart.renderCart();
            break;

        case 'transaction-added':
            refreshDashboard();
            renderTransactions();
            break;

        case 'stock-updated':
            Products.renderProducts();
            Products.renderProductGrid();
            Stock.renderLowStockAlerts();
            Stock.renderLowStockList();
            Stock.updateStockStats();
            break;

        case 'shift-opened':
        case 'shift-closed':
            updateShiftUI();
            renderShifts();
            break;

        case 'online-status-changed':
            updateConnectionStatus(data);
            break;

        case 'theme-changed':
            // Theme already applied via setTheme
            break;

        default:
            // Ignore other actions
            break;
    }
}

// ================================================================
// HASH CHANGE HANDLER
// ================================================================

/**
 * Handle URL hash change
 */
function handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateToSection(hash);
}

// ================================================================
// ONLINE/OFFLINE DETECTION
// ================================================================

/**
 * Setup online/offline detection
 */
function setupOnlineDetection() {
    window.addEventListener('online', () => {
        setOnlineStatus(true);
        showToast('🟢 Kembali online', 'success');
        // Try to sync data
        syncData();
    });

    window.addEventListener('offline', () => {
        setOnlineStatus(false);
        showToast('🔴 Koneksi terputus. Bekerja offline.', 'warning');
    });
}

/**
 * Sync data with server
 */
async function syncData() {
    if (!navigator.onLine) return;

    try {
        const result = await api.syncAll();
        console.log('Sync result:', result);
        showToast('Data tersinkronisasi', 'success');
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// ================================================================
// EXPOSE FUNCTIONS TO WINDOW
// ================================================================

// Expose functions for inline onclick handlers
window.refreshDashboard = refreshDashboard;
window.exportDashboard = exportDashboard;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

/**
 * Export dashboard data
 */
function exportDashboard() {
    try {
        const data = {
            date: new Date().toISOString(),
            stats: {
                todaySales: state.transactions.filter(t => 
                    t.createdAt?.startsWith(new Date().toISOString().split('T')[0])
                ).reduce((sum, t) => sum + t.total_amount, 0),
                totalTransactions: state.transactions.length,
                totalProductsSold: state.transactions.reduce((sum, t) => {
                    if (t.items) {
                        return sum + t.items.reduce((s, item) => s + item.quantity, 0);
                    }
                    return sum;
                }, 0),
                activeCustomers: state.customers.length
            },
            transactions: state.transactions.slice(0, 10)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Dashboard berhasil diexport!', 'success');
    } catch (error) {
        showToast('Gagal export: ' + error.message, 'error');
    }
}

/**
 * Export products
 */
function exportProducts() {
    try {
        const data = state.products.map(p => ({
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            emoji: p.emoji,
            barcode: p.barcode
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Produk berhasil diexport!', 'success');
    } catch (error) {
        showToast('Gagal export: ' + error.message, 'error');
    }
}

// ================================================================
// START APPLICATION
// ================================================================

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ================================================================
// EXPORT
// ================================================================

export default {
    initApp,
    refreshDashboard,
    exportDashboard
};
