const multer = require('multer');
const path = require('path');
const fs = require('fs');

const axios = require('axios')
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} = require("@aws-sdk/client-s3");


/**
 * Middleware Function for the "CreateAccount" controller to handle image file uploads using Multer.
 * Image details are in "req.file" and other fields are in "req.body".
 * If successful, images are stored in the "accountLogos" folder after passing validation.
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {

        // Use path.resolve to ensure the directory is absolute and points to the root `accountLogos` folder.
        const dir = path.resolve(__dirname, '../../devapps/Integration-assets'); 

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


const AWS_REGION = 'us-west-1'
const S3_BUCKET = 'dev-isync-images'
const client = new S3Client({
    region: AWS_REGION,
});
// Generate a presigned URL for file upload
async function preSignedUrlToUpload(file) {
    try {
        console.log("file:===", file);
        const fileName = `uploads/${Date.now()}-${file.originalname}`;
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: fileName,
            ContentType: file.mimetype,
        });

        const url = await getSignedUrl(client, command, { expiresIn: 3600 });
        console.log("Presigned URL:==", url);

        const uploadUrl = await uploadImageToS3bucket(url, file.buffer, file.mimetype, fileName);
        return uploadUrl;
    } catch (err) {
        console.error("Error generating presigned URL:", err.message);
        throw new Error("Failed to generate presigned URL.");
    }
}

// Upload the file to S3 using the presigned URL
const uploadImageToS3bucket = async (presignedUrl, fileBuffer, mimeType, fileName) => {
    try {
        const response = await axios.put(presignedUrl, fileBuffer, {
            headers: {
                "Content-Type": mimeType,
            },
        });

        console.log("Upload Response:", response.status);
        return `https://dev-isync-images.s3.us-west-1.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error("Error uploading file to S3:", error.message);
        throw new Error("Failed to upload file to S3.");
    }
};


module.exports = {
    upload,
    preSignedUrlToUpload,
};
