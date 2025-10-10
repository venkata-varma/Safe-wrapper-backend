const router = require('express').Router();
const { access } = require('fs');


const {
    getSingleIntegrationView,
    getMerchantCardConnectExceptions,
    getMerchantCardConnectDashboardStats,
    getDetailsOfCronJobId,
    getMerchantsNamesInDropdown

} = require('../controllers/cardConnectIntegrationsMasterDataPointsController');

const {
    validateAccountExistAndActiveParams
} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)
router.get('/get-single-integration-view/:accountId', validateAccountExistAndActiveParams, getSingleIntegrationView)
router.get('/get-details-of-cron/:accountId/:cronJobId', validateAccountExistAndActiveParams, getDetailsOfCronJobId)

router.get('/get-merchant-card-connect-dashboard-statistics/:accountId', validateAccountExistAndActiveParams, getMerchantCardConnectDashboardStats)

router.get('/get-merchants-in-dropdown', getMerchantsNamesInDropdown)
module.exports = router