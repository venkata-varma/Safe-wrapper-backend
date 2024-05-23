const router = require('express').Router();
const { access } = require('fs');
const integrationsControllers = require('../controllers/integrationsController');
const auth = require('../middleware/authentication');
  

router.use(auth)

router.post('/create-integrationmaster', integrationsControllers.createIntegrationMaster)
router.post('/create-integrationmaster-service-provider', integrationsControllers.createIntegrationMasterServiceProviderCredentials)

router.patch('/update-integrationmaster-field-mapping', integrationsControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationmaster-settings', integrationsControllers.updateIntegrationMasterSettings)

router.get('/get-integrationmaster-details/:integrationMasterId', integrationsControllers.getSingleIntegrationMasterDetails)
router.get('/get-global-constants',integrationsControllers.globalConstants)
router.get('/get-default-integrationmaster-field-mapping-keys/:integrationMasterId',integrationsControllers.getDefaultIntegrationMasterFieldMappingKeys)

router.patch('/edit-integrationmaster/:integrationMasterId', integrationsControllers.editIntegrationMaster);
router.patch('/edit-integrationmaster-service-provider/:integrationMasterId', integrationsControllers.editIntegrationMasterServiceProviderCredentials)
router.patch('/edit-integrationmaster-field-mappings/:integrationMasterId', integrationsControllers.editIntegrationMasterFieldMappings)
router.patch('/edit-integrationmaster-settings/:integrationMasterId', integrationsControllers.editIntegrationMasterSettings)
module.exports = router;
