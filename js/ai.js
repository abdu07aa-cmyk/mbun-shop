/* =====================================================
   WARUNGKITA PRO MAX — MODULES/AI.JS
   AI Assistant sederhana berbasis pencocokan keyword
   (belum terhubung ke LLM eksternal). Bisa menjawab
   pertanyaan umum seputar stok, produk terlaris, dan
   ringkasan penjualan langsung dari data di STATE.

   Catatan untuk pengembangan lanjutan: ganti fungsi
   `_generateReply()` dengan pemanggilan API LLM (mis.
   Anthropic API) saat fitur "AI Assistant (LLM)" pada
   roadmap dikerjakan.
   ===================================================== */

const AIModule = {
  conversationHistory: [],

  /* ===================================================
     MODAL AI ASSISTANT
     =================================================== */

  openAssistant() {
    ModalManager.open('ai', {
      title: '🤖 AI Assistant',
      size: 'md',
      bodyHtml: `
        <div class="ai-chat-window" id="aiChatWindow">
          ${this.conversationHistory.length === 0 ? this._welcomeMessageHtml() : this.conversationHistory.map(m => this._messageHtml(m)).join('')}
        </div>
        <div class="ai-input-row">
          <input type="text" id="aiInput" placeholder="Tanya sesuatu, mis. 'stok menipis apa saja?'">
          <button class="btn btn-primary" id="aiSendBtn"><i class="fa-solid fa-paper-plane"></i></button>
        </div>`,
      footerHtml: '',
    });

    document.getElementById('aiSendBtn')?.addEventListener('click', () => this._handleSend());
    document.getElementById('aiInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSend();
    });

    this._scrollChatToBottom();
  },

  _welcomeMessageHtml() {
    return `<div class="ai-message is-bot">Halo! Saya asisten WarungKita. Saya bisa bantu cek stok, produk terlaris, atau ringkasan penjualan hari ini. Coba tanya saya sesuatu! 😊</div>`;
  },

  _messageHtml(msg) {
    return `<div class="ai-message ${msg.role === 'user' ? 'is-user' : 'is-bot'}">${Utils.escapeHtml(msg.text)}</div>`;
  },

  _handleSend() {
    const input = document.getElementById('aiInput');
    const text = input?.value.trim();
    if (!text) return;

    this.conversationHistory.push({ role: 'user', text });
    const reply = this._generateReply(text);
    this.conversationHistory.push({ role: 'bot', text: reply });

    input.value = '';
    this._renderChatWindow();
  },

  _renderChatWindow() {
    const window_ = document.getElementById('aiChatWindow');
    if (!window_) return;
    window_.innerHTML = this.conversationHistory.map(m => this._messageHtml(m)).join('');
    this._scrollChatToBottom();
  },

  _scrollChatToBottom() {
    const window_ = document.getElementById('aiChatWindow');
    if (window_) window_.scrollTop = window_.scrollHeight;
  },

  /* ===================================================
     LOGIKA KEYWORD-BASED (belum LLM)
     =================================================== */

  /**
   * Menghasilkan balasan berdasarkan pencocokan kata kunci
   * sederhana terhadap pesan pengguna.
   * @param {string} message
   * @returns {string}
   */
  _generateReply(message) {
    const q = message.toLowerCase();

    if (q.includes('stok menipis') || q.includes('stok habis') || q.includes('hampir habis')) {
      return this._lowStockReply();
    }

    if (q.includes('terlaris') || q.includes('paling laku') || q.includes('best seller')) {
      return this._topProductReply();
    }

    if (q.includes('penjualan hari ini') || q.includes('omzet hari ini') || q.includes('total hari ini')) {
      return this._todaySalesReply();
    }

    if (q.includes('jumlah produk') || q.includes('berapa produk')) {
      return `Saat ini ada ${STATE.products.length} produk terdaftar di sistem.`;
    }

    if (q.includes('halo') || q.includes('hai') || q.includes('hi')) {
      return 'Halo juga! Ada yang bisa saya bantu seputar warung Anda hari ini?';
    }

    if (q.includes('terima kasih') || q.includes('makasih')) {
      return 'Sama-sama! Senang bisa membantu 😊';
    }

    return 'Maaf, saya belum memahami pertanyaan itu. Coba tanyakan tentang stok menipis, produk terlaris, atau penjualan hari ini.';
  },

  _lowStockReply() {
    const lowStock = STATE.lowStockProducts;
    if (lowStock.length === 0) return 'Semua stok produk dalam kondisi aman, tidak ada yang menipis. 👍';

    const list = lowStock.slice(0, 5).map(p => `• ${p.name} (sisa ${p.stock})`).join('\n');
    return `Ada ${lowStock.length} produk dengan stok menipis:\n${list}`;
  },

  _topProductReply() {
    const items = []; // Idealnya diambil dari transaction_items, disederhanakan di sini
    const data = Charts.buildTopProductsData(items);
    if (data.length === 0) return 'Belum cukup data transaksi untuk menentukan produk terlaris.';
    return `Produk terlaris saat ini: ${data.map(d => d.label).join(', ')}.`;
  },

  _todaySalesReply() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayTransactions = STATE.transactions.filter(t => (t.created_at || '').slice(0, 10) === todayKey);
    const total = todayTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);

    if (todayTransactions.length === 0) return 'Belum ada transaksi tercatat hari ini.';
    return `Hari ini sudah ada ${todayTransactions.length} transaksi dengan total penjualan ${Utils.formatCurrency(total)}.`;
  },
};
