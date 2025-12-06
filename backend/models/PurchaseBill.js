const mongoose = require('mongoose');

const purchaseBillSchema = new mongoose.Schema({
    // Supplier Information
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    supplierName: String,
    supplierGSTIN: String,

    // Bill Details
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceDate: {
        type: Date,
        required: true
    },

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
    totalAmount: {
        type: Number,
        required: true
    },

    // ITC Details
    itcEligible: {
        type: Boolean,
        default: true
    },
    itcAmount: {
        type: Number,
        default: 0
    },

    // GSTR-2A/2B Matching
    matchedWithGSTR2: {
        type: Boolean,
        default: false
    },
    gstr2Status: {
        type: String,
        enum: ['matched', 'mismatched', 'missing_in_gstr2', 'missing_in_books', 'pending'],
        default: 'pending'
    },
    gstr2MatchDate: Date,
    gstr2Differences: [{
        field: String,
        bookValue: mongoose.Schema.Types.Mixed,
        gstr2Value: mongoose.Schema.Types.Mixed
    }],

    // Items
    items: [{
        description: String,
        hsnCode: String,
        quantity: Number,
        rate: Number,
        amount: Number
    }],

    // Payment Status
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid'
    },
    paidAmount: {
        type: Number,
        default: 0
    },

    // Metadata
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes
purchaseBillSchema.index({ supplierId: 1, invoiceDate: -1 });
purchaseBillSchema.index({ supplierGSTIN: 1, invoiceNumber: 1, invoiceDate: 1 });
purchaseBillSchema.index({ gstr2Status: 1 });

module.exports = mongoose.model('PurchaseBill', purchaseBillSchema);
