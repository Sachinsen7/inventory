const express = require('express');
const router = express.Router();
const BankReconciliation = require('../models/BankReconciliation');
const LedgerEntry = require('../models/LedgerEntry');
const Voucher = require('../models/Voucher');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all bank reconciliations
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, status, bankAccount } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (bankAccount) filter.bankAccount = new RegExp(bankAccount, 'i');

        const reconciliations = await BankReconciliation.find(filter)
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await BankReconciliation.countDocuments(filter);

        res.json({
            reconciliations,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching bank reconciliations:', error);
        res.status(500).json({ message: 'Error fetching bank reconciliations', error: error.message });
    }
});

// Get bank reconciliation by ID
router.get('/:id', async (req, res) => {
    try {
        const reconciliation = await BankReconciliation.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name')
            .populate('bankEntries.matchedVoucherId')
            .populate('bookEntries.voucherId');

        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        res.json(reconciliation);
    } catch (error) {
        console.error('Error fetching bank reconciliation:', error);
        res.status(500).json({ message: 'Error fetching bank reconciliation', error: error.message });
    }
});

// Create new bank reconciliation
router.post('/', async (req, res) => {
    try {
        const {
            bankAccount,
            accountNumber,
            statementPeriod,
            openingBalance,
            closingBalance
        } = req.body;

        const reconciliation = new BankReconciliation({
            bankAccount,
            accountNumber,
            statementPeriod,
            openingBalance,
            closingBalance,
            createdBy: req.user?.id // Assuming user middleware
        });

        // Auto-load book entries from ledger
        await reconciliation.loadBookEntries();

        res.status(201).json(reconciliation);
    } catch (error) {
        console.error('Error creating bank reconciliation:', error);
        res.status(500).json({ message: 'Error creating bank reconciliation', error: error.message });
    }
});

// Update bank reconciliation
router.put('/:id', async (req, res) => {
    try {
        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        Object.assign(reconciliation, req.body);
        await reconciliation.save();

        res.json(reconciliation);
    } catch (error) {
        console.error('Error updating bank reconciliation:', error);
        res.status(500).json({ message: 'Error updating bank reconciliation', error: error.message });
    }
});

// Import bank statement from CSV
router.post('/:id/import-statement', upload.single('csvFile'), async (req, res) => {
    try {
        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded' });
        }

        const csvData = [];

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                csvData.push(row);
            })
            .on('end', async () => {
                try {
                    await BankReconciliation.importBankStatement(req.params.id, csvData);

                    // Clean up uploaded file
                    fs.unlinkSync(req.file.path);

                    const updatedReconciliation = await BankReconciliation.findById(req.params.id);
                    res.json({
                        message: 'Bank statement imported successfully',
                        entriesCount: csvData.length,
                        reconciliation: updatedReconciliation
                    });
                } catch (importError) {
                    console.error('Error importing bank statement:', importError);
                    res.status(500).json({ message: 'Error importing bank statement', error: importError.message });
                }
            });
    } catch (error) {
        console.error('Error processing bank statement import:', error);
        res.status(500).json({ message: 'Error processing bank statement import', error: error.message });
    }
});

// Auto-match entries
router.post('/:id/auto-match', async (req, res) => {
    try {
        const result = await BankReconciliation.autoMatch(req.params.id);

        const updatedReconciliation = await BankReconciliation.findById(req.params.id);

        res.json({
            message: `Auto-matched ${result.matchCount} entries`,
            matchCount: result.matchCount,
            reconciliation: updatedReconciliation
        });
    } catch (error) {
        console.error('Error auto-matching entries:', error);
        res.status(500).json({ message: 'Error auto-matching entries', error: error.message });
    }
});

// Manual match entries
router.post('/:id/manual-match', async (req, res) => {
    try {
        const { bankEntryId, bookEntryId } = req.body;

        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        const bankEntry = reconciliation.bankEntries.id(bankEntryId);
        const bookEntry = reconciliation.bookEntries.id(bookEntryId);

        if (!bankEntry || !bookEntry) {
            return res.status(400).json({ message: 'Invalid entry IDs' });
        }

        // Mark as matched
        bankEntry.matched = true;
        bankEntry.matchedLedgerEntryId = bookEntry.ledgerEntryId;
        bookEntry.matched = true;
        bookEntry.matchedBankEntryId = bankEntryId;

        await reconciliation.save();

        res.json({
            message: 'Entries matched successfully',
            reconciliation
        });
    } catch (error) {
        console.error('Error matching entries:', error);
        res.status(500).json({ message: 'Error matching entries', error: error.message });
    }
});

// Unmatch entries
router.post('/:id/unmatch', async (req, res) => {
    try {
        const { bankEntryId, bookEntryId } = req.body;

        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        if (bankEntryId) {
            const bankEntry = reconciliation.bankEntries.id(bankEntryId);
            if (bankEntry) {
                bankEntry.matched = false;
                bankEntry.matchedLedgerEntryId = null;
            }
        }

        if (bookEntryId) {
            const bookEntry = reconciliation.bookEntries.id(bookEntryId);
            if (bookEntry) {
                bookEntry.matched = false;
                bookEntry.matchedBankEntryId = null;
            }
        }

        await reconciliation.save();

        res.json({
            message: 'Entries unmatched successfully',
            reconciliation
        });
    } catch (error) {
        console.error('Error unmatching entries:', error);
        res.status(500).json({ message: 'Error unmatching entries', error: error.message });
    }
});

// Complete reconciliation
router.post('/:id/complete', async (req, res) => {
    try {
        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        reconciliation.status = 'Completed';
        await reconciliation.save();

        res.json({
            message: 'Bank reconciliation completed successfully',
            reconciliation
        });
    } catch (error) {
        console.error('Error completing reconciliation:', error);
        res.status(500).json({ message: 'Error completing reconciliation', error: error.message });
    }
});

// Approve reconciliation
router.post('/:id/approve', async (req, res) => {
    try {
        const reconciliation = await BankReconciliation.findById(req.params.id);
        if (!reconciliation) {
            return res.status(404).json({ message: 'Bank reconciliation not found' });
        }

        reconciliation.status = 'Approved';
        reconciliation.approvedBy = req.user?.id;
        reconciliation.approvedAt = new Date();
        await reconciliation.save();

        res.json({
            message: 'Bank reconciliation approved successfully',
            reconciliation
        });
    } catch (error) {
        console.error('Error approving reconciliation:', error);
        res.status(500).json({ message: 'Error approving reconciliation', error: error.message });
    }
});

// Get bank accounts for dropdown
router.get('/accounts/list', async (req, res) => {
    try {
        // Get unique bank account names from ledger entries
        const bankAccounts = await LedgerEntry.distinct('accountName', {
            accountName: { $regex: /bank|cash/i }
        });

        res.json(bankAccounts);
    } catch (error) {
        console.error('Error fetching bank accounts:', error);
        res.status(500).json({ message: 'Error fetching bank accounts', error: error.message });
    }
});

// Get reconciliation dashboard data
router.get('/dashboard/summary', async (req, res) => {
    try {
        const totalReconciliations = await BankReconciliation.countDocuments();
        const pendingReconciliations = await BankReconciliation.countDocuments({ status: { $in: ['Draft', 'In Progress'] } });
        const completedReconciliations = await BankReconciliation.countDocuments({ status: 'Completed' });
        const approvedReconciliations = await BankReconciliation.countDocuments({ status: 'Approved' });

        // Recent reconciliations
        const recentReconciliations = await BankReconciliation.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        // Bank account wise summary
        const bankAccountSummary = await BankReconciliation.aggregate([
            {
                $group: {
                    _id: '$bankAccount',
                    count: { $sum: 1 },
                    totalDifference: { $sum: '$summary.reconciliationDifference' },
                    lastReconciliation: { $max: '$updatedAt' }
                }
            }
        ]);

        res.json({
            summary: {
                total: totalReconciliations,
                pending: pendingReconciliations,
                completed: completedReconciliations,
                approved: approvedReconciliations
            },
            recentReconciliations,
            bankAccountSummary
        });
    } catch (error) {
        console.error('Error fetching reconciliation dashboard:', error);
        res.status(500).json({ message: 'Error fetching reconciliation dashboard', error: error.message });
    }
});

module.exports = router;