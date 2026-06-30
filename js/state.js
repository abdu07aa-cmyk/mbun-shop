const AppState = {
    products: [],
    cart: { items: [], customer: null, discount: null, subtotal: 0, discountAmount: 0, total: 0 },
    transactions: [],
    customers: [],
    currentShift: { id: null, cashierName: '', initialCash: 0, status: 'closed', totalSales: 0, totalTransactions: 0 },
    currentView: 'dashboard',
    currentTheme: 'light',
    loading: false,
    notifications: [],
    lowStockProducts: [],
    heldCarts: [],
    isOnline: navigator.onLine,
};

function saveState(key, data) {
    try {
        const storageKey = CONFIG.storageKeys[key];
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) { console.error('Error saving state:', error); }
}

function loadState(key) {
    try {
        const storageKey = CONFIG.storageKeys[key];
        if (storageKey) {
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : null;
        }
        return null;
    } catch (error) { console.error('Error loading state:', error); return null; }
}

function initializeState() {
    console.log('Initializing state...');
    const savedProducts = loadState('products');
    if (savedProducts) AppState.products = savedProducts;
    
    const savedCart = loadState('cart');
    if (savedCart) AppState.cart = savedCart;
    
    const savedTransactions = loadState('transactions');
    if (savedTransactions) AppState.transactions = savedTransactions;
    
    const savedShift = loadState('currentShift');
    if (savedShift) AppState.currentShift = savedShift;
    
    const savedTheme = loadState('theme');
    if (savedTheme) {
        AppState.currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}

function updateCart() {
    AppState.cart.subtotal = AppState.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (AppState.cart.discount) {
        if (AppState.cart.discount.type === 'percentage') {
            AppState.cart.discountAmount = (AppState.cart.subtotal * AppState.cart.discount.value) / 100;
        } else {
            AppState.cart.discountAmount = AppState.cart.discount.value;
        }
    } else {
        AppState.cart.discountAmount = 0;
    }
    
    AppState.cart.total = AppState.cart.subtotal - AppState.cart.discountAmount;
    saveState('cart', AppState.cart);
    updateCartUI();
}

function updateCartUI() {
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const totalEl = document.getElementById('cartTotal');
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(AppState.cart.subtotal);
    if (discountEl) discountEl.textContent = `- ${formatCurrency(AppState.cart.discountAmount)}`;
    if (totalEl) totalEl.textContent = formatCurrency(AppState.cart.total);
    
    const paymentBtn = document.getElementById('processPaymentBtn');
    if (paymentBtn) paymentBtn.disabled = AppState.cart.items.length === 0;
}

function clearCart() {
    AppState.cart = { items: [], customer: null, discount: null, subtotal: 0, discountAmount: 0, total: 0 };
    saveState('cart', AppState.cart);
    updateCartUI();
    renderCart();
}

function addToCart(product, quantity = 1) {
    const existingItem = AppState.cart.items.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        AppState.cart.items.push({ id: product.id, name: product.name, price: product.price, emoji: product.emoji, quantity });
    }
    playSound('addToCart');
    updateCart();
    renderCart();
}

function removeFromCart(productId) {
    AppState.cart.items = AppState.cart.items.filter(item => item.id !== productId);
    playSound('removeFromCart');
    updateCart();
    renderCart();
}

function applyDiscount(code) {
    const discountConfig = CONFIG.defaults.discountCodes[code.toUpperCase()];
    if (discountConfig) {
        AppState.cart.discount = { code: code.toUpperCase(), type: discountConfig.type, value: discountConfig.value, description: discountConfig.description };
        updateCart();
        showToast(`✅ Diskon ${discountConfig.description} diterapkan!`, 'success');
        return true;
    } else {
        showToast('❌ Kode diskon tidak valid', 'error');
        return false;
    }
}
