const router = require('express').Router()
const serviceProviderServicesController = require('../superAdminControllers/serviceProviderServicesControlles')
const {superAdminAuth} = require('../middleware/superAdminAuthentication')

router.use(superAdminAuth)

// service provider services APIs.
router.post('/create-service-provider-services',serviceProviderServicesController.validateServiceProviderStatus, serviceProviderServicesController.createServiceProviderServices)
router.patch('/update-service-provider-services/:serviceProviderServiceId',serviceProviderServicesController.validateServiceProviderStatus,serviceProviderServicesController.validateServiceProviderServiceStatus, serviceProviderServicesController.updateServiceProviderServices)
router.patch('/update-service-provider-service-status/:serviceProviderServiceId',serviceProviderServicesController.validateServiceProviderServiceExist, serviceProviderServicesController.deleteServiceProviderService)
router.get('/get-individual-service-provider-service-details/:serviceProviderServiceId',serviceProviderServicesController.validateServiceProviderServiceExist, serviceProviderServicesController.getIndividualServiceProviderServiceDetails)


// service providers integration APIs.
router.post('/create-service-provider-integration',
    //serviceProviderServicesController.validateServiceProvidersIntegration,   (Deprecated on 13-Dec-2024 based on test case analysis from Senior Tester)
    serviceProviderServicesController.validateServiceProviderServicesExist, 
    serviceProviderServicesController.createServiceProvidersIntegration)
router.patch('/update-service-providers-integration/:serviceProviderIntegrationId',serviceProviderServicesController.validateServiceProvidersIntegrationExist,serviceProviderServicesController.updateServiceProvidersIntegration)
router.patch('/update-service-providers-integration-status/:serviceProviderIntegrationId',serviceProviderServicesController.validateServiceProvidersIntegrationExist,serviceProviderServicesController.updateServiceProvidersIntegrationStatus)
router.get('/get-single-service-providers-integration-details/:serviceProviderIntegrationId',serviceProviderServicesController.validateServiceProvidersIntegrationExist,serviceProviderServicesController.getSingleIntegrationDetails)
router.get('/get-all-service-provider-integrations',serviceProviderServicesController.getAllServiceProviderIntegrations)


// Service providers integration with services APIs.
router.post('/create-service-providers-integration-services',
    // serviceProviderServicesController.validateServiceProvidersIntegrationService, 
    serviceProviderServicesController.createServiceProvidersIntegrationService)
router.patch('/update-service-providers-integration-services/:serviceProviderIntegrationServiceId',serviceProviderServicesController.updatecreateServiceProvidersIntegrationService)
router.patch('/update-service-provider-integration-service-mapping-mode/:serviceProviderIntegrationServiceId',serviceProviderServicesController.updatecreateServiceProvidersIntegrationServiceMappingMode)
router.patch('/update-service-provider-integration-service-status/:serviceProviderIntegrationServiceId',serviceProviderServicesController.updatecreateServiceProvidersIntegrationServiceStatus)


router.get('/get-all-service-provider-services-to-create-integration/:serviceProviderIntegrationId',serviceProviderServicesController.getAllServiceProviderServicesToCreateIntegration)
router.get('/get-individual-service-providers-integration-details/:serviceProviderIntegrationId',serviceProviderServicesController.getIndividualServiceProviderIntegrationsDetails)
router.get('/get-all-service-providers-integration-with-services',serviceProviderServicesController.getAllServiceProversIntegrationDefaultFiledMappingServices)
router.get('/get-individual-service-providers-integration-services/:serviceProviderIntegrationServiceId',serviceProviderServicesController.getIndividualServiceProvidersIntegrationService)
module.exports = router