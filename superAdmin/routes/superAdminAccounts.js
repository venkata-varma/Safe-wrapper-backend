const router = require('express').Router();
const { access } = require('fs');
const multer = require('multer')
const accountsControllers = require('../controllers/superAdminAccountControllers');
const { superAdminAuth } = require('../middleware/superAdminAuthentication');
// const {upload}=require('../../utils/fileUpload')
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



router.post('/create-merchant-account', upload.single('logo'), accountsControllers.validateAccountRegistration, accountsControllers.createAccount)
router.post('/map-machines-to-account', accountsControllers.validationMapMachinesToAccount, accountsControllers.mapMachinesToAccount)


router.post('/upload-image', upload.single('logo'), accountsControllers.uploadImageToS3)
router.use(superAdminAuth)
router.patch('/update-account-status', accountsControllers.updateAccountStatus)
router.patch('/update-account/:accountId', upload.single('logo'), accountsControllers.validateAccountForUpdate, accountsControllers.updateAccount)

router.get('/get-all-merchant-accounts', accountsControllers.getAllMerchantAccounts)

module.exports = router;
