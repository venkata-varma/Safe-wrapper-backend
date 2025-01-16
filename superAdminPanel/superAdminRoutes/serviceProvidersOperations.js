

const router = require('express').Router()
const serviceProvidersControllers = require('../superAdminControllers/serviceProvidersControllers')
const {superAdminAuth} = require('../middleware/superAdminAuthentication')

router.use(superAdminAuth)
router.post('/create-service-provider',serviceProvidersControllers.validateServiceProviderExist, serviceProvidersControllers.serviceProviderListCredentialsValidation, serviceProvidersControllers.createServiceproviders)

router.patch('/update-service-provider/:serviceProviderId',serviceProvidersControllers.serviceProviderListCredentialsValidation, serviceProvidersControllers.updateServiceProviderList)
router.patch('/delete-service-provider-list/:serviceProviderId',serviceProvidersControllers.deleteServiceProviderList)
router.patch('/update-service-provider-service-categories/:serviceProviderId',serviceProvidersControllers.serviceProviderExist, serviceProvidersControllers.updateSPServiceCategories)

router.get('/get-individual-service-provider-services/:serviceProviderId',serviceProvidersControllers.serviceProviderCheck, serviceProvidersControllers.getIndividualServiceProviderServiceDetails)
router.get('/get-all-service-providers-list', serviceProvidersControllers.getAllServiceProvidersList)


module.exports = router