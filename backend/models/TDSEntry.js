const mongoose = require('mongoose');

const tdsEntrySchema = new mongoose.Schema({
    // Basic Information
    deducteeType: {
        type: String,
        required: true,
        enum: ['individual', 'company', 'firm', 'aop', 'boi', 'government', 'others']
    },
    deducteeName: {
        type: String,
        required: true
    },
    deducteePAN: {
        type: String,
        required: true,
        uppercase: true,
        match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    },
    deducteeAddress: {
        type: String,
        required: true
    },

    // Payment Details
    paymentDate: {
        type: Date,
        required: true
    },
    paymentAmount: {
        type: Number,
        required: true,
        min: 0
    },

    // TDS Details
    sectionCode: {
        type: String,
        required: true,
        enum: ['194A', '194C', '194H', '194I', '194J', '194O', '195', '196A', '196B', '196C', '196D', '197']
    },
    natureOfPayment: {
        type: String,
        required: true
    },
    tdsRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    tdsAmount: {
        type: Number,
        required: true,
        min: 0
    },

    // Voucher Reference
    voucherNumber: {
        type: String,
        required: true
    },
    voucherType: {
        type: String,
        required: true
    },
    voucherDate: {
        type: Date,
        required: true
    },

    // Quarter and Financial Year
    quarter: {
        type: String,
        required: true,
        enum: ['Q1', 'Q2', 'Q3', 'Q4']
    },
    financialYear: {
        type: String,
        required: true
    },
    assessmentYear: {
        type: String,
        required: true
    },

    // Challan Details
    challanNumber: {
        type: String
    },
    challanDate: {
        type: Date
    },
    challanAmount: {
        type: Number,
        min: 0
    },
    bankName: {
        type: String
    },

    // Certificate Details
    certificateNumber: {
        type: String
    },
    certificateDate: {
        type: Date
    },
    certificateGenerated: {
        type: Boolean,
        default: false
    },

    // Status and Compliance
    status: {
        type: String,
        enum: ['pending', 'deposited', 'filed', 'completed'],
        default: 'pending'
    },
    returnFiled: {
        type: Boolean,
        default: false
    },
    returnFilingDate: {
        type: Date
    },
    acknowledgmentNumber: {
        type: String
    },

    // Additional Details
    remarks: {
        type: String
    },
    isResident: {
        type: Boolean,
        default: true
    },

    // Audit Trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better performance
tdsEntrySchema.index({ quarter: 1, financialYear: 1 });
tdsEntrySchema.index({ deducteePAN: 1 });
tdsEntrySchema.index({ paymentDate: 1 });
tdsEntrySchema.index({ status: 1 });
tdsEntrySchema.index({ sectionCode: 1 });

// Pre-save middleware to calculate quarter and assessment year
tdsEntrySchema.pre('save', function (next) {
    if (this.paymentDate) {
        const paymentMonth = this.paymentDate.getMonth() + 1; // 1-12
        const paymentYear = this.paymentDate.getFullYear();

        // Determine quarter based on financial year (April to March)
        if (paymentMonth >= 4 && paymentMonth <= 6) {
            this.quarter = 'Q1';
        } else if (paymentMonth >= 7 && paymentMonth <= 9) {
            this.quarter = 'Q2';
        } else if (paymentMonth >= 10 && paymentMonth <= 12) {
            this.quarter = 'Q3';
        } else {
            this.quarter = 'Q4';
        }

        // Set financial year and assessment year
        if (paymentMonth >= 4) {
            this.financialYear = `${paymentYear}-${(paymentYear + 1).toString().slice(-2)}`;
            this.assessmentYear = `${paymentYear + 1}-${(paymentYear + 2).toString().slice(-2)}`;
        } else {
            this.financialYear = `${paymentYear - 1}-${paymentYear.toString().slice(-2)}`;
            this.assessmentYear = `${paymentYear}-${(paymentYear + 1).toString().slice(-2)}`;
        }
    }

    next();
});

// Static method to get TDS rates by section
tdsEntrySchema.statics.getTDSRates = function () {
    return {
        '194A': { rate: 10, threshold: 40000, description: 'Interest other than on securities' },
        '194C': { rate: 1, threshold: 30000, description: 'Payments to contractors' },
        '194H': { rate: 5, threshold: 15000, description: 'Commission or brokerage' },
        '194I': { rate: 10, threshold: 240000, description: 'Rent of land/building/furniture' },
        '194J': { rate: 10, threshold: 30000, description: 'Professional or technical services' },
        '194O': { rate: 1, threshold: 50000000, description: 'E-commerce transactions' },
        '195': { rate: 20, threshold: 0, description: 'Non-resident payments' },
        '196A': { rate: 5, threshold: 0, description: 'Income from units' },
        '196B': { rate: 5, threshold: 0, description: 'Income from units of business trust' },
        '196C': { rate: 10, threshold: 0, description: 'Income from foreign currency bonds' },
        '196D': { rate: 25, threshold: 0, description: 'Income of FIIs from securities' },
        '197': { rate: 0, threshold: 0, description: 'Lower/Nil rate certificate' }
    };
};

// Static method to calculate TDS
tdsEntrySchema.statics.calculateTDS = function (sectionCode, paymentAmount, customRate = null) {
    const rates = this.getTDSRates();
    const section = rates[sectionCode];

    if (!section) {
        throw new Error(`Invalid TDS section: ${sectionCode}`);
    }

    // Check if payment exceeds threshold
    if (paymentAmount < section.threshold) {
        return {
            tdsApplicable: false,
            tdsAmount: 0,
            tdsRate: 0,
            threshold: section.threshold,
            reason: 'Payment below threshold limit'
        };
    }

    const rate = customRate || section.rate;
    const tdsAmount = Math.round((paymentAmount * rate) / 100);

    return {
        tdsApplicable: true,
        tdsAmount,
        tdsRate: rate,
        threshold: section.threshold,
        netPayment: paymentAmount - tdsAmount
    };
};

// Instance method to generate certificate number
tdsEntrySchema.methods.generateCertificateNumber = function () {
    const year = this.assessmentYear.replace('-', '');
    const quarter = this.quarter;
    const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    this.certificateNumber = `TDS${year}${quarter}${sequence}`;
    this.certificateDate = new Date();
    this.certificateGenerated = true;

    return this.certificateNumber;
};

// Static method to get quarterly summary
tdsEntrySchema.statics.getQuarterlySummary = async function (quarter, financialYear) {
    const summary = await this.aggregate([
        {
            $match: {
                quarter: quarter,
                financialYear: financialYear
            }
        },
        {
            $group: {
                _id: '$sectionCode',
                totalEntries: { $sum: 1 },
                totalPaymentAmount: { $sum: '$paymentAmount' },
                totalTDSAmount: { $sum: '$tdsAmount' },
                totalChallanAmount: { $sum: '$challanAmount' },
                pendingEntries: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                depositedEntries: {
                    $sum: { $cond: [{ $eq: ['$status', 'deposited'] }, 1, 0] }
                },
                filedEntries: {
                    $sum: { $cond: [{ $eq: ['$status', 'filed'] }, 1, 0] }
                }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    return summary;
};

// Static method to generate Form 26Q data
tdsEntrySchema.statics.generateForm26Q = async function (quarter, financialYear) {
    const entries = await this.find({
        quarter: quarter,
        financialYear: financialYear,
        status: { $in: ['deposited', 'filed', 'completed'] }
    }).sort({ paymentDate: 1 });

    const form26Q = {
        quarter: quarter,
        financialYear: financialYear,
        assessmentYear: entries[0]?.assessmentYear,
        totalEntries: entries.length,
        totalTDSAmount: entries.reduce((sum, entry) => sum + entry.tdsAmount, 0),
        totalPaymentAmount: entries.reduce((sum, entry) => sum + entry.paymentAmount, 0),
        entries: entries.map(entry => ({
            srNo: entries.indexOf(entry) + 1,
            deducteeName: entry.deducteeName,
            deducteePAN: entry.deducteePAN,
            sectionCode: entry.sectionCode,
            paymentAmount: entry.paymentAmount,
            tdsAmount: entry.tdsAmount,
            paymentDate: entry.paymentDate,
            challanNumber: entry.challanNumber,
            challanDate: entry.challanDate
        }))
    };

    return form26Q;
};

module.exports = mongoose.model('TDSEntry', tdsEntrySchema);