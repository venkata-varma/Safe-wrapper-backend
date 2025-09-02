const router = require('express').Router();
const { access } = require('fs');


const {
    getSingleIntegrationView
} = require('../controllers/cardConnectIntegrationsMasterDataPointsController');

const {
    validatecreateCardConnectIntegrationsMaster,

    validateintegrationsMasterExist,

    validateintegrationsMasterExistAndActive,


} = require('../controllers/cardConnectIntegrationsMasterController');
const auth = require('../../middleware/authentication');


router.use(auth)
router.get('/get-single-integration-view/:cardConnectIntegrationsMasterId', validateintegrationsMasterExistAndActive, getSingleIntegrationView)

module.exports=router