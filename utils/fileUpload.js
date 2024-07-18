const multer=require('multer');
const path=require('path')

/**
 * Middlware Funtion to "CreateAccount" controller function to take image file through Multer-npm package  
 * Datails of Image are contained in "req.file"   and non-image fields are contained in "req.body"
 * If success, after passing conditions - File name condtion , images are stored in folder "accountLogos"
 */
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'accountLogos/'); // 'uploads/' is the folder where files will be stored
        },
        filename: function (req, file, cb) {
            cb(null,  file.originalname.replace(/\\/g, "/"))
        }
    }),
    // limits: {
    //     fileSize: 2000000
    // },
    fileFilter: (req, file, cb) => {
      let ext = path.extname(file.originalname);
      if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png"&& ext !== ".webp"&& ext !== ".bmp"&& ext !== ".svg"&& ext !== ".tiff"&& ext !== ".heif"&& ext !== ".raw" ) {
        cb(new Error("Only Image file types are allowed."), false);
        return;
      }
      cb(null, true);
    },
  } );
  




  module.exports={
    upload,

  }