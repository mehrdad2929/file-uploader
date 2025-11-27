const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 40 * 1024 * 1024  // 40MB in bytes
    },
    fileFilter: (req, file, cb) => {
        // Optional: Restrict file types
        // const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        // if (allowedTypes.includes(file.mimetype)) {
        //     cb(null, true);
        // } else {
        //     cb(new Error('Invalid file type'));
        // }

        cb(null, true);  // Allow all file types for now
    }
});

module.exports = upload;
