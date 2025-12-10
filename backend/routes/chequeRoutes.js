const express = require('express');
const router = express.Router();
const ChequeBook = require('../models/ChequeBook');
const Voucher = require('../models/Voucher');

// Get all cheque books
router.get('/books', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const filter = {};
        if (status) filter.status = status;

        const chequeBooks = await ChequeBook.find(filter)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await ChequeBook.countDocuments(filter);

        res.json({
            chequeBooks,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error fetching cheque books:', error);
        res.status(500).json({ message: 'Error fetching cheque books', error: error.message });
    }
});

// Create new cheque book
router.post('/books', async (req, res) => {
    try {
        const {
            bankAccount,
            accountNumber,
            bankName,
            branchName,
            ifscCode,
            chequeBookNumber,
            startingChequeNumber,
            endingChequeNumber
        } = req.body;

        const startNum = parseInt(startingChequeNumber);
        const endNum = parseInt(endingChequeNumber);
        const totalCheques = endNum - startNum + 1;

        const chequeBook = new ChequeBook({
            bankAccount,
            accountNumber,
            bankName,
            branchName,
            ifscCode,
            chequeBookNumber,
            startingChequeNumber,
            endingChequeNumber,
            totalCheques,
            remainingCheques: totalCheques,
            createdBy: req.user?.id
        });

        await chequeBook.save();

        res.status(201).json({
            message: 'Cheque book created successfully',
            chequeBook
        });
    } catch (error) {
        console.error('Error creating cheque book:', error);
        res.status(500).json({ message: 'Error creating cheque book', error: error.message });
    }
});

// Issue a cheque
router.post('/books/:bookId/issue', async (req, res) => {
    try {
        const { payeeName, amount, date, voucherId, remarks } = req.body;

        const chequeBook = await ChequeBook.findById(req.params.bookId);
        if (!chequeBook) {
            return res.status(404).json({ message: 'Cheque book not found' });
        }

        if (chequeBook.status !== 'Active') {
            return res.status(400).json({ message: 'Cheque book is not active' });
        }

        const amountInWords = ChequeBook.numberToWords(amount);

        const cheque = await chequeBook.issueCheque({
            payeeName,
            amount,
            date: new Date(date),
            amountInWords,
            voucherId,
            remarks,
            issuedBy: req.user?.id
        });

        res.json({
            message: 'Cheque issued successfully',
            cheque,
            chequeBook
        });
    } catch (error) {
        console.error('Error issuing cheque:', error);
        res.status(500).json({ message: 'Error issuing cheque', error: error.message });
    }
});

// Cancel a cheque
router.post('/books/:bookId/cancel/:chequeNumber', async (req, res) => {
    try {
        const { reason } = req.body;

        const chequeBook = await ChequeBook.findById(req.params.bookId);
        if (!chequeBook) {
            return res.status(404).json({ message: 'Cheque book not found' });
        }

        await chequeBook.cancelCheque(req.params.chequeNumber, reason);

        res.json({
            message: 'Cheque cancelled successfully',
            chequeBook
        });
    } catch (error) {
        console.error('Error cancelling cheque:', error);
        res.status(500).json({ message: 'Error cancelling cheque', error: error.message });
    }
});

// Update cheque status (for clearing, bouncing, etc.)
router.put('/books/:bookId/cheques/:chequeNumber/status', async (req, res) => {
    try {
        const { status, clearanceDate, remarks } = req.body;

        const chequeBook = await ChequeBook.findById(req.params.bookId);
        if (!chequeBook) {
            return res.status(404).json({ message: 'Cheque book not found' });
        }

        const cheque = chequeBook.cheques.find(c => c.chequeNumber === req.params.chequeNumber);
        if (!cheque) {
            return res.status(404).json({ message: 'Cheque not found' });
        }

        cheque.status = status;
        if (clearanceDate) cheque.clearanceDate = new Date(clearanceDate);
        if (remarks) cheque.remarks = remarks;

        await chequeBook.save();

        res.json({
            message: 'Cheque status updated successfully',
            cheque
        });
    } catch (error) {
        console.error('Error updating cheque status:', error);
        res.status(500).json({ message: 'Error updating cheque status', error: error.message });
    }
});

// Get cheque details for printing
router.get('/books/:bookId/cheques/:chequeNumber/print', async (req, res) => {
    try {
        const chequeBook = await ChequeBook.findById(req.params.bookId);
        if (!chequeBook) {
            return res.status(404).json({ message: 'Cheque book not found' });
        }

        const cheque = chequeBook.cheques.find(c => c.chequeNumber === req.params.chequeNumber);
        if (!cheque) {
            return res.status(404).json({ message: 'Cheque not found' });
        }

        res.json({
            cheque,
            chequeBook: {
                bankName: chequeBook.bankName,
                branchName: chequeBook.branchName,
                accountNumber: chequeBook.accountNumber,
                ifscCode: chequeBook.ifscCode,
                chequeFormat: chequeBook.chequeFormat
            }
        });
    } catch (error) {
        console.error('Error fetching cheque for printing:', error);
        res.status(500).json({ message: 'Error fetching cheque for printing', error: error.message });
    }
});

// Get cheque register (all cheques)
router.get('/register', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            status,
            bankAccount,
            fromDate,
            toDate
        } = req.query;

        const matchStage = {};

        if (bankAccount) {
            matchStage.bankAccount = new RegExp(bankAccount, 'i');
        }

        const pipeline = [
            { $match: matchStage },
            { $unwind: '$cheques' },
            {
                $match: {
                    ...(status && { 'cheques.status': status }),
                    ...(fromDate && { 'cheques.date': { $gte: new Date(fromDate) } }),
                    ...(toDate && { 'cheques.date': { $lte: new Date(toDate) } })
                }
            },
            {
                $project: {
                    chequeNumber: '$cheques.chequeNumber',
                    date: '$cheques.date',
                    payeeName: '$cheques.payeeName',
                    amount: '$cheques.amount',
                    status: '$cheques.status',
                    clearanceDate: '$cheques.clearanceDate',
                    remarks: '$cheques.remarks',
                    bankAccount: 1,
                    bankName: 1,
                    accountNumber: 1
                }
            },
            { $sort: { date: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        ];

        const cheques = await ChequeBook.aggregate(pipeline);

        // Get total count
        const countPipeline = [
            { $match: matchStage },
            { $unwind: '$cheques' },
            {
                $match: {
                    ...(status && { 'cheques.status': status }),
                    ...(fromDate && { 'cheques.date': { $gte: new Date(fromDate) } }),
                    ...(toDate && { 'cheques.date': { $lte: new Date(toDate) } })
                }
            },
            { $count: 'total' }
        ];

        const countResult = await ChequeBook.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        res.json({
            cheques,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching cheque register:', error);
        res.status(500).json({ message: 'Error fetching cheque register', error: error.message });
    }
});

// Get dashboard summary
router.get('/dashboard/summary', async (req, res) => {
    try {
        const totalBooks = await ChequeBook.countDocuments();
        const activeBooks = await ChequeBook.countDocuments({ status: 'Active' });

        // Get cheque statistics
        const chequeStats = await ChequeBook.aggregate([
            { $unwind: '$cheques' },
            {
                $group: {
                    _id: '$cheques.status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$cheques.amount' }
                }
            }
        ]);

        // Recent cheques
        const recentCheques = await ChequeBook.aggregate([
            { $unwind: '$cheques' },
            { $sort: { 'cheques.date': -1 } },
            { $limit: 10 },
            {
                $project: {
                    chequeNumber: '$cheques.chequeNumber',
                    date: '$cheques.date',
                    payeeName: '$cheques.payeeName',
                    amount: '$cheques.amount',
                    status: '$cheques.status',
                    bankAccount: 1
                }
            }
        ]);

        res.json({
            summary: {
                totalBooks,
                activeBooks,
                exhaustedBooks: await ChequeBook.countDocuments({ status: 'Exhausted' })
            },
            chequeStats,
            recentCheques
        });
    } catch (error) {
        console.error('Error fetching cheque dashboard:', error);
        res.status(500).json({ message: 'Error fetching cheque dashboard', error: error.message });
    }
});

module.exports = router;