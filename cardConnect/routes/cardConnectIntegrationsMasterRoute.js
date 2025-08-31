const router = require('express').Router();
const { access } = require('fs');
const {
    validatecreateCardConnectIntegrationsMaster,
    createCardConnectIntegrationsMaster,
    validateintegrationsMasterExist,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials,
    updateIntegrationMasterSettings,
    validateintegrationsMasterExistAndActive,
    editCardConnectIntegrationsMaster,
    editIntegrationsMasterCredentials,
    editIntegrationsMasterSettings,
    fetchFundingTransactionsForTheDay,
    createCardConnectIntegrationsAPIUrlFlow,
    validateintegrationsMasterExistenceParams,
    manualPullDateDumpRange,
    fetchFundingTransactionsForTheDateRange

} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');



router.use(auth)
router.post('/create-card-connect-integrations-master', validatecreateCardConnectIntegrationsMaster, createCardConnectIntegrationsMaster)
router.post('/creare-card-connect-integrations-master-credentials', validateintegrationsMasterExist, credentialsValidationsMiddleware,createIntegrationMasterCredentials)
router.get('/creare-card-connect-integrations-master-api-url-flow/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistenceParams,createCardConnectIntegrationsAPIUrlFlow )
router.patch('/update-card-connect-integrations-master-settings',validateintegrationsMasterExist, updateIntegrationMasterSettings)


router.patch('/edit-card-connect-integrations-master/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive, editCardConnectIntegrationsMaster)
router.patch('/edit-card-connect-integrations-master-credentials/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive,credentialsValidationsMiddleware, 
    editIntegrationsMasterCredentials

)
router.patch('/edit-card-connect-integrations-master-settings/:cardConnectIntegrationsMasterId',validateintegrationsMasterExistAndActive, editIntegrationsMasterSettings )

 router.post('/fetch-funding-data-for-the-day/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive, fetchFundingTransactionsForTheDay )

 router.get('/manual-pull-for-date-dump-range/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive,manualPullDateDumpRange)

 router.post('/fetch-funding-data-for-the-date-range/:cardConnectIntegrationsMasterId',validateintegrationsMasterExistAndActive, fetchFundingTransactionsForTheDateRange)

module.exports = router;
