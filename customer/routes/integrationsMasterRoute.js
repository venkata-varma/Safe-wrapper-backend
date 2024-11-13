
const router = require('express').Router();
const { access } = require('fs');
const integrationsMasterControllers = require('../controllers/integrationsMasterController');
const auth = require('../../middleware/authentication');

router.get('/get-images', integrationsMasterControllers.getImages)
router.get('/get-cpd-df-building-matched-details',integrationsMasterControllers.getCPDToDFMatchedBuildingDetails)

router.use(auth)

router.post('/create-integrationmaster', integrationsMasterControllers.validateCreateIntegrationsCount, integrationsMasterControllers.createIntegrationMaster)
router.post('/create-integrationmaster-service-provider', integrationsMasterControllers.validateintegrationsMasterExist,
    integrationsMasterControllers.credentialsValidationsMiddleware, 
    integrationsMasterControllers.createIntegrationMasterServiceProviderCredentials)
router.post('/get-integration-decrypt-result', integrationsMasterControllers.getIntegrationCryptoService);
 
router.patch('/update-integrationmaster-field-mapping',integrationsMasterControllers.validateIntegrationsMasterForEdit, integrationsMasterControllers.updateIntegrationMasterFieldMappings)
router.patch('/update-integrationmaster-settings',integrationsMasterControllers.validateIntegrationsMasterForEdit, integrationsMasterControllers.updateIntegrationMasterSettings)
router.patch('/edit-integrationmaster/:integrationsMasterId',integrationsMasterControllers.validateIntegrationsMaster, integrationsMasterControllers.editIntegrationMaster);
router.patch('/edit-integrationmaster-service-provider/:integrationsMasterId',integrationsMasterControllers.validateIntegrationsMaster,
    integrationsMasterControllers.credentialsValidationsMiddleware, 
    integrationsMasterControllers.editIntegrationMasterServiceProviderCredentials)
router.patch('/edit-integrationmaster-field-mappings/:integrationsMasterId',integrationsMasterControllers.validateIntegrationsMasterForEdit, integrationsMasterControllers.editIntegrationMasterFieldMappings)
router.patch('/edit-integrationmaster-settings/:integrationsMasterId',integrationsMasterControllers.validateIntegrationsMasterForEdit, integrationsMasterControllers.editIntegrationMasterSettings)
router.patch('/delete-integrationmaster/:integrationsMasterId',integrationsMasterControllers.validateIntegrationsMaster, integrationsMasterControllers.deactivateInteragtionMasterCrons)
router.patch('/update-integration-settings-data-sync/:integrationSettingsId',integrationsMasterControllers.validateIntegrationSettingsDetails, integrationsMasterControllers.updateAutoDataSync);
router.patch('/update-integration-settings-frequency/:integrationSettingsId',integrationsMasterControllers.validateIntegrationSettingsDetails, integrationsMasterControllers.updateIntegrationSettingsFrequency)
router.patch('/update-integration-workorder-status-field-mappings/:integrationSettingsId',integrationsMasterControllers.validateIntegrationSettingsDetails, integrationsMasterControllers.updateStatusFieldMappings)
router.patch('/update-integration-date-range/:integrationSettingsId',integrationsMasterControllers.validateIntegrationSettingsDetails, integrationsMasterControllers.updateDateRange)
router.patch('/update-integration-master-status/:integrationsMasterId',integrationsMasterControllers.validateIntegrationsMaster, integrationsMasterControllers.updateIntegrationMasterStatus);

router.get('/get-global-constants', integrationsMasterControllers.getGlobalConstants)
router.get('/get-integration-default-filedmappings/:integrationsMasterId',integrationsMasterControllers.validateintegrationsMasterExistForFieldMapping, integrationsMasterControllers.fieldMappingMasterDefaultServicesList)
router.get('/get-single-integrationmaster-details/:integrationsMasterId', integrationsMasterControllers.validateIntegrationsMasterExistForSingleIntegration, integrationsMasterControllers.getSingleIntegrationMasterDetails)
router.get('/pull-latest-workorders-by-integrationMasterId/:integrationsMasterId',integrationsMasterControllers.validateIntegrationStatus, integrationsMasterControllers.pullLatestWorkOrders);
router.get('/get-all-integration-exceptions/:accountId', integrationsMasterControllers.validateAccountStatus, integrationsMasterControllers.getAllIntegrationExceptions);
router.get('/get-field-mappings-by-service/:accountId',integrationsMasterControllers.middlewareForAccountIntegrationExist, integrationsMasterControllers.getFieldMappingsByServiceType)
router.get('/get-service-provider-lists', integrationsMasterControllers.getServiceProviderLists)

module.exports = router;
