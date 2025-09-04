const router = require('express').Router();
const { access } = require('fs');


const {
    getSingleIntegrationView,
    getCardConnectPayloadHeaders
} = require('../controllers/cardConnectIntegrationsMasterDataPointsController');

const {
    validateAccountExistAndActiveParams
} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)
router.get('/get-single-integration-view/:accountId', validateAccountExistAndActiveParams, getSingleIntegrationView)

router.get('/get-card-connect-payload-headers/:accountId', validateAccountExistAndActiveParams, getCardConnectPayloadHeaders)



module.exports = router