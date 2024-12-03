const router = require('express').Router();
const { access } = require('fs');
const accountsControllers = require('../controllers/accountsController');
const path = require('path')
const auth = require('../../middleware/authentication');
// const {upload}=require('../../utils/fileUpload')

const multer = require('multer');
const { preSignedUrlToUpload } = require('../../utils/helpers');

const upload = multer({ storage: multer.memoryStorage() });

// Route for generating presigned URL for file upload
router.post('/get-image', upload.single('file'), async (req, res) => {
    try {
        console.log('req.file.file:===',req.file)
        const fileName = `uploads/${Date.now()}-${req.file.originalname}`;
        
        // const presignedUrl = await getPresignedUrl("dev-isync-images", fileName);
        let presignedUrl = await preSignedUrlToUpload(fileName)
        console.log('Presigned URL:', presignedUrl);
        let URL =  `https://dev-isync-imgs.s3.us-west-1.amazonaws.com/${fileName}`
        return res.json({ url: presignedUrl, OURL: URL });
    }
    catch (error) {
        return res.json(error)
    }
});

router.post('/create-account',upload.single('logo'), accountsControllers.validateAccountRegistration, accountsControllers.createAccount)
router.use(auth)
router.patch('/delete-account/:accountId', accountsControllers.deleteAccount)
router.patch('/update-account/:accountId',upload.single('logo'), accountsControllers.validateAccountForUpdate, accountsControllers.updateAccount)


router.get('/get-account-integrations-information/:accountId', accountsControllers.validateAccountStatus, accountsControllers.getAccountIntegrationsInformation);
router.get('/get-account-integrations-reports/:accountId', accountsControllers.validateAccountStatus, accountsControllers.getAccountIntegrationsReports )
router.get('/get-work-order-life-cycle', accountsControllers.ValidateAccountAndIntegrationsStatus, accountsControllers.getWorkOrderLifeCycle)
router.get('/get-individual-work-order-details',accountsControllers.ValidateAccountAndIntegrationsStatus, accountsControllers.getIndividualWorkOrderDetails)
module.exports = router;
