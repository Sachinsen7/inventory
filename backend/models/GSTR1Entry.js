const mongoose = require('mongoose');

const gstr1EntrySchema = new mongoose.Schema({
    // Period Information
    period: {
        type: String,
        required: true // Format: MMYYYY (e.g., 122024 for Dec 2024)
    },
    financialYear: {
        type: String,
        required: true // Format: 2024-25
    },

    // Customer Details
    customerGSTIN: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerState: String,
    customerStateCode: String,

    // Invoice Details
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceDate: {
        type: Date,
        required: true
    },
    invoiceType: {
        type: String,
        enum: ['B2B', 'B2C', 'B2CL', 'EXP', 'SEZWP', 'SEZWOP', 'CDNR', 'CDNUR'],
        default: 'B2B'
    },

    // Place of Supply
    placeOfSupply: String,
    placeOfSupplyCode: String,

    // Invoice Items
    items: [{
        description: String,
        hsnCode: String,
        quantity: Number,
        unit: String,
        rate: Number,
        taxableValue: Number,
        cgstRate: Number,
        cgstAmount: Number,
        sgstRate: Number,
        sgstAmount: Number,
        igstRate: Number,
        igstAmount: Number,
        cessRate: Number,
        cessAmount: Number
    }],

    // Totals
    taxableValue: {
        type: Number,
        required: true
    },
    cgstAmount: {
        type: Number,
        default: 0
    },
    sgstAmount: {
        type: Number,
        default: 0
    },
    igstAmount: {
        type: Number,
        default: 0
    },
    cessAmount: {
        type: Number,
        default: 0
    },
    totalTaxAmount: {
        type: Number,
        default: 0
    },
    invoiceValue: {
        type: Number,
        required: true
    },

    // Return Status
    returnStatus: {
        type: String,
        enum: ['pending', 'filed', 'amended', 'cancelled'],
        default: 'pending'
    },
    filedDate: Date,
    amendmentDate: Date,

    // E-way Bill Details
    eWayBillNumber: String,
    eWayBillDate: Date,

    // Source Information
    sourceType: {
        type: String,
        enum: ['manual', 'billing_system', 'import'],
        default: 'billing_system'
    },
    sourceBillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    },

    // Validation
    validationStatus: {
        type: String,
        enum: ['valid', 'invalid', 'warning'],
        default: 'valid'
    },
    validationErrors: [String],

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true
});

// Indexes
gstr1EntrySchema.index({ period: 1, customerGSTIN: 1 });
gstr1EntrySchema.index({ invoiceNumber: 1, invoiceDate: 1 });
gstr1EntrySchema.index({ returnStatus: 1 });
gstr1EntrySchema.index({ financialYear: 1 });

// Pre-save middleware to calculate totals
gstr1EntrySchema.pre('save', function (next) {
    // Calculate total tax amount
    this.totalTaxAmount = this.cgstAmount + this.sgstAmount + this.igstAmount + this.cessAmount;

    // Calculate invoice value if not provided
    if (!this.invoiceValue) {
        this.invoiceValue = this.taxableValue + this.totalTaxAmount;
    }

    next();
});

// Static method to generate GSTR-1 data from billing system
gstr1EntrySchema.statics.generateFromBills = async function (period, financialYear) {
    const Bill = mongoose.model('Bill');
    const Customer = mongoose.model('Customer');

    // Parse period to get date range (format: MMYYYY)
    const month = parseInt(period.substring(0, 2));
    const year = parseInt(period.substring(2));
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Find all bills in the period
    const bills = await Bill.find({
        invoiceDate: {
            $gte: startDate,
            $lte: endDate
        }
    }).populate('customerId');

    const gstr1Entries = [];

    for (const bill of bills) {
        if (!bill.customerId || !bill.customerId.gstNo) continue;

        // Determine invoice type based on customer GSTIN and amount
        let invoiceType = 'B2B';
        if (!bill.customerId.gstNo) {
            invoiceType = bill.totalAmount > 250000 ? 'B2CL' : 'B2C';
        }

        const entry = {
            period,
            financialYear,
            customerGSTIN: bill.customerId.gstNo || 'UNREGISTERED',
            customerName: bill.customerId.name,
            customerState: bill.customerId.state,
            invoiceNumber: bill.invoiceNumber || bill.billNumber,
            invoiceDate: bill.invoiceDate,
            invoiceType,
            taxableValue: bill.subtotal || 0,
            cgstAmount: bill.cgst || 0,
            sgstAmount: bill.sgst || 0,
            igstAmount: bill.igst || 0,
            cessAmount: bill.cess || 0,
            invoiceValue: bill.totalAmount,
            sourceBillId: bill._id,
            sourceType: 'billing_system'
        };

        gstr1Entries.push(entry);
    }

    // Bulk insert entries
    if (gstr1Entries.length > 0) {
        await this.insertMany(gstr1Entries);
    }

    return gstr1Entries.length;
};

module.exports = mongoose.model('GSTR1Entry', gstr1EntrySchema);