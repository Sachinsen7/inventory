const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const logger = require('../utils/logger');

// Get all orders
router.get('/', async (req, res) => {
    try {
        const { status, customerId, limit = 50 } = req.query;

        let query = {};
        if (status) query.status = status;
        if (customerId) query.customerId = customerId;

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('customerId', 'name phoneNumber')
            .populate('createdBy', 'name email');

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        logger.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
});

// Get pending orders
router.get('/pending', async (req, res) => {
    try {
        const pendingOrders = await Order.find({
            status: { $in: ['pending', 'confirmed', 'processing'] },
            convertedToBill: false
        }).sort({ orderDate: 1 });

        const ordersWithDetails = pendingOrders.map(order => ({
            ...order.toObject(),
            daysPending: order.getDaysPending(),
            isOverdue: order.isOverdue()
        }));

        res.json({
            success: true,
            count: ordersWithDetails.length,
            orders: ordersWithDetails
        });
    } catch (error) {
        logger.error('Error fetching pending orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending orders',
            error: error.message
        });
    }
});

// Create new order
router.post('/', async (req, res) => {
    try {
        const orderNumber = await Order.generateOrderNumber();

        const order = new Order({
            ...req.body,
            orderNumber,
            createdBy: req.user?._id
        });

        await order.save();

        logger.info('Order created', { orderNumber, customerId: order.customerId });
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        logger.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
});

// Update order
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                updatedBy: req.user?._id,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        logger.info('Order updated', { orderId: order._id, orderNumber: order.orderNumber });
        res.json({
            success: true,
            message: 'Order updated successfully',
            order
        });
    } catch (error) {
        logger.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order',
            error: error.message
        });
    }
});

// Convert order to bill
router.post('/:id/convert-to-bill', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.convertedToBill) {
            return res.status(400).json({
                success: false,
                message: 'Order already converted to bill',
                billNumber: order.billNumber
            });
        }

        // Here you would create a bill from the order
        // For now, just mark as converted
        order.convertedToBill = true;
        order.status = 'completed';
        order.updatedBy = req.user?._id;
        await order.save();

        logger.info('Order converted to bill', { orderId: order._id, orderNumber: order.orderNumber });
        res.json({
            success: true,
            message: 'Order converted to bill successfully',
            order
        });
    } catch (error) {
        logger.error('Error converting order to bill:', error);
        res.status(500).json({
            success: false,
            message: 'Error converting order',
            error: error.message
        });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        logger.info('Order deleted', { orderId: order._id, orderNumber: order.orderNumber });
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting order:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting order',
            error: error.message
        });
    }
});

module.exports = router;
