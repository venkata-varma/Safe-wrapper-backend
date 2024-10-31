

const router = require('express').Router()
const serviceProvidersControllers = require('../superAdminControllers/serviceProvidersControllers')
const {superAdminAuth} = require('../middleware/superAdminAuthentication')

router.use(superAdminAuth)
router.post('/create-service-provider',serviceProvidersControllers.validateServiceProviderExist, serviceProvidersControllers.createServiceproviders)
router.patch('/update-service-provider/:serviceProviderId',serviceProvidersControllers.serviceProviderCheck, serviceProvidersControllers.updateServiceProviderDetails)
router.get('/get-individual-serviceProvider/:serviceProviderId',serviceProvidersControllers.serviceProviderCheck, serviceProvidersControllers.getIndividualServiceProviderDetails)
module.exports = router