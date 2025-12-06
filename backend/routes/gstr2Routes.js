const express = require('express');
const router = express.Router();
const GSTR2Entry = require('../models/GSTR2Entry');
const PurchaseBill = require('../models/PurchaseBill');
const Supplier = require('../models/Supplier');
const multer = require('multer');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Upload and parse GSTR-2A/2B JSON
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Read and parse JSON file
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const gstrData = JSON.parse(fileContent);

        const { period, uploadedBy } = req.body;

        const results = {
            total: 0,
            inserted: 0,
            errors: []
        };

        // Parse B2B invoices (most common)
        if (gstrData.b2b) {
            for (const supplierData of gstrData.b2b) {
                const supplierGSTIN = supplierData.ctin;
                const supplierName = supplierData.trdnm || '';

                for (const invoice of supplierData.inv) {
                    try {
                        results.total++;

                        const invoiceDate = parseGSTRDate(invoice.dt);
                        const invoiceNumber = invoice.inum;
                        const invoiceValue = parseFloat(invoice.val) || 0;

                        // Calculate tax amounts
                        let cgst = 0, sgst = 0, igst = 0, cess = 0, taxableValue = 0;

                        if (invoice.itms) {
                            for (const item of invoice.itms) {
                                if (item.itm_det) {
                                    taxableValue += parseFloat(item.itm_det.txval) || 0;
                                    cgst += parseFloat(item.itm_det.camt) || 0;
                                    sgst += parseFloat(item.itm_det.samt) || 0;
                                    igst += parseFloat(item.itm_det.iamt) || 0;
                                    cess += parseFloat(item.itm_det.csamt) || 0;
                                }
                            }
                        }

                        const totalTax = cgst + sgst + igst + cess;
                        const itcAvailable = parseFloat(invoice.itc?.tx_i) || 0;

                        // Create GSTR2 entry
                        await GSTR2Entry.create({
                            uploadDate: new Date(),
                            uploadedBy: uploadedBy || 'system',
                            fileName: req.file.originalname,
                            period: period || '',
                            supplierGSTIN,
                            supplierName,
                            invoiceNumber,
                            invoiceDate,
                            invoiceType: 'B2B',
                            taxableValue,
                            cgst,
                            sgst,
                            igst,
                            cess,
                            totalTax,
                            invoiceValue,
                            itcAvailable,
                            rawData: invoice
                        });

                        results.inserted++;
                    } catch (err) {
                        results.errors.push(`Error processing invoice ${invoice.inum}: ${err.message}`);
                    }
                }
            }
        }

        // Parse CDNR (Credit/Debit Notes)
        if (gstrData.cdnr) {
            for (const supplierData of gstrData.cdnr) {
                const supplierGSTIN = supplierData.ctin;
                const supplierName = supplierData.trdnm || '';

                for (const note of supplierData.nt) {
                    try {
                        results.total++;

                        const invoiceDate = parseGSTRDate(note.dt);
                        const invoiceNumber = note.ntnum;
                        const invoiceValue = parseFloat(note.val) || 0;

                        let cgst = 0, sgst = 0, igst = 0, cess = 0, taxableValue = 0;

                        if (note.itms) {
                            for (const item of note.itms) {
                                if (item.itm_det) {
                                    taxableValue += parseFloat(item.itm_det.txval) || 0;
                                    cgst += parseFloat(item.itm_det.camt) || 0;
                                    sgst += parseFloat(item.itm_det.samt) || 0;
                                    igst += parseFloat(item.itm_det.iamt) || 0;
                                    cess += parseFloat(item.itm_det.csamt) || 0;
                                }
                            }
                        }

                        const totalTax = cgst + sgst + igst + cess;

                        await GSTR2Entry.create({
                            uploadDate: new Date(),
                            uploadedBy: uploadedBy || 'system',
                            fileName: req.file.originalname,
                            period: period || '',
                            supplierGSTIN,
                            supplierName,
                            invoiceNumber,
                            invoiceDate,
                            invoiceType: note.ntty === 'C' ? 'Credit Note' : 'Debit Note',
                            taxableValue,
                            cgst,
                            sgst,
                            igst,
                            cess,
                            totalTax,
                            invoiceValue,
                            rawData: note
                        });

                        results.inserted++;
                    } catch (err) {
                        results.errors.push(`Error processing note ${note.ntnum}: ${err.message}`);
                    }
                }
            }
        }

        // Delete uploaded file
        fs.unlinkSync(req.file.path);

        // Trigger auto-matching
        await matchGSTR2WithBooks();

        res.json({
            message: 'GSTR-2A/2B data uploaded successfully',
            ...results
        });
    } catch (error) {
        console.error('Error uploading GSTR-2:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error uploading GSTR-2', error: error.message });
    }
});

// Match GSTR-2 entries with purchase bills
router.post('/match', async (req, res) => {
    try {
        const results = await matchGSTR2WithBooks();
        res.json(results);
    } catch (error) {
        console.error('Error matching GSTR-2:', error);
        res.status(500).json({ message: 'Error matching GSTR-2', error: error.message });
    }
});

// Get GSTR-2 summary
router.get('/summary', async (req, res) => {
    try {
        const { period } = req.query;

        const query = period ? { period } : {};

        const totalEntries = await GSTR2Entry.countDocuments(query);
        const matched = await GSTR2Entry.countDocuments({ ...query, matchStatus: 'matched' });
        const mismatched = await GSTR2Entry.countDocuments({ ...query, matchStatus: 'mismatched' });
        const missingInBooks = await GSTR2Entry.countDocuments({ ...query, matchStatus: 'missing_in_books' });
        const pending = await GSTR2Entry.countDocuments({ ...query, matchStatus: 'pending' });

        // Calculate ITC summary
        const gstr2Entries = await GSTR2Entry.find(query);
        const itcSummary = {
            totalITC: 0,
            eligibleITC: 0,
            matchedITC: 0,
            mismatchedITC: 0
        };

        for (const entry of gstr2Entries) {
            itcSummary.totalITC += entry.itcAvailable || 0;

            if (entry.matchStatus === 'matched') {
                itcSummary.matchedITC += entry.itcAvailable || 0;
                itcSummary.eligibleITC += entry.itcAvailable || 0;
            } else if (entry.matchStatus === 'mismatched') {
                itcSummary.mismatchedITC += entry.itcAvailable || 0;
            }
        }

        // Supplier-wise breakdown
        const supplierBreakdown = await GSTR2Entry.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$supplierGSTIN',
                    supplierName: { $first: '$supplierName' },
                    totalInvoices: { $sum: 1 },
                    totalValue: { $sum: '$invoiceValue' },
                    totalITC: { $sum: '$itcAvailable' },
                    matched: {
                        $sum: { $cond: [{ $eq: ['$matchStatus', 'matched'] }, 1, 0] }
                    },
                    mismatched: {
                        $sum: { $cond: [{ $eq: ['$matchStatus', 'mismatched'] }, 1, 0] }
                    }
                }
            },
            { $sort: { totalValue: -1 } }
        ]);

        res.json({
            summary: {
                totalEntries,
                matched,
                mismatched,
                missingInBooks,
                pending
            },
            itcSummary,
            supplierBreakdown
        });
    } catch (error) {
        console.error('Error fetching GSTR-2 summary:', error);
        res.status(500).json({ message: 'Error fetching GSTR-2 summary', error: error.message });
    }
});

// Get detailed GSTR-2 entries
router.get('/entries', async (req, res) => {
    try {
        const { period, matchStatus, supplierGSTIN } = req.query;

        const query = {};
        if (period) query.period = period;
        if (matchStatus) query.matchStatus = matchStatus;
        if (supplierGSTIN) query.supplierGSTIN = supplierGSTIN;

        const entries = await GSTR2Entry.find(query)
            .populate('matchedPurchaseBillId')
            .sort({ invoiceDate: -1 });

        res.json(entries);
    } catch (error) {
        console.error('Error fetching GSTR-2 entries:', error);
        res.status(500).json({ message: 'Error fetching GSTR-2 entries', error: error.message });
    }
});

// Get missing in books
router.get('/missing-in-books', async (req, res) => {
    try {
        const { period } = req.query;
        const query = { matchStatus: 'missing_in_books' };
        if (period) query.period = period;

        const entries = await GSTR2Entry.find(query).sort({ invoiceDate: -1 });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching missing entries:', error);
        res.status(500).json({ message: 'Error fetching missing entries', error: error.message });
    }
});

// Get missing in GSTR-2
router.get('/missing-in-gstr2', async (req, res) => {
    try {
        const { period } = req.query;

        // Find purchase bills that are not matched with GSTR-2
        const purchaseBills = await PurchaseBill.find({
            gstr2Status: { $in: ['missing_in_gstr2', 'pending'] }
        }).populate('supplierId');

        res.json(purchaseBills);
    } catch (error) {
        console.error('Error fetching missing in GSTR-2:', error);
        res.status(500).json({ message: 'Error fetching missing in GSTR-2', error: error.message });
    }
});

// Helper function to parse GSTR date format (DD-MM-YYYY)
function parseGSTRDate(dateStr) {
    if (!dateStr) return new Date();
    const [day, month, year] = dateStr.split('-');
    return new Date(`${year}-${month}-${day}`);
}

// Helper function to match GSTR-2 with books
async function matchGSTR2WithBooks() {
    const gstr2Entries = await GSTR2Entry.find({ matchStatus: 'pending' });

    const results = {
        matched: 0,
        mismatched: 0,
        missingInBooks: 0
    };

    for (const entry of gstr2Entries) {
        // Try to find matching purchase bill
        const purchaseBill = await PurchaseBill.findOne({
            supplierGSTIN: entry.supplierGSTIN,
            invoiceNumber: entry.invoiceNumber,
            invoiceDate: {
                $gte: new Date(entry.invoiceDate.getTime() - 2 * 24 * 60 * 60 * 1000), // -2 days
                $lte: new Date(entry.invoiceDate.getTime() + 2 * 24 * 60 * 60 * 1000)  // +2 days
            }
        });

        if (purchaseBill) {
            // Check if amounts match
            const amountDiff = Math.abs(purchaseBill.totalAmount - entry.invoiceValue);
            const taxDiff = Math.abs(
                (purchaseBill.cgst + purchaseBill.sgst + purchaseBill.igst) -
                (entry.cgst + entry.sgst + entry.igst)
            );

            if (amountDiff < 1 && taxDiff < 1) {
                // Perfect match
                entry.matchStatus = 'matched';
                entry.matchedPurchaseBillId = purchaseBill._id;
                entry.matchDate = new Date();

                purchaseBill.matchedWithGSTR2 = true;
                purchaseBill.gstr2Status = 'matched';
                purchaseBill.gstr2MatchDate = new Date();

                await purchaseBill.save();
                results.matched++;
            } else {
                // Mismatched
                entry.matchStatus = 'mismatched';
                entry.matchedPurchaseBillId = purchaseBill._id;
                entry.matchDate = new Date();
                entry.mismatches = [];

                if (amountDiff >= 1) {
                    entry.mismatches.push({
                        field: 'totalAmount',
                        gstr2Value: entry.invoiceValue,
                        bookValue: purchaseBill.totalAmount,
                        difference: amountDiff
                    });
                }

                if (taxDiff >= 1) {
                    entry.mismatches.push({
                        field: 'tax',
                        gstr2Value: entry.cgst + entry.sgst + entry.igst,
                        bookValue: purchaseBill.cgst + purchaseBill.sgst + purchaseBill.igst,
                        difference: taxDiff
                    });
                }

                purchaseBill.matchedWithGSTR2 = true;
                purchaseBill.gstr2Status = 'mismatched';
                purchaseBill.gstr2MatchDate = new Date();
                purchaseBill.gstr2Differences = entry.mismatches;

                await purchaseBill.save();
                results.mismatched++;
            }
        } else {
            // Not found in books
            entry.matchStatus = 'missing_in_books';
            results.missingInBooks++;
        }

        await entry.save();
    }

    return results;
}

module.exports = router;
