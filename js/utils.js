/* =====================================================
   WARUNGKITA PRO MAX — UTILS.JS
   Fungsi-fungsi utilitas yang dipakai di seluruh aplikasi:
   format angka, tanggal, mata uang, sanitasi HTML, debounce,
   notifikasi (toast), dsb. Supaya modul-modul lain tidak
   perlu mengulang kode serupa.
   ===================================================== */

const Utils = {
  /* ============== FORMATTING ============== */

  /**
   * Format angka menjadi mata uang Rupiah (Rp 1.000.000)
   */
  formatCurrency(amount) {
    if (amount === undefined || amount === null) return 'Rp 0';
    const num = Number(amount);
    if (isNaN(num)) return 'Rp 0';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
  },

  /**
   * Format tanggal menjadi DD/MM/YYYY
   */
  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  },

  /**
   * Format waktu menjadi HH:MM
   */
  formatTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    });
  },

  /**
   * Format datetime lengkap: DD/MM/YYYY HH:MM
   */
  formatDateTime(date) {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  },

  /**
   * Sanitasi HTML untuk mencegah XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * Mengecek apakah string kosong/null/undefined
   */
  isEmpty(value) {
    return value === undefined || value === null || String(value).trim() === '';
  },

  /**
   * Query selector all dengan safety check
   */
  qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  /**
   * Menghasilkan ID pendek unik (untuk keperluan UI sementara)
   */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  },

  /* ============== DEBOUNCE ============== */

  /**
   * Debounce function untuk mencegah eksekusi terlalu sering
   * (mis. saat mengetik di search)
   */
  debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /* ============== TOAST / NOTIFIKASI ============== */

  /**
   * Menampilkan notifikasi toast di pojok layar
   * @param {string} message - Pesan yang ditampilkan
   * @param {'success'|'error'|'warning'|'info'} type - Jenis toast
   * @param {number} duration - Durasi tampil (ms)
   */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      console.warn('Toast container tidak ditemukan!', message);
      return;
    }

    const iconMap = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${iconMap[type] || iconMap.info}"></i>
      <span>${message}</span>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Auto close
    const timer = setTimeout(() => {
      toast.remove();
    }, duration);

    // Tombol close manual
    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      clearTimeout(timer);
      toast.remove();
    });

    // Maksimal 4 toast agar tidak memenuhi layar
    if (container.children.length > 4) {
      container.children[0].remove();
    }
  },

  /* ============== SOUND ============== */

  /**
   * Memutar suara notifikasi (Web Audio API)
   * @param {'click'|'success'|'error'} type
   */
  playSound(type = 'click') {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const frequencyMap = {
        click: 800,
        success: 523.25,
        error: 300
      };

      oscillator.frequency.value = frequencyMap[type] || 500;
      oscillator.type = 'sine';

      gainNode.gain.value = 0.15;
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (_) {
      // Fallback: jika AudioContext tidak didukung, diam saja
    }
  },

  /* ============== PRODUCT ICON HELPER ============== */

  /**
   * Menghasilkan HTML ikon/emoji/gambar untuk produk
   * @param {object} product - { emoji, image_url, name }
   * @param {number} size - ukuran dalam px
   */
  productIconHtml(product, size = 32) {
    if (!product) return '';
    const hasImage = product.image_url && product.image_url.startsWith('http');
    if (hasImage) {
      return `<img src="${product.image_url}" alt="${this.escapeHtml(product.name)}" style="width:${size}px; height:${size}px; object-fit:cover; border-radius:4px;" onerror="this.style.display='none'; this.parentElement.innerHTML='${product.emoji || '📦'}';">`;
    }
    return `<span style="font-size:${size}px;">${product.emoji || '📦'}</span>`;
  },

  /* =====================================================
     KOMPRESI GAMBAR OTOMATIS
     ===================================================== */

  /**
   * Kompres gambar sebelum upload (otomatis)
   * @param {File} file - File gambar dari input
   * @param {Object} options - { maxWidth, maxHeight, quality, maxSizeMB }
   * @returns {Promise<Blob>} - Gambar terkompresi dalam bentuk Blob
   */
  async compressImage(file, options = {}) {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.7,
      maxSizeMB = 0.5
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          // Hitung dimensi baru dengan mempertahankan rasio aspek
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          // Buat canvas untuk menggambar ulang gambar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Kompres ke format JPEG
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Gagal mengompres gambar.'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => reject(new Error('Gagal memuat gambar untuk dikompres.'));
      };
      
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    });
  },

  /**
   * Format ukuran file agar mudah dibaca
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};
