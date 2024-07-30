const router = require('express').Router();
const superAdminAccountsController=require('../superAdminControllers/superAdminAccountsController')
const {upload}=require('../../utils/fileUpload')

router.post('/create-super-admin-account', upload.single('logo'), superAdminAccountsController.validateAccountRegistration,superAdminAccountsController.superAdminAccountRegister);

module.exports=router