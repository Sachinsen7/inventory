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

// ==================== PAYMENT OVERDUE ALERTS ====================

// Get overdue bills
router.get('/overdue-bills', async (req, res) => {
    try {
        const Bill = mongoose.model('Bill');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all unpaid bills
        const unpaidBills = await Bill.find({
            paymentStatus: { $in: ['Pending', 'Processing'] }
        }).populate('customerId', 'name phoneNumber');

        // Calculate overdue status for each bill
        const overdueBills = [];
        const dueSoonBills = [];
        const allUnpaidBills = [];

        for (const bill of unpaidBills) {
            // Calculate due date if not set
            if (!bill.dueDate) {
                const paymentTerms = bill.paymentTerms || 30;
                bill.dueDate = new Date(bill.invoiceDate);
                bill.dueDate.setDate(bill.dueDate.getDate() + paymentTerms);
            }

            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = today - dueDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const billData = {
                _id: bill._id,
                billNumber: bill.billNumber,
                invoiceNumber: bill.invoiceNumber,
                invoiceDate: bill.invoiceDate,
                dueDate: bill.dueDate,
                totalAmount: bill.totalAmount,
                paymentStatus: bill.paymentStatus,
                customerId: bill.customerId?._id,
                customerName: bill.customerName || bill.customerId?.name,
                customerPhone: bill.customerPhone || bill.customerId?.phoneNumber,
                isOverdue: diffDays > 0,
                overdueBy: diffDays > 0 ? diffDays : 0,
                dueIn: diffDays <= 0 ? Math.abs(diffDays) : 0
            };

            allUnpaidBills.push(billData);

            if (diffDays > 0) {
                // Overdue
                overdueBills.push(billData);
            } else if (diffDays >= -7 && diffDays <= 0) {
                // Due within 7 days
                dueSoonBills.push(billData);
            }
        }

        // Sort by overdue days (most overdue first)
        overdueBills.sort((a, b) => b.overdueBy - a.overdueBy);
        dueSoonBills.sort((a, b) => a.dueIn - b.dueIn);

        // Calculate totals
        const totalOverdueAmount = overdueBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const totalDueSoonAmount = dueSoonBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const totalUnpaidAmount = allUnpaidBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

        // Group by customer
        const customerOverdue = {};
        overdueBills.forEach(bill => {
            const customerId = bill.customerId?.toString();
            if (!customerOverdue[customerId]) {
                customerOverdue[customerId] = {
                    customerId: bill.customerId,
                    customerName: bill.customerName,
                    customerPhone: bill.customerPhone,
                    billCount: 0,
                    totalAmount: 0,
                    oldestOverdueBy: 0,
                    bills: []
                };
            }
            customerOverdue[customerId].billCount++;
            customerOverdue[customerId].totalAmount += bill.totalAmount;
            customerOverdue[customerId].oldestOverdueBy = Math.max(
                customerOverdue[customerId].oldestOverdueBy,
                bill.overdueBy
            );
            customerOverdue[customerId].bills.push(bill);
        });

        const topOverdueCustomers = Object.values(customerOverdue)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);

        logger.info('Overdue bills fetched', {
            overdueBillsCount: overdueBills.length,
            dueSoonCount: dueSoonBills.length,
            totalOverdueAmount
        });

        res.json({
            summary: {
                totalOverdueBills: overdueBills.length,
                totalOverdueAmount,
                totalDueSoonBills: dueSoonBills.length,
                totalDueSoonAmount,
                totalUnpaidBills: allUnpaidBills.length,
                totalUnpaidAmount
            },
            overdueBills: overdueBills.slice(0, 50), // Limit to 50 for performance
            dueSoonBills: dueSoonBills.slice(0, 20),
            topOverdueCustomers,
            lastUpdated: new Date()
        });
    } catch (error) {
        logger.error('Error fetching overdue bills', error);
        res.status(500).json({ message: 'Error fetching overdue bills', error: error.message });
    }
});

// Get overdue bills for specific customer
router.get('/overdue-bills/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const Bill = mongoose.model('Bill');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const unpaidBills = await Bill.find({
            customerId,
            paymentStatus: { $in: ['Pending', 'Processing'] }
        });

        const overdueBills = [];
        let totalOverdueAmount = 0;

        for (const bill of unpaidBills) {
            if (!bill.dueDate) {
                const paymentTerms = bill.paymentTerms || 30;
                bill.dueDate = new Date(bill.invoiceDate);
                bill.dueDate.setDate(bill.dueDate.getDate() + paymentTerms);
            }

            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = today - dueDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                overdueBills.push({
                    _id: bill._id,
                    billNumber: bill.billNumber,
                    invoiceNumber: bill.invoiceNumber,
                    invoiceDate: bill.invoiceDate,
                    dueDate: bill.dueDate,
                    totalAmount: bill.totalAmount,
                    overdueBy: diffDays
                });
                totalOverdueAmount += bill.totalAmount;
            }
        }

        overdueBills.sort((a, b) => b.overdueBy - a.overdueBy);

        res.json({
            customerId,
            overdueBills,
            totalOverdueBills: overdueBills.length,
            totalOverdueAmount
        });
    } catch (error) {
        logger.error('Error fetching customer overdue bills', error);
        res.status(500).json({ message: 'Error fetching customer overdue bills', error: error.message });
    }
});

// ==================== LOW STOCK ALERTS ====================

// Get low stock items
router.get('/low-stock-items', async (req, res) => {
    try {
        // Get Delevery1 model (actual inventory)
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
                minStockLevel: { type: Number, default: 10 },
                godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
                lastUpdated: { type: Date, default: Date.now }
            });
            Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
        }

        // Get all items from delevery1 collection
        const allItems = await Delevery1.find({});

        // Group by item prefix (first 3 digits) and godown
        const itemGroups = {};

        allItems.forEach(item => {
            const inputValue = item.inputValue || '';
            const prefix = inputValue.substring(0, 3);
            const godownName = item.godownName || 'Unknown';
            const key = `${prefix}_${godownName}`;

            if (!itemGroups[key]) {
                itemGroups[key] = {
                    prefix,
                    itemName: inputValue,
                    godownName,
                    quantity: 0,
                    items: [],
                    minStockLevel: item.minStockLevel || 10
                };
            }

            itemGroups[key].quantity++;
            itemGroups[key].items.push(item);
        });

        // Identify low stock items
        const lowStockItems = [];
        const criticalStockItems = [];
        const outOfStockItems = [];

        Object.values(itemGroups).forEach(group => {
            const stockPercentage = (group.quantity / group.minStockLevel) * 100;

            const itemData = {
                prefix: group.prefix,
                itemName: group.itemName,
                godownName: group.godownName,
                currentStock: group.quantity,
                minStockLevel: group.minStockLevel,
                stockPercentage: Math.round(stockPercentage),
                shortage: Math.max(0, group.minStockLevel - group.quantity),
                status: group.quantity === 0 ? 'OUT_OF_STOCK' :
                    group.quantity < group.minStockLevel * 0.25 ? 'CRITICAL' :
                        group.quantity < group.minStockLevel ? 'LOW' : 'NORMAL'
            };

            if (group.quantity === 0) {
                outOfStockItems.push(itemData);
            } else if (group.quantity < group.minStockLevel * 0.25) {
                criticalStockItems.push(itemData);
            } else if (group.quantity < group.minStockLevel) {
                lowStockItems.push(itemData);
            }
        });

        // Sort by severity (lowest stock percentage first)
        const sortByStockPercentage = (a, b) => a.stockPercentage - b.stockPercentage;
        outOfStockItems.sort(sortByStockPercentage);
        criticalStockItems.sort(sortByStockPercentage);
        lowStockItems.sort(sortByStockPercentage);

        // Combine all alerts
        const allLowStockItems = [
            ...outOfStockItems,
            ...criticalStockItems,
            ...lowStockItems
        ];

        // Group by godown for summary
        const godownSummary = {};
        allLowStockItems.forEach(item => {
            if (!godownSummary[item.godownName]) {
                godownSummary[item.godownName] = {
                    godownName: item.godownName,
                    outOfStock: 0,
                    critical: 0,
                    low: 0,
                    total: 0
                };
            }
            godownSummary[item.godownName].total++;
            if (item.status === 'OUT_OF_STOCK') godownSummary[item.godownName].outOfStock++;
            else if (item.status === 'CRITICAL') godownSummary[item.godownName].critical++;
            else if (item.status === 'LOW') godownSummary[item.godownName].low++;
        });

        logger.info('Low stock items fetched', {
            outOfStock: outOfStockItems.length,
            critical: criticalStockItems.length,
            low: lowStockItems.length
        });

        res.json({
            summary: {
                totalLowStockItems: allLowStockItems.length,
                outOfStockCount: outOfStockItems.length,
                criticalCount: criticalStockItems.length,
                lowCount: lowStockItems.length
            },
            outOfStockItems: outOfStockItems.slice(0, 20),
            criticalStockItems: criticalStockItems.slice(0, 20),
            lowStockItems: lowStockItems.slice(0, 20),
            godownSummary: Object.values(godownSummary),
            lastUpdated: new Date()
        });
    } catch (error) {
        logger.error('Error fetching low stock items', error);
        res.status(500).json({ message: 'Error fetching low stock items', error: error.message });
    }
});

// Get low stock items for specific godown
router.get('/low-stock-items/godown/:godownName', async (req, res) => {
    try {
        const { godownName } = req.params;

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
                minStockLevel: { type: Number, default: 10 },
                godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
                lastUpdated: { type: Date, default: Date.now }
            });
            Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
        }

        const items = await Delevery1.find({ godownName });

        // Group by prefix
        const itemGroups = {};
        items.forEach(item => {
            const prefix = (item.inputValue || '').substring(0, 3);
            if (!itemGroups[prefix]) {
                itemGroups[prefix] = {
                    prefix,
                    itemName: item.inputValue,
                    quantity: 0,
                    minStockLevel: item.minStockLevel || 10
                };
            }
            itemGroups[prefix].quantity++;
        });

        // Filter low stock
        const lowStockItems = Object.values(itemGroups)
            .filter(group => group.quantity < group.minStockLevel)
            .map(group => ({
                ...group,
                godownName,
                shortage: group.minStockLevel - group.quantity,
                stockPercentage: Math.round((group.quantity / group.minStockLevel) * 100)
            }))
            .sort((a, b) => a.stockPercentage - b.stockPercentage);

        res.json({
            godownName,
            lowStockItems,
            totalLowStockItems: lowStockItems.length
        });
    } catch (error) {
        logger.error('Error fetching godown low stock items', error);
        res.status(500).json({ message: 'Error fetching godown low stock items', error: error.message });
    }
});

// ==================== BILL SYNC STATUS ====================

// Get unsynced bills
router.get('/unsynced-bills', async (req, res) => {
    try {
        const Bill = mongoose.model('Bill');

        // Find all unsynced or failed bills
        const unsyncedBills = await Bill.find({
            syncStatus: { $in: ['pending', 'failed', 'partial'] }
        })
            .sort({ createdAt: -1 })
            .limit(100);

        // Calculate statistics
        const pendingBills = unsyncedBills.filter(b => b.syncStatus === 'pending');
        const failedBills = unsyncedBills.filter(b => b.syncStatus === 'failed');
        const partialBills = unsyncedBills.filter(b => b.syncStatus === 'partial');

        const totalUnsyncedAmount = unsyncedBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const pendingAmount = pendingBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const failedAmount = failedBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

        // Get oldest unsynced bill
        const oldestUnsynced = unsyncedBills.length > 0
            ? unsyncedBills[unsyncedBills.length - 1]
            : null;

        const daysSinceOldest = oldestUnsynced
            ? Math.floor((Date.now() - new Date(oldestUnsynced.createdAt)) / (1000 * 60 * 60 * 24))
            : 0;

        // Group by sync error
        const errorGroups = {};
        failedBills.forEach(bill => {
            const error = bill.syncError || 'Unknown Error';
            if (!errorGroups[error]) {
                errorGroups[error] = {
                    error,
                    count: 0,
                    bills: []
                };
            }
            errorGroups[error].count++;
            errorGroups[error].bills.push({
                _id: bill._id,
                billNumber: bill.billNumber,
                invoiceNumber: bill.invoiceNumber,
                totalAmount: bill.totalAmount,
                createdAt: bill.createdAt
            });
        });

        const topErrors = Object.values(errorGroups)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        logger.info('Unsynced bills fetched', {
            totalUnsynced: unsyncedBills.length,
            pending: pendingBills.length,
            failed: failedBills.length
        });

        res.json({
            summary: {
                totalUnsynced: unsyncedBills.length,
                totalUnsyncedAmount,
                pendingBills: pendingBills.length,
                pendingAmount,
                failedBills: failedBills.length,
                failedAmount,
                partialBills: partialBills.length,
                oldestUnsyncedDays: daysSinceOldest
            },
            bills: unsyncedBills.map(bill => ({
                _id: bill._id,
                billNumber: bill.billNumber,
                invoiceNumber: bill.invoiceNumber,
                invoiceDate: bill.invoiceDate,
                customerName: bill.customerName,
                totalAmount: bill.totalAmount,
                syncStatus: bill.syncStatus,
                syncAttempts: bill.syncAttempts,
                syncError: bill.syncError,
                lastSyncedAt: bill.lastSyncedAt,
                createdAt: bill.createdAt,
                daysSinceCreation: Math.floor((Date.now() - new Date(bill.createdAt)) / (1000 * 60 * 60 * 24))
            })),
            topErrors,
            lastUpdated: new Date()
        });
    } catch (error) {
        logger.error('Error fetching unsynced bills', error);
        res.status(500).json({ message: 'Error fetching unsynced bills', error: error.message });
    }
});

// Manually trigger sync for a bill
router.post('/sync-bill/:billId', async (req, res) => {
    try {
        const { billId } = req.params;
        const { system } = req.body; // e.g., 'tally', 'quickbooks', 'cloud'
        const Bill = mongoose.model('Bill');

        const bill = await Bill.findById(billId);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Simulate sync (in real implementation, this would call external API)
        // For now, we'll just mark it as synced
        const syncSuccess = Math.random() > 0.2; // 80% success rate for demo

        if (syncSuccess) {
            bill.syncStatus = 'synced';
            bill.lastSyncedAt = new Date();
            bill.syncAttempts += 1;
            bill.syncError = null;

            if (!bill.syncedTo) bill.syncedTo = [];
            bill.syncedTo.push({
                system: system || 'manual',
                syncedAt: new Date(),
                status: 'success'
            });

            await bill.save();

            logger.info('Bill synced successfully', { billId, system });
            res.json({
                success: true,
                message: 'Bill synced successfully',
                bill: {
                    _id: bill._id,
                    billNumber: bill.billNumber,
                    syncStatus: bill.syncStatus,
                    lastSyncedAt: bill.lastSyncedAt
                }
            });
        } else {
            // Simulate failure
            bill.syncStatus = 'failed';
            bill.syncAttempts += 1;
            bill.syncError = 'Connection timeout - Unable to reach sync server';

            if (!bill.syncedTo) bill.syncedTo = [];
            bill.syncedTo.push({
                system: system || 'manual',
                syncedAt: new Date(),
                status: 'failed',
                error: bill.syncError
            });

            await bill.save();

            logger.warn('Bill sync failed', { billId, system, error: bill.syncError });
            res.status(500).json({
                success: false,
                message: 'Bill sync failed',
                error: bill.syncError
            });
        }
    } catch (error) {
        logger.error('Error syncing bill', error);
        res.status(500).json({ message: 'Error syncing bill', error: error.message });
    }
});

// Bulk sync multiple bills
router.post('/sync-bills-bulk', async (req, res) => {
    try {
        const { billIds, system } = req.body;
        const Bill = mongoose.model('Bill');

        if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
            return res.status(400).json({ message: 'Invalid bill IDs' });
        }

        const results = {
            success: [],
            failed: [],
            total: billIds.length
        };

        for (const billId of billIds) {
            try {
                const bill = await Bill.findById(billId);
                if (!bill) {
                    results.failed.push({ billId, error: 'Bill not found' });
                    continue;
                }

                // Simulate sync
                const syncSuccess = Math.random() > 0.2;

                if (syncSuccess) {
                    bill.syncStatus = 'synced';
                    bill.lastSyncedAt = new Date();
                    bill.syncAttempts += 1;
                    bill.syncError = null;

                    if (!bill.syncedTo) bill.syncedTo = [];
                    bill.syncedTo.push({
                        system: system || 'bulk',
                        syncedAt: new Date(),
                        status: 'success'
                    });

                    await bill.save();
                    results.success.push({ billId, billNumber: bill.billNumber });
                } else {
                    bill.syncStatus = 'failed';
                    bill.syncAttempts += 1;
                    bill.syncError = 'Bulk sync failed';

                    if (!bill.syncedTo) bill.syncedTo = [];
                    bill.syncedTo.push({
                        system: system || 'bulk',
                        syncedAt: new Date(),
                        status: 'failed',
                        error: bill.syncError
                    });

                    await bill.save();
                    results.failed.push({ billId, billNumber: bill.billNumber, error: bill.syncError });
                }
            } catch (err) {
                results.failed.push({ billId, error: err.message });
            }
        }

        logger.info('Bulk sync completed', results);
        res.json({
            message: 'Bulk sync completed',
            results
        });
    } catch (error) {
        logger.error('Error in bulk sync', error);
        res.status(500).json({ message: 'Error in bulk sync', error: error.message });
    }
});

// Get sync statistics
router.get('/sync-stats', async (req, res) => {
    try {
        const Bill = mongoose.model('Bill');

        const totalBills = await Bill.countDocuments();
        const syncedBills = await Bill.countDocuments({ syncStatus: 'synced' });
        const pendingBills = await Bill.countDocuments({ syncStatus: 'pending' });
        const failedBills = await Bill.countDocuments({ syncStatus: 'failed' });
        const partialBills = await Bill.countDocuments({ syncStatus: 'partial' });

        const syncRate = totalBills > 0 ? ((syncedBills / totalBills) * 100).toFixed(2) : 0;

        // Get recent sync activity (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentSyncs = await Bill.countDocuments({
            lastSyncedAt: { $gte: last24Hours }
        });

        res.json({
            totalBills,
            syncedBills,
            pendingBills,
            failedBills,
            partialBills,
            syncRate: parseFloat(syncRate),
            recentSyncs,
            lastUpdated: new Date()
        });
    } catch (error) {
        logger.error('Error fetching sync stats', error);
        res.status(500).json({ message: 'Error fetching sync stats', error: error.message });
    }
});

module.exports = router;
