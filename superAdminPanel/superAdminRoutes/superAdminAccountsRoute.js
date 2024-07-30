const router = require('express').Router();
const superAdminAccountsController=require('../superAdminControllers/superAdminAccountsController')
const {upload}=require('../../utils/fileUpload')
const {superAdminAuth}=require('../middleware/superAdminAuthentication')
router.post('/create-super-admin-account', upload.single('logo'), superAdminAccountsController.validateAccountRegistration,superAdminAccountsController.superAdminAccountRegister);



router.use(superAdminAuth)
router.get('/get-all-accounts', superAdminAccountsController.getAllAccounts)
router.get('/get-all-integrations/:accountId', superAdminAccountsController.getAllIntegrations)

router.patch('/update-account-status/:accountId',superAdminAccountsController.updateAccountStatus)
router.patch('/update-account-settings/:accountId', superAdminAccountsController.updateAccountSettings)
module.exports=router