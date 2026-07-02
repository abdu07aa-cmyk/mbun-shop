/* =====================================================
   WARUNGKITA PRO MAX — EMOJI-PICKER.JS
   Kumpulan emoji/ikon untuk semua jenis produk warung
   dan sembako, dikelompokkan per kategori.
   Dipakai di form tambah/edit produk (main.js).
   ===================================================== */

const EMOJI_DATA = {
  sembako: [
    { e: '🌾', n: 'Beras' },
    { e: '🫙', n: 'Beras' },
    { e: '🌽', n: 'Jagung' },
    { e: '🍠', n: 'Ubi/Singkong' },
    { e: '🥔', n: 'Kentang' },
    { e: '🧅', n: 'Bawang Merah' },
    { e: '🧄', n: 'Bawang Putih' },
    { e: '🫒', n: 'Minyak Zaitun' },
    { e: '🍶', n: 'Minyak Goreng' },
    { e: '🥛', n: 'Susu' },
    { e: '🥚', n: 'Telur' },
    { e: '🐟', n: 'Ikan' },
    { e: '🍗', n: 'Ayam' },
    { e: '🥩', n: 'Daging' },
    { e: '🐄', n: 'Daging Sapi' },
    { e: '🦐', n: 'Udang/Teri' },
    { e: '🍞', n: 'Roti' },
    { e: '🌿', n: 'Sayuran' },
    { e: '🥬', n: 'Bayam/Kangkung' },
    { e: '🥦', n: 'Brokoli' },
    { e: '🍅', n: 'Tomat' },
    { e: '🥕', n: 'Wortel' },
    { e: '🫑', n: 'Cabai/Paprika' },
    { e: '🌶️', n: 'Cabai Merah' },
    { e: '🍋', n: 'Jeruk Nipis' },
    { e: '🫘', n: 'Kacang' },
    { e: '🌰', n: 'Kacang Tanah' },
    { e: '🧂', n: 'Garam' },
    { e: '🍯', n: 'Gula/Madu' },
    { e: '🟤', n: 'Gula Merah' },
    { e: '🫓', n: 'Tepung' },
    { e: '🍚', n: 'Nasi/Beras Masak' },
    { e: '🥫', n: 'Makanan Kaleng' },
    { e: '🐟', n: 'Ikan Asin' },
    { e: '🦑', n: 'Cumi Asin' },
  ],

  minuman: [
    { e: '💧', n: 'Air Mineral' },
    { e: '🫗', n: 'Air Botol' },
    { e: '🍵', n: 'Teh' },
    { e: '☕', n: 'Kopi' },
    { e: '🧃', n: 'Jus/Minuman Kotak' },
    { e: '🥤', n: 'Minuman Kaleng' },
    { e: '🍺', n: 'Minuman Soda' },
    { e: '🧋', n: 'Susu/Boba' },
    { e: '🍹', n: 'Minuman Segar' },
    { e: '🍊', n: 'Jus Jeruk' },
    { e: '🍇', n: 'Jus Anggur' },
    { e: '🥥', n: 'Air Kelapa' },
    { e: '🫖', n: 'Teh Botol' },
    { e: '🧉', n: 'Minuman Energi' },
    { e: '🍼', n: 'Susu Formula' },
    { e: '🥛', n: 'Susu Cair' },
  ],

  snack: [
    { e: '🍿', n: 'Keripik/Popcorn' },
    { e: '🍪', n: 'Biskuit' },
    { e: '🍫', n: 'Cokelat' },
    { e: '🍭', n: 'Permen' },
    { e: '🍬', n: 'Candy' },
    { e: '🧁', n: 'Kue' },
    { e: '🎂', n: 'Kue Ulang Tahun' },
    { e: '🍩', n: 'Donat' },
    { e: '🥐', n: 'Roti Manis' },
    { e: '🍜', n: 'Mie Instan' },
    { e: '🍝', n: 'Mie Goreng' },
    { e: '🥣', n: 'Sereal' },
    { e: '🫙', n: 'Selai/Kacang' },
    { e: '🍡', n: 'Kue Tradisional' },
    { e: '🧆', n: 'Gorengan' },
    { e: '🌯', n: 'Snack Kemasan' },
    { e: '🥜', n: 'Kacang Goreng' },
    { e: '🍘', n: 'Kerupuk' },
    { e: '🍙', n: 'Onigiri/Lemper' },
  ],

  dapur: [
    { e: '🫙', n: 'Kecap' },
    { e: '🧴', n: 'Saos/Sambal' },
    { e: '🌶️', n: 'Sambal' },
    { e: '🫕', n: 'Bumbu Masak' },
    { e: '🧂', n: 'Garam Dapur' },
    { e: '🍚', n: 'Tepung Beras' },
    { e: '🫚', n: 'Minyak Goreng' },
    { e: '🥄', n: 'Bumbu Instan' },
    { e: '🍳', n: 'Alat Masak' },
    { e: '🔪', n: 'Pisau Dapur' },
    { e: '🥘', n: 'Bumbu Kari' },
    { e: '🫛', n: 'Santan' },
    { e: '🧇', n: 'Telur Dadar' },
    { e: '🍱', n: 'Kotak Makan' },
    { e: '🫙', n: 'Kaldu/Royco' },
    { e: '🧈', n: 'Margarin/Mentega' },
    { e: '🍬', n: 'Gula Pasir' },
    { e: '☕', n: 'Merica' },
  ],

  kebersihan: [
    { e: '🧼', n: 'Sabun Mandi' },
    { e: '🧴', n: 'Sampo/Conditioner' },
    { e: '🪥', n: 'Sikat Gigi' },
    { e: '🦷', n: 'Pasta Gigi' },
    { e: '🧻', n: 'Tisu Toilet' },
    { e: '🪣', n: 'Deterjen' },
    { e: '🧺', n: 'Sabun Cuci' },
    { e: '🫧', n: 'Sabun Cuci Piring' },
    { e: '🪒', n: 'Alat Cukur' },
    { e: '💆', n: 'Perawatan Tubuh' },
    { e: '🧽', n: 'Spons/Sapu' },
    { e: '🪠', n: 'Pembersih Kamar Mandi' },
    { e: '💊', n: 'Pembalut' },
    { e: '🩹', n: 'Plester' },
    { e: '🧹', n: 'Sapu' },
    { e: '🪤', n: 'Pel Lantai' },
    { e: '🧯', n: 'Pengharum Ruangan' },
    { e: '🪳', n: 'Obat Nyamuk' },
  ],

  kesehatan: [
    { e: '💊', n: 'Obat' },
    { e: '🩺', n: 'Alat Kesehatan' },
    { e: '🩹', n: 'Plester Luka' },
    { e: '🌡️', n: 'Termometer' },
    { e: '💉', n: 'Vitamin' },
    { e: '🧪', n: 'Suplemen' },
    { e: '🩻', n: 'Kesehatan Umum' },
    { e: '🫀', n: 'Jantung Sehat' },
    { e: '🤒', n: 'Obat Demam' },
    { e: '😷', n: 'Masker' },
    { e: '🧴', n: 'Hand Sanitizer' },
    { e: '🌿', n: 'Herbal/Jamu' },
    { e: '🍃', n: 'Jamu Tradisional' },
    { e: '🥗', n: 'Suplemen Diet' },
  ],

  rokok: [
    { e: '🚬', n: 'Rokok' },
    { e: '🗜️', n: 'Rokok Kretek' },
    { e: '🔥', n: 'Korek Api' },
    { e: '🕯️', n: 'Korek Lilin' },
    { e: '💨', n: 'Rokok Elektrik' },
  ],

  lainnya: [
    { e: '📦', n: 'Umum' },
    { e: '🛒', n: 'Belanja' },
    { e: '🏪', n: 'Toko' },
    { e: '💳', n: 'Voucher' },
    { e: '📱', n: 'Pulsa/Kuota' },
    { e: '💡', n: 'Listrik/Token' },
    { e: '🔋', n: 'Baterai' },
    { e: '💻', n: 'Elektronik' },
    { e: '👕', n: 'Pakaian' },
    { e: '🎮', n: 'Mainan' },
    { e: '📚', n: 'ATK/Buku' },
    { e: '✏️', n: 'Alat Tulis' },
    { e: '🖊️', n: 'Pulpen' },
    { e: '📎', n: 'Perlengkapan' },
    { e: '🎁', n: 'Hadiah/Parsel' },
    { e: '🐾', n: 'Makanan Hewan' },
    { e: '🌱', n: 'Pupuk/Tanaman' },
    { e: '⛽', n: 'Bensin/Gas' },
    { e: '🛢️', n: 'Gas LPG' },
    { e: '🔦', n: 'Senter/Lampu' },
  ],
};

// Semua emoji digabung untuk filter "all"
EMOJI_DATA.all = Object.values(EMOJI_DATA).flat();

/* =====================================================
   EMOJI PICKER — helper render
   ===================================================== */
const EmojiPicker = {
  /**
   * Merender grid emoji ke dalam #emojiPickerGrid
   * @param {string} category - kunci di EMOJI_DATA
   * @param {string} selected - emoji yang sedang aktif
   */
  render(category, selected = '📦') {
    const grid = document.getElementById('emojiPickerGrid');
    if (!grid) return;

    const items = EMOJI_DATA[category] || EMOJI_DATA.all;

    grid.innerHTML = items.map(item => `
      <button
        type="button"
        title="${Utils.escapeHtml(item.n)}"
        data-pick-emoji="${item.e}"
        style="
          width: 44px; height: 44px; font-size: 24px;
          border-radius: var(--radius-sm);
          border: 2px solid ${item.e === selected ? 'var(--color-primary)' : 'transparent'};
          background: ${item.e === selected ? 'var(--color-primary-50)' : 'transparent'};
          cursor: pointer; transition: all 0.15s;
          display:flex; align-items:center; justify-content:center;
        "
      >${item.e}</button>
    `).join('');

    // Event: pilih emoji
    grid.querySelectorAll('[data-pick-emoji]').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.pickEmoji;

        // Update hidden input
        const hiddenInput = document.getElementById('pfEmoji');
        if (hiddenInput) hiddenInput.value = emoji;

        // Update preview
        const preview = document.getElementById('emojiPreview');
        if (preview) preview.textContent = emoji;

        // Update border tombol
        grid.querySelectorAll('[data-pick-emoji]').forEach(b => {
          b.style.border = '2px solid transparent';
          b.style.background = 'transparent';
        });
        btn.style.border = '2px solid var(--color-primary)';
        btn.style.background = 'var(--color-primary-50)';

        Utils.playSound('click');
      });
    });
  },
};

/* =====================================================
   DATA PRODUK SEMBAKO BAWAAN (SEED DATA)
   Otomatis dimuat jika belum ada produk sama sekali
   ===================================================== */
const SEED_PRODUCTS = [
  // Sembako
  { name: 'Beras Premium 5kg',     category: 'Sembako',         price: 73000, modal_price: 65000, stock: 50, emoji: '🌾', unit: 'kg' },
  { name: 'Beras Medium 5kg',      category: 'Sembako',         price: 62000, modal_price: 54000, stock: 30, emoji: '🌾', unit: 'kg' },
  { name: 'Minyak Goreng 1L',      category: 'Sembako',         price: 18000, modal_price: 15000, stock: 40, emoji: '🫚', unit: 'botol' },
  { name: 'Sunco 2L',      category: 'Sembako',         price: 34000, modal_price: 29000, stock: 25, emoji: '🫚', unit: 'botol' },
  { name: 'Gula Gunung Madu 1kg',        category: 'Sembako',         price: 17500, modal_price: 16500, stock: 100, emoji: '🍬', unit: 'kg' },
  { name: 'Gula Pasir 500gr',      category: 'Sembako',         price: 8000,  modal_price: 7000,  stock: 40, emoji: '🍬', unit: 'bungkus' },
  { name: 'Garam Halus 250gr',     category: 'Sembako',         price: 3000,  modal_price: 2000,  stock: 80, emoji: '🧂', unit: 'bungkus' },
  { name: 'Telur Ayam 1 Butir',    category: 'Sembako',         price: 2500,  modal_price: 2000,  stock: 200,emoji: '🥚', unit: 'butir' },
  { name: 'Telur Ayam 1kg',     category: 'Sembako',         price: 24000,  modal_price: 21000,  stock: 50, emoji: '🥚', unit: 'bungkus' },
  { name: 'Tepung Terigu 1kg',     category: 'Sembako',         price: 12000, modal_price: 10000, stock: 30, emoji: '🫓', unit: 'kg' },

  // Minuman
  { name: 'Air Mineral Aqua 600ml',category: 'Minuman',         price: 4000,  modal_price: 3000,  stock: 100,emoji: '💧', unit: 'botol' },
  { name: 'Air Mineral Aqua 1.5L', category: 'Minuman',         price: 6000,  modal_price: 5000,  stock: 60, emoji: '💧', unit: 'botol' },
  { name: 'Teh Botol Sosro 450ml', category: 'Minuman',         price: 6000,  modal_price: 4500,  stock: 48, emoji: '🍵', unit: 'botol' },
  { name: 'Kopi Sachet (isi 10)',  category: 'Minuman',         price: 20000, modal_price: 17000, stock: 30, emoji: '☕', unit: 'pack' },
  { name: 'Susu Ultra 250ml',      category: 'Minuman',         price: 6500,  modal_price: 5500,  stock: 36, emoji: '🥛', unit: 'kotak' },
  { name: 'Indomilk Sachet',       category: 'Minuman',         price: 3000,  modal_price: 2500,  stock: 50, emoji: '🥛', unit: 'sachet' },
  { name: 'Minuman Energi (Kratingdaeng)', category: 'Minuman', price: 8000,  modal_price: 6500,  stock: 24, emoji: '🧉', unit: 'botol' },
  { name: 'Pocari Sweat 350ml',    category: 'Minuman',         price: 7000,  modal_price: 5500,  stock: 24, emoji: '🥤', unit: 'botol' },

  // Mie & Makanan Instan
  { name: 'Indomie Goreng',        category: 'Snack & Makanan', price: 3500,  modal_price: 2800,  stock: 100,emoji: '🍜', unit: 'bungkus' },
  { name: 'Indomie Kuah',          category: 'Snack & Makanan', price: 3500,  modal_price: 2800,  stock: 100,emoji: '🍜', unit: 'bungkus' },
  { name: 'Mie Sedaap',            category: 'Snack & Makanan', price: 3000,  modal_price: 2400,  stock: 80, emoji: '🍝', unit: 'bungkus' },
  { name: 'Sarimi',                category: 'Snack & Makanan', price: 2500,  modal_price: 2000,  stock: 60, emoji: '🍜', unit: 'bungkus' },

  // Snack
  { name: 'Chitato 68gr',          category: 'Snack & Makanan', price: 10000, modal_price: 8000,  stock: 24, emoji: '🍿', unit: 'bungkus' },
  { name: 'Permen Kopiko',         category: 'Snack & Makanan', price: 1000,  modal_price: 700,   stock: 100,emoji: '🍬', unit: 'bungkus' },
  { name: 'Biskuit Roma',          category: 'Snack & Makanan', price: 5000,  modal_price: 4000,  stock: 30, emoji: '🍪', unit: 'pack' },
  { name: 'Wafer Tango',           category: 'Snack & Makanan', price: 3000,  modal_price: 2400,  stock: 40, emoji: '🍫', unit: 'bungkus' },
  { name: 'Kerupuk Udang',         category: 'Snack & Makanan', price: 5000,  modal_price: 4000,  stock: 20, emoji: '🍘', unit: 'bungkus' },

  // Bumbu Dapur
  { name: 'Kecap Manis ABC 135ml', category: 'Bumbu Dapur',     price: 8000,  modal_price: 6500,  stock: 24, emoji: '🫙', unit: 'botol' },
  { name: 'Saos Sambal ABC 135ml', category: 'Bumbu Dapur',     price: 8000,  modal_price: 6500,  stock: 24, emoji: '🌶️', unit: 'botol' },
  { name: 'Royco Sapi 100gr',      category: 'Bumbu Dapur',     price: 5000,  modal_price: 4000,  stock: 30, emoji: '🥄', unit: 'bungkus' },
  { name: 'Masako Ayam 100gr',     category: 'Bumbu Dapur',     price: 5000,  modal_price: 4000,  stock: 30, emoji: '🥄', unit: 'bungkus' },
  { name: 'Margarin Blueband 200gr',category:'Bumbu Dapur',     price: 10000, modal_price: 8500,  stock: 20, emoji: '🧈', unit: 'bungkus' },
  { name: 'Bumbu Instan Indofood', category: 'Bumbu Dapur',     price: 4000,  modal_price: 3200,  stock: 40, emoji: '🫙', unit: 'sachet' },

  // Kebersihan
  { name: 'Sabun Lifebuoy',        category: 'Kebersihan',      price: 5000,  modal_price: 4000,  stock: 48, emoji: '🧼', unit: 'bungkus' },
  { name: 'Shampo Sachet',         category: 'Kebersihan',      price: 1500,  modal_price: 1200,  stock: 100,emoji: '🧴', unit: 'sachet' },
  { name: 'Tisu 50 lembar',        category: 'Kebersihan',      price: 5000,  modal_price: 4000,  stock: 50, emoji: '🧻', unit: 'bungkus' },
  { name: 'Pasta Gigi Pepsodent',  category: 'Kebersihan',      price: 8000,  modal_price: 6500,  stock: 24, emoji: '🦷', unit: 'buah' },
  { name: 'Sabun Cuci Piring (sachet)', category: 'Kebersihan', price: 1500,  modal_price: 1200,  stock: 80, emoji: '🫧', unit: 'sachet' },
  { name: 'Deterjen Rinso 75gr',   category: 'Kebersihan',      price: 3000,  modal_price: 2400,  stock: 60, emoji: '🪣', unit: 'sachet' },

  // Rokok
  { name: 'Gudang Garam Merah 12', category: 'Rokok',           price: 24000, modal_price: 22000, stock: 20, emoji: '🚬', unit: 'bungkus' },
  { name: 'Dji Sam Soe 12',        category: 'Rokok',           price: 28000, modal_price: 26000, stock: 15, emoji: '🚬', unit: 'bungkus' },
  { name: 'Surya Pro Mild 16',     category: 'Rokok',           price: 26000, modal_price: 24000, stock: 20, emoji: '🚬', unit: 'bungkus' },
  { name: 'Korek Api Gas',         category: 'Rokok',           price: 3000,  modal_price: 2000,  stock: 30, emoji: '🔥', unit: 'buah' },

  // Gas & Lainnya
  { name: 'Gas LPG 3kg (isi ulang)', category: 'Lainnya',       price: 22000, modal_price: 18000, stock: 10, emoji: '🛢️', unit: 'tabung' },
  { name: 'Pulsa 10rb',            category: 'Lainnya',         price: 11000, modal_price: 10000, stock: 999,emoji: '📱', unit: 'pcs' },
  { name: 'Pulsa 25rb',            category: 'Lainnya',         price: 26500, modal_price: 25000, stock: 999,emoji: '📱', unit: 'pcs' },
  { name: 'Token Listrik 20rb',    category: 'Lainnya',         price: 20000, modal_price: 20000, stock: 999,emoji: '💡', unit: 'pcs' },
];

/**
 * Memuat produk bawaan ke localStorage jika belum ada produk sama sekali.
 * Dipanggil dari main.js setelah data awal dimuat.
 */
async function seedProductsIfEmpty() {
  if (STATE.products.length > 0) return; // sudah ada produk, skip

  Utils.showToast('Memuat produk bawaan sembako...', 'info');

  for (const p of SEED_PRODUCTS) {
    try {
      await ProductsModule.create(p);
    } catch (e) {
      // simpan lokal jika API gagal
      Offline.insertLocal(CONFIG.TABLES.PRODUCTS, {
        ...p,
        id: Utils.generateId('PRD'),
        created_at: new Date().toISOString(),
      });
    }
  }

  // Reload dari localStorage
  const local = Offline.getLocal(CONFIG.TABLES.PRODUCTS);
  if (local.length > 0) STATE.setProducts(local);

  Utils.showToast(`${SEED_PRODUCTS.length} produk bawaan berhasil dimuat ✅`, 'success');
}
