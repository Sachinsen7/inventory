const express = require('express');
const router = express.Router();
const Voucher = require('../models/Voucher');
const LedgerEntry = require('../models/LedgerEntry');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Settings = require('../models/Settings');

// Get Trial Balance
router.get('/trial-balance', async (req, res) => {
    try {
        const { fromDate, toDate, financialYear } = req.query;

        const filters = {};
        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        // Get all ledger entries
        const ledgerEntries = await LedgerEntry.find(filters);

        // Group by account and calculate balances
        const accountBalances = {};

        for (const entry of ledgerEntries) {
            const accountKey = `${entry.accountModel}_${entry.account}`;

            if (!accountBalances[accountKey]) {
                accountBalances[accountKey] = {
                    accountName: entry.accountName,
                    accountType: entry.accountModel,
                    accountId: entry.account,
                    debitTotal: 0,
                    creditTotal: 0,
                    balance: 0
                };
            }

            accountBalances[accountKey].debitTotal += entry.debitAmount || 0;
            accountBalances[accountKey].creditTotal += entry.creditAmount || 0;
        }

        // Calculate net balances and determine debit/credit nature
        const trialBalance = Object.values(accountBalances).map(account => {
            const netBalance = account.debitTotal - account.creditTotal;
            return {
                ...account,
                balance: Math.abs(netBalance),
                balanceType: netBalance >= 0 ? 'debit' : 'credit'
            };
        }).filter(account => account.balance > 0);

        // Calculate totals
        const totalDebit = trialBalance
            .filter(account => account.balanceType === 'debit')
            .reduce((sum, account) => sum + account.balance, 0);

        const totalCredit = trialBalance
            .filter(account => account.balanceType === 'credit')
            .reduce((sum, account) => sum + account.balance, 0);

        res.json({
            trialBalance,
            totals: {
                totalDebit,
                totalCredit,
                difference: totalDebit - totalCredit
            },
            filters: { fromDate, toDate, financialYear }
        });
    } catch (error) {
        console.error('Error generating trial balance:', error);
        res.status(500).json({ message: 'Error generating trial balance', error: error.message });
    }
});

// Get Profit & Loss Statement
router.get('/profit-loss', async (req, res) => {
    try {
        const { fromDate, toDate, financialYear } = req.query;

        const filters = { status: 'posted' };
        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        // Get all posted vouchers
        const vouchers = await Voucher.find(filters);

        const incomeAccounts = [];
        const expenseAccounts = [];

        // Categorize accounts based on voucher types
        for (const voucher of vouchers) {
            for (const item of voucher.items) {
                const accountData = {
                    accountName: item.accountName,
                    accountType: item.accountModel,
                    amount: 0
                };

                // Sales vouchers - credit amounts are income
                if (voucher.voucherType === 'sales' && item.creditAmount > 0) {
                    accountData.amount = item.creditAmount;
                    const existing = incomeAccounts.find(acc => acc.accountName === item.accountName);
                    if (existing) {
                        existing.amount += accountData.amount;
                    } else {
                        incomeAccounts.push(accountData);
                    }
                }

                // Purchase vouchers - debit amounts are expenses
                if (voucher.voucherType === 'purchase' && item.debitAmount > 0) {
                    accountData.amount = item.debitAmount;
                    const existing = expenseAccounts.find(acc => acc.accountName === item.accountName);
                    if (existing) {
                        existing.amount += accountData.amount;
                    } else {
                        expenseAccounts.push(accountData);
                    }
                }

                // Payment vouchers - expenses
                if (voucher.voucherType === 'payment' && item.debitAmount > 0 &&
                    !item.accountName.toLowerCase().includes('bank') &&
                    !item.accountName.toLowerCase().includes('cash')) {
                    accountData.amount = item.debitAmount;
                    const existing = expenseAccounts.find(acc => acc.accountName === item.accountName);
                    if (existing) {
                        existing.amount += accountData.amount;
                    } else {
                        expenseAccounts.push(accountData);
                    }
                }
            }
        }

        const totalIncome = incomeAccounts.reduce((sum, acc) => sum + acc.amount, 0);
        const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        res.json({
            income: {
                accounts: incomeAccounts,
                total: totalIncome
            },
            expenses: {
                accounts: expenseAccounts,
                total: totalExpenses
            },
            netProfit,
            filters: { fromDate, toDate, financialYear }
        });
    } catch (error) {
        console.error('Error generating P&L statement:', error);
        res.status(500).json({ message: 'Error generating P&L statement', error: error.message });
    }
});

// Get Balance Sheet
router.get('/balance-sheet', async (req, res) => {
    try {
        const { asOnDate, financialYear } = req.query;
        const cutoffDate = asOnDate ? new Date(asOnDate) : new Date();

        const filters = {
            status: 'posted',
            voucherDate: { $lte: cutoffDate }
        };
        if (financialYear) filters.financialYear = financialYear;

        // Get all ledger entries up to the cutoff date
        const ledgerEntries = await LedgerEntry.find({
            voucherDate: { $lte: cutoffDate }
        });

        const assets = [];
        const liabilities = [];
        const equity = [];

        // Group by account
        const accountBalances = {};

        for (const entry of ledgerEntries) {
            const accountKey = `${entry.accountModel}_${entry.account}`;

            if (!accountBalances[accountKey]) {
                accountBalances[accountKey] = {
                    accountName: entry.accountName,
                    accountType: entry.accountModel,
                    debitTotal: 0,
                    creditTotal: 0
                };
            }

            accountBalances[accountKey].debitTotal += entry.debitAmount || 0;
            accountBalances[accountKey].creditTotal += entry.creditAmount || 0;
        }

        // Categorize accounts
        Object.values(accountBalances).forEach(account => {
            const netBalance = account.debitTotal - account.creditTotal;
            const balance = Math.abs(netBalance);

            if (balance > 0) {
                const accountData = {
                    accountName: account.accountName,
                    accountType: account.accountType,
                    amount: balance
                };

                // Simple categorization logic (can be enhanced)
                if (account.accountName.toLowerCase().includes('cash') ||
                    account.accountName.toLowerCase().includes('bank') ||
                    account.accountName.toLowerCase().includes('inventory') ||
                    account.accountName.toLowerCase().includes('asset') ||
                    account.accountType === 'Customer') {
                    assets.push(accountData);
                } else if (account.accountName.toLowerCase().includes('capital') ||
                    account.accountName.toLowerCase().includes('equity') ||
                    account.accountName.toLowerCase().includes('retained')) {
                    equity.push(accountData);
                } else {
                    liabilities.push(accountData);
                }
            }
        });

        const totalAssets = assets.reduce((sum, acc) => sum + acc.amount, 0);
        const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.amount, 0);
        const totalEquity = equity.reduce((sum, acc) => sum + acc.amount, 0);

        res.json({
            assets: {
                accounts: assets,
                total: totalAssets
            },
            liabilities: {
                accounts: liabilities,
                total: totalLiabilities
            },
            equity: {
                accounts: equity,
                total: totalEquity
            },
            totals: {
                assetsTotal: totalAssets,
                liabilitiesAndEquityTotal: totalLiabilities + totalEquity,
                difference: totalAssets - (totalLiabilities + totalEquity)
            },
            asOnDate: cutoffDate
        });
    } catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({ message: 'Error generating balance sheet', error: error.message });
    }
});

// Get Cash Flow Statement
router.get('/cash-flow', async (req, res) => {
    try {
        const { fromDate, toDate, financialYear } = req.query;

        const filters = { status: 'posted' };
        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        const vouchers = await Voucher.find(filters);

        const operatingActivities = [];
        const investingActivities = [];
        const financingActivities = [];

        let cashInflow = 0;
        let cashOutflow = 0;

        for (const voucher of vouchers) {
            for (const item of voucher.items) {
                // Cash and bank accounts
                if (item.accountName.toLowerCase().includes('cash') ||
                    item.accountName.toLowerCase().includes('bank')) {

                    const activity = {
                        date: voucher.voucherDate,
                        description: `${voucher.voucherType} - ${voucher.narration}`,
                        voucherNumber: voucher.voucherNumber,
                        inflow: item.debitAmount || 0,
                        outflow: item.creditAmount || 0
                    };

                    cashInflow += activity.inflow;
                    cashOutflow += activity.outflow;

                    // Categorize based on voucher type
                    if (['sales', 'purchase', 'receipt', 'payment'].includes(voucher.voucherType)) {
                        operatingActivities.push(activity);
                    } else if (voucher.voucherType === 'journal') {
                        // Could be any category - default to operating
                        operatingActivities.push(activity);
                    } else {
                        operatingActivities.push(activity);
                    }
                }
            }
        }

        const netCashFlow = cashInflow - cashOutflow;

        res.json({
            operatingActivities: {
                activities: operatingActivities,
                netCashFlow: operatingActivities.reduce((sum, act) => sum + act.inflow - act.outflow, 0)
            },
            investingActivities: {
                activities: investingActivities,
                netCashFlow: investingActivities.reduce((sum, act) => sum + act.inflow - act.outflow, 0)
            },
            financingActivities: {
                activities: financingActivities,
                netCashFlow: financingActivities.reduce((sum, act) => sum + act.inflow - act.outflow, 0)
            },
            summary: {
                totalInflow: cashInflow,
                totalOutflow: cashOutflow,
                netCashFlow
            },
            filters: { fromDate, toDate, financialYear }
        });
    } catch (error) {
        console.error('Error generating cash flow statement:', error);
        res.status(500).json({ message: 'Error generating cash flow statement', error: error.message });
    }
});

// Get Voucher-wise Reports
router.get('/voucher-wise', async (req, res) => {
    try {
        const {
            voucherType,
            fromDate,
            toDate,
            financialYear,
            status = 'posted',
            page = 1,
            limit = 50
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

        const vouchers = await Voucher.find(filters)
            .sort({ voucherDate: -1, voucherNumber: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name');

        const total = await Voucher.countDocuments(filters);

        // Calculate summary
        const summary = await Voucher.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: null,
                    totalVouchers: { $sum: 1 },
                    totalDebit: { $sum: '$totalDebit' },
                    totalCredit: { $sum: '$totalCredit' },
                    totalGST: { $sum: '$totalGST' },
                    totalTDS: { $sum: '$totalTDS' }
                }
            }
        ]);

        res.json({
            vouchers,
            summary: summary[0] || {
                totalVouchers: 0,
                totalDebit: 0,
                totalCredit: 0,
                totalGST: 0,
                totalTDS: 0
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                limit: parseInt(limit)
            },
            filters
        });
    } catch (error) {
        console.error('Error generating voucher-wise report:', error);
        res.status(500).json({ message: 'Error generating voucher-wise report', error: error.message });
    }
});

// Get Account Ledger
router.get('/account-ledger', async (req, res) => {
    try {
        const {
            accountId,
            accountModel,
            fromDate,
            toDate,
            financialYear,
            page = 1,
            limit = 100
        } = req.query;

        if (!accountId || !accountModel) {
            return res.status(400).json({ message: 'Account ID and Account Model are required' });
        }

        const filters = {
            account: accountId,
            accountModel: accountModel
        };

        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        // Get opening balance (entries before fromDate)
        let openingBalance = 0;
        if (fromDate) {
            const openingEntries = await LedgerEntry.find({
                account: accountId,
                accountModel: accountModel,
                voucherDate: { $lt: new Date(fromDate) }
            });

            openingBalance = openingEntries.reduce((balance, entry) => {
                return balance + (entry.debitAmount || 0) - (entry.creditAmount || 0);
            }, 0);
        }

        const ledgerEntries = await LedgerEntry.find(filters)
            .sort({ voucherDate: 1, createdAt: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await LedgerEntry.countDocuments(filters);

        // Calculate running balance
        let runningBalance = openingBalance;
        const entriesWithBalance = ledgerEntries.map(entry => {
            runningBalance += (entry.debitAmount || 0) - (entry.creditAmount || 0);
            return {
                ...entry.toObject(),
                runningBalance
            };
        });

        // Get account details
        let accountDetails = null;
        if (accountModel === 'Customer') {
            accountDetails = await Customer.findById(accountId).select('name gstNo address phone');
        } else if (accountModel === 'Supplier') {
            accountDetails = await Supplier.findById(accountId).select('name gstNo address phone');
        }

        // Calculate totals
        const totalDebit = ledgerEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
        const totalCredit = ledgerEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
        const closingBalance = openingBalance + totalDebit - totalCredit;

        res.json({
            accountDetails,
            openingBalance,
            closingBalance,
            entries: entriesWithBalance,
            totals: {
                totalDebit,
                totalCredit,
                netMovement: totalDebit - totalCredit
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                limit: parseInt(limit)
            },
            filters
        });
    } catch (error) {
        console.error('Error generating account ledger:', error);
        res.status(500).json({ message: 'Error generating account ledger', error: error.message });
    }
});

// Get Financial Year Summary
router.get('/financial-year-summary', async (req, res) => {
    try {
        const { financialYear } = req.query;

        const filters = { status: 'posted' };
        if (financialYear) filters.financialYear = financialYear;

        // Get voucher summary by type
        const voucherSummary = await Voucher.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: '$voucherType',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalDebit' },
                    totalGST: { $sum: '$totalGST' },
                    totalTDS: { $sum: '$totalTDS' }
                }
            }
        ]);

        // Get monthly summary
        const monthlySummary = await Voucher.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: {
                        year: { $year: '$voucherDate' },
                        month: { $month: '$voucherDate' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalDebit' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            voucherSummary,
            monthlySummary,
            financialYear: financialYear || 'All Years'
        });
    } catch (error) {
        console.error('Error generating financial year summary:', error);
        res.status(500).json({ message: 'Error generating financial year summary', error: error.message });
    }
});


router.get('/day-book', async (req, res) => {
    try {
        const {
            date,
            fromDate,
            toDate,
            voucherType,
            page = 1,
            limit = 50,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        const filters = {};

        // Date filtering
        if (date) {
            const selectedDate = new Date(date);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            filters.date = {
                $gte: selectedDate,
                $lt: nextDay
            };
        } else if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        // Voucher type filtering
        if (voucherType && voucherType !== 'all') {
            filters.type = voucherType;
        }

        // Only posted vouchers
        filters.status = 'Posted';

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        if (sortBy !== 'voucherNumber') {
            sort.voucherNumber = 1; // Secondary sort by voucher number
        }

        // Get vouchers with pagination
        const vouchers = await Voucher.find(filters)
            .populate('createdBy', 'name')
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Voucher.countDocuments(filters);

        // Get detailed entries for each voucher
        const dayBookEntries = [];

        for (const voucher of vouchers) {
            // Get ledger entries for this voucher
            const ledgerEntries = await LedgerEntry.find({ voucherId: voucher._id });

            // Create day book entry
            const entry = {
                _id: voucher._id,
                date: voucher.date,
                voucherNumber: voucher.voucherNumber,
                voucherType: voucher.type,
                narration: voucher.narration,
                referenceNumber: voucher.referenceNumber,
                totalAmount: voucher.totalAmount,
                status: voucher.status,
                createdBy: voucher.createdBy,
                createdAt: voucher.createdAt,

                // Ledger entries breakdown
                entries: ledgerEntries.map(entry => ({
                    accountName: entry.accountName,
                    accountType: entry.accountModel,
                    debitAmount: entry.debitAmount || 0,
                    creditAmount: entry.creditAmount || 0,
                    narration: entry.narration
                })),

                // Summary
                totalDebits: ledgerEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0),
                totalCredits: ledgerEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0)
            };

            dayBookEntries.push(entry);
        }

        // Calculate summary statistics
        const summary = {
            totalVouchers: dayBookEntries.length,
            totalAmount: dayBookEntries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0),
            totalDebits: dayBookEntries.reduce((sum, entry) => sum + entry.totalDebits, 0),
            totalCredits: dayBookEntries.reduce((sum, entry) => sum + entry.totalCredits, 0),
            voucherTypeCounts: {}
        };

        // Count by voucher type
        dayBookEntries.forEach(entry => {
            summary.voucherTypeCounts[entry.voucherType] =
                (summary.voucherTypeCounts[entry.voucherType] || 0) + 1;
        });

        res.json({
            dayBookEntries,
            summary,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error generating day book:', error);
        res.status(500).json({
            message: 'Error generating day book',
            error: error.message
        });
    }
});

// Get Cash Book Report
router.get('/cash-book', async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            cashAccount = 'Cash',
            page = 1,
            limit = 100
        } = req.query;

        const filters = {
            accountName: new RegExp(cashAccount, 'i'),
            accountModel: { $in: ['Customer', 'Supplier', 'LedgerAccount'] }
        };

        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        // Get cash account ledger entries
        const ledgerEntries = await LedgerEntry.find(filters)
            .populate('voucherId')
            .sort({ date: 1, createdAt: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await LedgerEntry.countDocuments(filters);

        // Calculate running balance
        let runningBalance = 0;

        // Get opening balance (entries before fromDate)
        if (fromDate) {
            const openingEntries = await LedgerEntry.find({
                accountName: new RegExp(cashAccount, 'i'),
                date: { $lt: new Date(fromDate) }
            });

            runningBalance = openingEntries.reduce((balance, entry) => {
                return balance + (entry.debitAmount || 0) - (entry.creditAmount || 0);
            }, 0);
        }

        const cashBookEntries = ledgerEntries.map(entry => {
            runningBalance += (entry.debitAmount || 0) - (entry.creditAmount || 0);

            return {
                _id: entry._id,
                date: entry.date,
                voucherNumber: entry.voucherId?.voucherNumber,
                voucherType: entry.voucherId?.type,
                particulars: entry.narration || entry.voucherId?.narration,
                referenceNumber: entry.voucherId?.referenceNumber,
                debitAmount: entry.debitAmount || 0,
                creditAmount: entry.creditAmount || 0,
                balance: runningBalance,
                voucherId: entry.voucherId?._id
            };
        });

        // Calculate summary
        const summary = {
            openingBalance: runningBalance - ledgerEntries.reduce((sum, entry) =>
                sum + (entry.debitAmount || 0) - (entry.creditAmount || 0), 0),
            totalReceipts: ledgerEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0),
            totalPayments: ledgerEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0),
            closingBalance: runningBalance,
            totalTransactions: ledgerEntries.length
        };

        res.json({
            cashBookEntries,
            summary,
            accountName: cashAccount,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });

    } catch (error) {
        console.error('Error generating cash book:', error);
        res.status(500).json({
            message: 'Error generating cash book',
            error: error.message
        });
    }
});

// Get Bank Book Report
router.get('/bank-book', async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            bankAccount,
            page = 1,
            limit = 100
        } = req.query;

        if (!bankAccount) {
            return res.status(400).json({ message: 'Bank account name is required' });
        }

        const filters = {
            accountName: new RegExp(bankAccount, 'i'),
            accountModel: { $in: ['Customer', 'Supplier', 'LedgerAccount'] }
        };

        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        // Get bank account ledger entries
        const ledgerEntries = await LedgerEntry.find(filters)
            .populate('voucherId')
            .sort({ date: 1, createdAt: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await LedgerEntry.countDocuments(filters);

        // Calculate running balance
        let runningBalance = 0;

        // Get opening balance
        if (fromDate) {
            const openingEntries = await LedgerEntry.find({
                accountName: new RegExp(bankAccount, 'i'),
                date: { $lt: new Date(fromDate) }
            });

            runningBalance = openingEntries.reduce((balance, entry) => {
                return balance + (entry.debitAmount || 0) - (entry.creditAmount || 0);
            }, 0);
        }

        const bankBookEntries = ledgerEntries.map(entry => {
            runningBalance += (entry.debitAmount || 0) - (entry.creditAmount || 0);

            return {
                _id: entry._id,
                date: entry.date,
                voucherNumber: entry.voucherId?.voucherNumber,
                voucherType: entry.voucherId?.type,
                particulars: entry.narration || entry.voucherId?.narration,
                chequeNumber: entry.voucherId?.bankDetails?.chequeNumber,
                referenceNumber: entry.voucherId?.referenceNumber,
                debitAmount: entry.debitAmount || 0,
                creditAmount: entry.creditAmount || 0,
                balance: runningBalance,
                voucherId: entry.voucherId?._id
            };
        });

        // Calculate summary
        const summary = {
            openingBalance: runningBalance - ledgerEntries.reduce((sum, entry) =>
                sum + (entry.debitAmount || 0) - (entry.creditAmount || 0), 0),
            totalDeposits: ledgerEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0),
            totalWithdrawals: ledgerEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0),
            closingBalance: runningBalance,
            totalTransactions: ledgerEntries.length,
            chequeTransactions: ledgerEntries.filter(entry =>
                entry.voucherId?.bankDetails?.chequeNumber).length
        };

        res.json({
            bankBookEntries,
            summary,
            accountName: bankAccount,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });

    } catch (error) {
        console.error('Error generating bank book:', error);
        res.status(500).json({
            message: 'Error generating bank book',
            error: error.message
        });
    }
});

// Get available cash and bank accounts
router.get('/cash-bank-accounts', async (req, res) => {
    try {
        // Get unique account names that contain cash or bank
        const cashBankAccounts = await LedgerEntry.distinct('accountName', {
            accountName: { $regex: /cash|bank|petty/i }
        });

        // Categorize accounts
        const accounts = {
            cashAccounts: cashBankAccounts.filter(name =>
                /cash|petty/i.test(name) && !/bank/i.test(name)),
            bankAccounts: cashBankAccounts.filter(name =>
                /bank/i.test(name))
        };

        res.json(accounts);
    } catch (error) {
        console.error('Error fetching cash/bank accounts:', error);
        res.status(500).json({
            message: 'Error fetching cash/bank accounts',
            error: error.message
        });
    }
});

router.get('/ratio-analysis', async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            financialYear,
            asOnDate = new Date().toISOString().split('T')[0]
        } = req.query;

        // Build date filters
        const filters = {};
        if (financialYear) filters.financialYear = financialYear;

        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        // Get all ledger entries for the period
        const ledgerEntries = await LedgerEntry.find(filters);

        // Categorize accounts
        const accounts = {
            currentAssets: 0,
            fixedAssets: 0,
            totalAssets: 0,
            currentLiabilities: 0,
            longTermLiabilities: 0,
            totalLiabilities: 0,
            equity: 0,
            revenue: 0,
            costOfGoodsSold: 0,
            operatingExpenses: 0,
            netIncome: 0,
            inventory: 0,
            accountsReceivable: 0,
            accountsPayable: 0,
            cash: 0
        };

        // Process ledger entries to categorize accounts
        for (const entry of ledgerEntries) {
            const accountName = entry.accountName.toLowerCase();
            const netAmount = (entry.debitAmount || 0) - (entry.creditAmount || 0);

            // Categorize based on account names (simplified logic)
            if (accountName.includes('cash') || accountName.includes('bank')) {
                accounts.cash += netAmount;
                accounts.currentAssets += netAmount;
            } else if (accountName.includes('inventory') || accountName.includes('stock')) {
                accounts.inventory += netAmount;
                accounts.currentAssets += netAmount;
            } else if (entry.accountModel === 'Customer') {
                accounts.accountsReceivable += netAmount;
                accounts.currentAssets += netAmount;
            } else if (entry.accountModel === 'Supplier') {
                accounts.accountsPayable += Math.abs(netAmount);
                accounts.currentLiabilities += Math.abs(netAmount);
            } else if (accountName.includes('sales') || accountName.includes('revenue')) {
                accounts.revenue += Math.abs(netAmount);
            } else if (accountName.includes('purchase') || accountName.includes('cogs')) {
                accounts.costOfGoodsSold += Math.abs(netAmount);
            } else if (accountName.includes('expense') || accountName.includes('cost')) {
                accounts.operatingExpenses += Math.abs(netAmount);
            } else if (accountName.includes('capital') || accountName.includes('equity')) {
                accounts.equity += Math.abs(netAmount);
            } else if (accountName.includes('asset') || accountName.includes('equipment') || accountName.includes('building')) {
                accounts.fixedAssets += netAmount;
            } else if (accountName.includes('loan') || accountName.includes('liability')) {
                accounts.longTermLiabilities += Math.abs(netAmount);
            }
        }

        // Calculate totals
        accounts.totalAssets = accounts.currentAssets + accounts.fixedAssets;
        accounts.totalLiabilities = accounts.currentLiabilities + accounts.longTermLiabilities;
        accounts.netIncome = accounts.revenue - accounts.costOfGoodsSold - accounts.operatingExpenses;

        // Calculate Financial Ratios
        const ratios = {
            // Liquidity Ratios
            currentRatio: accounts.currentLiabilities > 0 ?
                (accounts.currentAssets / accounts.currentLiabilities).toFixed(2) : 'N/A',

            quickRatio: accounts.currentLiabilities > 0 ?
                ((accounts.currentAssets - accounts.inventory) / accounts.currentLiabilities).toFixed(2) : 'N/A',

            cashRatio: accounts.currentLiabilities > 0 ?
                (accounts.cash / accounts.currentLiabilities).toFixed(2) : 'N/A',

            // Profitability Ratios
            grossProfitMargin: accounts.revenue > 0 ?
                (((accounts.revenue - accounts.costOfGoodsSold) / accounts.revenue) * 100).toFixed(2) + '%' : 'N/A',

            netProfitMargin: accounts.revenue > 0 ?
                ((accounts.netIncome / accounts.revenue) * 100).toFixed(2) + '%' : 'N/A',

            returnOnAssets: accounts.totalAssets > 0 ?
                ((accounts.netIncome / accounts.totalAssets) * 100).toFixed(2) + '%' : 'N/A',

            returnOnEquity: accounts.equity > 0 ?
                ((accounts.netIncome / accounts.equity) * 100).toFixed(2) + '%' : 'N/A',

            // Efficiency Ratios
            assetTurnover: accounts.totalAssets > 0 ?
                (accounts.revenue / accounts.totalAssets).toFixed(2) : 'N/A',

            inventoryTurnover: accounts.inventory > 0 ?
                (accounts.costOfGoodsSold / accounts.inventory).toFixed(2) : 'N/A',

            receivablesTurnover: accounts.accountsReceivable > 0 ?
                (accounts.revenue / accounts.accountsReceivable).toFixed(2) : 'N/A',

            // Leverage Ratios
            debtToAssets: accounts.totalAssets > 0 ?
                ((accounts.totalLiabilities / accounts.totalAssets) * 100).toFixed(2) + '%' : 'N/A',

            debtToEquity: accounts.equity > 0 ?
                (accounts.totalLiabilities / accounts.equity).toFixed(2) : 'N/A',

            equityRatio: accounts.totalAssets > 0 ?
                ((accounts.equity / accounts.totalAssets) * 100).toFixed(2) + '%' : 'N/A',

            // Additional Ratios
            workingCapital: (accounts.currentAssets - accounts.currentLiabilities).toFixed(2),

            daysInInventory: accounts.inventory > 0 && accounts.costOfGoodsSold > 0 ?
                ((accounts.inventory / accounts.costOfGoodsSold) * 365).toFixed(0) + ' days' : 'N/A',

            daysInReceivables: accounts.accountsReceivable > 0 && accounts.revenue > 0 ?
                ((accounts.accountsReceivable / accounts.revenue) * 365).toFixed(0) + ' days' : 'N/A'
        };

        // Ratio Analysis with Interpretations
        const analysis = {
            liquidity: {
                status: parseFloat(ratios.currentRatio) >= 2 ? 'Good' :
                    parseFloat(ratios.currentRatio) >= 1 ? 'Fair' : 'Poor',
                interpretation: parseFloat(ratios.currentRatio) >= 2 ?
                    'Company has good liquidity position' :
                    parseFloat(ratios.currentRatio) >= 1 ?
                        'Company has adequate liquidity' :
                        'Company may face liquidity issues'
            },
            profitability: {
                status: parseFloat(ratios.netProfitMargin) >= 10 ? 'Excellent' :
                    parseFloat(ratios.netProfitMargin) >= 5 ? 'Good' :
                        parseFloat(ratios.netProfitMargin) >= 0 ? 'Fair' : 'Poor',
                interpretation: parseFloat(ratios.netProfitMargin) >= 10 ?
                    'Excellent profit margins' :
                    parseFloat(ratios.netProfitMargin) >= 5 ?
                        'Good profitability' :
                        parseFloat(ratios.netProfitMargin) >= 0 ?
                            'Break-even or low profits' :
                            'Company is making losses'
            },
            leverage: {
                status: parseFloat(ratios.debtToAssets) <= 30 ? 'Conservative' :
                    parseFloat(ratios.debtToAssets) <= 60 ? 'Moderate' : 'High',
                interpretation: parseFloat(ratios.debtToAssets) <= 30 ?
                    'Conservative debt levels' :
                    parseFloat(ratios.debtToAssets) <= 60 ?
                        'Moderate debt levels' :
                        'High debt levels - monitor carefully'
            }
        };

        // Industry benchmarks (sample data - should be configurable)
        const benchmarks = {
            currentRatio: { excellent: '> 2.0', good: '1.5 - 2.0', fair: '1.0 - 1.5', poor: '< 1.0' },
            quickRatio: { excellent: '> 1.0', good: '0.8 - 1.0', fair: '0.5 - 0.8', poor: '< 0.5' },
            netProfitMargin: { excellent: '> 10%', good: '5% - 10%', fair: '0% - 5%', poor: '< 0%' },
            debtToAssets: { excellent: '< 30%', good: '30% - 50%', fair: '50% - 70%', poor: '> 70%' },
            returnOnAssets: { excellent: '> 15%', good: '10% - 15%', fair: '5% - 10%', poor: '< 5%' },
            returnOnEquity: { excellent: '> 20%', good: '15% - 20%', fair: '10% - 15%', poor: '< 10%' }
        };

        res.json({
            ratios,
            analysis,
            benchmarks,
            accounts: {
                totalAssets: accounts.totalAssets,
                totalLiabilities: accounts.totalLiabilities,
                equity: accounts.equity,
                revenue: accounts.revenue,
                netIncome: accounts.netIncome
            },
            period: {
                fromDate: fromDate || 'Beginning',
                toDate: toDate || asOnDate,
                financialYear
            }
        });

    } catch (error) {
        console.error('Error generating ratio analysis:', error);
        res.status(500).json({
            message: 'Error generating ratio analysis',
            error: error.message
        });
    }
});

module.exports = router;// Get Day Book / Transaction Register// Get Financial Ratio Analysis
