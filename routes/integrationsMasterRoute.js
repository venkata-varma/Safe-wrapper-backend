const router = require('express').Router();
const { access } = require('fs');
const integrationsMasterControllers = require('../controllers/integrationsMasterController');
const auth = require('../middleware/authentication');
  

router.use(auth)

router.post('/create-integrationmaster', integrationsMasterControllers.createIntegrationMaster)
router.post('/create-integrationmaster-service-provider', integrationsMasterControllers.createIntegrationMasterServiceProviderCredentials)

router.patch('/update-integrationmaster-field-mapping', integrationsMasterControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationmaster-settings', integrationsMasterControllers.updateIntegrationMasterSettings)

router.get('/get-integrationmaster-details/:integrationMasterId', integrationsMasterControllers.getSingleIntegrationMasterDetails)
router.get('/get-global-constants',integrationsMasterControllers.globalConstants)
router.get('/get-default-integrationmaster-field-mapping-keys/:integrationMasterId',integrationsMasterControllers.getDefaultIntegrationMasterFieldMappingKeys)
/*
Edit routes for a specific initiated integration
*/
router.patch('/edit-integrationmaster/:integrationMasterId', integrationsMasterControllers.editIntegrationMaster);
router.patch('/edit-integrationmaster-service-provider/:integrationMasterId', integrationsMasterControllers.editIntegrationMasterServiceProviderCredentials)
router.patch('/edit-integrationmaster-field-mappings/:integrationMasterId', integrationsMasterControllers.editIntegrationMasterFieldMappings)
router.patch('/edit-integrationmaster-settings/:integrationMasterId', integrationsMasterControllers.editIntegrationMasterSettings)
module.exports = router;
