const router = require('express').Router();
const { access } = require('fs');


const {
    getSingleIntegrationView,
    getMerchantCardConnectExceptions,
    getMerchantCardConnectDashboardStats

} = require('../controllers/cardConnectIntegrationsMasterDataPointsController');

const {
    validateAccountExistAndActiveParams
} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)
router.get('/get-single-integration-view/:accountId/:cronJobId', validateAccountExistAndActiveParams, getSingleIntegrationView)
router.get('/get-details-of-cron/:accountId', validateAccountExistAndActiveParams)

router.get('/get-merchant-card-connect-dashboard-statistics/:accountId', validateAccountExistAndActiveParams, getMerchantCardConnectDashboardStats)
module.exports = router