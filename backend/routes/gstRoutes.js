const express = require('express');
const router = express.Router();
const GSTR1Entry = require('../models/GSTR1Entry');
const GSTR2Entry = require('../models/GSTR2Entry');
const GSTR3BEntry = require('../models/GSTR3BEntry');
const HSNCode = require('../models/HSNCode');
const Settings = require('../models/Settings');

// ============================================
// GSTR-1 Routes (Outward Supplies)
// ============================================

// Generate GSTR-1 from billing system
router.post('/gstr1/generate', async (req, res) => {
    try {
        const { period, financialYear } = req.body;

        if (!period || !financialYear) {
            return res.status(400).json({ message: 'Period and Financial Year are required' });
        }

        // Clear existing entries for the period
        await GSTR1Entry.deleteMany({ period, financialYear });

        // Generate new entries from bills
        const entriesCount = await GSTR1Entry.generateFromBills(period, financialYear);

        res.json({
            message: `GSTR-1 generated successfully for ${period}`,
            entriesGenerated: entriesCount
        });
    } catch (error) {
        console.error('Error generating GSTR-1:', error);
        res.status(500).json({ message: 'Error generating GSTR-1', error: error.message });
    }
});

// Get GSTR-1 summary
router.get('/gstr1/summary', async (req, res) => {
    try {
        const { period, financialYear } = req.query;

        const query = {};
        if (period) query.period = period;
        if (financialYear) query.financialYear = financialYear;

        const summary = await GSTR1Entry.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$invoiceType',
                    count: { $sum: 1 },
                    totalTaxableValue: { $sum: '$taxableValue' },
                    totalCGST: { $sum: '$cgstAmount' },
                    totalSGST: { $sum: '$sgstAmount' },
                    totalIGST: { $sum: '$igstAmount' },
                    totalCess: { $sum: '$cessAmount' },
                    totalInvoiceValue: { $sum: '$invoiceValue' }
                }
            }
        ]);

        // Calculate totals
        const totals = summary.reduce((acc, item) => {
            acc.totalInvoices += item.count;
            acc.totalTaxableValue += item.totalTaxableValue;
            acc.totalTax += item.totalCGST + item.totalSGST + item.totalIGST + item.totalCess;
            acc.totalInvoiceValue += item.totalInvoiceValue;
            return acc;
        }, {
            totalInvoices: 0,
            totalTaxableValue: 0,
            totalTax: 0,
            totalInvoiceValue: 0
        });

        // HSN-wise summary
        const hsnSummary = await GSTR1Entry.aggregate([
            { $match: query },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.hsnCode',
                    description: { $first: '$items.description' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalTaxableValue: { $sum: '$items.taxableValue' },
                    totalTax: { $sum: { $add: ['$items.cgstAmount', '$items.sgstAmount', '$items.igstAmount'] } }
                }
            },
            { $sort: { totalTaxableValue: -1 } }
        ]);

        res.json({
            summary,
            totals,
            hsnSummary
        });
    } catch (error) {
        console.error('Error fetching GSTR-1 summary:', error);
        res.status(500).json({ message: 'Error fetching GSTR-1 summary', error: error.message });
    }
});

// Get GSTR-1 entries
router.get('/gstr1/entries', async (req, res) => {
    try {
        const { period, financialYear, invoiceType, page = 1, limit = 50 } = req.query;

        const query = {};
        if (period) query.period = period;
        if (financialYear) query.financialYear = financialYear;
        if (invoiceType) query.invoiceType = invoiceType;

        const entries = await GSTR1Entry.find(query)
            .sort({ invoiceDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await GSTR1Entry.countDocuments(query);

        res.json({
            entries,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error fetching GSTR-1 entries:', error);
        res.status(500).json({ message: 'Error fetching GSTR-1 entries', error: error.message });
    }
});

// Export GSTR-1 JSON
router.get('/gstr1/export/:period/:financialYear', async (req, res) => {
    try {
        const { period, financialYear } = req.params;

        const entries = await GSTR1Entry.find({ period, financialYear });

        // Format data according to GSTR-1 JSON structure
        const gstr1Json = {
            version: "GST3.0.4",
            hash: "hash",
            gstin: "", // Will be filled from settings
            fp: period,
            b2b: [],
            b2cl: [],
            b2cs: [],
            exp: [],
            nil: {},
            hsn: {}
        };

        // Get company GSTIN from settings
        const settings = await Settings.getSettings();
        gstr1Json.gstin = settings.companyGSTIN;

        // Group entries by customer and invoice type
        const groupedEntries = {};

        for (const entry of entries) {
            const key = `${entry.invoiceType}_${entry.customerGSTIN}`;
            if (!groupedEntries[key]) {
                groupedEntries[key] = {
                    invoiceType: entry.invoiceType,
                    customerGSTIN: entry.customerGSTIN,
                    customerName: entry.customerName,
                    invoices: []
                };
            }

            groupedEntries[key].invoices.push({
                inum: entry.invoiceNumber,
                idt: entry.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'),
                val: entry.invoiceValue,
                pos: entry.placeOfSupplyCode || "01",
                rchrg: "N",
                inv_typ: "R",
                itms: entry.items.map(item => ({
                    num: 1,
                    itm_det: {
                        txval: item.taxableValue,
                        rt: item.cgstRate + item.sgstRate + item.igstRate,
                        camt: item.cgstAmount,
                        samt: item.sgstAmount,
                        iamt: item.igstAmount,
                        csamt: item.cessAmount
                    }
                }))
            });
        }

        // Populate different sections based on invoice type
        Object.values(groupedEntries).forEach(group => {
            if (group.invoiceType === 'B2B') {
                gstr1Json.b2b.push({
                    ctin: group.customerGSTIN,
                    inv: group.invoices
                });
            } else if (group.invoiceType === 'B2CL') {
                gstr1Json.b2cl = gstr1Json.b2cl.concat(group.invoices.map(inv => ({
                    ...inv,
                    pos: inv.pos
                })));
            }
        });

        res.json(gstr1Json);
    } catch (error) {
        console.error('Error exporting GSTR-1:', error);
        res.status(500).json({ message: 'Error exporting GSTR-1', error: error.message });
    }
});

// ============================================
// GSTR-3B Routes (Monthly Return)
// ============================================

// Generate GSTR-3B
router.post('/gstr3b/generate', async (req, res) => {
    try {
        const { period, financialYear } = req.body;

        if (!period || !financialYear) {
            return res.status(400).json({ message: 'Period and Financial Year are required' });
        }

        const gstr3bEntry = await GSTR3BEntry.autoCalculate(period, financialYear);

        res.json({
            message: `GSTR-3B generated successfully for ${period}`,
            gstr3bEntry
        });
    } catch (error) {
        console.error('Error generating GSTR-3B:', error);
        res.status(500).json({ message: 'Error generating GSTR-3B', error: error.message });
    }
});

// Get GSTR-3B entry
router.get('/gstr3b/:period/:financialYear', async (req, res) => {
    try {
        const { period, financialYear } = req.params;

        const gstr3bEntry = await GSTR3BEntry.findOne({ period, financialYear });

        if (!gstr3bEntry) {
            return res.status(404).json({ message: 'GSTR-3B not found for the specified period' });
        }

        res.json(gstr3bEntry);
    } catch (error) {
        console.error('Error fetching GSTR-3B:', error);
        res.status(500).json({ message: 'Error fetching GSTR-3B', error: error.message });
    }
});

// Update GSTR-3B entry
router.put('/gstr3b/:id', async (req, res) => {
    try {
        const gstr3bEntry = await GSTR3BEntry.findByIdAndUpdate(
            req.params.id,
            { ...req.body, autoCalculated: false },
            { new: true }
        );

        if (!gstr3bEntry) {
            return res.status(404).json({ message: 'GSTR-3B entry not found' });
        }

        res.json({
            message: 'GSTR-3B updated successfully',
            gstr3bEntry
        });
    } catch (error) {
        console.error('Error updating GSTR-3B:', error);
        res.status(500).json({ message: 'Error updating GSTR-3B', error: error.message });
    }
});

// ============================================
// HSN/SAC Code Management Routes
// ============================================

// Get all HSN/SAC codes
router.get('/hsn', async (req, res) => {
    try {
        const { type, search, page = 1, limit = 50 } = req.query;

        let query = { isActive: true };

        if (type) {
            query.type = type.toUpperCase();
        }

        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        const codes = await HSNCode.find(query)
            .sort({ usageCount: -1, code: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await HSNCode.countDocuments(query);

        res.json({
            codes,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error fetching HSN codes:', error);
        res.status(500).json({ message: 'Error fetching HSN codes', error: error.message });
    }
});

// Search HSN/SAC codes
router.get('/hsn/search', async (req, res) => {
    try {
        const { q, type } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const codes = await HSNCode.searchCodes(q, type);
        res.json(codes);
    } catch (error) {
        console.error('Error searching HSN codes:', error);
        res.status(500).json({ message: 'Error searching HSN codes', error: error.message });
    }
});

// Get popular HSN/SAC codes
router.get('/hsn/popular', async (req, res) => {
    try {
        const { type, limit = 10 } = req.query;
        const codes = await HSNCode.getPopularCodes(type, parseInt(limit));
        res.json(codes);
    } catch (error) {
        console.error('Error fetching popular HSN codes:', error);
        res.status(500).json({ message: 'Error fetching popular HSN codes', error: error.message });
    }
});

// Get tax rate by HSN/SAC code
router.get('/hsn/:code/tax-rate', async (req, res) => {
    try {
        const taxRate = await HSNCode.getTaxRate(req.params.code);
        res.json(taxRate);
    } catch (error) {
        console.error('Error fetching tax rate:', error);
        res.status(404).json({ message: error.message });
    }
});

// Create HSN/SAC code
router.post('/hsn', async (req, res) => {
    try {
        const hsnCode = new HSNCode({
            ...req.body,
            createdBy: req.user?.id
        });

        await hsnCode.save();

        res.status(201).json({
            message: 'HSN/SAC code created successfully',
            hsnCode
        });
    } catch (error) {
        console.error('Error creating HSN code:', error);
        res.status(500).json({ message: 'Error creating HSN code', error: error.message });
    }
});

// Update HSN/SAC code
router.put('/hsn/:id', async (req, res) => {
    try {
        const hsnCode = await HSNCode.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user?.id },
            { new: true }
        );

        if (!hsnCode) {
            return res.status(404).json({ message: 'HSN/SAC code not found' });
        }

        res.json({
            message: 'HSN/SAC code updated successfully',
            hsnCode
        });
    } catch (error) {
        console.error('Error updating HSN code:', error);
        res.status(500).json({ message: 'Error updating HSN code', error: error.message });
    }
});

// Bulk import HSN/SAC codes
router.post('/hsn/bulk-import', async (req, res) => {
    try {
        const { codes } = req.body;

        if (!Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({ message: 'Codes array is required' });
        }

        const results = await HSNCode.bulkImport(codes);

        res.json({
            message: 'Bulk import completed',
            results
        });
    } catch (error) {
        console.error('Error bulk importing HSN codes:', error);
        res.status(500).json({ message: 'Error bulk importing HSN codes', error: error.message });
    }
});

// ============================================
// GST Dashboard Routes
// ============================================

// Get GST dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const { period, financialYear } = req.query;

        // Current period data
        const currentPeriodQuery = {};
        if (period) currentPeriodQuery.period = period;
        if (financialYear) currentPeriodQuery.financialYear = financialYear;

        // GSTR-1 Summary
        const gstr1Summary = await GSTR1Entry.aggregate([
            { $match: currentPeriodQuery },
            {
                $group: {
                    _id: null,
                    totalInvoices: { $sum: 1 },
                    totalTaxableValue: { $sum: '$taxableValue' },
                    totalTax: { $sum: { $add: ['$cgstAmount', '$sgstAmount', '$igstAmount', '$cessAmount'] } },
                    totalInvoiceValue: { $sum: '$invoiceValue' }
                }
            }
        ]);

        // GSTR-2 Summary
        const gstr2Summary = await GSTR2Entry.aggregate([
            { $match: { period } },
            {
                $group: {
                    _id: null,
                    totalInvoices: { $sum: 1 },
                    totalTaxableValue: { $sum: '$taxableValue' },
                    totalITC: { $sum: '$itcAvailable' },
                    matchedInvoices: { $sum: { $cond: [{ $eq: ['$matchStatus', 'matched'] }, 1, 0] } },
                    mismatchedInvoices: { $sum: { $cond: [{ $eq: ['$matchStatus', 'mismatched'] }, 1, 0] } }
                }
            }
        ]);

        // GSTR-3B Summary
        const gstr3bEntry = await GSTR3BEntry.findOne(currentPeriodQuery);

        // Tax liability calculation
        const taxLiability = {
            totalTaxPayable: 0,
            totalITCAvailable: 0,
            netTaxPayable: 0,
            cashPayment: 0
        };

        if (gstr3bEntry) {
            const taxPayable = gstr3bEntry.taxPayment.taxPayable;
            const itcAvailable = gstr3bEntry.eligibleITC.netITC;

            taxLiability.totalTaxPayable =
                taxPayable.cgstAmount + taxPayable.sgstAmount +
                taxPayable.igstAmount + taxPayable.cessAmount;

            taxLiability.totalITCAvailable =
                itcAvailable.cgstAmount + itcAvailable.sgstAmount +
                itcAvailable.igstAmount + itcAvailable.cessAmount;

            taxLiability.netTaxPayable = Math.max(0,
                taxLiability.totalTaxPayable - taxLiability.totalITCAvailable);

            const cashPayment = gstr3bEntry.taxPayment.taxPaidInCash;
            taxLiability.cashPayment =
                cashPayment.cgstAmount + cashPayment.sgstAmount +
                cashPayment.igstAmount + cashPayment.cessAmount;
        }

        // Monthly trend (last 6 months)
        const monthlyTrend = await GSTR1Entry.aggregate([
            {
                $group: {
                    _id: '$period',
                    totalSales: { $sum: '$invoiceValue' },
                    totalTax: { $sum: { $add: ['$cgstAmount', '$sgstAmount', '$igstAmount'] } }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 6 }
        ]);

        // Top customers by tax
        const topCustomers = await GSTR1Entry.aggregate([
            { $match: currentPeriodQuery },
            {
                $group: {
                    _id: '$customerGSTIN',
                    customerName: { $first: '$customerName' },
                    totalTax: { $sum: { $add: ['$cgstAmount', '$sgstAmount', '$igstAmount'] } },
                    totalInvoices: { $sum: 1 }
                }
            },
            { $sort: { totalTax: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            gstr1Summary: gstr1Summary[0] || {},
            gstr2Summary: gstr2Summary[0] || {},
            gstr3bSummary: gstr3bEntry || {},
            taxLiability,
            monthlyTrend,
            topCustomers
        });
    } catch (error) {
        console.error('Error fetching GST dashboard:', error);
        res.status(500).json({ message: 'Error fetching GST dashboard', error: error.message });
    }
});

// Get compliance status
router.get('/compliance-status', async (req, res) => {
    try {
        const { financialYear } = req.query;

        // Get all periods in financial year
        const periods = [];
        const startYear = parseInt(financialYear.split('-')[0]);

        // Generate periods from April to March
        for (let month = 4; month <= 12; month++) {
            periods.push(month.toString().padStart(2, '0') + startYear.toString());
        }
        for (let month = 1; month <= 3; month++) {
            periods.push(month.toString().padStart(2, '0') + (startYear + 1).toString());
        }

        const complianceStatus = [];

        for (const period of periods) {
            const gstr1Count = await GSTR1Entry.countDocuments({ period, financialYear });
            const gstr2Count = await GSTR2Entry.countDocuments({ period });
            const gstr3b = await GSTR3BEntry.findOne({ period, financialYear });

            complianceStatus.push({
                period,
                gstr1: {
                    generated: gstr1Count > 0,
                    count: gstr1Count,
                    status: gstr1Count > 0 ? 'completed' : 'pending'
                },
                gstr2: {
                    uploaded: gstr2Count > 0,
                    count: gstr2Count,
                    status: gstr2Count > 0 ? 'completed' : 'pending'
                },
                gstr3b: {
                    generated: !!gstr3b,
                    filed: gstr3b?.returnStatus === 'filed',
                    status: gstr3b?.returnStatus || 'pending'
                }
            });
        }

        res.json(complianceStatus);
    } catch (error) {
        console.error('Error fetching compliance status:', error);
        res.status(500).json({ message: 'Error fetching compliance status', error: error.message });
    }
});

module.exports = router;