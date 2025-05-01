const router = require('express').Router();
const superAdminUsersController=require('../controllers/userControllers')

router.post('/login', superAdminUsersController.validateLoginProcess,superAdminUsersController.superAdminLogin);

//Below "/user-login" is copy of "/login". But, changed response structure & written for sake of Swagger documentation 
router.post('/user-login',superAdminUsersController.validateLoginProcessForSwagger, superAdminUsersController.loginUserForSwagger)
module.exports=router