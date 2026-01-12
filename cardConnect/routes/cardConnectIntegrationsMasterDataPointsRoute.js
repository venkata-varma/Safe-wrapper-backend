const router = require('express').Router();
const { access } = require('fs');


const {
    getSingleIntegrationView,
    getMerchantCardConnectExceptions,
    getMerchantCardConnectDashboardStats,
    getDetailsOfCronJobId,
    getMerchantsNamesInDropdown,
    getSingleIntegrationLoadedData

} = require('../controllers/cardConnectIntegrationsMasterDataPointsController');

const {
    validateAccountExistAndActiveParams
} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)
router.get('/get-single-integration-view/:accountId', validateAccountExistAndActiveParams, getSingleIntegrationView)
router.get('/get-single-integration-view-table-data/:accountId', validateAccountExistAndActiveParams, getSingleIntegrationLoadedData)
router.get('/get-details-of-cron/:accountId/:cronJobId', validateAccountExistAndActiveParams, getDetailsOfCronJobId)

router.get('/get-merchant-card-connect-dashboard-statistics/:accountId', validateAccountExistAndActiveParams, getMerchantCardConnectDashboardStats)


module.exports = router