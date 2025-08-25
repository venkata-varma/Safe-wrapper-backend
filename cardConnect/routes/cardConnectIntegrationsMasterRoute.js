const router = require('express').Router();
const { access } = require('fs');
const {
    validatecreateCardConnectIntegrationsMaster,
    createCardConnectIntegrationsMaster,
    validateintegrationsMasterExist,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials,
    updateIntegrationMasterSettings

} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');



router.use(auth)
router.post('/create-card-connect-integrations-master', validatecreateCardConnectIntegrationsMaster, createCardConnectIntegrationsMaster)
router.post('/creare-card-connect-integrations-master-credentials', validateintegrationsMasterExist, credentialsValidationsMiddleware,createIntegrationMasterCredentials)
router.patch('/update-card-connect-integrations-master-settings',validateintegrationsMasterExist, updateIntegrationMasterSettings)

module.exports = router;
