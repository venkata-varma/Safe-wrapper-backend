const router = require('express').Router();
const { access } = require('fs');
const integrationsControllers = require('../controllers/integrationsController');
const auth = require('../middleware/authentication');
  

router.use(auth)

router.post('/create-integration', integrationsControllers.createIntegrations)
router.post('/create-service-provider', integrationsControllers.addServiceProviderCredentials)

router.patch('/update-integrations-field-mapping', integrationsControllers.updateIntegrationsFieldMappings)
router.patch('/update-integrations-settings', integrationsControllers.updateIntegrationsSettings)

router.get('/get-single-integration/:integrationMasterId', integrationsControllers.getSingleIntegration)
router.get('/get-global-constants',integrationsControllers.globalConstants)



module.exports = router;
