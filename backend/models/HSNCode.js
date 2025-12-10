const mongoose = require('mongoose');

const hsnCodeSchema = new mongoose.Schema({
    // HSN/SAC Code
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },

    // Type: HSN for goods, SAC for services
    type: {
        type: String,
        enum: ['HSN', 'SAC'],
        required: true
    },

    // Description
    description: {
        type: String,
        required: true
    },

    // Chapter and Heading (for HSN)
    chapter: String,
    heading: String,
    subHeading: String,

    // Tax Rates
    taxRates: {
        cgst: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        sgst: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        igst: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        cess: {
            type: Number,
            default: 0,
            min: 0
        },
        cessType: {
            type: String,
            enum: ['percentage', 'amount_per_unit'],
            default: 'percentage'
        }
    },

    // Unit of Measurement
    uom: {
        type: String,
        default: 'NOS' // Numbers, KGS, LTR, etc.
    },

    // Category
    category: String,
    subCategory: String,

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Exemption details
    isExempted: {
        type: Boolean,
        default: false
    },
    exemptionNotification: String,
    exemptionConditions: String,

    // Reverse Charge applicable
    isReverseCharge: {
        type: Boolean,
        default: false
    },

    // Usage statistics
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: Date,

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true
});

// Indexes
hsnCodeSchema.index({ code: 1 });
hsnCodeSchema.index({ type: 1, isActive: 1 });
hsnCodeSchema.index({ description: 'text' });
hsnCodeSchema.index({ chapter: 1, heading: 1 });

// Pre-save middleware to calculate IGST
hsnCodeSchema.pre('save', function (next) {
    // IGST = CGST + SGST
    if (this.taxRates.cgst !== undefined && this.taxRates.sgst !== undefined) {
        this.taxRates.igst = this.taxRates.cgst + this.taxRates.sgst;
    }
    next();
});

// Static method to search HSN/SAC codes
hsnCodeSchema.statics.searchCodes = async function (query, type = null) {
    const searchQuery = {
        isActive: true,
        $or: [
            { code: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
        ]
    };

    if (type) {
        searchQuery.type = type;
    }

    return await this.find(searchQuery)
        .sort({ usageCount: -1, code: 1 })
        .limit(20);
};

// Static method to get popular codes
hsnCodeSchema.statics.getPopularCodes = async function (type = null, limit = 10) {
    const query = { isActive: true };
    if (type) query.type = type;

    return await this.find(query)
        .sort({ usageCount: -1, lastUsed: -1 })
        .limit(limit);
};

// Instance method to increment usage
hsnCodeSchema.methods.incrementUsage = async function () {
    this.usageCount += 1;
    this.lastUsed = new Date();
    return await this.save();
};

// Static method to bulk import HSN codes
hsnCodeSchema.statics.bulkImport = async function (codes) {
    const results = {
        imported: 0,
        updated: 0,
        errors: []
    };

    for (const codeData of codes) {
        try {
            const existingCode = await this.findOne({ code: codeData.code });

            if (existingCode) {
                Object.assign(existingCode, codeData);
                await existingCode.save();
                results.updated++;
            } else {
                await this.create(codeData);
                results.imported++;
            }
        } catch (error) {
            results.errors.push({
                code: codeData.code,
                error: error.message
            });
        }
    }

    return results;
};

// Static method to get tax rate by code
hsnCodeSchema.statics.getTaxRate = async function (code) {
    const hsnCode = await this.findOne({ code: code.toUpperCase(), isActive: true });

    if (!hsnCode) {
        throw new Error(`HSN/SAC code ${code} not found`);
    }

    // Increment usage
    await hsnCode.incrementUsage();

    return {
        code: hsnCode.code,
        description: hsnCode.description,
        taxRates: hsnCode.taxRates,
        uom: hsnCode.uom,
        isExempted: hsnCode.isExempted,
        isReverseCharge: hsnCode.isReverseCharge
    };
};

module.exports = mongoose.model('HSNCode', hsnCodeSchema);