switchView(viewName) {
    console.log(`   Switching to view: ${viewName}`);
    
    // MAPPING: Bahasa Indonesia → English
    const viewMap = {
        'dashboard': 'dashboard',
        'kasir': 'pos',
        'pos': 'pos',
        'produk': 'products',
        'products': 'products',
        'transaksi': 'transactions',
        'transactions': 'transactions',
        'stok': 'stock',
        'stock': 'stock',
        'pelanggan': 'customers',
        'customers': 'customers',
        'laporan': 'reports',
        'reports': 'reports',
        'shift': 'shift'
    };
    
    const normalizedView = viewMap[viewName] || viewName;
    
    // Update state
    if (typeof AppState !== 'undefined') {
        AppState.setView(normalizedView);
    }

    // Update nav active (check both original and normalized)
    document.querySelectorAll('.nav-item').forEach(item => {
        const itemView = item.dataset.view;
        const itemNormalized = viewMap[itemView] || itemView;
        item.classList.toggle('active', itemNormalized === normalizedView);
    });

    // Show/hide views
    document.querySelectorAll('.view').forEach(view => {
        const isActive = view.id === `view-${normalizedView}`;
        view.classList.toggle('active', isActive);
        view.style.display = isActive ? 'block' : 'none';
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        pos: 'Kasir (POS)',
        products: 'Manajemen Produk',
        transactions: 'Riwayat Transaksi',
        stock: 'Manajemen Stok',
        customers: 'Pelanggan',
        reports: 'Laporan',
        shift: 'Shift Kasir'
    };
    
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        titleEl.textContent = titles[normalizedView] || 'Dashboard';
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar')?.classList.remove('active');
    }

    // View-specific logic
    this.onViewChange(normalizedView);
},
