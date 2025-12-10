const mongoose = require('mongoose');

const chequeEntrySchema = new mongoose.Schema({
    chequeNumber: { type: String, required: true },
    date: { type: Date, required: true },
    payeeName: { type: String, required: true },
    amount: { type: Number, required: true },
    amountInWords: { type: String, required: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    status: {
        type: String,
        enum: ['Issued', 'Cleared', 'Cancelled', 'Bounced'],
        default: 'Issued'
    },
    clearanceDate: { type: Date },
    remarks: { type: String },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const chequeBookSchema = new mongoose.Schema({
    bankAccount: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    branchName: { type: String, required: true },
    ifscCode: { type: String, required: true },

    // Cheque book details
    chequeBookNumber: { type: String, required: true },
    startingChequeNumber: { type: String, required: true },
    endingChequeNumber: { type: String, required: true },
    totalCheques: { type: Number, required: true },

    // Current status
    currentChequeNumber: { type: String },
    issuedCheques: { type: Number, default: 0 },
    remainingCheques: { type: Number },

    // Cheque entries
    cheques: [chequeEntrySchema],

    // Settings
    chequeFormat: {
        width: { type: Number, default: 200 }, // mm
        height: { type: Number, default: 85 }, // mm
        payeeNameX: { type: Number, default: 20 },
        payeeNameY: { type: Number, default: 25 },
        amountX: { type: Number, default: 150 },
        amountY: { type: Number, default: 25 },
        amountInWordsX: { type: Number, default: 20 },
        amountInWordsY: { type: Number, default: 40 },
        dateX: { type: Number, default: 150 },
        dateY: { type: Number, default: 10 }
    },

    status: {
        type: String,
        enum: ['Active', 'Exhausted', 'Cancelled'],
        default: 'Active'
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Calculate remaining cheques before saving
chequeBookSchema.pre('save', function (next) {
    this.remainingCheques = this.totalCheques - this.issuedCheques;
    this.updatedAt = Date.now();

    if (this.remainingCheques <= 0) {
        this.status = 'Exhausted';
    }

    next();
});

// Method to get next cheque number
chequeBookSchema.methods.getNextChequeNumber = function () {
    if (this.remainingCheques <= 0) {
        throw new Error('No more cheques available in this book');
    }

    const startNum = parseInt(this.startingChequeNumber);
    const nextNum = startNum + this.issuedCheques;

    return nextNum.toString().padStart(this.startingChequeNumber.length, '0');
};

// Method to issue a cheque
chequeBookSchema.methods.issueCheque = function (chequeData) {
    const chequeNumber = this.getNextChequeNumber();

    const cheque = {
        chequeNumber,
        date: chequeData.date,
        payeeName: chequeData.payeeName,
        amount: chequeData.amount,
        amountInWords: chequeData.amountInWords,
        voucherId: chequeData.voucherId,
        issuedBy: chequeData.issuedBy,
        remarks: chequeData.remarks
    };

    this.cheques.push(cheque);
    this.issuedCheques += 1;
    this.currentChequeNumber = chequeNumber;

    return this.save().then(() => cheque);
};

// Method to cancel a cheque
chequeBookSchema.methods.cancelCheque = function (chequeNumber, reason) {
    const cheque = this.cheques.find(c => c.chequeNumber === chequeNumber);
    if (!cheque) {
        throw new Error('Cheque not found');
    }

    if (cheque.status !== 'Issued') {
        throw new Error('Only issued cheques can be cancelled');
    }

    cheque.status = 'Cancelled';
    cheque.remarks = reason;

    return this.save();
};

// Static method to convert number to words (Indian format)
chequeBookSchema.statics.numberToWords = function (amount) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(num) {
        let result = '';

        if (num > 99) {
            result += ones[Math.floor(num / 100)] + ' Hundred ';
            num %= 100;
        }

        if (num > 19) {
            result += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        } else if (num > 9) {
            result += teens[num - 10] + ' ';
            return result;
        }

        if (num > 0) {
            result += ones[num] + ' ';
        }

        return result;
    }

    if (amount === 0) return 'Zero Rupees Only';

    let result = '';
    let crores = Math.floor(amount / 10000000);
    amount %= 10000000;

    let lakhs = Math.floor(amount / 100000);
    amount %= 100000;

    let thousands = Math.floor(amount / 1000);
    amount %= 1000;

    let hundreds = Math.floor(amount);
    let paise = Math.round((amount - hundreds) * 100);

    if (crores > 0) {
        result += convertHundreds(crores) + 'Crore ';
    }

    if (lakhs > 0) {
        result += convertHundreds(lakhs) + 'Lakh ';
    }

    if (thousands > 0) {
        result += convertHundreds(thousands) + 'Thousand ';
    }

    if (hundreds > 0) {
        result += convertHundreds(hundreds);
    }

    result += 'Rupees ';

    if (paise > 0) {
        result += 'and ' + convertHundreds(paise) + 'Paise ';
    }

    result += 'Only';

    return result.trim();
};

const ChequeBook = mongoose.model('ChequeBook', chequeBookSchema);
module.exports = ChequeBook;