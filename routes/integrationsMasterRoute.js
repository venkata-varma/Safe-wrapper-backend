
const router = require('express').Router();
const { access } = require('fs');
const integrationsMasterControllers = require('../controllers/integrationsMasterController');
const auth = require('../middleware/authentication');


router.use(auth)

router.post('/create-integrationmaster', integrationsMasterControllers.createIntegrationMaster)
router.post('/create-integrationmaster-service-provider', integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.createIntegrationMasterServiceProviderCredentials)

router.patch('/update-integrationmaster-field-mapping',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.fieldMappingMasterDefaultServicesList, integrationsMasterControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationmaster-settings',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.updateIntegrationMasterSettings)
router.patch('/edit-integrationmaster/:integrationMasterId',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.editIntegrationMaster);
router.patch('/edit-integrationmaster-service-provider/:integrationMasterId',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.editIntegrationMasterServiceProviderCredentials)
router.patch('/edit-integrationmaster-field-mappings/:integrationMasterId',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.editIntegrationMasterFieldMappings)
router.patch('/edit-integrationmaster-settings/:integrationMasterId',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.editIntegrationMasterSettings)
router.patch('/delete-integrationmaster/:integrationMasterId',integrationsMasterControllers.validateintegrationsMasterExist, integrationsMasterControllers.deactivateInteragtionMasterCrons)

router.get('/get-integrationmaster-details/:integrationMasterId', integrationsMasterControllers.validateintegrationsMaster, integrationsMasterControllers.getSingleIntegrationMasterDetails)
module.exports = router;
