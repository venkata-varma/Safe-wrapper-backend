const router = require('express').Router();
const { access } = require('fs');
const {
    validatecreateCardConnectIntegrationsMaster,
    createCardConnectIntegrationsMaster,
    validateintegrationsMasterExist

} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');



router.use(auth)
router.post('/create-card-connect-integrations-master',validatecreateCardConnectIntegrationsMaster,createCardConnectIntegrationsMaster )
router.post('/creare-card-connect-integrations-master-credentials',validateintegrationsMasterExist, credentialsValidationsMiddleware,createIntegrationMasterCredentials  )

module.exports = router;
