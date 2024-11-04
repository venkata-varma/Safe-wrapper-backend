const router = require('express').Router()
const fieldMappingsController = require('../superAdminControllers/fieldMappingsController')
const {superAdminAuth} = require('../middleware/superAdminAuthentication')

router.use(superAdminAuth)
router.post('/create-field-mappings',fieldMappingsController.createFieldMappings)
router.patch('/update-field-mappings/:fieldMappingId',fieldMappingsController.validateFieldMappingExist, fieldMappingsController.updateFieldMappings)
router.patch('/update-field-mapping-status/:fieldMappingId',fieldMappingsController.validateFieldMappingExist, fieldMappingsController.deleteFieldMappings)
router.get('/get-individual-field-mapping-details/:fieldMappingId',fieldMappingsController.validateFieldMappingExist, fieldMappingsController.getIndividualFieldMappingDetails)

// Field Mapping Default Services APIs.
router.get('/get-all-field-mapping-default-services',fieldMappingsController.getAllFieldMappingDefaultServices)
router.post('/create-default-field-mappings',fieldMappingsController.validateDefaultFieldMappingService, fieldMappingsController.createDefaultFieldMappingSeervice)
router.patch('/update-default-field-mapping-service/:fieldMappingId',fieldMappingsController.updateDefaultFieldMappingService)
router.get('/get-individual-default-field-mapping-service/:fieldMappingId',fieldMappingsController.getIndividualDefaultFieldMappingService)
module.exports = router