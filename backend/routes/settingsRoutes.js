const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// Get settings
router.get('/', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings', error: error.message });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        const settings = await Settings.updateSettings(req.body);
        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating settings', error: error.message });
    }
});

// Generate next invoice number based on format
router.post('/generate-invoice-number', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        const { invoiceFormat, nextInvoiceNumber } = settings;

        // Parse format and generate invoice number
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const fullYear = now.getFullYear().toString();

        // Determine financial year
        const financialYearStart = settings.financialYearStart || '04-01';
        const [fyMonth, fyDay] = financialYearStart.split('-').map(Number);
        let fyStartYear, fyEndYear;

        if (now.getMonth() + 1 >= fyMonth) {
            fyStartYear = now.getFullYear();
            fyEndYear = now.getFullYear() + 1;
        } else {
            fyStartYear = now.getFullYear() - 1;
            fyEndYear = now.getFullYear();
        }

        // Replace placeholders
        let invoiceNumber = invoiceFormat
            .replace('{YY}', year)
            .replace('{YYYY}', fullYear)
            .replace('{MM}', month)
            .replace('{FY}', `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`)
            .replace('{####}', String(nextInvoiceNumber).padStart(4, '0'))
            .replace('{#####}', String(nextInvoiceNumber).padStart(5, '0'))
            .replace('{######}', String(nextInvoiceNumber).padStart(6, '0'));

        // Increment next invoice number
        settings.nextInvoiceNumber = nextInvoiceNumber + 1;
        await settings.save();

        res.json({
            invoiceNumber,
            nextNumber: settings.nextInvoiceNumber
        });
    } catch (error) {
        console.error('Error generating invoice number:', error);
        res.status(500).json({ message: 'Error generating invoice number', error: error.message });
    }
});

// Reset invoice counter (use with caution)
router.post('/reset-invoice-counter', async (req, res) => {
    try {
        const { nextInvoiceNumber } = req.body;

        if (!nextInvoiceNumber || nextInvoiceNumber < 1) {
            return res.status(400).json({ message: 'Invalid invoice number' });
        }

        const settings = await Settings.updateSettings({ nextInvoiceNumber });
        res.json({ message: 'Invoice counter reset successfully', settings });
    } catch (error) {
        console.error('Error resetting invoice counter:', error);
        res.status(500).json({ message: 'Error resetting invoice counter', error: error.message });
    }
});

module.exports = router;
