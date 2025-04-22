const router = require('express').Router();
const superAdminUsersController=require('../controllers/userControllers')

router.post('/login', superAdminUsersController.validateLoginProcess,superAdminUsersController.superAdminLogin);

module.exports=router