/* =====================================================
   WARUNGKITA PRO MAX — FEATURES/BARCODE.JS
   Fitur pemindai barcode. Karena keterbatasan akses
   kamera di lingkungan tertentu, implementasi ini memakai
   pendekatan "keyboard wedge" — kompatibel dengan scanner
   barcode fisik (USB/Bluetooth) yang berperilaku seperti
   keyboard, DAN menyediakan input manual sebagai fallback.

   Auto-focus: input pemindaian otomatis difokuskan saat
   modal dibuka, dan tetap fokus setelah setiap pemindaian
   supaya kasir bisa scan berturut-turut tanpa klik ulang.
   ===================================================== */

const BarcodeModule = {
  _scanBuffer: '',
  _scanTimeout: null,

  /* ===================================================
     MODAL SCANNER
     =================================================== */

  openScannerModal() {
    if (!CONFIG.FEATURES.BARCODE_SCANNER) return;

    ModalManager.open('barcode', {
      title: 'Pindai Barcode',
      size: 'sm',
      bodyHtml: `
        <div style="text-align:center; padding: var(--space-4) 0;">
          <i class="fa-solid fa-barcode" style="font-size: 48px; color: var(--color-primary); margin-bottom: var(--space-4);"></i>
          <p style="margin-bottom: var(--space-4); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
            Arahkan scanner ke barcode produk, atau ketik manual di bawah ini.
          </p>
          <input type="text" id="barcodeScanInput" placeholder="Hasil pemindaian akan muncul di sini..." autocomplete="off">
        </div>
        <div id="barcodeResult"></div>
      `,
      footerHtml: `<button class="btn btn-secondary btn-block" data-modal-close>Tutup</button>`,
    });

    const input = document.getElementById('barcodeScanInput');
    input?.focus();

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._processScan(input.value.trim());
        input.value = '';
      }
    });

    // Auto-focus kembali jika pengguna mengklik di luar input (tapi masih di dalam modal)
    document.getElementById('modalRoot')?.addEventListener('click', () => {
      const stillOpen = document.getElementById('barcodeScanInput');
      if (stillOpen) stillOpen.focus();
    });
  },

  /**
   * Memproses hasil pemindaian: mencari produk berdasarkan barcode
   * dan langsung menambahkannya ke keranjang jika ditemukan.
   * @param {string} code
   */
  _processScan(code) {
    if (!code) return;

    const product = ProductsModule.findByBarcode(code);
    const resultEl = document.getElementById('barcodeResult');

    if (product) {
      CartModule.addItem(product.id);
      Utils.playSound('success');
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="badge badge-success" style="display:flex; gap:8px; align-items:center; padding: var(--space-3); font-size: var(--font-size-sm);">
            <i class="fa-solid fa-circle-check"></i> ${Utils.escapeHtml(product.name)} ditambahkan ke keranjang
          </div>`;
      }
    } else {
      Utils.playSound('error');
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="badge badge-danger" style="display:flex; gap:8px; align-items:center; padding: var(--space-3); font-size: var(--font-size-sm);">
            <i class="fa-solid fa-circle-xmark"></i> Barcode "${Utils.escapeHtml(code)}" tidak ditemukan
          </div>`;
      }
      Utils.showToast(`Produk dengan barcode "${code}" tidak ditemukan`, 'error');
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
