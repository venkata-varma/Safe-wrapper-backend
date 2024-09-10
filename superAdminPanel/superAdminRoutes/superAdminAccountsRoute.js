const router = require('express').Router();
const superAdminAccountsController=require('../superAdminControllers/superAdminAccountsController')
const {upload}=require('../../utils/fileUpload')
const integrationsMasterController=require('../../customer/controllers/integrationsMasterController')
const {superAdminAuth}=require('../middleware/superAdminAuthentication')


router.post('/create-super-admin-account', upload.single('logo'), superAdminAccountsController.validateAccountRegistration,superAdminAccountsController.superAdminAccountRegister);



router.use(superAdminAuth)
router.get('/get-all-accounts', superAdminAccountsController.getAllAccounts)
router.get('/get-all-integrations/:accountId', superAdminAccountsController.getAllIntegrations)
router.get('/get-account-settings/:accountId', superAdminAccountsController.getAccountSettings)
router.get('/get_all_service_providers_lists', superAdminAccountsController.getAllServiceProvidersList)
router.get('/get-integration-buildings-details',superAdminAccountsController.getIntegrationBuildingDetails)


router.patch('/update-account-status/:accountId',superAdminAccountsController.updateAccountStatus)
router.patch('/update-account-settings/:accountId', superAdminAccountsController.updateAccountSettings)
router.patch('/update-service-provider/:serviceProviderListId',superAdminAccountsController.serviceProviderListCredentialsValidation, superAdminAccountsController.updateServiceProviderList )
router.patch('/delete-service-provider-list/:serviceProviderListId',superAdminAccountsController.deleteServiceProviderList)
router.get('/get-activity-logs/:accountId', superAdminAccountsController.validationForGetActivityLogs, superAdminAccountsController.getActivityLogs)
module.exports=router