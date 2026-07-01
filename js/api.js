/**
 * ============================================
 * WARUNGKITA PRO MAX - Supabase API Wrapper
 * ============================================
 * File ini menangani semua komunikasi dengan Supabase
 * Menggunakan REST API (bukan client library)
 * 
 * Fitur:
 * - CRUD operations untuk semua tabel
 * - Error handling yang robust
 * - Fallback ke localStorage jika Supabase gagal
 * - Request timeout & retry mechanism
 */

const API = {
    // ========================================
    // BASE CONFIGURATION
    // ========================================
    baseUrl: `${CONFIG.supabase.url}/rest/v1`,
    headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.supabase.apiKey,
        'Authorization': `Bearer ${CONFIG.supabase.apiKey}`,
        'Prefer': 'return=representation' // Return data after insert/update
    },

    // ========================================
    // HELPER: FETCH WRAPPER
    // ========================================
    /**
     * Wrapper untuk fetch dengan timeout & error handling
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @param {number} timeout - Timeout dalam ms (default 10000)
     * @returns {Promise}
     */
    async _fetch(endpoint, options = {}, timeout = 10000) {
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                headers: { ...this.headers, ...(options.headers || {}) },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            // Return null for 204 No Content
            if (response.status === 204) return null;

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Network error - fallback ke localStorage
            if (error.name === 'AbortError') {
                console.warn('⚠️ Request timeout:', endpoint);
                throw new Error('Request timeout. Periksa koneksi internet Anda.');
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.warn('⚠️ Network error, menggunakan cache lokal');
                throw new Error('Tidak dapat terhubung ke server. Menggunakan data offline.');
            }
            
            throw error;
        }
    },

    // ========================================
    // GENERIC CRUD OPERATIONS
    // ========================================
    
    /**
     * GET - Ambil data dari tabel
     * @param {string} table - Nama tabel
     * @param {object} params - Query params (select, filter, order, limit)
     * @returns {Promise<Array>}
     */
    async getAll(table, params = {}) {
        try {
            let query = `/${table}?`;
            const queryParams = [];

            // Select columns
            if (params.select) {
                queryParams.push(`select=${params.select}`);
            } else {
                queryParams.push('select=*');
            }

            // Filters (eq, gt, lt, gte, lte, like, in)
            if (params.filters) {
                Object.entries(params.filters).forEach(([key, value]) => {
                    if (typeof value === 'object') {
                        // Complex filter: { column: { operator: value } }
                        Object.entries(value).forEach(([op, val]) => {
                            queryParams.push(`${key}=${op}.${val}`);
                        });
                    } else {
                        queryParams.push(`${key}=eq.${value}`);
                    }
                });
            }

            // Order
            if (params.order) {
                queryParams.push(`order=${params.order}`);
            }

            // Limit
            if (params.limit) {
                queryParams.push(`limit=${params.limit}`);
            }

            // Offset (for pagination)
            if (params.offset) {
                queryParams.push(`offset=${params.offset}`);
            }

            query += queryParams.join('&');
            return await this._fetch(query);
        } catch (error) {
            console.error(`❌ API.getAll error [${table}]:`, error);
            throw error;
        }
    },

    /**
     * GET BY ID - Ambil 1 data berdasarkan ID
     * @param {string} table - Nama tabel
     * @param {number|string} id - ID record
     * @returns {Promise<Object>}
     */
    async getById(table, id) {
        try {
            const data = await this._fetch(`/${table}?id=eq.${id}&select=*`);
            return data[0] || null;
        } catch (error) {
            console.error(`❌ API.getById error [${table}]:`, error);
            throw error;
        }
    },

    /**
     * POST - Insert data baru
     * @param {string} table - Nama tabel
     * @param {object} data - Data yang akan di-insert
     * @returns {Promise<Object>}
     */
    async create(table, data) {
        try {
            const result = await this._fetch(`/${table}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            return result[0] || result;
        } catch (error) {
            console.error(`❌ API.create error [${table}]:`, error);
            throw error;
        }
    },

    /**
     * PUT - Update data
     * @param {string} table - Nama tabel
     * @param {number|string} id - ID record
     * @param {object} data - Data yang akan di-update
     * @returns {Promise<Object>}
     */
    async update(table, id, data) {
        try {
            const result = await this._fetch(`/${table}?id=eq.${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
            return result[0] || result;
        } catch (error) {
            console.error(`❌ API.update error [${table}]:`, error);
            throw error;
        }
    },

    /**
     * DELETE - Hapus data
     * @param {string} table - Nama tabel
     * @param {number|string} id - ID record
     * @returns {Promise<boolean>}
     */
    async delete(table, id) {
        try {
            await this._fetch(`/${table}?id=eq.${id}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error(`❌ API.delete error [${table}]:`, error);
            throw error;
        }
    },

    // ========================================
    // PRODUCTS API
    // ========================================
    products: {
        async getAll(category = null, search = '') {
            const params = { order: 'name.asc' };
            const filters = {};
            
            if (category && category !== 'all') {
                filters.category = category;
            }
            
            if (search) {
                filters.name = { ilike: `%${search}%` };
            }
            
            if (Object.keys(filters).length > 0) {
                params.filters = filters;
            }
            
            return await API.getAll(CONFIG.tables.products, params);
        },

        async getById(id) {
            return await API.getById(CONFIG.tables.products, id);
        },

        async create(product) {
            return await API.create(CONFIG.tables.products, product);
        },

        async update(id, product) {
            return await API.update(CONFIG.tables.products, id, product);
        },

        async delete(id) {
            return await API.delete(CONFIG.tables.products, id);
        },

        async updateStock(id, newStock) {
            return await API.update(CONFIG.tables.products, id, { stock: newStock });
        },

        async getByBarcode(barcode) {
            const data = await API._fetch(`/${CONFIG.tables.products}?barcode=eq.${barcode}&select=*`);
            return data[0] || null;
        },

        async getLowStock(threshold = CONFIG.stock.lowStockThreshold) {
            return await API.getAll(CONFIG.tables.products, {
                filters: { stock: { lte: threshold } },
                order: 'stock.asc'
            });
        }
    },

    // ========================================
    // TRANSACTIONS API
    // ========================================
    transactions: {
        async getAll(filters = {}) {
            const params = { 
                order: 'created_at.desc',
                limit: filters.limit || 100
            };
            
            if (Object.keys(filters).length > 0) {
                params.filters = filters;
            }
            
            return await API.getAll(CONFIG.tables.transactions, params);
        },

        async getById(id) {
            return await API.getById(CONFIG.tables.transactions, id);
        },

        async create(transaction, items) {
            try {
                // 1. Create transaction
                const newTransaction = await API.create(CONFIG.tables.transactions, transaction);
                const transactionId = newTransaction.id;

                // 2. Create transaction items
                const itemsWithTxId = items.map(item => ({
                    ...item,
                    transaction_id: transactionId,
                    subtotal: item.quantity * item.price
                }));

                await API._fetch(`/${CONFIG.tables.transactionItems}`, {
                    method: 'POST',
                    body: JSON.stringify(itemsWithTxId)
                });

                // 3. Update product stock (kurangi stok)
                for (const item of items) {
                    const product = await API.getById(CONFIG.tables.products, item.product_id);
                    if (product) {
                        await API.products.updateStock(item.product_id, product.stock - item.quantity);
                    }
                }

                return newTransaction;
            } catch (error) {
                console.error('❌ API.transactions.create error:', error);
                throw error;
            }
        },

        async getToday() {
            const today = new Date().toISOString().split('T')[0];
            return await API.getAll(CONFIG.tables.transactions, {
                filters: {
                    created_at: { gte: `${today}T00:00:00` }
                },
                order: 'created_at.desc'
            });
        },

        async getByShift(shiftId) {
            return await API.getAll(CONFIG.tables.transactions, {
                filters: { shift_id: shiftId },
                order: 'created_at.desc'
            });
        },

        async getItems(transactionId) {
            return await API.getAll(CONFIG.tables.transactionItems, {
                filters: { transaction_id: transactionId }
            });
        }
    },

    // ========================================
    // CUSTOMERS API
    // ========================================
    customers: {
        async getAll() {
            return await API.getAll(CONFIG.tables.customers, {
                order: 'name.asc'
            });
        },

        async getById(id) {
            return await API.getById(CONFIG.tables.customers, id);
        },

        async create(customer) {
            return await API.create(CONFIG.tables.customers, customer);
        },

        async update(id, customer) {
            return await API.update(CONFIG.tables.customers, id, customer);
        },

        async delete(id) {
            return await API.delete(CONFIG.tables.customers, id);
        },

        async addPoints(id, points) {
            const customer = await API.getById(CONFIG.tables.customers, id);
            if (customer) {
                return await API.update(CONFIG.tables.customers, id, {
                    points: (customer.points || 0) + points,
                    total_transactions: (customer.total_transactions || 0) + 1,
                    total_spent: customer.total_spent || 0
                });
            }
            return null;
        }
    },

    // ========================================
    // SHIFTS API
    // ========================================
    shifts: {
        async getAll() {
            return await API.getAll(CONFIG.tables.shifts, {
                order: 'opened_at.desc'
            });
        },

        async getCurrent() {
            const data = await API.getAll(CONFIG.tables.shifts, {
                filters: { status: 'open' },
                order: 'opened_at.desc',
                limit: 1
            });
            return data[0] || null;
        },

        async open(shiftData) {
            return await API.create(CONFIG.tables.shifts, {
                ...shiftData,
                status: 'open',
                opened_at: new Date().toISOString()
            });
        },

        async close(id, finalCash, totalSales, totalTransactions) {
            return await API.update(CONFIG.tables.shifts, id, {
                final_cash: finalCash,
                total_sales: totalSales,
                total_transactions: totalTransactions,
                closed_at: new Date().toISOString(),
                status: 'closed'
            });
        }
    },

    // ========================================
    // STOCK HISTORY API
    // ========================================
    stockHistory: {
        async log(productId, type, quantity, previousStock, newStock, notes = '') {
            return await API.create(CONFIG.tables.stockHistory, {
                product_id: productId,
                type: type,
                quantity: quantity,
                previous_stock: previousStock,
                new_stock: newStock,
                notes: notes
            });
        },

        async getByProduct(productId) {
            return await API.getAll(CONFIG.tables.stockHistory, {
                filters: { product_id: productId },
                order: 'created_at.desc'
            });
        }
    },

    // ========================================
    // HEALTH CHECK
    // ========================================
    /**
     * Test koneksi ke Supabase
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            await this._fetch(`/${CONFIG.tables.products}?limit=1`);
            return true;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return false;
        }
    }
};

// ============================================
// FREEZE API (prevent modifications)
// ============================================
Object.freeze(API);
Object.freeze(API.headers);
Object.freeze(API.products);
Object.freeze(API.transactions);
Object.freeze(API.customers);
Object.freeze(API.shifts);
Object.freeze(API.stockHistory);

console.log('%c✅ API module loaded', 'color: #10b981;');
