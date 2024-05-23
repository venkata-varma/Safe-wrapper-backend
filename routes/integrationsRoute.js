const router = require('express').Router();
const { access } = require('fs');
const integrationsControllers = require('../controllers/integrationsController');
const auth = require('../middleware/authentication');
  

router.use(auth)

router.post('/create-integrationMaster', integrationsControllers.createIntegrationMaster)
router.post('/create-integrationMaster-service-provider', integrationsControllers.createIntegrationMasterServiceProviderCredentials)

router.patch('/update-integrationMaster-field-mapping', integrationsControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationMaster-settings', integrationsControllers.updateIntegrationMasterSettings)

router.get('/get-single-integrationMaster-details/:integrationMasterId', integrationsControllers.getSingleIntegrationMasterDetails)
router.get('/get-global-constants',integrationsControllers.globalConstants)
router.get('/get-default-integrationMaster-field-mapping-hot-keys/:from/:to',integrationsControllers.getDefaultIntegrationMasterFieldMappingHotKeys)



module.exports = router;
