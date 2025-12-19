const router = require('express').Router();
const { access } = require('fs');
const {

    validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials,
    createCardConnectIntegrationMasterSettings,
    validateAccountExistAndActiveParams,

    editIntegrationsMasterCredentials,
    editIntegrationsMasterSettings,
    fetchFundingTransactionsForTheDay,
    createCardConnectIntegrationsAPIUrlFlow,

    manualPullDateDumpRange,
    fetchFundingTransactionsForTheDateRange,

    getIntegrationsAPIUrlFlows,
    editIntegrationsAPIUrlFlow,
    fixDefaultAPIUrlForCardConnect,


} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');



router.use(auth)

router.post('/create-card-connect-integrations-master-credentials', validateAccountExistAndActive, credentialsValidationsMiddleware, createIntegrationMasterCredentials)
router.post('/create-card-connect-integrations-master-api-url-flow', validateAccountExistAndActive, createCardConnectIntegrationsAPIUrlFlow)
router.post('/create-card-connect-integrations-master-settings', validateAccountExistAndActive, createCardConnectIntegrationMasterSettings)

router.get('/get-default-card-connect-api-urls/:accountId', validateAccountExistAndActiveParams, fixDefaultAPIUrlForCardConnect)

router.patch('/edit-card-connect-integrations-master-credentials/:accountId', validateAccountExistAndActiveParams, credentialsValidationsMiddleware,
    editIntegrationsMasterCredentials

)
router.get('/get-card-connect-integrations-api-url-flows/:accountId', validateAccountExistAndActiveParams, getIntegrationsAPIUrlFlows)
router.patch('/edit-card-connect-integrations-master-settings/:accountId', validateAccountExistAndActiveParams, editIntegrationsMasterSettings)
router.patch('/edit-card-connect-integrations-master-api-url-flows/:accountId', validateAccountExistAndActiveParams, editIntegrationsAPIUrlFlow)


router.post('/fetch-funding-data-for-the-day/:accountId', validateAccountExistAndActiveParams, fetchFundingTransactionsForTheDay)
router.get('/manual-pull-for-date-dump-range/:accountId', validateAccountExistAndActiveParams, manualPullDateDumpRange)
router.post('/fetch-funding-data-for-the-date-range/:accountId', validateAccountExistAndActiveParams, fetchFundingTransactionsForTheDateRange)



module.exports = router;
