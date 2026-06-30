/**
 * js/modules/cart.js
 * - Modul untuk operasi keranjang di POS
 * - Tanggung jawab:
 *   - menambahkan/menurunkan jumlah item
 *   - menghitung subtotal, diskon, total
 *   - hold/resume cart, clear cart
 *   - render keranjang di #pos-cart
 *
 * Exports:
 * - initCart(opts) : inisialisasi dengan selector (default '#pos-cart')
 * - openCheckout()  : placeholder untuk proses pembayaran
 *
 * Modul ini menggunakan state.js helper (addToCart, removeFromCart, clearCart) dan api/state untuk sinkronisasi.
 */

import state, { findProductById, addToCart as stateAddToCart, removeFromCart as stateRemoveFromCart, clearCart as stateClearCart } from '../state.js';
import api from '../api.js';
import utils from '../utils.js';
import { TABLES } from '../config.js';

let cartRootSelector = '#pos-cart';

/* Hitung ringkasan cart */
function summarizeCart(cart) {
  const items = cart.items || [];
  let subtotal = 0;
  for (const it of items) {
    subtotal += Number(it.price || 0) * Number(it.quantity || 0);
  }
  let discount = 0;
  // diskon dari code jika diterapkan di meta
  if (cart.meta && cart.meta.discountCode) {
    const code = String(cart.meta.discountCode).toUpperCase();
    const pct = (window.APP_CONFIG?.discountCodes?.[code]) ?? null; // fallback
    if (pct) discount = Math.round(subtotal * pct);
  }
  const total = subtotal - discount;
  return { items, subtotal: Math.round(subtotal), discount: Math.round(discount), total: Math.round(total) };
}

/* Render cart UI */
function renderCart() {
  const s = state.getState();
  const cart = s.cart || { items: [], meta: {} };
  const root = document.querySelector(cartRootSelector);
  if (!root) return;
  root.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'cart-header';
  header.innerHTML = `<h3>Keranjang</h3><div class="cart-actions"><button id="btn-clear-cart" class="btn-ghost">Kosongkan</button><button id="btn-hold-cart" class="btn-ghost">Hold</button></div>`;
  root.appendChild(header);

  const list = document.createElement('div');
  list.className = 'cart-items';
  if (!cart.items || !cart.items.length) {
    list.innerHTML = `<div class="empty">Keranjang kosong</div>`;
    root.appendChild(list);
  } else {
    for (const it of cart.items) {
      const prod = findProductById(it.product_id) || {};
      const li = document.createElement('div');
      li.className = 'cart-item';
      li.innerHTML = `
        <div class="ci-left">
          <div class="ci-name">${utils.escapeHtml ? utils.escapeHtml(prod.name || prod.id || '') : (prod.name || prod.id || '')}</div>
          <div class="ci-meta">${utils.formatCurrency(it.price || prod.price || 0)} × ${it.quantity}</div>
        </div>
        <div class="ci-right">
          <div class="ci-total">${utils.formatCurrency((it.price || prod.price || 0) * it.quantity)}</div>
          <div class="ci-controls">
            <button class="btn-xs btn-decrease" data-id="${it.product_id}">−</button>
            <button class="btn-xs btn-increase" data-id="${it.product_id}">+</button>
            <button class="btn-xs btn-remove" data-id="${it.product_id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
      list.appendChild(li);
    }
    root.appendChild(list);
  }

  // Summary & checkout area
  const summary = summarizeCart(cart);
  const footer = document.createElement('div');
  footer.className = 'cart-summary';
  footer.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><strong>${utils.formatCurrency(summary.subtotal)}</strong></div>
    <div class="summary-row"><span>Diskon</span><strong>-${utils.formatCurrency(summary.discount)}</strong></div>
    <div class="summary-row total"><span>Total</span><strong>${utils.formatCurrency(summary.total)}</strong></div>
    <div class="summary-actions">
      <button id="btn-checkout" class="btn-primary">Bayar (F9)</button>
    </div>
  `;
  root.appendChild(footer);

  // Hook controls
  root.querySelectorAll('.btn-remove').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    stateRemoveFromCart(id);
    utils.toast('Item dihapus dari keranjang', { type: 'info' });
  }));
  root.querySelectorAll('.btn-decrease').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    // decrease by 1 or remove if qty<=1
    const sNow = state.getState();
    const item = (sNow.cart.items || []).find(it => String(it.product_id) === String(id));
    if (!item) return;
    if (item.quantity <= 1) {
      stateRemoveFromCart(id);
    } else {
      // update by replacing: remove and re-add with qty-1 (we don't have update quantity API; do by setState)
      // Simpler: directly modify state (we'll update entire cart)
      const newItems = sNow.cart.items.map(it => (String(it.product_id) === String(id) ? { ...it, quantity: it.quantity - 1 } : it));
      state.setState({ cart: { ...sNow.cart, items: newItems } });
    }
  }));
  root.querySelectorAll('.btn-increase').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    const sNow = state.getState();
    const item = (sNow.cart.items || []).find(it => String(it.product_id) === String(id));
    if (!item) return;
    const newItems = sNow.cart.items.map(it => (String(it.product_id) === String(id) ? { ...it, quantity: it.quantity + 1 } : it));
    state.setState({ cart: { ...sNow.cart, items: newItems } });
  }));

  const btnClear = root.querySelector('#btn-clear-cart');
  if (btnClear) btnClear.addEventListener('click', () => {
    stateClearCart();
    utils.toast('Keranjang dikosongkan', { type: 'info' });
  });
  const btnHold = root.querySelector('#btn-hold-cart');
  if (btnHold) btnHold.addEventListener('click', () => {
    // Set meta hold true
    const sNow = state.getState();
    state.setState({ cart: { ...sNow.cart, meta: { ...(sNow.cart.meta || {}), hold: true } } });
    utils.toast('Keranjang disimpan (hold)', { type: 'success' });
  });

  const btnCheckout = root.querySelector('#btn-checkout');
  if (btnCheckout) btnCheckout.addEventListener('click', openCheckout);
}

/* Open checkout flow (minimal placeholder) */
export async function openCheckout() {
  const sNow = state.getState();
  const cart = sNow.cart;
  const summary = summarizeCart(cart);
  if (!cart.items || !cart.items.length) {
    utils.toast('Keranjang kosong', { type: 'warning' });
    return;
  }
  // Buat objek transaksi lokal
  const tx = {
    total_amount: summary.total,
    payment_method: 'cash',
    payment_status: 'pending',
    customer_name: null,
    created_at: new Date().toISOString(),
    discount: summary.discount || 0,
    transaction_items: cart.items.map(it => ({ product_id: it.product_id, quantity: it.quantity, price: it.price })),
    shift_id: null
  };
  // Simpan lokal via api.create (akan fallback ke local state jika SUPABASE_KEY kosong)
  try {
    const created = await api.create(TABLES.TRANSACTIONS, tx);
    // Tambah juga ke state.transactions (api.create does in fallback)
    // Reset cart
    stateClearCart();
    utils.toast('Transaksi dicatat', { type: 'success' });
    // Emit event untuk UI (receipt, print, etc)
    window.dispatchEvent(new CustomEvent('warungkita:transaction:created', { detail: { tx: created || tx } }));
  } catch (err) {
    console.error('Gagal membuat transaksi', err);
    utils.toast('Gagal memproses pembayaran', { type: 'danger' });
  }
}

/* Inisialisasi cart: bind event listeners global & subscribe state */
export function initCart({ selector = '#pos-cart' } = {}) {
  cartRootSelector = selector;
  // Initial render
  renderCart();

  // Global listener: add-to-cart event from products module
  window.addEventListener('warungkita:add-to-cart', (e) => {
    const detail = e.detail || {};
    const product_id = detail.product_id;
    const qty = detail.quantity || 1;
    const price = detail.price ?? findProductById(product_id)?.price ?? 0;
    // Use state helper to add
    stateAddToCart({ product_id, quantity: qty, price });
    // Re-render will be triggered via state.subscribe
  });

  // Subscribe state changes to re-render
  state.subscribe(() => {
    renderCart();
  });

  // Keyboard shortcut: F9 => checkout
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'F9') {
      ev.preventDefault();
      openCheckout();
    }
  });
}

export default {
  initCart,
  openCheckout
};
