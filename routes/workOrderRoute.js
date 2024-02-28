const router = require('express').Router();
const { access } = require('fs');
const workOrderControllers = require('../controllers/workOrderControllers');
const auth = require('../middleware/authentication');

// {
//     "client_id":"30C1957F67CA191FBBB4B476B6907A2C",
//     "client_secret":"BBA9496EDC672FB945C87A1A77B1F6E98E989447CE60CFB86ED053CC7C1A06D3CDDEA6E5471EE3C892DB3A9F50FEA709BECAE71EFC335E5ADA90000C14623D2A",
//     "grant_type":"client_credentials"
// }

router.post('/user-registration',workOrderControllers.validateuserRegistration,workOrderControllers.createUser)
router.post('/user-login',workOrderControllers.validateuser)

router.use(auth)
router.post('/config-settings',workOrderControllers.configSettings)
router.post('/config-integration',workOrderControllers.configIntegration)

router.get('/get-global-constants',workOrderControllers.globalConstants)
router.post('/workOrderDetails/:ids/:messageId',workOrderControllers.workOrderDetails);
router.post('/getInvoice', workOrderControllers.invoiceDetails);
router.get('/get-latest-pull-updates/:registrationId',workOrderControllers.pullLatestWorkOrders);
router.get('/get-latest-cronjobs/:registrationId',workOrderControllers.getLatestCronJobs);
router.get('/get-statastics/:registrationId',workOrderControllers.getStatastics);
router.get('/get-cron-jobs/:registrationId/:cronJobId',workOrderControllers.getCronJobsWorkOrders);
router.post('/integrations',workOrderControllers.integrations);
router.get('/get-single-integration/:integrationId',workOrderControllers.getsingleInegration);
router.get('/get-latest-workOrders/:integrationId/:registrationId',workOrderControllers.latestWorkOrders);
router.get('/get-workorders-by-registrationId/:registrationId',workOrderControllers.getAWorkOrdersByRegistrationId);
router.get('/get-invoices-by-registrationId/:registrationId',workOrderControllers.getInvoicesByRegistraionId)
router.patch('/delete-integration/:integrationId',workOrderControllers.deleteIntegration);
router.patch('/edit-integration-by-integrationId/:integrationId',workOrderControllers.editIntegration);
router.patch('/edit-congurations-by-integrationId/:integrationId/:configurationId',workOrderControllers.editConfigurationByIntegrationId);
router.patch('/edit-settings-by-integrationId/:integrationId',workOrderControllers.editSettingsByIntegrationId);

module.exports = router;
