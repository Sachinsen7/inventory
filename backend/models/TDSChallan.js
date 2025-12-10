const mongoose = require('mongoose');

const tdsChallanSchema = new mongoose.Schema({
    // Challan Details
    challanNumber: {
        type: String,
        required: true,
        unique: true
    },
    challanDate: {
        type: Date,
        required: true
    },

    // Payment Details
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },

    // Bank Details
    bankName: {
        type: String,
        required: true
    },
    bankCode: {
        type: String
    },
    branchName: {
        type: String
    },

    // Period Details
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

    // TDS Breakdown by Section
    sectionWiseBreakup: [{
        sectionCode: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        entryCount: {
            type: Number,
            required: true,
            min: 0
        }
    }],

    // Status
    status: {
        type: String,
        enum: ['pending', 'paid', 'verified', 'cancelled'],
        default: 'pending'
    },

    // Payment Mode
    paymentMode: {
        type: String,
        enum: ['online', 'challan', 'cash', 'cheque', 'dd'],
        default: 'online'
    },

    // Transaction Details
    transactionId: {
        type: String
    },
    utr: {
        type: String
    },

    // Verification Details
    verificationDate: {
        type: Date
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Associated TDS Entries
    tdsEntries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TDSEntry'
    }],

    // Additional Details
    remarks: {
        type: String
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

// Indexes
tdsChallanSchema.index({ challanNumber: 1 });
tdsChallanSchema.index({ quarter: 1, financialYear: 1 });
tdsChallanSchema.index({ challanDate: 1 });
tdsChallanSchema.index({ status: 1 });

// Pre-save middleware to set assessment year
tdsChallanSchema.pre('save', function (next) {
    if (this.financialYear && !this.assessmentYear) {
        const startYear = parseInt(this.financialYear.split('-')[0]);
        this.assessmentYear = `${startYear + 1}-${(startYear + 2).toString().slice(-2)}`;
    }
    next();
});

// Static method to create challan from TDS entries
tdsChallanSchema.statics.createFromTDSEntries = async function (tdsEntryIds, challanDetails) {
    const TDSEntry = mongoose.model('TDSEntry');

    // Get TDS entries
    const tdsEntries = await TDSEntry.find({ _id: { $in: tdsEntryIds } });

    if (tdsEntries.length === 0) {
        throw new Error('No TDS entries found');
    }

    // Calculate totals and section-wise breakup
    const sectionWiseBreakup = {};
    let totalAmount = 0;

    tdsEntries.forEach(entry => {
        if (!sectionWiseBreakup[entry.sectionCode]) {
            sectionWiseBreakup[entry.sectionCode] = {
                sectionCode: entry.sectionCode,
                amount: 0,
                entryCount: 0
            };
        }

        sectionWiseBreakup[entry.sectionCode].amount += entry.tdsAmount;
        sectionWiseBreakup[entry.sectionCode].entryCount += 1;
        totalAmount += entry.tdsAmount;
    });

    // Generate challan number
    const challanNumber = await this.generateChallanNumber();

    // Create challan
    const challan = new this({
        challanNumber,
        challanDate: challanDetails.challanDate || new Date(),
        totalAmount,
        bankName: challanDetails.bankName,
        bankCode: challanDetails.bankCode,
        branchName: challanDetails.branchName,
        quarter: tdsEntries[0].quarter,
        financialYear: tdsEntries[0].financialYear,
        sectionWiseBreakup: Object.values(sectionWiseBreakup),
        paymentMode: challanDetails.paymentMode || 'online',
        transactionId: challanDetails.transactionId,
        utr: challanDetails.utr,
        tdsEntries: tdsEntryIds,
        remarks: challanDetails.remarks,
        createdBy: challanDetails.createdBy
    });

    await challan.save();

    // Update TDS entries with challan details
    await TDSEntry.updateMany(
        { _id: { $in: tdsEntryIds } },
        {
            $set: {
                challanNumber: challanNumber,
                challanDate: challan.challanDate,
                challanAmount: totalAmount,
                bankName: challanDetails.bankName,
                status: 'deposited'
            }
        }
    );

    return challan;
};

// Static method to generate challan number
tdsChallanSchema.statics.generateChallanNumber = async function () {
    const currentDate = new Date();
    const year = currentDate.getFullYear().toString().slice(-2);
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    // Find the last challan for current month
    const lastChallan = await this.findOne({
        challanNumber: { $regex: `^TDS${year}${month}` }
    }).sort({ challanNumber: -1 });

    let sequence = 1;
    if (lastChallan) {
        const lastSequence = parseInt(lastChallan.challanNumber.slice(-4));
        sequence = lastSequence + 1;
    }

    return `TDS${year}${month}${String(sequence).padStart(4, '0')}`;
};

// Instance method to verify payment
tdsChallanSchema.methods.verifyPayment = async function (verificationDetails) {
    this.status = 'verified';
    this.verificationDate = new Date();
    this.verifiedBy = verificationDetails.verifiedBy;

    if (verificationDetails.utr) {
        this.utr = verificationDetails.utr;
    }

    await this.save();

    // Update associated TDS entries
    const TDSEntry = mongoose.model('TDSEntry');
    await TDSEntry.updateMany(
        { _id: { $in: this.tdsEntries } },
        { $set: { status: 'filed' } }
    );

    return this;
};

// Static method to get challan summary
tdsChallanSchema.statics.getChallanSummary = async function (quarter, financialYear) {
    const summary = await this.aggregate([
        {
            $match: {
                quarter: quarter,
                financialYear: financialYear
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' }
            }
        }
    ]);

    const totalSummary = await this.aggregate([
        {
            $match: {
                quarter: quarter,
                financialYear: financialYear
            }
        },
        {
            $group: {
                _id: null,
                totalChallans: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                paidAmount: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['paid', 'verified']] },
                            '$totalAmount',
                            0
                        ]
                    }
                },
                pendingAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'pending'] },
                            '$totalAmount',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    return {
        statusWise: summary,
        total: totalSummary[0] || {
            totalChallans: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0
        }
    };
};

module.exports = mongoose.model('TDSChallan', tdsChallanSchema);