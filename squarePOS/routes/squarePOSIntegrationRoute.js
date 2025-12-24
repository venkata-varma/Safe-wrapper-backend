const router = require('express').Router();

const { getSquarePOSIntegrationMasterCredentials, createSquarePOSIntegrationMasterSettings, getIntegrationMasterSettings, getSquarePOSPayments, syncSquarePOSData } = require('../controllers/squarePOSIntegrationController')

const { validateAccountExistAndActive, createIntegrationMasterCredentials, credentialsValidationsMiddleware, UpdateIntegrationMasterCredentials } = require('../controllers/squarePOSMasterContollers');
const auth = require('../../middleware/authentication')

router.use(auth)

router.post('/authticate', validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    createIntegrationMasterCredentials)

router.patch('/update-authentication-details/:accountId', validateAccountExistAndActive,
    credentialsValidationsMiddleware,
    UpdateIntegrationMasterCredentials)

router.get('/authentication-details/:accountId', validateAccountExistAndActive,
    getSquarePOSIntegrationMasterCredentials)

router.post('/create-integrations-master-settings', validateAccountExistAndActive, createSquarePOSIntegrationMasterSettings)
//validateSquarePOSCredentails

router.get('/integrations-master-settings/:accountId/:integartionSettingsId',
    validateAccountExistAndActive, getIntegrationMasterSettings)

router.get('/payments/:accountId',
    validateAccountExistAndActive, getSquarePOSPayments)

router.get('/integration-context/:accountId', validateAccountExistAndActive, syncSquarePOSData)

module.exports = router;
