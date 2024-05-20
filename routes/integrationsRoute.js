const router = require('express').Router();
const { access } = require('fs');
const integrationsControllers = require('../controllers/integrationsController');
const auth = require('../middleware/authentication');


router.use(auth)

router.post('/create-integration', integrationsControllers.createIntegrations)
router.post('/create-service-provider', integrationsControllers.addServiceProviderCredentials)
router.post('/update-integrations-field-mapping', integrationsControllers.updateIntegrationsFieldMappings)
router.post('/update-integrations-settings', integrationsControllers.updateIntegrationsSettings)

router.get('/get-single-integration/:integrationMasterId', integrationsControllers.getSingleIntegration)



module.exports = router;
