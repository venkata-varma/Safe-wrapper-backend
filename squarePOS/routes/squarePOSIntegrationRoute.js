const router = require('express').Router();

const { createSquarePOSIntegrationMasterSettings } = require('../controllers/squarePOSIntegrationController')
const { validateAccountExistAndActive, createIntegrationMasterCredentials, credentialsValidationsMiddleware } = require('../controllers/squarePOSMasterContollers');
const auth = require('../../middleware/authentication')

router.use(auth)

router.post('/authticate', validateAccountExistAndActive, 
credentialsValidationsMiddleware,
createIntegrationMasterCredentials)

router.post('/create-square-pos-integrations-master-settings', validateAccountExistAndActive, createSquarePOSIntegrationMasterSettings)
//validateSquarePOSCredentails

module.exports = router;
