const mongoose = require('mongoose');

const voucherApprovalSchema = new mongoose.Schema({
    // Voucher Reference
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher',
        required: true
    },
    voucherNumber: {
        type: String,
        required: true
    },

    // Approval Level
    approvalLevel: {
        type: Number,
        required: true,
        min: 1
    },
    maxApprovalLevel: {
        type: Number,
        required: true
    },

    // Approver Information
    approverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approverRole: {
        type: String,
        required: true
    },

    // Approval Details
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'delegated'],
        default: 'pending'
    },
    approvalDate: {
        type: Date
    },
    comments: {
        type: String,
        trim: true
    },

    // Delegation (if approver delegates to someone else)
    delegatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    delegationReason: {
        type: String
    },
    delegationDate: {
        type: Date
    },

    // Notification Settings
    notificationSent: {
        type: Boolean,
        default: false
    },
    remindersSent: {
        type: Number,
        default: 0
    },
    lastReminderDate: {
        type: Date
    },

    // Approval Constraints
    amountLimit: {
        type: Number
    },
    canApproveAmount: {
        type: Boolean,
        default: true
    },

    // Audit Trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
voucherApprovalSchema.index({ voucherId: 1, approvalLevel: 1 });
voucherApprovalSchema.index({ approverId: 1, status: 1 });
voucherApprovalSchema.index({ status: 1, createdAt: -1 });
voucherApprovalSchema.index({ approverRole: 1 });

// Instance method to approve
voucherApprovalSchema.methods.approve = async function (approverId, comments = '') {
    const Voucher = mongoose.model('Voucher');

    // Verify approver
    if (this.approverId.toString() !== approverId.toString() &&
        (!this.delegatedTo || this.delegatedTo.toString() !== approverId.toString())) {
        throw new Error('Unauthorized approver');
    }

    // Update approval
    this.status = 'approved';
    this.approvalDate = new Date();
    this.comments = comments;
    await this.save();

    // Update voucher approval status
    const voucher = await Voucher.findById(this.voucherId);
    if (!voucher) {
        throw new Error('Voucher not found');
    }

    // Check if this is the final approval level
    if (this.approvalLevel >= this.maxApprovalLevel) {
        voucher.approvalStatus = 'approved';
        voucher.approvedDate = new Date();
        voucher.finalApproverId = approverId;
    } else {
        // Move to next approval level
        voucher.approvalLevel = this.approvalLevel + 1;

        // Create next level approval
        await this.constructor.createNextLevelApproval(voucher);
    }

    await voucher.save();
    return voucher;
};

// Instance method to reject
voucherApprovalSchema.methods.reject = async function (approverId, comments = '') {
    const Voucher = mongoose.model('Voucher');

    // Verify approver
    if (this.approverId.toString() !== approverId.toString() &&
        (!this.delegatedTo || this.delegatedTo.toString() !== approverId.toString())) {
        throw new Error('Unauthorized approver');
    }

    // Update approval
    this.status = 'rejected';
    this.approvalDate = new Date();
    this.comments = comments;
    await this.save();

    // Update voucher status
    const voucher = await Voucher.findById(this.voucherId);
    if (voucher) {
        voucher.approvalStatus = 'rejected';
        voucher.rejectedDate = new Date();
        voucher.rejectedBy = approverId;
        voucher.rejectionReason = comments;
        await voucher.save();
    }

    return voucher;
};

// Instance method to delegate
voucherApprovalSchema.methods.delegate = async function (approverId, delegateToId, reason = '') {
    // Verify current approver
    if (this.approverId.toString() !== approverId.toString()) {
        throw new Error('Unauthorized to delegate');
    }

    // Update delegation
    this.status = 'delegated';
    this.delegatedTo = delegateToId;
    this.delegationReason = reason;
    this.delegationDate = new Date();
    await this.save();

    return this;
};

// Static method to create approval workflow for voucher
voucherApprovalSchema.statics.createApprovalWorkflow = async function (voucher, approvalLevels) {
    const approvals = [];

    for (let i = 0; i < approvalLevels.length; i++) {
        const level = approvalLevels[i];

        // Only create first level approval initially
        if (i === 0) {
            const approval = new this({
                voucherId: voucher._id,
                voucherNumber: voucher.voucherNumber,
                approvalLevel: level.level,
                maxApprovalLevel: approvalLevels.length,
                approverId: level.approverId,
                approverRole: level.approverRole,
                amountLimit: level.maxAmount,
                canApproveAmount: voucher.totalDebit <= (level.maxAmount || Infinity),
                createdBy: voucher.createdBy
            });

            await approval.save();
            approvals.push(approval);
        }
    }

    return approvals;
};

// Static method to create next level approval
voucherApprovalSchema.statics.createNextLevelApproval = async function (voucher) {
    const VoucherTemplate = mongoose.model('VoucherTemplate');

    // Get template approval levels
    const template = await VoucherTemplate.findById(voucher.templateId);
    if (!template || !template.approvalLevels) {
        return null;
    }

    const nextLevel = template.approvalLevels.find(level => level.level === voucher.approvalLevel);
    if (!nextLevel) {
        return null;
    }

    const approval = new this({
        voucherId: voucher._id,
        voucherNumber: voucher.voucherNumber,
        approvalLevel: nextLevel.level,
        maxApprovalLevel: template.approvalLevels.length,
        approverId: nextLevel.approverId, // This should be determined by role
        approverRole: nextLevel.approverRole,
        amountLimit: nextLevel.maxAmount,
        canApproveAmount: voucher.totalDebit <= (nextLevel.maxAmount || Infinity),
        createdBy: voucher.createdBy
    });

    await approval.save();
    return approval;
};

// Static method to get pending approvals for user
voucherApprovalSchema.statics.getPendingApprovalsForUser = async function (userId, options = {}) {
    const { page = 1, limit = 20, voucherType } = options;

    const query = {
        $or: [
            { approverId: userId, status: 'pending' },
            { delegatedTo: userId, status: 'delegated' }
        ]
    };

    let aggregationPipeline = [
        { $match: query },
        {
            $lookup: {
                from: 'vouchers',
                localField: 'voucherId',
                foreignField: '_id',
                as: 'voucher'
            }
        },
        { $unwind: '$voucher' }
    ];

    if (voucherType) {
        aggregationPipeline.push({
            $match: { 'voucher.voucherType': voucherType }
        });
    }

    aggregationPipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    );

    const approvals = await this.aggregate(aggregationPipeline);
    const total = await this.countDocuments(query);

    return {
        approvals,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total
        }
    };
};

// Static method to get approval statistics
voucherApprovalSchema.statics.getApprovalStatistics = async function (userId, dateRange = {}) {
    const { fromDate, toDate } = dateRange;

    const matchQuery = { approverId: userId };
    if (fromDate || toDate) {
        matchQuery.createdAt = {};
        if (fromDate) matchQuery.createdAt.$gte = new Date(fromDate);
        if (toDate) matchQuery.createdAt.$lte = new Date(toDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', 'approved'] },
                            '$voucher.totalDebit',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    // Calculate average approval time
    const approvalTimes = await this.aggregate([
        {
            $match: {
                approverId: userId,
                status: 'approved',
                approvalDate: { $exists: true }
            }
        },
        {
            $project: {
                approvalTime: {
                    $subtract: ['$approvalDate', '$createdAt']
                }
            }
        },
        {
            $group: {
                _id: null,
                avgApprovalTime: { $avg: '$approvalTime' }
            }
        }
    ]);

    return {
        statusBreakdown: stats,
        averageApprovalTime: approvalTimes[0]?.avgApprovalTime || 0
    };
};

// Instance method to send reminder
voucherApprovalSchema.methods.sendReminder = async function () {
    // This would integrate with your notification service
    this.remindersSent += 1;
    this.lastReminderDate = new Date();
    await this.save();

    console.log(`Approval Reminder Sent: ${this.voucherNumber} to ${this.approverRole}`);
};

module.exports = mongoose.model('VoucherApproval', voucherApprovalSchema);