let productMgmtController=require('../controllers/productsMgmt')
const router = require('express').Router();
let uploadImagesForColourVariants=require('../middleware/multerMiddlewareForColorVariants')
const { superAdminAuth } = require('../middleware/superAdminAuthentication');

router.use(superAdminAuth)
router.post('/add-first-entry-of-product', productMgmtController.addProductFirstEntry)
router.patch('/colour-variant/:productId' ,uploadImagesForColourVariants.single("csImage"),  productMgmtController.addImagesToProductWithColourVariants)

router.patch('/upload-general-images-non-cv/:productId',uploadImagesForColourVariants.array("productImgs",5) , productMgmtController.addNonCVImages)

module.exports=router