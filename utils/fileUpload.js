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

        // Use path.resolve to ensure the directory is absolute and points to the root `isync_api_images` folder.
        //Folder outside the code directories

        const dir = path.resolve(__dirname, '../../isync_api_images'); 
      console.log("Saving to directory:", dir); // Log the directory path
        if (!fs.existsSync(dir)) {
          console.log("Directory does not exist, creating...");
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename to avoid conflicts
      console.log("Saving file:", file.originalname); // Log the file name
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
