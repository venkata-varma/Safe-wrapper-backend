const router = require('express').Router();

const { getSquarePOSIntegrationMasterCredentials, createSquarePOSIntegrationMasterSettings, getIntegrationMasterSettings, getSquarePOSPayments, syncSquarePOSData, manualPullDataDump, fetchSquarePOSDataForDateRange } = require('../controllers/squarePOSIntegrationController')

const { validateAccountExistAndActive, validateSquareSetup, createIntegrationMasterCredentials, credentialsValidationsMiddleware, UpdateIntegrationMasterCredentials, updateIntegrationMasterSettings, getDetailsOfCronJobId } = require('../controllers/squarePOSMasterContollers');
const auth = require('../../middleware/authentication');
const { validate } = require('../models/squarePOSExceptionModel');


router.use(auth)

router.post('/credentials', validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials);

router.patch('/credentials/:credentialsId', validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    UpdateIntegrationMasterCredentials);

router.get('/credentials/:accountId', validateAccountExistAndActive,
    getSquarePOSIntegrationMasterCredentials);

router.post('/integration-settings', validateAccountExistAndActive, createSquarePOSIntegrationMasterSettings);

router.get('/integration-settings/:accountId',
    validateAccountExistAndActive, getIntegrationMasterSettings)

router.patch('/integration-settings/:integrationSettingsId',
    validateAccountExistAndActive, updateIntegrationMasterSettings)


router.get('/payments/:accountId',
    validateAccountExistAndActive, validateSquareSetup, getSquarePOSPayments)

router.get('/integration-context/:accountId', validateAccountExistAndActive, syncSquarePOSData)

router.post('/manual-sync/:accountId',
    validateAccountExistAndActive, validateSquareSetup, manualPullDataDump
);

// router.post('/sync-data-range/:accountId',
//     validateAccountExistAndActive,
//     fetchSquarePOSDataForDateRange
// );

router.get('/cron-job-details/:cronJobId',
    validateAccountExistAndActive,
    getDetailsOfCronJobId
)

module.exports = router;
