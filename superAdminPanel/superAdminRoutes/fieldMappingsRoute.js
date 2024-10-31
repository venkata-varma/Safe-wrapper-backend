const router = require('express').Router()
const fieldMappingsController = require('../superAdminControllers/fieldMappingsController')
const {superAdminAuth} = require('../middleware/superAdminAuthentication')

router.use(superAdminAuth)
router.post('/create-field-mappings',fieldMappingsController.createFieldMappings)
router.patch('/update-field-mappings/:fieldMappingId',fieldMappingsController.validateFieldMappingExist, fieldMappingsController.updateFieldMappings)
router.patch('/update-field-mapping-status/:fieldMappingId',fieldMappingsController.validateFieldMappingExist, fieldMappingsController.deleteFieldMappings)
router.get('/get-individual-field-mapping-details/:fieldMappingId',fieldMappingsController.validateFieldMappingExist, fieldMappingsController.getIndividualFieldMappingDetails)
module.exports = router