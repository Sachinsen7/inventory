const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Stock Check Report Schema
const stockCheckReportSchema = new mongoose.Schema({
    godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown', required: true },
    godownName: { type: String, required: true },
    productType: { type: String, required: true },
    productPrefix: { type: String, required: true },
    expectedCount: { type: Number, required: true },
    scannedCount: { type: Number, required: true },
    missingCount: { type: Number, required: true },
    wrongScansCount: { type: Number, default: 0 },
    scannedItems: [{
        barcode: String,
        scanTime: String,
        manuallyMarked: { type: Boolean, default: false }
    }],
    missingItems: [{
        barcode: String,
        itemCode: String
    }],
    wrongScans: [{
        barcode: String,
        expectedPrefix: String,
        actualPrefix: String,
        time: String
    }],
    submittedAt: { type: Date, default: Date.now },
    submittedBy: { type: String },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
    notes: { type: String }
});

const StockCheckReport = mongoose.model('StockCheckReport', stockCheckReportSchema);

// Get product types (grouped by first 3 digits) for a godown
router.get('/godown/:godownId/product-types', async (req, res) => {
    try {
        const { godownId } = req.params;

        // Get godown details
        const Godown = mongoose.model('Godown');
        const godown = await Godown.findById(godownId);

        if (!godown) {
            return res.status(404).json({ message: 'Godown not found' });
        }

        // Get Delevery1 model (items in godown)
        let Delevery1;
        try {
            Delevery1 = mongoose.model('Delevery1');
        } catch (error) {
            const delevery1Schema = new mongoose.Schema({
                selectedOption: String,
                inputValue: String,
                godownName: String,
                addedAt: { type: Date, default: Date.now },
                itemName: String,
                quantity: { type: Number, default: 0 },
                price: { type: Number, default: 0 },
                masterPrice: { type: Number, default: 0 },
                description: String,
                category: String,
                godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
                lastUpdated: { type: Date, default: Date.now }
            });
            Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
        }

        // Fetch all items in this godown
        const items = await Delevery1.find({ godownName: godown.name });

        // Group by first 3 digits (product type prefix)
        const productTypesMap = {};
        items.forEach(item => {
            if (item.inputValue && item.inputValue.length >= 3) {
                const prefix = item.inputValue.substring(0, 3);
                if (!productTypesMap[prefix]) {
                    productTypesMap[prefix] = {
                        prefix: prefix,
                        name: item.selectedOption || `Product ${prefix}`,
                        count: 0,
                        items: []
                    };
                }
                productTypesMap[prefix].count++;
                productTypesMap[prefix].items.push(item);
            }
        });

        const productTypes = Object.values(productTypesMap).sort((a, b) => b.count - a.count);

        logger.info('Product types fetched', { godownId, count: productTypes.length });
        res.json({ productTypes });

    } catch (error) {
        logger.error('Error fetching product types', error);
        res.status(500).json({ message: 'Error fetching product types', error: error.message });
    }
});

// Get items for a specific product type in a godown
router.get('/godown/:godownId/product-type/:prefix', async (req, res) => {
    try {
        const { godownId, prefix } = req.params;

        // Get godown details
        const Godown = mongoose.model('Godown');
        const godown = await Godown.findById(godownId);

        if (!godown) {
            return res.status(404).json({ message: 'Godown not found' });
        }

        // Get Delevery1 model
        let Delevery1;
        try {
            Delevery1 = mongoose.model('Delevery1');
        } catch (error) {
            const delevery1Schema = new mongoose.Schema({
                selectedOption: String,
                inputValue: String,
                godownName: String,
                addedAt: { type: Date, default: Date.now },
                itemName: String,
                quantity: { type: Number, default: 0 },
                price: { type: Number, default: 0 },
                masterPrice: { type: Number, default: 0 },
                description: String,
                category: String,
                godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
                lastUpdated: { type: Date, default: Date.now }
            });
            Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
        }

        // Fetch items matching the prefix in this godown
        const items = await Delevery1.find({
            godownName: godown.name,
            inputValue: { $regex: `^${prefix}` }
        });

        const formattedItems = items.map(item => ({
            barcode: item.inputValue,
            itemCode: item.selectedOption,
            itemName: item.itemName,
            godownName: item.godownName,
            addedAt: item.addedAt
        }));

        logger.info('Items fetched for product type', { godownId, prefix, count: formattedItems.length });
        res.json({ items: formattedItems });

    } catch (error) {
        logger.error('Error fetching items for product type', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
});

// Submit stock check report
router.post('/submit-report', async (req, res) => {
    try {
        const reportData = req.body;

        const report = new StockCheckReport(reportData);
        await report.save();

        logger.info('Stock check report submitted', {
            godownName: reportData.godownName,
            productType: reportData.productType,
            scannedCount: reportData.scannedCount,
            missingCount: reportData.missingCount
        });

        res.json({
            success: true,
            message: 'Stock check report submitted successfully',
            reportId: report._id
        });

    } catch (error) {
        logger.error('Error submitting stock check report', error);
        res.status(500).json({ message: 'Error submitting report', error: error.message });
    }
});

// Get all stock check reports (for admin)
router.get('/reports', async (req, res) => {
    try {
        const { status, godownId, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (godownId) query.godownId = godownId;

        const reports = await StockCheckReport.find(query)
            .sort({ submittedAt: -1 })
            .limit(parseInt(limit))
            .populate('godownId', 'name city state');

        logger.info('Stock check reports fetched', { count: reports.length });
        res.json({ reports });

    } catch (error) {
        logger.error('Error fetching stock check reports', error);
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
});

// Get single stock check report
router.get('/reports/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;

        const report = await StockCheckReport.findById(reportId)
            .populate('godownId', 'name city state address');

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json({ report });

    } catch (error) {
        logger.error('Error fetching stock check report', error);
        res.status(500).json({ message: 'Error fetching report', error: error.message });
    }
});

// Update stock check report status
router.put('/reports/:reportId/status', async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, notes } = req.body;

        const report = await StockCheckReport.findByIdAndUpdate(
            reportId,
            { status, notes },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        logger.info('Stock check report status updated', { reportId, status });
        res.json({ success: true, report });

    } catch (error) {
        logger.error('Error updating stock check report', error);
        res.status(500).json({ message: 'Error updating report', error: error.message });
    }
});

// Add missing items back to inventory
router.post('/reports/:reportId/add-missing-items', async (req, res) => {
    try {
        const { reportId } = req.params;
        const { barcodes } = req.body; // Array of barcodes to add back

        const report = await StockCheckReport.findById(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Get Delevery1 model
        let Delevery1;
        try {
            Delevery1 = mongoose.model('Delevery1');
        } catch (error) {
            const delevery1Schema = new mongoose.Schema({
                selectedOption: String,
                inputValue: String,
                godownName: String,
                addedAt: { type: Date, default: Date.now },
                itemName: String,
                quantity: { type: Number, default: 0 },
                price: { type: Number, default: 0 },
                masterPrice: { type: Number, default: 0 },
                description: String,
                category: String,
                godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
                lastUpdated: { type: Date, default: Date.now }
            });
            Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
        }

        const addedItems = [];
        for (const barcode of barcodes) {
            const missingItem = report.missingItems.find(item => item.barcode === barcode);
            if (missingItem) {
                // Add item back to inventory
                const newItem = new Delevery1({
                    inputValue: barcode,
                    selectedOption: missingItem.itemCode,
                    godownName: report.godownName,
                    godownId: report.godownId,
                    addedAt: new Date(),
                    itemName: `${missingItem.itemCode} - ${barcode}`
                });
                await newItem.save();
                addedItems.push(barcode);

                // Remove from missing items in report
                report.missingItems = report.missingItems.filter(item => item.barcode !== barcode);
                report.missingCount = report.missingItems.length;
            }
        }

        await report.save();

        logger.info('Missing items added back to inventory', { reportId, count: addedItems.length });
        res.json({
            success: true,
            message: `${addedItems.length} items added back to inventory`,
            addedItems
        });

    } catch (error) {
        logger.error('Error adding missing items back', error);
        res.status(500).json({ message: 'Error adding items', error: error.message });
    }
});

// Get stock check statistics
router.get('/statistics', async (req, res) => {
    try {
        const totalReports = await StockCheckReport.countDocuments();
        const pendingReports = await StockCheckReport.countDocuments({ status: 'pending' });
        const resolvedReports = await StockCheckReport.countDocuments({ status: 'resolved' });

        const recentReports = await StockCheckReport.find()
            .sort({ submittedAt: -1 })
            .limit(10)
            .populate('godownId', 'name');

        // Calculate total missing items across all pending reports
        const pendingReportsData = await StockCheckReport.find({ status: 'pending' });
        const totalMissingItems = pendingReportsData.reduce((sum, report) => sum + report.missingCount, 0);

        res.json({
            totalReports,
            pendingReports,
            resolvedReports,
            totalMissingItems,
            recentReports
        });

    } catch (error) {
        logger.error('Error fetching stock check statistics', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
});

module.exports = router;
