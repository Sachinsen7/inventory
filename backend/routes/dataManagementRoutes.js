const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get all collections dynamically
const getCollection = (collectionName) => {
    return mongoose.connection.collection(collectionName);
};

// GET all items from a collection
router.get('/:collectionName', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const collection = getCollection(collectionName);
        const items = await collection.find({}).toArray();
        res.json(items);
    } catch (error) {
        console.error(`Error fetching ${req.params.collectionName}:`, error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
});

// DELETE a single item from a collection
router.delete('/:collectionName/:id', async (req, res) => {
    try {
        const { collectionName, id } = req.params;
        const collection = getCollection(collectionName);

        const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({ message: 'Item deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
        console.error(`Error deleting item from ${req.params.collectionName}:`, error);
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
});

// DELETE multiple items from a collection
router.post('/:collectionName/delete-many', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid ids array' });
        }

        const collection = getCollection(collectionName);
        const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

        const result = await collection.deleteMany({ _id: { $in: objectIds } });

        res.json({
            message: `Successfully deleted ${result.deletedCount} item(s)`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(`Error deleting items from ${req.params.collectionName}:`, error);
        res.status(500).json({ message: 'Error deleting items', error: error.message });
    }
});

module.exports = router;
