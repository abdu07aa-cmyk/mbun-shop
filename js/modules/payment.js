/**
 * js/modules/payment.js
 * - Modul Payment: QRIS, split-payment, receipt UI (modal), print, share (WhatsApp/Email)
 * - Menggunakan QRCode.js (dimuat di index.html), api.js, state.js, utils.js
 *
 * Cara pakai:
 * - import paymentModule dan panggil initPayment() dari main.js
 * - Modul akan mendengarkan event 'warungkita:transaction:created' dan menampilkan struk
 *
 * Catatan:
 * - Modul ini tidak menyimpan kunci apapun. Semua panggilan ke API menggunakan api.create/update.
 * - Untuk QRIS, payload QR disediakan sebagai teks singkat (sesuaikan bila butuh format QRIS resmi).
 */

import api from '../api.js';
import state from '../state.js';
import utils from '../utils.js';
import { TABLES } from '../config.js';

/* Utility lokal */
const modalRootId = 'modal-root';

/* Inisialisasi modul payment: bind event listener */
export function initPayment() {
  // Tampilkan receipt ketika transaksi baru dibuat
  window.addEventListener('warungkita:transaction:created', (e) => {
    const tx = e.detail?.tx;
    if (!tx) return;
    showReceipt(tx);
  });

  // Jika sudah ada transaksi di state (mis. reload), tidak otomatis show
  // Expose API ke global untuk debugging
  window.WarungKitaPayment = {
    showReceipt,
    processSplitPayment,
    createQRCode,
    sendReceiptViaWhatsApp,
    sendReceiptViaEmail
  };
}

/* Render modal receipt di #modal-root */
export function showReceipt(txRaw) {
  const tx = normalizeTx(txRaw);
  const root = document.getElementById(modalRootId);
  if (!root) {
    console.warn('Modal root tidak ditemukan:', modalRootId);
    return;
  }

  // Buat markup modal
  const html = `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal receipt-modal" role="document" aria-labelledby="receipt-title">
        <header class="modal-header">
          <h3 id="receipt-title">Struk Transaksi</h3>
          <button class="btn-icon btn-close" aria-label="Tutup">&times;</button>
        </header>
        <div class="modal-body">
          <div class="receipt">
            <div class="receipt-header">
              <h4>WarungKita PRO MAX</h4>
              <div class="receipt-meta">
                <div>No. Transaksi: <strong>${escapeHtml(String(tx.id ?? '—'))}</strong></div>
                <div>Tanggal: ${escapeHtml(new Date(tx.created_at).toLocaleString('id-ID'))}</div>
              </div>
            </div>

            <div class="receipt-items">
              ${renderItemsHtml(tx.transaction_items || [])}
            </div>

            <div class="receipt-summary">
              <div class="row"><span>Subtotal</span><strong>${utils.formatCurrency(tx.subtotal || calcSubtotal(tx.transaction_items || []))}</strong></div>
              <div class="row"><span>Diskon</span><strong>-${utils.formatCurrency(tx.discount || 0)}</strong></div>
              <div class="row total"><span>Total</span><strong>${utils.formatCurrency(tx.total_amount || calcSubtotal(tx.transaction_items || []) - (tx.discount || 0))}</strong></div>
              <div class="row"><span>Metode</span><strong id="receipt-method">${escapeHtml(tx.payment_method || '–')}</strong></div>
              <div class="row"><span>Status</span><strong id="receipt-status">${escapeHtml(tx.payment_status || 'pending')}</strong></div>
            </div>

            <div class="receipt-actions">
              <div class="left">
                <button id="btn-print-receipt" class="btn-ghost">Cetak</button>
                <button id="btn-download-html" class="btn-ghost">Unduh HTML</button>
              </div>
              <div class="right">
                <button id="btn-whatsapp" class="btn-primary">Kirim via WhatsApp</button>
                <button id="btn-email" class="btn-ghost">Kirim via Email</button>
              </div>
            </div>

            <div id="qris-area" class="receipt-qris" style="margin-top:12px; display: ${tx.payment_method === 'qris' ? 'block' : 'none'};">
              <div class="qris-instruction">Scan QR untuk membayar:</div>
              <div id="qrcode-container" class="qrcode-container" style="margin-top:8px;"></div>
            </div>

            <div id="split-area" style="margin-top:12px; display: none;">
              <!-- area untuk split payment jika dibutuhkan -->
            </div>

          </div>
        </div>
      </div>
    </div>
  `;

  // Bersihkan modal root dan pasang modal baru
  root.innerHTML = html;

  // Hook tombol close
  const closeBtn = root.querySelector('.btn-close');
  closeBtn?.addEventListener('click', closeModal);

  // Hook print & download
  root.querySelector('#btn-print-receipt')?.addEventListener('click', () => printReceipt(tx));
  root.querySelector('#btn-download-html')?.addEventListener('click', () => downloadReceiptHtml(tx));
  root.querySelector('#btn-whatsapp')?.addEventListener('click', () => sendReceiptViaWhatsApp(tx));
  root.querySelector('#btn-email')?.addEventListener('click', () => sendReceiptViaEmail(tx));

  // Jika metode QRIS, buat QR
  if (tx.payment_method === 'qris') {
    const qCont = root.querySelector('#qrcode-container');
    const qrPayload = generateQrisPayload(tx);
    createQRCode(qCont, qrPayload);
  }

  // Remove modal when backdrop clicked (outside dialog)
  root.querySelector('.modal-backdrop')?.addEventListener('click', (ev) => {
    if (ev.target.classList.contains('modal-backdrop')) closeModal();
  });

  // Prevent scroll on body
  document.body.style.overflow = 'hidden';

  // Show split area if transaction marked as split-payment
  if (tx.payment_method === 'split' && Array.isArray(tx.splits)) {
    populateSplitArea(tx);
  }

  // Emit event that modal shown
  window.dispatchEvent(new CustomEvent('warungkita:receipt:shown', { detail: { tx } }));
}

/* Close modal dan cleanup */
function closeModal() {
  const root = document.getElementById(modalRootId);
  if (!root) return;
  root.innerHTML = '';
  document.body.style.overflow = '';
  window.dispatchEvent(new CustomEvent('warungkita:receipt:closed'));
}

/* Create QR code in given container using QRCode.js */
export function createQRCode(container, text = '') {
  if (!container) return;
  // Clear container
  container.innerHTML = '';
  const QR = window.QRCode || window.QRCodeJS || null;
  if (!QR) {
    // fallback: show plain text
    container.textContent = text;
    return;
  }
  // Create QR with size ~180
  new QR(container, {
    text: String(text || ''),
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QR.CorrectLevel ? QR.CorrectLevel.H : undefined
  });
}

/* Generate simple QRIS payload (placeholder).
   NOTE: Untuk implementasi QRIS resmi, format dan signature diperlukan. */
function generateQrisPayload(tx) {
  const amount = tx.total_amount || calcSubtotal(tx.transaction_items || []) - (tx.discount || 0);
  // Simple payload: store id, tx id, amount, and label
  return `WKG|STORE:WarungKita|TX:${tx.id}|AMT:${Math.round(amount)}|CUR:IDR`;
}

/* Simple HTML for items */
function renderItemsHtml(items = []) {
  if (!items.length) return `<div class="empty">(Tidak ada item)</div>`;
  return items.map(it => {
    const name = escapeHtml(it.name ?? (it.product_id ?? 'Item'));
    const qty = Number(it.quantity || 0);
    const price = utils.formatCurrency(it.price || 0);
    const total = utils.formatCurrency((it.price || 0) * qty);
    return `<div class="ri-row"><div class="ri-left"><span class="ri-name">${name}</span><small class="ri-meta">x${qty}</small></div><div class="ri-right"><span class="ri-lineprice">${total}</span></div></div>`;
  }).join('');
}

/* Print receipt: buka jendela baru terformat dan call print */
export function printReceipt(txRaw) {
  const tx = normalizeTx(txRaw);
  const w = window.open('', '_blank', 'width=400,height=700,scrollbars=yes');
  if (!w) {
    utils.toast('Gagal membuka jendela cetak (popup diblokir?)', { type: 'warning' });
    return;
  }
  const html = `
    <html>
      <head>
        <title>Struk - ${escapeHtml(String(tx.id || 'Receipt'))}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          h2 { margin: 0 0 8px 0; }
          .item { display:flex; justify-content:space-between; margin:6px 0; }
          .summary { margin-top:12px; border-top:1px dashed #ccc; padding-top:8px; }
        </style>
      </head>
      <body>
        <h2>WarungKita PRO MAX</h2>
        <div>No. Transaksi: ${escapeHtml(String(tx.id || ''))}</div>
        <div>Tanggal: ${escapeHtml(new Date(tx.created_at).toLocaleString('id-ID'))}</div>
        <hr/>
        ${(tx.transaction_items || []).map(it => `<div class="item"><div>${escapeHtml(it.name || it.product_id)}</div><div>${escapeHtml(utils.formatCurrency((it.price||0)*it.quantity))}</div></div>`).join('')}
        <div class="summary">
          <div class="item"><strong>Total</strong><strong>${escapeHtml(utils.formatCurrency(tx.total_amount || 0))}</strong></div>
        </div>
      </body>
    </html>
  `;
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Delay sedikit agar konten termuat sebelum print
  setTimeout(() => {
    w.focus();
    w.print();
    // Optionally close after printing
    // w.close();
  }, 400);
}

/* Download receipt as HTML file */
function downloadReceiptHtml(txRaw) {
  const tx = normalizeTx(txRaw);
  const content = `
    <html><head><meta charset="utf-8"/><title>Struk-${tx.id}</title></head><body>
    <h3>WarungKita PRO MAX</h3>
    <div>No. Transaksi: ${escapeHtml(String(tx.id||''))}</div>
    <div>Tanggal: ${escapeHtml(new Date(tx.created_at).toLocaleString('id-ID'))}</div>
    <hr/>
    ${(tx.transaction_items || []).map(it => `<div>${escapeHtml(it.name||it.product_id)} x${it.quantity} - ${escapeHtml(utils.formatCurrency((it.price||0)*it.quantity))}</div>`).join('')}
    <hr/>
    <div>Total: ${escapeHtml(utils.formatCurrency(tx.total_amount||0))}</div>
    </body></html>
  `;
  const filename = `struk-${String(tx.id || Date.now())}.html`;
  utils.downloadFile(filename, content, 'text/html;charset=utf-8;');
}

/* Send receipt via WhatsApp (opens wa.me link) */
export function sendReceiptViaWhatsApp(txRaw, phone = '') {
  const tx = normalizeTx(txRaw);
  // If phone not provided, try to use tx.customer_phone or ask user (here we open prompt)
  const target = phone || tx.customer_phone || prompt('Masukkan nomor WhatsApp penerima (contoh: 6281234567890):', '');
  if (!target) return;
  const msg = buildReceiptText(tx);
  const url = `https://wa.me/${encodeURIComponent(String(target).replace(/\D/g, ''))}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* Send receipt via Email (mailto link) */
export function sendReceiptViaEmail(txRaw, email = '') {
  const tx = normalizeTx(txRaw);
  const target = email || tx.customer_email || prompt('Masukkan email penerima:', '');
  if (!target) return;
  const subject = `Struk Transaksi ${tx.id}`;
  const body = buildReceiptText(tx);
  const mailto = `mailto:${encodeURIComponent(target)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

/* Process split payment:
   splits: [{ method: 'cash'|'qris'|'transfer'|'ewallet', amount: number, meta?: {} }, ...]
   Validasi jumlah sama dengan tx.total_amount. Jika OK, update transaction payment_status -> 'paid' dan payment_method -> 'split'
*/
export async function processSplitPayment(txRaw, splits = []) {
  const tx = normalizeTx(txRaw);
  const total = splits.reduce((s, it) => s + Number(it.amount || 0), 0);
  const expect = Number(tx.total_amount || 0);
  if (Math.round(total) !== Math.round(expect)) {
    throw new Error(`Jumlah split (${total}) tidak sama dengan total transaksi (${expect})`);
  }
  // Simpan splits ke transaksi dan tandai dibayar
  const patch = {
    payment_method: 'split',
    payment_status: 'paid',
    splits: splits,
    paid_at: new Date().toISOString()
  };
  // Update via API (or fallback local)
  const updated = await api.update(TABLES.TRANSACTIONS, tx.id, patch).catch(err => {
    console.warn('Gagal update transaction di server, lakukan update lokal', err);
    // fallback: update state.transactions
    const s = state.getState();
    const txs = (s.transactions || []).map(t => (String(t.id) === String(tx.id) ? { ...t, ...patch } : t));
    state.setState({ transactions: txs });
    return null;
  });
  // Emit event completed
  window.dispatchEvent(new CustomEvent('warungkita:transaction:paid', { detail: { txId: tx.id, splits } }));
  return updated;
}

/* Helpers */

/* Normalize transaction object: ensure fields exist and subtotal computed */
function normalizeTx(tx) {
  if (!tx) return {};
  const t = { ...tx };
  // Ensure items are enriched with name/price if missing (try lookup from state)
  t.transaction_items = (t.transaction_items || []).map(it => {
    // If item already has name/price, keep it
    return { ...it };
  });
  // compute subtotal if needed
  t.subtotal = calcSubtotal(t.transaction_items || []);
  t.total_amount = t.total_amount ?? (t.subtotal - (t.discount || 0));
  return t;
}

function calcSubtotal(items = []) {
  let s = 0;
  for (const it of items) {
    s += Number(it.price || 0) * Number(it.quantity || 0);
  }
  return Math.round(s);
}

function buildReceiptText(tx) {
  const lines = [];
  lines.push('WarungKita PRO MAX');
  lines.push(`No. Transaksi: ${tx.id}`);
  lines.push(`Tanggal: ${new Date(tx.created_at).toLocaleString('id-ID')}`);
  lines.push('');
  for (const it of tx.transaction_items || []) {
    lines.push(`${it.name || it.product_id} x${it.quantity} - ${utils.formatCurrency((it.price||0)*it.quantity)}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${utils.formatCurrency(tx.subtotal || 0)}`);
  lines.push(`Diskon: -${utils.formatCurrency(tx.discount || 0)}`);
  lines.push(`Total: ${utils.formatCurrency(tx.total_amount || 0)}`);
  lines.push(`Metode: ${tx.payment_method || '-'}`);
  lines.push('');
  lines.push('Terima kasih, telah berbelanja!');
  return lines.join('\n');
}

/* Populate split area UI if present (not fully interactive — placeholder) */
function populateSplitArea(tx) {
  const root = document.getElementById(modalRootId);
  if (!root) return;
  const splitArea = root.querySelector('#split-area');
  if (!splitArea) return;
  splitArea.style.display = 'block';
  // Simple rendering of splits if any
  if (Array.isArray(tx.splits) && tx.splits.length) {
    splitArea.innerHTML = `<div class="split-list">${tx.splits.map(s => `<div>${escapeHtml(s.method)}: ${utils.formatCurrency(s.amount)}</div>`).join('')}</div>`;
  } else {
    splitArea.innerHTML = `<div class="split-empty">Pembayaran terpecah belum dikonfigurasi.</div>`;
  }
}

/* Simple escaping (local) */
function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
