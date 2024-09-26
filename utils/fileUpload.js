const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Middleware Function for the "CreateAccount" controller to handle image file uploads using Multer.
 * Image details are in "req.file" and other fields are in "req.body".
 * If successful, images are stored in the "accountLogos" folder after passing validation.
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'accountLogos/';
        // Create the directory if it does not exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename to avoid overwriting files with the same name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    // limits: {
    //     fileSize: 2000000 // Uncomment to set file size limit (in bytes)
    // },
    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLowerCase();
        // Allow only specific image file extensions
        if (![".jpg", ".jpeg", ".png", ".webp", ".bmp", ".svg", ".tiff", ".heif", ".raw"].includes(ext)) {
            cb(new Error("Only image file types are allowed."), false);
        } else {
            cb(null, true);
        }
    },
});

module.exports = {
    upload,
};
