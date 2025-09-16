const router = require('express').Router();
const { access } = require('fs');


const {
    getSingleIntegrationView,
    getMerchantCardConnectPayloadHeaders,
    getAllCardConnectPayloadHeaders
} = require('../controllers/cardConnectIntegrationsMasterDataPointsController');

const {
    validateAccountExistAndActiveParams
} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)
router.get('/get-single-integration-view/:accountId', validateAccountExistAndActiveParams, getSingleIntegrationView)

router.get('/get-merchant-card-connect-payload-headers/:accountId', validateAccountExistAndActiveParams, getMerchantCardConnectPayloadHeaders)


module.exports = router