const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Order Details
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },

    // Customer Details
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: String,
    customerAddress: String,

    // Items
    items: [{
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        total: { type: Number, required: true }
    }],

    // Amounts
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'confirmed', 'processing', 'completed', 'cancelled'],
        default: 'pending'
    },

    // Delivery
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    deliveryAddress: String,

    // Payment
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid'
    },
    paidAmount: {
        type: Number,
        default: 0
    },

    // Conversion
    convertedToBill: {
        type: Boolean,
        default: false
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    },
    billNumber: String,

    // Notes
    notes: String,
    internalNotes: String,

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Generate order number
orderSchema.statics.generateOrderNumber = async function () {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');

    const prefix = `ORD-${year}${month}`;

    // Find the last order with this prefix
    const lastOrder = await this.findOne({
        orderNumber: new RegExp(`^${prefix}`)
    }).sort({ orderNumber: -1 });

    let sequence = 1;
    if (lastOrder) {
        const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop());
        sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(5, '0')}`;
};

// Check if order is overdue
orderSchema.methods.isOverdue = function () {
    if (!this.expectedDeliveryDate || this.status === 'completed' || this.status === 'cancelled') {
        return false;
    }
    return new Date() > this.expectedDeliveryDate;
};

// Get days pending
orderSchema.methods.getDaysPending = function () {
    if (this.status === 'completed' || this.status === 'cancelled') {
        return 0;
    }
    const today = new Date();
    const orderDate = new Date(this.orderDate);
    return Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Order', orderSchema);
