const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    gstNo: { type: String },
    phoneNumber: { type: String },
    specialPriceStartDate: { type: Date },
    specialPriceEndDate: { type: Date },

    // Opening & Closing Balance
    openingBalance: {
        type: Number,
        default: 0
    },
    openingBalanceType: {
        type: String,
        enum: ['debit', 'credit'],
        default: 'debit'
    },
    openingBalanceDate: {
        type: Date
    },
    closingBalance: {
        type: Number,
        default: 0
    },

    // Credit Limit
    creditLimit: {
        type: Number,
        default: 0
    },
    creditLimitEnabled: {
        type: Boolean,
        default: false
    },
    paymentTerms: {
        type: Number,
        default: 30 // days
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Calculate closing balance
customerSchema.methods.calculateClosingBalance = async function () {
    const Bill = mongoose.model('Bill');
    const LedgerEntry = mongoose.model('LedgerEntry');

    // Get all bills for this customer
    const bills = await Bill.find({ customerId: this._id });
    const totalInvoices = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

    // Get all payments
    const payments = await LedgerEntry.find({
        customerId: this._id,
        type: 'payment'
    });
    const totalPayments = payments.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Get all credit notes
    const creditNotes = await LedgerEntry.find({
        customerId: this._id,
        type: 'credit_note'
    });
    const totalCreditNotes = creditNotes.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Calculate closing balance
    let closing = this.openingBalance || 0;

    if (this.openingBalanceType === 'debit') {
        closing = closing + totalInvoices - totalPayments - totalCreditNotes;
    } else {
        closing = closing - totalInvoices + totalPayments + totalCreditNotes;
    }

    this.closingBalance = closing;
    await this.save();

    return closing;
};

// Check if customer has exceeded credit limit
customerSchema.methods.checkCreditLimit = async function (newBillAmount = 0) {
    if (!this.creditLimitEnabled || this.creditLimit === 0) {
        return {
            allowed: true,
            message: 'Credit limit not enabled'
        };
    }

    await this.calculateClosingBalance();
    const currentOutstanding = this.closingBalance;
    const totalOutstanding = currentOutstanding + newBillAmount;

    if (totalOutstanding > this.creditLimit) {
        return {
            allowed: false,
            exceeded: true,
            currentOutstanding,
            creditLimit: this.creditLimit,
            newBillAmount,
            totalOutstanding,
            exceededBy: totalOutstanding - this.creditLimit,
            message: `Credit limit exceeded! Current: ₹${currentOutstanding}, New Bill: ₹${newBillAmount}, Total: ₹${totalOutstanding}, Limit: ₹${this.creditLimit}`
        };
    }

    return {
        allowed: true,
        exceeded: false,
        currentOutstanding,
        creditLimit: this.creditLimit,
        newBillAmount,
        totalOutstanding,
        available: this.creditLimit - totalOutstanding,
        message: 'Within credit limit'
    };
};

module.exports = mongoose.model('Customer', customerSchema);
