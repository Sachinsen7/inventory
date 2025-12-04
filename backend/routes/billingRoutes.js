const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body } = require('express-validator');
const Godown = require('../models/Godowns');
const GodownInventory = require('../models/GodownInventory');
const logger = require('../utils/logger');
const validators = require('../utils/validators');

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  gstNo: { type: String },
  phoneNumber: { type: String },
  specialPriceStartDate: { type: Date },
  specialPriceEndDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Item Schema
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  masterPrice: { type: Number, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  masterPrice: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
  minStockLevel: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

// Bill Schema
const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  invoiceId: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
  godownName: { type: String },
  items: [{
    itemId: { type: String },
    itemName: { type: String, required: true },
    price: { type: Number, required: true },
    masterPrice: { type: Number, required: true },
    selectedPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  priceType: { type: String, enum: ['price', 'masterPrice'], default: 'price' },
  paymentStatus: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);
const BillingItem = mongoose.model('BillingItem', itemSchema);
const BillingInventory = mongoose.model('BillingInventory', inventorySchema);
const Bill = mongoose.model('Bill', billSchema);

// Generate unique bill number
const generateBillNumber = async () => {
  const count = await Bill.countDocuments();
  return `BILL-${String(count + 1).padStart(6, '0')}`;
};

// Generate unique invoice ID
const generateInvoiceId = async () => {
  const count = await Bill.countDocuments();
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${timestamp}-${String(count + 1).padStart(4, '0')}`;
};

// ==================== CUSTOMER ROUTES ====================

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Billing API is working!' });
});

// Get all customers
router.get('/customers/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    logger.error('Error fetching customers', error);
    res.status(500).json({ message: 'Unable to fetch customers' });
  }
});

// Get single customer
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    logger.error('Error fetching customer', error);
    res.status(500).json({ message: 'Unable to fetch customer' });
  }
});

// Add new customer
router.post('/customers/add',
  validators.rejectUnknownFields(['name', 'address', 'city', 'state', 'gstNo', 'phoneNumber', 'specialPriceStartDate', 'specialPriceEndDate']),
  [
    validators.string('name', 200),
    validators.string('address', 500),
    validators.string('city', 100),
    validators.string('state', 100),
    validators.gstNo('gstNo'),
    body('phoneNumber').optional().matches(/^[0-9\s\-\+\(\)]+$/),
    body('specialPriceStartDate').optional().isISO8601().toDate(),
    body('specialPriceEndDate').optional().isISO8601().toDate()
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const customer = new Customer(req.body);
      const savedCustomer = await customer.save();
      res.status(201).json(savedCustomer);
    } catch (error) {
      logger.error('Error adding customer', error);
      res.status(400).json({ message: 'Unable to add customer' });
    }
  }
);

// Update customer
router.put('/customers/:id',
  validators.rejectUnknownFields(['name', 'address', 'city', 'state', 'gstNo', 'phoneNumber', 'specialPriceStartDate', 'specialPriceEndDate']),
  [
    body('name').optional().isString().trim().isLength({ max: 200 }),
    body('address').optional().isString().trim().isLength({ max: 500 }),
    body('city').optional().isString().trim().isLength({ max: 100 }),
    body('state').optional().isString().trim().isLength({ max: 100 }),
    validators.gstNo('gstNo'),
    body('phoneNumber').optional().matches(/^[0-9\s\-\+\(\)]+$/),
    body('specialPriceStartDate').optional().isISO8601().toDate(),
    body('specialPriceEndDate').optional().isISO8601().toDate()
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      logger.error('Error updating customer', error);
      res.status(400).json({ message: 'Unable to update customer' });
    }
  }
);

// Delete customer
router.delete('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error('Error deleting customer', error);
    res.status(500).json({ message: 'Unable to delete customer' });
  }
});

// ==================== ITEM ROUTES ====================

// Get items for a customer
router.get('/items/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    logger.debug('Fetching items for customer', { customerId });

    // Check if customerId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      logger.warn('Invalid customer ID format', { customerId });
      return res.status(400).json({ message: 'Invalid customer ID format' });
    }

    // First, let's check if there are any items in the database at all
    const totalItems = await BillingItem.countDocuments();
    logger.debug('Total items in database', { totalItems });

    // Check if there are any items for this customer
    const customerItemsCount = await BillingItem.countDocuments({ customerId });
    logger.debug('Items count for this customer', { customerItemsCount });

    // Get all items for this customer
    const items = await BillingItem.find({ customerId: customerId }).sort({ srNo: 1 });
    logger.debug('Found items for customer', { count: items.length });

    // Also try a more flexible search
    const allItems = await BillingItem.find({});
    logger.debug('All items in database count', { count: allItems.length });

    res.json(items);
  } catch (error) {
    logger.error('Error fetching items for customer', error);
    res.status(500).json({ message: 'Unable to fetch items' });
  }
});

// Add new item
router.post('/items/add',
  validators.rejectUnknownFields(['customerId', 'srNo', 'name', 'price', 'masterPrice']),
  [
    validators.objectId('customerId'),
    validators.string('srNo', 100),
    validators.string('name', 500),
    validators.price('price'),
    validators.price('masterPrice')
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      logger.debug('Adding new item', { body: req.body });

      const itemData = {
        ...req.body,
        customerId: mongoose.Types.ObjectId.isValid(req.body.customerId)
          ? req.body.customerId
          : new mongoose.Types.ObjectId(req.body.customerId)
      };

      logger.debug('Processed item data', { itemData });

      const item = new BillingItem(itemData);
      logger.debug('Item object before save', { item: item.toObject ? item.toObject() : item });

      const savedItem = await item.save();
      logger.info('Item saved successfully', { id: savedItem._id });

      res.status(201).json(savedItem);
    } catch (error) {
      logger.error('Error adding item', error);
      res.status(400).json({ message: 'Unable to add item' });
    }
  }
);// Update item
router.post('/items/update/:id',
  validators.rejectUnknownFields(['srNo', 'name', 'price', 'masterPrice', 'customerId']),
  [
    body('srNo').optional().isString().trim(),
    body('name').optional().isString().trim().isLength({ max: 500 }),
    body('price').optional().isFloat({ min: 0 }),
    body('masterPrice').optional().isFloat({ min: 0 }),
    body('customerId').optional().isMongoId()
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const item = await BillingItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      logger.error('Error updating item', error);
      res.status(400).json({ message: 'Unable to update item' });
    }
  }
);

// Delete item
router.delete('/items/:id', async (req, res) => {
  try {
    const item = await BillingItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting item', error);
    res.status(500).json({ message: 'Unable to delete item' });
  }
});

// Bulk update items from Excel
router.post('/items/bulk-update/:customerId',
  validators.rejectUnknownFields(['items']),
  [
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array')
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { items } = req.body;
      const customerId = req.params.customerId;
      logger.info('Bulk updating items for customer', { customerId, count: items.length });

      // Delete existing items for this customer
      const deletedCount = await BillingItem.deleteMany({ customerId });
      logger.debug('Deleted existing items', { deleted: deletedCount.deletedCount });

      // Add new items - map new template fields to database fields
      const itemsToAdd = items.map((item, index) => ({
        customerId,
        srNo: item.barcodeNumber || item.srNo || String(index + 1),
        name: item.itemName || item.name || '',
        price: 0, // Price not in template, set to 0
        masterPrice: 0 // MasterPrice not in template, set to 0
      }));

      const savedItems = await BillingItem.insertMany(itemsToAdd);
      logger.info('Saved new items', { count: savedItems.length });
      res.json({ message: 'Items updated successfully', count: savedItems.length });
    } catch (error) {
      logger.error('Error bulk updating items', error);
      res.status(400).json({ message: 'Unable to bulk update items' });
    }
  }
);

// ==================== INVENTORY ROUTES ====================

// Get all inventory items
router.get('/inventory/', async (req, res) => {
  try {
    const inventory = await BillingInventory.find().sort({ itemName: 1 });
    res.json(inventory);
  } catch (error) {
    logger.error('Error fetching inventory', error);
    res.status(500).json({ message: 'Unable to fetch inventory' });
  }
});

// Billing inventory routes removed - no longer needed

// Check inventory availability
router.post('/inventory/check-availability', async (req, res) => {
  try {
    const { items, godownId } = req.body;
    const availability = [];

    // Get godown details
    const godown = await Godown.findById(godownId);
    if (!godown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    logger.debug('Checking inventory for godown', { godown: godown.name, itemsCount: items?.length || 0 });

    // Import Delevery1 model from server.js (we need to access it)
    const mongoose = require('mongoose');

    // Define Delevery1 schema if not already defined
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
        godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
        lastUpdated: { type: Date, default: Date.now }
      });
      Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
    }

    for (const item of items) {
      logger.debug(`Checking item`, { itemName: item.itemName });

      // Get first 3 digits as prefix for matching
      const itemPrefix = item.itemName.substring(0, 3);
      logger.debug('Using prefix for item', { itemPrefix, itemName: item.itemName });

      // Check if item exists in delevery1 collection with matching godown using 3-digit prefix
      const delevery1Items = await Delevery1.find({
        inputValue: { $regex: `^${itemPrefix}` }, // Match items that start with the 3-digit prefix
        godownName: godown.name
      });

      logger.debug('Matching items found in delevery1', { prefix: itemPrefix, count: delevery1Items.length });

      // Calculate total available quantity in the selected godown
      const totalAvailableQuantity = delevery1Items.length;
      const isAvailable = totalAvailableQuantity >= item.quantity;

      // Find alternative godowns that have this item with same prefix
      const alternativeGodowns = await Delevery1.find({
        inputValue: { $regex: `^${itemPrefix}` },
        godownName: { $ne: godown.name }
      });

      // Group alternative godowns by godownName
      const alternativeGodownsGrouped = alternativeGodowns.reduce((acc, curr) => {
        if (!acc[curr.godownName]) {
          acc[curr.godownName] = {
            godownName: curr.godownName,
            availableQuantity: 0
          };
        }
        acc[curr.godownName].availableQuantity += 1;
        return acc;
      }, {});

      availability.push({
        itemName: item.itemName,
        prefix: itemPrefix,
        requestedQuantity: item.quantity,
        availableQuantity: totalAvailableQuantity,
        isAvailableInSelectedGodown: isAvailable,
        selectedGodownName: godown.name,
        status: isAvailable ? 'Available' : 'Not Available',
        message: isAvailable
          ? `✅ Item ${item.itemName} (prefix: ${itemPrefix}) available in ${godown.name}`
          : `❌ Item ${item.itemName} (prefix: ${itemPrefix}) not available in ${godown.name}`,
        alternativeGodowns: Object.values(alternativeGodownsGrouped),
        matchingItems: delevery1Items.map(di => di.inputValue)
      });
    }

    logger.debug('Availability results computed', { count: availability.length });
    res.json(availability);
  } catch (error) {
    logger.error('Error checking inventory availability', error);
    res.status(400).json({ message: 'Unable to check inventory availability' });
  }
});

// ==================== GODOWN ROUTES ====================

// Get items from a specific godown
router.get('/godowns/:godownId/items', async (req, res) => {
  try {
    const godownId = req.params.godownId;

    // Get godown details
    const godown = await Godown.findById(godownId);
    if (!godown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    // Get all items from the main inventory (since godowns don't have their own items)
    // We'll use the BillingInventory as the source
    const items = await BillingInventory.find().sort({ itemName: 1 });

    res.json({
      godown: {
        _id: godown._id,
        name: godown.name,
        city: godown.city,
        state: godown.state
      },
      items: items
    });
  } catch (error) {
    logger.error('Error fetching godown items', error);
    res.status(500).json({ message: 'Unable to fetch godown items' });
  }
});

// Get godowns sorted by location matching
router.get('/godowns/sorted/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get all godowns
    const allGodowns = await Godown.find().sort({ name: 1 });

    // Separate godowns by location matching
    const matchingGodowns = [];
    const nonMatchingGodowns = [];

    allGodowns.forEach(godown => {
      if (godown.city.toLowerCase() === customer.city.toLowerCase() &&
        godown.state.toLowerCase() === customer.state.toLowerCase()) {
        matchingGodowns.push(godown);
      } else {
        nonMatchingGodowns.push(godown);
      }
    });

    res.json({
      matchingGodowns,
      nonMatchingGodowns,
      customerLocation: {
        city: customer.city,
        state: customer.state
      }
    });
  } catch (error) {
    logger.error('Error fetching sorted godowns', error);
    res.status(500).json({ message: 'Unable to fetch godowns' });
  }
});

// ==================== BILL ROUTES ====================

// Get items for a customer (for billing)
router.get('/bills/customer/:customerId/items', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    logger.debug('Fetching items for billing customer', { customerId });

    // Check if customerId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      logger.warn('Invalid customer ID format for billing', { customerId });
      return res.status(400).json({ message: 'Invalid customer ID format' });
    }

    const items = await BillingItem.find({ customerId }).sort({ name: 1 });
    logger.debug('Found items for billing', { count: items.length });
    res.json(items);
  } catch (error) {
    logger.error('Error fetching items for billing', error);
    res.status(500).json({ message: 'Unable to fetch items for billing' });
  }
});

// Add new billing item for customer
router.post('/bills/customer/items/add', async (req, res) => {
  try {
    logger.debug('Adding new billing item', { body: req.body });

    const itemData = {
      name: req.body.name,
      price: req.body.price,
      masterPrice: req.body.masterPrice,
      customerId: req.body.customerId,
      srNo: Date.now().toString() // Generate a unique srNo based on timestamp
    };

    const item = new BillingItem(itemData);
    const savedItem = await item.save();
    logger.info('Billing item saved successfully', { id: savedItem._id });

    res.status(201).json(savedItem);
  } catch (error) {
    logger.error('Error adding billing item', error);
    res.status(400).json({ message: 'Unable to add billing item' });
  }
});

// Update billing item for customer
router.put('/bills/customer/items/:itemId', async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const updateData = {
      name: req.body.name,
      price: req.body.price,
      masterPrice: req.body.masterPrice
    };

    const item = await BillingItem.findByIdAndUpdate(itemId, updateData, { new: true });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    logger.info('Billing item updated successfully', { id: item._id });
    res.json(item);
  } catch (error) {
    logger.error('Error updating billing item', error);
    res.status(400).json({ message: 'Unable to update billing item' });
  }
});

// Delete billing item for customer
router.delete('/bills/customer/items/:itemId', async (req, res) => {
  try {
    const itemId = req.params.itemId;

    const item = await BillingItem.findByIdAndDelete(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    logger.info('Billing item deleted successfully', { id: item._id });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting billing item', error);
    res.status(500).json({ message: 'Unable to delete billing item' });
  }
});

// Get bills for a customer
router.get('/bills/customer/:customerId/bills', async (req, res) => {
  try {
    const bills = await Bill.find({ customerId: req.params.customerId })
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    logger.error('Error fetching customer bills', error);
    res.status(500).json({ message: 'Unable to fetch bills' });
  }
});

// Add new bill
router.post('/bills/add',
  validators.rejectUnknownFields(['items', 'godownName', 'customerId', 'customerName', 'godownId', 'totalAmount', 'priceType', 'paymentStatus']),
  [
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('godownName').optional().isString().trim(),
    body('customerId').optional().isMongoId(),
    body('customerName').optional().isString().trim(),
    body('godownId').optional().isMongoId(),
    validators.price('totalAmount'),
    body('priceType').optional().isIn(['price', 'masterPrice']),
    body('paymentStatus').optional().isIn(['Pending', 'Processing', 'Completed', 'Failed'])
  ],
  validators.handleValidationErrors,
  async (req, res) => {
    try {
      const { items, godownName } = req.body;

      logger.debug('Creating bill', { itemsCount: items?.length || 0, godownName });

      // Get Delevery1 model
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
          godownId: { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
          lastUpdated: { type: Date, default: Date.now }
        });
        Delevery1 = mongoose.model('Delevery1', delevery1Schema, 'delevery1');
      }

      // Create the bill first
      const billNumber = await generateBillNumber();
      const invoiceId = await generateInvoiceId();
      const bill = new Bill({
        ...req.body,
        billNumber,
        invoiceId,
        paymentStatus: req.body.paymentStatus || 'Pending'
      });
      const savedBill = await bill.save();
      logger.info('Bill created successfully', { billNumber: savedBill.billNumber, invoiceId: savedBill.invoiceId });

      // Now delete items from delevery1 collection
      const deletionResults = [];

      for (const item of items) {
        const itemName = item.itemName;
        const requestedQuantity = item.quantity;

        logger.debug('Processing bill item', { itemName, requestedQuantity });

        // Get first 3 digits as prefix for matching
        const itemPrefix = itemName.substring(0, 3);
        logger.debug('Using prefix for bill item', { itemPrefix, itemName });

        // Find matching items in delevery1 collection using 3-digit prefix
        const matchingItems = await Delevery1.find({
          inputValue: { $regex: `^${itemPrefix}` }, // Match items that start with the 3-digit prefix
          godownName: godownName
        }).limit(requestedQuantity);

        logger.debug('Found matching items in delevery1', { prefix: itemPrefix, count: matchingItems.length });

        // Delete the found items
        const deletedItems = [];
        const deletedItemValues = [];
        for (const matchingItem of matchingItems) {
          await Delevery1.findByIdAndDelete(matchingItem._id);
          deletedItems.push(matchingItem._id);
          deletedItemValues.push(matchingItem.inputValue);
          logger.debug('Deleted item from delevery1', { id: matchingItem._id, value: matchingItem.inputValue });
        }

        deletionResults.push({
          itemName: itemName,
          prefix: itemPrefix,
          requestedQuantity: requestedQuantity,
          foundItems: matchingItems.length,
          deletedItems: deletedItems.length,
          deletedIds: deletedItems,
          deletedItemValues: deletedItemValues
        });
      }

      logger.debug('Deletion results', { deletionResultsCount: deletionResults.length });

      // Return success response with deletion details
      res.status(201).json({
        ...savedBill.toObject(),
        deletionResults: deletionResults,
        message: `Bill created successfully! ${deletionResults.reduce((sum, result) => sum + result.deletedItems, 0)} items removed from inventory.`
      });

    } catch (error) {
      logger.error('Error creating bill', error);
      res.status(400).json({ message: 'Unable to create bill' });
    }
  });

// Get all bills
router.get('/bills/', async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    logger.error('Error fetching bills', error);
    res.status(500).json({ message: 'Unable to fetch bills' });
  }
});

// Get single bill
router.get('/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customerId', 'name address gstNo phoneNumber');
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    logger.error('Error fetching bill', error);
    res.status(500).json({ message: 'Unable to fetch bill' });
  }
});

// Get invoice by invoiceId
router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const bill = await Bill.findOne({ invoiceId: req.params.invoiceId })
      .populate('customerId', 'name address gstNo phoneNumber city state');
    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(bill);
  } catch (error) {
    logger.error('Error fetching invoice', error);
    res.status(500).json({ message: 'Unable to fetch invoice' });
  }
});

// Update payment status
router.put('/invoices/:invoiceId/status', async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['Pending', 'Processing', 'Completed', 'Failed'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const bill = await Bill.findOneAndUpdate(
      { invoiceId: req.params.invoiceId },
      { paymentStatus, updatedAt: Date.now() },
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    logger.info('Payment status updated', { invoiceId: req.params.invoiceId, paymentStatus });
    res.json({ message: 'Payment status updated successfully', bill });
  } catch (error) {
    logger.error('Error updating payment status', error);
    res.status(500).json({ message: 'Unable to update payment status' });
  }
});

// Get all invoices with filtering and sorting
router.get('/invoices', async (req, res) => {
  try {
    const { status, customerId, sortBy = 'createdAt', order = 'desc' } = req.query;

    let query = {};

    // Filter by payment status
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    // Filter by customer
    if (customerId) {
      query.customerId = customerId;
    }

    // Build sort object
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const bills = await Bill.find(query)
      .populate('customerId', 'name city state')
      .sort(sortObj);

    // Calculate summary statistics
    const summary = {
      total: bills.length,
      pending: bills.filter(b => b.paymentStatus === 'Pending').length,
      processing: bills.filter(b => b.paymentStatus === 'Processing').length,
      completed: bills.filter(b => b.paymentStatus === 'Completed').length,
      failed: bills.filter(b => b.paymentStatus === 'Failed').length,
      totalAmount: bills.reduce((sum, b) => sum + b.totalAmount, 0),
      completedAmount: bills.filter(b => b.paymentStatus === 'Completed').reduce((sum, b) => sum + b.totalAmount, 0),
      pendingAmount: bills.filter(b => b.paymentStatus === 'Pending').reduce((sum, b) => sum + b.totalAmount, 0)
    };

    res.json({ invoices: bills, summary });
  } catch (error) {
    logger.error('Error fetching invoices', error);
    res.status(500).json({ message: 'Unable to fetch invoices' });
  }
});

// ==================== GODOWN INVENTORY ROUTES ====================

// Initialize godown inventory
router.post('/godowns/:godownId/initialize-inventory', async (req, res) => {
  try {
    const godownId = req.params.godownId;

    // Check if godown exists
    const godown = await Godown.findById(godownId);
    if (!godown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    // Get sample inventory items from billing inventory
    const sampleItems = await BillingInventory.find().limit(10);

    let addedCount = 0;
    for (const item of sampleItems) {
      const existingItem = await GodownInventory.findOne({
        godownId: godownId,
        itemName: item.itemName
      });

      if (!existingItem) {
        const newItem = new GodownInventory({
          godownId: godownId,
          itemName: item.itemName,
          quantity: Math.floor(Math.random() * 50) + 10, // Random quantity between 10-60
          price: item.price || 0,
          masterPrice: item.masterPrice || 0,
          description: item.description || '',
          category: item.category || 'General',
          lastUpdated: Date.now()
        });
        await newItem.save();
        addedCount++;
      }
    }

    res.json({
      message: 'Godown inventory initialized successfully!',
      itemsAdded: addedCount,
      godownName: godown.name
    });
  } catch (error) {
    logger.error('Error initializing godown inventory', error);
    res.status(500).json({ message: 'Unable to initialize godown inventory' });
  }
});

// Get godown inventory debug info
router.get('/godowns/:godownId/inventory-debug', async (req, res) => {
  try {
    const godownId = req.params.godownId;
    const itemName = req.query.itemName;

    // Check if godown exists
    const godown = await Godown.findById(godownId);
    if (!godown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    if (itemName) {
      // Search for specific item
      const godownItem = await GodownInventory.findOne({ godownId, itemName });
      const mainItem = await BillingInventory.findOne({ itemName });

      res.json({
        godownName: godown.name,
        searchItem: itemName,
        godownInventory: godownItem,
        mainInventory: mainItem,
        isAvailableInGodown: !!godownItem,
        godownQuantity: godownItem?.quantity || 0
      });
    } else {
      // General debug info
      const godownInventoryCount = await GodownInventory.countDocuments({ godownId });
      const mainInventoryCount = await BillingInventory.countDocuments();

      res.json({
        godownName: godown.name,
        godownInventoryCount,
        mainInventoryCount,
        message: 'Debug info retrieved successfully'
      });
    }
  } catch (error) {
    logger.error('Error getting debug info', error);
    res.status(500).json({ message: 'Unable to retrieve debug info' });
  }
});

// Update godown inventory item
router.put('/godowns/:godownId/inventory/:itemName', async (req, res) => {
  try {
    const { godownId, itemName } = req.params;
    const { quantity } = req.body;

    // Check if godown exists
    const godown = await Godown.findById(godownId);
    if (!godown) {
      return res.status(404).json({ message: 'Godown not found' });
    }

    // Find or create the inventory item
    let inventoryItem = await GodownInventory.findOne({ godownId, itemName });

    if (inventoryItem) {
      // Update existing item
      inventoryItem.quantity += quantity;
      inventoryItem.lastUpdated = Date.now();
      await inventoryItem.save();
    } else {
      // Create new item - get details from main inventory
      const mainItem = await BillingInventory.findOne({ itemName });

      inventoryItem = new GodownInventory({
        godownId,
        itemName,
        quantity,
        price: mainItem?.price || 0,
        masterPrice: mainItem?.masterPrice || 0,
        description: mainItem?.description || '',
        category: mainItem?.category || 'General',
        lastUpdated: Date.now()
      });
      await inventoryItem.save();
    }

    res.json({
      message: 'Item added to godown inventory successfully',
      item: inventoryItem,
      godownName: godown.name
    });
  } catch (error) {
    logger.error('Error updating godown inventory', error);
    res.status(500).json({ message: 'Unable to update godown inventory' });
  }
});

module.exports = router;