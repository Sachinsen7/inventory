const mongoose = require('mongoose');

const gstr2EntrySchema = new mongoose.Schema({
    // Upload Information
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploadedBy: String,
    fileName: String,
    period: String, // Format: MMYYYY (e.g., 122024 for Dec 2024)

    // Supplier Details
    supplierGSTIN: {
        type: String,
        required: true
    },
    supplierName: String,

    // Invoice Details
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceDate: {
        type: Date,
        required: true
    },
    invoiceType: String, // B2B, B2BA, CDNR, etc.

    // Amounts
    taxableValue: {
        type: Number,
        required: true
    },
    cgst: {
        type: Number,
        default: 0
    },
    sgst: {
        type: Number,
        default: 0
    },
    igst: {
        type: Number,
        default: 0
    },
    cess: {
        type: Number,
        default: 0
    },
    totalTax: {
        type: Number,
        default: 0
    },
    invoiceValue: {
        type: Number,
        required: true
    },

    // ITC Details
    itcAvailable: {
        type: Number,
        default: 0
    },
    itcReversed: {
        type: Number,
        default: 0
    },

    // Matching Status
    matchStatus: {
        type: String,
        enum: ['matched', 'mismatched', 'missing_in_books', 'pending'],
        default: 'pending'
    },
    matchedPurchaseBillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseBill'
    },
    matchDate: Date,

    // Mismatch Details
    mismatches: [{
        field: String,
        gstr2Value: mongoose.Schema.Types.Mixed,
        bookValue: mongoose.Schema.Types.Mixed,
        difference: mongoose.Schema.Types.Mixed
    }],

    // Raw Data
    rawData: mongoose.Schema.Types.Mixed,

    // Metadata
    notes: String,
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes
gstr2EntrySchema.index({ supplierGSTIN: 1, invoiceNumber: 1, invoiceDate: 1 });
gstr2EntrySchema.index({ period: 1 });
gstr2EntrySchema.index({ matchStatus: 1 });
gstr2EntrySchema.index({ uploadDate: -1 });

module.exports = mongoose.model('GSTR2Entry', gstr2EntrySchema);
