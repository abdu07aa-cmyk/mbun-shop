/**
 * js/charts.js
 * - Inisialisasi Chart.js untuk grafik penjualan (sales trend) dan helper update
 * - Perbaikan: gunakan factory untuk membuat config agar tidak mencoba meng-clone fungsi
 */

let salesChart = null;

/* Buat config baru setiap kali dipanggil (factory) — hindari cloning fungsi */
function getDefaultConfig() {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Penjualan (total)',
          data: [],
          fill: true,
          backgroundColor: (ctx) => {
            // Buat gradient runtime menggunakan ctx dari Chart.js
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
            g.addColorStop(0, 'rgba(59,130,246,0.18)');
            g.addColorStop(1, 'rgba(59,130,246,0.02)');
            return g;
          },
          borderColor: '#3b82f6',
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#3b82f6'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y ?? ctx.parsed;
              return `Rp ${Number(val).toLocaleString('id-ID')}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color:
              (typeof document !== 'undefined' && getComputedStyle
                ? getComputedStyle(document.documentElement).getPropertyValue('--color-muted')
                : '') || '#6b7280'
          }
        },
        y: {
          grid: { color: 'rgba(15,23,42,0.04)' },
          ticks: {
            callback: (val) => `Rp ${Number(val).toLocaleString('id-ID')}`,
            color:
              (typeof document !== 'undefined' && getComputedStyle
                ? getComputedStyle(document.documentElement).getPropertyValue('--color-muted')
                : '') || '#6b7280'
          }
        }
      }
    }
  };
}

/* Inisialisasi Chart pada canvas element */
export function initSalesChart(canvasEl) {
  if (!canvasEl) return null;
  // Hentikan instance lama jika ada
  if (salesChart) {
    try { salesChart.destroy(); } catch (e) { /* ignore */ }
    salesChart = null;
  }

  const ChartLib = window.Chart ?? window.chartjs ?? null;
  if (!ChartLib) {
    console.warn('Chart.js tidak ditemukan. Pastikan Chart.js telah dimuat di index.html');
    return null;
  }

  const cfg = getDefaultConfig(); // gunakan factory, bukan cloning
  salesChart = new ChartLib(canvasEl.getContext('2d'), cfg);
  return salesChart;
}

/* Update data chart — data: { labels: [], totals: [] } */
export function updateSalesChart(data = { labels: [], totals: [] }) {
  if (!salesChart) return;
  salesChart.data.labels = Array.isArray(data.labels) ? data.labels : [];
  if (salesChart.data.datasets && salesChart.data.datasets[0]) {
    salesChart.data.datasets[0].data = Array.isArray(data.totals) ? data.totals : [];
  }
  // gunakan update yang lembut
  try {
    salesChart.update('active');
  } catch (e) {
    // fallback ke update biasa
    salesChart.update();
  }
}

/* Utility: konversi transaksi ke dataset sederhana (group by tanggal) */
export function transactionsToSeries(transactions = [], period = 'day') {
  // group by YYYY-MM-DD
  const map = new Map();
  for (const tx of transactions || []) {
    const d = tx.created_at ? new Date(tx.created_at) : new Date();
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + Number(tx.total_amount || 0));
  }
  const keys = Array.from(map.keys()).sort();
  const totals = keys.map((k) => Math.round(map.get(k)));
  return { labels: keys, totals };
}

export default {
  initSalesChart,
  updateSalesChart,
  transactionsToSeries
};
