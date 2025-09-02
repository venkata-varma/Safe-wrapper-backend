const router = require('express').Router();
const { access } = require('fs');
const {

    validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials,
    createCardConnectIntegrationMasterSettings,

    editCardConnectIntegrationsMaster,
    editIntegrationsMasterCredentials,
    editIntegrationsMasterSettings,
    fetchFundingTransactionsForTheDay,
    createCardConnectIntegrationsAPIUrlFlow,

    manualPullDateDumpRange,
    fetchFundingTransactionsForTheDateRange,
    
    getIntegrationsAPIUrlFlows,
    editIntegrationsAPIUrlFlow

} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');



router.use(auth)

router.post('/create-card-connect-integrations-master-credentials', validateAccountExistAndActive, credentialsValidationsMiddleware, createIntegrationMasterCredentials)
router.post('/create-card-connect-integrations-master-api-url-flow', validateAccountExistAndActive, createCardConnectIntegrationsAPIUrlFlow)
router.post('/create-card-connect-integrations-master-settings', validateAccountExistAndActive, createCardConnectIntegrationMasterSettings)

router.patch('/edit-card-connect-integrations-master/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, editCardConnectIntegrationsMaster)
router.patch('/edit-card-connect-integrations-master-credentials/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, credentialsValidationsMiddleware,
    editIntegrationsMasterCredentials

)
router.get('/get-card-connect-integrations-api-url-flows/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, getIntegrationsAPIUrlFlows)
router.patch('/edit-card-connect-integrations-master-settings/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, editIntegrationsMasterSettings)
router.patch('/edit-card-connect-integrations-master-api-url-flows/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, editIntegrationsAPIUrlFlow)


router.post('/fetch-funding-data-for-the-day/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, fetchFundingTransactionsForTheDay)
router.get('/manual-pull-for-date-dump-range/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, manualPullDateDumpRange)
router.post('/fetch-funding-data-for-the-date-range/:cardConnectIntegrationsMasterId', validateAccountExistAndActive, fetchFundingTransactionsForTheDateRange)



module.exports = router;
