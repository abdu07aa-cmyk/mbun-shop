/* =====================================================
   WARUNGKITA PRO MAX — CHARTS.JS
   Inisialisasi dan update semua grafik Chart.js yang
   dipakai di Dashboard dan halaman Laporan. Data yang
   dipakai di sini masih dummy/turunan sederhana dari
   STATE; akan disempurnakan saat data transaksi real
   sudah tersedia dari Supabase.
   ===================================================== */

const Charts = {
  instances: {},

  /** Palet warna konsisten untuk semua chart, diambil dari design tokens */
  _palette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      primary: styles.getPropertyValue('--color-primary').trim() || '#3b82f6',
      success: styles.getPropertyValue('--color-success').trim() || '#22c55e',
      warning: styles.getPropertyValue('--color-warning').trim() || '#f59e0b',
      danger: styles.getPropertyValue('--color-danger').trim() || '#ef4444',
      info: styles.getPropertyValue('--color-info').trim() || '#06b6d4',
      text: styles.getPropertyValue('--color-text-secondary').trim() || '#64748b',
      grid: styles.getPropertyValue('--color-border').trim() || '#e2e8f0',
    };
  },

  /** Opsi dasar yang dipakai semua chart agar tampilannya konsisten */
  _baseOptions() {
    const c = this._palette();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: c.text, font: { family: 'Inter', size: 12 } },
        },
      },
      scales: {
        x: {
          ticks: { color: c.text, font: { family: 'Inter', size: 11 } },
          grid: { color: c.grid, display: false },
        },
        y: {
          ticks: { color: c.text, font: { family: 'Inter', size: 11 } },
          grid: { color: c.grid },
        },
      },
    };
  },

  /**
   * Merender ulang (atau membuat baru) chart tren penjualan 7 hari.
   * @param {Array<{label: string, total: number}>} data
   */
  renderSalesTrend(data) {
    const canvas = document.getElementById('salesTrendChart');
    if (!canvas) return;
    const c = this._palette();

    this._destroy('salesTrend');

    this.instances.salesTrend = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Penjualan',
          data: data.map(d => d.total),
          borderColor: c.primary,
          backgroundColor: this._gradientFill(canvas, c.primary),
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: c.primary,
        }],
      },
      options: {
        ...this._baseOptions(),
        plugins: { ...this._baseOptions().plugins, legend: { display: false } },
      },
    });
  },

  /**
   * Merender ulang chart batang produk terlaris.
   * @param {Array<{label: string, qty: number}>} data
   */
  renderTopProducts(data) {
    const canvas = document.getElementById('topProductsChart');
    if (!canvas) return;
    const c = this._palette();

    this._destroy('topProducts');

    this.instances.topProducts = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Terjual',
          data: data.map(d => d.qty),
          backgroundColor: [c.primary, c.success, c.warning, c.info, c.danger],
          borderRadius: 8,
          maxBarThickness: 36,
        }],
      },
      options: {
        ...this._baseOptions(),
        indexAxis: 'y',
        plugins: { ...this._baseOptions().plugins, legend: { display: false } },
      },
    });
  },

  /**
   * Merender chart laba/rugi (pendapatan vs HPP vs laba bersih).
   * @param {Array<{label: string, revenue: number, cost: number, profit: number}>} data
   */
  renderProfitLoss(data) {
    const canvas = document.getElementById('profitLossChart');
    if (!canvas) return;
    const c = this._palette();

    this._destroy('profitLoss');

    this.instances.profitLoss = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          { label: 'Pendapatan', data: data.map(d => d.revenue), backgroundColor: c.primary, borderRadius: 6 },
          { label: 'HPP (Modal)', data: data.map(d => d.cost), backgroundColor: c.warning, borderRadius: 6 },
          { label: 'Laba Bersih', data: data.map(d => d.profit), backgroundColor: c.success, borderRadius: 6 },
        ],
      },
      options: this._baseOptions(),
    });
  },

  /** Membuat efek gradasi transparan di bawah garis chart line */
  _gradientFill(canvas, colorHex) {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, this._hexToRgba(colorHex, 0.25));
    gradient.addColorStop(1, this._hexToRgba(colorHex, 0));
    return gradient;
  },

  _hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  _destroy(key) {
    if (this.instances[key]) {
      this.instances[key].destroy();
      delete this.instances[key];
    }
  },

  /** Menghancurkan semua instance chart, mis. saat berganti tema agar warna ikut update */
  destroyAll() {
    Object.keys(this.instances).forEach(key => this._destroy(key));
  },

  /* ===================================================
     HELPER: MENURUNKAN DATA CHART DARI STATE.transactions
     =================================================== */

  /** Menghasilkan data tren penjualan 7 hari terakhir dari STATE.transactions */
  buildSalesTrendData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    return days.map(day => {
      const dayKey = day.toISOString().slice(0, 10);
      const total = STATE.transactions
        .filter(t => (t.created_at || '').slice(0, 10) === dayKey)
        .reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);

      return { label: Utils.formatDate(day, { day: 'numeric', month: 'short' }), total };
    });
  },

  /** Menghasilkan data 5 produk terlaris dari STATE.transactions (memerlukan transaction_items) */
  buildTopProductsData(transactionItems = []) {
    const qtyByProduct = {};

    transactionItems.forEach(item => {
      const product = STATE.products.find(p => p.id === item.product_id);
      const name = product ? product.name : 'Produk tidak dikenal';
      qtyByProduct[name] = (qtyByProduct[name] || 0) + (Number(item.quantity) || 0);
    });

    return Object.entries(qtyByProduct)
      .map(([label, qty]) => ({ label, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  },
};
