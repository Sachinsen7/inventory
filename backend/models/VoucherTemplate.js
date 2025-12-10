const mongoose = require('mongoose');

const voucherTemplateItemSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'accountModel'
    },
    accountModel: {
        type: String,
        enum: ['Customer', 'Supplier', 'LedgerEntry']
    },
    accountName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    debitAmount: {
        type: Number,
        default: 0
    },
    creditAmount: {
        type: Number,
        default: 0
    },
    isVariable: {
        type: Boolean,
        default: false // If true, amount can be changed when using template
    },
    gstRate: {
        type: Number,
        default: 0
    },
    tdsRate: {
        type: Number,
        default: 0
    }
});

const voucherTemplateSchema = new mongoose.Schema({
    // Template Basic Info
    templateName: {
        type: String,
        required: true,
        trim: true
    },
    templateCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    description: {
        type: String,
        trim: true
    },

    // Voucher Configuration
    voucherType: {
        type: String,
        required: true,
        enum: ['sales', 'purchase', 'receipt', 'payment', 'journal', 'contra', 'debit_note', 'credit_note']
    },

    // Template Items
    items: [voucherTemplateItemSchema],

    // Template Settings
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    category: {
        type: String,
        enum: ['standard', 'recurring', 'custom'],
        default: 'standard'
    },

    // Usage Statistics
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date
    },

    // Template Variables (for dynamic values)
    variables: [{
        name: {
            type: String,
            required: true
        },
        label: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['text', 'number', 'date', 'account'],
            default: 'text'
        },
        defaultValue: {
            type: mongoose.Schema.Types.Mixed
        },
        isRequired: {
            type: Boolean,
            default: false
        }
    }],

    // Approval Settings
    requiresApproval: {
        type: Boolean,
        default: false
    },
    approvalLevels: [{
        level: {
            type: Number,
            required: true
        },
        approverRole: {
            type: String,
            required: true
        },
        minAmount: {
            type: Number,
            default: 0
        },
        maxAmount: {
            type: Number
        }
    }],

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
voucherTemplateSchema.index({ templateCode: 1 });
voucherTemplateSchema.index({ voucherType: 1 });
voucherTemplateSchema.index({ category: 1 });
voucherTemplateSchema.index({ isActive: 1 });

// Pre-save middleware to generate template code
voucherTemplateSchema.pre('save', function (next) {
    if (!this.templateCode) {
        const prefix = this.voucherType.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-6);
        this.templateCode = `${prefix}_TMPL_${timestamp}`;
    }
    next();
});

// Static method to create voucher from template
voucherTemplateSchema.statics.createVoucherFromTemplate = async function (templateId, variables = {}, userId) {
    const template = await this.findById(templateId);
    if (!template) {
        throw new Error('Template not found');
    }

    if (!template.isActive) {
        throw new Error('Template is not active');
    }

    const Voucher = mongoose.model('Voucher');
    const Settings = mongoose.model('Settings');

    // Get next voucher number
    const { voucherNumber } = await Settings.getNextVoucherNumber(template.voucherType);

    // Process template items with variables
    const processedItems = template.items.map(item => {
        let processedItem = { ...item.toObject() };

        // Replace variables in amounts if they are variable
        if (item.isVariable) {
            const variableName = `${item.accountName}_amount`;
            if (variables[variableName]) {
                if (item.debitAmount > 0) {
                    processedItem.debitAmount = parseFloat(variables[variableName]);
                }
                if (item.creditAmount > 0) {
                    processedItem.creditAmount = parseFloat(variables[variableName]);
                }
            }
        }

        return processedItem;
    });

    // Create voucher data
    const voucherData = {
        voucherNumber,
        voucherType: template.voucherType,
        voucherDate: variables.voucherDate || new Date(),
        referenceNumber: variables.referenceNumber || '',
        narration: variables.narration || template.description,
        items: processedItems,
        templateId: template._id,
        templateCode: template.templateCode,
        createdBy: userId
    };

    // Calculate totals
    voucherData.totalDebit = processedItems.reduce((sum, item) => sum + item.debitAmount, 0);
    voucherData.totalCredit = processedItems.reduce((sum, item) => sum + item.creditAmount, 0);

    // Create voucher
    const voucher = new Voucher(voucherData);

    // Set approval status if template requires approval
    if (template.requiresApproval) {
        voucher.approvalStatus = 'pending';
        voucher.approvalLevel = 1;
    }

    await voucher.save();

    // Update template usage statistics
    template.usageCount += 1;
    template.lastUsed = new Date();
    await template.save();

    return voucher;
};

// Static method to get popular templates
voucherTemplateSchema.statics.getPopularTemplates = async function (limit = 10) {
    return await this.find({ isActive: true })
        .sort({ usageCount: -1, lastUsed: -1 })
        .limit(limit)
        .select('templateName templateCode voucherType usageCount lastUsed description');
};

// Static method to get templates by voucher type
voucherTemplateSchema.statics.getTemplatesByType = async function (voucherType) {
    return await this.find({
        voucherType: voucherType,
        isActive: true
    }).sort({ isDefault: -1, templateName: 1 });
};

// Instance method to duplicate template
voucherTemplateSchema.methods.duplicate = async function (newName, userId) {
    const duplicateData = this.toObject();
    delete duplicateData._id;
    delete duplicateData.templateCode;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    duplicateData.templateName = newName;
    duplicateData.usageCount = 0;
    duplicateData.lastUsed = null;
    duplicateData.isDefault = false;
    duplicateData.createdBy = userId;

    const duplicate = new this.constructor(duplicateData);
    return await duplicate.save();
};

module.exports = mongoose.model('VoucherTemplate', voucherTemplateSchema);