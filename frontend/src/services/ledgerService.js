import axios from 'axios';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export const ledgerService = {
    /**
     * Create a new ledger entry
     * @param {Object} entry - Ledger entry data
     * @returns {Promise<Object>} Created ledger entry
     */
    async createEntry(entry) {
        try {
            const response = await axios.post(`${backendUrl}/api/ledger`, entry);
            return response.data;
        } catch (error) {
            console.error('Error creating ledger entry:', error);
            throw error;
        }
    },

    /**
     * Get complete history for a customer (all invoices + actions)
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Customer history with stats
     */
    async getCustomerHistory(customerId) {
        try {
            const response = await axios.get(`${backendUrl}/api/ledger/customer/${customerId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching customer history:', error);
            throw error;
        }
    },

    /**
     * Get history for a specific invoice
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Array>} Invoice history entries
     */
    async getInvoiceHistory(invoiceId) {
        try {
            const response = await axios.get(`${backendUrl}/api/ledger/invoice/${invoiceId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching invoice history:', error);
            throw error;
        }
    },

    /**
     * Record a payment (full or partial)
     * @param {Object} paymentData - Payment information
     * @returns {Promise<Object>} Created payment ledger entry
     */
    async recordPayment(paymentData) {
        try {
            const response = await axios.post(`${backendUrl}/api/ledger/payment`, paymentData);
            return response.data;
        } catch (error) {
            console.error('Error recording payment:', error);
            throw error;
        }
    },
    
    /**
     * Log invoice creation
     * @param {Object} invoice - Invoice data
     * @param {string} customerId - Customer ID
     * @param {string} customerName - Customer name
     */
    async logInvoiceCreated(invoice, customerId, customerName) {
        return this.createEntry({
            action: 'INVOICE_CREATED',
            entityType: 'INVOICE',
            entityId: invoice._id || invoice.id,
            invoiceId: invoice._id || invoice.id,
            changedValues: {
                before: null,
                after: invoice
            },
            metadata: {
                customerId,
                customerName
            }
        });
    },

    /**
     * Log invoice update
     * @param {string} invoiceId - Invoice ID
     * @param {Object} before - Previous invoice data
     * @param {Object} after - Updated invoice data
     * @param {string} customerId - Customer ID
     * @param {string} customerName - Customer name
     */
    async logInvoiceUpdated(invoiceId, before, after, customerId, customerName) {
        return this.createEntry({
            action: 'INVOICE_UPDATED',
            entityType: 'INVOICE',
            entityId: invoiceId,
            invoiceId,
            changedValues: { before, after },
            metadata: { customerId, customerName }
        });
    },

    /**
     * Log item weight change
     * @param {string} itemId - Item ID
     * @param {string} invoiceId - Invoice ID
     * @param {Object} beforeWeights - Previous weights
     * @param {Object} afterWeights - New weights
     * @param {string} customerId - Customer ID
     * @param {string} customerName - Customer name
     */
    async logWeightChanged(itemId, invoiceId, beforeWeights, afterWeights, customerId, customerName) {
        return this.createEntry({
            action: 'ITEM_WEIGHT_CHANGED',
            entityType: 'ITEM',
            entityId: itemId,
            invoiceId,
            changedValues: { before: beforeWeights, after: afterWeights },
            metadata: { customerId, customerName }
        });
    },

    /**
     * Log barcode removal
     * @param {string} barcodeId - Barcode ID
     * @param {string} invoiceId - Invoice ID
     * @param {string} serialNumber - Serial number
     * @param {string} customerId - Customer ID
     * @param {string} customerName - Customer name
     */
    async logBarcodeRemoved(barcodeId, invoiceId, serialNumber, customerId, customerName) {
        return this.createEntry({
            action: 'BARCODE_REMOVED',
            entityType: 'BARCODE',
            entityId: barcodeId,
            invoiceId,
            changedValues: {
                before: { status: 'active', serialNumber },
                after: { status: 'removed', serialNumber }
            },
            metadata: { customerId, customerName }
        });
    }
};
