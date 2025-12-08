const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import models
let Bill;
try {
    Bill = mongoose.model('Bill');
} catch (error) {
    // Bill model will be defined in billingRoutes
    logger.warn('Bill model not yet defined');
}

// Get today's outstanding amounts
router.get('/outstanding', async (req, res) => {
    try {
        if (!Bill) {
            Bill = mongoose.model('Bill');
        }

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Calculate outstanding amounts
        const [todayOutstanding, weekOutstanding, monthOutstanding, overdueOutstanding, totalOutstanding] = await Promise.all([
            // Today's outstanding
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfToday, $lt: endOfToday },
                        paymentStatus: { $ne: 'Completed' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // This week's outstanding
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfWeek },
                        paymentStatus: { $ne: 'Completed' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // This month's outstanding
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfMonth },
                        paymentStatus: { $ne: 'Completed' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Overdue (assuming 30 days payment terms)
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                        paymentStatus: { $ne: 'Completed' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Total outstanding
            Bill.aggregate([
                {
                    $match: {
                        paymentStatus: { $ne: 'Completed' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Get top outstanding customers
        const topOutstandingCustomers = await Bill.aggregate([
            {
                $match: {
                    paymentStatus: { $ne: 'Completed' }
                }
            },
            {
                $group: {
                    _id: '$customerId',
                    customerName: { $first: '$customerName' },
                    totalOutstanding: { $sum: '$totalAmount' },
                    billCount: { $sum: 1 },
                    oldestBill: { $min: '$createdAt' }
                }
            },
            {
                $sort: { totalOutstanding: -1 }
            },
            {
                $limit: 10
            }
        ]);

        // Payment status breakdown
        const paymentStatusBreakdown = await Bill.aggregate([
            {
                $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 },
                    amount: { $sum: '$totalAmount' }
                }
            }
        ]);

        const result = {
            today: {
                amount: todayOutstanding[0]?.total || 0,
                count: todayOutstanding[0]?.count || 0
            },
            thisWeek: {
                amount: weekOutstanding[0]?.total || 0,
                count: weekOutstanding[0]?.count || 0
            },
            thisMonth: {
                amount: monthOutstanding[0]?.total || 0,
                count: monthOutstanding[0]?.count || 0
            },
            overdue: {
                amount: overdueOutstanding[0]?.total || 0,
                count: overdueOutstanding[0]?.count || 0
            },
            total: {
                amount: totalOutstanding[0]?.total || 0,
                count: totalOutstanding[0]?.count || 0
            },
            topCustomers: topOutstandingCustomers,
            paymentBreakdown: paymentStatusBreakdown
        };

        logger.info('Outstanding analytics fetched successfully');
        res.json(result);

    } catch (error) {
        logger.error('Error fetching outstanding analytics:', error);
        res.status(500).json({
            message: 'Error fetching outstanding data',
            error: error.message
        });
    }
});

// Get sales comparison (this month vs last month)
router.get('/sales-comparison', async (req, res) => {
    try {
        if (!Bill) {
            Bill = mongoose.model('Bill');
        }

        const today = new Date();
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        const [thisMonth, lastMonth] = await Promise.all([
            // This month's sales
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfThisMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Last month's sales
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const thisMonthData = thisMonth[0] || { total: 0, count: 0 };
        const lastMonthData = lastMonth[0] || { total: 0, count: 0 };

        const growth = lastMonthData.total > 0
            ? ((thisMonthData.total - lastMonthData.total) / lastMonthData.total * 100)
            : 0;

        const result = {
            thisMonth: thisMonthData,
            lastMonth: lastMonthData,
            growth: Math.round(growth * 100) / 100,
            trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'stable'
        };

        logger.info('Sales comparison fetched successfully');
        res.json(result);

    } catch (error) {
        logger.error('Error fetching sales comparison:', error);
        res.status(500).json({
            message: 'Error fetching sales comparison',
            error: error.message
        });
    }
});

// Get top customers by revenue
router.get('/top-customers', async (req, res) => {
    try {
        if (!Bill) {
            Bill = mongoose.model('Bill');
        }

        const { limit = 10, period = 'all' } = req.query;

        let matchCondition = {};

        if (period === 'month') {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            matchCondition.createdAt = { $gte: startOfMonth };
        } else if (period === 'week') {
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            matchCondition.createdAt = { $gte: startOfWeek };
        }

        const topCustomers = await Bill.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$customerId',
                    customerName: { $first: '$customerName' },
                    totalRevenue: { $sum: '$totalAmount' },
                    billCount: { $sum: 1 },
                    avgBillValue: { $avg: '$totalAmount' },
                    lastBillDate: { $max: '$createdAt' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: parseInt(limit) }
        ]);

        logger.info('Top customers fetched successfully');
        res.json(topCustomers);

    } catch (error) {
        logger.error('Error fetching top customers:', error);
        res.status(500).json({
            message: 'Error fetching top customers',
            error: error.message
        });
    }
});

// Get stock value (calculate from inventory)
router.get('/stock-value', async (req, res) => {
    try {
        // Get Despatch and Delevery1 models
        const Despatch = mongoose.model('Despatch');
        const Delevery1 = mongoose.model('Delevery1');
        const Barcode = mongoose.model('Barcode');

        // Count items in despatch (in godown)
        const despatchCount = await Despatch.countDocuments();

        // Count items in delivery (ready for delivery)
        const deliveryCount = await Delevery1.countDocuments();

        // Get total barcodes generated
        const barcodeCount = await Barcode.countDocuments();

        // Group by godown
        const byGodown = await Despatch.aggregate([
            {
                $group: {
                    _id: '$godownName',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Get barcode statistics
        const barcodeStats = await Barcode.aggregate([
            {
                $group: {
                    _id: null,
                    totalGrossWeight: { $sum: { $toDouble: '$grossWeight' } },
                    totalNetWeight: { $sum: { $toDouble: '$netWeight' } },
                    totalBarcodes: { $sum: 1 },
                    scannedCount: {
                        $sum: {
                            $cond: ['$is_scanned', 1, 0]
                        }
                    }
                }
            }
        ]);

        const stats = barcodeStats[0] || {
            totalGrossWeight: 0,
            totalNetWeight: 0,
            totalBarcodes: 0,
            scannedCount: 0
        };

        const result = {
            totalItems: despatchCount + deliveryCount,
            inGodown: despatchCount,
            readyForDelivery: deliveryCount,
            totalBarcodes: barcodeCount,
            scannedBarcodes: stats.scannedCount,
            unscannedBarcodes: barcodeCount - stats.scannedCount,
            totalGrossWeight: Math.round(stats.totalGrossWeight * 100) / 100,
            totalNetWeight: Math.round(stats.totalNetWeight * 100) / 100,
            byGodown: byGodown,
            message: 'Stock value calculated from inventory data'
        };

        logger.info('Stock value fetched successfully');
        res.json(result);

    } catch (error) {
        logger.error('Error fetching stock value:', error);
        res.status(500).json({
            message: 'Error fetching stock value',
            error: error.message
        });
    }
});

// Check customer credit limit
router.post('/check-credit-limit', async (req, res) => {
    try {
        const { customerId, billAmount } = req.body;

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID is required'
            });
        }

        const Customer = mongoose.model('Customer');
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const creditCheck = await customer.checkCreditLimit(billAmount || 0);

        logger.info('Credit limit checked', { customerId, result: creditCheck });
        res.json({
            success: true,
            ...creditCheck
        });

    } catch (error) {
        logger.error('Error checking credit limit:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking credit limit',
            error: error.message
        });
    }
});

// Get low stock items
router.get('/low-stock-alert', async (req, res) => {
    try {
        // Check if Inventory model exists in billingRoutes
        let Inventory;
        try {
            Inventory = mongoose.model('Inventory');
        } catch (error) {
            return res.json({
                success: true,
                count: 0,
                items: [],
                message: 'Inventory model not available'
            });
        }

        const lowStockItems = await Inventory.find({
            $expr: { $lte: ['$quantity', '$minStockLevel'] },
            minStockLevel: { $gt: 0 }
        }).sort({ quantity: 1 });

        const formattedItems = lowStockItems.map(item => ({
            _id: item._id,
            itemName: item.itemName,
            currentQuantity: item.quantity,
            minStockLevel: item.minStockLevel,
            shortfall: item.minStockLevel - item.quantity,
            category: item.category,
            price: item.price,
            lastUpdated: item.lastUpdated
        }));

        logger.info('Low stock items fetched', { count: formattedItems.length });
        res.json({
            success: true,
            count: formattedItems.length,
            items: formattedItems
        });

    } catch (error) {
        logger.error('Error fetching low stock items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching low stock items',
            error: error.message
        });
    }
});

// Get customers exceeding credit limit
router.get('/credit-limit-exceeded', async (req, res) => {
    try {
        const Customer = mongoose.model('Customer');
        const customers = await Customer.find({ creditLimitEnabled: true });

        const exceededCustomers = [];

        for (const customer of customers) {
            await customer.calculateClosingBalance();
            if (customer.closingBalance > customer.creditLimit) {
                exceededCustomers.push({
                    _id: customer._id,
                    name: customer.name,
                    creditLimit: customer.creditLimit,
                    currentOutstanding: customer.closingBalance,
                    exceededBy: customer.closingBalance - customer.creditLimit,
                    phoneNumber: customer.phoneNumber
                });
            }
        }

        exceededCustomers.sort((a, b) => b.exceededBy - a.exceededBy);

        logger.info('Credit limit exceeded customers fetched', { count: exceededCustomers.length });
        res.json({
            success: true,
            count: exceededCustomers.length,
            customers: exceededCustomers
        });

    } catch (error) {
        logger.error('Error fetching exceeded credit limits:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data',
            error: error.message
        });
    }
});

// Get overdue payments
router.get('/overdue-payments', async (req, res) => {
    try {
        if (!Bill) {
            Bill = mongoose.model('Bill');
        }

        const today = new Date();

        // Get all unpaid bills
        const unpaidBills = await Bill.find({
            paymentStatus: { $ne: 'Completed' }
        }).sort({ createdAt: 1 });

        const overdueBills = [];

        for (const bill of unpaidBills) {
            // Get customer to check payment terms
            const Customer = mongoose.model('Customer');
            const customer = await Customer.findById(bill.customerId);
            const paymentTerms = customer?.paymentTerms || 30; // default 30 days

            const dueDate = new Date(bill.createdAt);
            dueDate.setDate(dueDate.getDate() + paymentTerms);

            const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

            if (daysOverdue > 0) {
                overdueBills.push({
                    _id: bill._id,
                    billNumber: bill.billNumber,
                    invoiceNumber: bill.invoiceNumber,
                    customerId: bill.customerId,
                    customerName: bill.customerName,
                    customerPhone: bill.customerPhone,
                    totalAmount: bill.totalAmount,
                    invoiceDate: bill.invoiceDate,
                    dueDate: dueDate,
                    daysOverdue: daysOverdue,
                    paymentStatus: bill.paymentStatus
                });
            }
        }

        // Sort by days overdue (most overdue first)
        overdueBills.sort((a, b) => b.daysOverdue - a.daysOverdue);

        logger.info('Overdue payments fetched', { count: overdueBills.length });
        res.json({
            success: true,
            count: overdueBills.length,
            bills: overdueBills
        });

    } catch (error) {
        logger.error('Error fetching overdue payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching overdue payments',
            error: error.message
        });
    }
});

// Get purchase analytics
router.get('/purchases', async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let PurchaseBill;
        try {
            PurchaseBill = mongoose.model('PurchaseBill');
        } catch (error) {
            return res.json({
                success: true,
                message: 'Purchase bill model not available',
                totalPurchases: 0,
                count: 0,
                bySupplier: []
            });
        }

        const today = new Date();
        let startDate;

        if (period === 'week') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
        } else if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else {
            startDate = new Date(0); // All time
        }

        // Total purchases
        const totalPurchases = await PurchaseBill.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$totalAmount' }
                }
            }
        ]);

        // By supplier
        const bySupplier = await PurchaseBill.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$supplierId',
                    supplierName: { $first: '$supplierName' },
                    totalAmount: { $sum: '$totalAmount' },
                    billCount: { $sum: 1 },
                    lastPurchase: { $max: '$invoiceDate' }
                }
            },
            {
                $sort: { totalAmount: -1 }
            },
            {
                $limit: 10
            }
        ]);

        const result = {
            success: true,
            period,
            totalPurchases: totalPurchases[0]?.total || 0,
            count: totalPurchases[0]?.count || 0,
            avgAmount: totalPurchases[0]?.avgAmount || 0,
            bySupplier
        };

        logger.info('Purchase analytics fetched', { period, count: result.count });
        res.json(result);

    } catch (error) {
        logger.error('Error fetching purchase analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase analytics',
            error: error.message
        });
    }
});

// Get purchase vs sales comparison
router.get('/purchase-vs-sales', async (req, res) => {
    try {
        if (!Bill) {
            Bill = mongoose.model('Bill');
        }

        let PurchaseBill;
        try {
            PurchaseBill = mongoose.model('PurchaseBill');
        } catch (error) {
            return res.json({
                success: true,
                message: 'Purchase bill model not available',
                sales: 0,
                purchases: 0,
                profit: 0
            });
        }

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [salesData, purchaseData] = await Promise.all([
            Bill.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            PurchaseBill.aggregate([
                {
                    $match: {
                        invoiceDate: { $gte: startOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const sales = salesData[0]?.total || 0;
        const purchases = purchaseData[0]?.total || 0;
        const profit = sales - purchases;
        const profitMargin = sales > 0 ? (profit / sales * 100) : 0;

        const result = {
            success: true,
            thisMonth: {
                sales,
                salesCount: salesData[0]?.count || 0,
                purchases,
                purchaseCount: purchaseData[0]?.count || 0,
                profit,
                profitMargin: Math.round(profitMargin * 100) / 100
            }
        };

        logger.info('Purchase vs sales comparison fetched');
        res.json(result);

    } catch (error) {
        logger.error('Error fetching purchase vs sales:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comparison',
            error: error.message
        });
    }
});

module.exports = router;
