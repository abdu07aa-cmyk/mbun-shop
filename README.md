# 🛒 MBUN COLLECTION — Enterprise POS System

Sistem Point of Sale (POS) modern berbasis web untuk warung dan toko kecil-menengah. Dibangun dengan HTML5, CSS3, dan JavaScript Vanilla (ES6+) tanpa framework, menggunakan Supabase sebagai backend cloud dengan dukungan mode offline-first.

---

## 🚀 Cara Memulai

### 1. Buka Langsung di Browser
Cukup buka `index.html` di browser modern (Chrome, Edge, Firefox). Tidak perlu server atau build tool.

### 2. Konfigurasi Database Supabase
1. Buka halaman **Pengaturan** dari sidebar
2. Masukkan **Supabase URL** dan **Anon Key** milik project Anda
3. Klik **Simpan Pengaturan** — aplikasi akan otomatis menguji koneksi

> Jika belum punya project Supabase, buat di [supabase.com](https://supabase.com) (gratis). Buat tabel sesuai skema di bawah, atau gunakan aplikasi dalam mode offline dengan localStorage.

---

## 🗄️ Skema Database (Supabase)

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Produk
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price numeric not null,
  modal_price numeric default 0,
  stock integer default 0,
  emoji text default '📦',
  barcode text,
  created_at timestamptz default now()
);

-- Transaksi
create table transactions (
  id uuid primary key default gen_random_uuid(),
  total_amount numeric not null,
  payment_method text,
  payment_status text default 'paid',
  customer_name text,
  discount numeric default 0,
  shift_id uuid,
  created_at timestamptz default now()
);

-- Item Transaksi
create table transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id),
  product_id uuid references products(id),
  quantity integer not null,
  price numeric not null
);

-- Shift Kasir
create table shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_name text,
  initial_cash numeric default 0,
  final_cash numeric,
  status text default 'open',
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- Pelanggan
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  points integer default 0,
  created_at timestamptz default now()
);
```

---

## ✅ Fitur Lengkap

| Fitur | Status |
|-------|--------|
| Dashboard real-time (omzet, transaksi, stok) | ✅ |
| Kasir POS dengan grid produk | ✅ |
| Keranjang belanja dinamis | ✅ |
| Multi-payment (Tunai, QRIS, Transfer, E-Wallet) | ✅ |
| Split Payment (bayar campur) | ✅ |
| Kode diskon (WARUNG10, HEMAT20, PROMO50) | ✅ |
| Hold Cart (tahan keranjang) | ✅ |
| Barcode scanner (USB/Bluetooth keyboard wedge) | ✅ |
| Manajemen produk (CRUD + kategori) | ✅ |
| Manajemen stok (barang masuk) | ✅ |
| Notifikasi stok menipis | ✅ |
| Shift Kasir (buka/tutup + rekonsiliasi kas) | ✅ |
| Retur / Refund barang | ✅ |
| Manajemen pelanggan | ✅ |
| Riwayat transaksi lengkap | ✅ |
| Ekspor CSV (produk, transaksi, pelanggan) | ✅ |
| Ekspor PDF via print browser | ✅ |
| Laporan Laba/Rugi (HPP) | ✅ |
| Chart tren penjualan & produk terlaris | ✅ |
| AI Assistant (keyword-based) | ✅ |
| Dark / Light mode | ✅ |
| Offline-first + sync queue | ✅ |
| Struk digital + cetak | ✅ |
| Responsive (mobile, tablet, desktop) | ✅ |
| Sound effects (Web Audio API) | ✅ |
| Keyboard shortcuts | ✅ |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Aksi |
|----------|------|
| `Ctrl + K` | Fokus ke pencarian |
| `Ctrl + N` | Tambah produk baru |
| `Ctrl + D` | Toggle dark/light mode |
| `F9` | Proses pembayaran |
| `Escape` | Tutup modal |

---

## 📁 Struktur File

```
warungkita-pro-max/
├── index.html              # Struktur HTML utama
├── css/
│   ├── variables.css       # Design tokens (warna, spasi, font)
│   ├── base.css            # Reset & tipografi dasar
│   ├── components.css      # Tombol, kartu, input, badge, tabel
│   ├── layout.css          # Sidebar, topbar, POS layout
│   ├── modals.css          # Semua modal
│   ├── animations.css      # Keyframes & transisi
│   ├── responsive.css      # Media queries mobile/tablet
│   └── print.css           # Styling untuk cetak struk
├── js/
│   ├── config.js           # Konfigurasi Supabase & konstanta
│   ├── state.js            # State management (pub-sub)
│   ├── utils.js            # Helper: format, toast, sound, dll
│   ├── api.js              # Wrapper Supabase REST API
│   ├── charts.js           # Inisialisasi Chart.js
│   ├── events.js           # Event listeners + ModalManager
│   ├── main.js             # Entry point & inisialisasi app
│   ├── modules/
│   │   ├── products.js     # CRUD & render produk
│   │   ├── cart.js         # Operasi keranjang belanja
│   │   ├── payment.js      # Proses pembayaran & struk
│   │   ├── stock.js        # Manajemen stok barang masuk
│   │   ├── ai.js           # AI Assistant (keyword-based)
│   │   └── auth.js         # Konfigurasi & nama kasir
│   └── features/
│       ├── offline.js      # Offline-first + sync queue
│       ├── export.js       # Ekspor CSV & PDF
│       ├── barcode.js      # Barcode scanner
│       ├── hold-cart.js    # Tahan & resume keranjang
│       ├── notifications.js# Notifikasi stok menipis
│       ├── shift.js        # Manajemen shift kasir
│       ├── split-payment.js# Pembayaran campur
│       └── returns.js      # Retur & refund barang
└── README.md
```

---

## 🔮 Roadmap Pengembangan Lanjutan

- [ ] PWA (Progressive Web App) + Service Worker
- [ ] AI Assistant berbasis LLM (Anthropic API)
- [ ] Multi-user & Role (Supabase Auth)
- [ ] Printer Thermal ESC/POS
- [ ] Kirim struk via WhatsApp/Email
- [ ] Supplier & Purchase Order
- [ ] Loyalty Points otomatis

---

## 🛠️ Teknologi

- **Frontend:** HTML5, CSS3 (Custom Properties, Grid, Flexbox), JavaScript ES6+
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API)
- **Charts:** [Chart.js 4.4.0](https://www.chartjs.org)
- **QR Code:** [QRCode.js 1.0.0](https://davidshimjs.github.io/qrcodejs)
- **Icons:** [Font Awesome 6.4.0](https://fontawesome.com)
- **Font:** [Inter](https://fonts.google.com/specimen/Inter)

---

*Dibuat dengan ❤️ untuk para pejuang warung nusantara.*
