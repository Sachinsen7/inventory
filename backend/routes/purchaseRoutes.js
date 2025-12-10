const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PurchaseBill = require('../models/PurchaseBill');
const Supplier = require('../models/Supplier');
const logger = require('../utils/logger');

// Get all purchases
router.get('/', async (req, res) => {
    try {
        const { supplierId, dateFrom, dateTo, limit = 50 } = req.query;

        let query = {};
        if (supplierId) query.supplierId = supplierId;
        if (dateFrom || dateTo) {
            query.purchaseDate = {};
            if (dateFrom) query.purchaseDate.$gte = new Date(dateFrom);
            if (dateTo) query.purchaseDate.$lte = new Date(dateTo);
        }

        const purchases = await PurchaseBill.find(query)
            .sort({ purchaseDate: -1 })
            .limit(parseInt(limit))
            .populate('supplierId', 'name phoneNumber');

        res.json(purchases);
    } catch (error) {
        logger.error('Error fetching purchases', error);
        res.status(500).json({ message: 'Error fetching purchases', error: error.message });
    }
});

// Add new purchase
router.post('/add', async (req, res) => {
    try {
        const { supplierId, purchaseDate, invoiceNumber, items, totalAmount, notes } = req.body;

        // Get supplier details
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const purchase = new PurchaseBill({
            supplierId,
            supplierName: supplier.name,
            purchaseDate: purchaseDate || new Date(),
            invoiceNumber,
            items,
            totalAmount,
            notes
        });

        await purchase.save();

        logger.info('Purchase recorded', { purchaseId: purchase._id, invoiceNumber });

        res.status(201).json({
            success: true,
            message: 'Purchase recorded successfully',
            purchase
        });
    } catch (error) {
        logger.error('Error recording purchase', error);
        res.status(500).json({ message: 'Error recording purchase', error: error.message });
    }
});

// Get purchase by ID
router.get('/:id', async (req, res) => {
    try {
        const purchase = await PurchaseBill.findById(req.params.id)
            .populate('supplierId', 'name phoneNumber address');

        if (!purchase) {
            return res.status(404).json({ message: 'Purchase not found' });
        }

        res.json(purchase);
    } catch (error) {
        logger.error('Error fetching purchase', error);
        res.status(500).json({ message: 'Error fetching purchase', error: error.message });
    }
});

// Get all suppliers
router.get('/suppliers/all', async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.json(suppliers);
    } catch (error) {
        logger.error('Error fetching suppliers', error);
        res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
    }
});

// Add new supplier
router.post('/suppliers/add', async (req, res) => {
    try {
        const supplier = new Supplier(req.body);
        await supplier.save();

        logger.info('Supplier added', { supplierId: supplier._id });

        res.status(201).json({
            success: true,
            message: 'Supplier added successfully',
            supplier
        });
    } catch (error) {
        logger.error('Error adding supplier', error);
        res.status(500).json({ message: 'Error adding supplier', error: error.message });
    }
});

module.exports = router;
