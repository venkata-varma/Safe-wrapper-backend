const router = require('express').Router();
const { access } = require('fs');
const integrationsMasterControllers = require('../controllers/integrationsMasterController');
const auth = require('../middleware/authentication');


router.use(auth)

router.post('/create-integrationmaster', integrationsMasterControllers.createIntegrationMaster)
router.post('/create-integrationmaster-service-provider', integrationsMasterControllers.createIntegrationMasterServiceProviderCredentials)

router.patch('/update-integrationmaster-field-mapping', integrationsMasterControllers.fieldMappingMasterDefaultServicesList, integrationsMasterControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationmaster-settings', integrationsMasterControllers.updateIntegrationMasterSettings)
router.patch('/edit-integrationmaster/:integrationMasterId', integrationsMasterControllers.editIntegrationMaster);
router.patch('/edit-integrationmaster-service-provider/:integrationMasterId', integrationsMasterControllers.editIntegrationMasterServiceProviderCredentials)
router.patch('/edit-integrationmaster-field-mappings/:integrationMasterId', integrationsMasterControllers.editIntegrationMasterFieldMappings)
router.patch('/edit-integrationmaster-settings/:integrationMasterId', integrationsMasterControllers.editIntegrationMasterSettings)
router.patch('/delete-integrationmaster/:integrationMasterId', integrationsMasterControllers.deactivateInteragtionMasterCrons)

router.get('/get-integrationmaster-details/:integrationMasterId', integrationsMasterControllers.getSingleIntegrationMasterDetails)
module.exports = router;
