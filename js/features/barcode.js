/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/BARCODE.JS
   Fitur pemindai barcode dengan 2 cara input:
   1. KAMERA HP — pakai library html5-qrcode (dimuat lewat
      CDN di index.html), mirip scanner kasir supermarket.
   2. KEYBOARD WEDGE — kompatibel dengan scanner fisik
      USB/Bluetooth yang berperilaku seperti keyboard, atau
      diketik manual sebagai fallback kalau kamera tidak
      bisa diakses.

   MODE PEMINDAIAN — dipakai untuk membedakan apa yang
   terjadi setelah barcode berhasil dibaca:
   - 'kasir'       : produk langsung masuk ke keranjang (default)
   - 'stok-masuk'  : buka modal "Catat Barang Masuk" untuk produk itu
   - 'stok-keluar' : buka modal "Catat Barang Keluar" untuk produk itu
   ===================================================== */

const BarcodeModule = {
  _scanBuffer: '',
  _scanTimeout: null,
  _html5Qrcode: null,
  _mode: 'kasir',

  /* ===================================================
     MODAL SCANNER
     =================================================== */

  /**
   * @param {object} options
   * @param {'kasir'|'stok-masuk'|'stok-keluar'} options.mode
   */
  openScannerModal(options = {}) {
    if (!CONFIG.FEATURES.BARCODE_SCANNER) return;
    this._mode = options.mode || 'kasir';

    const titleByMode = {
      'kasir': 'Pindai Barcode Produk',
      'stok-masuk': 'Pindai Barcode — Barang Masuk',
      'stok-keluar': 'Pindai Barcode — Barang Keluar',
    };

    ModalManager.open('barcode', {
      title: titleByMode[this._mode] || 'Pindai Barcode',
      size: 'sm',
      bodyHtml: `
        <div style="margin-bottom: var(--space-4);">
          <div id="barcodeReader" style="width:100%; min-height: 220px; border-radius: var(--radius-md); overflow:hidden; background:#0f172a; display:flex; align-items:center; justify-content:center;"></div>
          <button class="btn btn-secondary btn-block" id="startCameraBtn" style="margin-top: var(--space-3);">
            <i class="fa-solid fa-camera"></i> Aktifkan Kamera
          </button>
        </div>
        <div style="text-align:center; padding: var(--space-2) 0;">
          <p style="margin-bottom: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
            Atau pakai scanner fisik / ketik manual:
          </p>
          <input type="text" id="barcodeScanInput" placeholder="Hasil pemindaian akan muncul di sini..." autocomplete="off">
        </div>
        <div id="barcodeResult"></div>
      `,
      footerHtml: `<button class="btn btn-secondary btn-block" data-modal-close>Tutup</button>`,
    });

    // Matikan kamera setiap kali modal ditutup (tombol close, overlay, atau ESC)
    document.querySelectorAll('#modalRoot [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => this._stopCamera());
    });
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') this._stopCamera();
    });

    document.getElementById('startCameraBtn')?.addEventListener('click', () => this._startCamera());

    const input = document.getElementById('barcodeScanInput');
    input?.focus();

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._processScan(input.value.trim());
        input.value = '';
      }
    });

    // Auto-focus kembali ke input manual jika pengguna mengklik di dalam modal
    // (tapi bukan tombol kamera, supaya tidak mengganggu proses buka kamera)
    document.getElementById('modalRoot')?.addEventListener('click', (e) => {
      if (e.target.closest('#startCameraBtn')) return;
      const stillOpen = document.getElementById('barcodeScanInput');
      if (stillOpen) stillOpen.focus();
    });
  },

  /* ===================================================
     SCAN VIA KAMERA (html5-qrcode)
     =================================================== */

  _startCamera() {
    if (typeof Html5Qrcode === 'undefined') {
      Utils.showToast('Fitur kamera gagal dimuat. Cek koneksi internet lalu coba lagi.', 'error');
      return;
    }

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

    // Mode stok: tutup scanner, langsung buka modal stok yang sesuai
    // dengan produk yang berhasil dipindai.
    if (this._mode === 'stok-masuk') {
      this._stopCamera();
      ModalManager.close();
      StockModule.openStockInModal(product.id);
      return;
    }
    if (this._mode === 'stok-keluar') {
      this._stopCamera();
      ModalManager.close();
      StockModule.openStockOutModal(product.id);
      return;
    }

    // Mode default (kasir): langsung tambah ke keranjang, scanner tetap
    // terbuka supaya kasir bisa lanjut scan produk berikutnya.
    CartModule.addItem(product.id);
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="badge badge-success" style="display:flex; gap:8px; align-items:center; padding: var(--space-3); font-size: var(--font-size-sm);">
          <i class="fa-solid fa-circle-check"></i> ${Utils.escapeHtml(product.name)} ditambahkan ke keranjang
        </div>`;
    }
  },

  /* ===================================================
     GLOBAL LISTENER (mode keyboard wedge tanpa modal)
     Memungkinkan kasir memindai barcode langsung dari
     halaman Kasir tanpa perlu membuka modal, selama tidak
     sedang mengetik di field input lain.
     =================================================== */

  initGlobalListener() {
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement?.tagName;
      const isTypingInField = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
      const isOnKasirView = STATE.currentView === 'kasir';

      if (isTypingInField || !isOnKasirView) return;

      // Scanner barcode biasanya mengetik sangat cepat lalu diakhiri Enter
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
        // Reset buffer jika jeda antar-ketikan terlalu lama (berarti bukan scanner)
        this._scanTimeout = setTimeout(() => { this._scanBuffer = ''; }, 100);
      }
    });
  },

  init() {
    this.initGlobalListener();
  },
};
