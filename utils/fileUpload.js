const multer=require('multer');
const path=require('path')
/**
 * 
 * 
 */
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/'); // 'uploads/' is the folder where files will be stored
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname).replace(/\\/g, "/"))
        }
    }),
    limits: {
        fileSize: 2000000
    },
    fileFilter: (req, file, cb) => {
      let ext = path.extname(file.originalname);
      if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
        cb(new Error("Only jpg, jpeg, png"), false);
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

const getImageUrl =async (fileName) => {
    console.log('filename', fileName)
    // Constructing the URL based on the request object
    const baseUrl = req.protocol + '://' + req.get('host');
    // const imageUrls = [
    //   {
    //     name: "TT",
    //     url: baseUrl + '/static/TurboTax_logo.png'
    //   },
    //   {
    //     name: "AM",
    //     url: baseUrl + '/static/Acumatica_logo.png'
    //   },
    //   {
    //     name: "CPD",
    //     url: baseUrl + '/static/CorrigoPro_logo.png'
    //   },
    //   {
    //     name: "DF",
    //     url: baseUrl + '/static/Dataforma_logo.png'
    //   },
    //   {
    //     name: "QB",
    //     url: baseUrl + '/static/Quickbooks_logo.png'
    //   },
    //   {
    //     name: "SC",
    //     url: baseUrl + '/static/ServiceChannel_logo.png'
    //   },
    //   {
    //     name: "SNOW",
    //     url: baseUrl + '/static/servicenow_logo.png'
    //   },
    //   {
    //     name: "MDS",
    //     url: baseUrl + '/static/MDS_logo2.png'
    //   }
    // ]
  let imageUrl=baseUrl + `/static/${fileName}`
    if (!baseUrl || !imageUrl) {
      return res.status(500).json({ error: "Unable to construct image URL" });
    }
  return imageUrl;
    
  }
  

  module.exports={
    upload,
    getImageUrl
  }