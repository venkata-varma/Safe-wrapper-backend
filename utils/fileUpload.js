const multer=require('multer');
const path=require('path')
/**
 * 
 * 
 */
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'accountLogos/'); // 'uploads/' is the folder where files will be stored
        },
        filename: function (req, file, cb) {
            cb(null,file.originalname.replace(/\\/g, "/"))
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
  


/**
 * 
 * 
 */

/**
 * Get the static images.
 */



  module.exports={
    upload,

  }