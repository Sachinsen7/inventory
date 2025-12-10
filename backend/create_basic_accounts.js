// Script to create basic ledger accounts
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/inventory_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define basic accounts
const basicAccounts = [
    { name: 'Professional Fees Expense', type: 'Expense', category: 'Operating Expenses' },
    { name: 'TDS Payable - 194C', type: 'Liability', category: 'Current Liabilities' },
    { name: 'Bank Account - SBI', type: 'Asset', category: 'Current Assets' },
    { name: 'Bank Account - HDFC', type: 'Asset', category: 'Current Assets' },
    { name: 'Cash Account', type: 'Asset', category: 'Current Assets' },
    { name: 'Sales Account', type: 'Income', category: 'Revenue' },
    { name: 'Purchase Account', type: 'Expense', category: 'Cost of Goods Sold' },
    { name: 'GST Output Tax', type: 'Liability', category: 'Current Liabilities' },
    { name: 'GST Input Tax', type: 'Asset', category: 'Current Assets' },
    { name: 'Depreciation Expense', type: 'Expense', category: 'Operating Expenses' },
    { name: 'Accumulated Depreciation', type: 'Liability', category: 'Long-term Liabilities' },
    { name: 'Sales Returns Account', type: 'Expense', category: 'Operating Expenses' },
    { name: 'Office Rent Expense', type: 'Expense', category: 'Operating Expenses' },
    { name: 'TDS Payable - 194I', type: 'Liability', category: 'Current Liabilities' }
];

// Create accounts collection
async function createAccounts() {
    try {
        const db = mongoose.connection.db;
        const accountsCollection = db.collection('accounts');

        // Clear existing accounts
        await accountsCollection.deleteMany({});

        // Insert basic accounts
        const result = await accountsCollection.insertMany(basicAccounts.map(account => ({
            ...account,
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        })));

        console.log(`Created ${result.insertedCount} basic accounts`);

        // Also create as LedgerEntry records for voucher system
        const LedgerEntry = mongoose.model('LedgerEntry', new mongoose.Schema({
            entityId: { type: mongoose.Schema.Types.ObjectId },
            entityType: { type: String },
            action: { type: String },
            accountName: { type: String },
            amount: { type: Number, default: 0 },
            balanceType: { type: String, default: 'debit' },
            transactionDate: { type: Date, default: Date.now },
            description: { type: String }
        }));

        for (const account of basicAccounts) {
            await LedgerEntry.create({
                entityId: new mongoose.Types.ObjectId(),
                entityType: 'Account',
                action: 'opening_balance',
                accountName: account.name,
                amount: 0,
                balanceType: account.type === 'Asset' || account.type === 'Expense' ? 'debit' : 'credit',
                description: `Opening balance for ${account.name}`
            });
        }

        console.log('Created ledger entries for all accounts');
        process.exit(0);
    } catch (error) {
        console.error('Error creating accounts:', error);
        process.exit(1);
    }
}

mongoose.connection.once('open', createAccounts);