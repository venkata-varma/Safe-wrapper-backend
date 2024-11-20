const router = require('express').Router()
const serviceProviderServicesController = require('../superAdminControllers/serviceProviderServicesControlles')
const {superAdminAuth} = require('../middleware/superAdminAuthentication')

router.use(superAdminAuth)

router.post('/create-service-provider-integration',serviceProviderServicesController.createServiceProvidersIntegration)


router.post('/create-service-provider-services',serviceProviderServicesController.createServiceProviderServices)
router.patch('/update-service-provider-services/:serviceProviderServiceId',serviceProviderServicesController.validateServiceProviderStatus, serviceProviderServicesController.updateServiceProviderServices)
router.patch('/update-service-provider-service-status/:serviceProviderServiceId',serviceProviderServicesController.validateServiceProviderServiceExist, serviceProviderServicesController.deleteServiceProviderService)
router.get('/get-individual-service-provider-service-details/:serviceProviderServiceId',serviceProviderServicesController.validateServiceProviderServiceExist, serviceProviderServicesController.getIndividualServiceProviderServiceDetails)

// Service providers integration with services APIs.
router.post('/create-service-providers-integration-services',
    // serviceProviderServicesController.validateServiceProvidersIntegrationService, 
    serviceProviderServicesController.createServiceProvidersIntegrationService)
router.patch('/update-service-providers-integration-services/:serviceProviderIntegrationServiceId',serviceProviderServicesController.updatecreateServiceProvidersIntegrationService)

router.get('/get-all-service-provider-integrations',serviceProviderServicesController.getAllServiceProviderIntegrations)
router.get('/get-all-service-provider-services-to-create-integration/:serviceProviderIntegrationId',serviceProviderServicesController.getAllServiceProviderServicesToCreateIntegration)
router.get('/get-individual-service-providers-integration-details/:serviceProviderIntegrationId',serviceProviderServicesController.getIndividualServiceProviderIntegrationsDetails)
router.get('/get-all-service-providers-integration-with-services',serviceProviderServicesController.getAllServiceProversIntegrationDefaultFiledMappingServices)
router.get('/get-individual-service-providers-integration-services/:serviceProviderIntegrationServiceId',serviceProviderServicesController.getIndividualServiceProvidersIntegrationService)
module.exports = router