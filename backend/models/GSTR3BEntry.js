const mongoose = require('mongoose');

const gstr3bEntrySchema = new mongoose.Schema({
    // Period Information
    period: {
        type: String,
        required: true // Format: MMYYYY (e.g., 122024 for Dec 2024)
    },
    financialYear: {
        type: String,
        required: true // Format: 2024-25
    },

    // Return Status
    returnStatus: {
        type: String,
        enum: ['draft', 'filed', 'amended'],
        default: 'draft'
    },
    filedDate: Date,
    acknowledgmentNumber: String,

    // 3.1 Outward Supplies (from GSTR-1)
    outwardSupplies: {
        // 3.1(a) Taxable outward supplies
        taxableSupplies: {
            taxableValue: { type: Number, default: 0 },
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 3.1(b) Taxable outward supplies (zero rated)
        zeroRatedSupplies: {
            taxableValue: { type: Number, default: 0 },
            igstAmount: { type: Number, default: 0 }
        },

        // 3.1(c) Other outward supplies (Nil rated, exempted)
        otherSupplies: {
            nilRated: { type: Number, default: 0 },
            exempted: { type: Number, default: 0 },
            nonGST: { type: Number, default: 0 }
        }
    },

    // 3.2 Inward Supplies (from GSTR-2A/2B)
    inwardSupplies: {
        // 3.2(a) Inward supplies liable to reverse charge
        reverseCharge: {
            taxableValue: { type: Number, default: 0 },
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 3.2(b) Inward supplies from ISD
        isdSupplies: {
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        }
    },

    // 4. Eligible ITC
    eligibleITC: {
        // 4(A) ITC Available
        itcAvailable: {
            // 4(A)(1) Import of goods
            importGoods: {
                igstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            },

            // 4(A)(2) Import of services
            importServices: {
                igstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            },

            // 4(A)(3) Inward supplies liable to reverse charge
            reverseCharge: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            },

            // 4(A)(4) Inward supplies from ISD
            isdSupplies: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            },

            // 4(A)(5) All other ITC
            otherITC: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            }
        },

        // 4(B) ITC Reversed
        itcReversed: {
            // 4(B)(1) As per Rule 42 & 43 of CGST Rules
            rule42_43: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            },

            // 4(B)(2) Others
            others: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            }
        },

        // 4(C) Net ITC Available
        netITC: {
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 4(D) Ineligible ITC
        ineligibleITC: {
            // 4(D)(1) As per section 17(5)
            section17_5: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            },

            // 4(D)(2) Others
            others: {
                igstAmount: { type: Number, default: 0 },
                cgstAmount: { type: Number, default: 0 },
                sgstAmount: { type: Number, default: 0 },
                cessAmount: { type: Number, default: 0 }
            }
        }
    },

    // 5. Values of exempt, nil-rated and non-taxable supplies
    exemptSupplies: {
        interState: { type: Number, default: 0 },
        intraState: { type: Number, default: 0 }
    },

    // 6. Payment of Tax
    taxPayment: {
        // 6.1 Tax payable on outward supplies
        taxPayable: {
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 6.2 Tax paid through ITC
        taxPaidThroughITC: {
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 6.3 Tax/Cess paid in cash
        taxPaidInCash: {
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 6.4 Interest paid
        interestPaid: {
            igstAmount: { type: Number, default: 0 },
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 },
            cessAmount: { type: Number, default: 0 }
        },

        // 6.5 Late fee paid
        lateFeePaid: {
            cgstAmount: { type: Number, default: 0 },
            sgstAmount: { type: Number, default: 0 }
        }
    },

    // Auto-calculation flags
    autoCalculated: {
        type: Boolean,
        default: true
    },
    calculationDate: {
        type: Date,
        default: Date.now
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,

    // Validation
    validationStatus: {
        type: String,
        enum: ['valid', 'invalid', 'warning'],
        default: 'valid'
    },
    validationErrors: [String]
}, {
    timestamps: true
});

// Indexes
gstr3bEntrySchema.index({ period: 1 });
gstr3bEntrySchema.index({ financialYear: 1 });
gstr3bEntrySchema.index({ returnStatus: 1 });

// Static method to auto-calculate GSTR-3B from GSTR-1 and GSTR-2
gstr3bEntrySchema.statics.autoCalculate = async function (period, financialYear) {
    const GSTR1Entry = mongoose.model('GSTR1Entry');
    const GSTR2Entry = mongoose.model('GSTR2Entry');

    // Get GSTR-1 data (outward supplies)
    const gstr1Data = await GSTR1Entry.aggregate([
        { $match: { period, financialYear } },
        {
            $group: {
                _id: null,
                totalTaxableValue: { $sum: '$taxableValue' },
                totalCGST: { $sum: '$cgstAmount' },
                totalSGST: { $sum: '$sgstAmount' },
                totalIGST: { $sum: '$igstAmount' },
                totalCess: { $sum: '$cessAmount' }
            }
        }
    ]);

    // Get GSTR-2 data (inward supplies)
    const gstr2Data = await GSTR2Entry.aggregate([
        { $match: { period } },
        {
            $group: {
                _id: null,
                totalTaxableValue: { $sum: '$taxableValue' },
                totalCGST: { $sum: '$cgst' },
                totalSGST: { $sum: '$sgst' },
                totalIGST: { $sum: '$igst' },
                totalCess: { $sum: '$cess' },
                totalITC: { $sum: '$itcAvailable' }
            }
        }
    ]);

    const outward = gstr1Data[0] || {};
    const inward = gstr2Data[0] || {};

    // Calculate GSTR-3B data
    const gstr3bData = {
        period,
        financialYear,

        // 3.1 Outward supplies
        outwardSupplies: {
            taxableSupplies: {
                taxableValue: outward.totalTaxableValue || 0,
                igstAmount: outward.totalIGST || 0,
                cgstAmount: outward.totalCGST || 0,
                sgstAmount: outward.totalSGST || 0,
                cessAmount: outward.totalCess || 0
            }
        },

        // 4. Eligible ITC
        eligibleITC: {
            itcAvailable: {
                otherITC: {
                    igstAmount: inward.totalIGST || 0,
                    cgstAmount: inward.totalCGST || 0,
                    sgstAmount: inward.totalSGST || 0,
                    cessAmount: inward.totalCess || 0
                }
            },
            netITC: {
                igstAmount: inward.totalIGST || 0,
                cgstAmount: inward.totalCGST || 0,
                sgstAmount: inward.totalSGST || 0,
                cessAmount: inward.totalCess || 0
            }
        },

        // 6. Tax payment calculation
        taxPayment: {
            taxPayable: {
                igstAmount: (outward.totalIGST || 0),
                cgstAmount: (outward.totalCGST || 0),
                sgstAmount: (outward.totalSGST || 0),
                cessAmount: (outward.totalCess || 0)
            },
            taxPaidThroughITC: {
                igstAmount: Math.min(outward.totalIGST || 0, inward.totalIGST || 0),
                cgstAmount: Math.min(outward.totalCGST || 0, inward.totalCGST || 0),
                sgstAmount: Math.min(outward.totalSGST || 0, inward.totalSGST || 0),
                cessAmount: Math.min(outward.totalCess || 0, inward.totalCess || 0)
            }
        },

        autoCalculated: true,
        calculationDate: new Date()
    };

    // Calculate tax to be paid in cash
    gstr3bData.taxPayment.taxPaidInCash = {
        igstAmount: Math.max(0, (outward.totalIGST || 0) - (inward.totalIGST || 0)),
        cgstAmount: Math.max(0, (outward.totalCGST || 0) - (inward.totalCGST || 0)),
        sgstAmount: Math.max(0, (outward.totalSGST || 0) - (inward.totalSGST || 0)),
        cessAmount: Math.max(0, (outward.totalCess || 0) - (inward.totalCess || 0))
    };

    // Find existing entry or create new
    let gstr3bEntry = await this.findOne({ period, financialYear });

    if (gstr3bEntry) {
        Object.assign(gstr3bEntry, gstr3bData);
        await gstr3bEntry.save();
    } else {
        gstr3bEntry = await this.create(gstr3bData);
    }

    return gstr3bEntry;
};

module.exports = mongoose.model('GSTR3BEntry', gstr3bEntrySchema);