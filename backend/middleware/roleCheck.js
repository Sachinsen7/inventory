const logger = require('../utils/logger');

// Check if user has specific role
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn('Role access denied', {
                userId: req.user._id,
                userRole: req.user.role,
                requiredRoles: allowedRoles
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
                requiredRole: allowedRoles
            });
        }

        next();
    };
};

// Check if user has specific permission
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!req.user.permissions || !req.user.permissions[permission]) {
            logger.warn('Permission denied', {
                userId: req.user._id,
                userRole: req.user.role,
                requiredPermission: permission
            });

            return res.status(403).json({
                success: false,
                message: `Access denied. Missing permission: ${permission}`,
                requiredPermission: permission
            });
        }

        next();
    };
};

// Check if user can view profit (for sales officer restriction)
const canViewProfit = checkPermission('canViewProfit');

// Check if user can view pricing (for store manager restriction)
const canViewPricing = checkPermission('canViewPricing');

// Check if user can access inventory (for accountant restriction)
const canAccessInventory = checkPermission('canAccessInventory');

// Check if user can give discount
const canGiveDiscount = checkPermission('canGiveDiscount');

// Check if user can edit bills
const canEditBills = checkPermission('canEditBills');

// Check if user can delete bills
const canDeleteBills = checkPermission('canDeleteBills');

// Check if user can view reports
const canViewReports = checkPermission('canViewReports');

// Check if user can manage users
const canManageUsers = checkPermission('canManageUsers');

module.exports = {
    checkRole,
    checkPermission,
    canViewProfit,
    canViewPricing,
    canAccessInventory,
    canGiveDiscount,
    canEditBills,
    canDeleteBills,
    canViewReports,
    canManageUsers
};
