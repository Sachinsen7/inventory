const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage config with file type validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// File filter: only allow Excel files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  const allowedExtensions = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    logger.warn('Invalid file upload attempt', { filename: file.originalname, mimetype: file.mimetype });
    return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
  cb(null, true);
};

// Multer with size limit (10MB) and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Upload route
router.post('/upload-excel', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  logger.info('File uploaded successfully', { filename: req.file.filename, size: req.file.size });
  res.json({ message: 'File uploaded successfully', file: { name: req.file.filename, size: req.file.size, uploadDate: new Date() } });
}, (err, req, res, next) => {
  // Multer error handler
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ message: 'File too large. Max 10MB.' });
    }
    logger.error('Multer error during upload', err);
    return res.status(400).json({ message: 'File upload error' });
  } else if (err) {
    logger.error('Upload error', err);
    return res.status(400).json({ message: 'Invalid file type. Only Excel files allowed.' });
  }
});

// List all uploaded Excel files
router.get('/excel-files', (req, res) => {
  try {
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        logger.error('Error reading upload directory', err);
        return res.status(500).json({ message: 'Unable to read files' });
      }
      // File details with name, size, and upload date
      const fileDetails = files.map(file => {
        const filePath = path.join(uploadDir, file);
        // Prevent path traversal
        if (!filePath.startsWith(uploadDir)) {
          logger.warn('Path traversal attempt detected', { file });
          return null;
        }
        try {
          const stats = fs.statSync(filePath);
          return {
            _id: file, // using filename as id
            originalName: file.split('-').slice(1).join('-'), // remove timestamp
            size: stats.size,
            uploadDate: stats.birthtime
          };
        } catch (err) {
          logger.error('Error reading file stats', { file, err });
          return null;
        }
      }).filter(f => f !== null);
      res.json(fileDetails);
    });
  } catch (err) {
    logger.error('Error listing excel files', err);
    res.status(500).json({ message: 'Unable to list files' });
  }
});

// Download Excel file
router.get('/download-excel/:fileId', (req, res) => {
  try {
    const fileName = req.params.fileId;
    // Prevent path traversal: reject any path with .. or leading slashes
    if (fileName.includes('..') || fileName.startsWith('/') || fileName.startsWith('\\')) {
      logger.warn('Path traversal attempt in download', { fileName });
      return res.status(400).json({ message: 'Invalid file path' });
    }
    const filePath = path.join(uploadDir, fileName);
    // Verify resolved path is still within uploadDir
    if (!filePath.startsWith(uploadDir)) {
      logger.warn('Path traversal blocked on download', { fileName, filePath });
      return res.status(400).json({ message: 'Invalid file path' });
    }
    if (fs.existsSync(filePath)) {
      res.download(filePath, fileName.split('-').slice(1).join('-'));
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (err) {
    logger.error('Error downloading file', err);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

// Delete Excel file
router.delete('/delete-excel/:fileId', (req, res) => {
  try {
    const fileName = req.params.fileId;
    // Prevent path traversal: reject any path with .. or leading slashes
    if (fileName.includes('..') || fileName.startsWith('/') || fileName.startsWith('\\')) {
      logger.warn('Path traversal attempt in delete', { fileName });
      return res.status(400).json({ message: 'Invalid file path' });
    }
    const filePath = path.join(uploadDir, fileName);
    // Verify resolved path is still within uploadDir
    if (!filePath.startsWith(uploadDir)) {
      logger.warn('Path traversal blocked on delete', { fileName, filePath });
      return res.status(400).json({ message: 'Invalid file path' });
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('File deleted successfully', { fileName });
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (err) {
    logger.error('Error deleting file', err);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// Get latest Excel file for frontend
router.get('/latest-excel-file', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Unable to read files' });
    }
    // Filter for Excel files
    const excelFiles = files.filter(file =>
      file.toLowerCase().endsWith('.xlsx') ||
      file.toLowerCase().endsWith('.xls')
    );
    if (excelFiles.length === 0) {
      return res.status(404).json({ message: 'No Excel files found' });
    }
    // Get the most recent file (by timestamp in filename)
    const latestFile = excelFiles.sort().pop();
    const filePath = path.join(uploadDir, latestFile);
    if (fs.existsSync(filePath)) {
      res.download(filePath, latestFile.split('-').slice(1).join('-'));
    } else {
      res.status(404).json({ message: 'Latest file not found' });
    }
  });
});

module.exports = router;