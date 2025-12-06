const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    gstin: { type: String, required: true, unique: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    phoneNumber: { type: String },
    email: { type: String },

    // Opening & Closing Balance
    openingBalance: {
        type: Number,
        default: 0
    },
    openingBalanceType: {
        type: String,
        enum: ['debit', 'credit'],
        default: 'credit' // Suppliers usually have credit balance
    },
    openingBalanceDate: {
        type: Date
    },
    closingBalance: {
        type: Number,
        default: 0
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Calculate closing balance
supplierSchema.methods.calculateClosingBalance = async function () {
    const PurchaseBill = mongoose.model('PurchaseBill');
    const LedgerEntry = mongoose.model('LedgerEntry');

    // Get all purchase bills from this supplier
    const bills = await PurchaseBill.find({ supplierId: this._id });
    const totalPurchases = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

    // Get all payments to supplier
    const payments = await LedgerEntry.find({
        supplierId: this._id,
        type: 'payment'
    });
    const totalPayments = payments.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Get all debit notes
    const debitNotes = await LedgerEntry.find({
        supplierId: this._id,
        type: 'debit_note'
    });
    const totalDebitNotes = debitNotes.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Calculate closing balance
    let closing = this.openingBalance || 0;

    if (this.openingBalanceType === 'credit') {
        closing = closing + totalPurchases - totalPayments - totalDebitNotes;
    } else {
        closing = closing - totalPurchases + totalPayments + totalDebitNotes;
    }

    this.closingBalance = closing;
    await this.save();

    return closing;
};

module.exports = mongoose.model('Supplier', supplierSchema);
