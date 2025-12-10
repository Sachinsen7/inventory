const mongoose = require('mongoose');

const bankStatementEntrySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    description: { type: String, required: true },
    chequeNumber: { type: String },
    debitAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    matched: { type: Boolean, default: false },
    matchedVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    matchedLedgerEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerEntry' },
    reconciliationId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankReconciliation' }
});

const bankReconciliationSchema = new mongoose.Schema({
    bankAccount: { type: String, required: true }, // Bank account name
    accountNumber: { type: String, required: true },
    statementPeriod: {
        fromDate: { type: Date, required: true },
        toDate: { type: Date, required: true }
    },
    openingBalance: { type: Number, required: true },
    closingBalance: { type: Number, required: true },

    // Bank statement entries
    bankEntries: [bankStatementEntrySchema],

    // Book entries (from vouchers/ledger)
    bookEntries: [{
        voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
        ledgerEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerEntry' },
        date: { type: Date, required: true },
        description: { type: String, required: true },
        chequeNumber: { type: String },
        debitAmount: { type: Number, default: 0 },
        creditAmount: { type: Number, default: 0 },
        matched: { type: Boolean, default: false },
        matchedBankEntryId: { type: mongoose.Schema.Types.ObjectId }
    }],

    // Reconciliation summary
    summary: {
        totalBankDebits: { type: Number, default: 0 },
        totalBankCredits: { type: Number, default: 0 },
        totalBookDebits: { type: Number, default: 0 },
        totalBookCredits: { type: Number, default: 0 },
        matchedEntries: { type: Number, default: 0 },
        unmatchedBankEntries: { type: Number, default: 0 },
        unmatchedBookEntries: { type: Number, default: 0 },
        reconciliationDifference: { type: Number, default: 0 }
    },

    status: {
        type: String,
        enum: ['Draft', 'In Progress', 'Completed', 'Approved'],
        default: 'Draft'
    },

    // Audit trail
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date }
});

// Calculate summary before saving
bankReconciliationSchema.pre('save', function (next) {
    // Calculate bank totals
    this.summary.totalBankDebits = this.bankEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
    this.summary.totalBankCredits = this.bankEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);

    // Calculate book totals
    this.summary.totalBookDebits = this.bookEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
    this.summary.totalBookCredits = this.bookEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);

    // Count matched entries
    this.summary.matchedEntries = this.bankEntries.filter(entry => entry.matched).length;
    this.summary.unmatchedBankEntries = this.bankEntries.filter(entry => !entry.matched).length;
    this.summary.unmatchedBookEntries = this.bookEntries.filter(entry => !entry.matched).length;

    // Calculate reconciliation difference
    const bankBalance = this.openingBalance + this.summary.totalBankCredits - this.summary.totalBankDebits;
    const bookBalance = this.openingBalance + this.summary.totalBookCredits - this.summary.totalBookDebits;
    this.summary.reconciliationDifference = Math.abs(bankBalance - bookBalance);

    this.updatedAt = Date.now();
    next();
});

// Static method to auto-match entries
bankReconciliationSchema.statics.autoMatch = function (reconciliationId) {
    return this.findById(reconciliationId).then(reconciliation => {
        if (!reconciliation) throw new Error('Reconciliation not found');

        let matchCount = 0;

        // Auto-match by cheque number and amount
        reconciliation.bankEntries.forEach(bankEntry => {
            if (!bankEntry.matched && bankEntry.chequeNumber) {
                const matchingBookEntry = reconciliation.bookEntries.find(bookEntry =>
                    !bookEntry.matched &&
                    bookEntry.chequeNumber === bankEntry.chequeNumber &&
                    Math.abs((bookEntry.debitAmount || 0) - (bankEntry.debitAmount || 0)) < 0.01 &&
                    Math.abs((bookEntry.creditAmount || 0) - (bankEntry.creditAmount || 0)) < 0.01
                );

                if (matchingBookEntry) {
                    bankEntry.matched = true;
                    bankEntry.matchedLedgerEntryId = matchingBookEntry.ledgerEntryId;
                    matchingBookEntry.matched = true;
                    matchingBookEntry.matchedBankEntryId = bankEntry._id;
                    matchCount++;
                }
            }
        });

        // Auto-match by amount and date (within 3 days)
        reconciliation.bankEntries.forEach(bankEntry => {
            if (!bankEntry.matched) {
                const matchingBookEntry = reconciliation.bookEntries.find(bookEntry =>
                    !bookEntry.matched &&
                    Math.abs(bankEntry.date - bookEntry.date) <= 3 * 24 * 60 * 60 * 1000 && // 3 days
                    Math.abs((bookEntry.debitAmount || 0) - (bankEntry.debitAmount || 0)) < 0.01 &&
                    Math.abs((bookEntry.creditAmount || 0) - (bankEntry.creditAmount || 0)) < 0.01
                );

                if (matchingBookEntry) {
                    bankEntry.matched = true;
                    bankEntry.matchedLedgerEntryId = matchingBookEntry.ledgerEntryId;
                    matchingBookEntry.matched = true;
                    matchingBookEntry.matchedBankEntryId = bankEntry._id;
                    matchCount++;
                }
            }
        });

        return reconciliation.save().then(() => ({ matchCount }));
    });
};

// Method to import bank statement from CSV
bankReconciliationSchema.statics.importBankStatement = function (reconciliationId, csvData) {
    return this.findById(reconciliationId).then(reconciliation => {
        if (!reconciliation) throw new Error('Reconciliation not found');

        const entries = csvData.map(row => ({
            date: new Date(row.date),
            description: row.description || row.narration || '',
            chequeNumber: row.chequeNumber || row.chqNo || '',
            debitAmount: parseFloat(row.debitAmount || row.debit || 0),
            creditAmount: parseFloat(row.creditAmount || row.credit || 0),
            balance: parseFloat(row.balance || 0)
        }));

        reconciliation.bankEntries = entries;
        return reconciliation.save();
    });
};

// Method to load book entries from ledger
bankReconciliationSchema.methods.loadBookEntries = function () {
    const LedgerEntry = mongoose.model('LedgerEntry');
    const Voucher = mongoose.model('Voucher');

    return LedgerEntry.find({
        accountName: this.bankAccount,
        date: {
            $gte: this.statementPeriod.fromDate,
            $lte: this.statementPeriod.toDate
        }
    }).populate('voucherId').then(ledgerEntries => {
        this.bookEntries = ledgerEntries.map(entry => ({
            voucherId: entry.voucherId?._id,
            ledgerEntryId: entry._id,
            date: entry.date,
            description: entry.narration || entry.voucherId?.narration || '',
            chequeNumber: entry.voucherId?.bankDetails?.chequeNumber || '',
            debitAmount: entry.debitAmount || 0,
            creditAmount: entry.creditAmount || 0,
            matched: false
        }));

        return this.save();
    });
};

const BankReconciliation = mongoose.model('BankReconciliation', bankReconciliationSchema);
module.exports = BankReconciliation;