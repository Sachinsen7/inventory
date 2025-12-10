const mongoose = require('mongoose');

const voucherItemSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'accountModel',
        required: true
    },
    accountModel: {
        type: String,
        required: true,
        enum: ['Customer', 'Supplier', 'LedgerEntry']
    },
    accountName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    debitAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    creditAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    gstRate: {
        type: Number,
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
    },
    tdsRate: {
        type: Number,
        default: 0
    },
    tdsAmount: {
        type: Number,
        default: 0
    }
});

const voucherSchema = new mongoose.Schema({
    voucherNumber: {
        type: String,
        required: true,
        unique: true
    },
    voucherType: {
        type: String,
        required: true,
        enum: ['sales', 'purchase', 'receipt', 'payment', 'journal', 'contra', 'debit_note', 'credit_note']
    },
    voucherDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    referenceNumber: {
        type: String,
        default: ''
    },
    referenceDate: {
        type: Date
    },
    narration: {
        type: String,
        required: true
    },

    // Voucher Items (Double Entry)
    items: [voucherItemSchema],

    // Totals
    totalDebit: {
        type: Number,
        required: true,
        default: 0
    },
    totalCredit: {
        type: Number,
        required: true,
        default: 0
    },
    totalGST: {
        type: Number,
        default: 0
    },
    totalTDS: {
        type: Number,
        default: 0
    },

    // Status and Metadata
    status: {
        type: String,
        enum: ['draft', 'provisional', 'posted', 'cancelled'],
        default: 'draft'
    },

    // Post-dated Voucher Fields
    isPostDated: {
        type: Boolean,
        default: false
    },
    effectiveDate: {
        type: Date // Date when the voucher should actually be posted
    },
    postDateReason: {
        type: String // Reason for post-dating
    },
    autoPostEnabled: {
        type: Boolean,
        default: false // Whether to automatically post on effective date
    },

    // Provisional Voucher Fields
    isProvisional: {
        type: Boolean,
        default: false
    },
    provisionalReason: {
        type: String // Reason for keeping as provisional
    },
    provisionalDate: {
        type: Date // Date when marked as provisional
    },
    confirmedDate: {
        type: Date // Date when confirmed from provisional
    },
    postedDate: {
        type: Date
    },
    cancelledDate: {
        type: Date
    },
    cancelReason: {
        type: String
    },

    // Template and Approval Fields
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoucherTemplate'
    },
    templateCode: {
        type: String
    },
    isFromTemplate: {
        type: Boolean,
        default: false
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringVoucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecurringVoucher'
    },

    // Approval Workflow
    approvalStatus: {
        type: String,
        enum: ['not_required', 'pending', 'approved', 'rejected'],
        default: 'not_required'
    },
    approvalLevel: {
        type: Number,
        default: 0
    },
    maxApprovalLevel: {
        type: Number,
        default: 0
    },
    approvedDate: {
        type: Date
    },
    finalApproverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedDate: {
        type: Date
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String
    },

    // Financial Year
    financialYear: {
        type: String,
        required: true
    },

    // Attachments
    attachments: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],

    // Audit Trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Additional Fields for specific voucher types
    partyDetails: {
        name: String,
        address: String,
        gstin: String,
        pan: String,
        contactNumber: String
    },

    // Bank Details (for Receipt/Payment vouchers)
    bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        chequeNumber: String,
        chequeDate: Date,
        utrNumber: String
    },

    // Invoice Details (for Sales/Purchase vouchers)
    invoiceDetails: {
        invoiceNumber: String,
        invoiceDate: Date,
        dueDate: Date,
        terms: String
    }
}, {
    timestamps: true
});

// Indexes for better performance
voucherSchema.index({ voucherNumber: 1 });
voucherSchema.index({ voucherType: 1, voucherDate: -1 });
voucherSchema.index({ financialYear: 1, voucherType: 1 });
voucherSchema.index({ status: 1 });
voucherSchema.index({ 'items.account': 1 });

// Pre-save validation
voucherSchema.pre('save', function (next) {
    // Validate double entry (Total Debit = Total Credit)
    if (this.status === 'posted' && Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
        return next(new Error('Voucher is not balanced. Total Debit must equal Total Credit.'));
    }

    // Calculate totals from items
    this.totalDebit = this.items.reduce((sum, item) => sum + item.debitAmount, 0);
    this.totalCredit = this.items.reduce((sum, item) => sum + item.creditAmount, 0);
    this.totalGST = this.items.reduce((sum, item) => sum + item.gstAmount, 0);
    this.totalTDS = this.items.reduce((sum, item) => sum + item.tdsAmount, 0);

    // Set financial year if not set
    if (!this.financialYear) {
        const voucherYear = new Date(this.voucherDate).getFullYear();
        const voucherMonth = new Date(this.voucherDate).getMonth();

        if (voucherMonth >= 3) { // April to March
            this.financialYear = `${voucherYear}-${(voucherYear + 1).toString().slice(-2)}`;
        } else {
            this.financialYear = `${voucherYear - 1}-${voucherYear.toString().slice(-2)}`;
        }
    }

    next();
});

// Static method to get next voucher number
voucherSchema.statics.getNextVoucherNumber = async function (voucherType) {
    const Settings = mongoose.model('Settings');
    return await Settings.getNextVoucherNumber(voucherType);
};

// Instance method to post voucher
voucherSchema.methods.postVoucher = async function () {
    if (this.status === 'posted') {
        throw new Error('Voucher is already posted');
    }

    // Validate balance
    if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
        throw new Error('Voucher is not balanced');
    }

    this.status = 'posted';
    this.postedDate = new Date();

    // Update ledger entries
    await this.updateLedgerEntries();

    return await this.save();
};

// Instance method to cancel voucher
voucherSchema.methods.cancelVoucher = async function (reason) {
    if (this.status === 'cancelled') {
        throw new Error('Voucher is already cancelled');
    }

    this.status = 'cancelled';
    this.cancelledDate = new Date();
    this.cancelReason = reason;

    // Reverse ledger entries if voucher was posted
    if (this.status === 'posted') {
        await this.reverseLedgerEntries();
    }

    return await this.save();
};

// Instance method to update ledger entries
voucherSchema.methods.updateLedgerEntries = async function () {
    const LedgerEntry = mongoose.model('LedgerEntry');

    for (const item of this.items) {
        // Create debit entry
        if (item.debitAmount > 0) {
            await LedgerEntry.create({
                account: item.account,
                accountModel: item.accountModel,
                accountName: item.accountName,
                voucherNumber: this.voucherNumber,
                voucherType: this.voucherType,
                voucherDate: this.voucherDate,
                description: item.description || this.narration,
                debitAmount: item.debitAmount,
                creditAmount: 0,
                financialYear: this.financialYear
            });
        }

        // Create credit entry
        if (item.creditAmount > 0) {
            await LedgerEntry.create({
                account: item.account,
                accountModel: item.accountModel,
                accountName: item.accountName,
                voucherNumber: this.voucherNumber,
                voucherType: this.voucherType,
                voucherDate: this.voucherDate,
                description: item.description || this.narration,
                debitAmount: 0,
                creditAmount: item.creditAmount,
                financialYear: this.financialYear
            });
        }
    }
};

// Instance method to reverse ledger entries
voucherSchema.methods.reverseLedgerEntries = async function () {
    const LedgerEntry = mongoose.model('LedgerEntry');

    // Delete all ledger entries for this voucher
    await LedgerEntry.deleteMany({
        voucherNumber: this.voucherNumber
    });
};

// Static method to get voucher summary
voucherSchema.statics.getVoucherSummary = async function (filters = {}) {
    const pipeline = [
        { $match: { status: 'posted', ...filters } },
        {
            $group: {
                _id: '$voucherType',
                count: { $sum: 1 },
                totalDebit: { $sum: '$totalDebit' },
                totalCredit: { $sum: '$totalCredit' },
                totalGST: { $sum: '$totalGST' },
                totalTDS: { $sum: '$totalTDS' }
            }
        }
    ];

    return await this.aggregate(pipeline);
};

// Static method to process post-dated vouchers
voucherSchema.statics.processPostDatedVouchers = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const postDatedVouchers = await this.find({
        isPostDated: true,
        autoPostEnabled: true,
        effectiveDate: { $lte: today },
        status: 'draft'
    });

    const results = [];

    for (const voucher of postDatedVouchers) {
        try {
            voucher.status = 'posted';
            voucher.postedDate = new Date();
            voucher.isPostDated = false; // Clear post-dated flag

            await voucher.save();
            await voucher.updateLedgerEntries();

            results.push({
                voucherId: voucher._id,
                voucherNumber: voucher.voucherNumber,
                status: 'success'
            });
        } catch (error) {
            results.push({
                voucherId: voucher._id,
                voucherNumber: voucher.voucherNumber,
                status: 'error',
                error: error.message
            });
        }
    }

    return results;
};

// Method to mark voucher as provisional
voucherSchema.methods.markAsProvisional = function (reason) {
    this.status = 'provisional';
    this.isProvisional = true;
    this.provisionalReason = reason;
    this.provisionalDate = new Date();
    return this.save();
};

// Method to confirm provisional voucher
voucherSchema.methods.confirmProvisional = function () {
    if (this.status !== 'provisional') {
        throw new Error('Voucher is not in provisional status');
    }

    this.status = 'posted';
    this.isProvisional = false;
    this.confirmedDate = new Date();
    this.postedDate = new Date();

    return this.save().then(() => this.updateLedgerEntries());
};

// Method to schedule post-dated voucher
voucherSchema.methods.schedulePostDated = function (effectiveDate, reason, autoPost = false) {
    this.isPostDated = true;
    this.effectiveDate = effectiveDate;
    this.postDateReason = reason;
    this.autoPostEnabled = autoPost;
    return this.save();
};

module.exports = mongoose.model('Voucher', voucherSchema);