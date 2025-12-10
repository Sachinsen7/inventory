const express = require('express');
const router = express.Router();
const VoucherTemplate = require('../models/VoucherTemplate');
const RecurringVoucher = require('../models/RecurringVoucher');
const VoucherApproval = require('../models/VoucherApproval');
const Voucher = require('../models/Voucher');

// ============================================
// Voucher Templates Routes
// ============================================

// Get all templates
router.get('/templates', async (req, res) => {
    try {
        const { voucherType, category, search, page = 1, limit = 20 } = req.query;

        const filters = { isActive: true };
        if (voucherType) filters.voucherType = voucherType;
        if (category) filters.category = category;

        if (search) {
            filters.$or = [
                { templateName: { $regex: search, $options: 'i' } },
                { templateCode: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const templates = await VoucherTemplate.find(filters)
            .sort({ isDefault: -1, usageCount: -1, templateName: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('createdBy', 'name');

        const total = await VoucherTemplate.countDocuments(filters);

        res.json({
            templates,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ message: 'Error fetching templates', error: error.message });
    }
});

// Get popular templates
router.get('/templates/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const templates = await VoucherTemplate.getPopularTemplates(parseInt(limit));
        res.json(templates);
    } catch (error) {
        console.error('Error fetching popular templates:', error);
        res.status(500).json({ message: 'Error fetching popular templates', error: error.message });
    }
});

// Get templates by voucher type
router.get('/templates/by-type/:voucherType', async (req, res) => {
    try {
        const templates = await VoucherTemplate.getTemplatesByType(req.params.voucherType);
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates by type:', error);
        res.status(500).json({ message: 'Error fetching templates by type', error: error.message });
    }
});

// Create template
router.post('/templates', async (req, res) => {
    try {
        const template = new VoucherTemplate({
            ...req.body,
            createdBy: req.user?.id
        });

        await template.save();

        res.status(201).json({
            message: 'Voucher template created successfully',
            template
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ message: 'Error creating template', error: error.message });
    }
});

// Update template
router.put('/templates/:id', async (req, res) => {
    try {
        const template = await VoucherTemplate.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user?.id },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json({
            message: 'Template updated successfully',
            template
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ message: 'Error updating template', error: error.message });
    }
});

// Duplicate template
router.post('/templates/:id/duplicate', async (req, res) => {
    try {
        const { newName } = req.body;

        if (!newName) {
            return res.status(400).json({ message: 'New template name is required' });
        }

        const template = await VoucherTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const duplicate = await template.duplicate(newName, req.user?.id);

        res.status(201).json({
            message: 'Template duplicated successfully',
            template: duplicate
        });
    } catch (error) {
        console.error('Error duplicating template:', error);
        res.status(500).json({ message: 'Error duplicating template', error: error.message });
    }
});

// Create voucher from template
router.post('/templates/:id/create-voucher', async (req, res) => {
    try {
        const { variables } = req.body;

        const voucher = await VoucherTemplate.createVoucherFromTemplate(
            req.params.id,
            variables,
            req.user?.id
        );

        res.status(201).json({
            message: 'Voucher created from template successfully',
            voucher
        });
    } catch (error) {
        console.error('Error creating voucher from template:', error);
        res.status(500).json({ message: 'Error creating voucher from template', error: error.message });
    }
});

// ============================================
// Recurring Vouchers Routes
// ============================================

// Get all recurring vouchers
router.get('/recurring', async (req, res) => {
    try {
        const { isActive, frequency, page = 1, limit = 20 } = req.query;

        const filters = {};
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        if (frequency) filters.frequency = frequency;

        const recurringVouchers = await RecurringVoucher.find(filters)
            .populate('templateId', 'templateName voucherType')
            .sort({ nextRunDate: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await RecurringVoucher.countDocuments(filters);

        res.json({
            recurringVouchers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    } catch (error) {
        console.error('Error fetching recurring vouchers:', error);
        res.status(500).json({ message: 'Error fetching recurring vouchers', error: error.message });
    }
});

// Create recurring voucher
router.post('/recurring', async (req, res) => {
    try {
        const recurringVoucher = new RecurringVoucher({
            ...req.body,
            createdBy: req.user?.id
        });

        await recurringVoucher.save();

        res.status(201).json({
            message: 'Recurring voucher created successfully',
            recurringVoucher
        });
    } catch (error) {
        console.error('Error creating recurring voucher:', error);
        res.status(500).json({ message: 'Error creating recurring voucher', error: error.message });
    }
});

// Execute recurring voucher manually
router.post('/recurring/:id/execute', async (req, res) => {
    try {
        const recurringVoucher = await RecurringVoucher.findById(req.params.id);

        if (!recurringVoucher) {
            return res.status(404).json({ message: 'Recurring voucher not found' });
        }

        const voucher = await recurringVoucher.execute();

        res.json({
            message: 'Recurring voucher executed successfully',
            voucher
        });
    } catch (error) {
        console.error('Error executing recurring voucher:', error);
        res.status(500).json({ message: 'Error executing recurring voucher', error: error.message });
    }
});

// Pause/Resume recurring voucher
router.post('/recurring/:id/pause', async (req, res) => {
    try {
        const recurringVoucher = await RecurringVoucher.findById(req.params.id);

        if (!recurringVoucher) {
            return res.status(404).json({ message: 'Recurring voucher not found' });
        }

        await recurringVoucher.pause();

        res.json({
            message: 'Recurring voucher paused successfully'
        });
    } catch (error) {
        console.error('Error pausing recurring voucher:', error);
        res.status(500).json({ message: 'Error pausing recurring voucher', error: error.message });
    }
});

router.post('/recurring/:id/resume', async (req, res) => {
    try {
        const recurringVoucher = await RecurringVoucher.findById(req.params.id);

        if (!recurringVoucher) {
            return res.status(404).json({ message: 'Recurring voucher not found' });
        }

        await recurringVoucher.resume();

        res.json({
            message: 'Recurring voucher resumed successfully'
        });
    } catch (error) {
        console.error('Error resuming recurring voucher:', error);
        res.status(500).json({ message: 'Error resuming recurring voucher', error: error.message });
    }
});

// Execute all due recurring vouchers
router.post('/recurring/execute-all-due', async (req, res) => {
    try {
        const results = await RecurringVoucher.executeAllDue();

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        res.json({
            message: `Executed ${successCount} recurring vouchers successfully, ${failureCount} failed`,
            results,
            summary: {
                total: results.length,
                successful: successCount,
                failed: failureCount
            }
        });
    } catch (error) {
        console.error('Error executing due recurring vouchers:', error);
        res.status(500).json({ message: 'Error executing due recurring vouchers', error: error.message });
    }
});

// ============================================
// Approval Workflow Routes
// ============================================

// Get pending approvals for user
router.get('/approvals/pending', async (req, res) => {
    try {
        const { page = 1, limit = 20, voucherType } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        const result = await VoucherApproval.getPendingApprovalsForUser(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            voucherType
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ message: 'Error fetching pending approvals', error: error.message });
    }
});

// Approve voucher
router.post('/approvals/:id/approve', async (req, res) => {
    try {
        const { comments } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        const approval = await VoucherApproval.findById(req.params.id);
        if (!approval) {
            return res.status(404).json({ message: 'Approval not found' });
        }

        const voucher = await approval.approve(userId, comments);

        res.json({
            message: 'Voucher approved successfully',
            voucher,
            approval
        });
    } catch (error) {
        console.error('Error approving voucher:', error);
        res.status(500).json({ message: 'Error approving voucher', error: error.message });
    }
});

// Reject voucher
router.post('/approvals/:id/reject', async (req, res) => {
    try {
        const { comments } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        if (!comments) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const approval = await VoucherApproval.findById(req.params.id);
        if (!approval) {
            return res.status(404).json({ message: 'Approval not found' });
        }

        const voucher = await approval.reject(userId, comments);

        res.json({
            message: 'Voucher rejected successfully',
            voucher,
            approval
        });
    } catch (error) {
        console.error('Error rejecting voucher:', error);
        res.status(500).json({ message: 'Error rejecting voucher', error: error.message });
    }
});

// Delegate approval
router.post('/approvals/:id/delegate', async (req, res) => {
    try {
        const { delegateToId, reason } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        if (!delegateToId) {
            return res.status(400).json({ message: 'Delegate user ID is required' });
        }

        const approval = await VoucherApproval.findById(req.params.id);
        if (!approval) {
            return res.status(404).json({ message: 'Approval not found' });
        }

        await approval.delegate(userId, delegateToId, reason);

        res.json({
            message: 'Approval delegated successfully',
            approval
        });
    } catch (error) {
        console.error('Error delegating approval:', error);
        res.status(500).json({ message: 'Error delegating approval', error: error.message });
    }
});

// Get approval statistics for user
router.get('/approvals/statistics', async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        const statistics = await VoucherApproval.getApprovalStatistics(userId, {
            fromDate,
            toDate
        });

        res.json(statistics);
    } catch (error) {
        console.error('Error fetching approval statistics:', error);
        res.status(500).json({ message: 'Error fetching approval statistics', error: error.message });
    }
});

// ============================================
// Bulk Operations Routes
// ============================================

// Bulk create vouchers from template
router.post('/bulk/create-from-template', async (req, res) => {
    try {
        const { templateId, voucherData } = req.body;

        if (!templateId || !Array.isArray(voucherData) || voucherData.length === 0) {
            return res.status(400).json({ message: 'Template ID and voucher data array are required' });
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < voucherData.length; i++) {
            try {
                const voucher = await VoucherTemplate.createVoucherFromTemplate(
                    templateId,
                    voucherData[i],
                    req.user?.id
                );

                results.push({
                    index: i,
                    success: true,
                    voucherNumber: voucher.voucherNumber,
                    voucherId: voucher._id
                });
            } catch (error) {
                errors.push({
                    index: i,
                    success: false,
                    error: error.message,
                    data: voucherData[i]
                });
            }
        }

        res.json({
            message: `Bulk operation completed: ${results.length} successful, ${errors.length} failed`,
            results,
            errors,
            summary: {
                total: voucherData.length,
                successful: results.length,
                failed: errors.length
            }
        });
    } catch (error) {
        console.error('Error in bulk create operation:', error);
        res.status(500).json({ message: 'Error in bulk create operation', error: error.message });
    }
});

// Bulk approve vouchers
router.post('/bulk/approve', async (req, res) => {
    try {
        const { approvalIds, comments } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        if (!Array.isArray(approvalIds) || approvalIds.length === 0) {
            return res.status(400).json({ message: 'Approval IDs array is required' });
        }

        const results = [];
        const errors = [];

        for (const approvalId of approvalIds) {
            try {
                const approval = await VoucherApproval.findById(approvalId);
                if (approval) {
                    await approval.approve(userId, comments);
                    results.push({
                        approvalId,
                        success: true,
                        voucherNumber: approval.voucherNumber
                    });
                }
            } catch (error) {
                errors.push({
                    approvalId,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            message: `Bulk approval completed: ${results.length} approved, ${errors.length} failed`,
            results,
            errors,
            summary: {
                total: approvalIds.length,
                successful: results.length,
                failed: errors.length
            }
        });
    } catch (error) {
        console.error('Error in bulk approval operation:', error);
        res.status(500).json({ message: 'Error in bulk approval operation', error: error.message });
    }
});

// Bulk post vouchers
router.post('/bulk/post', async (req, res) => {
    try {
        const { voucherIds } = req.body;

        if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
            return res.status(400).json({ message: 'Voucher IDs array is required' });
        }

        const results = [];
        const errors = [];

        for (const voucherId of voucherIds) {
            try {
                const voucher = await Voucher.findById(voucherId);
                if (voucher && voucher.status === 'draft') {
                    await voucher.postVoucher();
                    results.push({
                        voucherId,
                        success: true,
                        voucherNumber: voucher.voucherNumber
                    });
                }
            } catch (error) {
                errors.push({
                    voucherId,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            message: `Bulk posting completed: ${results.length} posted, ${errors.length} failed`,
            results,
            errors,
            summary: {
                total: voucherIds.length,
                successful: results.length,
                failed: errors.length
            }
        });
    } catch (error) {
        console.error('Error in bulk post operation:', error);
        res.status(500).json({ message: 'Error in bulk post operation', error: error.message });
    }
});

// ============================================
// Voucher Printing Routes
// ============================================

// Get voucher print data
router.get('/print/:id', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('items.account');

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        // Get company details from settings
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();

        const printData = {
            voucher,
            companyDetails: {
                name: settings.companyName,
                address: settings.companyAddress,
                gstin: settings.companyGSTIN,
                pan: settings.companyPAN,
                phone: settings.companyPhone,
                email: settings.companyEmail
            },
            printDate: new Date(),
            printedBy: req.user?.name || 'System'
        };

        res.json(printData);
    } catch (error) {
        console.error('Error fetching voucher print data:', error);
        res.status(500).json({ message: 'Error fetching voucher print data', error: error.message });
    }
});

// Bulk print vouchers
router.post('/print/bulk', async (req, res) => {
    try {
        const { voucherIds } = req.body;

        if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
            return res.status(400).json({ message: 'Voucher IDs array is required' });
        }

        const vouchers = await Voucher.find({ _id: { $in: voucherIds } })
            .populate('createdBy', 'name')
            .populate('items.account')
            .sort({ voucherDate: -1, voucherNumber: -1 });

        // Get company details
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();

        const printData = {
            vouchers,
            companyDetails: {
                name: settings.companyName,
                address: settings.companyAddress,
                gstin: settings.companyGSTIN,
                pan: settings.companyPAN,
                phone: settings.companyPhone,
                email: settings.companyEmail
            },
            printDate: new Date(),
            printedBy: req.user?.name || 'System',
            totalVouchers: vouchers.length
        };

        res.json(printData);
    } catch (error) {
        console.error('Error fetching bulk print data:', error);
        res.status(500).json({ message: 'Error fetching bulk print data', error: error.message });
    }
});

module.exports = router;