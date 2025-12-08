// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Role-based access control
  role: {
    type: String,
    enum: ['admin', 'sales_officer', 'store_manager', 'accountant', 'staff'],
    default: 'staff'
  },

  // Permissions
  permissions: {
    canViewProfit: { type: Boolean, default: false },
    canViewPricing: { type: Boolean, default: false },
    canAccessInventory: { type: Boolean, default: false },
    canGiveDiscount: { type: Boolean, default: false },
    canEditBills: { type: Boolean, default: false },
    canDeleteBills: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false }
  },

  // User details
  name: { type: String },
  phoneNumber: { type: String },
  isActive: { type: Boolean, default: true },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Set default permissions based on role
userSchema.methods.setDefaultPermissions = function () {
  switch (this.role) {
    case 'admin':
      this.permissions = {
        canViewProfit: true,
        canViewPricing: true,
        canAccessInventory: true,
        canGiveDiscount: true,
        canEditBills: true,
        canDeleteBills: true,
        canViewReports: true,
        canManageUsers: true
      };
      break;

    case 'sales_officer':
      // Sales officer should NOT see profit
      this.permissions = {
        canViewProfit: false,  // HIDDEN
        canViewPricing: true,
        canAccessInventory: true,
        canGiveDiscount: false,
        canEditBills: true,
        canDeleteBills: false,
        canViewReports: true,
        canManageUsers: false
      };
      break;

    case 'store_manager':
      // Store manager should NOT see pricing
      this.permissions = {
        canViewProfit: false,
        canViewPricing: false,  // HIDDEN
        canAccessInventory: true,
        canGiveDiscount: false,
        canEditBills: false,
        canDeleteBills: false,
        canViewReports: true,
        canManageUsers: false
      };
      break;

    case 'accountant':
      // Accountant should NOT access inventory
      this.permissions = {
        canViewProfit: true,
        canViewPricing: true,
        canAccessInventory: false,  // HIDDEN
        canGiveDiscount: false,
        canEditBills: true,
        canDeleteBills: false,
        canViewReports: true,
        canManageUsers: false
      };
      break;

    case 'staff':
    default:
      this.permissions = {
        canViewProfit: false,
        canViewPricing: false,
        canAccessInventory: true,
        canGiveDiscount: false,
        canEditBills: false,
        canDeleteBills: false,
        canViewReports: false,
        canManageUsers: false
      };
      break;
  }
};

// Password hashing before saving user
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Set default permissions if role changed
  if (this.isModified('role')) {
    this.setDefaultPermissions();
  }

  next();
});

module.exports = mongoose.model('User', userSchema);
