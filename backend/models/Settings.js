const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Invoice Numbering Settings
    invoiceFormat: {
        type: String,
        default: 'INV/{YY}-{MM}/{####}',
        required: true
    },
    nextInvoiceNumber: {
        type: Number,
        default: 1,
        required: true
    },
    invoicePrefix: {
        type: String,
        default: 'INV'
    },

    // Financial Year Settings
    financialYearStart: {
        type: String,
        default: '04-01' // April 1st
    },
    financialYearEnd: {
        type: String,
        default: '03-31' // March 31st
    },

    // Company Settings
    companyName: {
        type: String,
        default: 'Your Company Name'
    },
    companyGSTIN: {
        type: String,
        default: ''
    },
    companyAddress: {
        type: String,
        default: 'Your Company Address'
    },
    companyPhone: {
        type: String,
        default: ''
    },
    companyEmail: {
        type: String,
        default: ''
    },
    companyPAN: {
        type: String,
        default: ''
    },
    companyState: {
        type: String,
        default: 'Maharashtra'
    },
    companyStateCode: {
        type: String,
        default: '27'
    },

    // Voucher Configuration
    voucherSettings: {
        // Sales Voucher
        salesVoucherPrefix: {
            type: String,
            default: 'SV'
        },
        nextSalesVoucherNumber: {
            type: Number,
            default: 1
        },

        // Purchase Voucher
        purchaseVoucherPrefix: {
            type: String,
            default: 'PV'
        },
        nextPurchaseVoucherNumber: {
            type: Number,
            default: 1
        },

        // Receipt Voucher
        receiptVoucherPrefix: {
            type: String,
            default: 'RV'
        },
        nextReceiptVoucherNumber: {
            type: Number,
            default: 1
        },

        // Payment Voucher
        paymentVoucherPrefix: {
            type: String,
            default: 'PY'
        },
        nextPaymentVoucherNumber: {
            type: Number,
            default: 1
        },

        // Journal Voucher
        journalVoucherPrefix: {
            type: String,
            default: 'JV'
        },
        nextJournalVoucherNumber: {
            type: Number,
            default: 1
        },

        // Contra Voucher
        contraVoucherPrefix: {
            type: String,
            default: 'CV'
        },
        nextContraVoucherNumber: {
            type: Number,
            default: 1
        },

        // Debit Note
        debitNotePrefix: {
            type: String,
            default: 'DN'
        },
        nextDebitNoteNumber: {
            type: Number,
            default: 1
        },

        // Credit Note
        creditNotePrefix: {
            type: String,
            default: 'CN'
        },
        nextCreditNoteNumber: {
            type: Number,
            default: 1
        }
    },

    // GST Settings
    gstSettings: {
        enableGST: {
            type: Boolean,
            default: true
        },
        defaultGSTRate: {
            type: Number,
            default: 18
        },
        gstRegistrationDate: {
            type: Date
        },
        compositeScheme: {
            type: Boolean,
            default: false
        }
    },

    // TDS Settings
    tdsSettings: {
        enableTDS: {
            type: Boolean,
            default: false
        },
        tanNumber: {
            type: String,
            default: ''
        },
        defaultTDSRate: {
            type: Number,
            default: 10
        }
    },

    // Banking Settings
    bankingSettings: {
        enableBankReconciliation: {
            type: Boolean,
            default: true
        },
        defaultBankAccount: {
            type: String,
            default: ''
        },
        chequePrintingEnabled: {
            type: Boolean,
            default: false
        }
    },

    // Accounting Settings
    accountingSettings: {
        enableMultiCurrency: {
            type: Boolean,
            default: false
        },
        baseCurrency: {
            type: String,
            default: 'INR'
        },
        decimalPlaces: {
            type: Number,
            default: 2
        },
        enableCostCenters: {
            type: Boolean,
            default: false
        },
        enableBudgets: {
            type: Boolean,
            default: false
        }
    },

    // Report Settings
    reportSettings: {
        defaultDateRange: {
            type: String,
            default: 'current_month'
        },
        showZeroBalances: {
            type: Boolean,
            default: false
        },
        groupSimilarItems: {
            type: Boolean,
            default: true
        }
    },

    // Other Settings
    enableAutoBackup: {
        type: Boolean,
        default: false
    },
    backupFrequency: {
        type: String,
        default: 'daily'
    },

    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: String
}, {
    timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        console.log('No settings found, creating default settings...');
        settings = await this.create({
            invoiceFormat: 'INV/{YY}-{MM}/{####}',
            nextInvoiceNumber: 1,
            invoicePrefix: 'INV',
            financialYearStart: '04-01',
            financialYearEnd: '03-31',
            companyName: 'Your Company Name',
            companyState: 'Maharashtra',
            companyStateCode: '27',
            voucherSettings: {
                salesVoucherPrefix: 'SV',
                nextSalesVoucherNumber: 1,
                purchaseVoucherPrefix: 'PV',
                nextPurchaseVoucherNumber: 1,
                receiptVoucherPrefix: 'RV',
                nextReceiptVoucherNumber: 1,
                paymentVoucherPrefix: 'PY',
                nextPaymentVoucherNumber: 1,
                journalVoucherPrefix: 'JV',
                nextJournalVoucherNumber: 1,
                contraVoucherPrefix: 'CV',
                nextContraVoucherNumber: 1,
                debitNotePrefix: 'DN',
                nextDebitNoteNumber: 1,
                creditNotePrefix: 'CN',
                nextCreditNoteNumber: 1
            },
            gstSettings: {
                enableGST: true,
                defaultGSTRate: 18
            },
            tdsSettings: {
                enableTDS: false,
                defaultTDSRate: 10
            },
            bankingSettings: {
                enableBankReconciliation: true,
                chequePrintingEnabled: false
            },
            accountingSettings: {
                enableMultiCurrency: false,
                baseCurrency: 'INR',
                decimalPlaces: 2,
                enableCostCenters: false,
                enableBudgets: false
            },
            reportSettings: {
                defaultDateRange: 'current_month',
                showZeroBalances: false,
                groupSimilarItems: true
            }
        });
        console.log('Default settings created:', settings);
    }
    return settings;
};

// Method to get next voucher number
settingsSchema.statics.getNextVoucherNumber = async function (voucherType) {
    const settings = await this.getSettings();
    const voucherSettings = settings.voucherSettings;

    let currentNumber, prefix;

    switch (voucherType.toLowerCase()) {
        case 'sales':
            currentNumber = voucherSettings.nextSalesVoucherNumber;
            prefix = voucherSettings.salesVoucherPrefix;
            voucherSettings.nextSalesVoucherNumber += 1;
            break;
        case 'purchase':
            currentNumber = voucherSettings.nextPurchaseVoucherNumber;
            prefix = voucherSettings.purchaseVoucherPrefix;
            voucherSettings.nextPurchaseVoucherNumber += 1;
            break;
        case 'receipt':
            currentNumber = voucherSettings.nextReceiptVoucherNumber;
            prefix = voucherSettings.receiptVoucherPrefix;
            voucherSettings.nextReceiptVoucherNumber += 1;
            break;
        case 'payment':
            currentNumber = voucherSettings.nextPaymentVoucherNumber;
            prefix = voucherSettings.paymentVoucherPrefix;
            voucherSettings.nextPaymentVoucherNumber += 1;
            break;
        case 'journal':
            currentNumber = voucherSettings.nextJournalVoucherNumber;
            prefix = voucherSettings.journalVoucherPrefix;
            voucherSettings.nextJournalVoucherNumber += 1;
            break;
        case 'contra':
            currentNumber = voucherSettings.nextContraVoucherNumber;
            prefix = voucherSettings.contraVoucherPrefix;
            voucherSettings.nextContraVoucherNumber += 1;
            break;
        case 'debit_note':
            currentNumber = voucherSettings.nextDebitNoteNumber;
            prefix = voucherSettings.debitNotePrefix;
            voucherSettings.nextDebitNoteNumber += 1;
            break;
        case 'credit_note':
            currentNumber = voucherSettings.nextCreditNoteNumber;
            prefix = voucherSettings.creditNotePrefix;
            voucherSettings.nextCreditNoteNumber += 1;
            break;
        default:
            throw new Error(`Unknown voucher type: ${voucherType}`);
    }

    await settings.save();

    const voucherNumber = `${prefix}/${String(currentNumber).padStart(4, '0')}`;
    return { voucherNumber, currentNumber, prefix };
};

settingsSchema.statics.updateSettings = async function (updates) {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create(updates);
    } else {
        Object.assign(settings, updates);
        settings.lastUpdated = Date.now();
        await settings.save();
    }
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
