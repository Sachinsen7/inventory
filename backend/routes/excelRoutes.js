const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const logger = require("../utils/logger");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage config with file type validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// File filter: only allow Excel files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  const allowedExtensions = [".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    !allowedMimes.includes(file.mimetype) ||
    !allowedExtensions.includes(ext)
  ) {
    logger.warn("Invalid file upload attempt", {
      filename: file.originalname,
      mimetype: file.mimetype,
    });
    return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
  }
  cb(null, true);
};

// Multer with size limit (10MB) and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Upload route
router.post(
  "/upload-excel",
  upload.single("excelFile"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    logger.info("File uploaded successfully", {
      filename: req.file.filename,
      size: req.file.size,
    });
    res.json({
      message: "File uploaded successfully",
      file: {
        name: req.file.filename,
        size: req.file.size,
        uploadDate: new Date(),
      },
    });
  },
  (err, req, res, next) => {
    // Multer error handler
    if (err instanceof multer.MulterError) {
      if (err.code === "FILE_TOO_LARGE") {
        return res.status(400).json({ message: "File too large. Max 10MB." });
      }
      logger.error("Multer error during upload", err);
      return res.status(400).json({ message: "File upload error" });
    } else if (err) {
      logger.error("Upload error", err);
      return res
        .status(400)
        .json({ message: "Invalid file type. Only Excel files allowed." });
    }
  }
);

// List all uploaded Excel files
router.get("/excel-files", (req, res) => {
  try {
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        logger.error("Error reading upload directory", err);
        return res.status(500).json({ message: "Unable to read files" });
      }
      // File details with name, size, and upload date
      const fileDetails = files
        .map((file) => {
          const filePath = path.join(uploadDir, file);
          // Prevent path traversal
          if (!filePath.startsWith(uploadDir)) {
            logger.warn("Path traversal attempt detected", { file });
            return null;
          }
          try {
            const stats = fs.statSync(filePath);
            return {
              _id: file, // using filename as id
              originalName: file.split("-").slice(1).join("-"), // remove timestamp
              size: stats.size,
              uploadDate: stats.birthtime,
            };
          } catch (err) {
            logger.error("Error reading file stats", { file, err });
            return null;
          }
        })
        .filter((f) => f !== null);
      res.json(fileDetails);
    });
  } catch (err) {
    logger.error("Error listing excel files", err);
    res.status(500).json({ message: "Unable to list files" });
  }
});

// Download Excel file
router.get("/download-excel/:fileId", (req, res) => {
  try {
    const fileName = req.params.fileId;
    // Prevent path traversal: reject any path with .. or leading slashes
    if (
      fileName.includes("..") ||
      fileName.startsWith("/") ||
      fileName.startsWith("\\")
    ) {
      logger.warn("Path traversal attempt in download", { fileName });
      return res.status(400).json({ message: "Invalid file path" });
    }
    const filePath = path.join(uploadDir, fileName);
    // Verify resolved path is still within uploadDir
    if (!filePath.startsWith(uploadDir)) {
      logger.warn("Path traversal blocked on download", { fileName, filePath });
      return res.status(400).json({ message: "Invalid file path" });
    }
    if (fs.existsSync(filePath)) {
      res.download(filePath, fileName.split("-").slice(1).join("-"));
    } else {
      res.status(404).json({ message: "File not found" });
    }
  } catch (err) {
    logger.error("Error downloading file", err);
    res.status(500).json({ message: "Error downloading file" });
  }
});

// Delete Excel file
router.delete("/delete-excel/:fileId", (req, res) => {
  try {
    const fileName = req.params.fileId;
    // Prevent path traversal: reject any path with .. or leading slashes
    if (
      fileName.includes("..") ||
      fileName.startsWith("/") ||
      fileName.startsWith("\\")
    ) {
      logger.warn("Path traversal attempt in delete", { fileName });
      return res.status(400).json({ message: "Invalid file path" });
    }
    const filePath = path.join(uploadDir, fileName);
    // Verify resolved path is still within uploadDir
    if (!filePath.startsWith(uploadDir)) {
      logger.warn("Path traversal blocked on delete", { fileName, filePath });
      return res.status(400).json({ message: "Invalid file path" });
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info("File deleted successfully", { fileName });
      res.json({ message: "File deleted successfully" });
    } else {
      res.status(404).json({ message: "File not found" });
    }
  } catch (err) {
    logger.error("Error deleting file", err);
    res.status(500).json({ message: "Error deleting file" });
  }
});

// Get latest Excel file for frontend
router.get("/latest-excel-file", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Unable to read files" });
    }
    // Filter for Excel files
    const excelFiles = files.filter(
      (file) =>
        file.toLowerCase().endsWith(".xlsx") ||
        file.toLowerCase().endsWith(".xls")
    );
    if (excelFiles.length === 0) {
      return res.status(404).json({ message: "No Excel files found" });
    }
    // Get the most recent file (by timestamp in filename)
    const latestFile = excelFiles.sort().pop();
    const filePath = path.join(uploadDir, latestFile);
    if (fs.existsSync(filePath)) {
      res.download(filePath, latestFile.split("-").slice(1).join("-"));
    } else {
      res.status(404).json({ message: "Latest file not found" });
    }
  });
});

// Download Excel template for inventory
router.get("/download-inventory-template", (req, res) => {
  try {
    const XLSX = require("xlsx");

    // Sample data structure for inventory
    const templateData = [
      {
        itemName: "Sample Item 1",
        quantity: 100,
        price: 50.0,
        masterPrice: 45.0,
        description: "Description of item",
        category: "Electronics",
        minStockLevel: 10,
      },
      {
        itemName: "Sample Item 2",
        quantity: 50,
        price: 75.5,
        masterPrice: 70.0,
        description: "Another item description",
        category: "Hardware",
        minStockLevel: 5,
      },
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws["!cols"] = [
      { wch: 20 }, // itemName
      { wch: 10 }, // quantity
      { wch: 10 }, // price
      { wch: 12 }, // masterPrice
      { wch: 30 }, // description
      { wch: 15 }, // category
      { wch: 15 }, // minStockLevel
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory_template.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    logger.info("Inventory template downloaded");
    res.send(buf);
  } catch (err) {
    logger.error("Error generating inventory template", err);
    res.status(500).json({ message: "Error generating template" });
  }
});

// Download Excel template for billing items
router.get("/download-billing-template", (req, res) => {
  try {
    logger.info("Generating billing items template");

    // Sample data structure for billing items
    const templateData = [
      {
        itemName: "Product A",
        barcodeNumber: "123456789012",
        skuName: "SKU-A",
        skuCode: "SKU001",
      },
      {
        itemName: "Product B",
        barcodeNumber: "234567890123",
        skuName: "SKU-B",
        skuCode: "SKU002",
      },
      {
        itemName: "Product C",
        barcodeNumber: "345678901234",
        skuName: "SKU-C",
        skuCode: "SKU003",
      },
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // itemName
      { wch: 20 }, // barcodeNumber
      { wch: 25 }, // skuName
      { wch: 15 }, // skuCode
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billing Items");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=billing_items_template.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    logger.info("Billing items template downloaded");
    res.send(buf);
  } catch (err) {
    logger.error("Error generating billing template", err);
    res.status(500).json({ message: "Error generating template" });
  }
});

// Download Excel template for products (All Fields)
router.get("/download-products-template", (req, res) => {
  try {
    logger.info("Generating products template with all fields");

    // Sample data structure for products with ALL fields
    const templateData = [
      {
        "Product Name": "Sample Product 1",
        "SKU Code No": "SKU001",
        "SKU Name": "Sample SKU Name 1",
        "Packed By": "John Doe",
        "Batch No": "100",
        "Shift": "Day",
        "Rewinder Operator": "Operator A",
        "Edge Cut Operator": "Operator B",
        "Winder Operator": "Operator C",
        "Mixer Operator": "Operator D",
      },
      {
        "Product Name": "Sample Product 2",
        "SKU Code No": "SKU002",
        "SKU Name": "Sample SKU Name 2",
        "Packed By": "Jane Smith",
        "Batch No": "101",
        "Shift": "Night",
        "Rewinder Operator": "Operator E",
        "Edge Cut Operator": "Operator F",
        "Winder Operator": "Operator G",
        "Mixer Operator": "Operator H",
      },
      {
        "Product Name": "Sample Product 3",
        "SKU Code No": "SKU003",
        "SKU Name": "Sample SKU Name 3",
        "Packed By": "Bob Johnson",
        "Batch No": "102",
        "Shift": "Day",
        "Rewinder Operator": "Operator I",
        "Edge Cut Operator": "Operator J",
        "Winder Operator": "Operator K",
        "Mixer Operator": "Operator L",
      },
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Product Name
      { wch: 15 }, // SKU Code No
      { wch: 25 }, // SKU Name
      { wch: 20 }, // Packed By
      { wch: 12 }, // Batch No
      { wch: 12 }, // Shift
      { wch: 20 }, // Rewinder Operator
      { wch: 20 }, // Edge Cut Operator
      { wch: 20 }, // Winder Operator
      { wch: 20 }, // Mixer Operator
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=products_template.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    logger.info("Products template downloaded");
    res.send(buf);
  } catch (err) {
    logger.error("Error generating products template", err);
    res.status(500).json({ message: "Error generating template" });
  }
});

module.exports = router;
