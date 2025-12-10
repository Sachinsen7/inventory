const express = require('express');
const router = express.Router();
const TDSEntry = require('../models/TDSEntry');
const TDSChallan = require('../models/TDSChallan');
const Voucher = require('../models/Voucher');
const Settings = require('../models/Settings');

// ============================================
// TDS Entry Management Routes
// ============================================

// Get all TDS entries with filters
router.get('/entries', async (req, res) => {
    try {
        const {
            quarter,
            financialYear,
            sectionCode,
            status,
            deducteePAN,
            fromDate,
            toDate,
            page = 1,
            limit = 50
        } = req.query;

        const filters = {};

        if (quarter) filters.quarter = quarter;
        if (financialYear) filters.financialYear = financialYear;
        if (sectionCode) filters.sectionCode = sectionCode;
        if (status) filters.status = status;
        if (deducteePAN) filters.deducteePAN = deducteePAN.toUpperCase();

        if (fromDate || toDate) {
            filters.paymentDate = {};
            if (fromDate) filters.paymentDate.$gte = new Date(fromDate);
            if (toDate) filters.paymentDate.$lte = new Date(toDate);
        }

        const entries = await TDSEntry.find(filters)
            .sort({ paymentDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');

        const total = await TDSEntry.countDocuments(filters);

        res.json({
            entries,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error fetching TDS entries:', error);
        res.status(500).json({ message: 'Error fetching TDS entries', error: error.message });
    }
});

// Get TDS entry by ID
router.get('/entries/:id', async (req, res) => {
    try {
        const entry = await TDSEntry.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');

        if (!entry) {
            return res.status(404).json({ message: 'TDS entry not found' });
        }

        res.json(entry);
    } catch (error) {
        console.error('Error fetching TDS entry:', error);
        res.status(500).json({ message: 'Error fetching TDS entry', error: error.message });
    }
});

// Create TDS entry
router.post('/entries', async (req, res) => {
    try {
        const tdsEntry = new TDSEntry({
            ...req.body,
            createdBy: req.user?.id
        });

        await tdsEntry.save();

        res.status(201).json({
            message: 'TDS entry created successfully',
            tdsEntry
        });
    } catch (error) {
        console.error('Error creating TDS entry:', error);
        res.status(500).json({ message: 'Error creating TDS entry', error: error.message });
    }
});

// Update TDS entry
router.put('/entries/:id', async (req, res) => {
    try {
        const tdsEntry = await TDSEntry.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user?.id },
            { new: true }
        );

        if (!tdsEntry) {
            return res.status(404).json({ message: 'TDS entry not found' });
        }

        res.json({
            message: 'TDS entry updated successfully',
            tdsEntry
        });
    } catch (error) {
        console.error('Error updating TDS entry:', error);
        res.status(500).json({ message: 'Error updating TDS entry', error: error.message });
    }
});

// Delete TDS entry
router.delete('/entries/:id', async (req, res) => {
    try {
        const tdsEntry = await TDSEntry.findById(req.params.id);

        if (!tdsEntry) {
            return res.status(404).json({ message: 'TDS entry not found' });
        }

        if (tdsEntry.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot delete TDS entry that is not pending' });
        }

        await TDSEntry.findByIdAndDelete(req.params.id);

        res.json({ message: 'TDS entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting TDS entry:', error);
        res.status(500).json({ message: 'Error deleting TDS entry', error: error.message });
    }
});

// Calculate TDS for payment
router.post('/calculate', async (req, res) => {
    try {
        const { sectionCode, paymentAmount, customRate } = req.body;

        if (!sectionCode || !paymentAmount) {
            return res.status(400).json({ message: 'Section code and payment amount are required' });
        }

        const calculation = TDSEntry.calculateTDS(sectionCode, paymentAmount, customRate);

        res.json(calculation);
    } catch (error) {
        console.error('Error calculating TDS:', error);
        res.status(500).json({ message: 'Error calculating TDS', error: error.message });
    }
});

// Get TDS rates
router.get('/rates', async (req, res) => {
    try {
        const rates = TDSEntry.getTDSRates();
        res.json(rates);
    } catch (error) {
        console.error('Error fetching TDS rates:', error);
        res.status(500).json({ message: 'Error fetching TDS rates', error: error.message });
    }
});

// Generate TDS from vouchers
router.post('/generate-from-vouchers', async (req, res) => {
    try {
        const { quarter, financialYear, voucherIds } = req.body;

        if (!quarter || !financialYear) {
            return res.status(400).json({ message: 'Quarter and Financial Year are required' });
        }

        let vouchers;
        if (voucherIds && voucherIds.length > 0) {
            vouchers = await Voucher.find({ _id: { $in: voucherIds } });
        } else {
            // Get all payment vouchers for the period
            const startDate = new Date(`${financialYear.split('-')[0]}-04-01`);
            const endDate = new Date(`${parseInt(financialYear.split('-')[0]) + 1}-03-31`);

            vouchers = await Voucher.find({
                voucherType: 'payment',
                status: 'posted',
                voucherDate: { $gte: startDate, $lte: endDate }
            });
        }

        const tdsEntries = [];
        const settings = await Settings.getSettings();

        for (const voucher of vouchers) {
            // Check if TDS is applicable based on voucher items
            for (const item of voucher.items) {
                if (item.tdsAmount && item.tdsAmount > 0) {
                    // Create TDS entry
                    const tdsEntry = new TDSEntry({
                        deducteeType: 'company', // Default, should be determined from account
                        deducteeName: item.accountName,
                        deducteePAN: 'AAACR5055K', // Should be fetched from account details
                        deducteeAddress: 'Address', // Should be fetched from account details
                        paymentDate: voucher.voucherDate,
                        paymentAmount: item.creditAmount || item.debitAmount,
                        sectionCode: '194J', // Default, should be determined based on nature
                        natureOfPayment: 'Professional Services',
                        tdsRate: item.tdsRate || settings.tdsSettings.defaultTDSRate,
                        tdsAmount: item.tdsAmount,
                        voucherNumber: voucher.voucherNumber,
                        voucherType: voucher.voucherType,
                        voucherDate: voucher.voucherDate,
                        createdBy: req.user?.id
                    });

                    tdsEntries.push(tdsEntry);
                }
            }
        }

        if (tdsEntries.length > 0) {
            await TDSEntry.insertMany(tdsEntries);
        }

        res.json({
            message: `Generated ${tdsEntries.length} TDS entries for ${quarter} ${financialYear}`,
            entriesGenerated: tdsEntries.length
        });
    } catch (error) {
        console.error('Error generating TDS from vouchers:', error);
        res.status(500).json({ message: 'Error generating TDS from vouchers', error: error.message });
    }
});

// ============================================
// TDS Challan Management Routes
// ============================================

// Get all challans
router.get('/challans', async (req, res) => {
    try {
        const { quarter, financialYear, status, page = 1, limit = 20 } = req.query;

        const filters = {};
        if (quarter) filters.quarter = quarter;
        if (financialYear) filters.financialYear = financialYear;
        if (status) filters.status = status;

        const challans = await TDSChallan.find(filters)
            .sort({ challanDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name')
            .populate('verifiedBy', 'name');

        const total = await TDSChallan.countDocuments(filters);

        res.json({
            challans,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error fetching TDS challans:', error);
        res.status(500).json({ message: 'Error fetching TDS challans', error: error.message });
    }
});

// Create challan from TDS entries
router.post('/challans', async (req, res) => {
    try {
        const { tdsEntryIds, challanDetails } = req.body;

        if (!tdsEntryIds || tdsEntryIds.length === 0) {
            return res.status(400).json({ message: 'TDS entry IDs are required' });
        }

        const challan = await TDSChallan.createFromTDSEntries(tdsEntryIds, {
            ...challanDetails,
            createdBy: req.user?.id
        });

        res.status(201).json({
            message: 'TDS challan created successfully',
            challan
        });
    } catch (error) {
        console.error('Error creating TDS challan:', error);
        res.status(500).json({ message: 'Error creating TDS challan', error: error.message });
    }
});

// Verify challan payment
router.post('/challans/:id/verify', async (req, res) => {
    try {
        const challan = await TDSChallan.findById(req.params.id);

        if (!challan) {
            return res.status(404).json({ message: 'TDS challan not found' });
        }

        await challan.verifyPayment({
            ...req.body,
            verifiedBy: req.user?.id
        });

        res.json({
            message: 'TDS challan verified successfully',
            challan
        });
    } catch (error) {
        console.error('Error verifying TDS challan:', error);
        res.status(500).json({ message: 'Error verifying TDS challan', error: error.message });
    }
});

// ============================================
// TDS Reports and Certificates Routes
// ============================================

// Get quarterly summary
router.get('/quarterly-summary', async (req, res) => {
    try {
        const { quarter, financialYear } = req.query;

        if (!quarter || !financialYear) {
            return res.status(400).json({ message: 'Quarter and Financial Year are required' });
        }

        const summary = await TDSEntry.getQuarterlySummary(quarter, financialYear);
        const challanSummary = await TDSChallan.getChallanSummary(quarter, financialYear);

        res.json({
            quarter,
            financialYear,
            tdsEntrySummary: summary,
            challanSummary
        });
    } catch (error) {
        console.error('Error fetching quarterly summary:', error);
        res.status(500).json({ message: 'Error fetching quarterly summary', error: error.message });
    }
});

// Generate Form 26Q
router.get('/form26q/:quarter/:financialYear', async (req, res) => {
    try {
        const { quarter, financialYear } = req.params;

        const form26Q = await TDSEntry.generateForm26Q(quarter, financialYear);

        res.json(form26Q);
    } catch (error) {
        console.error('Error generating Form 26Q:', error);
        res.status(500).json({ message: 'Error generating Form 26Q', error: error.message });
    }
});

// Generate TDS certificate (Form 16A)
router.post('/certificate/:id', async (req, res) => {
    try {
        const tdsEntry = await TDSEntry.findById(req.params.id);

        if (!tdsEntry) {
            return res.status(404).json({ message: 'TDS entry not found' });
        }

        if (tdsEntry.status !== 'filed' && tdsEntry.status !== 'completed') {
            return res.status(400).json({ message: 'TDS must be filed before generating certificate' });
        }

        const certificateNumber = tdsEntry.generateCertificateNumber();
        await tdsEntry.save();

        // Get company details from settings
        const settings = await Settings.getSettings();

        const certificate = {
            certificateNumber,
            certificateDate: tdsEntry.certificateDate,
            assessmentYear: tdsEntry.assessmentYear,
            deductorDetails: {
                name: settings.companyName,
                pan: settings.companyPAN,
                tan: settings.tdsSettings.tanNumber,
                address: settings.companyAddress
            },
            deducteeDetails: {
                name: tdsEntry.deducteeName,
                pan: tdsEntry.deducteePAN,
                address: tdsEntry.deducteeAddress
            },
            paymentDetails: {
                paymentDate: tdsEntry.paymentDate,
                paymentAmount: tdsEntry.paymentAmount,
                sectionCode: tdsEntry.sectionCode,
                natureOfPayment: tdsEntry.natureOfPayment,
                tdsRate: tdsEntry.tdsRate,
                tdsAmount: tdsEntry.tdsAmount
            },
            challanDetails: {
                challanNumber: tdsEntry.challanNumber,
                challanDate: tdsEntry.challanDate,
                bankName: tdsEntry.bankName
            }
        };

        res.json({
            message: 'TDS certificate generated successfully',
            certificate
        });
    } catch (error) {
        console.error('Error generating TDS certificate:', error);
        res.status(500).json({ message: 'Error generating TDS certificate', error: error.message });
    }
});

// ============================================
// TDS Dashboard Routes
// ============================================

// Get TDS dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const { quarter, financialYear } = req.query;

        // Current quarter summary
        const currentQuarterSummary = await TDSEntry.getQuarterlySummary(quarter, financialYear);

        // Challan summary
        const challanSummary = await TDSChallan.getChallanSummary(quarter, financialYear);

        // Compliance status
        const complianceStatus = await TDSEntry.aggregate([
            {
                $match: { financialYear }
            },
            {
                $group: {
                    _id: '$quarter',
                    totalEntries: { $sum: 1 },
                    totalTDSAmount: { $sum: '$tdsAmount' },
                    filedEntries: {
                        $sum: { $cond: [{ $eq: ['$status', 'filed'] }, 1, 0] }
                    },
                    pendingEntries: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top deductees
        const topDeductees = await TDSEntry.aggregate([
            {
                $match: { quarter, financialYear }
            },
            {
                $group: {
                    _id: '$deducteePAN',
                    deducteeName: { $first: '$deducteeName' },
                    totalTDSAmount: { $sum: '$tdsAmount' },
                    totalPaymentAmount: { $sum: '$paymentAmount' },
                    entryCount: { $sum: 1 }
                }
            },
            { $sort: { totalTDSAmount: -1 } },
            { $limit: 10 }
        ]);

        // Section-wise analysis
        const sectionWiseAnalysis = await TDSEntry.aggregate([
            {
                $match: { quarter, financialYear }
            },
            {
                $group: {
                    _id: '$sectionCode',
                    totalEntries: { $sum: 1 },
                    totalTDSAmount: { $sum: '$tdsAmount' },
                    averageRate: { $avg: '$tdsRate' }
                }
            },
            { $sort: { totalTDSAmount: -1 } }
        ]);

        res.json({
            currentQuarterSummary,
            challanSummary,
            complianceStatus,
            topDeductees,
            sectionWiseAnalysis
        });
    } catch (error) {
        console.error('Error fetching TDS dashboard:', error);
        res.status(500).json({ message: 'Error fetching TDS dashboard', error: error.message });
    }
});

module.exports = router;