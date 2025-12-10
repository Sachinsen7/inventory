const express = require('express');
const router = express.Router();
const Voucher = require('../models/Voucher');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const LedgerEntry = require('../models/LedgerEntry');

// Get all vouchers with pagination and filters
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            voucherType,
            status,
            fromDate,
            toDate,
            search,
            financialYear
        } = req.query;

        const filters = {};

        if (voucherType) filters.voucherType = voucherType;
        if (status) filters.status = status;
        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        if (search) {
            filters.$or = [
                { voucherNumber: { $regex: search, $options: 'i' } },
                { narration: { $regex: search, $options: 'i' } },
                { referenceNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const vouchers = await Voucher.find(filters)
            .sort({ voucherDate: -1, voucherNumber: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');

        const total = await Voucher.countDocuments(filters);

        res.json({
            vouchers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching vouchers:', error);
        res.status(500).json({ message: 'Error fetching vouchers', error: error.message });
    }
});

// Get voucher by ID
router.get('/:id', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .populate('items.account');

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        res.json(voucher);
    } catch (error) {
        console.error('Error fetching voucher:', error);
        res.status(500).json({ message: 'Error fetching voucher', error: error.message });
    }
});

// Create new voucher
router.post('/', async (req, res) => {
    try {
        const {
            voucherType,
            voucherDate,
            referenceNumber,
            referenceDate,
            narration,
            items,
            partyDetails,
            bankDetails,
            invoiceDetails
        } = req.body;

        // Get next voucher number
        const { voucherNumber } = await Settings.getNextVoucherNumber(voucherType);

        // Validate items
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'At least one voucher item is required' });
        }

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        let totalGST = 0;
        let totalTDS = 0;

        const processedItems = [];

        for (const item of items) {
            // Validate account exists
            let account;
            if (item.accountModel === 'Customer') {
                account = await Customer.findById(item.account);
            } else if (item.accountModel === 'Supplier') {
                account = await Supplier.findById(item.account);
            } else if (item.accountModel === 'LedgerEntry') {
                account = await LedgerEntry.findById(item.account);
            }

            if (!account) {
                return res.status(400).json({ message: `Account not found: ${item.accountName}` });
            }

            const processedItem = {
                account: item.account,
                accountModel: item.accountModel,
                accountName: item.accountName || account.name,
                description: item.description || '',
                debitAmount: parseFloat(item.debitAmount) || 0,
                creditAmount: parseFloat(item.creditAmount) || 0,
                gstRate: parseFloat(item.gstRate) || 0,
                gstAmount: parseFloat(item.gstAmount) || 0,
                tdsRate: parseFloat(item.tdsRate) || 0,
                tdsAmount: parseFloat(item.tdsAmount) || 0
            };

            totalDebit += processedItem.debitAmount;
            totalCredit += processedItem.creditAmount;
            totalGST += processedItem.gstAmount;
            totalTDS += processedItem.tdsAmount;

            processedItems.push(processedItem);
        }

        // Create voucher
        const voucher = new Voucher({
            voucherNumber,
            voucherType,
            voucherDate: new Date(voucherDate),
            referenceNumber,
            referenceDate: referenceDate ? new Date(referenceDate) : null,
            narration,
            items: processedItems,
            totalDebit,
            totalCredit,
            totalGST,
            totalTDS,
            partyDetails,
            bankDetails,
            invoiceDetails,
            createdBy: req.user?.id
        });

        await voucher.save();

        res.status(201).json({
            message: 'Voucher created successfully',
            voucher
        });
    } catch (error) {
        console.error('Error creating voucher:', error);
        res.status(500).json({ message: 'Error creating voucher', error: error.message });
    }
});

// Update voucher
router.put('/:id', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        if (voucher.status === 'posted') {
            return res.status(400).json({ message: 'Cannot update posted voucher' });
        }

        if (voucher.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot update cancelled voucher' });
        }

        // Update voucher fields
        Object.assign(voucher, req.body);
        voucher.updatedBy = req.user?.id;

        await voucher.save();

        res.json({
            message: 'Voucher updated successfully',
            voucher
        });
    } catch (error) {
        console.error('Error updating voucher:', error);
        res.status(500).json({ message: 'Error updating voucher', error: error.message });
    }
});

// Post voucher
router.post('/:id/post', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        await voucher.postVoucher();

        res.json({
            message: 'Voucher posted successfully',
            voucher
        });
    } catch (error) {
        console.error('Error posting voucher:', error);
        res.status(500).json({ message: 'Error posting voucher', error: error.message });
    }
});

// Cancel voucher
router.post('/:id/cancel', async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Cancel reason is required' });
        }

        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        await voucher.cancelVoucher(reason);

        res.json({
            message: 'Voucher cancelled successfully',
            voucher
        });
    } catch (error) {
        console.error('Error cancelling voucher:', error);
        res.status(500).json({ message: 'Error cancelling voucher', error: error.message });
    }
});

// Delete voucher (only draft vouchers)
router.delete('/:id', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        if (voucher.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft vouchers can be deleted' });
        }

        await Voucher.findByIdAndDelete(req.params.id);

        res.json({ message: 'Voucher deleted successfully' });
    } catch (error) {
        console.error('Error deleting voucher:', error);
        res.status(500).json({ message: 'Error deleting voucher', error: error.message });
    }
});

// Get voucher summary/dashboard data
router.get('/dashboard/summary', async (req, res) => {
    try {
        const { financialYear, fromDate, toDate } = req.query;

        const filters = {};
        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        const summary = await Voucher.getVoucherSummary(filters);

        // Get total counts by status
        const statusCounts = await Voucher.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent vouchers
        const recentVouchers = await Voucher.find(filters)
            .sort({ createdAt: -1 })
            .limit(10)
            .select('voucherNumber voucherType voucherDate totalDebit totalCredit status');

        res.json({
            summary,
            statusCounts,
            recentVouchers
        });
    } catch (error) {
        console.error('Error fetching voucher summary:', error);
        res.status(500).json({ message: 'Error fetching voucher summary', error: error.message });
    }
});

// Get accounts for voucher entry (customers, suppliers, ledger accounts)
router.get('/accounts/search', async (req, res) => {
    try {
        const { search, type } = req.query;

        const searchRegex = { $regex: search || '', $options: 'i' };
        const accounts = [];

        if (!type || type === 'customers') {
            const customers = await Customer.find({
                name: searchRegex
            }).limit(10).select('name gstNo address');

            customers.forEach(customer => {
                accounts.push({
                    _id: customer._id,
                    name: customer.name,
                    type: 'Customer',
                    model: 'Customer',
                    gstNo: customer.gstNo,
                    address: customer.address
                });
            });
        }

        if (!type || type === 'suppliers') {
            const suppliers = await Supplier.find({
                name: searchRegex
            }).limit(10).select('name gstNo address');

            suppliers.forEach(supplier => {
                accounts.push({
                    _id: supplier._id,
                    name: supplier.name,
                    type: 'Supplier',
                    model: 'Supplier',
                    gstNo: supplier.gstNo,
                    address: supplier.address
                });
            });
        }

        if (!type || type === 'ledger') {
            const ledgerEntries = await LedgerEntry.find({
                accountName: searchRegex
            }).limit(10).select('accountName');

            // Get unique account names
            const uniqueAccountNames = [...new Set(ledgerEntries.map(entry => entry.accountName))];

            uniqueAccountNames.forEach(accountName => {
                accounts.push({
                    _id: accountName,
                    name: accountName,
                    type: 'Ledger Account',
                    model: 'LedgerEntry'
                });
            });
        }

        res.json(accounts);
    } catch (error) {
        console.error('Error searching accounts:', error);
        res.status(500).json({ message: 'Error searching accounts', error: error.message });
    }
});

router.post('/:id/mark-provisional', async (req, res) => {
    try {
        const { reason } = req.body;
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        if (voucher.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft vouchers can be marked as provisional' });
        }

        await voucher.markAsProvisional(reason);

        res.json({
            message: 'Voucher marked as provisional successfully',
            voucher
        });
    } catch (error) {
        console.error('Error marking voucher as provisional:', error);
        res.status(500).json({ message: 'Error marking voucher as provisional', error: error.message });
    }
});

// Confirm provisional voucher
router.post('/:id/confirm-provisional', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        await voucher.confirmProvisional();

        res.json({
            message: 'Provisional voucher confirmed and posted successfully',
            voucher
        });
    } catch (error) {
        console.error('Error confirming provisional voucher:', error);
        res.status(500).json({ message: 'Error confirming provisional voucher', error: error.message });
    }
});

// Schedule post-dated voucher
router.post('/:id/schedule-postdated', async (req, res) => {
    try {
        const { effectiveDate, reason, autoPost } = req.body;
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        if (voucher.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft vouchers can be scheduled as post-dated' });
        }

        const effectiveDateObj = new Date(effectiveDate);
        if (effectiveDateObj <= new Date()) {
            return res.status(400).json({ message: 'Effective date must be in the future' });
        }

        await voucher.schedulePostDated(effectiveDateObj, reason, autoPost);

        res.json({
            message: 'Voucher scheduled as post-dated successfully',
            voucher
        });
    } catch (error) {
        console.error('Error scheduling post-dated voucher:', error);
        res.status(500).json({ message: 'Error scheduling post-dated voucher', error: error.message });
    }
});

// Process post-dated vouchers (for scheduled job)
router.post('/process-postdated', async (req, res) => {
    try {
        const results = await Voucher.processPostDatedVouchers();

        res.json({
            message: 'Post-dated vouchers processed successfully',
            results,
            processedCount: results.filter(r => r.status === 'success').length,
            errorCount: results.filter(r => r.status === 'error').length
        });
    } catch (error) {
        console.error('Error processing post-dated vouchers:', error);
        res.status(500).json({ message: 'Error processing post-dated vouchers', error: error.message });
    }
});

// Get post-dated vouchers
router.get('/postdated', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const postDatedVouchers = await Voucher.find({
            isPostDated: true,
            status: 'draft'
        })
            .sort({ effectiveDate: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Voucher.countDocuments({
            isPostDated: true,
            status: 'draft'
        });

        res.json({
            vouchers: postDatedVouchers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching post-dated vouchers:', error);
        res.status(500).json({ message: 'Error fetching post-dated vouchers', error: error.message });
    }
});

// Get provisional vouchers
router.get('/provisional', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const provisionalVouchers = await Voucher.find({
            status: 'provisional'
        })
            .sort({ provisionalDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Voucher.countDocuments({
            status: 'provisional'
        });

        res.json({
            vouchers: provisionalVouchers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching provisional vouchers:', error);
        res.status(500).json({ message: 'Error fetching provisional vouchers', error: error.message });
    }
});

module.exports = router;// Mark voucher as provisional
