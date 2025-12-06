const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const LedgerEntry = require('../models/LedgerEntry');
const csv = require('csv-parser');
const multer = require('multer');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all customers with balances
router.get('/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Error fetching customers', error: error.message });
    }
});

// Get all suppliers with balances
router.get('/suppliers', async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
    }
});

// Set opening balance for customer
router.post('/customers/:id/opening-balance', async (req, res) => {
    try {
        const { id } = req.params;
        const { openingBalance, openingBalanceType, openingBalanceDate } = req.body;

        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        customer.openingBalance = openingBalance || 0;
        customer.openingBalanceType = openingBalanceType || 'debit';
        customer.openingBalanceDate = openingBalanceDate || new Date();
        await customer.save();

        // Create ledger entry
        await LedgerEntry.create({
            customerId: customer._id,
            type: 'opening_balance',
            amount: Math.abs(openingBalance || 0),
            balanceType: openingBalanceType || 'debit',
            transactionDate: openingBalanceDate || new Date(),
            description: `Opening balance for ${customer.name}`,
            referenceNumber: `OB-${customer._id}`
        });

        // Calculate closing balance
        await customer.calculateClosingBalance();

        res.json({ message: 'Opening balance set successfully', customer });
    } catch (error) {
        console.error('Error setting opening balance:', error);
        res.status(500).json({ message: 'Error setting opening balance', error: error.message });
    }
});

// Set opening balance for supplier
router.post('/suppliers/:id/opening-balance', async (req, res) => {
    try {
        const { id } = req.params;
        const { openingBalance, openingBalanceType, openingBalanceDate } = req.body;

        const supplier = await Supplier.findById(id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        supplier.openingBalance = openingBalance || 0;
        supplier.openingBalanceType = openingBalanceType || 'credit';
        supplier.openingBalanceDate = openingBalanceDate || new Date();
        await supplier.save();

        // Create ledger entry
        await LedgerEntry.create({
            supplierId: supplier._id,
            type: 'opening_balance',
            amount: Math.abs(openingBalance || 0),
            balanceType: openingBalanceType || 'credit',
            transactionDate: openingBalanceDate || new Date(),
            description: `Opening balance for ${supplier.name}`,
            referenceNumber: `OB-${supplier._id}`
        });

        // Calculate closing balance
        await supplier.calculateClosingBalance();

        res.json({ message: 'Opening balance set successfully', supplier });
    } catch (error) {
        console.error('Error setting opening balance:', error);
        res.status(500).json({ message: 'Error setting opening balance', error: error.message });
    }
});

// Bulk upload opening balances via CSV
router.post('/opening-balances/upload', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.body; // 'customer' or 'supplier'
        const results = [];
        const errors = [];

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Parse CSV
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', async () => {
                try {
                    for (const row of results) {
                        try {
                            if (type === 'customer') {
                                const customer = await Customer.findOne({ name: row.name });
                                if (customer) {
                                    customer.openingBalance = parseFloat(row.openingBalance) || 0;
                                    customer.openingBalanceType = row.balanceType || 'debit';
                                    customer.openingBalanceDate = row.date ? new Date(row.date) : new Date();
                                    await customer.save();

                                    await LedgerEntry.create({
                                        customerId: customer._id,
                                        type: 'opening_balance',
                                        amount: Math.abs(customer.openingBalance),
                                        balanceType: customer.openingBalanceType,
                                        transactionDate: customer.openingBalanceDate,
                                        description: `Opening balance for ${customer.name}`,
                                        referenceNumber: `OB-${customer._id}`
                                    });

                                    await customer.calculateClosingBalance();
                                } else {
                                    errors.push(`Customer not found: ${row.name}`);
                                }
                            } else if (type === 'supplier') {
                                const supplier = await Supplier.findOne({ name: row.name });
                                if (supplier) {
                                    supplier.openingBalance = parseFloat(row.openingBalance) || 0;
                                    supplier.openingBalanceType = row.balanceType || 'credit';
                                    supplier.openingBalanceDate = row.date ? new Date(row.date) : new Date();
                                    await supplier.save();

                                    await LedgerEntry.create({
                                        supplierId: supplier._id,
                                        type: 'opening_balance',
                                        amount: Math.abs(supplier.openingBalance),
                                        balanceType: supplier.openingBalanceType,
                                        transactionDate: supplier.openingBalanceDate,
                                        description: `Opening balance for ${supplier.name}`,
                                        referenceNumber: `OB-${supplier._id}`
                                    });

                                    await supplier.calculateClosingBalance();
                                } else {
                                    errors.push(`Supplier not found: ${row.name}`);
                                }
                            }
                        } catch (err) {
                            errors.push(`Error processing ${row.name}: ${err.message}`);
                        }
                    }

                    // Delete uploaded file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        message: 'Opening balances uploaded successfully',
                        processed: results.length,
                        errors: errors.length > 0 ? errors : undefined
                    });
                } catch (error) {
                    fs.unlinkSync(req.file.path);
                    throw error;
                }
            });
    } catch (error) {
        console.error('Error uploading opening balances:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error uploading opening balances', error: error.message });
    }
});

// Get ledger entries for a customer
router.get('/customers/:id/ledger', async (req, res) => {
    try {
        const { id } = req.params;
        const entries = await LedgerEntry.find({ customerId: id })
            .sort({ transactionDate: -1 })
            .populate('billId');
        res.json(entries);
    } catch (error) {
        console.error('Error fetching ledger entries:', error);
        res.status(500).json({ message: 'Error fetching ledger entries', error: error.message });
    }
});

// Get ledger entries for a supplier
router.get('/suppliers/:id/ledger', async (req, res) => {
    try {
        const { id } = req.params;
        const entries = await LedgerEntry.find({ supplierId: id })
            .sort({ transactionDate: -1 })
            .populate('purchaseBillId');
        res.json(entries);
    } catch (error) {
        console.error('Error fetching ledger entries:', error);
        res.status(500).json({ message: 'Error fetching ledger entries', error: error.message });
    }
});

// Recalculate all closing balances
router.post('/recalculate-balances', async (req, res) => {
    try {
        const customers = await Customer.find();
        const suppliers = await Supplier.find();

        for (const customer of customers) {
            await customer.calculateClosingBalance();
        }

        for (const supplier of suppliers) {
            await supplier.calculateClosingBalance();
        }

        res.json({
            message: 'All balances recalculated successfully',
            customersProcessed: customers.length,
            suppliersProcessed: suppliers.length
        });
    } catch (error) {
        console.error('Error recalculating balances:', error);
        res.status(500).json({ message: 'Error recalculating balances', error: error.message });
    }
});

module.exports = router;
