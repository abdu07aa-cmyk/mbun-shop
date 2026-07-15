/* =====================================================
   WARUNGKITA PRO MAX — UTILS.JS
   Fungsi-fungsi utilitas yang dipakai di seluruh aplikasi
   ===================================================== */

const Utils = {
  /* ============== FORMATTING ============== */

  formatCurrency(amount) {
    if (amount === undefined || amount === null) return 'Rp 0';
    const num = Number(amount);
    if (isNaN(num)) return 'Rp 0';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
  },

  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  },

  formatTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatDateTime(date) {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  },

  formatRelativeTime(date) {
    if (!date) return '-';
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    if (diffDay < 7) return `${diffDay} hari yang lalu`;
    return this.formatDate(date);
  },

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

  isEmpty(value) {
    return value === undefined || value === null || String(value).trim() === '';
  },

  qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  },

  /* ============== DEBOUNCE ============== */

  debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /* ============== TOAST ============== */

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

    const timer = setTimeout(() => {
      toast.remove();
    }, duration);

    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      clearTimeout(timer);
      toast.remove();
    });

    if (container.children.length > 4) {
      container.children[0].remove();
    }
  },

  /* ============== SOUND ============== */

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
    } catch (_) {}
  },

  /* ============== PRODUCT ICON HELPER ============== */

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
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
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

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};
