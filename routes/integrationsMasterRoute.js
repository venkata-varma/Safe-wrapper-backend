
const router = require('express').Router();
const { access } = require('fs');
const integrationsMasterControllers = require('../controllers/integrationsMasterController');
const auth = require('../middleware/authentication');


router.use(auth)

router.post('/create-integrationmaster', integrationsMasterControllers.createIntegrationMaster)
router.post('/create-integrationmaster-service-provider', integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.createIntegrationMasterServiceProviderCredentials)

router.patch('/update-integrationmaster-field-mapping',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.fieldMappingMasterDefaultServicesList, integrationsMasterControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationmaster-settings',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.updateIntegrationMasterSettings)
router.patch('/edit-integrationmaster/:integrationsMasterId',integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.editIntegrationMaster);
router.patch('/edit-integrationmaster-service-provider/:integrationsMasterId',integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.editIntegrationMasterServiceProviderCredentials)
router.patch('/edit-integrationmaster-field-mappings/:integrationsMasterId',integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.editIntegrationMasterFieldMappings)
router.patch('/edit-integrationmaster-settings/:integrationsMasterId',integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.editIntegrationMasterSettings)
router.patch('/delete-integrationmaster/:integrationsMasterId',integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.deactivateInteragtionMasterCrons)

router.get('/get-integrationmaster-details/:integrationsMasterId', integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.getSingleIntegrationMasterDetails)
module.exports = router;
