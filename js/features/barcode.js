/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/BARCODE.JS
   Fitur pemindai barcode dengan 2 cara input:
   1. KAMERA HP — pakai library html5-qrcode (dimuat lewat
      CDN di index.html), mirip scanner kasir supermarket.
   2. KEYBOARD WEDGE — kompatibel dengan scanner fisik
      USB/Bluetooth yang berperilaku seperti keyboard, atau
      diketik manual sebagai fallback kalau kamera tidak
      bisa diakses.

   PENTING — ARSITEKTUR OVERLAY TERPISAH:
   Scanner ini SENGAJA dibuat sebagai lapisan tersendiri
   (#barcodeScannerRoot), BUKAN lewat ModalManager/#modalRoot.
   Alasannya: ModalManager cuma bisa nampilin 1 modal dalam
   satu waktu — kalau scanner dibuka lewat ModalManager juga,
   modal lain yang sedang terbuka (mis. form Tambah Produk)
   akan hilang/rusak begitu scanner dibuka di atasnya. Dengan
   jadi lapisan terpisah, scanner bisa numpuk di atas modal
   apapun yang sedang terbuka tanpa merusaknya.

   MODE PEMINDAIAN:
   - 'kasir'         : produk langsung masuk ke keranjang (default)
   - 'stok-masuk'    : buka modal "Catat Barang Masuk" untuk produk itu
   - 'stok-keluar'   : buka modal "Catat Barang Keluar" untuk produk itu
   - 'input-barcode' : cuma isi field barcode di form produk (dipakai
                       saat menambah produk baru), form di belakangnya
                       TETAP UTUH karena scanner adalah lapisan terpisah

   ANTI SCAN DOBEL: barcode yang sama, kalau terus "terlihat" kamera,
   bisa kebaca berkali-kali per detik. Ada cooldown 2 detik supaya
   kode yang sama tidak diproses berulang selama itu.

   BATAL SCAN TERAKHIR: khusus mode 'kasir', ada tombol untuk
   membatalkan item yang baru saja masuk keranjang lewat scan.
   ===================================================== */

const BarcodeModule = {
  _scanBuffer: '',
  _scanTimeout: null,
  _html5Qrcode: null,
  _mode: 'kasir',
  _onScan: null,
  _isOpen: false,

  // Anti scan dobel
  _lastCode: null,
  _lastScanAt: 0,
  _SCAN_COOLDOWN_MS: 2000,

  // Untuk fitur "Batal Scan Terakhir" (mode kasir)
  _lastScannedProductId: null,

  /* ===================================================
     OVERLAY SCANNER (mandiri, bukan lewat ModalManager)
     =================================================== */

  /**
   * @param {object} options
   * @param {'kasir'|'stok-masuk'|'stok-keluar'|'input-barcode'} options.mode
   * @param {(code:string)=>void} [options.onScan] - dipakai khusus mode 'input-barcode'
   */
  openScannerModal(options = {}) {
    if (!CONFIG.FEATURES.BARCODE_SCANNER) return;

    const root = document.getElementById('barcodeScannerRoot');
    if (!root) {
      console.error('[Barcode] Elemen #barcodeScannerRoot tidak ditemukan di index.html');
      Utils.showToast('Fitur scan belum siap — pastikan index.html sudah versi terbaru', 'error');
      return;
    }

    this._mode = options.mode || 'kasir';
    this._onScan = options.onScan || null;
    this._lastCode = null;
    this._lastScanAt = 0;
    this._lastScannedProductId = null;
    this._isOpen = true;

    const titleByMode = {
      'kasir': 'Pindai Barcode Produk',
      'stok-masuk': 'Pindai Barcode — Barang Masuk',
      'stok-keluar': 'Pindai Barcode — Barang Keluar',
      'input-barcode': 'Pindai Barcode Produk',
    };

    const showUndoBtn = this._mode === 'kasir';

    root.innerHTML = `
      <div class="modal-overlay" id="barcodeOverlay" style="position:fixed; inset:0; z-index:1200; background:rgba(15,23,42,0.55); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; padding: var(--space-5);">
        <div class="modal modal-sm" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>${titleByMode[this._mode] || 'Pindai Barcode'}</h3>
            <button class="modal-close-btn" id="closeBarcodeOverlayBtn" aria-label="Tutup">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: var(--space-4);">
              <div id="barcodeReader" style="width:100%; min-height: 220px; border-radius: var(--radius-md); overflow:hidden; background:#0f172a; display:flex; align-items:center; justify-content:center;"></div>
              <button class="btn btn-secondary btn-block" id="startCameraBtn" style="margin-top: var(--space-3);">
                <i class="fa-solid fa-camera"></i> Aktifkan Kamera
              </button>
            </div>
            <div style="text-align:center; padding: var(--space-2) 0;">
              <p style="margin-bottom: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                Atau pakai scanner fisik / ketik manual, lalu tekan Enter:
              </p>
              <input type="text" id="barcodeScanInput" placeholder="Hasil pemindaian akan muncul di sini..." autocomplete="off">
            </div>
            <div id="barcodeResult"></div>
            ${showUndoBtn ? `
              <button class="btn btn-danger btn-block" id="undoLastScanBtn" style="margin-top: var(--space-3);" disabled>
                <i class="fa-solid fa-rotate-left"></i> Batal Scan Terakhir
              </button>` : ''}
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-block" id="closeBarcodeOverlayBtn2">Tutup</button>
          </div>
        </div>
      </div>`;

    const close = () => this.closeScannerModal();
    document.getElementById('closeBarcodeOverlayBtn')?.addEventListener('click', close);
    document.getElementById('closeBarcodeOverlayBtn2')?.addEventListener('click', close);
    document.getElementById('barcodeOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'barcodeOverlay') close();
    });

    document.getElementById('startCameraBtn')?.addEventListener('click', () => this._startCamera());
    document.getElementById('undoLastScanBtn')?.addEventListener('click', () => this._undoLastScan());

    const input = document.getElementById('barcodeScanInput');
    input?.focus();

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._processScan(input.value.trim());
        input.value = '';
      }
    });

    root.addEventListener('click', (e) => {
      if (e.target.closest('#startCameraBtn') || e.target.closest('#undoLastScanBtn')) return;
      const stillOpen = document.getElementById('barcodeScanInput');
      if (stillOpen) stillOpen.focus();
    });
  },

  /** Menutup overlay scanner dan mematikan kamera (kalau aktif) */
  closeScannerModal() {
    this._stopCamera();
    const root = document.getElementById('barcodeScannerRoot');
    if (root) root.innerHTML = '';
    this._isOpen = false;
  },

  /* ===================================================
     SCAN VIA KAMERA (html5-qrcode)
     =================================================== */

  _startCamera() {
    if (typeof Html5Qrcode === 'undefined') {
      Utils.showToast('Fitur kamera gagal dimuat. Cek koneksi internet lalu coba lagi.', 'error');
      return;
    }

    // "Buka kunci" audio di sini — tombol ini pasti diklik langsung oleh
    // pengguna, jadi ini kesempatan aman untuk resume AudioContext supaya
    // bunyi "beep" saat scan berhasil nanti (dipicu dari callback kamera
    // yang berjalan otomatis, bukan dari klik langsung) tetap terdengar.
    Utils.unlockAudio();

    const btn = document.getElementById('startCameraBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuka kamera...';
    }

    this._html5Qrcode = new Html5Qrcode('barcodeReader');

    this._html5Qrcode.start(
      { facingMode: 'environment' }, // kamera belakang HP
      {
        fps: 10,
        qrbox: { width: 250, height: 150 }, // kotak lebar cocok untuk barcode 1D
      },
      (decodedText) => this._processScan(decodedText),
      () => { /* error per-frame diabaikan; ini normal saat barcode belum ketemu */ }
    ).then(() => {
      if (btn) btn.style.display = 'none';
    }).catch((err) => {
      console.warn('[Barcode] Gagal membuka kamera:', err);
      Utils.showToast('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diizinkan di browser.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-camera"></i> Aktifkan Kamera';
      }
    });
  },

  _stopCamera() {
    if (this._html5Qrcode) {
      this._html5Qrcode.stop()
        .then(() => this._html5Qrcode.clear())
        .catch(() => { /* kamera mungkin sudah berhenti sebelumnya, aman diabaikan */ });
      this._html5Qrcode = null;
    }
  },

  /**
   * Memproses hasil pemindaian (dari kamera ATAU keyboard wedge/manual).
   * Perilaku setelah produk ketemu tergantung this._mode.
   * @param {string} code
   */
  _processScan(code) {
    if (!code) return;

    // ANTI SCAN DOBEL: kalau kode yang sama baru saja diproses dalam
    // jendela waktu cooldown, abaikan — mencegah 1 barcode yang terus
    // "terlihat" kamera bikin produk masuk keranjang berkali-kali.
    const now = Date.now();
    if (code === this._lastCode && (now - this._lastScanAt) < this._SCAN_COOLDOWN_MS) {
      return;
    }
    this._lastCode = code;
    this._lastScanAt = now;

    // Mode input-barcode: cuma isi field, tidak perlu cari produk di
    // database (dipakai saat menambah produk baru). Form di belakangnya
    // TIDAK ikut hilang karena scanner ini lapisan terpisah.
    if (this._mode === 'input-barcode') {
      Utils.playSound('success');
      this._onScan?.(code);
      this.closeScannerModal();
      Utils.showToast(`Barcode "${code}" berhasil dipindai`, 'success');
      return;
    }

    const product = ProductsModule.findByBarcode(code);
    const resultEl = document.getElementById('barcodeResult');

    if (!product) {
      Utils.playSound('error');
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="badge badge-danger" style="display:flex; gap:8px; align-items:center; padding: var(--space-3); font-size: var(--font-size-sm);">
            <i class="fa-solid fa-circle-xmark"></i> Barcode "${Utils.escapeHtml(code)}" tidak ditemukan
          </div>`;
      }
      Utils.showToast(`Produk dengan barcode "${code}" tidak ditemukan`, 'error');
      return;
    }

    Utils.playSound('success');

    // Mode stok: tutup scanner, langsung buka modal stok yang sesuai.
    if (this._mode === 'stok-masuk') {
      this.closeScannerModal();
      StockModule.openStockInModal(product.id);
      return;
    }
    if (this._mode === 'stok-keluar') {
      this.closeScannerModal();
      StockModule.openStockOutModal(product.id);
      return;
    }

    // Mode default (kasir): langsung tambah ke keranjang, scanner tetap
    // terbuka supaya kasir bisa lanjut scan produk berikutnya tanpa
    // harus keluar dari halaman scan.
    CartModule.addItem(product.id);
    this._lastScannedProductId = product.id;

    const undoBtn = document.getElementById('undoLastScanBtn');
    if (undoBtn) undoBtn.disabled = false;

    if (resultEl) {
      resultEl.innerHTML = `
        <div class="badge badge-success" style="display:flex; gap:8px; align-items:center; padding: var(--space-3); font-size: var(--font-size-sm);">
          <i class="fa-solid fa-circle-check"></i> ${Utils.escapeHtml(product.name)} ditambahkan ke keranjang
        </div>`;
    }
  },

  /**
   * Membatalkan 1 unit produk terakhir yang masuk keranjang lewat scan.
   * Dipakai kalau pembeli berubah pikiran tidak jadi ambil barang itu.
   */
  _undoLastScan() {
    if (!this._lastScannedProductId) return;

    const product = STATE.products.find(p => String(p.id) === String(this._lastScannedProductId));
    CartModule.decrementItem(this._lastScannedProductId);
    Utils.playSound('click');
    Utils.showToast(`Dibatalkan: ${product?.name || 'produk'}`, 'warning');

    const undoBtn = document.getElementById('undoLastScanBtn');
    if (undoBtn) undoBtn.disabled = true;

    const resultEl = document.getElementById('barcodeResult');
    if (resultEl) resultEl.innerHTML = '';

    this._lastScannedProductId = null;
    this._lastCode = null;
  },

  /* ===================================================
     GLOBAL LISTENER (mode keyboard wedge tanpa membuka overlay)
     =================================================== */

  initGlobalListener() {
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement?.tagName;
      const isTypingInField = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
      const isOnKasirView = STATE.currentView === 'kasir';

      if (isTypingInField || !isOnKasirView || this._isOpen) return;

      if (e.key === 'Enter') {
        if (this._scanBuffer.length >= 4) {
          this._mode = 'kasir';
          this._processScan(this._scanBuffer);
        }
        this._scanBuffer = '';
        return;
      }

      if (e.key.length === 1) {
        this._scanBuffer += e.key;
        clearTimeout(this._scanTimeout);
        this._scanTimeout = setTimeout(() => { this._scanBuffer = ''; }, 100);
      }
    });
  },

  init() {
    this.initGlobalListener();
  },
};
