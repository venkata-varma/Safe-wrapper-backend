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
    editIntegrationsMasterSettings

} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');



router.use(auth)
router.post('/create-card-connect-integrations-master', validatecreateCardConnectIntegrationsMaster, createCardConnectIntegrationsMaster)
router.post('/creare-card-connect-integrations-master-credentials', validateintegrationsMasterExist, credentialsValidationsMiddleware,createIntegrationMasterCredentials)
router.patch('/update-card-connect-integrations-master-settings',validateintegrationsMasterExist, updateIntegrationMasterSettings)


router.patch('/edit-card-connect-integrations-master/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive, editCardConnectIntegrationsMaster)
router.patch('/edit-card-connect-integrations-master-credentials/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive,credentialsValidationsMiddleware, 
    editIntegrationsMasterCredentials

)

router.patch('/edit-card-connect-integrations-master-settings/:cardConnectIntegrationsMasterId',validateintegrationsMasterExistAndActive, editIntegrationsMasterSettings )


module.exports = router;
