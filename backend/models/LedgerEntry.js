const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
    // Reference
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },

    // Entry Details
    type: {
        type: String,
        enum: ['opening_balance', 'invoice', 'payment', 'credit_note', 'debit_note', 'purchase', 'adjustment'],
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    balanceType: {
        type: String,
        enum: ['debit', 'credit'],
        required: true
    },

    // Separate debit/credit amounts for cash/bank book reports
    debitAmount: {
        type: Number,
        default: 0
    },
    creditAmount: {
        type: Number,
        default: 0
    },

    // Transaction Details
    transactionDate: {
        type: Date,
        default: Date.now
    },
    date: {
        type: Date,
        default: Date.now
    },

    referenceNumber: String,
    description: String,
    notes: String,
    accountName: String, // Account name for reporting purposes
    accountModel: String, // Account model type for cash/bank book reports
    accountType: String, // Asset, Liability, Income, Expense, Equity
    accountCategory: String, // Current Assets, Fixed Assets, etc.

    // Related Documents
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher'
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    purchaseBillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseBill'
    },

    // Additional fields for cash/bank book reports
    narration: String,

    // Metadata
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for faster queries
ledgerEntrySchema.index({ customerId: 1, transactionDate: -1 });
ledgerEntrySchema.index({ supplierId: 1, transactionDate: -1 });
ledgerEntrySchema.index({ type: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
