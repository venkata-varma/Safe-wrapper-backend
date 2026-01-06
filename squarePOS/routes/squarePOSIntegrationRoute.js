const router = require('express').Router();

const { getSquarePOSIntegrationMasterCredentials, createSquarePOSIntegrationMasterSettings, getIntegrationMasterSettings, getSquarePOSPayments, syncSquarePOSData, manualPullDateDumpRange, fetchSquarePOSDataForDateRange } = require('../controllers/squarePOSIntegrationController')

const { validateAccountExistAndActive, createIntegrationMasterCredentials, credentialsValidationsMiddleware, UpdateIntegrationMasterCredentials, updateIntegrationMasterSettings, getDetailsOfCronJobId } = require('../controllers/squarePOSMasterContollers');
const auth = require('../../middleware/authentication');
const { validate } = require('../models/squarePOSExceptionModel');


router.use(auth)

router.post('/onboard-square-pos-credentials', validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials)

router.patch('/update-square-pos-credentials/:accountId', validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    UpdateIntegrationMasterCredentials)

router.get('/get-square-pos-credentials/:accountId', validateAccountExistAndActive,
    getSquarePOSIntegrationMasterCredentials)

router.post('/onboard-square-pos-integration-settings', validateAccountExistAndActive, createSquarePOSIntegrationMasterSettings)
//validateSquarePOSCredentails

router.get('/get-square-pos-integration-settings/:accountId',
    validateAccountExistAndActive, getIntegrationMasterSettings)

router.patch('/update-integrations-master-settings/:accountId/:integrationSettingsId',
    validateAccountExistAndActive, updateIntegrationMasterSettings)


router.get('/get-square-pos-payments/:accountId',
    validateAccountExistAndActive, getSquarePOSPayments)

router.get('/integration-context/:accountId', validateAccountExistAndActive, syncSquarePOSData)

router.post('/manual-sync/:accountId',
    validateAccountExistAndActive, manualPullDateDumpRange
);

router.post('/sync-data-range/:accountId',
    validateAccountExistAndActive,
    fetchSquarePOSDataForDateRange
);

router.get('/cron-job-details/:accountId/:cronJobId',
    validateAccountExistAndActive,
    getDetailsOfCronJobId
)

module.exports = router;
