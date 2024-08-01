const router = require('express').Router();
const { access } = require('fs');
const usersControllers = require('../controllers/usersController');
const auth = require('../../middleware/authentication');



router.post('/create-user',usersControllers.validateUserRegistration, usersControllers.createUser)
// router.post('/update-user',usersControllers.validateUserRegistration, usersControllers.createUser)
router.post('/login',usersControllers.validateLoginProcess, usersControllers.loginUser)
router.use(auth)
router.get('/get-account-statistics/:accountId', usersControllers.getAccountStatistics)

/*
Following are routes to Admin user to update status on its users
*/
router.patch('/update-password/:userId',usersControllers.middlewareToUpdatePassword, usersControllers.updatePassword)
router.patch('/delete-user/:userId',usersControllers.middlewareToDeleteUser, usersControllers.deleteUser);
router.patch('/update-user-details/:userId', usersControllers.middlewareUpdateUserDetails, usersControllers.updateUserDetails);

router.get('/get-user-details/:userId', usersControllers.getUserDetails);
router.get('/get-all-users/:accountId',usersControllers.getAllUsers )
module.exports = router;
