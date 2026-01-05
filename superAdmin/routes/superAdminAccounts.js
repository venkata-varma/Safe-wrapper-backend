const router = require('express').Router();
const { access } = require('fs');
const multer = require('multer')
const accountsControllers = require('../controllers/superAdminAccountControllers');
const { superAdminAuth } = require('../middleware/superAdminAuthentication');
// const {upload}=require('../../utils/fileUpload')
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router.use(superAdminAuth)
router.post('/create-merchant-account', upload.single('logo'), accountsControllers.validateAccountRegistration, accountsControllers.createAccount)
router.post('/map-machines-to-merchant-account', accountsControllers.validationMapMachinesToAccount, accountsControllers.mapMachinesToAccount)


router.post('/upload-image', upload.single('logo'), accountsControllers.uploadImageToS3)

router.patch('/update-account-status', accountsControllers.updateAccountStatus)

router.patch('/update-account/:accountId', upload.single('logo'), accountsControllers.validateAccountForUpdate, accountsControllers.updateAccount)
router.patch('/update-linked-machines-to-account/:accountId', accountsControllers.validateAccountForUpdate, accountsControllers.validationMapMachinesToAccountUpdate, accountsControllers.updateLinkedMachinesOfAccount)



router.get('/get-all-merchant-accounts', accountsControllers.getAllMerchantAccounts)



router.get('/get-account-integration-details/:accountId', accountsControllers.validateAccountStatus, accountsControllers.getAccountIntegrationDetails)


router.get('/get-super-admin-card-connect-dashboard-statistics', accountsControllers.getSuperAdminCardConnectDashboardStats)


router.get('/get-webhook-token/:accountId', accountsControllers.validateGetWebhookToken, accountsControllers.getWebhookToken)


module.exports = router;
