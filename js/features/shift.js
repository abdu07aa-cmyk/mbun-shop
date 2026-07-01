/**
 * ============================================
 * SHIFT MODULE
 * ============================================
 * Mengelola shift kasir (buka/tutup)
 */

const ShiftModule = {
    init() {
        console.log('%c⏰ ShiftModule initialized', 'color: #3b82f6;');
        this.setupEventListeners();
        this.checkCurrentShift();
    },

    async checkCurrentShift() {
        try {
            // Cek dari Supabase dulu
            const shift = await API.shifts.getCurrent();
            
            if (shift) {
                AppState.setCurrentShift(shift);
                this.updateShiftUI();
            } else {
                // Cek localStorage fallback
                const saved = localStorage.getItem(CONFIG.storageKeys.currentShift);
                if (saved) {
                    const shiftData = JSON.parse(saved);
                    AppState.setCurrentShift(shiftData);
                    this.updateShiftUI();
                } else {
                    this.showOpenShiftView();
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to check shift:', error);
            // Fallback ke localStorage
            const saved = localStorage.getItem(CONFIG.storageKeys.currentShift);
            if (saved) {
                try {
                    AppState.setCurrentShift(JSON.parse(saved));
                    this.updateShiftUI();
                } catch(e) {
                    this.showOpenShiftView();
                }
            } else {
                this.showOpenShiftView();
            }
        }
    },

    showOpenShiftView() {
        const status = document.getElementById('shiftStatus');
        const active = document.getElementById('shiftActive');
        if (status) status.style.display = 'block';
        if (active) active.style.display = 'none';
    },

    updateShiftUI() {
        const shift = AppState.currentShift;
        if (!shift) {
            this.showOpenShiftView();
            return;
        }

        const status = document.getElementById('shiftStatus');
        const active = document.getElementById('shiftActive');
        
        if (status) status.style.display = 'none';
        if (active) active.style.display = 'block';

        // Update info
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('shiftCashier', shift.cashier_name || 'Admin');
        set('shiftStartTime', Utils.formatDateTime(shift.opened_at));
        set('shiftInitialCash', Utils.formatCurrency(shift.initial_cash || 0));
        set('shiftTransactions', shift.total_transactions || 0);
        set('shiftSales', Utils.formatCurrency(shift.total_sales || 0));
    },

    async openShift(cashierName, initialCash) {
        try {
            AppState.setLoading(true);
            
            const shiftData = {
                cashier_name: cashierName,
                initial_cash: parseInt(initialCash),
                total_sales: 0,
                total_transactions: 0,
                status: 'open'
            };

            const newShift = await API.shifts.open(shiftData);
            AppState.setCurrentShift(newShift);
            this.updateShiftUI();
            
            Utils.closeModal('shiftModal');
            Utils.toast('✅ Shift berhasil dibuka', 'success');
            Utils.playSound('success');
        } catch (error) {
            console.error('❌ Open shift error:', error);
            
            // Fallback: buat shift lokal
            const localShift = {
                id: Date.now(),
                cashier_name: cashierName,
                initial_cash: parseInt(initialCash),
                total_sales: 0,
                total_transactions: 0,
                status: 'open',
                opened_at: new Date().toISOString()
            };
            AppState.setCurrentShift(localShift);
            this.updateShiftUI();
            Utils.closeModal('shiftModal');
            Utils.toast('⚠️ Shift dibuka (mode offline)', 'warning');
        } finally {
            AppState.setLoading(false);
        }
    },

    async closeShift(finalCash) {
        const shift = AppState.currentShift;
        if (!shift) return;

        try {
            AppState.setLoading(true);
            
            const expected = (shift.initial_cash || 0) + (shift.total_sales || 0);
            const difference = finalCash - expected;

            await API.shifts.close(
                shift.id,
                finalCash,
                shift.total_sales || 0,
                shift.total_transactions || 0
            );

            AppState.setCurrentShift(null);
            this.showOpenShiftView();
            
            Utils.closeModal('closeShiftModal');
            
            const diffText = difference === 0 ? 'Pas!' 
                : difference > 0 ? `Selisih +${Utils.formatCurrency(difference)}`
                : `Selisih ${Utils.formatCurrency(difference)}`;
            
            Utils.toast(`✅ Shift ditutup. ${diffText}`, difference === 0 ? 'success' : 'warning');
            Utils.playSound('success');
        } catch (error) {
            console.error('❌ Close shift error:', error);
            
            // Fallback lokal
            AppState.setCurrentShift(null);
            this.showOpenShiftView();
            Utils.closeModal('closeShiftModal');
            Utils.toast('⚠️ Shift ditutup (mode offline)', 'warning');
        } finally {
            AppState.setLoading(false);
        }
    },

    setupEventListeners() {
        // Open shift button
        const btnOpen = document.getElementById('btnOpenShift');
        if (btnOpen) {
            btnOpen.addEventListener('click', () => Utils.openModal('shiftModal'));
        }

        // Open shift form
        const form = document.getElementById('shiftForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('shiftCashierName').value;
                const cash = document.getElementById('shiftInitialCash').value;
                this.openShift(name, cash);
            });
        }

        // Close shift button
        const btnClose = document.getElementById('btnCloseShift');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                const shift = AppState.currentShift;
                if (!shift) return;

                // Populate close shift modal
                const set = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = val;
                };

                set('closeShiftCashier', shift.cashier_name);
                set('closeShiftTransactions', shift.total_transactions || 0);
                set('closeShiftSales', Utils.formatCurrency(shift.total_sales || 0));
                set('closeShiftInitial', Utils.formatCurrency(shift.initial_cash || 0));
                
                const expected = (shift.initial_cash || 0) + (shift.total_sales || 0);
                set('closeShiftExpected', Utils.formatCurrency(expected));

                // Duration
                const start = new Date(shift.opened_at);
                const now = new Date();
                const diffMs = now - start;
                const hours = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                set('closeShiftDuration', `${hours}j ${mins}m`);

                Utils.openModal('closeShiftModal');
            });
        }

        // Final cash input - calculate difference
        const finalCashInput = document.getElementById('closeShiftFinalCash');
        if (finalCashInput) {
            finalCashInput.addEventListener('input', (e) => {
                const shift = AppState.currentShift;
                if (!shift) return;
                
                const final = parseInt(e.target.value) || 0;
                const expected = (shift.initial_cash || 0) + (shift.total_sales || 0);
                const diff = final - expected;
                
                const diffEl = document.getElementById('closeShiftDifference');
                if (diffEl) {
                    diffEl.textContent = Utils.formatCurrency(Math.abs(diff));
                    diffEl.style.color = diff === 0 ? '#10b981' : diff > 0 ? '#3b82f6' : '#ef4444';
                }
            });
        }

        // Confirm close shift
        const btnConfirmClose = document.getElementById('btnConfirmCloseShift');
        if (btnConfirmClose) {
            btnConfirmClose.addEventListener('click', () => {
                const finalCash = parseInt(document.getElementById('closeShiftFinalCash').value) || 0;
                this.closeShift(finalCash);
            });
        }

        // Subscribe to shift changes
        AppState.subscribe('shift:changed', () => this.updateShiftUI());
    }
};

Object.freeze(ShiftModule);
console.log('%c✅ ShiftModule loaded', 'color: #10b981;');
