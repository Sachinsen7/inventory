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

    // Company Settings
    companyName: String,
    companyGSTIN: String,
    companyAddress: String,
    companyPhone: String,
    companyEmail: String,

    // Other Settings
    enableAutoBackup: {
        type: Boolean,
        default: false
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
            financialYearStart: '04-01'
        });
        console.log('Default settings created:', settings);
    }
    return settings;
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
