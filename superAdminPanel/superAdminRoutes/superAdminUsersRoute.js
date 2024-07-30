const router = require('express').Router();
const superAdminUsersController=require('../superAdminControllers/superAdminUsersController')

router.post('/super-admin-login', superAdminUsersController.validateLoginProcess,superAdminUsersController.superAdminLogin);

module.exports=router