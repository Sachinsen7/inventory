
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
        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        // Get all ledger entries
        const ledgerEntries = await LedgerEntry.find(filters).lean();

        // Group by account and calculate balances
        const accountBalances = {};

        for (const entry of ledgerEntries) {
            const accountKey = entry.accountName || 'Unknown Account';

            if (!accountBalances[accountKey]) {
                accountBalances[accountKey] = {
                    accountName: entry.accountName || 'Unknown Account',
                    accountType: entry.accountType || 'Asset',
                    debitTotal: 0,
                    creditTotal: 0,
                    balance: 0
                };
            }

            accountBalances[accountKey].debitTotal += Number(entry.debitAmount) || 0;
            accountBalances[accountKey].creditTotal += Number(entry.creditAmount) || 0;
        }

        // Calculate net balances
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
            success: true,
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
        res.status(500).json({ 
            success: false,
            message: 'Error generating trial balance', 
            error: error.message 
        });
    }
});

// Get Profit & Loss Statement
router.get('/profit-loss', async (req, res) => {
    try {
        const { fromDate, toDate, financialYear } = req.query;

        const filters = {};
        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        // Get income and expense entries
        const incomeEntries = await LedgerEntry.find({
            ...filters,
            accountType: 'Income'
        }).lean();

        const expenseEntries = await LedgerEntry.find({
            ...filters,
            accountType: 'Expense'
        }).lean();

        // Group income accounts
        const incomeAccounts = {};
        for (const entry of incomeEntries) {
            const accountName = entry.accountName || 'Other Income';
            if (!incomeAccounts[accountName]) {
                incomeAccounts[accountName] = {
                    accountName,
                    amount: 0,
                    category: entry.accountCategory || 'Operating Income'
                };
            }
            incomeAccounts[accountName].amount += Number(entry.creditAmount) || 0;
        }

        // Group expense accounts
        const expenseAccounts = {};
        for (const entry of expenseEntries) {
            const accountName = entry.accountName || 'Other Expense';
            if (!expenseAccounts[accountName]) {
                expenseAccounts[accountName] = {
                    accountName,
                    amount: 0,
                    category: entry.accountCategory || 'Operating Expenses'
                };
            }
            expenseAccounts[accountName].amount += Number(entry.debitAmount) || 0;
        }

        const incomeAccountsArray = Object.values(incomeAccounts);
        const expenseAccountsArray = Object.values(expenseAccounts);

        const totalIncome = incomeAccountsArray.reduce((sum, acc) => sum + acc.amount, 0);
        const totalExpenses = expenseAccountsArray.reduce((sum, acc) => sum + acc.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        res.json({
            success: true,
            incomeAccounts: incomeAccountsArray,
            expenseAccounts: expenseAccountsArray,
            totals: {
                totalIncome,
                totalExpenses,
                netProfit,
                netProfitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
            },
            filters: { fromDate, toDate, financialYear }
        });
    } catch (error) {
        console.error('Error generating profit & loss:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating profit & loss', 
            error: error.message 
        });
    }
});

// Get Balance Sheet
router.get('/balance-sheet', async (req, res) => {
    try {
        const { asOnDate, financialYear } = req.query;

        const filters = {};
        if (asOnDate) {
            filters.date = { $lte: new Date(asOnDate) };
        }

        // Get all ledger entries
        const ledgerEntries = await LedgerEntry.find(filters).lean();

        // Group by account type
        const assets = {};
        const liabilities = {};
        const equity = {};

        for (const entry of ledgerEntries) {
            const accountName = entry.accountName || 'Unknown Account';
            const accountType = entry.accountType || 'Asset';
            
            let targetGroup;
            if (accountType === 'Asset') targetGroup = assets;
            else if (accountType === 'Liability') targetGroup = liabilities;
            else if (accountType === 'Equity') targetGroup = equity;
            else continue;

            if (!targetGroup[accountName]) {
                targetGroup[accountName] = {
                    accountName,
                    amount: 0,
                    category: entry.accountCategory || 'General'
                };
            }

            const debit = Number(entry.debitAmount) || 0;
            const credit = Number(entry.creditAmount) || 0;
            
            if (accountType === 'Asset') {
                targetGroup[accountName].amount += debit - credit;
            } else {
                targetGroup[accountName].amount += credit - debit;
            }
        }

        const assetsArray = Object.values(assets).filter(acc => acc.amount > 0);
        const liabilitiesArray = Object.values(liabilities).filter(acc => acc.amount > 0);
        const equityArray = Object.values(equity).filter(acc => acc.amount > 0);

        const totalAssets = assetsArray.reduce((sum, acc) => sum + acc.amount, 0);
        const totalLiabilities = liabilitiesArray.reduce((sum, acc) => sum + acc.amount, 0);
        const totalEquity = equityArray.reduce((sum, acc) => sum + acc.amount, 0);

        res.json({
            success: true,
            assets: assetsArray,
            liabilities: liabilitiesArray,
            equity: equityArray,
            totals: {
                totalAssets,
                totalLiabilities,
                totalEquity,
                balanceCheck: totalAssets - (totalLiabilities + totalEquity)
            },
            asOnDate: asOnDate || new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating balance sheet', 
            error: error.message 
        });
    }
});

// Get Cash Flow Statement
router.get('/cash-flow', async (req, res) => {
    try {
        const { fromDate, toDate, financialYear } = req.query;

        const filters = {
            accountName: { $regex: /cash|bank/i }
        };
        
        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        const cashEntries = await LedgerEntry.find(filters).lean();

        const operatingActivities = [];
        const investingActivities = [];
        const financingActivities = [];

        for (const entry of cashEntries) {
            const activity = {
                description: entry.narration || entry.description || 'Cash transaction',
                amount: (Number(entry.debitAmount) || 0) - (Number(entry.creditAmount) || 0),
                date: entry.date,
                accountName: entry.accountName
            };

            // Categorize based on account type or description
            if (entry.accountType === 'Expense' || entry.accountType === 'Income') {
                operatingActivities.push(activity);
            } else if (entry.accountName && entry.accountName.includes('Equipment')) {
                investingActivities.push(activity);
            } else {
                financingActivities.push(activity);
            }
        }

        const netOperatingCash = operatingActivities.reduce((sum, act) => sum + act.amount, 0);
        const netInvestingCash = investingActivities.reduce((sum, act) => sum + act.amount, 0);
        const netFinancingCash = financingActivities.reduce((sum, act) => sum + act.amount, 0);

        res.json({
            success: true,
            operatingActivities,
            investingActivities,
            financingActivities,
            summary: {
                netOperatingCash,
                netInvestingCash,
                netFinancingCash,
                netCashFlow: netOperatingCash + netInvestingCash + netFinancingCash
            },
            filters: { fromDate, toDate, financialYear }
        });
    } catch (error) {
        console.error('Error generating cash flow:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating cash flow', 
            error: error.message 
        });
    }
});

// Get Voucher-wise Reports
router.get('/voucher-wise', async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            voucherType,
            status,
            page = 1,
            limit = 50
        } = req.query;

        const filters = {};
        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }
        if (voucherType) filters.voucherType = voucherType;
        if (status) filters.status = status;

        const vouchers = await Voucher.find(filters)
            .sort({ voucherDate: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await Voucher.countDocuments(filters);

        res.json({
            success: true,
            vouchers: vouchers.map(voucher => ({
                _id: voucher._id,
                voucherNumber: voucher.voucherNumber,
                voucherType: voucher.voucherType,
                voucherDate: voucher.voucherDate,
                narration: voucher.narration,
                totalDebit: voucher.totalDebit || 0,
                totalCredit: voucher.totalCredit || 0,
                status: voucher.status
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalRecords: total
            },
            filters
        });
    } catch (error) {
        console.error('Error generating voucher-wise report:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating voucher-wise report', 
            error: error.message 
        });
    }
});

// Get Account Ledger
router.get('/account-ledger', async (req, res) => {
    try {
        const {
            accountName,
            accountId,
            accountModel,
            fromDate,
            toDate,
            page = 1,
            limit = 50
        } = req.query;

        if (!accountName && !accountId) {
            return res.status(400).json({ 
                success: false,
                message: 'Account name or ID is required' 
            });
        }

        const filters = {};
        if (accountName) {
            filters.accountName = new RegExp(accountName, 'i');
        }
        if (accountId) {
            filters.account = accountId;
        }
        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        const ledgerEntries = await LedgerEntry.find(filters)
            .sort({ date: 1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await LedgerEntry.countDocuments(filters);

        // Calculate running balance
        let runningBalance = 0;
        const processedEntries = ledgerEntries.map(entry => {
            const debit = Number(entry.debitAmount) || 0;
            const credit = Number(entry.creditAmount) || 0;
            runningBalance += debit - credit;

            return {
                _id: entry._id,
                date: entry.date,
                description: entry.narration || entry.description || 'Transaction',
                referenceNumber: entry.referenceNumber,
                debitAmount: debit,
                creditAmount: credit,
                balance: runningBalance
            };
        });

        res.json({
            success: true,
            ledgerEntries: processedEntries,
            accountName: accountName || 'Account Ledger',
            summary: {
                totalDebit: ledgerEntries.reduce((sum, entry) => sum + (Number(entry.debitAmount) || 0), 0),
                totalCredit: ledgerEntries.reduce((sum, entry) => sum + (Number(entry.creditAmount) || 0), 0),
                closingBalance: runningBalance
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error generating account ledger:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating account ledger', 
            error: error.message 
        });
    }
});

// Get Financial Year Summary
router.get('/financial-year-summary', async (req, res) => {
    try {
        const { financialYear } = req.query;

        const filters = {};
        if (financialYear) {
            filters.financialYear = financialYear;
        }

        const vouchers = await Voucher.find(filters).lean();
        const ledgerEntries = await LedgerEntry.find({}).lean();

        // Voucher summary by type
        const voucherSummary = {};
        for (const voucher of vouchers) {
            const type = voucher.voucherType || 'unknown';
            if (!voucherSummary[type]) {
                voucherSummary[type] = {
                    count: 0,
                    totalAmount: 0
                };
            }
            voucherSummary[type].count++;
            voucherSummary[type].totalAmount += Number(voucher.totalDebit) || 0;
        }

        // Monthly summary
        const monthlySummary = {};
        for (const voucher of vouchers) {
            const month = new Date(voucher.voucherDate).toISOString().slice(0, 7);
            if (!monthlySummary[month]) {
                monthlySummary[month] = {
                    voucherCount: 0,
                    totalAmount: 0
                };
            }
            monthlySummary[month].voucherCount++;
            monthlySummary[month].totalAmount += Number(voucher.totalDebit) || 0;
        }

        res.json({
            success: true,
            summary: {
                totalVouchers: vouchers.length,
                totalLedgerEntries: ledgerEntries.length,
                voucherSummary,
                monthlySummary
            },
            financialYear: financialYear || 'All Years'
        });
    } catch (error) {
        console.error('Error generating financial year summary:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating financial year summary', 
            error: error.message 
        });
    }
});

// Get Day Book
router.get('/day-book', async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            page = 1,
            limit = 50
        } = req.query;

        const filters = { status: 'posted' };
        if (fromDate || toDate) {
            filters.voucherDate = {};
            if (fromDate) filters.voucherDate.$gte = new Date(fromDate);
            if (toDate) filters.voucherDate.$lte = new Date(toDate);
        }

        const vouchers = await Voucher.find(filters)
            .sort({ voucherDate: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await Voucher.countDocuments(filters);

        const dayBookEntries = vouchers.map(voucher => ({
            _id: voucher._id,
            date: voucher.voucherDate,
            voucherNumber: voucher.voucherNumber,
            voucherType: voucher.voucherType,
            narration: voucher.narration,
            debitAmount: voucher.totalDebit || 0,
            creditAmount: voucher.totalCredit || 0
        }));

        const totalDebit = dayBookEntries.reduce((sum, entry) => sum + entry.debitAmount, 0);
        const totalCredit = dayBookEntries.reduce((sum, entry) => sum + entry.creditAmount, 0);

        res.json({
            success: true,
            dayBookEntries,
            summary: {
                totalDebit,
                totalCredit,
                totalTransactions: dayBookEntries.length
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalRecords: total
            },
            filters: { fromDate, toDate }
        });
    } catch (error) {
        console.error('Error generating day book:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating day book', 
            error: error.message 
        });
    }
});

// Get Cash Book Report (Bulletproof Version)
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
            accountName: new RegExp(cashAccount, 'i')
        };

        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        const ledgerEntries = await LedgerEntry.find(filters)
            .sort({ date: 1, createdAt: 1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await LedgerEntry.countDocuments(filters);

        let runningBalance = 0;
        const cashBookEntries = ledgerEntries.map(entry => {
            const debit = Number(entry.debitAmount) || 0;
            const credit = Number(entry.creditAmount) || 0;
            runningBalance += debit - credit;

            return {
                _id: entry._id,
                date: entry.date || entry.transactionDate,
                voucherNumber: entry.referenceNumber || `CASH-${entry._id.toString().slice(-6)}`,
                voucherType: entry.type || 'Cash Transaction',
                particulars: entry.narration || entry.description || 'Cash transaction',
                referenceNumber: entry.referenceNumber || 'AUTO-REF',
                debitAmount: debit,
                creditAmount: credit,
                balance: runningBalance
            };
        });

        const totalReceipts = ledgerEntries.reduce((sum, entry) => sum + (Number(entry.debitAmount) || 0), 0);
        const totalPayments = ledgerEntries.reduce((sum, entry) => sum + (Number(entry.creditAmount) || 0), 0);
        
        const summary = {
            openingBalance: 0,
            totalReceipts,
            totalPayments,
            closingBalance: runningBalance,
            totalTransactions: ledgerEntries.length
        };

        res.json({
            success: true,
            cashBookEntries,
            summary,
            accountName: cashAccount,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalRecords: total
            }
        });

    } catch (error) {
        console.error('Cash book error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating cash book',
            error: error.message
        });
    }
});

// Get Bank Book Report (Bulletproof Version)
router.get('/bank-book', async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            bankAccount = 'Bank',
            page = 1,
            limit = 100
        } = req.query;

        const filters = {
            accountName: new RegExp(bankAccount, 'i')
        };

        if (fromDate || toDate) {
            filters.date = {};
            if (fromDate) filters.date.$gte = new Date(fromDate);
            if (toDate) filters.date.$lte = new Date(toDate);
        }

        const ledgerEntries = await LedgerEntry.find(filters)
            .sort({ date: 1, createdAt: 1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await LedgerEntry.countDocuments(filters);

        let runningBalance = 0;
        const bankBookEntries = ledgerEntries.map(entry => {
            const debit = Number(entry.debitAmount) || 0;
            const credit = Number(entry.creditAmount) || 0;
            runningBalance += debit - credit;

            return {
                _id: entry._id,
                date: entry.date || entry.transactionDate,
                voucherNumber: entry.referenceNumber || `BANK-${entry._id.toString().slice(-6)}`,
                voucherType: entry.type || 'Bank Transaction',
                particulars: entry.narration || entry.description || 'Bank transaction',
                chequeNumber: 'N/A',
                referenceNumber: entry.referenceNumber || 'AUTO-REF',
                debitAmount: debit,
                creditAmount: credit,
                balance: runningBalance
            };
        });

        const totalDeposits = ledgerEntries.reduce((sum, entry) => sum + (Number(entry.debitAmount) || 0), 0);
        const totalWithdrawals = ledgerEntries.reduce((sum, entry) => sum + (Number(entry.creditAmount) || 0), 0);
        
        const summary = {
            openingBalance: 0,
            totalDeposits,
            totalWithdrawals,
            closingBalance: runningBalance,
            totalTransactions: ledgerEntries.length,
            chequeTransactions: 0
        };

        res.json({
            success: true,
            bankBookEntries,
            summary,
            accountName: bankAccount,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalRecords: total
            }
        });

    } catch (error) {
        console.error('Bank book error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating bank book',
            error: error.message
        });
    }
});

// Get available cash and bank accounts
router.get('/cash-bank-accounts', async (req, res) => {
    try {
        const cashBankAccounts = await LedgerEntry.distinct('accountName', {
            accountName: { $regex: /cash|bank|petty/i }
        });

        const accounts = {
            cashAccounts: cashBankAccounts.filter(name =>
                /cash|petty/i.test(name) && !/bank/i.test(name)),
            bankAccounts: cashBankAccounts.filter(name =>
                /bank/i.test(name))
        };

        res.json({
            success: true,
            ...accounts
        });
    } catch (error) {
        console.error('Error fetching cash/bank accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cash/bank accounts',
            error: error.message
        });
    }
});

// Get Ratio Analysis
router.get('/ratio-analysis', async (req, res) => {
    try {
        const { fromDate, toDate, asOnDate = new Date().toISOString().split('T')[0] } = req.query;

        const filters = {};
        if (asOnDate) {
            filters.date = { $lte: new Date(asOnDate) };
        }

        const ledgerEntries = await LedgerEntry.find(filters).lean();

        // Calculate basic ratios
        let totalAssets = 0;
        let currentAssets = 0;
        let totalLiabilities = 0;
        let currentLiabilities = 0;
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const entry of ledgerEntries) {
            const debit = Number(entry.debitAmount) || 0;
            const credit = Number(entry.creditAmount) || 0;

            switch (entry.accountType) {
                case 'Asset':
                    totalAssets += debit - credit;
                    if (entry.accountCategory === 'Current Assets') {
                        currentAssets += debit - credit;
                    }
                    break;
                case 'Liability':
                    totalLiabilities += credit - debit;
                    if (entry.accountCategory === 'Current Liabilities') {
                        currentLiabilities += credit - debit;
                    }
                    break;
                case 'Income':
                    totalIncome += credit;
                    break;
                case 'Expense':
                    totalExpenses += debit;
                    break;
            }
        }

        const ratios = {
            liquidityRatios: {
                currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
                quickRatio: currentLiabilities > 0 ? (currentAssets * 0.8) / currentLiabilities : 0
            },
            profitabilityRatios: {
                grossProfitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
                netProfitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
                returnOnAssets: totalAssets > 0 ? ((totalIncome - totalExpenses) / totalAssets) * 100 : 0
            },
            leverageRatios: {
                debtToAssetRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0,
                debtToEquityRatio: (totalAssets - totalLiabilities) > 0 ? (totalLiabilities / (totalAssets - totalLiabilities)) * 100 : 0
            }
        };

        res.json({
            success: true,
            ratios,
            summary: {
                totalAssets,
                currentAssets,
                totalLiabilities,
                currentLiabilities,
                totalIncome,
                totalExpenses,
                netProfit: totalIncome - totalExpenses
            },
            asOnDate
        });
    } catch (error) {
        console.error('Error generating ratio analysis:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating ratio analysis',
            error: error.message
        });
    }
});

module.exports = router;
