const router = require('express').Router();
const { access } = require('fs');
const usersControllers = require('../controllers/usersController');
const auth = require('../middleware/authentication');



router.post('/create-user',usersControllers.validateUserRegistration, usersControllers.createUser)
// router.post('/update-user',usersControllers.validateUserRegistration, usersControllers.createUser)
router.post('/login',usersControllers.validateLoginProcess, usersControllers.loginUser)

router.get('/get-account-statistics', usersControllers.getAccountStatistics)
module.exports = router;
