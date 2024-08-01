const router = require('express').Router();
const { access } = require('fs');
const accountsControllers = require('../controllers/accountsController');
const auth = require('../../middleware/authentication');
const {upload}=require('../../utils/fileUpload')


router.post('/create-account',upload.single('logo'), accountsControllers.validateAccountRegistration, accountsControllers.createAccount)
router.use(auth)
router.patch('/delete-account/:accountId', accountsControllers.deleteAccount)


router.get('/get-account-integrations-information/:accountId', accountsControllers.validateAccountStatus, accountsControllers.getAccountIntegrationsInformation);
router.get('/get-account-integrations-reports/:accountId', accountsControllers.validateAccountStatus, accountsControllers.getAccountIntegrationsReports )
router.get('/get-work-order-life-cycle', accountsControllers.ValidateAccountAndIntegrationsStatus, accountsControllers.getWorkOrderLifeCycle)

module.exports = router;
