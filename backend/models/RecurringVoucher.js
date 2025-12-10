const mongoose = require('mongoose');

const recurringVoucherSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },

    // Template Reference
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoucherTemplate',
        required: true
    },

    // Recurrence Settings
    frequency: {
        type: String,
        required: true,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    interval: {
        type: Number,
        default: 1, // Every 1 month, 2 weeks, etc.
    },

    // Schedule Settings
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date // Optional - if not set, runs indefinitely
    },
    nextRunDate: {
        type: Date,
        required: true
    },

    // Monthly/Yearly specific settings
    dayOfMonth: {
        type: Number, // For monthly: 1-31, for yearly: day of year
        min: 1,
        max: 31
    },
    monthOfYear: {
        type: Number, // For yearly recurrence: 1-12
        min: 1,
        max: 12
    },
    weekDay: {
        type: Number, // For weekly: 0-6 (Sunday-Saturday)
        min: 0,
        max: 6
    },

    // Status and Control
    isActive: {
        type: Boolean,
        default: true
    },
    isPaused: {
        type: Boolean,
        default: false
    },

    // Execution History
    lastRunDate: {
        type: Date
    },
    totalRuns: {
        type: Number,
        default: 0
    },
    successfulRuns: {
        type: Number,
        default: 0
    },
    failedRuns: {
        type: Number,
        default: 0
    },

    // Variable Values (for template variables)
    variableValues: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map()
    },

    // Auto-approval Settings
    autoApprove: {
        type: Boolean,
        default: false
    },
    maxAutoApprovalAmount: {
        type: Number,
        default: 0
    },

    // Notification Settings
    notifyOnSuccess: {
        type: Boolean,
        default: false
    },
    notifyOnFailure: {
        type: Boolean,
        default: true
    },
    notificationEmails: [{
        type: String,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }],

    // Error Handling
    lastError: {
        message: String,
        date: Date,
        details: mongoose.Schema.Types.Mixed
    },
    retryCount: {
        type: Number,
        default: 0
    },
    maxRetries: {
        type: Number,
        default: 3
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
recurringVoucherSchema.index({ nextRunDate: 1, isActive: 1 });
recurringVoucherSchema.index({ templateId: 1 });
recurringVoucherSchema.index({ frequency: 1 });
recurringVoucherSchema.index({ isActive: 1, isPaused: 1 });

// Pre-save middleware to calculate next run date
recurringVoucherSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('frequency') || this.isModified('interval') || this.isModified('startDate')) {
        this.calculateNextRunDate();
    }
    next();
});

// Instance method to calculate next run date
recurringVoucherSchema.methods.calculateNextRunDate = function () {
    const baseDate = this.lastRunDate || this.startDate;
    let nextDate = new Date(baseDate);

    switch (this.frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + this.interval);
            break;

        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * this.interval));
            if (this.weekDay !== undefined) {
                // Adjust to specific weekday
                const dayDiff = this.weekDay - nextDate.getDay();
                nextDate.setDate(nextDate.getDate() + dayDiff);
            }
            break;

        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + this.interval);
            if (this.dayOfMonth) {
                nextDate.setDate(this.dayOfMonth);
                // Handle month-end dates (e.g., Jan 31 -> Feb 28)
                if (nextDate.getDate() !== this.dayOfMonth) {
                    nextDate.setDate(0); // Last day of previous month
                }
            }
            break;

        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + (3 * this.interval));
            if (this.dayOfMonth) {
                nextDate.setDate(this.dayOfMonth);
            }
            break;

        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + this.interval);
            if (this.monthOfYear && this.dayOfMonth) {
                nextDate.setMonth(this.monthOfYear - 1, this.dayOfMonth);
            }
            break;
    }

    this.nextRunDate = nextDate;
    return nextDate;
};

// Instance method to execute recurring voucher
recurringVoucherSchema.methods.execute = async function () {
    try {
        const VoucherTemplate = mongoose.model('VoucherTemplate');

        // Get template
        const template = await VoucherTemplate.findById(this.templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        // Prepare variables with current values
        const variables = {
            voucherDate: new Date(),
            narration: `${this.name} - ${new Date().toLocaleDateString()}`,
            ...Object.fromEntries(this.variableValues)
        };

        // Create voucher from template
        const voucher = await VoucherTemplate.createVoucherFromTemplate(
            this.templateId,
            variables,
            this.createdBy
        );

        // Auto-approve if configured
        if (this.autoApprove && voucher.totalDebit <= this.maxAutoApprovalAmount) {
            voucher.approvalStatus = 'approved';
            await voucher.save();
        }

        // Update execution statistics
        this.lastRunDate = new Date();
        this.totalRuns += 1;
        this.successfulRuns += 1;
        this.retryCount = 0;
        this.lastError = undefined;

        // Calculate next run date
        this.calculateNextRunDate();

        await this.save();

        // Send success notification if configured
        if (this.notifyOnSuccess && this.notificationEmails.length > 0) {
            await this.sendNotification('success', voucher);
        }

        return voucher;

    } catch (error) {
        // Update error statistics
        this.failedRuns += 1;
        this.retryCount += 1;
        this.lastError = {
            message: error.message,
            date: new Date(),
            details: error
        };

        await this.save();

        // Send failure notification
        if (this.notifyOnFailure && this.notificationEmails.length > 0) {
            await this.sendNotification('failure', null, error);
        }

        throw error;
    }
};

// Instance method to send notifications
recurringVoucherSchema.methods.sendNotification = async function (type, voucher, error) {
    // This would integrate with your email service
    // For now, just log the notification
    console.log(`Recurring Voucher Notification: ${type}`, {
        recurringVoucher: this.name,
        voucher: voucher?.voucherNumber,
        error: error?.message,
        emails: this.notificationEmails
    });
};

// Static method to get due recurring vouchers
recurringVoucherSchema.statics.getDueVouchers = async function () {
    const now = new Date();
    return await this.find({
        isActive: true,
        isPaused: false,
        nextRunDate: { $lte: now },
        $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
        ]
    }).populate('templateId');
};

// Static method to execute all due vouchers
recurringVoucherSchema.statics.executeAllDue = async function () {
    const dueVouchers = await this.getDueVouchers();
    const results = [];

    for (const recurringVoucher of dueVouchers) {
        try {
            const voucher = await recurringVoucher.execute();
            results.push({
                success: true,
                recurringVoucherId: recurringVoucher._id,
                voucherNumber: voucher.voucherNumber
            });
        } catch (error) {
            results.push({
                success: false,
                recurringVoucherId: recurringVoucher._id,
                error: error.message
            });
        }
    }

    return results;
};

// Instance method to pause/resume
recurringVoucherSchema.methods.pause = function () {
    this.isPaused = true;
    return this.save();
};

recurringVoucherSchema.methods.resume = function () {
    this.isPaused = false;
    return this.save();
};

// Instance method to get execution history
recurringVoucherSchema.methods.getExecutionHistory = async function (limit = 50) {
    const Voucher = mongoose.model('Voucher');

    return await Voucher.find({
        templateId: this.templateId,
        createdBy: this.createdBy
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('voucherNumber voucherDate totalDebit totalCredit status createdAt');
};

module.exports = mongoose.model('RecurringVoucher', recurringVoucherSchema);