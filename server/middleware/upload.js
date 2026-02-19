const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const csvDir = path.join(uploadsDir, 'csv');
const attachmentsDir = path.join(uploadsDir, 'attachments');

[uploadsDir, csvDir, attachmentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// CSV import storage
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, csvDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Attachment storage
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const leadDir = path.join(attachmentsDir, req.params.id || 'misc');
    if (!fs.existsSync(leadDir)) fs.mkdirSync(leadDir, { recursive: true });
    cb(null, leadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

// File filter for CSV/Excel
const csvFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel files are allowed'), false);
  }
};

// File filter for attachments (docs, images, PDFs)
const attachmentFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.gif', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

exports.uploadCsv = multer({
  storage: csvStorage,
  fileFilter: csvFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('file');

exports.uploadAttachment = multer({
  storage: attachmentStorage,
  fileFilter: attachmentFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
}).single('file');
