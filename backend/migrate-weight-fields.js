require("dotenv").config();
const mongoose = require("mongoose");

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI not found in environment variables");
    process.exit(1);
}

// Define the barcode schema (must match the one in server.js)
const barcodeSchema = new mongoose.Schema({
    product: String,
    packed: String,
    batch: String,
    shift: String,
    numberOfBarcodes: Number,
    location: String,
    currentTime: String,
    rewinder: String,
    edge: String,
    winder: String,
    mixer: String,
    skuc: String,
    skun: String,
    coreWeight: String,
    grossWeight: String,
    netWeight: String,
    weight: String, // Old field that will be migrated
    batchNumbers: [Number],
    barcodeWeights: { type: Map, of: String },
    is_scanned: { type: Boolean, default: false },
    scanned_at: { type: Date },
});

const Barcode = mongoose.model("Barcode", barcodeSchema);

async function migrateWeightFields() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully\n");

        // Find all barcodes that have the old 'weight' field
        const barcodesWithOldWeight = await Barcode.find({ weight: { $exists: true } });
        console.log(`Found ${barcodesWithOldWeight.length} barcodes with old 'weight' field\n`);

        if (barcodesWithOldWeight.length === 0) {
            console.log("No migration needed. All barcodes already use new weight fields.");
            await mongoose.connection.close();
            return;
        }

        let migratedCount = 0;
        let errorCount = 0;

        console.log("Starting migration...\n");

        for (const barcode of barcodesWithOldWeight) {
            try {
                // Migrate: weight → grossWeight
                const updateData = {
                    grossWeight: barcode.weight || "",
                    coreWeight: "", // Initialize as empty, to be filled later by user
                    netWeight: "", // Initialize as empty, will be calculated when coreWeight is added
                };

                // Remove the old weight field
                await Barcode.updateOne(
                    { _id: barcode._id },
                    {
                        $set: updateData,
                        $unset: { weight: "" }
                    }
                );

                migratedCount++;
                if (migratedCount % 10 === 0) {
                    console.log(`Migrated ${migratedCount} barcodes...`);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error migrating barcode ${barcode._id}:`, error.message);
            }
        }

        console.log("\n=== Migration Complete ===");
        console.log(`Successfully migrated: ${migratedCount} barcodes`);
        console.log(`Errors: ${errorCount} barcodes`);
        console.log(`\nSummary:`);
        console.log(`- Old 'weight' field renamed to 'grossWeight'`);
        console.log(`- New 'coreWeight' field added (empty, to be filled by users)`);
        console.log(`- New 'netWeight' field added (empty, will be calculated later)`);

        await mongoose.connection.close();
        console.log("\nDatabase connection closed.");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

// Run the migration
migrateWeightFields();
