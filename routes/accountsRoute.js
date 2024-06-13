const router = require('express').Router();
const { access } = require('fs');
const accountsControllers = require('../controllers/accountsController');
const auth = require('../middleware/authentication');



router.post('/create-account',accountsControllers.validateAccountRegistration, accountsControllers.createAccount)
router.use(auth)
router.patch('/delete-account/:accountId', accountsControllers.deleteAccount)


router.get('/get-account-integrations-information/:accountId', accountsControllers.getAccountIntegrationsInformation);
router.get('/get-account-integrations-reports/:accountId',accountsControllers.getAccountIntegrationsReports )

module.exports = router;
