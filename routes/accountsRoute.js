const router = require('express').Router();
const { access } = require('fs');
const accountsControllers = require('../controllers/accountsController');
const auth = require('../middleware/authentication');



router.post('/account-registration',accountsControllers.validateAccountRegistration, accountsControllers.createAccount)



module.exports = router;
