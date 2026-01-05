const router = require('express').Router();
const { access } = require('fs');
const multer = require('multer')
const accountsControllers = require('../controllers/accountsController');
const auth = require('../../middleware/authentication');
// const {upload}=require('../../utils/fileUpload')
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
let {
    validateAccountStatus,
    validateAccountForUpdate,
    updateAccount,
    validationMapMachinesToAccountUpdate,
    updateLinkedMachinesOfAccount
} = require('../../superAdmin/controllers/superAdminAccountControllers')


router.post('/create-account', upload.single('logo'), accountsControllers.validateAccountRegistration, accountsControllers.createAccount)
router.post('/upload-image', upload.single('logo'), accountsControllers.uploadImageToS3)
router.use(auth)
// router.patch('/delete-account/:accountId', accountsControllers.deleteAccount)
// router.patch('/update-account/:accountId',upload.single('logo'), accountsControllers.validateAccountForUpdate, accountsControllers.updateAccount)

router.get('/get-self-account-integration-details/:accountId', validateAccountStatus, accountsControllers.getAccountIntegrationDetails)


router.patch('/update-merchant-account/:accountId', upload.single('logo'), validateAccountForUpdate, updateAccount)
router.patch('/update-linked-machines-to-account/:accountId', validateAccountForUpdate, validationMapMachinesToAccountUpdate, updateLinkedMachinesOfAccount)



module.exports = router;
